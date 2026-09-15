/**
 * T5 週報派生邏輯（純函數；不讀 store、不 persist）
 *
 * L2：所有統計走 stats 層；元件禁止 inline 計算。
 * 週報全派生不 persist — weeklyReportSeenWeek 只存「是否顯示過」。
 */
import type { WorkoutSession, PersonalRecord, CardioSession } from '@/types';
import { calculateTotalVolume, getSessionPRs } from '@/utils/workout';
import { getStreakDays } from '@/features/stats/selectors';
import { getWeekStart, addDays, sessionDayKey } from '@/utils/time';

export interface AchievementUnlockRecord {
  id: string;
  unlockedAt: string;
}

export interface WeeklyReport {
  weekStart: Date;
  weekEnd: Date;
  sessionCount: number;
  trainingDays: number;
  totalVolume: number;
  volumeDelta: number; // % vs 上週；上週 0 則回 NaN（UI 顯示「—」）
  prs: PersonalRecord[];
  achievementsUnlocked: AchievementUnlockRecord[];
  streak: number;
  topLift: PersonalRecord | null;
  partnerMessage: string;
}

/** 取某週（weekOffset）區間內的 sessions */
function filterWeekSessions(
  sessions: WorkoutSession[],
  weekStart: Date,
  weekEnd: Date,
): WorkoutSession[] {
  return sessions.filter((s) => {
    const d = new Date(s.date);
    return d >= weekStart && d < weekEnd;
  });
}

/** 取某週區間內解鎖的成就 */
function filterWeekAchievements(
  unlocks: AchievementUnlockRecord[],
  weekStart: Date,
  weekEnd: Date,
): AchievementUnlockRecord[] {
  return unlocks.filter((a) => {
    const d = new Date(a.unlockedAt);
    return d >= weekStart && d < weekEnd;
  });
}

/** Partner 文案規則（休息週不羞辱） */
export function generatePartnerMessage(
  currentCount: number,
  prevCount: number,
): string {
  if (currentCount === 0) return '這週休息也很好，下週繼續。';
  if (prevCount === 0) return '新開始，每一步都算數。';
  const delta = currentCount - prevCount;
  if (delta > 0) return `比上週多練 ${delta} 次，進步看得見。`;
  if (delta < 0) return `這週練得少一點，但質量更重要。`;
  return '穩定就是力量。';
}

/**
 * 計算週報
 * @param sessions 力量訓練 sessions（含 imported）
 * @param cardioSessions 有氧 sessions（streak union 用）
 * @param achievementUnlocks 成就解鎖紀錄（id + unlockedAt）
 * @param weekOffset 0=本週，-1=上週，-2=上上週…
 */
export function computeWeeklyReport(
  sessions: WorkoutSession[],
  cardioSessions: CardioSession[],
  achievementUnlocks: AchievementUnlockRecord[],
  weekOffset: number,
): WeeklyReport {
  const weekStart = getWeekStart(new Date(), weekOffset);
  const weekEnd = addDays(weekStart, 7);

  const weekSessions = filterWeekSessions(sessions, weekStart, weekEnd);
  const prevWeekStart = addDays(weekStart, -7);
  const prevWeekSessions = filterWeekSessions(sessions, prevWeekStart, weekStart);

  const totalVolume = weekSessions.reduce(
    (sum, s) => sum + calculateTotalVolume(s),
    0,
  );
  const prevVolume = prevWeekSessions.reduce(
    (sum, s) => sum + calculateTotalVolume(s),
    0,
  );
  const volumeDelta = prevVolume > 0
    ? ((totalVolume - prevVolume) / prevVolume) * 100
    : NaN;

  const prs = weekSessions.flatMap(getSessionPRs);
  const achievementsUnlocked = filterWeekAchievements(
    achievementUnlocks,
    weekStart,
    weekEnd,
  );

  // streak：以整個 sessions + cardioSessions 派生（不是只算本週）
  const streak = getStreakDays(sessions, cardioSessions);

  const topLift = prs.reduce<PersonalRecord | null>(
    (max, pr) =>
      pr.estimated1RM > (max?.estimated1RM ?? 0) ? pr : max,
    null,
  );

  const partnerMessage = generatePartnerMessage(
    weekSessions.length,
    prevWeekSessions.length,
  );

  return {
    weekStart,
    weekEnd,
    sessionCount: weekSessions.length,
    trainingDays: new Set(weekSessions.map((s) => sessionDayKey(s.date))).size,
    totalVolume,
    volumeDelta,
    prs,
    achievementsUnlocked,
    streak,
    topLift,
    partnerMessage,
  };
}
