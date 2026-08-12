import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MuscleGroup, GroupStats } from '@/types';
import { MUSCLE_GROUP_LABELS } from '@/types';

export type AchievementTier = 'bronze' | 'silver' | 'gold';

export interface AchievementDef {
  id: string;
  tier: AchievementTier;
  icon: string;
  title: string;
  description: string;
  kind:
    | 'sessions'          // 全局：總訓練次數
    | 'streak'            // 全局：連續天數
    | 'volume_ton'        // 全局：總噸數（保留但不新增）
    | 'pr_count'          // 全局：總 PR 數（保留但不新增）
    | 'exercises_variety' // 全局：動作多樣性
    // ---- T-02 分部位 ----
    | 'group_workouts'    // 部位：訓練日數
    | 'group_pr_count'    // 部位：PR 次數
    | 'group_volume_ton'; // 部位：體積噸數（乘上 WEIGHT_MILESTONE_MULTIPLIERS 做公平校準）
  threshold: number;
  /** 若為分部位成就，綁定的 muscleGroup */
  muscleGroup?: MuscleGroup;
}

export interface AchievementProgress {
  unlocked: boolean;
  unlockedAt?: string;
  current: number;
}

/**
 * 全局 + 分部位成就的 derive 上下文。
 * 由 Dashboard / Achievements 頁從 workoutStore 拉出 groupStats 後傳入 recompute。
 */
interface DeriveContext {
  // 全局
  totalSessions: number;
  streak: number;
  totalVolumeTon: number;
  prCount: number;
  exercisesVariety: number;
  // 分部位（T-02 新增）
  groupStats: Record<MuscleGroup, GroupStats>;
}

// ============ 成就清單：全局 + 分部位 ============
// 核心原則（§6 T-02）：
//   1. 不使用跨部位全局重量門檻，重量型成就一律按部位校準
//   2. 優先使用次數型成就（workoutCount / PR次數 / 連續週數）
//   3. 腿部里程碑系數 1.8，確保腿部大重量不會加速胸部成就
// ============

export const ACHIEVEMENTS: AchievementDef[] = [
  // ---------- 全局成就（與舊版一致，保留已驗證體驗） ----------
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
    id: 'variety-10',
    tier: 'gold',
    icon: '🧩',
    title: '動作萬花筒',
    description: '嘗試 10 種不同的動作',
    kind: 'exercises_variety',
    threshold: 10,
  },

  // ---------- 分部位成就：每部位 3 個（銅 3 次 → 銀 8 次 → 金 1 PR + 校準體積） ----------
  // 胸部
  {
    id: 'chest_workouts_3',
    tier: 'bronze',
    icon: '💪',
    title: '胸部穩定訓練',
    description: '完成 3 次含胸部主項目的訓練',
    kind: 'group_workouts',
    muscleGroup: 'chest',
    threshold: 3,
  },
  {
    id: 'chest_workouts_8',
    tier: 'silver',
    icon: '🏔️',
    title: '胸部堅持者',
    description: '完成 8 次胸部訓練',
    kind: 'group_workouts',
    muscleGroup: 'chest',
    threshold: 8,
  },
  {
    id: 'chest_first_pr',
    tier: 'silver',
    icon: '🎯',
    title: '胸部第一次突破',
    description: '胸部動作達成 1 次 PR',
    kind: 'group_pr_count',
    muscleGroup: 'chest',
    threshold: 1,
  },
  // 背部
  {
    id: 'back_workouts_3',
    tier: 'bronze',
    icon: '🦾',
    title: '背部入門',
    description: '完成 3 次背部訓練',
    kind: 'group_workouts',
    muscleGroup: 'back',
    threshold: 3,
  },
  {
    id: 'back_workouts_8',
    tier: 'silver',
    icon: '🐉',
    title: '闊背養成',
    description: '完成 8 次背部訓練',
    kind: 'group_workouts',
    muscleGroup: 'back',
    threshold: 8,
  },
  {
    id: 'back_first_pr',
    tier: 'silver',
    icon: '🎯',
    title: '背部第一次突破',
    description: '背部動作達成 1 次 PR',
    kind: 'group_pr_count',
    muscleGroup: 'back',
    threshold: 1,
  },
  // 腿部（里程碑校準：1.8 倍系數，避免大重量快速刷成就）
  {
    id: 'legs_workouts_3',
    tier: 'bronze',
    icon: '🦵',
    title: '腿部起步',
    description: '完成 3 次腿部訓練',
    kind: 'group_workouts',
    muscleGroup: 'legs',
    threshold: 3,
  },
  {
    id: 'legs_workouts_8',
    tier: 'silver',
    icon: '🏗️',
    title: '腿部堅持者',
    description: '完成 8 次腿部訓練',
    kind: 'group_workouts',
    muscleGroup: 'legs',
    threshold: 8,
  },
  {
    id: 'legs_first_pr',
    tier: 'silver',
    icon: '🎯',
    title: '腿部第一次突破',
    description: '腿部動作達成 1 次 PR',
    kind: 'group_pr_count',
    muscleGroup: 'legs',
    threshold: 1,
  },
  // 肩膀
  {
    id: 'shoulders_workouts_3',
    tier: 'bronze',
    icon: '🏛️',
    title: '肩膀基礎',
    description: '完成 3 次肩膀訓練',
    kind: 'group_workouts',
    muscleGroup: 'shoulders',
    threshold: 3,
  },
  {
    id: 'shoulders_workouts_8',
    tier: 'silver',
    icon: '⚓',
    title: '肩寬養成',
    description: '完成 8 次肩膀訓練',
    kind: 'group_workouts',
    muscleGroup: 'shoulders',
    threshold: 8,
  },
  // 手臂
  {
    id: 'arms_workouts_3',
    tier: 'bronze',
    icon: '💪',
    title: '手臂覺醒',
    description: '完成 3 次手臂訓練',
    kind: 'group_workouts',
    muscleGroup: 'arms',
    threshold: 3,
  },
  {
    id: 'arms_workouts_8',
    tier: 'silver',
    icon: '⚔️',
    title: '手臂雕刻',
    description: '完成 8 次手臂訓練',
    kind: 'group_workouts',
    muscleGroup: 'arms',
    threshold: 8,
  },
  // 核心
  {
    id: 'core_workouts_3',
    tier: 'bronze',
    icon: '🧱',
    title: '核心啟動',
    description: '完成 3 次核心訓練',
    kind: 'group_workouts',
    muscleGroup: 'core',
    threshold: 3,
  },
  {
    id: 'core_workouts_8',
    tier: 'silver',
    icon: '🏆',
    title: '核心鋼鐵',
    description: '完成 8 次核心訓練',
    kind: 'group_workouts',
    muscleGroup: 'core',
    threshold: 8,
  },
];

