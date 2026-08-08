import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import { Flame, Plus, TrendingUp, Trophy, Zap, Award, X, Sparkles } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { Card, SectionHeader, StatTile, Badge } from '@/components/ui/Card';
import { useWorkoutStore } from '@/store/workoutStore';
import { useProfileStore } from '@/store/profileStore';
import {
  useAchievementsStore,
  ACHIEVEMENTS,
  SORTED_ACHIEVEMENTS,
  TIER_STYLES,
  type AchievementDef,
} from '@/store/achievementsStore';
import { trainingPlans, getPlanById } from '@/data/plans';
import { formatDate } from '@/utils/workout';
import { cn } from '@/lib/utils';

// 新手預設計畫：5x5 力量基礎 (beginner)
const DEFAULT_BEGINNER_PLAN_ID = '5x5-strength';

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    sessions,
    personalRecords,
    getTotalSessions,
    getTotalVolume,
    getStreakDays,
    activePlanId,
    nextDayIndex,
    setActivePlan,
  } = useWorkoutStore();
  const { profile } = useProfileStore();

  // ⚠️ 用細粒度 selector 拎 action，唔好拎成個 store object：
  //   zustand 如果直接 useXxxStore() 唔傳 selector → 每 render 都有新 object ref，
  //   放落 useEffect deps 會每次都視為變化 → 觸發 recompute() → recompute set state →
  //   re-render → deps 又新 → infinite loop → React error #185。
  const recompute = useAchievementsStore((s) => s.recompute);
  const markUnlockSeen = useAchievementsStore((s) => s.markUnlockSeen);
  const pendingUnlockId = useAchievementsStore((s) => s.pendingUnlockId);
  const progress = useAchievementsStore((s) => s.progress);

  const totalSessions = getTotalSessions();
  const totalVolume = getTotalVolume(); // 噸
  const streak = getStreakDays();

  // 成就：派生 context 並 recompute（每次統計值變動都會自動更新）
  const achieveCtx = useMemo(() => {
    const varietyIds = new Set<string>();
    for (const s of sessions) {
      for (const ex of s.exercises) varietyIds.add(ex.exerciseId);
    }
    return {
      totalSessions,
      streak,
      totalVolumeTon: totalVolume,
      prCount: personalRecords.length,
      exercisesVariety: varietyIds.size,
    };
  }, [sessions, totalSessions, streak, totalVolume, personalRecords.length]);

  useEffect(() => {
    recompute(achieveCtx);
  }, [achieveCtx, recompute]);

  // 解鎖彈窗
  const pendingUnlock = pendingUnlockId
    ? ACHIEVEMENTS.find((a) => a.id === pendingUnlockId) ?? null
    : null;

  // 成就牆摘要（前 4 個）
  const unlockedCount = SORTED_ACHIEVEMENTS.filter(
    (a) => progress[a.id]?.unlocked
  ).length;

  const lastSession = sessions[sessions.length - 1];
  const today = new Date();
  const hour = today.getHours();
  const greeting =
    hour < 12 ? '早安' : hour < 18 ? '午後' : '夜晚';

  // 決定今日訓練日與所屬計畫
  const selectedPlanId = activePlanId ?? DEFAULT_BEGINNER_PLAN_ID;
  let selectedPlan = getPlanById(selectedPlanId);
  // 防呆：若 activePlanId 不存在（被刪除等），fallback 到 5x5
  if (!selectedPlan) selectedPlan = getPlanById(DEFAULT_BEGINNER_PLAN_ID)!;
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
                {today.toLocaleDateString('zh-TW', { weekday: 'short' })}
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

      {/* 成就解鎖彈窗（N2） */}
      {pendingUnlock && (
        <motion.div
          key={pendingUnlock.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => markUnlockSeen(pendingUnlock.id)}
        >
          <motion.div
            initial={{ scale: 0.7, y: 40, rotateX: -15 }}
            animate={{ scale: 1, y: 0, rotateX: 0 }}
            transition={{
              type: 'spring',
              damping: 18,
              stiffness: 260,
              mass: 0.9,
            }}
            className="w-full max-w-xs bg-bg-primary rounded-3xl p-6 text-center border border-accent/30 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 背景光暈 */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${TIER_STYLES[pendingUnlock.tier].ring} opacity-60 pointer-events-none blur-2xl`}
            />
            <motion.div
              initial={{ rotate: -30, scale: 0.5 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 15 }}
              className="relative w-24 h-24 mx-auto rounded-full bg-bg-card flex items-center justify-center border border-border shadow-2xl"
            >
              <span className="text-5xl drop-shadow-lg">{pendingUnlock.icon}</span>
              <Sparkles
                size={18}
                className="absolute -top-1 -right-1 text-yellow-400"
                strokeWidth={2.5}
              />
              <Sparkles
                size={14}
                className="absolute -bottom-1 -left-2 text-accent"
                strokeWidth={2.5}
              />
            </motion.div>
            <div className="relative mt-5">
              <Badge
                variant="default"
                className={
                  'border ' + TIER_STYLES[pendingUnlock.tier].badge
                }
              >
                {TIER_STYLES[pendingUnlock.tier].title}牌成就解鎖
              </Badge>
            </div>
            <h3 className="relative font-display text-2xl tracking-wide uppercase text-text-primary mt-3">
              {pendingUnlock.title}
            </h3>
            <p className="relative text-sm text-text-secondary mt-2 leading-relaxed">
              {pendingUnlock.description}
            </p>
            <Button
              fullWidth
              size="lg"
              className="relative mt-6"
              onClick={() => markUnlockSeen(pendingUnlock.id)}
            >
              <Award size={18} /> 繼續訓練
            </Button>
          </motion.div>
        </motion.div>
      )}
    </PageShell>
  );
}

// ============ 成就縮圖小元件 ============
function AchievementThumb({ def }: { def: AchievementDef }) {
  const prog = useAchievementsStore((s) => s.progress[def.id]) ?? { unlocked: false, current: 0 };
  const ratio = Math.min(1, prog.current / Math.max(1, def.threshold));
  const style = TIER_STYLES[def.tier];
  return (
    <div
      className={cn(
        'relative aspect-square rounded-card border p-2 flex flex-col items-center justify-center overflow-hidden transition-all',
        prog.unlocked
          ? `bg-gradient-to-br ${style.ring} border-transparent`
          : 'bg-bg-card border-border/40 opacity-60 grayscale'
      )}
    >
      <span className="text-3xl leading-none">{def.icon}</span>
      <div className="w-full mt-2 h-1 bg-black/10 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            prog.unlocked ? 'bg-accent' : 'bg-text-secondary/40'
          )}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}
