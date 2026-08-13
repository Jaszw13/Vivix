/**
 * 時間常數與工具（C1 權威模組）
 * 全專案 day/week/ms 轉換的唯一來源。
 */

export const DAY_MS = 86400000;
export const WEEK_MS = 7 * DAY_MS;
export const FOURTEEN_DAYS_MS = 14 * DAY_MS;

/** 將日期轉為 'YYYY-MM-DD' 字串（本地時區），用於跨日唯一 key */
export function dayKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** 兩個日期相差整天數（a - b），以本地午夜為邊界 */
export function diffDays(a: Date | string, b: Date | string): number {
  const da = typeof a === 'string' ? new Date(a) : a;
  const db = typeof b === 'string' ? new Date(b) : b;
  const aMid = new Date(da.getFullYear(), da.getMonth(), da.getDate()).getTime();
  const bMid = new Date(db.getFullYear(), db.getMonth(), db.getDate()).getTime();
  return Math.round((aMid - bMid) / DAY_MS);
}
