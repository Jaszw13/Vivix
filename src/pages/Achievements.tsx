import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, SectionHeader, StatTile, Badge } from '@/components/ui/Card';
import { useWorkoutStore } from '@/store/workoutStore';
import {
  useAchievementsStore,
  SORTED_ACHIEVEMENTS,
  TIER_STYLES,
  type AchievementTier,
} from '@/store/achievementsStore';
import { cn } from '@/lib/utils';

export default function Achievements() {
  const { sessions, personalRecords, getTotalSessions, getTotalVolume, getStreakDays } =
    useWorkoutStore();
  const progress = useAchievementsStore((s) => s.progress);

  const totalSessions = getTotalSessions();
  const totalVolume = getTotalVolume();
  const streak = getStreakDays();

  const varietySize = useMemo(() => {
    const ids = new Set<string>();
    for (const s of sessions) for (const ex of s.exercises) ids.add(ex.exerciseId);
    return ids.size;
  }, [sessions]);

  const unlockedCount = SORTED_ACHIEVEMENTS.filter(
    (a) => progress[a.id]?.unlocked
  ).length;

  const progressByTier = useMemo(() => {
    const res: Record<AchievementTier, { done: number; total: number }> = {
      bronze: { done: 0, total: 0 },
      silver: { done: 0, total: 0 },
      gold: { done: 0, total: 0 },
    };
    for (const a of SORTED_ACHIEVEMENTS) {
      res[a.tier].total += 1;
      if (progress[a.id]?.unlocked) res[a.tier].done += 1;
    }
    return res;
  }, [progress]);

  const unlockRate =
    SORTED_ACHIEVEMENTS.length === 0
      ? 0
      : Math.round((unlockedCount / SORTED_ACHIEVEMENTS.length) * 100);

  return (
    <PageShell title="成就牆" showBack>
      {/* 總覽 */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="relative overflow-hidden p-5 border-accent/30">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/12 via-transparent to-auxiliary/10 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-text-secondary">
                  成就總覽
                </p>
                <h2 className="font-display text-3xl tracking-wide uppercase text-text-primary mt-1">
                  {unlockedCount}
                  <span className="text-lg ml-1 text-text-secondary">
                    / {SORTED_ACHIEVEMENTS.length}
                  </span>
                </h2>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-accent text-bg-primary flex items-center justify-center font-display text-2xl tracking-wider shadow-lg">
                {unlockRate}%
              </div>
            </div>
            <div className="h-1.5 w-full bg-border/60 rounded-full overflow-hidden mt-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${unlockRate}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-accent via-accent to-auxiliary"
              />
            </div>
            <div className="grid grid-cols-3 divide-x divide-border/40 mt-5">
              <StatTile
                label="銅牌"
                value={`${progressByTier.bronze.done}/${progressByTier.bronze.total}`}
              />
              <StatTile
                label="銀牌"
                value={`${progressByTier.silver.done}/${progressByTier.silver.total}`}
              />
              <StatTile
                label="金牌"
                value={`${progressByTier.gold.done}/${progressByTier.gold.total}`}
              />
            </div>
          </div>
        </Card>
      </motion.section>

      {/* 當前進度指標 */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="mb-6"
      >
        <SectionHeader title="目前進度" subtitle="解鎖成就所需數值" />
        <Card className="grid grid-cols-2 divide-y divide-x divide-border/40 overflow-hidden">
          <StatTile label="訓練次數" value={totalSessions} />
          <StatTile label="連續天數" value={streak} unit="天" highlight={streak >= 3} />
          <StatTile label="總噸數" value={totalVolume} unit="t" />
          <StatTile label="PR 數量" value={personalRecords.length} />
          <div className="col-span-2 py-3 flex flex-col items-center justify-center">
            <div className="font-mono text-2xl text-text-primary">
              {varietySize}
              <span className="text-xs ml-1 text-text-secondary">種不同動作</span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-text-secondary mt-1.5">
              動作多樣性
            </div>
          </div>
        </Card>
      </motion.section>

      {/* 成就列表 */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <SectionHeader
          title="所有成就"
          subtitle="按銅 → 銀 → 金排序"
        />
        <div className="flex flex-col gap-3">
          {SORTED_ACHIEVEMENTS.map((a, i) => {
            const p = progress[a.id] ?? { unlocked: false, current: 0 };
            const style = TIER_STYLES[a.tier];
            const ratio = Math.min(1, p.current / Math.max(1, a.threshold));
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.02 * i }}
              >
                <Card
                  className={cn(
                    'relative overflow-hidden p-4 border',
                    p.unlocked
                      ? 'border-accent/30 bg-gradient-to-br from-bg-card to-accent/5'
                      : 'border-border/50 bg-bg-card'
                  )}
                >
                  {p.unlocked && (
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${style.ring} opacity-30 pointer-events-none blur-3xl`}
                    />
                  )}
                  <div className="relative flex items-start gap-4">
                    <div
                      className={cn(
                        'w-14 h-14 flex-shrink-0 rounded-2xl flex items-center justify-center border',
                        p.unlocked
                          ? 'bg-bg-card border-accent/40'
                          : 'bg-bg-secondary border-border/40 grayscale opacity-70'
                      )}
                    >
                      {p.unlocked ? (
                        <span className="text-3xl leading-none">{a.icon}</span>
                      ) : (
                        <Lock size={20} className="text-text-secondary/60" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="default"
                          className={cn('border', style.badge)}
                        >
                          {style.title}牌
                        </Badge>
                        <h3 className="font-bold text-sm text-text-primary">
                          {a.title}
                        </h3>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {a.description}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-border/60 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round(ratio * 100)}%` }}
                            transition={{ duration: 0.5, delay: 0.1 + i * 0.02 }}
                            className={cn(
                              'h-full rounded-full',
                              p.unlocked
                                ? 'bg-gradient-to-r from-accent to-auxiliary'
                                : 'bg-text-secondary/40'
                            )}
                          />
                        </div>
                        <div className="font-mono text-[11px] text-text-secondary tabular-nums">
                          {p.current}/{a.threshold}
                        </div>
                      </div>
                      {p.unlocked && p.unlockedAt && (
                        <p className="mt-2 text-[10px] uppercase tracking-widest text-accent font-bold">
                          解鎖於 {new Date(p.unlockedAt).toLocaleDateString('zh-TW')}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.section>
    </PageShell>
  );
}

// 避免 TS unused 警告（TIER_STYLES 上面已透過 import 使用，這裡只是確保 export 的類別一致）
void TIER_STYLES;
