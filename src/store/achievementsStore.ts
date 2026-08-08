import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AchievementTier = 'bronze' | 'silver' | 'gold';

export interface AchievementDef {
  id: string;
  tier: AchievementTier;
  icon: string; // emoji
  title: string;
  description: string;
  /** 進度類型：用 derive 計算，threshold 為達成數字 */
  kind:
    | 'sessions'
    | 'streak'
    | 'volume_ton'
    | 'pr_count'
    | 'exercises_variety';
  threshold: number;
}

export interface AchievementProgress {
  unlocked: boolean;
  unlockedAt?: string; // ISO
  /** 目前進度（針對非 boolean 類型成就） */
  current: number;
}

interface DeriveContext {
  totalSessions: number;
  streak: number;
  totalVolumeTon: number;
  prCount: number;
  exercisesVariety: number;
}

// MVP: 7 個核心成就，先銅後銀金，漸進解鎖
export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-sweat',
    tier: 'bronze',
    icon: '🌱',
    title: '第一次流汗',
    description: '完成你的第一次訓練',
    kind: 'sessions',
    threshold: 1,
  },
  {
    id: 'habit-3',
    tier: 'bronze',
    icon: '🫡',
    title: '3 天連續',
    description: '連續 3 天訓練，習慣開始成型',
    kind: 'streak',
    threshold: 3,
  },
  {
    id: 'first-pr',
    tier: 'bronze',
    icon: '🏋️',
    title: '第一個 PR',
    description: '解鎖第一個個人紀錄',
    kind: 'pr_count',
    threshold: 1,
  },
  {
    id: 'sessions-10',
    tier: 'silver',
    icon: '🔥',
    title: '累計 10 次訓練',
    description: '10 次認真訓練，新手村畢業',
    kind: 'sessions',
    threshold: 10,
  },
  {
    id: 'streak-7',
    tier: 'silver',
    icon: '⚡',
    title: '一周不間斷',
    description: '連續 7 天訓練，Duolingo 級自律',
    kind: 'streak',
    threshold: 7,
  },
  {
    id: 'volume-1ton',
    tier: 'silver',
    icon: '🪨',
    title: '累積 1 噸',
    description: '歷史總訓練量達到 1,000 kg',
    kind: 'volume_ton',
    threshold: 1,
  },
  {
    id: 'variety-10',
    tier: 'gold',
    icon: '🧩',
    title: '動作萬花筒',
    description: '嘗試 10 種不同的動作',
    kind: 'exercises_variety',
    threshold: 10,
  },
  {
    id: 'volume-5ton',
    tier: 'gold',
    icon: '🏆',
    title: '5 噸先生/小姐',
    description: '歷史總訓練量達到 5,000 kg',
    kind: 'volume_ton',
    threshold: 5,
  },
];

export const TIER_STYLES: Record<
  AchievementTier,
  { badge: string; ring: string; title: string }
> = {
  bronze: {
    badge: 'bg-amber-500/20 text-amber-600 border-amber-500/40',
    ring: 'from-amber-500/60 via-amber-400/40 to-amber-500/10',
    title: '銅',
  },
  silver: {
    badge: 'bg-slate-300/20 text-slate-400 border-slate-300/40',
    ring: 'from-slate-300/70 via-slate-200/40 to-slate-400/10',
    title: '銀',
  },
  gold: {
    badge: 'bg-yellow-400/20 text-yellow-500 border-yellow-400/50',
    ring: 'from-yellow-400/80 via-amber-300/50 to-orange-500/20',
    title: '金',
  },
};

const TIER_ORDER: Record<AchievementTier, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
};

export const SORTED_ACHIEVEMENTS: AchievementDef[] = [...ACHIEVEMENTS].sort(
  (a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.threshold - b.threshold
);

interface AchievementsState {
  /** 每個成就的進度/解鎖狀態（以 id 為 key） */
  progress: Record<string, AchievementProgress>;
  /** 已看過解鎖動畫的成就 id（避免每次進 app 彈一次） */
  seenUnlockIds: string[];
  /** 當前要顯示的解鎖彈窗 id（暫存，UI 用） */
  pendingUnlockId: string | null;

  /**
   * 根據目前 workoutStore 的統計值，重新計算成就進度，回傳新解鎖的成就 id 列表
   * 並自動標註 pendingUnlockId。
   */
  recompute: (ctx: DeriveContext) => string[];
  markUnlockSeen: (id: string) => void;
  clearPending: () => void;
  reset: () => void;
}

function emptyProgress(): Record<string, AchievementProgress> {
  const res: Record<string, AchievementProgress> = {};
  for (const a of ACHIEVEMENTS) {
    res[a.id] = { unlocked: false, current: 0 };
  }
  return res;
}

function currentOf(ctx: DeriveContext, a: AchievementDef): number {
  switch (a.kind) {
    case 'sessions':
      return ctx.totalSessions;
    case 'streak':
      return ctx.streak;
    case 'volume_ton':
      return ctx.totalVolumeTon;
    case 'pr_count':
      return ctx.prCount;
    case 'exercises_variety':
      return ctx.exercisesVariety;
    default:
      return 0;
  }
}

export const useAchievementsStore = create<AchievementsState>()(
  persist(
    (set, get) => ({
      progress: emptyProgress(),
      seenUnlockIds: [],
      pendingUnlockId: null,

      recompute: (ctx) => {
        const prev = get().progress ?? {};
        const next = { ...prev };
        const newUnlocks: string[] = [];
        for (const def of ACHIEVEMENTS) {
          const prevP = prev[def.id] ?? { unlocked: false, current: 0 };
          const current = currentOf(ctx, def);
          const unlocked = current >= def.threshold;
          if (unlocked && !prevP.unlocked) {
            newUnlocks.push(def.id);
          }
          next[def.id] = {
            unlocked: unlocked || prevP.unlocked,
            unlockedAt:
              (unlocked && !prevP.unlocked) ? new Date().toISOString() : prevP.unlockedAt,
            current: Math.max(prevP.current ?? 0, current),
          };
        }
        // 彈窗：先取最早的一個銅牌，沒有就第一個（最多一次顯示一個）
        let pending: string | null = null;
        const bronze = newUnlocks.find((id) => {
          const d = ACHIEVEMENTS.find((x) => x.id === id);
          return d?.tier === 'bronze';
        });
        pending = bronze ?? newUnlocks[0] ?? null;
        set({
          progress: next,
          pendingUnlockId: pending,
        });
        return newUnlocks;
      },

      markUnlockSeen: (id) =>
        set((state) => ({
          seenUnlockIds: state.seenUnlockIds.includes(id)
            ? state.seenUnlockIds
            : [...state.seenUnlockIds, id],
          pendingUnlockId: state.pendingUnlockId === id ? null : state.pendingUnlockId,
        })),

      clearPending: () => set({ pendingUnlockId: null }),

      reset: () =>
        set({
          progress: emptyProgress(),
          seenUnlockIds: [],
          pendingUnlockId: null,
        }),
    }),
    {
      name: 'ironpulse-achievements',
      version: 1,
      migrate: (persistedState) => {
        const s = (persistedState ?? {}) as Partial<AchievementsState>;
        const base = emptyProgress();
        const incoming = s.progress ?? {};
        for (const id of Object.keys(base)) {
          if (incoming[id]) base[id] = { ...base[id], ...incoming[id] };
        }
        return {
          progress: base,
          seenUnlockIds: s.seenUnlockIds ?? [],
          pendingUnlockId: null, // 彈窗不持久化
        };
      },
    }
  )
);