export const TIER_STYLES: Record<AchievementTier, { badge: string; ring: string; title: string }> = {
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

const TIER_ORDER: Record<AchievementTier, number> = { bronze: 1, silver: 2, gold: 3 };

export const SORTED_ACHIEVEMENTS: AchievementDef[] = [...ACHIEVEMENTS].sort(
  (a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.threshold - b.threshold
);

/**
 * 把成就按 muscleGroup 分組（全局放 'global'）
 * 用於 Achievements 頁 UI 分區顯示
 */
export function groupAchievementsByCategory(): Record<'global' | MuscleGroup, AchievementDef[]> {
  const out: Record<string, AchievementDef[]> = {
    global: [], chest: [], back: [], legs: [], shoulders: [], arms: [], core: [],
  };
  for (const a of ACHIEVEMENTS) {
    if (a.muscleGroup) out[a.muscleGroup]?.push(a);
    else out.global.push(a);
  }
  return out as any;
}

interface AchievementsState {
  progress: Record<string, AchievementProgress>;
  seenUnlockIds: string[];
  pendingUnlockId: string | null;

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

/**
 * 計算單個成就的 current 值。
 * 核心：分部位成就只計算對應 muscleGroup 的數據，
 *      腿部重量不會加速胸部成就（P-01 根因修復）。
 */
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
    // ---- 分部位 ----
    case 'group_workouts': {
      if (!a.muscleGroup) return 0;
      return ctx.groupStats[a.muscleGroup]?.workoutCount ?? 0;
    }
    case 'group_pr_count': {
      if (!a.muscleGroup) return 0;
      return ctx.groupStats[a.muscleGroup]?.prCount ?? 0;
    }
    case 'group_volume_ton': {
      if (!a.muscleGroup) return 0;
      // 未來若啟用：已校準門檻 + 這裡不乘系數，或乘系數都可。
      // 目前版本優先使用次數型成就，此 kind 保留不開 UI。
      return Math.round((ctx.groupStats[a.muscleGroup]?.totalVolumeKg ?? 0) / 1000);
    }
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
              unlocked && !prevP.unlocked ? new Date().toISOString() : prevP.unlockedAt,
            current: Math.max(prevP.current ?? 0, current),
          };
        }
        // 彈窗優先：銅牌 > 第一個
        let pending: string | null = null;
        const bronze = newUnlocks.find((id) => {
          const d = ACHIEVEMENTS.find((x) => x.id === id);
          return d?.tier === 'bronze';
        });
        pending = bronze ?? newUnlocks[0] ?? null;
        set({ progress: next, pendingUnlockId: pending });
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
      version: 2,
      migrate: (persistedState, version) => {
        const s = (persistedState ?? {}) as Partial<AchievementsState>;
        const base = emptyProgress();
        const incoming = s.progress ?? {};
        for (const id of Object.keys(base)) {
          if (incoming[id]) base[id] = { ...base[id], ...incoming[id] };
        }
        return {
          progress: base,
          seenUnlockIds: s.seenUnlockIds ?? [],
          pendingUnlockId: null,
        };
      },
    }
  )
);
