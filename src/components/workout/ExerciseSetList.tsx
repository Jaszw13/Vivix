import { useState, useMemo } from 'react';
import { Check, Minus, Plus, Trash2, History, Repeat, ChevronUp, ChevronDown } from 'lucide-react';
import type { ExerciseLog, SetLog } from '@/types';
import { useWorkoutStore } from '@/store/workoutStore';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface SetRowProps {
  exercise: ExerciseLog;
  /** 動作在本次訓練中的位置（用於上／下移） */
  index: number;
  total: number;
  onSetCompleted?: () => void;
  onSubstitute?: () => void;
}

export function ExerciseSetList({ exercise, index, total, onSetCompleted, onSubstitute }: SetRowProps) {
  const {
    updateSet, addSet, removeSet, toggleSetCompleted, removeExercise,
    getLastSetsForExercise, addDropSet, updateDropSet, removeDropSet, moveExercise,
  } = useWorkoutStore();
  const [recentPRSetIds, setRecentPRSetIds] = useState<string[]>([]);

  const lastSets = getLastSetsForExercise(exercise.exerciseId);

  /**
   * 新紀錄定義（只與「上一次訓練」比較）：
   * - 重量增加 → 新紀錄
   * - 重量持平但次數增加 → 新紀錄
   * - 重量下降 → 不算（即使總容量或 1RM 估算更高）
   * 首次做該動作沒有比較基準，不觸發慶祝。
   */
  const checkPRBreakthrough = (set: SetLog): boolean => {
    if (set.reps <= 0) return false;
    const prev = (lastSets ?? []).filter((s) => s.completed);
    if (prev.length === 0) return false;

    if (set.weight > 0) {
      const prevWeighted = prev.filter((s) => s.weight > 0);
      if (prevWeighted.length === 0) return false;
      const prevMaxWeight = Math.max(...prevWeighted.map((s) => s.weight));
      // 重量增加
      if (set.weight > prevMaxWeight) return true;
      // 重量持平但次數增加
      if (set.weight === prevMaxWeight) {
        const prevMaxReps = Math.max(
          ...prevWeighted.filter((s) => s.weight === prevMaxWeight).map((s) => s.reps),
        );
        return set.reps > prevMaxReps;
      }
      return false;
    }

    // 徒手：比較次數
    const prevBodyweight = prev.filter((s) => s.weight === 0);
    if (prevBodyweight.length === 0) return false;
    return set.reps > Math.max(...prevBodyweight.map((s) => s.reps));
  };

  const flashPRCelebration = (setId: string) => {
    setRecentPRSetIds((prev) => [...prev, setId]);
    setTimeout(() => {
      setRecentPRSetIds((prev) => prev.filter((id) => id !== setId));
    }, 1500);
  };

  const completedCount = exercise.sets.filter((s) => s.completed).length;
  const totalVolume = exercise.sets
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + s.weight * s.reps + (s.drops ?? []).reduce((d, x) => d + x.weight * x.reps, 0), 0);

  const lastSet = exercise.sets[exercise.sets.length - 1];
  const canDeleteSet = exercise.sets.length > 1;

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
            {totalVolume > 0 && (
              <span className="font-mono text-[10px] text-accent">
                {totalVolume} kg
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* 動作排序：順序影響疲勞累積，讓「上次訓練」比較維持同一前提 */}
          <button
            onClick={() => moveExercise(exercise.id, 'up')}
            disabled={index === 0}
            className="w-7 h-8 flex items-center justify-center text-text-secondary hover:text-accent disabled:opacity-25 transition-colors"
            aria-label="動作上移"
            title="上移"
          >
            <ChevronUp size={16} />
          </button>
          <button
            onClick={() => moveExercise(exercise.id, 'down')}
            disabled={index === total - 1}
            className="w-7 h-8 flex items-center justify-center text-text-secondary hover:text-accent disabled:opacity-25 transition-colors"
            aria-label="動作下移"
            title="下移"
          >
            <ChevronDown size={16} />
          </button>
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
      <div className="grid grid-cols-[1.75rem_1fr_1fr_2.5rem_1.75rem] gap-1.5 px-1 mb-2 text-[9px] uppercase tracking-widest text-text-secondary">
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
                'grid grid-cols-[1.75rem_1fr_1fr_2.5rem_1.75rem] gap-1.5 items-center transition-colors relative',
                set.completed && 'opacity-60'
              )}
            >
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
              <button
                onClick={() => {
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
              {/* 刪除這一組（至少保留 1 組） */}
              {canDeleteSet ? (
                <button
                  onClick={() => removeSet(exercise.id, set.id)}
                  className="w-7 h-8 flex items-center justify-center text-text-secondary hover:text-auxiliary transition-colors"
                  aria-label={`刪除第 ${set.setNumber} 組`}
                  title="刪除這一組"
                >
                  <Trash2 size={13} />
                </button>
              ) : (
                <span />
              )}
            </div>

            {/* 遞減組（附屬於上一組，只在有資料時顯示） */}
            {(set.drops ?? []).map((drop, di) => (
              <div
                key={di}
                className="mt-1 grid grid-cols-[1.75rem_1fr_1fr_2.5rem_1.75rem] gap-1.5 items-center"
              >
                <div className="text-center">
                  <span className="text-[10px] text-accent font-mono">↳</span>
                </div>
                <NumberInput
                  value={drop.weight}
                  onDecrease={() =>
                    updateDropSet(exercise.id, set.id, di, { weight: Math.max(0, drop.weight - 2.5) })
                  }
                  onIncrease={() =>
                    updateDropSet(exercise.id, set.id, di, { weight: drop.weight + 2.5 })
                  }
                  onChange={(v) => updateDropSet(exercise.id, set.id, di, { weight: v })}
                />
                <NumberInput
                  value={drop.reps}
                  step={1}
                  onDecrease={() =>
                    updateDropSet(exercise.id, set.id, di, { reps: Math.max(0, drop.reps - 1) })
                  }
                  onIncrease={() =>
                    updateDropSet(exercise.id, set.id, di, { reps: drop.reps + 1 })
                  }
                  onChange={(v) => updateDropSet(exercise.id, set.id, di, { reps: v })}
                />
                <div className="text-center text-[9px] uppercase tracking-wider text-accent">
                  遞減
                </div>
                <button
                  onClick={() => removeDropSet(exercise.id, set.id, di)}
                  className="w-7 h-8 flex items-center justify-center text-text-secondary hover:text-auxiliary transition-colors"
                  aria-label="刪除遞減組"
                  title="刪除遞減組"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* 新增列：一般組 / 遞減組 */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => addSet(exercise.id)}
          className="flex-1 py-2 text-xs uppercase tracking-wider text-text-secondary hover:text-accent border border-dashed border-border rounded-button transition-colors"
        >
          + 新增組
        </button>
        <button
          onClick={() => lastSet && addDropSet(exercise.id, lastSet.id)}
          className="px-3 py-2 text-xs uppercase tracking-wider text-accent/80 hover:text-accent border border-dashed border-accent/40 rounded-button transition-colors whitespace-nowrap"
          title="在最後一組下面加一組遞減"
        >
          + 遞減組
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
