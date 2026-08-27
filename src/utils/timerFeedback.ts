/**
 * 計時器完成反饋（音效＋震動）
 *
 * T3（P-2）：從原 RestTimer.tsx 抽取為權威工具，
 * 讓 restTimerStore 在計時完成時也能觸發（不限於元件在場）。
 * 行為零變化 — 僅集中定義。
 */
import type { Theme } from '@/types';

export function playCompletionFeedback(theme: Theme) {
  // 震動（Android 支援，iOS PWA 會被忽略但不會報錯）
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    if (theme === 'dark') {
      // Dark：兩段遞進短震
      navigator.vibrate([60, 80, 120]);
    } else {
      // Light：單次長震
      navigator.vibrate([180]);
    }
  }
  // 音效
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const playBeep = (
      freq: number,
      start: number,
      duration: number,
      volume = 0.15,
      type: OscillatorType = 'sine',
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = type;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    if (theme === 'light') {
      // Light：溫柔三連音（C5-E5-G5 鐘聲感）
      playBeep(523.25, 0, 0.4, 0.12);
      playBeep(659.25, 0.25, 0.4, 0.12);
      playBeep(783.99, 0.5, 0.6, 0.12);
    } else {
      // Dark：低頻雙音（440Hz-220Hz 工業感）
      playBeep(440, 0, 0.15, 0.12, 'triangle');
      playBeep(220, 0.2, 0.35, 0.15, 'triangle');
    }
  } catch {
    // 忽略音效播放失敗
  }
}
