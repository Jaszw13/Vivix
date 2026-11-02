import type { MuscleGroup, WorkoutSession } from '@/types';
import { setLoadKg } from '@/utils/workout';
import { WEEK_MS } from '@/utils/time';
import type {
  AvoidEntry,
  CoachContext,
  EightWeekSummary,
  LastCompletedSet,
  TrainingGoal,
} from './types';
import { COACH_CONTEXT_VERSION } from './types';

const DEFAULT_WEEKLY_DAYS = 3;
const DEFAULT_SESSION_MINUTES = 45;
const REGION_SET = new Set<MuscleGroup>(['chest', 'back', 'legs', 'shoulders', 'arms', 'core']);

export interface BuildCoachContextInput {
  goal: TrainingGoal | null;
  weeklyDays: number;
  sessionMinutes: number;
  equipmentIds: string[];
  avoid: AvoidEntry[];
  sessions: WorkoutSession[];
  now?: Date;
}

export function buildCoachContext(input: BuildCoachContextInput): CoachContext {
  const now = input.now ?? new Date();
  const weeklyDays = clampDays(input.weeklyDays);
  const sessionMinutes = clampMinutes(input.sessionMinutes);
  return {
    version: COACH_CONTEXT_VERSION,
    goal: input.goal,
    weeklyDays,
    sessionMinutes,
    equipmentIds: input.equipmentIds.filter((id) => typeof id === 'string'),
    avoid: sanitizeAvoid(input.avoid),
    logSummary: summarizeEightWeeks(input.sessions, now),
    lastCompletedSets: lastCompletedSets(input.sessions),
  };
}

export function defaultSessionMinutes(): number {
  return DEFAULT_SESSION_MINUTES;
}

function clampDays(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_WEEKLY_DAYS;
  return Math.min(5, Math.max(1, Math.round(n)));
}

function clampMinutes(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_SESSION_MINUTES;
  return Math.min(120, Math.max(20, Math.round(n)));
}

export function sanitizeAvoid(entries: AvoidEntry[] | undefined | null): AvoidEntry[] {
  if (!Array.isArray(entries)) return [];
  const out: AvoidEntry[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    if (entry.kind === 'region' && REGION_SET.has(entry.region)) {
      out.push({ kind: 'region', region: entry.region });
    } else if (
      entry.kind === 'exercise' &&
      typeof entry.exerciseId === 'string' &&
      entry.exerciseId.length > 0
    ) {
      out.push({ kind: 'exercise', exerciseId: entry.exerciseId });
    }
  }
  return out;
}

function summarizeEightWeeks(sessions: WorkoutSession[], now: Date): EightWeekSummary {
  const to = now.getTime();
  const from = to - 8 * WEEK_MS;
  let sessionCount = 0;
  let totalVolumeKg = 0;
  let importedSessionCount = 0;
  let completedSets = 0;
  const days = new Set<string>();
  for (const session of sessions) {
    const at = new Date(session.date).getTime();
    if (!Number.isFinite(at) || at < from || at > to) continue;
    sessionCount += 1;
    if (session.imported === true) importedSessionCount += 1;
    days.add(session.date.slice(0, 10));
    for (const exercise of session.exercises ?? []) {
      for (const set of exercise.sets ?? []) {
        if (!set.completed) continue;
        completedSets += 1;
        totalVolumeKg += setLoadKg(set);
      }
    }
  }
  return {
    windowWeeks: 8,
    from: new Date(from).toISOString(),
    to: now.toISOString(),
    sessionCount,
    trainingDays: days.size,
    totalVolumeKg: Math.round(totalVolumeKg),
    importedSessionCount,
    completedSets,
  };
}

function lastCompletedSets(sessions: WorkoutSession[]): LastCompletedSet[] {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const map = new Map<string, LastCompletedSet>();
  for (const session of sorted) {
    for (const exercise of session.exercises ?? []) {
      const sets = (exercise.sets ?? [])
        .filter((set) => set.completed)
        .map((set) => ({ weight: set.weight, reps: set.reps }));
      if (sets.length === 0) continue;
      map.set(exercise.exerciseId, {
        exerciseId: exercise.exerciseId,
        date: session.date,
        sessionId: session.id,
        imported: session.imported === true,
        sets,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.exerciseId.localeCompare(b.exerciseId));
}
