import type { WorkoutSession } from '@/types';
import { setLoadKg } from '@/utils/workout';
import {
  getWeeklyGoalState,
  type WeeklyGoalState,
} from './selectors';

export interface HighlightBestSet {
  exerciseName: string;
  weight: number;
  reps: number;
}

export interface SessionHighlight {
  dayName: string;
  dateLabel: string;
  totalSets: number;
  totalVolume: number;
  /** 與上一次訓練的總容量差異（百分比）；無上次資料 → null */
  volumeDeltaPct: number | null;
  bestSet: HighlightBestSet | null;
  newRecordCount: number;
  weekly: WeeklyGoalState;
}

interface CardioDated {
  date: string;
}

/**
 * P1-3：把一次訓練濃縮成高光卡內容（純衍生、不 persist）。
 * 只取「今天最好的那一組」與總量差異，不放體重、姓名。
 */
export function buildSessionHighlight(
  session: WorkoutSession,
  sessions: WorkoutSession[],
  cardioSessions: CardioDated[],
  weeklyGoal: number,
  newRecordCount: number,
): SessionHighlight {
  const completedSets = session.exercises.flatMap((ex) =>
    ex.sets
      .filter((s) => s.completed)
      .map((s) => ({
        exerciseName: ex.name,
        weight: s.weight,
        reps: s.reps,
        load: setLoadKg(s),
      })),
  );

  const best = completedSets.reduce<typeof completedSets[number] | null>(
    (acc, cur) => (acc === null || cur.load > acc.load ? cur : acc),
    null,
  );

  const currentStart = new Date(session.startedAt ?? session.date).getTime();
  const previous = sessions
    .filter((s) => s.id !== session.id)
    .filter((s) => new Date(s.startedAt ?? s.date).getTime() < currentStart)
    .sort(
      (a, b) =>
        new Date(b.startedAt ?? b.date).getTime() - new Date(a.startedAt ?? a.date).getTime(),
    )[0];

  const volumeDeltaPct =
    previous && previous.totalVolume > 0
      ? Math.round(((session.totalVolume - previous.totalVolume) / previous.totalVolume) * 1000) / 10
      : null;

  return {
    dayName: session.dayName ?? '訓練',
    dateLabel: new Date(session.date).toLocaleDateString('zh-TW', {
      month: 'numeric',
      day: 'numeric',
    }),
    totalSets: completedSets.length,
    totalVolume: session.totalVolume,
    volumeDeltaPct,
    bestSet: best
      ? { exerciseName: best.exerciseName, weight: best.weight, reps: best.reps }
      : null,
    newRecordCount,
    weekly: getWeeklyGoalState(weeklyGoal, sessions, cardioSessions),
  };
}
