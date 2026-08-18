import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Cat,
  Dog,
  Flame,
  Sparkles,
  Shirt,
  Check,
  Dumbbell,
  Trophy,
} from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, SectionHeader, StatTile, Badge } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { usePartnerStore } from '../stores/partnerStore';
import { useQuestStore } from '../stores/questStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { useProfileStore, TRAINING_GOAL_LABELS } from '@/store/profileStore';
import { handleQuestClaimed } from '../engine/rewardEngine';
import { QUESTS } from '../data/quests';
import { COSMETICS, COSMETIC_MAP } from '../data/cosmetics';
import { PARTNER_FORMS, getFormForWorkouts } from '../data/forms';
import { getXpProgress, LEVEL_CAP, getLevelForXp } from '../engine/level';
import { QuestList } from './QuestList';
import { CosmeticGrid } from './CosmeticGrid';

const SPECIES_ICON = { cat: Cat, dog: Dog };

export function PartnerPage() {
  // ---- Partner store（細粒度 selector） ----
  const name = usePartnerStore((s) => s.name);
  const species = usePartnerStore((s) => s.species);
  const xp = usePartnerStore((s) => s.xp);
  // C4：level 由 xp 派生（getLevelForXp）
  const level = useMemo(() => getLevelForXp(xp), [xp]);
  // C4：totalWorkouts 由 sessions 派生
  // E15 / I-4：Partner 顯示／形態解鎖／Quest 結算僅計「手動完成」（排除 imported）
  const sessions = useWorkoutStore((s) => s.sessions);
  const nonImportedSessions = useMemo(
    () => sessions.filter((s) => s.imported !== true),
    [sessions]
  );
  const totalWorkouts = nonImportedSessions.length;
  const currentFormId = usePartnerStore((s) => s.currentFormId);
  const unlockedFormIds = usePartnerStore((s) => s.unlockedFormIds);
  const unlockedCosmeticIds = usePartnerStore((s) => s.unlockedCosmeticIds);
  const equippedCosmeticIds = usePartnerStore((s) => s.equippedCosmeticIds);
  const unlockedTitleIds = usePartnerStore((s) => s.unlockedTitleIds);
  const equippedTitleId = usePartnerStore((s) => s.equippedTitleId);
  const equipCosmetic = usePartnerStore((s) => s.equipCosmetic);
  const unequipCosmetic = usePartnerStore((s) => s.unequipCosmetic);
  const equipTitle = usePartnerStore((s) => s.equipTitle);
  const getNextMilestone = usePartnerStore((s) => s.getNextMilestone);

  // ---- Quest / workout / profile ----
  const questProgress = useQuestStore((s) => s.progress);
  const recomputeQuests = useQuestStore((s) => s.recompute);
  const personalRecords = useWorkoutStore((s) => s.personalRecords);
  const getStreakDays = useWorkoutStore((s) => s.getStreakDays);
  const goal = useProfileStore((s) => s.goal);

  const streak = getStreakDays();
  const progress = getXpProgress(xp);
  const milestone = getNextMilestone();
  const isMaxLevel = level >= LEVEL_CAP;
  const pct = Math.round(progress.progress * 100);
  const Icon = SPECIES_ICON[species] ?? Cat;

  const currentForm = useMemo(
    () => getFormForWorkouts(totalWorkouts),
    [totalWorkouts]
  );
  // 確保 currentFormId 仍在表內（防呆）
  const displayForm =
    PARTNER_FORMS.find((f) => f.id === currentFormId) ?? currentForm;

  // 重建 quest context（與 rewardEngine 一致；Partner 語義僅計非 imported）
  const questCtx = useMemo(() => {
    const recentWorkoutDates = nonImportedSessions.map((s) => s.date);
    const warmupCount = nonImportedSessions.filter(
      (s) => (s.warmupCompletedIds?.length ?? 0) > 0
    ).length;
    return {
      totalWorkouts,
      totalPRs: personalRecords.length,
      streakDays: streak,
      warmupCount,
      recentWorkoutDates,
    };
  }, [nonImportedSessions, personalRecords.length, streak, totalWorkouts]);

  // 進入頁面 / 數據變動時重算任務進度
  useEffect(() => {
    recomputeQuests(questCtx);
  }, [questCtx, recomputeQuests]);

  const handleClaim = (questId: string) => {
    handleQuestClaimed(questId, questCtx);
  };

  // 非稱號類配件（稱號獨立區塊顯示）
  const gridCosmetics = useMemo(
    () => COSMETICS.filter((c) => c.type !== 'title'),
    []
  );
  const titleCosmetics = useMemo(
    () => COSMETICS.filter((c) => c.type === 'title'),
    []
  );

  const equippedCosmetics = equippedCosmeticIds
    .map((id) => COSMETIC_MAP[id])
    .filter(Boolean);
  const equippedTitle = equippedTitleId
    ? COSMETIC_MAP[equippedTitleId]
    : undefined;

  const goalLabel = goal ? TRAINING_GOAL_LABELS[goal] : undefined;

  return (
    <PageShell title="Partner" showBack>
      {/* ===== Hero：Partner 視覺 + 等級 + XP ===== */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="relative overflow-hidden p-5 border-accent/30">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/12 via-transparent to-auxiliary/10 pointer-events-none" />
          <div className="relative flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 16 }}
              className="w-24 h-24 rounded-full bg-accent-soft border-2 border-accent/40 flex items-center justify-center shadow-card"
            >
              <Icon size={48} className="text-accent" strokeWidth={2} />
            </motion.div>
            <p className="mt-3 text-[10px] uppercase tracking-widest text-text-secondary">
              形態
            </p>
            <p className="font-display text-base tracking-wide text-accent font-bold">
              {displayForm?.name ?? '—'}
            </p>

            <h2 className="mt-1 font-display text-2xl tracking-wide text-text-primary">
              {name || '—'}
            </h2>

            <div className="mt-2 flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-accent uppercase tracking-wider">
                Lv.{level}
              </span>
              {goalLabel && (
                <Badge variant="default" className="border-border">
                  {goalLabel.title}
                </Badge>
              )}
            </div>

            <div className="w-full mt-4">
              {isMaxLevel ? (
                <p className="text-[11px] uppercase tracking-widest text-auxiliary font-bold">
                  已達最高等級 Lv.{LEVEL_CAP}
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-border/60 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-accent to-auxiliary"
                    />
                  </div>
                  <span className="font-mono text-[10px] text-text-secondary tabular-nums">
                    {progress.xpInCurrentLevel}/{progress.xpForNextLevel}
                  </span>
                </div>
              )}
            </div>

            {milestone && (
              <div className="mt-3 flex items-start gap-1.5 text-[11px] text-text-secondary leading-relaxed">
                <Sparkles size={12} className="text-accent flex-shrink-0 mt-0.5" />
                <span>{milestone}</span>
              </div>
            )}
          </div>
        </Card>
      </motion.section>

      {/* ===== 統計：連續天數 / 訓練次數 / 形態 ===== */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="mb-6"
      >
        <Card className="grid grid-cols-3 divide-x divide-border/40 overflow-hidden">
          <StatTile
            label="連續天數"
            value={streak}
            unit="天"
            highlight={streak >= 3}
          />
          <StatTile label="訓練次數" value={totalWorkouts} />
          <StatTile
            label="形態"
            value={unlockedFormIds.length}
          />
        </Card>
      </motion.section>

      {/* ===== 已裝備配件預覽 ===== */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="mb-6"
      >
        <SectionHeader title="裝備預覽" subtitle="目前配戴中的配件" />
        <Card className="p-4">
          {equippedCosmetics.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Shirt size={14} />
              尚未裝備任何配件
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {equippedCosmetics.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-accent-soft border border-accent/30 text-xs text-text-primary font-bold"
                >
                  <Shirt size={12} className="text-accent" />
                  {c.name}
                </span>
              ))}
            </div>
          )}
        </Card>
      </motion.section>

      {/* ===== 稱號 ===== */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="mb-6"
      >
        <SectionHeader title="稱號" subtitle="點擊切換裝備的稱號" />
        <Card className="p-3">
          {titleCosmetics.length === 0 ? (
            <div className="text-xs text-text-secondary py-2 text-center">
              尚無稱號
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {titleCosmetics.map((t) => {
                const unlocked = unlockedTitleIds.includes(t.id);
                const equipped = equippedTitleId === t.id;
                return (
                  <motion.button
                    key={t.id}
                    type="button"
                    whileTap={unlocked ? { scale: 0.95 } : undefined}
                    disabled={!unlocked}
                    onClick={() => {
                      if (!unlocked) return;
                      if (equipped) return;
                      equipTitle(t.id);
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-bold transition-colors',
                      equipped
                        ? 'bg-accent text-bg-primary border-accent'
                        : unlocked
                          ? 'bg-bg-card text-text-primary border-border/60 hover:border-accent/40'
                          : 'bg-bg-secondary text-text-secondary/60 border-border/40'
                    )}
                  >
                    {equipped && <Check size={12} strokeWidth={3} />}
                    {unlocked ? t.name : '？？？'}
                  </motion.button>
                );
              })}
            </div>
          )}
          {equippedTitle && (
            <p className="mt-2 text-[10px] uppercase tracking-widest text-accent font-bold">
              目前：{equippedTitle.name}
            </p>
          )}
        </Card>
      </motion.section>

      {/* ===== 任務清單 ===== */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="mb-6"
      >
        <SectionHeader
          title="任務"
          subtitle="完成訓練目標領取獎勵"
          action={
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-text-secondary">
              <Trophy size={12} className="text-auxiliary" />
              {Object.values(questProgress).filter((p) => p?.claimed).length}/
              {QUESTS.length}
            </span>
          }
        />
        <QuestList
          quests={QUESTS}
          progress={questProgress}
          onClaim={handleClaim}
        />
      </motion.section>

      {/* ===== 配件櫃 ===== */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <SectionHeader
          title="配件櫃"
          subtitle="點擊已解鎖的配件進行裝備 / 卸下"
          action={
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-text-secondary">
              <Dumbbell size={12} className="text-accent" />
              {unlockedCosmeticIds.length}/{gridCosmetics.length}
            </span>
          }
        />
        <CosmeticGrid
          cosmetics={gridCosmetics}
          unlockedIds={unlockedCosmeticIds}
          equippedIds={equippedCosmeticIds}
          onEquip={equipCosmetic}
          onUnequip={unequipCosmetic}
        />
      </motion.section>

      {/* 連續訓練提示（底部強調） */}
      {streak >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="mt-6 flex items-center gap-2 px-3 py-2.5 rounded-card bg-auxiliary/10 border border-auxiliary/30"
        >
          <Flame size={16} className="text-auxiliary" />
          <span className="text-xs font-bold text-auxiliary uppercase tracking-wider">
            已連續訓練 {streak} 天，保持住！
          </span>
        </motion.div>
      )}
    </PageShell>
  );
}
