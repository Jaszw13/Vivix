import type { WorkoutSession, ExerciseLog, SetLog, PersonalRecord } from '@/types';

// ============ 工具函式 ============

export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// 估算 1RM：使用 Epley 公式
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  if (reps > 15) return weight * 1.2;
  return Math.round(weight * (1 + reps / 30));
}

export function calculateTotalVolume(session: WorkoutSession): number {
  return session.exercises.reduce((total, ex) => {
    return (
      total +
      ex.sets.reduce((s, set) => s + (set.completed ? set.weight * set.reps : 0), 0)
    );
  }, 0);
}

export function getSessionPRs(session: WorkoutSession): PersonalRecord[] {
  return session.exercises.flatMap((ex) => {
    const completed = ex.sets.filter((s) => s.completed);
    if (completed.length === 0) return [];
    const max = completed.reduce((m, s) =>
      estimate1RM(s.weight, s.reps) > estimate1RM(m.weight, m.reps) ? s : m
    );
    return [
      {
        exerciseId: ex.exerciseId,
        exerciseName: ex.name,
        weight: max.weight,
        reps: max.reps,
        date: session.date,
        estimated1RM: estimate1RM(max.weight, max.reps),
      },
    ];
  });
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
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

export function createExerciseLog(
  exerciseId: string,
  name: string,
  targetSets: number,
  targetWeight?: number
): ExerciseLog {
  const sets = Array.from({ length: targetSets }, (_, i) =>
    createEmptySet(i + 1, { weight: targetWeight ?? 0 })
  );
  return {
    id: generateId('ex'),
    exerciseId,
    name,
    sets,
  };
}
