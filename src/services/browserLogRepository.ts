import type { LogRepository } from '@/domain/storage/logRepository';

type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
};

/** 網頁今天實際使用的 LogRepository。領域模組不直接碰這個檔。 */
export function createBrowserLogRepository(
  storage: KeyValueStore = localStorage,
): LogRepository {
  return {
    read: (key) => storage.getItem(key),
    write: (key, value) => {
      storage.setItem(key, value);
    },
    remove: (key) => {
      storage.removeItem(key);
    },
    keys: () => {
      const out: string[] = [];
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (key) out.push(key);
      }
      return out;
    },
  };
}
