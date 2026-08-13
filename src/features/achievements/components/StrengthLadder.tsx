/**
 * StrengthLadder — 力量門檻軌專用視圖
 * 4 張卡（bench/squat/deadlift/ohp），每卡 5 節點里程碑橫軸（plate 梯）
 * 當前位置標記，下一目標金色高亮；點節點開 DetailSheet
 */
import { memo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import {
  TIER_COLORS,
  type AchievementDef,
  type LiftFamily,
} from '@/data/achievements';
import type { AchievementProgress } from '@/store/achievementsStore';
import { cn } from '@/lib/utils';

interface Props {
  family: LiftFamily;
  label: string;
  tiers: AchievementDef[]; // 已按 tier 排序
  progress: Record<string, AchievementProgress>;
  onNodeTap?: (def: AchievementDef) => void;
}

function StrengthLadderImpl({ family, label, tiers, progress, onNodeTap }: Props) {
  // 找到當前最高已解鎖 tier 與下一個未解鎖
  let highestUnlockedTier = 0;
  let nextTarget: AchievementDef | null = null;
  for (const def of tiers) {
    const p = progress[def.id];
    if (p?.unlocked) {
      if (def.tier > highestUnlockedTier) highestUnlockedTier = def.tier;
    } else if (!nextTarget) {
      nextTarget = def;
    }
  }

  return (
    <Card className="relative overflow-hidden p-4">
      {/* 家族標題 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-xl tracking-wide uppercase text-text-primary">
            {label}
          </h3>
          {nextTarget ? (
            <p className="text-[10px] text-text-secondary mt-0.5">
              下一目標：{nextTarget.title}
            </p>
          ) : (
            <p className="text-[10px] text-accent font-bold mt-0.5">
              已登頂
            </p>
          )}
        </div>
        {highestUnlockedTier > 0 && (
          <span className="font-mono text-xs text-text-secondary tabular-nums">
            T{highestUnlockedTier}/5
          </span>
        )}
      </div>

      {/* 5 節點里程碑橫軸 */}
      <div className="relative">
        {/* 連接線 */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-border/40" />
        <motion.div
          className="absolute top-5 left-5 h-0.5 bg-gradient-to-r from-accent to-accent/40"
          initial={{ width: 0 }}
          animate={{
            width: `calc((100% - 40px) * ${highestUnlockedTier / 5})`,
          }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />

        <div className="relative flex justify-between items-start">
          {tiers.map((def) => {
            const p = progress[def.id] ?? { unlocked: false, current: 0 };
            const unlocked = p.unlocked;
            const isNext = nextTarget?.id === def.id;
            const tier = TIER_COLORS[def.tier];
            return (
              <button
                key={def.id}
                onClick={() => onNodeTap?.(def)}
                className="flex flex-col items-center gap-1.5 group min-w-[44px] min-h-[44px] justify-start pt-0"
              >
                {/* 節點圓 */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all relative z-10',
                    unlocked && 'border-transparent',
                    !unlocked && isNext && 'border-accent',
                    !unlocked && !isNext && 'border-border/50',
                  )}
                  style={unlocked ? {
                    backgroundColor: tier.color,
                    boxShadow: `0 0 12px ${tier.color}80`,
                  } : isNext ? {
                    backgroundColor: 'var(--accent-soft)',
                  } : {
                    backgroundColor: 'var(--bg-secondary)',
                  }}
                >
                  <span
                    className={cn(
                      'font-display text-sm font-bold',
                      unlocked ? 'text-bg-primary' : 'text-text-secondary',
                    )}
                  >
                    {def.tier}
                  </span>
                  {isNext && (
                    <motion.div
                      className="absolute -inset-1 rounded-full border-2 border-accent"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </div>
                {/* 門檻標籤 */}
                <span className="font-mono text-[9px] text-text-secondary tabular-nums text-center leading-tight">
                  {def.metric === 'est1RM_bw'
                    ? `${def.threshold}×BW`
                    : `${def.threshold}kg`}
                </span>
                <span className={cn(
                  'text-[9px] leading-tight text-center max-w-[52px] truncate',
                  unlocked ? 'text-text-primary font-bold' : 'text-text-secondary/70',
                )}>
                  {def.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

export const StrengthLadder = memo(StrengthLadderImpl);
