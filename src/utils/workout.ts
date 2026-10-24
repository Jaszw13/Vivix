import type { WorkoutSession, ExerciseLog, SetLog, PersonalRecord } from '@/types';

// ============ 工具函式 ============

export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// 估算 1RM：使用 Epley 公式
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  if (reps > 15) return weight * 1.2; // 高次數估算保守
  return Math.round(weight * (1 + reps / 30));
}

/** R6：單組總負重（kg）= 主組 weight×reps + Σ drops；1RM 仍只用主組 */
export function setLoadKg(set: { weight: number; reps: number; drops?: { weight: number; reps: number }[] }): number {
  const main = set.weight * set.reps;
  const drops = set.drops ?? [];
  if (drops.length === 0) return main;
  return main + drops.reduce((s, d) => s + d.weight * d.reps, 0);
}

export function calculateTotalVolume(session: WorkoutSession): number {
  return session.exercises.reduce((total, ex) => {
    return (
      total +
      ex.sets.reduce((s, set) => s + (set.completed ? setLoadKg(set) : 0), 0)
    );
  }, 0);
}

export function getSessionPRs(session: WorkoutSession): PersonalRecord[] {
  return session.exercises.flatMap((ex) => {
    const completed = ex.sets.filter((s) => s.completed);
    if (completed.length === 0) return [];

    // P-4：分兩類 — weighted (weight>0) 走 Epley；bodyweight (weight=0) 走 repPR
    const weighted = completed.filter((s) => s.weight > 0);
    const bodyweight = completed.filter((s) => s.weight === 0);
    const prs: PersonalRecord[] = [];

    if (weighted.length > 0) {
      const max = weighted.reduce((m, s) =>
        estimate1RM(s.weight, s.reps) > estimate1RM(m.weight, m.reps) ? s : m
      );
      prs.push({
        exerciseId: ex.exerciseId,
        exerciseName: ex.name,
        weight: max.weight,
        reps: max.reps,
        date: session.date,
        estimated1RM: estimate1RM(max.weight, max.reps),
      });
    }

    if (bodyweight.length > 0) {
      const maxReps = Math.max(...bodyweight.map((s) => s.reps));
      prs.push({
        exerciseId: ex.exerciseId + '-bw',
        exerciseName: ex.name + ' (BW)',
        weight: 0,
        reps: maxReps,
        date: session.date,
        estimated1RM: 0,
        repPR: maxReps,
      });
    }

    return prs;
  });
}

/** 單一動作的最佳完成組：先比重量，重量相同再比次數（不含遞減組） */
export interface BestSet {
  weight: number;
  reps: number;
}

export function bestCompletedSet(sets: SetLog[]): BestSet | null {
  const completed = sets.filter((s) => s.completed);
  if (completed.length === 0) return null;
  let best = completed[0];
  for (const s of completed) {
    if (s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) {
      best = s;
    }
  }
  return { weight: best.weight, reps: best.reps };
}

/** 取「上一次同動作」的最佳完成組；沒有上次紀錄則回 null */
export function getPreviousBestForExercise(
  sessions: WorkoutSession[],
  current: WorkoutSession,
  exerciseId: string,
): BestSet | null {
  const currentKey = new Date(current.startedAt ?? current.date).getTime();
  const previous = sessions
    .filter((s) => s.id !== current.id)
    .filter((s) => new Date(s.startedAt ?? s.date).getTime() < currentKey)
    .sort(
      (a, b) =>
        new Date(b.startedAt ?? b.date).getTime() - new Date(a.startedAt ?? a.date).getTime(),
    );
  for (const session of previous) {
    const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    const best = bestCompletedSet(ex.sets);
    if (best) return best;
  }
  return null;
}

/**
 * 新紀錄判定（只跟上一次訓練比較）：
 * - 重量增加 → 'weight'
 * - 重量不變但次數增加 → 'reps'
 * - 其餘（含首次紀錄、退步）→ null
 */
export function getProgressKind(
  current: BestSet,
  previous: BestSet | null,
): 'weight' | 'reps' | null {
  if (!previous) return null;
  if (current.weight > previous.weight) return 'weight';
  if (current.weight === previous.weight && current.reps > previous.reps) return 'reps';
  return null;
}

/** 單組 vs 上次最佳組的即時差距（P1-1） */
export type SetDeltaKind = 'weight_up' | 'reps_up' | 'same';

export interface SetDelta {
  kind: SetDeltaKind;
  weightDiff: number;
  repsDiff: number;
  /** 直接可顯示的簡短文字，例如 "+2.5kg"、"+1 次" */
  label: string;
}

/** 退步時回 null（不顯示負面比較，避免挫折文案） */
export function getSetDelta(current: BestSet, previous: BestSet | null): SetDelta | null {
  if (!previous) return null;
  const weightDiff = Math.round((current.weight - previous.weight) * 10) / 10;
  const repsDiff = current.reps - previous.reps;
  if (weightDiff > 0) {
    return { kind: 'weight_up', weightDiff, repsDiff, label: `+${weightDiff}kg` };
  }
  if (weightDiff === 0 && repsDiff > 0) {
    return { kind: 'reps_up', weightDiff, repsDiff, label: `+${repsDiff} 次` };
  }
  if (weightDiff === 0 && repsDiff === 0) {
    return { kind: 'same', weightDiff, repsDiff, label: '與上次相同' };
  }
  return null;
}

export interface SessionNewRecord {
  exerciseId: string;
  exerciseName: string;
  current: BestSet;
  previous: BestSet | null;
  progress: 'weight' | 'reps';
}

export function getNewRecordsForSession(
  session: WorkoutSession,
  sessions: WorkoutSession[],
): SessionNewRecord[] {
  return session.exercises.flatMap((ex) => {
    const current = bestCompletedSet(ex.sets);
    if (!current) return [];
    const previous = getPreviousBestForExercise(sessions, session, ex.exerciseId);
    const progress = getProgressKind(current, previous);
    if (!progress) return [];
    return [{
      exerciseId: ex.exerciseId,
      exerciseName: ex.name,
      current,
      previous,
      progress,
    }];
  });
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${mm}/${dd}`;
}

export function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d
    .getDate()
    .toString()
    .padStart(2, '0')}`;
}

export function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

// 建立空白組
export function createEmptySet(setNumber: number, defaults?: Partial<SetLog>): SetLog {
  return {
    id: generateId('set'),
    setNumber,
    weight: defaults?.weight ?? 0,
    reps: defaults?.reps ?? 0,
    rpe: defaults?.rpe,
    completed: false,
  };
}

/**
 * 建立動作紀錄。預設只給 1 組（其餘由使用者按「新增組」逐步長出來），
 * 新增組時會繼承上一組的重量/次數。
 */
export function createExerciseLog(
  exerciseId: string,
  name: string,
  initialWeight?: number,
): ExerciseLog {
  return {
    id: generateId('ex'),
    exerciseId,
    name,
    sets: [createEmptySet(1, { weight: initialWeight ?? 0 })],
  };
}
