import type { WorkoutSession } from '@/types';

const DAY_MS = 86_400_000;

/** 以本地時區取「日」的 key（YYYY-MM-DD），避免跨時區誤判 */
export function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 本地時區的週一 00:00 */
export function getWeekStart(now = new Date()): Date {
  const d = startOfDay(now);
  const mondayOffset = (d.getDay() + 6) % 7; // 週日 0 → 6
  d.setDate(d.getDate() - mondayOffset);
  return d;
}

interface DatedSession {
  date: string;
}

/** 合併力量與有氧，回傳所有「訓練日」key（去重） */
export function getTrainingDayKeys(
  sessions: WorkoutSession[],
  cardioSessions: DatedSession[],
): string[] {
  const keys = new Set<string>();
  for (const s of sessions) keys.add(localDayKey(new Date(s.date)));
  for (const s of cardioSessions) keys.add(localDayKey(new Date(s.date)));
  return [...keys].sort();
}

/** 距上次訓練幾個日曆天；從未訓練 → null */
export function getDaysSinceLastTraining(
  sessions: WorkoutSession[],
  cardioSessions: DatedSession[],
  now = new Date(),
): number | null {
  const keys = getTrainingDayKeys(sessions, cardioSessions);
  if (keys.length === 0) return null;
  const last = keys[keys.length - 1];
  const lastDate = new Date(`${last}T00:00:00`);
  return Math.round((startOfDay(now).getTime() - lastDate.getTime()) / DAY_MS);
}

/** 距某個 ISO 時間戳幾個日曆天 */
export function getDaysSinceTimestamp(iso: string, now = new Date()): number {
  return Math.round(
    (startOfDay(now).getTime() - startOfDay(new Date(iso)).getTime()) / DAY_MS,
  );
}

export const COMEBACK_THRESHOLD_DAYS = 14;

/** 14 天（含）以上未訓練 → 進入回歸窗口 */
export function isComebackWindow(daysSinceLast: number | null): boolean {
  return daysSinceLast !== null && daysSinceLast >= COMEBACK_THRESHOLD_DAYS;
}

/**
 * 是否顯示「歡迎回來」卡：
 * - 14 天以上未訓練
 * - 且距上次顯示已超過 14 天（避免短期重複打擾）
 */
export function shouldShowComeback(
  comebackWelcomedAt: string | null,
  sessions: WorkoutSession[],
  cardioSessions: DatedSession[],
  now = new Date(),
): boolean {
  const days = getDaysSinceLastTraining(sessions, cardioSessions, now);
  if (!isComebackWindow(days)) return false;
  if (!comebackWelcomedAt) return true;
  return getDaysSinceTimestamp(comebackWelcomedAt, now) >= COMEBACK_THRESHOLD_DAYS;
}

/** 本週（週一–週日）的訓練天數（力量 + 有氧，去重） */
export function getWeeklyTrainingDays(
  sessions: WorkoutSession[],
  cardioSessions: DatedSession[],
  now = new Date(),
): number {
  const start = getWeekStart(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const keys = new Set<string>();
  const add = (raw: string) => {
    const d = new Date(raw);
    if (d >= start && d < end) keys.add(localDayKey(d));
  };
  for (const s of sessions) add(s.date);
  for (const s of cardioSessions) add(s.date);
  return keys.size;
}

export interface WeeklyGoalState {
  days: number;
  goal: number;
  remaining: number;
  hit: boolean;
}

export function getWeeklyGoalState(
  goal: number,
  sessions: WorkoutSession[],
  cardioSessions: DatedSession[],
  now = new Date(),
): WeeklyGoalState {
  const days = getWeeklyTrainingDays(sessions, cardioSessions, now);
  return {
    days,
    goal,
    remaining: Math.max(0, goal - days),
    hit: days >= goal,
  };
}
