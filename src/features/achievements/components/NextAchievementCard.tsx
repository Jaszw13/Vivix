/**
 * NextAchievementCard — Hero 進度卡
 * 永遠顯示「下一個最近成就」+ 進度條 + % + Partner 小反應
 */
import { memo } from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { TIER_COLORS, TRACK_LABELS, type AchievementDef } from '@/data/achievements';
import { cn } from '@/lib/utils';

interface Props {
  def: AchievementDef;
  ratio: number; // 0-1
  current: number;
  onTap?: () => void;
}

function NextAchievementCardImpl({ def, ratio, current, onTap }: Props) {
  const tier = TIER_COLORS[def.tier];
  const pct = Math.round(ratio * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
    >
      <Card
        className="relative overflow-hidden p-5 border-accent/30 cursor-pointer"
        onClick={onTap}
      >
        {/* 背景光暈 — 金色漸層 */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/12 via-transparent to-auxiliary/8 pointer-events-none" />
        <div
          className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ backgroundColor: tier.color }}
        />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Target size={14} className="text-accent" />
            <span className="text-[10px] uppercase tracking-widest text-accent font-bold">
              下一個最近成就
            </span>
          </div>

          <div className="flex items-end justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
                >
                  {tier.label}
                </span>
                <span className="text-[10px] text-text-secondary uppercase tracking-wider">
                  {TRACK_LABELS[def.track]}
                </span>
              </div>
              <h2 className="font-display text-2xl tracking-wide uppercase text-text-primary leading-tight">
                {def.title}
              </h2>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-mono text-3xl font-bold text-accent tabular-nums leading-none">
                {pct}
                <span className="text-base text-text-secondary">%</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed mb-3 line-clamp-2">
            {def.copy}
          </p>

          {/* 進度條 — 金色漸層 */}
          <div className="h-2 w-full bg-bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full relative"
              style={{
                background: `linear-gradient(90deg, ${tier.color}, var(--accent))`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
            </motion.div>
          </div>

          {def.partnerReward && (
            <p className="mt-2.5 text-[10px] text-text-secondary/80 leading-snug">
              解鎖後 Partner 獲得新配件
            </p>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

export const NextAchievementCard = memo(NextAchievementCardImpl);
