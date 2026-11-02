/**
 * 所有使用者事實的 localStorage 鍵。
 * 字串本身不可改名，否則既有資料會被看成新帳號。
 *
 * 重置、白屏自救、匯出／匯入都走這裡。
 * 前綴用來接住以後新增、但仍使用 ironpulse- / vivix- 的鍵。
 */
export const FACT_KEYS = [
  'ironpulse-workouts',
  'ironpulse-profile',
  'ironpulse-theme',
  'ironpulse-achievements',
  'ironpulse-trial',
  'vivix-feature-flags-v1',
  'vivix-partner-store-v1',
  'vivix-quest-store-v1',
  'vivix-telemetry-store-v1',
  'vivix-social-store-v1',
  'vivix-body-metrics-v1',
  'vivix-cardio-v1',
  'vivix-plans-store-v1',
  'vivix-rest-days-v1',
  'vivix-fx-enabled',
  'vivix-motion-enabled',
  'vivix-equipment-memory',
] as const;

export type FactKey = (typeof FACT_KEYS)[number];

export const FACT_KEY_PREFIXES = ['ironpulse-', 'vivix-'] as const;

export function isFactKey(key: string): boolean {
  return FACT_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}
