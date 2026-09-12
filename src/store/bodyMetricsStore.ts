/**
 * T8：身體組成追蹤 store（原始事實 persist，L1）
 *
 * 全欄位皆事實：metrics 全部 persist，migrate v1（unknown + guard，L4）。
 * persist key: 'vivix-body-metrics-v1'。
 * actions: addMetric / updateMetric / deleteMetric。
 * selectors: getLatest / getSorted。
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BodyMetric } from '@/types';
import { generateId } from '@/utils/workout';

interface BodyMetricsState {
  metrics: BodyMetric[];
  /** 新增一筆身體組成記錄（至少需填 1 個數值欄位） */
  addMetric: (args: {
    date?: string;
    weightKg?: number | null;
    muscleMassKg?: number | null;
    bodyFatPercent?: number | null;
    fatMassKg?: number | null;
  }) => BodyMetric;
  /** 更新既有記錄 */
  updateMetric: (id: string, patch: Partial<Omit<BodyMetric, 'id' | 'createdAt'>>) => void;
  /** 刪除記錄 */
  deleteMetric: (id: string) => void;
  /** 取最新一筆（依日期降序） */
  getLatest: () => BodyMetric | null;
  /** 取依日期升序排列的全部記錄 */
  getSorted: () => BodyMetric[];
}

export const useBodyMetricsStore = create<BodyMetricsState>()(
  persist(
    (set, get) => ({
      metrics: [],

      addMetric: ({ date, weightKg, muscleMassKg, bodyFatPercent, fatMassKg }) => {
        const now = new Date().toISOString();
        const metric: BodyMetric = {
          id: generateId('body'),
          date: date ?? now,
          weightKg: typeof weightKg === 'number' ? weightKg : null,
          muscleMassKg: typeof muscleMassKg === 'number' ? muscleMassKg : null,
          bodyFatPercent: typeof bodyFatPercent === 'number' ? bodyFatPercent : null,
          fatMassKg: typeof fatMassKg === 'number' ? fatMassKg : null,
          createdAt: now,
        };
        const next = [...get().metrics, metric].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
        set({ metrics: next });
        return metric;
      },

      updateMetric: (id, patch) => {
        set({
          metrics: get().metrics
            .map((m) => (m.id === id ? { ...m, ...patch } : m))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        });
      },

      deleteMetric: (id) => {
        set({ metrics: get().metrics.filter((m) => m.id !== id) });
      },

      getLatest: () => {
        const sorted = get().metrics;
        if (sorted.length === 0) return null;
        return [...sorted].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        )[0];
      },

      getSorted: () =>
        [...get().metrics].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        ),
    }),
    {
      name: 'vivix-body-metrics-v1',
      version: 1,
      // ⚠️ 容錯兜底：LocalStorage 損壞時優雅重置為預設值
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('[bodyMetricsStore] Zustand hydration failed, falling back to defaults', error);
            try {
              localStorage.removeItem('vivix-body-metrics-v1');
            } catch {}
          }
        };
      },
      // L1：metrics 全為事實，完整 persist
      partialize: (state) => ({ metrics: state.metrics }),
      migrate: (persistedState: unknown) => {
        // L4：unknown + guard
        const raw = (persistedState ?? {}) as Record<string, unknown>;
        const inArr: unknown[] = Array.isArray(raw.metrics) ? raw.metrics : [];
        const metrics: BodyMetric[] = [];
        for (const item of inArr) {
          if (typeof item !== 'object' || item === null) continue;
          const o = item as Record<string, unknown>;
          if (typeof o.id !== 'string' || typeof o.date !== 'string') continue;
          metrics.push({
            id: o.id,
            date: o.date,
            weightKg: typeof o.weightKg === 'number' ? o.weightKg : null,
            muscleMassKg: typeof o.muscleMassKg === 'number' ? o.muscleMassKg : null,
            bodyFatPercent: typeof o.bodyFatPercent === 'number' ? o.bodyFatPercent : null,
            fatMassKg: typeof o.fatMassKg === 'number' ? o.fatMassKg : null,
            createdAt: typeof o.createdAt === 'string' ? o.createdAt : new Date().toISOString(),
          });
        }
        return { metrics };
      },
    },
  ),
);
