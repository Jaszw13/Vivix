import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, Timer, X } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ExerciseSetList } from '@/components/workout/ExerciseSetList';
import { RestTimer } from '@/components/workout/RestTimer';
import { useWorkoutStore } from '@/store/workoutStore';
import { exercises } from '@/data/exercises';
import { exerciseCategories } from '@/data/exercises';
import { formatDuration } from '@/utils/workout';
import type { ExerciseCategory } from '@/types';

export default function Workout() {
  const navigate = useNavigate();
  const { activeSession, startEmptySession, finishSession, clearActiveSession, addExerciseToActive } =
    useWorkoutStore();
  const [showTimer, setShowTimer] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showAddExercise, setShowAddExercise] = useState(false);

  // 若無進行中訓練，自動建立空白 session
  useEffect(() => {
    if (!activeSession) {
      startEmptySession();
    }
  }, [activeSession, startEmptySession]);

  // 計時
  useEffect(() => {
    if (!activeSession) return;
    const startTime = new Date(activeSession.date).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  if (!activeSession) {
    return (
      <PageShell title="訓練中" showBack showNav={false}>
        <div className="text-center text-text-secondary mt-20">載入中…</div>
      </PageShell>
    );
  }

  const handleFinish = () => {
    const finished = finishSession();
    if (finished) {
      navigate('/workout/summary', { state: { session: finished } });
    }
  };

  const handleExit = () => {
    if (window.confirm('放棄這次訓練？記錄將不會儲存。')) {
      clearActiveSession();
      navigate('/');
    }
  };

  return (
    <PageShell
      title="訓練中"
      showNav={false}
      noPadding
      rightAction={
        <div className="flex items-center gap-3 pr-1">
          <div className="font-mono text-sm text-accent tabular-nums">
            {formatDuration(elapsed)}
          </div>
          <button
            onClick={handleExit}
            className="w-9 h-9 flex items-center justify-center text-text-secondary hover:text-auxiliary"
            aria-label="放棄訓練"
          >
            <X size={22} />
          </button>
        </div>
      }
    >
      <div className="px-4 py-4 flex-1 flex flex-col">
        {/* 訓練資訊 */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="text-[10px] uppercase tracking-widest text-text-secondary">
            {activeSession.planName ?? '自由訓練'}
          </div>
          <h1 className="font-display text-3xl tracking-wide uppercase text-text-primary">
            {activeSession.dayName ?? '今日訓練'}
          </h1>
        </motion.div>

        {/* 動作列表 */}
        <div className="flex flex-col gap-3 flex-1">
          <AnimatePresence>
            {activeSession.exercises.map((ex, i) => (
              <motion.div
                key={ex.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ delay: i * 0.05 }}
              >
                <ExerciseSetList
                  exercise={ex}
                  onSetCompleted={() => setShowTimer(true)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* 新增動作 */}
          {activeSession.exercises.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-sm text-text-secondary mb-4">
                尚未加入任何動作
              </p>
              <Button onClick={() => setShowAddExercise(true)}>
                <Plus size={16} /> 新增動作
              </Button>
            </Card>
          )}
        </div>

        {/* 底部操作 */}
        <div className="sticky bottom-0 -mx-4 px-4 pt-4 pb-4 bg-gradient-to-t from-bg-primary via-bg-primary to-transparent">
          <div className="flex gap-3">
            <Button variant="secondary" size="lg" onClick={() => setShowAddExercise(true)}>
              <Plus size={18} />
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setShowTimer(true)}>
              <Timer size={18} />
            </Button>
            <Button size="lg" fullWidth onClick={handleFinish}>
              <Check size={18} /> 完成訓練
            </Button>
          </div>
        </div>
      </div>

      {/* 休息計時器 */}
      <AnimatePresence>
        {showTimer && <RestTimer onClose={() => setShowTimer(false)} />}
      </AnimatePresence>

      {/* 新增動作彈窗 */}
      <AnimatePresence>
        {showAddExercise && (
          <AddExerciseSheet
            onClose={() => setShowAddExercise(false)}
            onSelect={(exerciseId, name) => {
              addExerciseToActive({
                id: `pe-${Date.now()}`,
                exerciseId,
                name,
                targetSets: 3,
                targetReps: '8-12',
              });
              setShowAddExercise(false);
            }}
          />
        )}
      </AnimatePresence>
    </PageShell>
  );
}

// ============ 新增動作彈窗 ============

interface AddExerciseSheetProps {
  onClose: () => void;
  onSelect: (exerciseId: string, name: string) => void;
}

function AddExerciseSheet({ onClose, onSelect }: AddExerciseSheetProps) {
  const [category, setCategory] = useState<ExerciseCategory | 'all'>('all');
  const list = category === 'all' ? exercises : exercises.filter((e) => e.category === category);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] h-[80vh] bg-bg-primary rounded-t-card flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-display text-2xl tracking-wide uppercase text-text-primary">
            選擇動作
          </h3>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-text-secondary hover:text-text-primary"
          >
            <X size={20} />
          </button>
        </div>
        {/* 分類標籤 */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-border">
          <CategoryChip
            label="全部"
            active={category === 'all'}
            onClick={() => setCategory('all')}
          />
          {exerciseCategories.map((c) => (
            <CategoryChip
              key={c.value}
              label={c.label}
              active={category === c.value}
              onClick={() => setCategory(c.value)}
            />
          ))}
        </div>
        {/* 動作列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-2">
            {list.map((ex) => (
              <button
                key={ex.id}
                onClick={() => onSelect(ex.id, ex.name)}
                className="flex items-center justify-between p-3 bg-bg-card rounded-button border border-border/40 hover:border-accent/50 transition-colors text-left"
              >
                <div>
                  <div className="text-sm font-bold text-text-primary">{ex.name}</div>
                  <div className="text-[10px] text-text-secondary mt-0.5">
                    {ex.muscleGroup} · {ex.equipment}
                  </div>
                </div>
                <Plus size={18} className="text-accent" />
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface CategoryChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function CategoryChip({ label, active, onClick }: CategoryChipProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded-button whitespace-nowrap border transition-colors ${
        active
          ? 'bg-accent text-bg-primary border-accent'
          : 'bg-transparent text-text-secondary border-border hover:text-text-primary'
      }`}
    >
      {label}
    </button>
  );
}
