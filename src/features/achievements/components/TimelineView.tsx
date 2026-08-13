/**
 * TimelineView — 解鎖時間軸視圖
 * 按解鎖日期倒序排列已解鎖成就
 */
import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TIER_COLORS, TRACK_LABELS, ACHIEVEMENTS, type AchievementDef } from '@/data/achievements';
import type { AchievementProgress } from '@/store/achievementsStore';
import { cn } from '@/lib/utils';

interface Props {
  progress: Record<string, AchievementProgress>;
}

function TimelineViewImpl({ progress }: Props) {
  const unlocked = useMemo(() => {
    return ACHIEVEMENTS
      .filter((a) => progress[a.id]?.unlocked && progress[a.id]?.unlockedAt)
      .sort((a, b) => {
        const ta = new Date(progress[a.id]!.unlockedAt!).getTime();
        const tb = new Date(progress[b.id]!.unlockedAt!).getTime();
        return tb - ta; // 最新在前
      });
  }, [progress]);

  if (unlocked.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-text-secondary">
          尚未解鎖任何成就
        </p>
        <p className="text-xs text-text-secondary/60 mt-1">
          完成第一次訓練即可獲得第一個成就
        </p>
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      {/* 垂直線 */}
      <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-border/40" />

      <div className="flex flex-col gap-4">
        {unlocked.map((def, i) => {
          const tier = TIER_COLORS[def.tier];
          const p = progress[def.id]!;
          return (
            <motion.div
              key={def.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="relative"
            >
              {/* 節點 */}
              <div
                className="absolute -left-[18px] top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                style={{
                  backgroundColor: tier.color,
                  borderColor: 'var(--bg-primary)',
                }}
              >
                <span className="text-[8px] font-bold text-bg-primary">{def.tier}</span>
              </div>

              <div className="ml-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
                  >
                    {tier.label}
                  </span>
                  <span className="text-[10px] text-text-secondary uppercase tracking-wider">
                    {TRACK_LABELS[def.track]}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-text-primary">{def.title}</h4>
                <p className="font-mono text-[10px] text-text-secondary tabular-nums mt-0.5">
                  {new Date(p.unlockedAt!).toLocaleDateString('zh-TW')}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export const TimelineView = memo(TimelineViewImpl);
