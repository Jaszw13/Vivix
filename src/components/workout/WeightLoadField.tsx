import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SetLoadMode } from '@/types';

interface WeightLoadFieldProps {
  weight: number;
  /** 只有「新增自重組」產生的組會是 bw。這裡不負責切換。 */
  load?: SetLoadMode;
  step?: number;
  size?: 'sm' | 'md' | 'lg';
  onWeight: (weight: number) => void;
}

/**
 * 公斤組就是數字。自重組的數字是額外公斤：0 顯示 BW，有鐵鍊顯示 BW+n。
 */
export function WeightLoadField({
  weight,
  load = 'kg',
  step = 2.5,
  size = 'md',
  onWeight,
}: WeightLoadFieldProps) {
  const bodyweight = load === 'bw';
  const pure = bodyweight && !(weight > 0);
  const metrics = {
    sm: { box: 'h-9', step: 'w-7', text: 'text-xs', unit: 'text-[10px]' },
    md: { box: 'h-10', step: 'w-8', text: 'text-sm', unit: 'text-[10px]' },
    lg: { box: 'h-12', step: 'w-10', text: 'text-lg', unit: 'text-xs' },
  }[size];

  const changeWeight = (next: number) => {
    if (!Number.isFinite(next)) {
      onWeight(0);
      return;
    }
    onWeight(Math.max(0, Math.round(next * 10) / 10));
  };

  return (
    <div className={cn('flex items-center bg-bg-secondary rounded-button overflow-hidden', metrics.box)}>
      <button
        type="button"
        onClick={() => changeWeight(weight - step)}
        className={cn(metrics.step, 'h-full flex items-center justify-center text-text-secondary hover:text-accent flex-shrink-0')}
        aria-label={bodyweight ? '減少額外公斤' : '減少重量'}
      >
        <Minus size={size === 'lg' ? 16 : 14} />
      </button>

      {pure ? (
        <div
          className={cn('flex-1 text-center font-mono font-bold text-accent', metrics.text)}
          aria-label="自重，額外公斤為 0"
        >
          BW
        </div>
      ) : (
        <div className="flex flex-1 min-w-0 items-center h-full">
          {bodyweight && (
            <span className={cn('pl-1 flex-shrink-0 font-mono font-bold text-accent', metrics.unit)}>
              BW+
            </span>
          )}
          <input
            type="number"
            value={weight === 0 ? '' : weight}
            onChange={(event) => {
              const next = parseFloat(event.target.value);
              changeWeight(Number.isNaN(next) ? 0 : next);
            }}
            inputMode="decimal"
            aria-label={bodyweight ? '額外公斤' : '重量公斤'}
            className={cn(
              'w-0 min-w-0 flex-1 h-full bg-transparent text-center font-mono text-text-primary tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
              metrics.text,
            )}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => changeWeight(weight + step)}
        className={cn(metrics.step, 'h-full flex items-center justify-center text-text-secondary hover:text-accent flex-shrink-0')}
        aria-label={bodyweight ? '增加額外公斤' : '增加重量'}
      >
        <Plus size={size === 'lg' ? 16 : 14} />
      </button>
    </div>
  );
}
