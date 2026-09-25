/**
 * F4：未完成訓練回收 Modal（網頁版防忘記）
 *
 * App mount（settleOnLoad 後）檢測 stale 條件：
 *   activeSession 存在 && completedSets ≥ 1 &&
 *   （now − lastActivityAt > 30min || 跨日）
 *
 * 三按鈕：
 *   - 繼續訓練：關 modal（保留 activeSession）
 *   - 存為完成：finishSession(finishedAt = lastActivityAt) → navigate summary
 *   - 丟棄：clearActiveSession + restTimerStore.cancel
 * X／overlay 關閉＝繼續訓練。非 stale 時不彈（reload 直接續練）。
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Save, Trash2 } from 'lucide-react';
import { OVERLAY_SCRIM } from '@/data/theme';
import { useWorkoutStore } from '@/store/workoutStore';
import { useRestTimerStore } from '@/store/restTimerStore';
import { dayKey } from '@/utils/time';

const STALE_MS = 30 * 60 * 1000;

export function RecoveryModal() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // persist 同步 rehydrate，settleOnLoad 已在 App effect 跑完
    const { activeSession } = useWorkoutStore.getState();
    if (!activeSession) return;

    const completedSets = activeSession.exercises.reduce(
      (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
      0,
    );
    if (completedSets < 1) return;

    const lastActivityAt = activeSession.lastActivityAt ?? activeSession.startedAt;
    if (!lastActivityAt) return;

    const lastTime = new Date(lastActivityAt).getTime();
    const now = Date.now();
    const staleByTime = now - lastTime > STALE_MS;
    const staleByDay = dayKey(new Date(now)) !== dayKey(new Date(lastTime));
    if (!staleByTime && !staleByDay) return;

    setOpen(true);
  }, []);

  const handleContinue = () => setOpen(false);

  const handleSaveAsFinished = () => {
    const { activeSession, finishSession } = useWorkoutStore.getState();
    if (!activeSession) {
      setOpen(false);
      return;
    }
    const finishedAt = activeSession.lastActivityAt ?? activeSession.startedAt ?? undefined;
    const finished = finishSession(finishedAt);
    setOpen(false);
    if (finished) {
      navigate('/workout/summary', { state: { session: finished } });
    }
  };

  const handleDiscard = () => {
    const { clearActiveSession } = useWorkoutStore.getState();
    clearActiveSession();
    useRestTimerStore.getState().cancel();
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ background: OVERLAY_SCRIM.background }}
          onClick={handleContinue}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="w-full max-w-[480px] bg-bg-card rounded-t-[24px] p-6 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-display text-xl tracking-wide text-text-primary">
                  未完成的訓練
                </div>
                <p className="text-[12px] text-text-secondary mt-1">
                  上次訓練未完成，要繼續、存為完成，還是丟棄？
                </p>
              </div>
              <button
                onClick={handleContinue}
                aria-label="繼續訓練"
                className="p-1.5 text-text-secondary hover:text-text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleContinue}
                className="h-12 bg-accent text-bg-primary rounded-button text-sm font-bold uppercase tracking-wider active:translate-y-px transition-all flex items-center justify-center gap-2"
              >
                <Play size={16} fill="currentColor" /> 繼續訓練
              </button>
              <button
                onClick={handleSaveAsFinished}
                className="h-12 bg-bg-secondary rounded-button border-2 border-border text-sm font-bold uppercase tracking-wider text-text-primary active:translate-y-px transition-all flex items-center justify-center gap-2"
              >
                <Save size={16} /> 存為完成
              </button>
              <button
                onClick={handleDiscard}
                className="h-12 bg-transparent rounded-button text-sm font-bold uppercase tracking-wider text-auxiliary active:translate-y-px transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={16} /> 丟棄
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
