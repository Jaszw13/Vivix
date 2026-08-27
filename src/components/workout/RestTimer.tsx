/**
 * Docked Rest Timer（T3 / P-2）
 *
 * 原為全屏 overlay；現重構為 Workout 頁底部 sticky 內嵌卡片（dock）。
 * 行為保留：auto-start（由 ExerciseSetList 呼叫 store.start）、±15s、暫停/繼續、
 *           音效、震動、最後 3 秒預熱。
 * 狀態來源：restTimerStore（不 persist，timestamp-based）。
 * 離開 Workout 頁時由全局 MiniTimerBar 接手顯示。
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, X, Plus, Minus, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/store/themeStore';
import { useRestTimerStore } from '@/store/restTimerStore';
import { REST_TIMER_THEME as THEME_COLORS } from '@/data/theme';

const PRESETS = [30, 60, 90, 120, 180];

export function RestTimer() {
  const { theme } = useThemeStore();
  const colors = THEME_COLORS[theme];

  const active = useRestTimerStore((s) => s.active);
  const finished = useRestTimerStore((s) => s.finished);
  const overTime = useRestTimerStore((s) => s.overTime);
  const totalSeconds = useRestTimerStore((s) => s.totalSeconds);
  const pausedAt = useRestTimerStore((s) => s.pausedAt);
  const pause = useRestTimerStore((s) => s.pause);
  const resume = useRestTimerStore((s) => s.resume);
  const cancel = useRestTimerStore((s) => s.cancel);
  const adjust = useRestTimerStore((s) => s.adjust);
  const reset = useRestTimerStore((s) => s.reset);
  const setPreset = useRestTimerStore((s) => s.setPreset);
  const getRemaining = useRestTimerStore((s) => s.getRemaining);

  // 本地顯示剩餘秒數（元件自行 poll，避免 store 每 tick re-render）
  const [displayRemaining, setDisplayRemaining] = useState(0);

  const sync = useCallback(() => {
    setDisplayRemaining(getRemaining());
  }, [getRemaining]);

  // 250ms 更新顯示（與原節奏一致）
  useEffect(() => {
    sync();
    if (!active && !finished) return;
    const id = setInterval(sync, 250);
    return () => clearInterval(id);
  }, [active, finished, sync]);

  // 可見性變化時同步（背景返回前台）
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', handler);
    window.addEventListener('focus', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
      window.removeEventListener('focus', handler);
    };
  }, [sync]);

  const show = active || finished || overTime;

  // 最後 3 秒預熱
  const isPreheating = active && !finished && displayRemaining > 0 && displayRemaining <= 3;

  const ringColor = finished
    ? colors.ringComplete
    : isPreheating
      ? colors.ringPreheat
      : colors.ringActive;
  const numColor = finished ? colors.textComplete : colors.textPrimary;

  const progress = totalSeconds > 0
    ? ((totalSeconds - displayRemaining) / totalSeconds) * 100
    : 0;
  const circumference = 2 * Math.PI * 120;
  const dashOffset = circumference - (progress / 100) * circumference;

  const minutes = Math.floor(displayRemaining / 60);
  const seconds = displayRemaining % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const toggleRunning = () => {
    if (finished) {
      reset();
    } else if (active) {
      pause();
    } else if (pausedAt !== null) {
      resume();
    }
  };

  const label = finished
    ? (overTime ? '已超時' : theme === 'light' ? '休息完成' : '就緒')
    : pausedAt !== null
      ? '已暫停'
      : '組間休息';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25 }}
          className={cn(
            'mb-2 rounded-card border p-3 shadow-card transition-colors',
            finished ? 'border-accent/40 bg-accent/5' : 'border-border bg-bg-card',
          )}
        >
          <div className="flex items-center gap-3">
            {/* 圓環倒數 */}
            <div className="relative w-14 h-14 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 256 256">
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke={colors.ringTrack}
                  strokeWidth="3"
                />
                <motion.circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke={ringColor}
                  strokeWidth={isPreheating || finished ? 5 : 4}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  animate={{ strokeDashoffset: dashOffset }}
                  transition={{ duration: 0.25, ease: 'linear' }}
                  style={{
                    filter: finished ? colors.progressFilter : 'none',
                    transition: 'stroke 0.5s ease, stroke-width 0.3s ease',
                  }}
                />
              </svg>
              <div
                className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold tabular-nums transition-colors duration-500"
                style={{ color: numColor }}
              >
                {displayRemaining}s
              </div>
            </div>

            {/* 標籤＋時間 */}
            <div className="flex-1 min-w-0">
              <div
                className="text-[10px] uppercase tracking-widest transition-colors duration-500"
                style={{ color: finished ? colors.textComplete : colors.textSecondary }}
              >
                {label}
              </div>
              <div
                className="font-mono text-xl font-bold tabular-nums transition-colors duration-500"
                style={{ color: numColor }}
              >
                {timeStr}
              </div>
            </div>

            {/* 暫停/繼續＋關閉 */}
            <div className="flex items-center gap-1">
              <button
                onClick={toggleRunning}
                className="w-10 h-10 rounded-button flex items-center justify-center shadow-button transition-all flex-shrink-0"
                style={{
                  backgroundColor: colors.ringActive,
                  color: colors.buttonFg,
                }}
                aria-label={active ? '暫停' : '繼續'}
              >
                {active ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>
              <button
                onClick={cancel}
                className="w-9 h-9 flex items-center justify-center text-text-secondary hover:text-auxiliary transition-colors flex-shrink-0"
                aria-label="關閉計時器"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* 控制列 */}
          <div className="flex items-center gap-1.5 mt-2.5">
            <button
              onClick={() => adjust(-15)}
              className="h-8 px-2 rounded-button border border-border flex items-center gap-0.5 text-[10px] font-mono text-text-secondary hover:text-accent hover:border-accent/50 transition-colors flex-shrink-0"
            >
              <Minus size={12} />15
            </button>
            <div className="flex gap-1 flex-1 overflow-x-auto scrollbar-hide">
              {PRESETS.map((s) => (
                <button
                  key={s}
                  onClick={() => setPreset(s)}
                  className={cn(
                    'h-8 px-2.5 text-[10px] font-mono rounded-button border transition-colors whitespace-nowrap',
                  )}
                  style={{
                    borderColor: totalSeconds === s ? colors.ringActive : 'var(--color-border)',
                    color: totalSeconds === s ? colors.ringActive : 'var(--color-text-secondary)',
                  }}
                >
                  {s}s
                </button>
              ))}
            </div>
            <button
              onClick={reset}
              className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-accent transition-colors flex-shrink-0"
              aria-label="重置"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={() => adjust(15)}
              className="h-8 px-2 rounded-button border border-border flex items-center gap-0.5 text-[10px] font-mono text-text-secondary hover:text-accent hover:border-accent/50 transition-colors flex-shrink-0"
            >
              <Plus size={12} />15
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
