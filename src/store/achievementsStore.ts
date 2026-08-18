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
import type { MuscleGroup, GroupStats, WorkoutSession, PersonalRecord, CardioSession } from '@/types';
import { estimate1RM } from '@/utils/workout';
import { DAY_MS, WEEK_MS } from '@/utils/time';
import { getStreakDays as getStreakDaysSelector, getConsecutiveWeeksWithCardio } from '@/features/stats/selectors';
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
  /** D3：null 表示未填體重，BW 軌成就不觸發 */
  bodyWeight: number | null;
  hasCustomExercises: boolean;
  hasCustomPlans: boolean;
  groupStats: Record<MuscleGroup, GroupStats>;
  /** E-D3：有氧 session（事實；用於 streak union + cardio 成就） */
  cardioSessions: CardioSession[];
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
  totalVolumeKg: number;
  startKgByFamily: Partial<Record<LiftFamily, number>>;
  weeksSinceFirst: number;
  // E-05：cardio 指標
  cardioMinutesTotal: number;
  cardioSessionsTotal: number;
  cardioWeeklyRhythmWeeks: number;
  // I-2：匯入行為 metric（Errata E4，匯入行為成就進度）
  sessionsImportedTotal: number;
}

// ── Compute all metrics from raw data ──
function computeMetrics(ctx: DeriveContext): ComputedMetrics {
  const { sessions, personalRecords, bodyWeight, hasCustomExercises, hasCustomPlans, groupStats, cardioSessions } = ctx;

  // 1. est1RM by family (from PRs)
  const maxEst1RMByFamily: Partial<Record<LiftFamily, number>> = {};
  const startKgByFamily: Partial<Record<LiftFamily, number>> = {};
  for (const pr of personalRecords) {
    const family = getLiftFamily(pr.exerciseId, pr.exerciseName, pr.liftFamily);
    if (!family) continue;
    const prev = maxEst1RMByFamily[family];
    if (prev === undefined || pr.estimated1RM > prev) {
      maxEst1RMByFamily[family] = pr.estimated1RM;
    }
    // Track first recorded 1RM for delta + startKg copy
    if (!startKgByFamily[family]) {
      startKgByFamily[family] = pr.estimated1RM;
    }
  }

  // 2. est1RM / bodyweight — D3：bodyWeight 為 null 時 BW 軌指標留空（成就不觸發）
  const maxEst1RMBWByFamily: Partial<Record<LiftFamily, number>> = {};
  if (bodyWeight !== null && bodyWeight > 0) {
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

  // 5. streak — C3：統一走 stats/selectors 權威實作（D1 語義）
  const streak = getStreakDaysSelector(sessions, cardioSessions);

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
    const count = weekMap.get(weekKey) ?? 0;
    if (count >= 2) {
      if (prevWeek) {
        const diff = Math.round(
          (new Date(weekKey).getTime() - prevWeek.getTime()) / WEEK_MS,
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
    const vol = monthMap.get(monthKey) ?? 0;
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
    weeksSinceFirst = Math.floor((now - first) / WEEK_MS);
  }

  // 16. total volume
  const totalVolumeKg = sessions.reduce((sum, s) => sum + s.totalVolume, 0);

  // E-05：cardio（時長加總、次數、連續週節律）
  const cardioMinutesTotal = cardioSessions.reduce((s, c) => s + (Number.isFinite(c.durationMin) ? c.durationMin : 0), 0);
  const cardioSessionsTotal = cardioSessions.length;
  const cardioWeeklyRhythmWeeks = getConsecutiveWeeksWithCardio(cardioSessions);

  // I-2：匯入行為 metric（Errata E4）
  const sessionsImportedTotal = sessions.filter((s) => s.imported === true).length;

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
    cardioMinutesTotal,
    cardioSessionsTotal,
    cardioWeeklyRhythmWeeks,
    sessionsImportedTotal,
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
    case 'cardio_minutes':
      return metrics.cardioMinutesTotal;
    case 'cardio_sessions':
      return metrics.cardioSessionsTotal;
    case 'cardio_weekly_rhythm':
      return metrics.cardioWeeklyRhythmWeeks;
    case 'sessions_imported_total': // Errata E4
      return metrics.sessionsImportedTotal;
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

// ── Store interface ──
interface AchievementsState {
  progress: Record<string, AchievementProgress>;
  seenUnlockIds: string[];
  pendingUnlockIds: string[]; // 改為陣列支援多解鎖
  lastMetrics: ComputedMetrics | null;

  recompute: (ctx: DeriveContext, opts?: { silent?: boolean }) => string[];
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

export const useAchievementsStore = create<AchievementsState>()(
  persist(
    (set, get) => ({
      progress: emptyProgress(),
      seenUnlockIds: [],
      pendingUnlockIds: [],
      lastMetrics: null,

      recompute: (ctx, opts) => {
        const silent = opts?.silent === true;
        const prev = get().progress ?? {};
        const next = { ...prev };
        const metrics = computeMetrics(ctx);
        const newUnlocks: string[] = [];

        for (const def of ACHIEVEMENTS) {
          const prevP = prev[def.id] ?? { unlocked: false, current: 0 };
          const current = currentOf(metrics, def);
          const reached = current >= def.threshold;
          const alreadyUnlocked = !!prevP.unlockedAt;

          // D2：unlocked 永久保存 — 一旦 unlockedAt 被設置就不清除
          // A-005：current 一律 live 計算（不 Math.max 單調遞增）
          if (reached && !alreadyUnlocked) {
            newUnlocks.push(def.id);
            next[def.id] = {
              unlocked: true,
              unlockedAt: new Date().toISOString(),
              current,
            };
          } else {
            next[def.id] = {
              unlocked: alreadyUnlocked,
              unlockedAt: prevP.unlockedAt,
              current,
            };
          }
        }

        set({
          progress: next,
          // silent：解鎖仍然永久，但不 push 到 pending（避免匯入批次重複慶祝）
          pendingUnlockIds: silent ? [] : newUnlocks,
          // C4：lastMetrics 為衍生資料，記憶體中保留供 UI format 用，不 persist
          lastMetrics: metrics,
        });

        // C5：telemetry 統一由 settleAll 編排點 log（此處不再直接 import telemetryStore）

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
      version: 4,
      // ⚠️ 容錯兜底：LocalStorage 損壞時優雅重置為預設值，唔會白屏崩潰
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('[achievementsStore] Zustand hydration failed, falling back to defaults', error);
            try {
              localStorage.removeItem('ironpulse-achievements');
            } catch {}
          }
        };
      },
      // C4 / L1：只 persist 永久決定（unlockedAt、seen、pending）；lastMetrics 和 current 為衍生，不 persist
      partialize: (state) => ({
        // progress 只保留 unlockedAt（D2 永久）；current 不 persist（live 計算）
        progress: Object.fromEntries(
          Object.entries(state.progress).map(([id, p]) => [
            id,
            { unlockedAt: p.unlockedAt } as AchievementProgress,
          ]),
        ),
        seenUnlockIds: state.seenUnlockIds,
        pendingUnlockIds: state.pendingUnlockIds,
      }),
      migrate: (persistedState, version) => {
        const s = (persistedState ?? {}) as Partial<AchievementsState>;
        const base = emptyProgress();
        const incoming = s.progress ?? {};
        // Merge: keep unlockedAt from old progress (D2 永久); current 重設為 0 (recompute 時 live)
        for (const id of Object.keys(base)) {
          if (incoming[id]) {
            base[id] = {
              unlocked: !!incoming[id].unlockedAt,
              unlockedAt: incoming[id].unlockedAt,
              current: 0,
            };
          }
        }
        // For old achievement IDs that no longer exist, mark as unlocked (preserve old unlocks)
        for (const id of Object.keys(incoming)) {
          if (!base[id] && incoming[id]?.unlockedAt) {
            base[id] = { unlocked: true, unlockedAt: incoming[id].unlockedAt, current: 0 };
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
