import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap } from 'lucide-react';
import { useWorkoutStore, getAllExercises } from '@/store/workoutStore';
import { useEquipmentMemoryStore } from '@/store/equipmentMemoryStore';
import { useTelemetryStore } from '@/features/partner/stores/telemetryStore';
import { settleAll } from '@/features/stats/settleAll';
import { bestCompletedSet } from '@/utils/workout';
import { Button } from '@/components/ui/Button';

interface Props {
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

interface ExercisePick {
  exerciseId: string;
  name: string;
}

/**
 * P-RETENTION P0-2：今天只做一組。
 * 從首頁開啟，選一個動作 → 一組 → 完成；不進完整訓練總結。
 */
export function MicroSessionSheet({ open, onClose, onCompleted }: Props) {
  const navigate = useNavigate();
  const sessions = useWorkoutStore((s) => s.sessions);
  const [picked, setPicked] = useState<{
    exerciseLogId: string;
    setId: string;
    exerciseId: string;
    name: string;
  } | null>(null);
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(8);

  const picks = useMemo<ExercisePick[]>(() => {
    const last = sessions[sessions.length - 1];
    const recent = last?.exercises.slice(0, 4) ?? [];
    if (recent.length > 0) {
      const seen = new Set<string>();
      return recent
        .filter((e) => (seen.has(e.exerciseId) ? false : (seen.add(e.exerciseId), true)))
        .map((e) => ({ exerciseId: e.exerciseId, name: e.name }));
    }
    return getAllExercises()
      .slice(0, 4)
      .map((e) => ({ exerciseId: e.id, name: e.name }));
  }, [sessions]);

  const reset = () => {
    setPicked(null);
    setWeight(0);
    setReps(8);
  };

  const handleClose = () => {
    // 中途取消：只清掉本次 micro session，避免留下幽靈訓練或誤刪進行中的正式訓練
    const active = useWorkoutStore.getState().activeSession;
    if (
      active?.kind === 'micro' &&
      !active.exercises.some((e) => e.sets.some((s) => s.completed))
    ) {
      useWorkoutStore.getState().clearActiveSession();
    }
    reset();
    onClose();
  };

  const handlePick = (pick: ExercisePick) => {
    const ws = useWorkoutStore.getState();
    const existing = ws.activeSession;
    // 已有進行中的訓練（有動作或已做熱身）→ 不要覆蓋，避免資料遺失
    if (existing && (existing.exercises.length > 0 || existing.warmupCompletedIds.length > 0)) {
      if (window.confirm('你有一個進行中的訓練，要先回去完成它嗎？')) {
        reset();
        onClose();
        navigate('/workout');
      }
      return;
    }
    const lastSets = ws.getLastSetsForExercise(pick.exerciseId);
    const prevBest = bestCompletedSet(lastSets ?? []);
    const w = prevBest?.weight ?? 0;
    const r = prevBest?.reps ?? 8;
    const meta = getAllExercises().find((e) => e.id === pick.exerciseId);

    ws.startEmptySession('micro');
    ws.addExerciseToActive({
      id: `micro-${Date.now()}`,
      exerciseId: pick.exerciseId,
      snapshot: {
        name: pick.name,
        muscleGroup: meta?.muscleGroup ?? 'chest',
        equipmentType: meta?.equipmentType ?? 'other',
      },
      name: pick.name,
      targetSets: 1,
      targetReps: String(r),
      targetWeight: w,
    });
    const active = useWorkoutStore.getState().activeSession;
    const ex = active?.exercises[0];
    const set = ex?.sets[0];
    if (!ex || !set) return;
    ws.updateSet(ex.id, set.id, { weight: w, reps: r });
    setPicked({
      exerciseLogId: ex.id,
      setId: set.id,
      exerciseId: pick.exerciseId,
      name: pick.name,
    });
    setWeight(w);
    setReps(r);
    useTelemetryStore.getState().log('micro_started', { exerciseId: pick.exerciseId });
  };

  const handleComplete = () => {
    if (!picked) return;
    const ws = useWorkoutStore.getState();
    ws.updateSet(picked.exerciseLogId, picked.setId, { weight, reps });
    ws.toggleSetCompleted(picked.exerciseLogId, picked.setId);
    const finished = ws.finishSession();
    if (finished) {
      useEquipmentMemoryStore.getState().updateFromSession(finished);
      settleAll({
        date: finished.date,
        completedSets: 1,
        plannedSets: 1,
        hasPR: false,
        durationSeconds: finished.duration,
        warmupCompleted: false,
      });
      useTelemetryStore.getState().log('micro_completed', {
        exerciseId: picked.exerciseId,
      });
    }
    reset();
    onCompleted();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="w-full max-w-lg bg-bg-primary rounded-t-2xl p-5 pb-8"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 text-accent">
                  <Zap size={16} />
                  <span className="text-xs uppercase tracking-widest">今天只做一組</span>
                </div>
                <p className="text-[11px] text-text-secondary mt-1">
                  30 秒也算訓練。先開始，剩下的交給明天。
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 -mr-2 text-text-secondary hover:text-text-primary"
                aria-label="關閉"
              >
                <X size={18} />
              </button>
            </div>

            {!picked ? (
              <div className="grid grid-cols-2 gap-2">
                {picks.map((pick) => (
                  <button
                    key={pick.exerciseId}
                    onClick={() => handlePick(pick)}
                    className="p-3 rounded-card border border-border bg-bg-secondary text-left hover:border-accent transition-colors"
                  >
                    <div className="text-sm font-bold text-text-primary truncate">
                      {pick.name}
                    </div>
                    <div className="text-[10px] text-text-secondary mt-1">做一組</div>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <div className="text-sm font-bold text-text-primary mb-3">{picked.name}</div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-widest text-text-secondary">
                      重量 kg
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={0.5}
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value) || 0)}
                      className="mt-1 w-full h-12 rounded-button bg-bg-secondary border border-border text-center font-mono text-lg font-bold text-text-primary focus:outline-none focus:border-accent"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-widest text-text-secondary">
                      次數
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={reps}
                      onChange={(e) => setReps(Number(e.target.value) || 0)}
                      className="mt-1 w-full h-12 rounded-button bg-bg-secondary border border-border text-center font-mono text-lg font-bold text-text-primary focus:outline-none focus:border-accent"
                    />
                  </label>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="secondary" className="flex-1" onClick={reset}>
                    換動作
                  </Button>
                  <Button className="flex-[2]" onClick={handleComplete}>
                    完成這一組
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
