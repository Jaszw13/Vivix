import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TelemetryEvent } from '../types';

const MAX_EVENTS = 1000;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

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
          id: generateId(),
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
      version: 1,
    }
  )
);
