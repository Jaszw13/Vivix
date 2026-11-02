import type { MuscleGroup } from '@/types';

/** 與 onboarding / profileStore 相同的三個目標。 */
export type TrainingGoal = 'muscle' | 'fatloss' | 'health';

export type ExperienceLane = 'beginner' | 'experienced';

/** Lane B 的頻率分桶。1 / 2 / 3-4 / 5+。 */
export type FreqBucket = '1' | '2' | '3-4' | '5+';

/**
 * 使用者自己勾的「暫時少練」。
 * 不是病歷，也不表示診斷。
 */
export type AvoidEntry =
  | { kind: 'region'; region: MuscleGroup }
  | { kind: 'exercise'; exerciseId: string };

export const COACH_CONTEXT_VERSION = 1 as const;

export interface LastCompletedSet {
  exerciseId: string;
  date: string;
  sessionId: string;
  imported: boolean;
  sets: { weight: number; reps: number }[];
}

export interface EightWeekSummary {
  windowWeeks: 8;
  from: string;
  to: string;
  sessionCount: number;
  trainingDays: number;
  totalVolumeKg: number;
  importedSessionCount: number;
  completedSets: number;
}

export interface CoachContext {
  version: typeof COACH_CONTEXT_VERSION;
  goal: TrainingGoal | null;
  weeklyDays: number;
  sessionMinutes: number;
  equipmentIds: string[];
  avoid: AvoidEntry[];
  logSummary: EightWeekSummary;
  lastCompletedSets: LastCompletedSet[];
}
