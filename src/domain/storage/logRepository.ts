import { isFactKey } from './factKeys';

/**
 * 訓練事實的讀寫埠。
 * 沒有 React、沒有 Zustand、沒有瀏覽器全域物件。
 * 網頁用 services/browserLogRepository；測試與日後的 iOS / Android 換實作即可。
 */
export interface LogRepository {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
}

export function createMemoryLogRepository(
  initial: Record<string, string> = {},
): LogRepository {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    read: (key) => data.get(key) ?? null,
    write: (key, value) => {
      data.set(key, value);
    },
    remove: (key) => {
      data.delete(key);
    },
    keys: () => [...data.keys()],
  };
}

export function clearFactKeys(repo: LogRepository): string[] {
  const removed: string[] = [];
  for (const key of repo.keys()) {
    if (!isFactKey(key)) continue;
    repo.remove(key);
    removed.push(key);
  }
  return removed;
}

export const SNAPSHOT_VERSION = 1 as const;

export interface VivixSnapshot {
  vivixSnapshotVersion: typeof SNAPSHOT_VERSION;
  exportedAt: string;
  /**
   * 與舊版匯出相同：鍵是 persist key，值是 JSON.parse 後的內容（或原本的字串）。
   */
  keys: Record<string, unknown>;
}

export function exportSnapshot(repo: LogRepository, now = new Date()): VivixSnapshot {
  const keys: Record<string, unknown> = {};
  for (const key of repo.keys()) {
    if (!isFactKey(key)) continue;
    const raw = repo.read(key);
    if (raw == null) continue;
    try {
      keys[key] = JSON.parse(raw) as unknown;
    } catch {
      keys[key] = raw;
    }
  }
  return {
    vivixSnapshotVersion: SNAPSHOT_VERSION,
    exportedAt: now.toISOString(),
    keys,
  };
}

export type ImportResult =
  | { ok: true; written: string[] }
  | { ok: false; error: string };

/**
 * 接受兩種檔：
 * - 新版 { vivixSnapshotVersion, keys }
 * - 舊版扁平物件（頂層就是 ironpulse-* / vivix-*）
 */
export function importSnapshot(repo: LogRepository, payload: unknown): ImportResult {
  const keys = extractKeys(payload);
  if (!keys) return { ok: false, error: '無法讀取備份' };
  const written: string[] = [];
  for (const [key, value] of Object.entries(keys)) {
    if (!isFactKey(key)) continue;
    const raw = typeof value === 'string' ? value : JSON.stringify(value);
    repo.write(key, raw);
    written.push(key);
  }
  if (written.length === 0) return { ok: false, error: '備份裡沒有 Vivix 資料' };
  return { ok: true, written };
}

function extractKeys(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const obj = payload as Record<string, unknown>;
  if (
    obj.vivixSnapshotVersion === SNAPSHOT_VERSION &&
    obj.keys &&
    typeof obj.keys === 'object' &&
    !Array.isArray(obj.keys)
  ) {
    return obj.keys as Record<string, unknown>;
  }
  const legacy: Record<string, unknown> = {};
  let any = false;
  for (const [key, value] of Object.entries(obj)) {
    if (!isFactKey(key)) continue;
    legacy[key] = value;
    any = true;
  }
  return any ? legacy : null;
}
