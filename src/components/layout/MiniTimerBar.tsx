/**
 * Mini Timer Bar（T3 / P-2 / T7）
 *
 * 全局迷你列：用戶離開 Workout 頁時顯示，
 * 提示「休息中…」或「訓練進行中」，點擊返回訓練。
 * T7：右側加放棄 X 按鈕，觸發同一放棄確認。
 * 定位於 BottomNav 上方，不遮擋主要操作。
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X } from 'lucide-react';
import { useRestTimerStore } from '@/store/restTimerStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { cn } from '@/lib/utils';

export function MiniTimerBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const timerActive = useRestTimerStore((s) => s.active);
  const cancelTimer = useRestTimerStore((s) => s.cancel);
  const getRemaining = useRestTimerStore((s) => s.getRemaining);
  const activeSession = useWorkoutStore((s) => s.activeSession);
  const clearActiveSession = useWorkoutStore((s) => s.clearActiveSession);

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
  // T13：noNav 路由（summary / onboarding）無 BottomNav → bar 貼底
  const isNoNavRoute =
    location.pathname === '/workout/summary' ||
    location.pathname.startsWith('/onboarding');
  const show = (timerActive || activeSession) && !onWorkout;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // T7：放棄確認（與 Workout 頁 handleAbandon 同一邏輯）
  const handleAbandon = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('放棄這次訓練？記錄將不會儲存。')) {
      clearActiveSession();
      cancelTimer();
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className={cn(
                'fixed left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-[460px] z-40',
                isNoNavRoute ? 'bottom-4' : 'bottom-20'
              )}
        >
          <button
            onClick={() => navigate('/workout')}
            className="w-full flex items-center justify-between bg-accent text-bg-primary rounded-button shadow-card px-4 py-2.5"
          >
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
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                返回訓練
                <ChevronRight size={14} strokeWidth={3} className="inline" />
              </span>
            </div>
          </button>
          {/* T7：放棄入口 */}
          <button
            onClick={handleAbandon}
            aria-label="放棄訓練"
            className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center rounded-full bg-auxiliary text-white shadow-card transition-transform active:scale-90"
          >
            <X size={12} strokeWidth={3} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
