/**
 * Vivix 統計權威 selectors（C3 起頭；E-04 擴充 cardio streak union）
 *
 * L2 規範：所有衍生統計一律出自本檔；store / 元件不得 inline 重算。
 * streak 權威在 selectors（D1 語義）；
 * PR／groupStats／volume 現仍為 workoutStore 單一函數（computePRsFromSessions／getGroupStats），無重複實作；漸進移入為 backlog B-01。
 */
import type { CardioSession, WorkoutSession } from '@/types';
import { DAY_MS } from '@/utils/time';

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
  for (const s of strengthSessions) seen.add(new Date(s.date).toDateString());
  for (const c of cardioSessions) seen.add(new Date(c.date).toDateString());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let cursor: Date;
  if (seen.has(today.toDateString())) {
    cursor = today;
  } else {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (seen.has(yesterday.toDateString())) {
      cursor = yesterday;
    } else {
      return 0;
    }
  }

  let streak = 0;
  while (seen.has(cursor.toDateString())) {
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
