/**
 * Vivix 統計權威 selectors（C3 起頭；E-04 擴充 cardio streak union；T16/B-01 收納 store 統計函數）
 *
 * L2 規範：所有衍生統計一律出自本檔；store / 元件不得 inline 重算。
 * streak 權威在 selectors（D1 語義）；
 * T16/B-01：PR／groupStats／volume／progress 等統計函數由 workoutStore 遷入為純函數，
 * store 仍保留為薄 delegate（介面不變，消費端無感）。
 */
import type {
  CardioSession,
  WorkoutSession,
  PersonalRecord,
  MuscleGroup,
  GroupStats,
} from '@/types';
import { DAY_MS, sessionDayKey, dayKey, FOURTEEN_DAYS_MS } from '@/utils/time';
import { estimate1RM, getSessionPRs } from '@/utils/workout';
import { resolveCurrentTaxonomy } from '@/features/exercises/taxonomy';
import type { CustomExercise } from '@/store/workoutStore';

const MUSCLE_GROUPS: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];

/**
 * 計算連續訓練天數（D1 語義 + E-D3：streak = 力量日 ∪ 有氧日）
 *   - 今天有練（力量或有氧）→ 從今天起算
 *   - 今天未練但昨天有練 → 從昨天起算（仍視為延續）
 *   - 否則 0
 *
 * 同一日多次 session 視為一天；以本地時區 toDateString 去重。
 * 所有消費端（Dashboard／AchievementsPage／questStore）同源。
 */
