import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Flame, Plus, TrendingUp, Trophy, Zap, Award, Cat, Dog, ChevronRight, Gift } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { Card, SectionHeader, StatTile, Badge } from '@/components/ui/Card';
import { useWorkoutStore } from '@/store/workoutStore';
import { useProfileStore } from '@/store/profileStore';
import {
  useAchievementsStore,
  SORTED_ACHIEVEMENTS,
  formatAchievementCopy,
} from '@/store/achievementsStore';
import { ACHIEVEMENTS, TIER_COLORS, type AchievementDef } from '@/data/achievements';
import { CelebrationModal, type CelebrationItem } from '@/features/achievements/components/CelebrationModal';
import { trainingPlans, DEFAULT_BEGINNER_PLAN_ID } from '@/data/plans';
import { usePlansStore } from '@/store/plansStore';
import { formatDate } from '@/utils/workout';
import { cn } from '@/lib/utils';
import { usePartnerStore } from '@/features/partner/stores/partnerStore';
import { useFeatureFlags } from '@/features/partner/stores/featureFlags';
import { getXpProgress } from '@/features/partner/engine/level';
import { getFormForWorkouts } from '@/features/partner/data/forms';
import { PartnerSetupModal } from '@/features/partner/components/PartnerSetupModal';
import { useTelemetryStore } from '@/features/partner/stores/telemetryStore';
import { settleTaxonomyChange } from '@/features/stats/settleAll';
import { formatWeekdayShort } from '@/utils/format';

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    sessions,
    personalRecords,
    getTotalSessions,
    getTotalVolume,
    getStreakDays,
    getGroupStats,
    activePlanId,
    nextDayIndex,
    setActivePlan,
  } = useWorkoutStore();
  const { profile } = useProfileStore();

  // Partner 夥伴卡片
  const partnerEnabled = useFeatureFlags((s) => s.partnerEnabled);
  const partner = usePartnerStore();
  const xpProgress = getXpProgress(partner.xp);
  const milestone = partner.getNextMilestone();
  // C4：totalWorkouts 由 sessions 派生（getTotalWorkouts）
  const currentForm = getFormForWorkouts(partner.getTotalWorkouts());
  // 舊用戶（Partner 系統上線前已完成 onboarding）補建立 Partner 的 modal
  const [setupModalOpen, setSetupModalOpen] = useState(false);

  // ⚠️ 用細粒度 selector 拎 action，唔好拎成個 store object：
  //   zustand 如果直接 useXxxStore() 唔傳 selector → 每 render 都有新 object ref，
  //   放落 useEffect deps 會每次都視為變化 → 觸發 recompute() → recompute set state →
  //   re-render → deps 又新 → infinite loop → React error #185。
  // C5：改透過 settleTaxonomyChange 統一編排
  const markUnlockSeen = useAchievementsStore((s) => s.markUnlockSeen);
  const pendingUnlockIds = useAchievementsStore((s) => s.pendingUnlockIds);
  const progress = useAchievementsStore((s) => s.progress);
  const lastMetrics = useAchievementsStore((s) => s.lastMetrics);

  const totalSessions = getTotalSessions();
  const totalVolume = getTotalVolume(); // 噸
  const streak = getStreakDays();

  // 成就 v1.3：派生 context 並 recompute
  // P-01：傳遞 raw data 讓 engine 從當前分類派生所有 metric
  const achieveCtx = useMemo(() => {
    const groupStats = getGroupStats();
    return {
      sessions,
      personalRecords,
      bodyWeight: profile.bodyWeight,
      hasCustomExercises: useWorkoutStore.getState().customExercises.length > 0,
      hasCustomPlans: false, // T-05 尚未實作 custom plans
      groupStats,
    };
  }, [sessions, personalRecords, profile.bodyWeight, getGroupStats]);

  useEffect(() => {
    // C5：統一透過 settleTaxonomyChange 結算（保證 achievements + quests 同源）
    settleTaxonomyChange();
  }, [achieveCtx]);

  // 解鎖慶祝清單（支援同一 session 多解鎖）
  const celebrationItems: CelebrationItem[] = useMemo(() => {
    if (!lastMetrics) return [];
    return pendingUnlockIds
      .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
      .filter((a): a is AchievementDef => !!a)
      .map((def) => ({
        def,
        formattedCopy: formatAchievementCopy(def, lastMetrics),
      }));
  }, [pendingUnlockIds, lastMetrics]);

  const [celebrationOpen, setCelebrationOpen] = useState(false);
  useEffect(() => {
    setCelebrationOpen(celebrationItems.length > 0);
  }, [celebrationItems.length]);

  const handleCelebrationContinue = () => {
    setCelebrationOpen(false);
    for (const item of celebrationItems) markUnlockSeen(item.def.id);
    useTelemetryStore.getState().log('celebration_skipped');
  };

  // 成就牆摘要（前 4 個）
  const unlockedCount = SORTED_ACHIEVEMENTS.filter(
    (a) => progress[a.id]?.unlocked
  ).length;

  const lastSession = sessions[sessions.length - 1];
  const today = new Date();
  const hour = today.getHours();
  const greeting =
    hour < 12 ? '早安' : hour < 18 ? '午後' : '夜晚';

  // 決定今日訓練日與所屬計畫（T-05：支援自訂計畫）
  const plansGetPlanById = usePlansStore((s) => s.getPlanById);
  const selectedPlanId = activePlanId ?? DEFAULT_BEGINNER_PLAN_ID;
  let selectedPlan = plansGetPlanById(selectedPlanId);
  // 防呆：若 activePlanId 不存在（被刪除等），fallback 到 5x5
  if (!selectedPlan) selectedPlan = plansGetPlanById(DEFAULT_BEGINNER_PLAN_ID)!;
  const todayPlan = selectedPlan;
  const todayDayIndex = Math.min(
    Math.max(0, nextDayIndex),
    todayPlan.days.length - 1
  );
  const todayWorkout = todayPlan.days[todayDayIndex];

  // 開始今日訓練：自動填入計畫
  const handleStartToday = () => {
    // 新用戶未設置 activePlan，先預設 5x5
    if (!activePlanId) setActivePlan(DEFAULT_BEGINNER_PLAN_ID);
    const store = useWorkoutStore.getState();
    store.startSession(todayPlan.id, todayPlan.name, todayWorkout);
    navigate('/workout');
  };

  return (
    <PageShell>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-2 pb-4"
      >
        <p className="text-xs uppercase tracking-widest text-text-secondary">
          {greeting}，準備好了嗎
        </p>
        <h1 className="font-display text-4xl tracking-wide uppercase text-text-primary mt-1">
          {profile.name}
        </h1>
      </motion.div>

      {/* 連續天數強化（N2）：連續 > 0 就有大 banner */}
      {streak >= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.02 }}
          className="mb-4"
        >
          <Card className="relative overflow-hidden p-4 border-accent/40">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/15 via-accent/5 to-transparent pointer-events-none" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-accent text-bg-primary flex items-center justify-center flex-shrink-0 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
                <Flame size={26} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-accent font-bold">
                  連續訓練中 🔥
                </div>
                <div className="font-display text-3xl tracking-wide uppercase text-text-primary leading-none mt-1">
                  {streak}
                  <span className="text-lg ml-1 text-text-secondary">天</span>
                </div>
                <p className="text-[11px] text-text-secondary mt-1 leading-snug">
                  {streak < 3
                    ? '再堅持一下，3 天就拿到你的第一個銅牌成就！'
                    : streak < 7
                      ? '一週快到手，保持節奏不要斷～'
                      : '7 天連續達成！自律就是最好的教練。'}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Partner 夥伴卡片 */}
      {partnerEnabled && partner.name && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className="mb-4"
        >
          <Card className="relative overflow-hidden p-4 border-accent/30">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent pointer-events-none" />
            <button
              type="button"
              onClick={() => navigate('/partner')}
              className="relative flex items-center gap-3 w-full text-left active:scale-[0.99] transition-transform"
              aria-label={`查看 ${partner.name} 的 Partner 詳情`}
            >
              {/* Partner species icon */}
              <div className="w-12 h-12 rounded-full bg-accent/15 text-accent flex items-center justify-center flex-shrink-0 border border-accent/30">
                {partner.species === 'cat' ? <Cat size={22} /> : <Dog size={22} />}
              </div>

              {/* Partner 名稱 + 等級 + XP */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-display text-lg tracking-wide uppercase text-text-primary truncate">
                    {partner.name}
                  </span>
                  <Badge variant="default" className="border border-accent/30 text-accent">
                    Lv.{partner.getLevel()}
                  </Badge>
                  <span className="text-[10px] text-text-secondary/80 truncate">
                    {currentForm.name}
                  </span>
                </div>

                {/* XP 進度條 */}
                <div className="w-full h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${Math.round(xpProgress.progress * 100)}%` }}
                  />
                </div>

                {/* 下一個里程碑 */}
                {milestone && (
                  <p className="text-[10px] text-text-secondary mt-1.5 leading-snug line-clamp-1">
                    {milestone}
                  </p>
                )}
              </div>
              <ChevronRight size={18} className="text-text-secondary/60 flex-shrink-0" />
            </button>

            {/* CTA */}
            <Button fullWidth size="sm" className="mt-3" onClick={handleStartToday}>
              <TrendingUp size={16} /> 開始今日訓練
            </Button>
          </Card>
        </motion.div>
      )}

      {/* 舊用戶未建立 Partner 時的引導卡片 */}
      {partnerEnabled && !partner.name && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className="mb-4"
        >
          <Card className="relative overflow-hidden p-4 border-accent/30">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/12 via-accent/5 to-auxiliary/8 pointer-events-none" />
            <button
              type="button"
              onClick={() => setSetupModalOpen(true)}
              className="relative flex items-center gap-3 w-full text-left active:scale-[0.99] transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-accent/15 text-accent flex items-center justify-center flex-shrink-0 border border-accent/30">
                <Gift size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-accent font-bold">
                  新功能上線
                </div>
                <div className="font-display text-base tracking-wide text-text-primary mt-0.5">
                  揀你嘅訓練夥伴
                </div>
                <p className="text-[11px] text-text-secondary mt-1 leading-snug">
                  Partner 會陪你記錄、陪你休息、陪你進步。
                </p>
              </div>
              <ChevronRight size={18} className="text-text-secondary/60 flex-shrink-0" />
            </button>
          </Card>
        </motion.div>
      )}

      {/* 今日訓練卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="relative overflow-hidden p-5">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-accent to-auxiliary" />
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className="text-accent" />
                <span className="text-[10px] uppercase tracking-widest text-text-secondary">
                  今日訓練 · {todayPlan.name}
                </span>
              </div>
              <h2 className="font-display text-3xl tracking-wide uppercase text-text-primary">
                {todayWorkout.dayName}
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                {todayWorkout.exercises.length} 個動作 · {todayWorkout.exercises.reduce((s, e) => s + e.targetSets, 0)} 組
              </p>
            </div>
            <div className="text-right">
              <div className="font-mono text-xs text-text-secondary">
                {today.getMonth() + 1}.{today.getDate()}
              </div>
              <div className="font-display text-2xl text-accent mt-1">
                {formatWeekdayShort(today)}
              </div>
            </div>
          </div>
          <Button fullWidth size="lg" onClick={handleStartToday}>
            <TrendingUp size={18} /> 開始訓練
          </Button>
        </Card>
      </motion.div>

      {/* 累積數據 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6"
      >
        <SectionHeader title="累積數據" subtitle="你的訓練足跡" />
        <Card className="grid grid-cols-3 divide-x divide-border/40">
          <StatTile label="訓練次數" value={totalSessions} />
          <StatTile label="總噸數" value={totalVolume} unit="t" />
          <StatTile
            label="連續天數"
            value={streak}
            unit="天"
            highlight={streak > 0}
          />
        </Card>
      </motion.div>

      {/* 近期 PR */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-6"
      >
        <SectionHeader
          title="個人紀錄"
          subtitle="三大項最佳表現"
          action={
            <button
              onClick={() => navigate('/progress')}
              className="text-xs uppercase tracking-wider text-accent font-bold"
            >
              全部 →
            </button>
          }
        />
        <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
          {personalRecords.slice(0, 5).map((pr, i) => (
            <motion.div
              key={pr.exerciseId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="flex-shrink-0 w-36"
            >
              <Card className="p-4 h-full flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <Trophy size={16} className="text-auxiliary" />
                  <Badge variant="auxiliary">PR</Badge>
                </div>
                <div className="text-xs text-text-secondary mb-1 line-clamp-1">
                  {pr.exerciseName}
                </div>
                <div className="font-mono text-2xl font-bold text-text-primary">
                  {pr.weight}
                  <span className="text-xs text-text-secondary ml-1">kg</span>
                </div>
                <div className="font-mono text-xs text-text-secondary mt-1">
                  × {pr.reps} reps
                </div>
                <div className="mt-auto pt-3 border-t border-border/40">
                  <div className="text-[9px] uppercase tracking-widest text-text-secondary">
                    估算 1RM
                  </div>
                  <div className="font-mono text-sm font-bold text-accent">
                    {pr.estimated1RM} kg
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 上次訓練 */}
      {lastSession && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <SectionHeader title="上次訓練" />
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-display text-xl tracking-wide uppercase text-text-primary">
                  {lastSession.dayName ?? '訓練'}
                </div>
                <div className="text-xs text-text-secondary">
                  {lastSession.planName} · {formatDate(lastSession.date)}
                </div>
              </div>
              <Flame size={20} className="text-auxiliary" />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-border/40">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-text-secondary">
                  訓練量
                </div>
                <div className="font-mono text-lg font-bold text-text-primary">
                  {(lastSession.totalVolume / 1000).toFixed(1)}
                  <span className="text-xs text-text-secondary ml-1">t</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-text-secondary">
                  動作數
                </div>
                <div className="font-mono text-lg font-bold text-text-primary">
                  {lastSession.exercises.length}
                </div>
              </div>
            </div>
            {/* 每個動作的上次組數 */}
            <div className="flex flex-col gap-3">
              {lastSession.exercises.map((ex) => {
                const completedSets = ex.sets.filter((s) => s.completed);
                const displaySets = completedSets.length > 0 ? completedSets : ex.sets;
                return (
                  <div key={ex.id} className="bg-bg-secondary rounded-button p-3 border border-border/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-bold text-text-primary">{ex.name}</div>
                      <div className="text-[10px] uppercase tracking-widest text-text-secondary">
                        {completedSets.length}/{ex.sets.length} 組
                      </div>
                    </div>
                    {displaySets.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {displaySets.map((s) => (
                          <span
                            key={s.id}
                            className="font-mono text-[11px] text-text-secondary bg-bg-card px-2 py-1 rounded-button border border-border/30"
                          >
                            {s.weight}kg × {s.reps}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-text-secondary/60">無已完成組數</div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* 成就牆摘要（N2） */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="mt-6"
      >
        <SectionHeader
          title="成就牆"
          subtitle={`已解鎖 ${unlockedCount} / ${SORTED_ACHIEVEMENTS.length}`}
          action={
            <button
              onClick={() => navigate('/achievements')}
              className="text-xs uppercase tracking-wider text-accent font-bold"
            >
              全部 →
            </button>
          }
        />
        <div className="grid grid-cols-4 gap-2">
          {SORTED_ACHIEVEMENTS.slice(0, 4).map((a) => (
            <AchievementThumb key={a.id} def={a} />
          ))}
        </div>
      </motion.div>

      {/* 快速開始 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
        className="mt-6 mb-4"
      >
        <SectionHeader title="快速開始" />
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/plans')}
            className={cn(
              'bg-bg-card rounded-card border border-border/40 p-4 text-left',
              'hover:border-accent/50 transition-colors'
            )}
          >
            <Plus size={20} className="text-accent mb-2" />
            <div className="font-bold text-sm text-text-primary">選擇計畫</div>
            <div className="text-[10px] text-text-secondary mt-0.5">從模板開始</div>
          </button>
          <button
            onClick={() => navigate('/workout')}
            className={cn(
              'bg-bg-card rounded-card border border-border/40 p-4 text-left',
              'hover:border-accent/50 transition-colors'
            )}
          >
            <Plus size={20} className="text-auxiliary mb-2" />
            <div className="font-bold text-sm text-text-primary">自由訓練</div>
            <div className="text-[10px] text-text-secondary mt-0.5">空白開始</div>
          </button>
        </div>
      </motion.div>

      {/* 成就解鎖慶祝儀式（v1.3：支援多解鎖合併） */}
      <CelebrationModal
        items={celebrationItems}
        open={celebrationOpen}
        onContinue={handleCelebrationContinue}
        onViewWall={() => {
          handleCelebrationContinue();
          navigate('/achievements');
        }}
      />

      {/* 舊用戶補建立 Partner 的 Modal */}
      <PartnerSetupModal
        open={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
      />
    </PageShell>
  );
}

// ============ 成就縮圖小元件 ============
function AchievementThumb({ def }: { def: AchievementDef }) {
  const prog = useAchievementsStore((s) => s.progress[def.id]) ?? { unlocked: false, current: 0 };
  const ratio = Math.min(1, prog.current / Math.max(1, def.threshold));
  const tier = TIER_COLORS[def.tier];
  return (
    <div
      className={cn(
        'relative aspect-square rounded-card border p-2 flex flex-col items-center justify-center overflow-hidden transition-all',
        prog.unlocked
          ? 'border-transparent'
          : 'bg-bg-card border-border/40 border-dashed',
      )}
      style={prog.unlocked ? {
        background: `linear-gradient(135deg, ${tier.color}25, transparent)`,
      } : undefined}
    >
      <span
        className="font-display text-lg tracking-wider font-bold"
        style={{ color: prog.unlocked ? tier.color : 'var(--text-secondary)' }}
      >
        {tier.label}
      </span>
      <span className="text-[8px] text-text-secondary mt-0.5 truncate w-full text-center leading-tight">
        {def.title}
      </span>
      <div className="w-full mt-1.5 h-1 bg-bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.round(ratio * 100)}%`,
            background: prog.unlocked
              ? `linear-gradient(90deg, ${tier.color}, var(--accent))`
              : 'var(--text-secondary)',
          }}
        />
      </div>
    </div>
  );
}
