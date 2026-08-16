/**
 * E-03：有氧訓練 store（原始事實 persist，L1）
 *
 * 全欄位皆事實：cardioSessions 全部 persist，migrate v1（unknown + guard，L4）。
 * persist key: 'vivix-cardio-v1'。
 * actions: addCardio / deleteCardio。
 * L3：每次 add/delete 後走 settleAll 統一結算（streak／Partner XP／成就）。
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CardioMachine, CardioSession } from '@/types';
import { generateId } from '@/utils/workout';
import { settleAll } from '@/features/stats/settleAll';
import { useTelemetryStore } from '@/features/partner/stores/telemetryStore';

interface CardioState {
  sessions: CardioSession[];
  addCardio: (args: {
    date?: string;
    machine: CardioMachine;
    durationMin: number;
    kcal?: number | null;
    avgHr?: number | null;
    distanceKm?: number | null;
  }) => CardioSession;
  deleteCardio: (id: string) => void;
  /** 讀取時輔助：聚合總時長／次數（純函數，不保證 memo） */
  getTotalMinutes: () => number;
  getTotalSessions: () => number;
}

export const useCardioStore = create<CardioState>()(
  persist(
    (set, get) => ({
      sessions: [],

      addCardio: ({ date, machine, durationMin, kcal, avgHr, distanceKm }) => {
        if (!(durationMin > 0)) {
          throw new Error('cardio durationMin must be > 0');
        }
        const now = new Date().toISOString();
        const session: CardioSession = {
          id: generateId('cardio'),
          date: date ?? now,
          machine,
          durationMin: Math.round(durationMin * 10) / 10,
          kcal: typeof kcal === 'number' ? kcal : null,
          avgHr: typeof avgHr === 'number' ? avgHr : null,
          distanceKm: typeof distanceKm === 'number' ? distanceKm : null,
          createdAt: now,
        };
        const next = [...get().sessions, session].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
        set({ sessions: next });

        // telemetry + E-D5：未提供 kcal 且之後 fallback 會用到時另外記 cardio_fallback_used（在 UI 端實際估算時 log）
        const telemetry = useTelemetryStore.getState();
        telemetry.log('cardio_session_added', { machine, durationMin, providedKcal: typeof kcal === 'number' });

        // L3：settleAll 統一結算（streak / cardio XP / cardio 成就）
        settleAll();

        return session;
      },

      deleteCardio: (id) => {
        set({ sessions: get().sessions.filter((s) => s.id !== id) });

        const telemetry = useTelemetryStore.getState();
        telemetry.log('cardio_session_deleted', { id });

        // L3：刪除後也重算 streak 與進度
        settleAll();
      },

      getTotalMinutes: () =>
        get().sessions.reduce((sum, s) => sum + (Number.isFinite(s.durationMin) ? s.durationMin : 0), 0),

      getTotalSessions: () => get().sessions.length,
    }),
    {
      name: 'vivix-cardio-v1',
      version: 1,
      // L1：cardioSessions 全為事實，完整 persist
      partialize: (state) => ({ sessions: state.sessions }),
      migrate: (persistedState: unknown) => {
        // L4：unknown + guard
        const raw = (persistedState ?? {}) as Record<string, unknown>;
        const inArr: unknown[] = Array.isArray(raw.sessions) ? raw.sessions : [];
        const sessions: CardioSession[] = [];
        for (const item of inArr) {
          if (typeof item !== 'object' || item === null) continue;
          const o = item as Record<string, unknown>;
          if (
            typeof o.id !== 'string' ||
            typeof o.date !== 'string' ||
            typeof o.machine !== 'string' ||
            typeof o.durationMin !== 'number' ||
            !(o.durationMin > 0)
          ) {
            continue;
          }
          const machineVal = o.machine as unknown;
          const machines: CardioMachine[] = ['treadmill', 'stair', 'elliptical', 'bike', 'rower', 'other'];
          if (!machines.includes(machineVal as CardioMachine)) continue;
          sessions.push({
            id: o.id,
            date: o.date,
            machine: machineVal as CardioMachine,
            durationMin: o.durationMin,
            kcal: typeof o.kcal === 'number' ? o.kcal : null,
            avgHr: typeof o.avgHr === 'number' ? o.avgHr : null,
            distanceKm: typeof o.distanceKm === 'number' ? o.distanceKm : null,
            createdAt: typeof o.createdAt === 'string' ? o.createdAt : new Date().toISOString(),
          });
        }
        return { sessions };
      },
    },
  ),
);
