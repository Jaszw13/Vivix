import { exercises } from '@/data/exercises';
import type { AvoidEntry } from '@/domain/coach/types';
import { MUSCLE_GROUP_OPTIONS, type MuscleGroup } from '@/types';
import { cn } from '@/lib/utils';

const MINUTE_OPTIONS = [30, 45, 60, 75, 90];

/**
 * 每次時長與少練偏好。空的少練清單是有效答案。
 * 文案只當偏好，不當醫療評估。
 */
export function TrainingPreferences({
  sessionMinutes,
  onSessionMinutes,
  avoidList,
  onToggleRegion,
  onToggleExercise,
}: {
  sessionMinutes: number;
  onSessionMinutes: (minutes: number) => void;
  avoidList: AvoidEntry[];
  onToggleRegion: (region: MuscleGroup) => void;
  onToggleExercise: (exerciseId: string) => void;
}) {
  const avoidedRegions = new Set(
    avoidList.filter((item) => item.kind === 'region').map((item) => item.region),
  );
  const avoidedExercises = avoidList.filter((item) => item.kind === 'exercise');

  return (
    <div className="mt-5 space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-2">
          一次大概練多久
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {MINUTE_OPTIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => onSessionMinutes(minutes)}
              className={cn(
                'h-10 rounded-button border text-[11px] font-bold',
                sessionMinutes === minutes
                  ? 'bg-accent text-bg-primary border-accent'
                  : 'bg-bg-card text-text-secondary border-border/60',
              )}
            >
              {minutes} 分
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-1">
          想暫時少練的部位
        </div>
        <p className="text-[11px] text-text-secondary leading-snug mb-2">
          可以留空。這只是你自己的偏好，不是醫療評估，也不會判斷傷患。
        </p>
        <div className="flex flex-wrap gap-1.5">
          {MUSCLE_GROUP_OPTIONS.map((option) => {
            const on = avoidedRegions.has(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onToggleRegion(option.value)}
                className={cn(
                  'h-8 px-2.5 rounded-button border text-[11px] font-bold',
                  on
                    ? 'bg-accent text-bg-primary border-accent'
                    : 'bg-bg-card text-text-secondary border-border/60',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-1">
          想暫時少做的動作
        </div>
        <select
          className="w-full h-11 px-3 bg-bg-card rounded-button border border-border text-sm text-text-primary"
          value=""
          onChange={(event) => {
            if (event.target.value) onToggleExercise(event.target.value);
          }}
        >
          <option value="">加入一個動作（可留空）</option>
          {MUSCLE_GROUP_OPTIONS.map((group) => (
            <optgroup key={group.value} label={group.label}>
              {exercises
                .filter((exercise) => exercise.muscleGroup === group.value)
                .map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        {avoidedExercises.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {avoidedExercises.map((item) => {
              if (item.kind !== 'exercise') return null;
              const name = exercises.find((exercise) => exercise.id === item.exerciseId)?.name ?? item.exerciseId;
              return (
                <button
                  key={item.exerciseId}
                  type="button"
                  onClick={() => onToggleExercise(item.exerciseId)}
                  className="h-8 px-2.5 rounded-button border border-accent/40 text-[11px] font-bold text-accent"
                >
                  {name} ×
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
