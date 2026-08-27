/**
 * Mini Timer Bar（T3 / P-2）
 *
 * 全局迷你列：用戶離開 Workout 頁時顯示，
 * 提示「休息中…」或「訓練進行中」，點擊返回訓練。
 * 定位於 BottomNav 上方，不遮擋主要操作。
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useRestTimerStore } from '@/store/restTimerStore';
import { useWorkoutStore } from '@/store/workoutStore';

export function MiniTimerBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const timerActive = useRestTimerStore((s) => s.active);
  const getRemaining = useRestTimerStore((s) => s.getRemaining);
  const activeSession = useWorkoutStore((s) => s.activeSession);

  // 本地時間顯示
  const [remaining, setRemaining] = useState(0);
  const sync = useCallback(() => {
    setRemaining(getRemaining());
  }, [getRemaining]);

  useEffect(() => {
    if (!timerActive) return;
    sync();
    const id = setInterval(sync, 500);
    return () => clearInterval(id);
  }, [timerActive, sync]);

  const onWorkout = location.pathname === '/workout';
  const show = (timerActive || activeSession) && !onWorkout;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={() => navigate('/workout')}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-[460px] z-40"
        >
          <div className="flex items-center justify-between bg-accent text-bg-primary rounded-button shadow-card px-4 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-bold tracking-wide">
                {timerActive ? '休息中' : '訓練進行中'}
              </span>
              {timerActive && (
                <span className="font-mono text-sm tabular-nums opacity-80">
                  {timeStr}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider whitespace-nowrap">
              返回訓練
              <ChevronRight size={14} strokeWidth={3} />
            </div>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
