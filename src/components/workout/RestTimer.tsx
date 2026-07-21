import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, X, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RestTimerProps {
  initialSeconds?: number;
  onClose: () => void;
}

export function RestTimer({ initialSeconds = 90, onClose }: RestTimerProps) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            setRunning(false);
            // 震動回饋
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
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
  };

  const reset = () => {
    setRemaining(initialSeconds);
    setRunning(true);
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
        className="fixed inset-0 z-50 bg-bg-primary/98 backdrop-blur-xl flex flex-col items-center justify-center"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-text-secondary hover:text-text-primary"
          aria-label="關閉"
        >
          <X size={24} />
        </button>

        <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-8">
          組間休息
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
              stroke="var(--accent)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 0.5, ease: 'linear' }}
            />
          </svg>
          <div className="text-center">
            <div className="font-mono text-7xl font-bold text-text-primary tabular-nums">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
            {remaining === 0 && (
              <div className="text-accent font-bold uppercase tracking-widest text-sm mt-2 animate-pulse">
                休息結束
              </div>
            )}
          </div>
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
            onClick={() => setRunning((r) => !r)}
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
