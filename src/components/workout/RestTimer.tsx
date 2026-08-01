import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, X, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RestTimerProps {
  initialSeconds?: number;
  onClose: () => void;
}

// PWA 環境(iOS Safari)不支援 navigator.vibrate，改用音效 + 柔和視覺回饋
function playCompletionFeedback() {
  // 嘗試震動(Android 支援，iOS PWA 會被忽略但不會報錯)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([100, 50, 100]);
  }
  // 嘗試播放音效(Web Audio API，無需音檔)
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const playBeep = (freq: number, start: number, duration: number, volume = 0.2) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    // 溫柔的三連音（柔和的鐘聲感）
    playBeep(523.25, 0, 0.4, 0.15);    // C5
    playBeep(659.25, 0.25, 0.4, 0.15);  // E5
    playBeep(783.99, 0.5, 0.6, 0.15);   // G5
  } catch {
    // 忽略音效播放失敗
  }
}

export function RestTimer({ initialSeconds = 90, onClose }: RestTimerProps) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [running, setRunning] = useState(true);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 用 endTime 時間戳記錄計時目標，即使頁面進入背景被瀏覽器暫停，
  // 回到前景時也能立即算出正確的剩餘時間（iOS Safari PWA 必備）
  const endTimeRef = useRef<number>(Date.now() + initialSeconds * 1000);
  const pausedRemainingRef = useRef<number>(initialSeconds);

  // 計算剩餘時間的純函數
  const computeRemaining = useCallback(() => {
    if (!running) return pausedRemainingRef.current;
    const ms = endTimeRef.current - Date.now();
    if (ms <= 0) return 0;
    return Math.ceil(ms / 1000);
  }, [running]);

  // 主要計時效果：用時間戳驅動，不受背景暫停影響
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // 立即同步一次
    const sync = () => {
      const r = computeRemaining();
      setRemaining(r);
      if (r <= 0) {
        setRunning(false);
        setFinished(true);
        playCompletionFeedback();
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    sync();
    intervalRef.current = setInterval(sync, 250); // 250ms 更新一次更平滑

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, computeRemaining]);

  // 監聽頁面可見性變化：從背景回到前景時立即同步時間
  // （iOS Safari PWA 在背景會暫停 setInterval，但時間戳仍正確）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && running && !finished) {
        const r = computeRemaining();
        setRemaining(r);
        if (r <= 0) {
          setRunning(false);
          setFinished(true);
          playCompletionFeedback();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [running, finished, computeRemaining]);

  const adjust = (delta: number) => {
    if (running) {
      // 調整 endTime
      endTimeRef.current += delta * 1000;
      if (endTimeRef.current < Date.now()) {
        endTimeRef.current = Date.now();
      }
    } else {
      pausedRemainingRef.current = Math.max(0, pausedRemainingRef.current + delta);
    }
    setRemaining((r) => Math.max(0, r + delta));
    setFinished(false);
  };

  const reset = () => {
    endTimeRef.current = Date.now() + initialSeconds * 1000;
    pausedRemainingRef.current = initialSeconds;
    setRemaining(initialSeconds);
    setRunning(true);
    setFinished(false);
  };

  const toggleRunning = () => {
    if (running) {
      // 暫停：記錄目前剩餘秒數
      pausedRemainingRef.current = computeRemaining();
      setRunning(false);
    } else {
      // 恢復：用剩餘秒數重新計算 endTime
      endTimeRef.current = Date.now() + pausedRemainingRef.current * 1000;
      setRunning(true);
      setFinished(false);
    }
  };

  const setPreset = (s: number) => {
    endTimeRef.current = Date.now() + s * 1000;
    pausedRemainingRef.current = s;
    setRemaining(s);
    setRunning(true);
    setFinished(false);
  };

  const progress = ((initialSeconds - remaining) / initialSeconds) * 100;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const circumference = 2 * Math.PI * 120;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 backdrop-blur-xl flex flex-col items-center justify-center"
        style={{ backgroundColor: 'rgba(10,10,11,0.98)' }}
      >
        {/* 完成時的柔和光暈背景層（慢速呼吸，不閃爍） */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: finished
              ? 'radial-gradient(circle at 50% 45%, rgba(212,255,0,0.08) 0%, rgba(212,255,0,0) 60%)'
              : 'transparent',
          }}
          animate={finished ? { opacity: [0.3, 0.7, 0.3] } : { opacity: 0 }}
          transition={finished ? { duration: 4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.5 }}
        />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-text-secondary hover:text-text-primary z-10"
          aria-label="關閉"
        >
          <X size={24} />
        </button>

        <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-8 relative z-10">
          {finished ? '休息結束' : '組間休息'}
        </div>

        {/* 圓環 */}
        <div className="relative w-72 h-72 flex items-center justify-center mb-12 z-10">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 256 256">
            <circle
              cx="128"
              cy="128"
              r="120"
              fill="none"
              stroke="var(--border-color)"
              strokeWidth="3"
            />
            <motion.circle
              cx="128"
              cy="128"
              r="120"
              fill="none"
              stroke={finished ? 'var(--auxiliary)' : 'var(--accent)'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 0.3, ease: 'linear' }}
              style={finished ? {
                filter: 'drop-shadow(0 0 8px rgba(212,255,0,0.4))',
              } : undefined}
            />
          </svg>
          {/* 柔和的慢速呼吸動畫，不是閃爍 */}
          <motion.div
            className="text-center"
            animate={finished ? { scale: [1, 1.04, 1] } : { scale: 1 }}
            transition={finished ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
          >
            <div className={cn(
              "font-mono text-7xl font-bold tabular-nums transition-colors duration-700",
              finished ? "text-auxiliary" : "text-text-primary"
            )}>
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
            {finished && (
              <motion.div
                className="text-auxiliary font-bold uppercase tracking-widest text-sm mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, ease: 'easeOut' }}
              >
                該繼續了
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* 控制按鈕 */}
        <div className="flex items-center gap-6 mb-8 relative z-10">
          <button
            onClick={() => adjust(-15)}
            className="w-12 h-12 rounded-button border border-border text-text-primary hover:border-accent hover:text-accent flex items-center justify-center"
          >
            <Minus size={20} />
            <span className="text-[9px] absolute mt-9">15s</span>
          </button>
          <button
            onClick={toggleRunning}
            className="w-16 h-16 rounded-button bg-accent text-bg-primary flex items-center justify-center shadow-button"
          >
            {running ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
          </button>
          <button
            onClick={() => adjust(15)}
            className="w-12 h-12 rounded-button border border-border text-text-primary hover:border-accent hover:text-accent flex items-center justify-center"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex gap-3 relative z-10">
          <button
            onClick={reset}
            className="flex items-center gap-2 text-xs uppercase tracking-wider text-text-secondary hover:text-text-primary"
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
                'px-3 py-1.5 text-xs font-mono rounded-button border',
                initialSeconds === s
                  ? 'border-accent text-accent'
                  : 'border-border text-text-secondary hover:text-text-primary'
              )}
            >
              {s}s
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
