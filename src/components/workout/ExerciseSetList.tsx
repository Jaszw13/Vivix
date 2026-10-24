import { useState, useMemo } from 'react';
import { Check, Minus, Plus, Trash2, History, Repeat } from 'lucide-react';
import type { ExerciseLog, SetLog } from '@/types';
import { useWorkoutStore } from '@/store/workoutStore';
import { bestCompletedSet, getProgressKind, setLoadKg } from '@/utils/workout';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface SetRowProps {
  exercise: ExerciseLog;
  onSetCompleted?: () => void;
  onSubstitute?: () => void;
}

export function ExerciseSetList({ exercise, onSetCompleted, onSubstitute }: SetRowProps) {
  const { updateSet, addSet, removeSet, toggleSetCompleted, removeExercise, getLastSetsForExercise, addDropSet, updateDropSet, removeDropSet } =
    useWorkoutStore();
  // T4：新紀錄微慶祝（只跟上一次同動作的最佳組比較）
  const [recentPRSetIds, setRecentPRSetIds] = useState<string[]>([]);
  const activeExercises = useWorkoutStore((s) => s.activeSession?.exercises ?? []);

  const lastSets = getLastSetsForExercise(exercise.exerciseId);
  const previousBest = useMemo(() => bestCompletedSet(lastSets ?? []), [lastSets]);

  // 實際執行順序：以「第一組完成」的時間排序
  const performedRank = useMemo(() => {
    const ordered = activeExercises
      .filter((e) => e.firstCompletedAt)
      .sort(
        (a, b) =>
          new Date(a.firstCompletedAt!).getTime() - new Date(b.firstCompletedAt!).getTime(),
      );
    const index = ordered.findIndex((e) => e.id === exercise.id);
    return index >= 0 ? index + 1 : null;
  }, [activeExercises, exercise.id]);

  const checkPRBreakthrough = (set: SetLog): boolean =>
    getProgressKind({ weight: set.weight, reps: set.reps }, previousBest) !== null;

  const flashPRCelebration = (setId: string) => {
    setRecentPRSetIds((prev) => [...prev, setId]);
    setTimeout(() => {
      setRecentPRSetIds((prev) => prev.filter((id) => id !== setId));
    }, 1500);
  };

  const completedCount = exercise.sets.filter((s) => s.completed).length;
  const totalVolume = exercise.sets
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + setLoadKg(s), 0);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display text-xl tracking-wide uppercase text-text-primary">
            {exercise.name}
            {exercise.substitutedFrom && (
              <span className="ml-2 text-[9px] uppercase tracking-widest text-auxiliary font-normal align-middle">
                (已替換)
              </span>
            )}
          </h3>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] uppercase tracking-widest text-text-secondary">
              {completedCount}/{exercise.sets.length} 組完成
            </span>
            {performedRank !== null && (
              <span className="text-[10px] font-mono text-accent">
                第 {performedRank} 個做
              </span>
            )}
            {totalVolume > 0 && (
              <span className="font-mono text-[10px] text-accent">
                {totalVolume} kg
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onSubstitute && (
            <button
              onClick={onSubstitute}
              className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-accent transition-colors"
              aria-label="替換動作"
              title="器械排隊？替換同部位動作"
            >
              <Repeat size={16} />
            </button>
          )}
          <button
            onClick={() => removeExercise(exercise.id)}
            className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-auxiliary transition-colors"
            aria-label="刪除動作"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* 上一次訓練參考 */}
      {lastSets && lastSets.length > 0 && (
        <div className="mb-3 p-2.5 rounded-button bg-bg-secondary border border-border/40">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-text-secondary mb-1.5">
            <History size={12} />
            <span>上次訓練</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {lastSets.map((s, i) => (
              <span
                key={s.id}
                className="font-mono text-[11px] text-text-secondary bg-bg-card px-2 py-1 rounded-button border border-border/30"
              >
                {s.weight}kg × {s.reps}
                {i < lastSets.length - 1 && <span className="text-text-secondary/40 ml-0.5">→</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 標題列 */}
      <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem_2rem] gap-2 px-1 mb-2 text-[9px] uppercase tracking-widest text-text-secondary">
        <div className="text-center">#</div>
        <div className="text-center">重量 kg</div>
        <div className="text-center">次數</div>
        <div className="text-center">完成</div>
        <div />
      </div>

      <div className="flex flex-col gap-2">
        {exercise.sets.map((set) => (
          <div key={set.id}>
            <div
              className={cn(
                'grid grid-cols-[2rem_1fr_1fr_2.5rem_2rem] gap-2 items-center transition-colors relative',
                set.completed && 'opacity-60'
              )}
            >
              {/* T4：破 PR 即時微慶祝 overlay（L5；1.5s 非阻斷） */}
              {recentPRSetIds.includes(set.id) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 animate-confetti">
                  <span className="text-xs font-bold text-accent bg-bg-card px-2 py-1 rounded-button border border-accent/40 shadow-card">
                    🎉 新紀錄
                  </span>
                </div>
              )}
              <div className="font-mono text-sm text-text-secondary text-center">
                {set.setNumber}
              </div>
              {/* 重量 */}
              <NumberInput
                value={set.weight}
                onDecrease={() =>
                  updateSet(exercise.id, set.id, {
                    weight: Math.max(0, set.weight - 2.5),
                  })
                }
                onIncrease={() =>
                  updateSet(exercise.id, set.id, {
                    weight: set.weight + 2.5,
                  })
                }
                onChange={(v) =>
                  updateSet(exercise.id, set.id, { weight: v })
                }
              />
              {/* 次數 */}
              <NumberInput
                value={set.reps}
                step={1}
                onDecrease={() =>
                  updateSet(exercise.id, set.id, {
                    reps: Math.max(0, set.reps - 1),
                  })
                }
                onIncrease={() =>
                  updateSet(exercise.id, set.id, { reps: set.reps + 1 })
                }
                onChange={(v) => updateSet(exercise.id, set.id, { reps: v })}
              />
              {/* 完成按鈕 */}
              <button
                onClick={() => {
                  // T4：完成前檢查是否破 PR（L5；純 UI 微慶祝，telemetry 走 settleAll）
                  if (!set.completed && checkPRBreakthrough(set)) {
                    flashPRCelebration(set.id);
                  }
                  toggleSetCompleted(exercise.id, set.id);
                  if (!set.completed) onSetCompleted?.();
                }}
                className={cn(
                  'w-10 h-10 mx-auto rounded-button border-2 flex items-center justify-center transition-all',
                  set.completed
                    ? 'bg-accent border-accent text-bg-primary'
                    : 'border-border text-text-secondary hover:border-accent hover:text-accent'
                )}
                aria-label="切換完成"
              >
                <Check size={18} strokeWidth={3} />
              </button>
              {/* 刪除這一組 */}
              <button
                onClick={() => removeSet(exercise.id, set.id)}
                className="w-8 h-8 mx-auto flex items-center justify-center text-text-secondary hover:text-auxiliary transition-colors"
                aria-label="刪除這一組"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* R6：遞減組（drops） */}
            {(set.drops ?? []).length > 0 && (
              <div className="mt-1 ml-[2rem] flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-text-secondary font-mono">→</span>
                {(set.drops ?? []).map((drop, di) => (
                  <div key={di} className="flex items-center gap-1">
                    <input
                      type="number"
                      value={drop.weight}
                      step={2.5}
                      onChange={(e) => updateDropSet(exercise.id, set.id, di, { weight: parseFloat(e.target.value) || 0 })}
                      className="w-12 h-7 bg-bg-secondary rounded-button text-center font-mono text-xs text-text-primary border border-border/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-[10px] text-text-secondary">×</span>
                    <input
                      type="number"
                      value={drop.reps}
                      step={1}
                      onChange={(e) => updateDropSet(exercise.id, set.id, di, { reps: parseInt(e.target.value) || 0 })}
                      className="w-10 h-7 bg-bg-secondary rounded-button text-center font-mono text-xs text-text-primary border border-border/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={() => removeDropSet(exercise.id, set.id, di)}
                      className="w-5 h-5 flex items-center justify-center text-text-secondary hover:text-auxiliary"
                      aria-label="刪除遞減組"
                    >
                      <Trash2 size={11} />
                    </button>
                    {di < (set.drops ?? []).length - 1 && (
                      <span className="text-[10px] text-text-secondary font-mono">→</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 新增組 / 新增遞減組（遞減組掛在最後一組底下） */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          onClick={() => addSet(exercise.id)}
          className="py-2 text-xs uppercase tracking-wider text-text-secondary hover:text-accent border border-dashed border-border rounded-button transition-colors"
        >
          + 新增組
        </button>
        <button
          onClick={() => {
            const lastSet = exercise.sets[exercise.sets.length - 1];
            if (lastSet) addDropSet(exercise.id, lastSet.id);
          }}
          disabled={exercise.sets.length === 0}
          className="py-2 text-xs uppercase tracking-wider text-text-secondary hover:text-accent border border-dashed border-border rounded-button transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + 新增遞減組
        </button>
      </div>
    </Card>
  );
}

interface NumberInputProps {
  value: number;
  step?: number;
  onChange: (v: number) => void;
  onIncrease: () => void;
  onDecrease: () => void;
}

function NumberInput({ value, onChange, onIncrease, onDecrease }: NumberInputProps) {
  return (
    <div className="flex items-center bg-bg-secondary rounded-button overflow-hidden">
      <button
        onClick={onDecrease}
        className="w-8 h-10 flex items-center justify-center text-text-secondary hover:text-accent flex-shrink-0"
      >
        <Minus size={14} />
      </button>
      <input
        type="number"
        value={value === 0 ? '' : value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          onChange(isNaN(v) ? 0 : v);
        }}
        className="w-full h-10 bg-transparent text-center font-mono text-sm text-text-primary tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        inputMode="decimal"
      />
      <button
        onClick={onIncrease}
        className="w-8 h-10 flex items-center justify-center text-text-secondary hover:text-accent flex-shrink-0"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
