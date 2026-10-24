import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSupabase, ensureAnonymousAuth, isSocialConfigured } from './supabaseClient';
import { getWeekStart } from '@/features/retention/selectors';

export interface FriendPresence {
  userId: string;
  displayName: string;
  trainingDays: number;
  weeklyGoal: number;
  trainedToday: boolean;
}

export interface FriendRequest {
  friendshipId: string;
  fromUserId: string;
  fromName: string;
}

interface SocialState {
  /** 用戶是否開啟社交（預設關閉，明確 opt-in） */
  enabled: boolean;
  userId: string | null;
  friendCode: string | null;
  displayName: string;
  friends: FriendPresence[];
  incomingRequests: FriendRequest[];
  /** 已送出但尚未被接受的邀請數（只顯示數量） */
  outgoingCount: number;
  lastSyncedAt: string | null;

  enableSocial: (displayName: string) => Promise<boolean>;
  disableSocial: () => void;
  addFriendByCode: (code: string) => Promise<'ok' | 'not_found' | 'already' | 'self' | 'error'>;
  acceptRequest: (friendshipId: string) => Promise<void>;
  declineRequest: (friendshipId: string) => Promise<void>;
  removeFriend: (friendUserId: string) => Promise<void>;
  refreshFriends: () => Promise<void>;
  /** 訓練結算後上傳本週 presence（fire-and-forget） */
  syncPresence: (trainingDays: number, weeklyGoal: number, trainedToday: boolean) => Promise<void>;
}

function todayLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function weekStartDate(): string {
  const ws = getWeekStart(new Date());
  return `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, '0')}-${String(ws.getDate()).padStart(2, '0')}`;
}

