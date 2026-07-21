import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, X, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RestTimerProps {
  initialSeconds?: number;
  onClose: () => void;
}

// PWA 環境(iOS Safari)不支援 navigator.vibrate，改用音效 + 視覺閃爍回饋
function playCompletionFeedback() {
  // 嘗試震動(Android 支援，iOS PWA 會被忽略但不會報錯)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([100, 50, 100]);
  }
  // 嘗試播放音效(Web Audio API，無需音檔)
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const playBeep = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    playBeep(880, 0, 0.15);
    playBeep(660, 0.18, 0.15);
    playBeep(880, 0.36, 0.25);
  } catch {
    // 忽略音效播放失敗
  }
}

export function RestTimer({ initialSeconds = 90, onClose }: RestTimerProps) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [running, setRunning] = useState(true);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            setRunning(false);
            setFinished(true);
            playCompletionFeedback();
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const adjust = (delta: number) => {
    setRemaining((r) => Math.max(0, r + delta));
    setFinished(false);
  };

  const reset = () => {
    setRemaining(initialSeconds);
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
        animate={{
          opacity: 1,
          backgroundColor: finished ? ['rgba(10,10,11,0.98)', 'rgba(212,255,0,0.15)', 'rgba(10,10,11,0.98)'] : 'rgba(10,10,11,0.98)',
        }}
        transition={{
          opacity: { duration: 0.2 },
          backgroundColor: finished ? { duration: 0.5, repeat: Infinity, repeatType: 'reverse' } : { duration: 0.2 },
        }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 backdrop-blur-xl flex flex-col items-center justify-center"
        style={{ backgroundColor: 'rgba(10,10,11,0.98)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-text-secondary hover:text-text-primary"
          aria-label="關閉"
        >
          <X size={24} />
        </button>

        <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-8">
          {finished ? '休息結束' : '組間休息'}
        </div>

        {/* 圓環 */}
        <div className="relative w-72 h-72 flex items-center justify-center mb-12">
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
              transition={{ duration: 0.5, ease: 'linear' }}
            />
          </svg>
          <motion.div
            className="text-center"
            animate={finished ? { scale: [1, 1.15, 1] } : { scale: 1 }}
            transition={finished ? { duration: 0.5, repeat: Infinity } : { duration: 0.2 }}
          >
            <div className={cn(
              "font-mono text-7xl font-bold tabular-nums",
              finished ? "text-auxiliary" : "text-text-primary"
            )}>
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
            {finished && (
              <div className="text-auxiliary font-bold uppercase tracking-widest text-sm mt-2">
                該繼續了！
              </div>
            )}
          </motion.div>
        </div>

        {/* 控制按鈕 */}
        <div className="flex items-center gap-6 mb-8">
          <button
            onClick={() => adjust(-15)}
            className="w-12 h-12 rounded-button border border-border text-text-primary hover:border-accent hover:text-accent flex items-center justify-center"
          >
            <Minus size={20} />
            <span className="text-[9px] absolute mt-9">15s</span>
          </button>
          <button
            onClick={() => { setRunning((r) => !r); setFinished(false); }}
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

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 text-xs uppercase tracking-wider text-text-secondary hover:text-text-primary"
          >
            <RotateCcw size={14} /> 重置
          </button>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {[30, 60, 90, 120, 180].map((s) => (
            <button
              key={s}
              onClick={() => {
                setRemaining(s);
                setRunning(true);
                setFinished(false);
              }}
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
