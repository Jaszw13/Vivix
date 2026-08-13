/**
 * Vivix 統計權威 selectors（C3 起頭；後續 C4 會擴充 memo 化）
 *
 * L2 規範：所有衍生統計一律出自本檔；store / 元件不得 inline 重算。
 * 當前只集中 streak（D1 語義）；後續刀次會逐步移入 PR / groupStats / volume。
 */
import type { WorkoutSession } from '@/types';
import { DAY_MS } from '@/utils/time';

/**
 * 計算連續訓練天數（D1 語義）：
 *   - 今天有練 → 從今天起算
 *   - 今天未練但昨天有練 → 從昨天起算（仍視為延續）
 *   - 否則 0
 *
 * 同一日多次 session 視為一天；以本地時區 toDateString 去重。
 */
export function getStreakDays(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0;

  // 收集所有訓練日的本地日期鍵，去重
  const seen = new Set(
    sessions.map((s) => new Date(s.date).toDateString()),
  );

  // 決定起算日：今天有練 → 今天；否則若昨天有練 → 昨天；否則回 0
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

  // 從 cursor 往前一天天比對
  let streak = 0;
  while (seen.has(cursor.toDateString())) {
    streak++;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}
