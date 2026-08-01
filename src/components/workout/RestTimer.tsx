import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, X, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/store/themeStore';

interface RestTimerProps {
  initialSeconds?: number;
  onClose: () => void;
}

// ============ 音效：兩套主題共用 ============
function playCompletionFeedback(theme: 'light' | 'dark') {
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
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const playBeep = (freq: number, start: number, duration: number, volume = 0.15, type: OscillatorType = 'sine') => {
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

// ============ 主題色值 ============
const THEME_COLORS = {
  light: {
    bgBase: 'rgba(248, 245, 240, 0.98)',     // #F8F5F0
    ringTrack: 'rgba(201, 169, 110, 0.15)',  // 淡金軌道
    ringActive: '#C9A96E',                    // 進行中：暖金
    ringPreheat: '#D4B886',                   // 預熱：稍微提亮
    ringComplete: '#E8D5A8',                   // 完成：奶油米白 #FFFAD2 偏柔
    breathGlow: 'rgba(232, 213, 168, 0.18)',  // 呼吸光暈
    textPrimary: '#2A2520',
    textSecondary: '#8B7E6E',
    textComplete: '#8B6F2E',
    label: '休息結束',
    progressFilter: 'none',
  },
  dark: {
    bgBase: 'rgba(10, 10, 11, 0.98)',          // #0A0A0B
    ringTrack: 'rgba(30, 70, 100, 0.2)',       // 暗冰藍軌道
    ringActive: '#1E4664',                     // 進行中：暗冰藍
    ringPreheat: '#2A5A7F',                    // 預熱：稍提亮
    ringComplete: '#23553F',                   // 完成：工業暗苔綠
    breathGlow: 'rgba(35, 85, 63, 0.22)',      // 暗綠呼吸光暈
    textPrimary: '#F0F0F0',
    textSecondary: '#8A8A8A',
    textComplete: '#3A7A5A',
    label: '就緒',
    progressFilter: 'drop-shadow(0 0 6px rgba(35,85,63,0.5))',
  },
};

// ============ 主元件 ============
export function RestTimer({ initialSeconds = 90, onClose }: RestTimerProps) {
  const { theme } = useThemeStore();
  const colors = THEME_COLORS[theme];

  const [remaining, setRemaining] = useState(initialSeconds);
  const [running, setRunning] = useState(true);
  const [finished, setFinished] = useState(false);
  const [overTime, setOverTime] = useState(false); // 超時滯留狀態
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number>(Date.now() + initialSeconds * 1000);
  const pausedRemainingRef = useRef<number>(initialSeconds);
  const finishedAtRef = useRef<number>(0);

  // 階段判斷：最後3秒預熱
  const isPreheating = running && !finished && remaining > 0 && remaining <= 3;
  // 階段判斷：超時（完成後 2.5s 之後仍在計時畫面）
  const isOverTime = overTime;

  const computeRemaining = useCallback(() => {
    if (!running) return pausedRemainingRef.current;
    const ms = endTimeRef.current - Date.now();
    if (ms <= 0) return 0;
    return Math.ceil(ms / 1000);
  }, [running]);

  // 主計時
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const sync = () => {
      const r = computeRemaining();
      setRemaining(r);
      if (r <= 0 && !finished) {
        setRunning(false);
        setFinished(true);
        finishedAtRef.current = Date.now();
        playCompletionFeedback(theme);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    sync();
    intervalRef.current = setInterval(sync, 250);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, computeRemaining, finished, theme]);

  // 完成後 2.5s 自動切換到超時滯留狀態
  useEffect(() => {
    if (!finished) {
      setOverTime(false);
      return;
    }
    const t = setTimeout(() => setOverTime(true), 2500);
    return () => clearTimeout(t);
  }, [finished]);

  // 可見性變化監聽
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && running && !finished) {
        const r = computeRemaining();
        setRemaining(r);
        if (r <= 0) {
          setRunning(false);
          setFinished(true);
          finishedAtRef.current = Date.now();
          playCompletionFeedback(theme);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [running, finished, computeRemaining, theme]);

  const adjust = (delta: number) => {
    if (running) {
      endTimeRef.current += delta * 1000;
      if (endTimeRef.current < Date.now()) {
        endTimeRef.current = Date.now();
      }
    } else {
      pausedRemainingRef.current = Math.max(0, pausedRemainingRef.current + delta);
    }
    setRemaining((r) => Math.max(0, r + delta));
    setFinished(false);
    setOverTime(false);
  };

  const reset = () => {
    endTimeRef.current = Date.now() + initialSeconds * 1000;
    pausedRemainingRef.current = initialSeconds;
    setRemaining(initialSeconds);
    setRunning(true);
    setFinished(false);
    setOverTime(false);
  };

  const toggleRunning = () => {
    if (running) {
      pausedRemainingRef.current = computeRemaining();
      setRunning(false);
    } else {
      endTimeRef.current = Date.now() + pausedRemainingRef.current * 1000;
      setRunning(true);
      setFinished(false);
      setOverTime(false);
    }
  };

  const setPreset = (s: number) => {
    endTimeRef.current = Date.now() + s * 1000;
    pausedRemainingRef.current = s;
    setRemaining(s);
    setRunning(true);
    setFinished(false);
    setOverTime(false);
  };

  const progress = ((initialSeconds - remaining) / initialSeconds) * 100;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const circumference = 2 * Math.PI * 120;
  const dashOffset = circumference - (progress / 100) * circumference;

  // 決定當前圓環顏色
  const ringColor = finished
    ? colors.ringComplete
    : isPreheating
    ? colors.ringPreheat
    : colors.ringActive;

  // 背景光暈：完成時用呼吸光暈，超時用警告色
  const glowColor = isOverTime
    ? (theme === 'dark' ? 'rgba(90, 60, 30, 0.15)' : 'rgba(255, 200, 150, 0.12)')
    : colors.breathGlow;

  // 文字顏色
  const numColor = finished
    ? colors.textComplete
    : colors.textPrimary;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 backdrop-blur-xl flex flex-col items-center justify-center"
        style={{ backgroundColor: colors.bgBase }}
      >
        {/* 背景呼吸光暈層 */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: finished
              ? `radial-gradient(circle at 50% 45%, ${glowColor} 0%, transparent 65%)`
              : 'transparent',
          }}
          animate={finished ? {
            opacity: isOverTime ? [0.2, 0.45, 0.2] : [0.3, 0.7, 0.3],
          } : { opacity: 0 }}
          transition={finished ? {
            duration: isOverTime ? 3.5 : 2.2,
            repeat: Infinity,
            ease: 'easeInOut',
          } : { duration: 0.5 }}
        />

        {/* Dark 主題專屬：完成時邊框流光燈帶 */}
        {theme === 'dark' && finished && (
          <BorderFlowLight key="border-flow" />
        )}

        {/* Light 主題專屬：完成時環形漫開 */}
        {theme === 'light' && finished && (
          <RadialSpread key="radial-spread" color={colors.ringComplete} />
        )}

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center z-20"
          style={{ color: colors.textSecondary }}
          aria-label="關閉"
        >
          <X size={24} />
        </button>

        <div
          className="text-[10px] uppercase tracking-widest mb-8 relative z-10 transition-colors duration-500"
          style={{ color: finished ? colors.textComplete : colors.textSecondary }}
        >
          {finished ? (isOverTime ? '已超時' : colors.label) : '組間休息'}
        </div>

        {/* 圓環 */}
        <div className="relative w-72 h-72 flex items-center justify-center mb-12 z-10">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 256 256">
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
              transition={{ duration: 0.3, ease: 'linear' }}
              style={{
                filter: finished ? colors.progressFilter : 'none',
                transition: 'stroke 0.5s ease, stroke-width 0.3s ease',
              }}
            />
          </svg>
          {/* 數字與標籤 */}
          <motion.div
            className="text-center"
            animate={finished ? {
              scale: isOverTime ? [1, 1.02, 1] : [1, 1.04, 1],
            } : { scale: 1 }}
            transition={finished ? {
              duration: isOverTime ? 3.5 : 2.2,
              repeat: Infinity,
              ease: 'easeInOut',
            } : { duration: 0.2 }}
          >
            <div
              className="font-mono text-7xl font-bold tabular-nums transition-colors duration-700"
              style={{ color: numColor }}
            >
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
            {finished && (
              <motion.div
                className="font-bold uppercase tracking-widest text-sm mt-2"
                style={{ color: colors.textComplete }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, ease: 'easeOut' }}
              >
                {isOverTime ? '休息過長' : (theme === 'light' ? '休息完成' : '就緒')}
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* 控制按鈕 */}
        <div className="flex items-center gap-6 mb-8 relative z-10">
          <button
            onClick={() => adjust(-15)}
            className="w-12 h-12 rounded-button border flex items-center justify-center transition-colors"
            style={{
              borderColor: colors.ringTrack,
              color: colors.textPrimary,
            }}
          >
            <Minus size={20} />
            <span className="text-[9px] absolute mt-9">15s</span>
          </button>
          <button
            onClick={toggleRunning}
            className="w-16 h-16 rounded-button flex items-center justify-center shadow-button transition-all"
            style={{
              backgroundColor: colors.ringActive,
              color: theme === 'light' ? '#FFF' : '#0A0A0B',
            }}
          >
            {running ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
          </button>
          <button
            onClick={() => adjust(15)}
            className="w-12 h-12 rounded-button border flex items-center justify-center transition-colors"
            style={{
              borderColor: colors.ringTrack,
              color: colors.textPrimary,
            }}
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex gap-3 relative z-10">
          <button
            onClick={reset}
            className="flex items-center gap-2 text-xs uppercase tracking-wider transition-colors"
            style={{ color: colors.textSecondary }}
          >
            <RotateCcw size={14} /> 重置
          </button>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {[30, 60, 90, 120, 180].map((s) => (
            <button
              key={s}
              onClick={() => setPreset(s)}
              className={cn(
                'px-3 py-1.5 text-xs font-mono rounded-button border transition-colors'
              )}
              style={{
                borderColor: initialSeconds === s ? colors.ringActive : colors.ringTrack,
                color: initialSeconds === s ? colors.ringActive : colors.textSecondary,
              }}
            >
              {s}s
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============ Dark 主題：邊框單向流光燈帶 ============
function BorderFlowLight() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="flow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(35,85,63,0)" />
            <stop offset="50%" stopColor="rgba(35,85,63,0.8)" />
            <stop offset="100%" stopColor="rgba(35,85,63,0)" />
          </linearGradient>
          <mask id="border-mask">
            <rect x="2" y="2" width="96" height="96" rx="3" ry="3" fill="none" stroke="white" strokeWidth="0.8" />
          </mask>
        </defs>
        {/* 邊框路徑 */}
        <rect
          x="2" y="2" width="96" height="96" rx="3" ry="3"
          fill="none"
          stroke="rgba(35,85,63,0.15)"
          strokeWidth="0.4"
        />
        {/* 流光：從左上角順時針繞一圈 */}
        <motion.rect
          x="2" y="2" width="96" height="96" rx="3" ry="3"
          fill="none"
          stroke="url(#flow-grad)"
          strokeWidth="1.2"
          strokeLinecap="round"
          mask="url(#border-mask)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
          transition={{
            pathLength: { duration: 1.5, ease: 'easeInOut' },
            opacity: { duration: 1.5, times: [0, 0.2, 0.8, 1] },
          }}
        />
      </svg>
    </motion.div>
  );
}

// ============ Light 主題：環形漫開光 ============
function RadialSpread({ color }: { color: string }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        style={{
          width: 280,
          height: 280,
          borderRadius: '50%',
          border: `2px solid ${color}`,
        }}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: [0.6, 1.4, 1.8], opacity: [0, 0.5, 0] }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      <motion.div
        style={{
          position: 'absolute',
          width: 280,
          height: 280,
          borderRadius: '50%',
          border: `1px solid ${color}`,
        }}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: [0.6, 1.6, 2.2], opacity: [0, 0.3, 0] }}
        transition={{ duration: 1.4, ease: 'easeOut', delay: 0.15 }}
      />
    </motion.div>
  );
}
