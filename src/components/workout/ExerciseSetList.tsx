import { Check, Minus, Plus, Trash2, History } from 'lucide-react';
import type { ExerciseLog, SetLog } from '@/types';
import { useWorkoutStore } from '@/store/workoutStore';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface SetRowProps {
  exercise: ExerciseLog;
  onSetCompleted?: () => void;
}

export function ExerciseSetList({ exercise, onSetCompleted }: SetRowProps) {
  const { updateSet, addSet, removeSet, toggleSetCompleted, removeExercise, getLastSetsForExercise } =
    useWorkoutStore();

  const lastSets = getLastSetsForExercise(exercise.exerciseId);
  const completedCount = exercise.sets.filter((s) => s.completed).length;
  const totalVolume = exercise.sets
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + s.weight * s.reps, 0);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display text-xl tracking-wide uppercase text-text-primary">
            {exercise.name}
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
        <button
          onClick={() => removeExercise(exercise.id)}
          className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-auxiliary transition-colors"
          aria-label="刪除動作"
        >
          <Trash2 size={16} />
        </button>
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
      <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 px-1 mb-2 text-[9px] uppercase tracking-widest text-text-secondary">
        <div className="text-center">#</div>
        <div className="text-center">重量 kg</div>
        <div className="text-center">次數</div>
        <div className="text-center">完成</div>
      </div>

      <div className="flex flex-col gap-2">
        {exercise.sets.map((set) => (
          <div
            key={set.id}
            className={cn(
              'grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 items-center transition-colors',
              set.completed && 'opacity-60'
            )}
          >
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
          </div>
        ))}
      </div>

      <button
        onClick={() => addSet(exercise.id)}
        className="w-full mt-3 py-2 text-xs uppercase tracking-wider text-text-secondary hover:text-accent border border-dashed border-border rounded-button transition-colors"
      >
        + 新增組
      </button>
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
