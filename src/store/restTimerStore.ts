/**
 * Rest Timer Store（T3 / P-2）
 *
 * 計時器架構升級：從全屏 overlay 改為 timestamp-based 純 UI 狀態，
 * 讓 docked card 與全局 mini bar 共享同一來源。
 *
 * 律：
 * - 不 persist（純 UI 狀態，重整即清）
 * - timestamp-based（背景可見性變化後仍準確）
 * - tick() 只在狀態轉移時 set()，避免每 100ms 觸發 re-render
 * - 音效／震動在完成轉移時由 store 觸發（不依賴元件在場）
 */
import { create } from 'zustand';
import type { Theme } from '@/types';
import { useThemeStore } from '@/store/themeStore';
import { playCompletionFeedback } from '@/utils/timerFeedback';

interface RestTimerState {
  /** 計時結束時間戳（ms）；null = 未啟動 */
  endsAt: number | null;
  /** 暫停時刻（ms）；null = 未暫停 */
  pausedAt: number | null;
  /** 暫停時剩餘秒數；null = 未暫停 */
  pauseRemaining: number | null;
  /** 本次總秒數（用於進度計算） */
  totalSeconds: number;
  /** 是否倒數中（active && !finished） */
  active: boolean;
  /** 計時已歸零 */
  finished: boolean;
  /** 完成後 2.5s 滯留狀態（超時提醒） */
  overTime: boolean;

  start: (seconds: number) => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  adjust: (deltaSeconds: number) => void;
  reset: () => void;
  setPreset: (seconds: number) => void;
  /** 每 100ms 呼叫；只在狀態轉移時 set */
  tick: () => void;
  /** 非響應式取剩餘秒數（元件自行 poll 顯示） */
  getRemaining: () => number;
}

/** overTime 排程 id（模組級，不入 state） */
let overTimeTimer: ReturnType<typeof setTimeout> | null = null;

function clearOverTimeTimer() {
  if (overTimeTimer !== null) {
    clearTimeout(overTimeTimer);
    overTimeTimer = null;
  }
}

function scheduleOverTime(set: (partial: Partial<RestTimerState>) => void) {
  clearOverTimeTimer();
  overTimeTimer = setTimeout(() => {
    set({ overTime: true });
    overTimeTimer = null;
  }, 2500);
}

export const useRestTimerStore = create<RestTimerState>((set, get) => ({
  endsAt: null,
  pausedAt: null,
  pauseRemaining: null,
  totalSeconds: 0,
  active: false,
  finished: false,
  overTime: false,

  start: (seconds) => {
    clearOverTimeTimer();
    set({
      endsAt: Date.now() + seconds * 1000,
      pausedAt: null,
      pauseRemaining: null,
      totalSeconds: seconds,
      active: true,
      finished: false,
      overTime: false,
    });
  },

  pause: () => {
    const { active, finished, endsAt } = get();
    if (!active || finished || endsAt === null) return;
    const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    set({
      active: false,
      pausedAt: Date.now(),
      pauseRemaining: remaining,
    });
  },

  resume: () => {
    const { pausedAt, pauseRemaining } = get();
    if (pausedAt === null || pauseRemaining === null) return;
    set({
      active: true,
      endsAt: Date.now() + pauseRemaining * 1000,
      pausedAt: null,
      pauseRemaining: null,
    });
  },

  cancel: () => {
    clearOverTimeTimer();
    set({
      endsAt: null,
      pausedAt: null,
      pauseRemaining: null,
      totalSeconds: 0,
      active: false,
      finished: false,
      overTime: false,
    });
  },

  adjust: (deltaSeconds) => {
    const { active, finished, endsAt, pauseRemaining, totalSeconds } = get();
    if (finished) {
      // 完成後調整 → 重啟為剩餘＋delta（最少 15s）
      const next = Math.max(15, deltaSeconds > 0 ? deltaSeconds : 30);
      clearOverTimeTimer();
      set({
        endsAt: Date.now() + next * 1000,
        pausedAt: null,
        pauseRemaining: null,
        totalSeconds: next,
        active: true,
        finished: false,
        overTime: false,
      });
      return;
    }
    if (active && endsAt !== null) {
      const newEndsAt = Math.max(Date.now(), endsAt + deltaSeconds * 1000);
      set({ endsAt: newEndsAt });
    } else if (!active && pauseRemaining !== null) {
      const next = Math.max(0, pauseRemaining + deltaSeconds);
      set({
        pauseRemaining: next,
        totalSeconds: Math.max(totalSeconds, next),
      });
    }
  },

  reset: () => {
    const { totalSeconds } = get();
    if (totalSeconds <= 0) return;
    clearOverTimeTimer();
    set({
      endsAt: Date.now() + totalSeconds * 1000,
      pausedAt: null,
      pauseRemaining: null,
      active: true,
      finished: false,
      overTime: false,
    });
  },

  setPreset: (seconds) => {
    clearOverTimeTimer();
    set({
      endsAt: Date.now() + seconds * 1000,
      pausedAt: null,
      pauseRemaining: null,
      totalSeconds: seconds,
      active: true,
      finished: false,
      overTime: false,
    });
  },

  tick: () => {
    const { active, finished, endsAt } = get();
    if (!active || finished || endsAt === null) return;
    if (Date.now() >= endsAt) {
      // 完成轉移：觸發音效／震動
      const theme: Theme = useThemeStore.getState().theme;
      playCompletionFeedback(theme);
      set({ active: false, finished: true });
      scheduleOverTime(set);
    }
  },

  getRemaining: () => {
    const { active, finished, endsAt, pauseRemaining } = get();
    if (finished) return 0;
    if (!active) return pauseRemaining ?? 0;
    if (endsAt === null) return 0;
    const ms = endsAt - Date.now();
    return ms <= 0 ? 0 : Math.ceil(ms / 1000);
  },
}));
