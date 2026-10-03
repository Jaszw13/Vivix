/**
 * R5：休息日 Store（restDayStore v1）
 *
 * 語義（Q1/Q3）：休息日**只**計入 streak；
 *   不計訓練次數／天數／體積／PR／成就／Partner XP 與形態。
 *
 * 邊界：
 *   - 只依賴 types + zustand persist，不 import workoutStore/settleAll（防循環）
 *   - persist key：vivix-rest-days-v1
 *   - addRestDay：拒未來日、一日一筆（同 dayKey 覆蓋）
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RestDayEntry } from '@/types';
import { generateId } from '@/utils/workout';
import { dayKey } from '@/utils/time';

/** 休息日活動標籤（共用） */
export const ACTIVITY_LABEL: Record<NonNullable<RestDayEntry['activity']>, string> = {
  walk: '散步',
  stretch: '伸展',
  mobility: '活動度',
  yoga: '瑜珈',
  other: '其他',
};

interface RestDayState {
  entries: RestDayEntry[];
  addRestDay: (
    date: string,
    opts?: { activity?: RestDayEntry['activity']; note?: string },
  ) => RestDayEntry | null;
  deleteRestDay: (id: string) => void;
  /** 取某日的休息日 entry（無則 null） */
  getRestDay: (date: string) => RestDayEntry | null;
}

export const useRestDayStore = create<RestDayState>()(
  persist(
    (set, get) => ({
      entries: [],

      addRestDay: (date, opts) => {
        // 拒未來日
        const todayKey = dayKey(new Date());
        if (date > todayKey) return null;

        const existing = get().entries.find((e) => e.date === date);
        const entry: RestDayEntry = {
          id: existing?.id ?? generateId('rest'),
          date,
          activity: opts?.activity,
          note: opts?.note,
          createdAt: existing?.createdAt ?? new Date().toISOString(),
        };
        set({
          entries: [
            ...get().entries.filter((e) => e.date !== date),
            entry,
          ].sort((a, b) => a.date.localeCompare(b.date)),
        });
        return entry;
      },

      deleteRestDay: (id) => {
        set({ entries: get().entries.filter((e) => e.id !== id) });
      },

      getRestDay: (date) => {
        return get().entries.find((e) => e.date === date) ?? null;
      },
    }),
    {
      name: 'vivix-rest-days-v1',
      version: 1,
      partialize: (state) => ({
        entries: state.entries,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('[restDayStore] Zustand hydration failed, falling back to defaults', error);
            try {
              localStorage.removeItem('vivix-rest-days-v1');
            } catch {}
          }
        };
      },
      migrate: (persistedState) => {
        const s = (persistedState ?? {}) as Partial<RestDayState>;
        const entries = Array.isArray(s.entries) ? s.entries : [];
        // 欄位校驗：確保每筆有 id/date/createdAt
        const safe = entries
          .filter((e) => e && typeof e.date === 'string')
          .map((e) => ({
            id: e.id ?? generateId('rest'),
            date: e.date,
            activity: e.activity,
            note: e.note,
            createdAt: e.createdAt ?? new Date().toISOString(),
          }));
        return { entries: safe };
      },
    }
  )
);
