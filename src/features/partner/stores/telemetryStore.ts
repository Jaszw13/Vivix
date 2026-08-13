import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TelemetryEvent } from '../types';
import { generateId } from '@/utils/workout';

const MAX_EVENTS = 1000;

interface TelemetryState {
  events: TelemetryEvent[];
  enabled: boolean;
  log: (name: string, payload?: Record<string, unknown>) => void;
  clear: () => void;
  exportJSON: () => string;
  setEnabled: (enabled: boolean) => void;
}

export const useTelemetryStore = create<TelemetryState>()(
  persist(
    (set, get) => ({
      events: [],
      enabled: true,

      log: (name, payload) => {
        const state = get();
        if (!state.enabled) return;
        const event: TelemetryEvent = {
          id: generateId('event'),
          name,
          timestamp: new Date().toISOString(),
          payload,
        };
        const events = [...state.events, event];
        // 超過上限就斬尾（保留最新）
        if (events.length > MAX_EVENTS) {
          events.splice(0, events.length - MAX_EVENTS);
        }
        set({ events });
      },

      clear: () => set({ events: [] }),

      exportJSON: () => {
        return JSON.stringify(get().events, null, 2);
      },

      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: 'vivix-telemetry-store-v1',
      version: 2,
      // C6：補 migrate — 欄位校驗，避免舊 payload 損壞 crash
      migrate: (persistedState) => {
        const s = (persistedState ?? {}) as Partial<TelemetryState>;
        const events = Array.isArray(s.events) ? s.events : [];
        return {
          events,
          enabled: typeof s.enabled === 'boolean' ? s.enabled : true,
        };
      },
    }
  )
);
