import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Flame, Check, Sparkles, Star } from 'lucide-react';
import type { WorkoutSession } from '@/types';
import { estimate1RM, formatDateFull } from '@/utils/workout';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageShell } from '@/components/layout/PageShell';
import { useWorkoutStore } from '@/store/workoutStore';
import { usePartnerStore } from '@/features/partner/stores/partnerStore';
import { useFeatureFlags } from '@/features/partner/stores/featureFlags';
import { settleAll } from '@/features/stats/settleAll';
import { PARTNER_FORMS } from '@/features/partner/data/forms';
import { COSMETIC_MAP } from '@/features/partner/data/cosmetics';
import type { RewardResult } from '@/features/partner/types';
import { PartnerLevelUpModal } from '@/features/partner/components/PartnerLevelUpModal';

interface SummaryLocationState {
  session: WorkoutSession;
}

export default function WorkoutSummary() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = (location.state as SummaryLocationState | null)?.session;

  // Partner 獎勵：僅在 mount 時計算一次（ref 防重 + 引擎每日上限雙重冪等）
  const partnerEnabled = useFeatureFlags((s) => s.partnerEnabled);
  const partnerName = usePartnerStore((s) => s.name);
  const nextMilestone = usePartnerStore((s) => s.getNextMilestone());
  const [reward, setReward] = useState<RewardResult | null>(null);
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const rewardComputedRef = useRef(false);

  useEffect(() => {
    if (rewardComputedRef.current) return;
    if (!session) return;
    const flags = useFeatureFlags.getState();
    const partner = usePartnerStore.getState();
    if (!flags.partnerEnabled || !partner.name) return;
    rewardComputedRef.current = true;

    const completedSets = session.exercises.reduce(
      (s, e) => s + e.sets.filter((set) => set.completed).length,
      0
    );
    const plannedSets = session.exercises.reduce((s, e) => s + e.sets.length, 0);
    const personalRecords = useWorkoutStore.getState().personalRecords;
    const hasPR = personalRecords.some((pr) => pr.date === session.date);

    // C5：統一透過 settleAll 編排（partner + achievements + quests + telemetry）
    const settleResult = settleAll({
      date: session.date,
      completedSets,
      plannedSets,
      hasPR,
      durationSeconds: session.duration,
      warmupCompleted: session.warmupCompletedIds.length > 0,
    });
    const result = settleResult.partnerReward;
    if (result) {
      setReward(result);
      // 升級時延遲彈出 LevelUpModal，等用戶先看到獎勵卡
      if (result.leveledUp) {
        const t = window.setTimeout(() => setLevelUpVisible(true), 900);
        return () => window.clearTimeout(t);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!session) {
    return (
      <PageShell title="訓練總結" showBack showNav={false}>
        <div className="text-center text-text-secondary mt-20">
          找不到訓練記錄
        </div>
      </PageShell>
    );
  }

  const totalVolume = session.totalVolume;
  const totalSets = session.exercises.reduce((s, e) => s + e.sets.filter((set) => set.completed).length, 0);
  const topLifts = session.exercises
    .flatMap((ex) =>
      ex.sets
        .filter((s) => s.completed)
        .map((s) => ({
          name: ex.name,
          weight: s.weight,
          reps: s.reps,
          e1rm: estimate1RM(s.weight, s.reps),
        }))
    )
    .sort((a, b) => b.e1rm - a.e1rm)
    .slice(0, 3);

  return (
    <PageShell title="訓練完成" showNav={false} noPadding>
      {/* 大標 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="px-4 pt-10 pb-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent flex items-center justify-center"
        >
          <Check size={32} className="text-bg-primary" strokeWidth={3} />
        </motion.div>
        <div className="text-[10px] uppercase tracking-widest text-text-secondary">
          {formatDateFull(session.date)}
        </div>
        <h1 className="font-display text-5xl tracking-wide uppercase text-text-primary mt-1">
          訓練完成
        </h1>
        <p className="text-sm text-text-secondary mt-2">
          {session.dayName ?? session.planName ?? '自由訓練'}
        </p>
      </motion.div>

      <div className="px-4 pb-8 flex-1">
        {/* 三大指標 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <Card className="p-4 text-center">
            <Flame size={18} className="mx-auto text-auxiliary mb-2" />
            <div className="font-mono text-2xl font-bold text-text-primary">
              {(totalVolume / 1000).toFixed(1)}
            </div>
            <div className="text-[9px] uppercase tracking-widest text-text-secondary mt-1">
              噸數 t
            </div>
          </Card>
          <Card className="p-4 text-center">
            <Check size={18} className="mx-auto text-accent mb-2" />
            <div className="font-mono text-2xl font-bold text-text-primary">
              {totalSets}
            </div>
            <div className="text-[9px] uppercase tracking-widest text-text-secondary mt-1">
              完成組數
            </div>
          </Card>
          <Card className="p-4 text-center">
            <TrendingUp size={18} className="mx-auto text-accent mb-2" />
            <div className="font-mono text-2xl font-bold text-text-primary">
              {session.exercises.length}
            </div>
            <div className="text-[9px] uppercase tracking-widest text-text-secondary mt-1">
              動作數
            </div>
          </Card>
        </motion.div>

        {/* 最佳舉起 */}
        {topLifts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <SectionHeader title="最佳表現" subtitle="估算 1RM 排行" />
            <div className="flex flex-col gap-2">
              {topLifts.map((lift, i) => (
                <Card key={i} className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-auxiliary/15 flex items-center justify-center font-mono font-bold text-auxiliary">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-text-primary">{lift.name}</div>
                    <div className="font-mono text-xs text-text-secondary">
                      {lift.weight} kg × {lift.reps} reps
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg font-bold text-accent">
                      {lift.e1rm}
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-text-secondary">
                      1RM kg
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* 動作摘要 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
        >
          <SectionHeader title="動作摘要" />
          <Card className="divide-y divide-border/40">
            {session.exercises.map((ex) => {
              const completed = ex.sets.filter((s) => s.completed);
              const max = completed.reduce(
                (m, s) => (s.weight > m.weight ? s : m),
                completed[0] ?? { weight: 0, reps: 0 }
              );
              const volume = completed.reduce((s, set) => s + set.weight * set.reps, 0);
              return (
                <div key={ex.id} className="p-3 flex items-center gap-3">
                  <Trophy size={14} className="text-text-secondary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text-primary truncate">{ex.name}</div>
                    <div className="font-mono text-[10px] text-text-secondary">
                      {completed.length} 組 · 最高 {max.weight}kg
                    </div>
                  </div>
                  <div className="font-mono text-xs text-accent">
                    {volume} kg
                  </div>
                </div>
              );
            })}
          </Card>
        </motion.div>

        {/* Partner 獎勵 */}
        {partnerEnabled && partnerName && reward && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mt-6"
          >
            <SectionHeader title="Partner 獎勵" />
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles size={18} className="text-accent" />
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-text-secondary">
                    Partner 獲得
                  </div>
                  <div className="font-mono text-2xl font-bold text-accent">
                    {reward.xpGained} XP
                  </div>
                </div>
              </div>

              {reward.leveledUp && (
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', delay: 0.25 }}
                  className="flex items-center gap-2 mb-3 px-3 py-2 rounded bg-accent/15"
                >
                  <Star size={16} className="text-accent" />
                  <span className="text-sm font-bold text-accent">
                    Partner 升到 Lv.{reward.newLevel}！
                  </span>
                </motion.div>
              )}

              {reward.newFormId && (
                <div className="text-sm text-text-primary mb-3">
                  Partner 進入「
                  {PARTNER_FORMS.find((f) => f.id === reward.newFormId)?.name ?? reward.newFormId}
                  」形態！
                </div>
              )}

              {reward.newCosmeticIds.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-1">
                    解鎖配件
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {reward.newCosmeticIds.map((id) => (
                      <span
                        key={id}
                        className="px-2 py-1 rounded bg-auxiliary/15 text-xs text-auxiliary"
                      >
                        {COSMETIC_MAP[id]?.name ?? id}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {nextMilestone && (
                <div className="text-xs text-text-secondary pt-2 border-t border-border/40">
                  {nextMilestone}
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </div>

      <div className="sticky bottom-0 px-4 pt-4 pb-4 bg-gradient-to-t from-bg-primary via-bg-primary to-transparent">
        <Button fullWidth size="lg" onClick={() => navigate('/')}>
          返回主控台
        </Button>
      </div>

      {/* Partner 升級慶祝 Modal（§15：level change 動畫反饋） */}
      <PartnerLevelUpModal
        result={
          levelUpVisible && reward?.leveledUp
            ? { newLevel: reward.newLevel, partnerName }
            : null
        }
        onDismiss={() => setLevelUpVisible(false)}
      />
    </PageShell>
  );
}
