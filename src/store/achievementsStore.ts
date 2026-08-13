/**
 * Vivix 成就引擎 v1.3 — pure functions over workout history + taxonomy
 *
 * 設計原則：
 *   - state 只存 { unlockedAt, progress } 快取
 *   - recompute 時從 raw data 派生所有 metric
 *   - 分部位；自訂動作分類後自動計入（P-01 回寫）
 *   - 首 session 保證 ≥2 解鎖（第一步 + 熱身先鋒）
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MuscleGroup, GroupStats, WorkoutSession, PersonalRecord } from '@/types';
import { estimate1RM } from '@/utils/workout';
import { useTelemetryStore } from '@/features/partner/stores/telemetryStore';
import {
  ACHIEVEMENTS,
  SORTED_ACHIEVEMENTS,
  TIER_COLORS,
  TRACK_LABELS,
  TRACK_ICONS,
  groupByTrack,
  groupByLine,
  getLiftFamily,
  type AchievementDef,
  type AchievementTrack,
  type LiftFamily,
  type AchievementMetric,
} from '@/data/achievements';

// ── Re-export for backward compat ──
export {
  ACHIEVEMENTS,
  SORTED_ACHIEVEMENTS,
  TIER_COLORS,
  TRACK_LABELS,
  TRACK_ICONS,
  groupByTrack,
  groupByLine,
  getLiftFamily,
};
export type { AchievementDef, AchievementTrack, LiftFamily, AchievementMetric };

// ── Types ──
export interface AchievementProgress {
  unlocked: boolean;
  unlockedAt?: string;
  current: number;
}

export interface DeriveContext {
  sessions: WorkoutSession[];
  personalRecords: PersonalRecord[];
  bodyWeight: number;
  hasCustomExercises: boolean;
  hasCustomPlans: boolean;
  groupStats: Record<MuscleGroup, GroupStats>;
}

// ── Pre-computed metrics (避免 per-achievement 重算) ──
interface ComputedMetrics {
  maxEst1RMByFamily: Partial<Record<LiftFamily, number>>;
  maxEst1RMBWByFamily: Partial<Record<LiftFamily, number>>;
  maxDelta: number;
  firstEst1RMByExercise: Map<string, number>;
  sessions: number;
  streak: number;
  weeklyRhythm: number;
  volumeDeltaMonths: number;
  maxPRsPerSession: number;
  groupPR: Partial<Record<MuscleGroup, number>>;
  groupPRAll: number;
  groupCoverage1: number;
  groupCoverage3: number;
  warmupCount: number;
  fullPlanCount: number;
  perfectLogCount: number;
  explorer: number;
  // For copy formatting
  totalVolumeKg: number;
  startKgByFamily: Partial<Record<LiftFamily, number>>;
  weeksSinceFirst: number;
}

// ── Compute all metrics from raw data ──
function computeMetrics(ctx: DeriveContext): ComputedMetrics {
  const { sessions, personalRecords, bodyWeight, hasCustomExercises, hasCustomPlans, groupStats } = ctx;

  // 1. est1RM by family (from PRs)
  const maxEst1RMByFamily: Partial<Record<LiftFamily, number>> = {};
  const startKgByFamily: Partial<Record<LiftFamily, number>> = {};
  for (const pr of personalRecords) {
    const family = getLiftFamily(pr.exerciseId, pr.exerciseName);
    if (!family) continue;
    if (!maxEst1RMByFamily[family] || pr.estimated1RM > maxEst1RMByFamily[family]!) {
      maxEst1RMByFamily[family] = pr.estimated1RM;
    }
    // Track first recorded 1RM for delta + startKg copy
    if (!startKgByFamily[family]) {
      startKgByFamily[family] = pr.estimated1RM;
    }
  }

  // 2. est1RM / bodyweight
  const maxEst1RMBWByFamily: Partial<Record<LiftFamily, number>> = {};
  if (bodyWeight > 0) {
    for (const [family, kg] of Object.entries(maxEst1RMByFamily)) {
      if (kg !== undefined) {
        maxEst1RMBWByFamily[family as LiftFamily] = kg / bodyWeight;
      }
    }
  }

  // 3. est1RM delta (max improvement ratio across all exercises)
  const firstEst1RMByExercise = new Map<string, number>();
  const maxEst1RMByExercise = new Map<string, number>();
  // Sort sessions chronologically
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  for (const s of sortedSessions) {
    for (const ex of s.exercises) {
      const completed = ex.sets.filter((set) => set.completed && set.weight > 0 && set.reps > 0);
      if (completed.length === 0) continue;
      let max1RM = 0;
      for (const set of completed) {
        const rm = estimate1RM(set.weight, set.reps);
        if (rm > max1RM) max1RM = rm;
      }
      if (!firstEst1RMByExercise.has(ex.exerciseId)) {
        firstEst1RMByExercise.set(ex.exerciseId, max1RM);
      }
      const prev = maxEst1RMByExercise.get(ex.exerciseId) ?? 0;
      if (max1RM > prev) maxEst1RMByExercise.set(ex.exerciseId, max1RM);
    }
  }
  let maxDelta = 0;
  for (const [exId, max1RM] of maxEst1RMByExercise) {
    const first = firstEst1RMByExercise.get(exId);
    if (first && first > 0) {
      const delta = (max1RM - first) / first;
      if (delta > maxDelta) maxDelta = delta;
    }
  }

  // 4. sessions
  const totalSessions = sessions.length;

  // 5. streak (max consecutive days)
  const sessionDates = new Set(
    sessions.map((s) => new Date(s.date).toDateString()),
  );
  let streak = 0;
  const today = new Date();
  // Start from today, walk backwards
  const cursor = new Date(today);
  while (sessionDates.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // 6. weekly rhythm (consecutive weeks with ≥2 sessions)
  const weekMap = new Map<string, number>();
  for (const s of sessions) {
    const d = new Date(s.date);
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - diff);
    const key = monday.toDateString();
    weekMap.set(key, (weekMap.get(key) ?? 0) + 1);
  }
  const sortedWeeks = Array.from(weekMap.keys()).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );
  let weeklyRhythm = 0;
  let currentRun = 0;
  let prevWeek: Date | null = null;
  for (const weekKey of sortedWeeks) {
    const count = weekMap.get(weekKey)!;
    if (count >= 2) {
      if (prevWeek) {
        const diff = Math.round(
          (new Date(weekKey).getTime() - prevWeek.getTime()) / (7 * 86400000),
        );
        if (diff === 1) {
          currentRun++;
        } else {
          currentRun = 1;
        }
      } else {
        currentRun = 1;
      }
      if (currentRun > weeklyRhythm) weeklyRhythm = currentRun;
      prevWeek = new Date(weekKey);
    } else {
      currentRun = 0;
      prevWeek = null;
    }
  }

  // 7. volume delta months (consecutive months with increasing volume)
  const monthMap = new Map<string, number>();
  for (const s of sessions) {
    const d = new Date(s.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthMap.set(key, (monthMap.get(key) ?? 0) + s.totalVolume);
  }
  const sortedMonths = Array.from(monthMap.keys()).sort(
    (a, b) => {
      const [ay, am] = a.split('-').map(Number);
      const [by, bm] = b.split('-').map(Number);
      return ay !== by ? ay - by : am - bm;
    },
  );
  let volumeDeltaMonths = 0;
  let currentVolRun = 0;
  let prevVol = 0;
  for (const monthKey of sortedMonths) {
    const vol = monthMap.get(monthKey)!;
    if (prevVol > 0 && vol > prevVol) {
      currentVolRun++;
    } else {
      currentVolRun = vol > 0 ? 1 : 0;
    }
    if (currentVolRun > volumeDeltaMonths) volumeDeltaMonths = currentVolRun;
    prevVol = vol;
  }

  // 8. max PRs per session
  // Count: for each session, how many exercises had a new all-time max 1RM
  const runningMaxByExercise = new Map<string, number>();
  let maxPRsPerSession = 0;
  for (const s of sortedSessions) {
    let sessionPRs = 0;
    for (const ex of s.exercises) {
      const completed = ex.sets.filter((set) => set.completed && set.weight > 0 && set.reps > 0);
      if (completed.length === 0) continue;
      let max1RM = 0;
      for (const set of completed) {
        const rm = estimate1RM(set.weight, set.reps);
        if (rm > max1RM) max1RM = rm;
      }
      const prev = runningMaxByExercise.get(ex.exerciseId) ?? 0;
      if (max1RM > prev) {
        sessionPRs++;
        runningMaxByExercise.set(ex.exerciseId, max1RM);
      }
    }
    if (sessionPRs > maxPRsPerSession) maxPRsPerSession = sessionPRs;
  }

  // 9. group PR counts
  const groupPR: Partial<Record<MuscleGroup, number>> = {};
  let groupPRAll = 0;
  const groups: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];
  for (const g of groups) {
    const count = groupStats[g]?.prCount ?? 0;
    groupPR[g] = count;
    if (count > 0) groupPRAll++;
  }

  // 10. group coverage
  let groupCoverage1 = 0;
  let groupCoverage3 = 0;
  for (const g of groups) {
    const wc = groupStats[g]?.workoutCount ?? 0;
    if (wc >= 1) groupCoverage1++;
    if (wc >= 3) groupCoverage3++;
  }

  // 11. warmup count
  const warmupCount = sessions.reduce(
    (sum, s) => sum + (s.warmupCompletedIds?.length ?? 0),
    0,
  );

  // 12. full plan count (sessions where all sets completed)
  let fullPlanCount = 0;
  for (const s of sessions) {
    if (!s.planId) continue;
    const allCompleted = s.exercises.length > 0 && s.exercises.every((ex) =>
      ex.sets.length > 0 && ex.sets.every((set) => set.completed),
    );
    if (allCompleted) fullPlanCount++;
  }

  // 13. perfect log count (all sets have weight > 0 and reps > 0)
  let perfectLogCount = 0;
  for (const s of sessions) {
    const allLogged = s.exercises.length > 0 && s.exercises.every((ex) =>
      ex.sets.length > 0 && ex.sets.every((set) => set.weight > 0 && set.reps > 0),
    );
    if (allLogged) perfectLogCount++;
  }

  // 14. explorer
  const explorer = hasCustomExercises || hasCustomPlans ? 1 : 0;

  // 15. weeks since first session
  let weeksSinceFirst = 0;
  if (sessions.length > 0) {
    const first = new Date(sortedSessions[0].date).getTime();
    const now = Date.now();
    weeksSinceFirst = Math.floor((now - first) / (7 * 86400000));
  }

  // 16. total volume
  const totalVolumeKg = sessions.reduce((sum, s) => sum + s.totalVolume, 0);

  return {
    maxEst1RMByFamily,
    maxEst1RMBWByFamily,
    maxDelta,
    firstEst1RMByExercise,
    sessions: totalSessions,
    streak,
    weeklyRhythm,
    volumeDeltaMonths,
    maxPRsPerSession,
    groupPR,
    groupPRAll,
    groupCoverage1,
    groupCoverage3,
    warmupCount,
    fullPlanCount,
    perfectLogCount,
    explorer,
    totalVolumeKg,
    startKgByFamily,
    weeksSinceFirst,
  };
}

// ── Lookup metric value for a specific achievement ──
function currentOf(metrics: ComputedMetrics, def: AchievementDef): number {
  switch (def.metric) {
    case 'est1RM_kg': {
      if (!def.liftFamily) return 0;
      return metrics.maxEst1RMByFamily[def.liftFamily] ?? 0;
    }
    case 'est1RM_bw': {
      if (!def.liftFamily) return 0;
      return metrics.maxEst1RMBWByFamily[def.liftFamily] ?? 0;
    }
    case 'est1RM_delta':
      return metrics.maxDelta;
    case 'sessions':
      return metrics.sessions;
    case 'streak':
      return metrics.streak;
    case 'weekly_rhythm':
      return metrics.weeklyRhythm;
    case 'volume_delta_months':
      return metrics.volumeDeltaMonths;
    case 'pr_count_session':
      return metrics.maxPRsPerSession;
    case 'group_pr': {
      if (!def.muscleGroup) return 0;
      return metrics.groupPR[def.muscleGroup] ?? 0;
    }
    case 'group_pr_all':
      return metrics.groupPRAll;
    case 'group_coverage':
      // threshold 1 → groups with ≥1 workout; threshold 3 → groups with ≥3 workouts
      return def.threshold <= 1 ? metrics.groupCoverage1 : metrics.groupCoverage3;
    case 'warmup_count':
      return metrics.warmupCount;
    case 'full_plan_count':
      return metrics.fullPlanCount;
    case 'perfect_log_count':
      return metrics.perfectLogCount;
    case 'explorer':
      return metrics.explorer;
    default:
      return 0;
  }
}

// ── Format copy template ──
export function formatAchievementCopy(def: AchievementDef, metrics: ComputedMetrics): string {
  let copy = def.copy;
  if (def.liftFamily) {
    const kg = metrics.maxEst1RMByFamily[def.liftFamily];
    const startKg = metrics.startKgByFamily[def.liftFamily];
    copy = copy.replace(/\{kg\}/g, kg ? Math.round(kg).toString() : '—');
    copy = copy.replace(/\{startKg\}/g, startKg ? Math.round(startKg).toString() : '—');
    copy = copy.replace(/\{weeks\}/g, metrics.weeksSinceFirst.toString());
    copy = copy.replace(/\{sessions\}/g, metrics.sessions.toString());
    const bw = metrics.maxEst1RMBWByFamily[def.liftFamily];
    copy = copy.replace(/\{ratio\}/g, bw ? bw.toFixed(2) : '—');
  }
  copy = copy.replace(/\{sessions\}/g, metrics.sessions.toString());
  return copy;
}

// ── Next achievement (highest progress %, not yet unlocked) ──
export function getNextAchievement(
  metrics: ComputedMetrics,
  progress: Record<string, AchievementProgress>,
): { def: AchievementDef; ratio: number; current: number; threshold: number } | null {
  let best: { def: AchievementDef; ratio: number; current: number; threshold: number } | null = null;
  for (const def of ACHIEVEMENTS) {
    const p = progress[def.id];
    if (p?.unlocked) continue;
    const current = currentOf(metrics, def);
    const ratio = def.threshold > 0 ? Math.min(current / def.threshold, 1) : 0;
    if (!best || ratio > best.ratio) {
      best = { def, ratio, current, threshold: def.threshold };
    }
  }
  return best;
}

// ── Store interface ──
interface AchievementsState {
  progress: Record<string, AchievementProgress>;
  seenUnlockIds: string[];
  pendingUnlockIds: string[]; // 改為陣列支援多解鎖
  lastMetrics: ComputedMetrics | null;

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

// ── Backward compat: old TIER_STYLES ──
export const TIER_STYLES: Record<string, { badge: string; ring: string; title: string }> = {
  1: { badge: 'bg-stone-500/20 text-stone-400 border-stone-500/40', ring: 'from-stone-500/40', title: '石' },
  2: { badge: 'bg-amber-700/20 text-amber-600 border-amber-700/40', ring: 'from-amber-700/40', title: '銅' },
  3: { badge: 'bg-slate-400/20 text-slate-300 border-slate-400/40', ring: 'from-slate-400/50', title: '銀' },
  4: { badge: 'bg-amber-500/20 text-amber-400 border-amber-500/50', ring: 'from-amber-500/60', title: '金' },
  5: { badge: 'bg-amber-400/20 text-amber-300 border-amber-400/50', ring: 'from-amber-400/70', title: '電' },
};

// ── Backward compat: groupAchievementsByCategory ──
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

export const useAchievementsStore = create<AchievementsState>()(
  persist(
    (set, get) => ({
      progress: emptyProgress(),
      seenUnlockIds: [],
      pendingUnlockIds: [],
      lastMetrics: null,

      recompute: (ctx) => {
        const prev = get().progress ?? {};
        const next = { ...prev };
        const metrics = computeMetrics(ctx);
        const newUnlocks: string[] = [];

        for (const def of ACHIEVEMENTS) {
          const prevP = prev[def.id] ?? { unlocked: false, current: 0 };
          const current = currentOf(metrics, def);
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

        set({
          progress: next,
          pendingUnlockIds: newUnlocks,
          lastMetrics: metrics,
        });

        // Telemetry: 記錄新解鎖
        if (newUnlocks.length > 0) {
          const log = useTelemetryStore.getState().log;
          for (const id of newUnlocks) {
            const def = ACHIEVEMENTS.find((a) => a.id === id);
            if (def) {
              log('achievement_unlocked', { id, track: def.track, tier: def.tier });
            }
          }
        }

        return newUnlocks;
      },

      markUnlockSeen: (id) =>
        set((state) => ({
          seenUnlockIds: state.seenUnlockIds.includes(id)
            ? state.seenUnlockIds
            : [...state.seenUnlockIds, id],
          pendingUnlockIds: state.pendingUnlockIds.filter((x) => x !== id),
        })),

      clearPending: () => set({ pendingUnlockIds: [] }),

      reset: () =>
        set({
          progress: emptyProgress(),
          seenUnlockIds: [],
          pendingUnlockIds: [],
          lastMetrics: null,
        }),
    }),
    {
      name: 'ironpulse-achievements',
      version: 3,
      migrate: (persistedState, version) => {
        const s = (persistedState ?? {}) as Partial<AchievementsState>;
        const base = emptyProgress();
        const incoming = s.progress ?? {};
        // Merge: keep unlocked state from old progress, reset current to 0 (will be recomputed)
        for (const id of Object.keys(base)) {
          if (incoming[id]) {
            base[id] = {
              unlocked: incoming[id].unlocked ?? false,
              unlockedAt: incoming[id].unlockedAt,
              current: incoming[id].current ?? 0,
            };
          }
        }
        // For old achievement IDs that no longer exist, mark as unlocked (preserve old unlocks)
        for (const id of Object.keys(incoming)) {
          if (!base[id] && incoming[id]?.unlocked) {
            // Old achievement no longer in catalog — preserve unlock but don't display
            base[id] = { unlocked: true, unlockedAt: incoming[id].unlockedAt, current: incoming[id].current ?? 0 };
          }
        }
        return {
          progress: base,
          seenUnlockIds: s.seenUnlockIds ?? [],
          pendingUnlockIds: [],
          lastMetrics: null,
        };
      },
    }
  )
);
