/**
 * AchievementBadge — 單一成就卡片
 * 解鎖：實心 tier 色徽章 + 解鎖日期 + 數字摘要
 * 挑戰：虛線邊框 + 「挑戰」tag + 進度%（不灰階、不羞辱）
 */
import { memo } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Card, Badge } from '@/components/ui/Card';
import { TIER_COLORS, type AchievementDef } from '@/data/achievements';
import type { AchievementProgress } from '@/store/achievementsStore';
import { cn } from '@/lib/utils';
import { formatUnlockDate } from '@/utils/format';

interface Props {
  def: AchievementDef;
  progress: AchievementProgress;
  formattedCopy?: string;
  index?: number;
  onTap?: (def: AchievementDef) => void;
}

function AchievementBadgeImpl({ def, progress, formattedCopy, index = 0, onTap }: Props) {
  const tier = TIER_COLORS[def.tier];
  const ratio = Math.min(1, progress.current / Math.max(1, def.threshold));
  const pct = Math.round(ratio * 100);
  const unlocked = progress.unlocked;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
    >
      <Card
        className={cn(
          'relative overflow-hidden p-4 border min-h-[44px] transition-colors',
          unlocked
            ? 'border-transparent'
            : 'border-dashed border-border/60',
        )}
        onClick={() => onTap?.(def)}
      >
        {/* 解鎖光暈 */}
        {unlocked && (
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ background: `radial-gradient(circle at 30% 20%, ${tier.color}, transparent 70%)` }}
          />
        )}

        <div className="relative flex items-start gap-3">
          {/* 徽章圓圈 */}
          <div
            className={cn(
              'w-12 h-12 flex-shrink-0 rounded-2xl flex items-center justify-center border-2 transition-all',
              unlocked
                ? 'border-transparent'
                : 'border-dashed',
            )}
            style={unlocked ? {
              backgroundColor: `${tier.color}25`,
              borderColor: `${tier.color}80`,
            } : {
              borderColor: 'var(--border-color)',
            }}
          >
            {unlocked ? (
              <Check size={20} strokeWidth={3} style={{ color: tier.color }} />
            ) : (
              <span className="font-display text-lg tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                {tier.label}
              </span>
            )}
          </div>

          {/* 內容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${tier.color}20`,
                  color: tier.color,
                }}
              >
                {tier.label}
              </span>
              {!unlocked && (
                <Badge variant="default" className="border-dashed">挑戰</Badge>
              )}
              <h3 className="font-bold text-sm text-text-primary truncate">
                {def.title}
              </h3>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
              {formattedCopy ?? def.copy}
            </p>

            {/* 進度條 */}
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, delay: 0.1 + index * 0.02 }}
                  className="h-full rounded-full"
                  style={{
                    background: unlocked
                      ? `linear-gradient(90deg, ${tier.color}, var(--accent))`
                      : `linear-gradient(90deg, ${tier.color}80, ${tier.color})`,
                  }}
                />
              </div>
              <span className="font-mono text-[10px] text-text-secondary tabular-nums whitespace-nowrap">
                {formatMetricValue(def, progress.current)} / {formatThreshold(def)}
              </span>
            </div>

            {unlocked && progress.unlockedAt && (
              <p className="mt-2 text-[9px] uppercase tracking-widest font-bold" style={{ color: tier.color }}>
                解鎖於 {formatUnlockDate(progress.unlockedAt)}
              </p>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// 顯示門檻值（體重比顯示 ×，次數顯示整數）
function formatThreshold(def: AchievementDef): string {
  if (def.metric === 'est1RM_bw' || def.metric === 'est1RM_delta') {
    return `${def.threshold}×`;
  }
  if (def.metric === 'group_coverage') {
    return `${def.threshold} 部位`;
  }
  return def.threshold.toString();
}

function formatMetricValue(def: AchievementDef, current: number): string {
  if (def.metric === 'est1RM_bw' || def.metric === 'est1RM_delta') {
    return current > 0 ? `${current.toFixed(2)}×` : '—';
  }
  if (def.metric === 'est1RM_kg') {
    return current > 0 ? `${Math.round(current)}kg` : '0';
  }
  return Math.round(current).toString();
}

export const AchievementBadge = memo(AchievementBadgeImpl);