export function getStreakDays(
  strengthSessions: WorkoutSession[],
  cardioSessions: CardioSession[] = [],
): number {
  if (strengthSessions.length === 0 && cardioSessions.length === 0) return 0;

  const seen = new Set<string>();
  for (const s of strengthSessions) seen.add(sessionDayKey(s.date));
  for (const c of cardioSessions) seen.add(sessionDayKey(c.date));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let cursor: Date;
  if (seen.has(dayKey(today))) {
    cursor = today;
  } else {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (seen.has(dayKey(yesterday))) {
      cursor = yesterday;
    } else {
      return 0;
    }
  }

  let streak = 0;
  while (seen.has(dayKey(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}

/** 每週 ≥1 次的連續週數（用於 cardio_weekly 成就） */
export function getConsecutiveWeeksWithCardio(cardioSessions: CardioSession[]): number {
  if (cardioSessions.length === 0) return 0;
  const weekSet = new Set<string>();
  for (const s of cardioSessions) {
    const d = new Date(s.date);
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - diff);
    weekSet.add(monday.toDateString());
  }
  const sorted = Array.from(weekSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  let run = 0, max = 0, prev: Date | null = null;
  for (const wk of sorted) {
    const cur = new Date(wk);
    if (prev) {
      const diff = Math.round((cur.getTime() - prev.getTime()) / (7 * DAY_MS));
      if (diff === 1) run++;
      else run = 1;
    } else {
      run = 1;
    }
    if (run > max) max = run;
    prev = cur;
  }
  return max;
}

// ============ 初始化空分部位統計骨架（private helper） ============
function emptyGroupStatsMap(): Record<MuscleGroup, GroupStats> {
  const out = {} as Record<MuscleGroup, GroupStats>;
  for (const g of MUSCLE_GROUPS) {
    out[g] = {
      muscleGroup: g,
      workoutCount: 0,
      totalVolumeKg: 0,
      prCount: 0,
      exerciseVariety: 0,
    };
  }
  return out;
}

// ============ P-01：PR 從 sessions rebuild（優先讀取當前分類） ============
export function computePRsFromSessions(
  sessions: WorkoutSession[],
  customExercises: CustomExercise[] = [],
): PersonalRecord[] {
  const map = new Map<string, PersonalRecord>();
  for (const session of sessions) {
    const sessionPRs = getSessionPRs(session);
    for (const pr of sessionPRs) {
      // P-01：優先使用當前 exercise 定義的分類，snapshot 僅兜底
      const cur = resolveCurrentTaxonomy(pr.exerciseId, customExercises, {
        muscleGroup: pr.muscleGroup,
        equipmentType: pr.equipmentType,
        name: pr.exerciseName,
      });
      const existing = map.get(pr.exerciseId);
      // P-4：bodyweight PR（repPR）用 reps 比較；weighted PR 用 estimated1RM
      const isBetter = !existing
        || (pr.repPR !== undefined
          ? (existing.repPR ?? 0) < pr.repPR
          : pr.estimated1RM > existing.estimated1RM);
      if (isBetter) {
        map.set(pr.exerciseId, {
          ...pr,
          muscleGroup: cur.muscleGroup,
          equipmentType: cur.equipmentType,
          liftFamily: cur.liftFamily,
        });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.estimated1RM - a.estimated1RM);
}

// ============ 簡單彙總 ============
export function getTotalSessions(sessions: WorkoutSession[]): number {
  return sessions.length;
}

export function getTotalVolume(sessions: WorkoutSession[]): number {
  return Math.round(
    sessions.reduce((sum, s) => sum + s.totalVolume, 0) / 1000
  );
}

export function getWeeklyVolume(sessions: WorkoutSession[]): { week: string; volume: number }[] {
  const weeklyMap = new Map<string, number>();
  for (const s of sessions) {
    const d = new Date(s.date);
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - diff);
    const key = `${monday.getMonth() + 1}/${monday.getDate()}`;
    weeklyMap.set(key, (weeklyMap.get(key) ?? 0) + s.totalVolume);
  }
  return Array.from(weeklyMap.entries())
    .map(([week, volume]) => ({ week, volume: Math.round(volume / 1000) }))
    .slice(-8);
}

// ============ 分部位統計（T-02） ============
export function getGroupStats(
  sessions: WorkoutSession[],
  prs: PersonalRecord[],
  customExercises: CustomExercise[],
): Record<MuscleGroup, GroupStats> {
  const out = emptyGroupStatsMap();

  // 每個部位的 unique 訓練日期 set 與 unique 動作 set
  const trainDatesByGroup: Record<MuscleGroup, Set<string>> = {
    chest: new Set(), back: new Set(), legs: new Set(),
    shoulders: new Set(), arms: new Set(), core: new Set(),
  };
  const varietyByGroup: Record<MuscleGroup, Set<string>> = {
    chest: new Set(), back: new Set(), legs: new Set(),
    shoulders: new Set(), arms: new Set(), core: new Set(),
  };
  const lastTrainedByGroup: Record<MuscleGroup, number> = {
    chest: 0, back: 0, legs: 0, shoulders: 0, arms: 0, core: 0,
  };

  for (const session of sessions) {
    const dateKey = sessionDayKey(session.date);
    const ts = new Date(session.date).getTime();
    for (const ex of session.exercises) {
      // P-01：優先讀取當前 exercise 定義的分類，snapshot 僅兜底
      const cur = resolveCurrentTaxonomy(ex.exerciseId, customExercises, {
        muscleGroup: ex.muscleGroup as MuscleGroup | undefined,
        equipmentType: ex.equipmentType,
        name: ex.name,
      });
      const group = cur.muscleGroup;
      if (!group) continue;
      const completed = ex.sets.filter((s) => s.completed);
      if (completed.length === 0) continue;
      const vol = completed.reduce((s, x) => s + x.weight * x.reps, 0);
      out[group].totalVolumeKg += vol;
      trainDatesByGroup[group].add(dateKey);
      varietyByGroup[group].add(ex.exerciseId);
      if (ts > lastTrainedByGroup[group]) lastTrainedByGroup[group] = ts;
    }
  }

  // PR 按部位計數（PR 可能來自舊無快照紀錄，此處補齊）
  const prCountByGroup: Record<MuscleGroup, number> = {
    chest: 0, back: 0, legs: 0, shoulders: 0, arms: 0, core: 0,
  };
  for (const pr of prs) {
    // P-01：PR 分類也跟隨當前 taxonomy
    const cur = resolveCurrentTaxonomy(pr.exerciseId, customExercises, {
      muscleGroup: pr.muscleGroup as MuscleGroup | undefined,
      equipmentType: pr.equipmentType,
      name: pr.exerciseName,
    });
    if (cur.muscleGroup) prCountByGroup[cur.muscleGroup]++;
  }

  for (const g of MUSCLE_GROUPS) {
    out[g].workoutCount = trainDatesByGroup[g].size;
    out[g].exerciseVariety = varietyByGroup[g].size;
    out[g].prCount = prCountByGroup[g];
    out[g].lastTrainedAt = lastTrainedByGroup[g] > 0
      ? new Date(lastTrainedByGroup[g]).toISOString()
      : undefined;
  }
  return out;
}

export function getGroupWeeklyVolume(
  sessions: WorkoutSession[],
  customExercises: CustomExercise[],
  group: MuscleGroup,
): { week: string; volume: number }[] {
  const weeklyMap = new Map<string, number>();
  for (const s of sessions) {
    const d = new Date(s.date);
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - diff);
    const key = `${monday.getMonth() + 1}/${monday.getDate()}`;
    let weekVol = 0;
    for (const ex of s.exercises) {
      // P-01：使用當前分類
      const cur = resolveCurrentTaxonomy(ex.exerciseId, customExercises, {
        muscleGroup: ex.muscleGroup as MuscleGroup | undefined,
      });
      if (cur.muscleGroup !== group) continue;
      weekVol += ex.sets
        .filter((x) => x.completed)
        .reduce((sum, x) => sum + x.weight * x.reps, 0);
    }
    if (weekVol > 0) {
      weeklyMap.set(key, (weeklyMap.get(key) ?? 0) + weekVol);
    }
  }
  return Array.from(weeklyMap.entries())
    .map(([week, volume]) => ({ week, volume: Math.round(volume / 1000) }))
    .slice(-8);
}

export function getExerciseProgress(
  sessions: WorkoutSession[],
  exerciseId: string,
): { date: string; maxWeight: number; estimated1RM: number }[] {
  const points: { date: string; maxWeight: number; estimated1RM: number }[] = [];
  for (const s of sessions) {
    const ex = s.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    const completed = ex.sets.filter((set) => set.completed);
    if (completed.length === 0) continue;
    const max = completed.reduce((m, set) =>
      estimate1RM(set.weight, set.reps) > estimate1RM(m.weight, m.reps) ? set : m
    );
    points.push({
      date: s.date,
      maxWeight: max.weight,
      estimated1RM: estimate1RM(max.weight, max.reps),
    });
  }
  return points;
}

export function getGroupExerciseProgress(
  sessions: WorkoutSession[],
  customExercises: CustomExercise[],
  group: MuscleGroup,
): { date: string; normalized1RM: number; exercises: number }[] {
  const points: { date: string; normalized1RM: number; exercises: number }[] = [];
  for (const s of sessions) {
    const exs = s.exercises.filter((ex) => {
      // P-01：使用當前分類
      const cur = resolveCurrentTaxonomy(ex.exerciseId, customExercises, {
        muscleGroup: ex.muscleGroup as MuscleGroup | undefined,
      });
      return cur.muscleGroup === group && ex.sets.some((set) => set.completed);
    });
    if (exs.length === 0) continue;
    let total1RM = 0;
    for (const ex of exs) {
      const completed = ex.sets.filter((set) => set.completed);
      const best = completed.reduce((m, set) =>
        estimate1RM(set.weight, set.reps) > estimate1RM(m.weight, m.reps) ? set : m
      );
      total1RM += estimate1RM(best.weight, best.reps);
    }
    points.push({
      date: s.date,
      normalized1RM: Math.round(total1RM / exs.length),
      exercises: exs.length,
    });
  }
  return points;
}

export function getUnderTrainedGroups(
  sessions: WorkoutSession[],
  prs: PersonalRecord[],
  customExercises: CustomExercise[],
): MuscleGroup[] {
  const stats = getGroupStats(sessions, prs, customExercises);
  // 至少有 1 次訓練的部位視為已接觸；否則偏低
  // 另：最近 14 天沒碰且 volume 偏低者也標示
  const now = Date.now();
  return MUSCLE_GROUPS.filter((g) => {
    const s = stats[g];
    if (s.workoutCount === 0) return true;
    if (s.lastTrainedAt && now - new Date(s.lastTrainedAt).getTime() > FOURTEEN_DAYS_MS) {
      return true;
    }
    return false;
  });
}
