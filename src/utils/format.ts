/**
 * 日期/數值格式化工具（C1 權威模組）
 * 收編散落各處的 inline 日期格式化，確保風格一致。
 */

/** 短日期 mm/dd（沿用 utils/workout.ts:formatDate 語義） */
export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${mm}/${dd}`;
}

/** 完整日期 YYYY/MM/DD */
export function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d
    .getDate()
    .toString()
    .padStart(2, '0')}`;
}

/** 解鎖/成就日期顯示：YYYY/MM/DD（收編 5 處 toLocaleDateString('zh-TW')） */
export function formatUnlockDate(dateStr: string): string {
  return formatDateFull(dateStr);
}

/** 星期幾短名（收編 Dashboard.tsx:318 的 weekday: 'short'） */
export function formatWeekdayShort(date: Date): string {
  const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
  return WEEKDAYS[date.getDay()];
}