export const useSocialStore = create<SocialState>()(
  persist(
    (set, get) => ({
      enabled: false,
      userId: null,
      friendCode: null,
      displayName: '訓練者',
      friends: [],
      incomingRequests: [],
      outgoingCount: 0,
      lastSyncedAt: null,

      enableSocial: async (displayName) => {
        if (!isSocialConfigured()) return false;
        const sb = getSupabase();
        if (!sb) return false;
        const uid = await ensureAnonymousAuth();
        if (!uid) return false;
        // 建立/更新 profile
        const { data: profile, error } = await sb
          .from('profiles')
          .upsert({ id: uid, display_name: displayName.trim() || '訓練者' })
          .select('friend_code, display_name')
          .single();
        if (error || !profile) {
          console.error('[social] profile upsert failed', error);
          return false;
        }
        set({
          enabled: true,
          userId: uid,
          friendCode: profile.friend_code,
          displayName: profile.display_name,
        });
        await get().refreshFriends();
        return true;
      },

      disableSocial: () => {
        set({ enabled: false, friends: [], incomingRequests: [], outgoingCount: 0 });
      },

      addFriendByCode: async (code) => {
        const sb = getSupabase();
        const { userId } = get();
        if (!sb || !userId) return 'error';
        const normalized = code.trim().toUpperCase();
        if (!normalized) return 'not_found';
        const { data: target, error } = await sb
          .from('profiles')
          .select('id')
          .eq('friend_code', normalized)
          .maybeSingle();
        if (error || !target) return 'not_found';
        if (target.id === userId) return 'self';
        // 檢查是否已存在（任一方向）
        const { data: existing } = await sb
          .from('friendships')
          .select('id')
          .or(
            `and(user_id.eq.${userId},friend_id.eq.${target.id}),and(user_id.eq.${target.id},friend_id.eq.${userId})`,
          )
          .maybeSingle();
        if (existing) return 'already';
        const { error: insertErr } = await sb
          .from('friendships')
          .insert({ user_id: userId, friend_id: target.id, status: 'pending' });
        if (insertErr) return 'error';
        set((s) => ({ outgoingCount: s.outgoingCount + 1 }));
        return 'ok';
      },

      acceptRequest: async (friendshipId) => {
        const sb = getSupabase();
        if (!sb) return;
        await sb.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
        await get().refreshFriends();
      },

      declineRequest: async (friendshipId) => {
        const sb = getSupabase();
        if (!sb) return;
        await sb.from('friendships').delete().eq('id', friendshipId);
        await get().refreshFriends();
      },

      removeFriend: async (friendUserId) => {
        const sb = getSupabase();
        const { userId } = get();
        if (!sb || !userId) return;
        await sb
          .from('friendships')
          .delete()
          .or(
            `and(user_id.eq.${userId},friend_id.eq.${friendUserId}),and(user_id.eq.${friendUserId},friend_id.eq.${userId})`,
          );
        await get().refreshFriends();
      },

      refreshFriends: async () => {
        const sb = getSupabase();
        const { userId, enabled } = get();
        if (!sb || !userId || !enabled) return;

        // 1. 好友關係（accepted，雙向）
        const { data: friendships } = await sb
          .from('friendships')
          .select('id, user_id, friend_id, status')
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

        const rows = friendships ?? [];
        const acceptedIds = rows
          .filter((f) => f.status === 'accepted')
          .map((f) => (f.user_id === userId ? f.friend_id : f.user_id));
        const incoming = rows.filter((f) => f.status === 'pending' && f.friend_id === userId);
        const outgoingCount = rows.filter(
          (f) => f.status === 'pending' && f.user_id === userId,
        ).length;

        // 2. 好友名稱
        let nameMap = new Map<string, string>();
        if (acceptedIds.length > 0 || incoming.length > 0) {
          const ids = [...new Set([...acceptedIds, ...incoming.map((r) => r.user_id)])];
          const { data: profiles } = await sb
            .from('profiles')
            .select('id, display_name')
            .in('id', ids);
          nameMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
        }

        // 3. 本週 presence
        let presenceMap = new Map<string, { training_days: number; weekly_goal: number; trained_today: boolean }>();
        if (acceptedIds.length > 0) {
          const { data: presence } = await sb
            .from('weekly_presence')
            .select('user_id, training_days, weekly_goal, trained_today')
            .eq('week_start', weekStartDate())
            .in('user_id', acceptedIds);
          presenceMap = new Map((presence ?? []).map((p) => [p.user_id, p]));
        }

        set({
          friends: acceptedIds.map((id) => {
            const p = presenceMap.get(id);
            return {
              userId: id,
              displayName: nameMap.get(id) ?? '訓練者',
              trainingDays: p?.training_days ?? 0,
              weeklyGoal: p?.weekly_goal ?? 3,
              trainedToday: p?.trained_today ?? false,
            };
          }),
          incomingRequests: incoming.map((r) => ({
            friendshipId: r.id,
            fromUserId: r.user_id,
            fromName: nameMap.get(r.user_id) ?? '訓練者',
          })),
          outgoingCount,
        });
      },

      syncPresence: async (trainingDays, weeklyGoal, trainedToday) => {
        const sb = getSupabase();
        const { userId, enabled } = get();
        if (!sb || !userId || !enabled) return;
        const { error } = await sb.from('weekly_presence').upsert({
          user_id: userId,
          week_start: weekStartDate(),
          training_days: trainingDays,
          weekly_goal: weeklyGoal,
          trained_today: trainedToday,
          updated_at: new Date().toISOString(),
        });
        if (!error) set({ lastSyncedAt: todayLocalDate() });
      },
    }),
    {
      name: 'vivix-social-store-v1',
      version: 1,
      // 只 persist 身分與開關；好友列表每次 refresh 拉取
      partialize: (s) => ({
        enabled: s.enabled,
        userId: s.userId,
        friendCode: s.friendCode,
        displayName: s.displayName,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          try {
            localStorage.removeItem('vivix-social-store-v1');
          } catch {
            /* noop */
          }
        }
      },
    },
  ),
);
