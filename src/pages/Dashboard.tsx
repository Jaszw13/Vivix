import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Plus, TrendingUp, Trophy, Zap } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { Card, SectionHeader, StatTile, Badge } from '@/components/ui/Card';
import { useWorkoutStore } from '@/store/workoutStore';
import { useProfileStore } from '@/store/profileStore';
import { trainingPlans } from '@/data/plans';
import { formatDate } from '@/utils/workout';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const { sessions, personalRecords, getTotalSessions, getTotalVolume, getStreakDays } =
    useWorkoutStore();
  const { profile } = useProfileStore();

  const totalSessions = getTotalSessions();
  const totalVolume = getTotalVolume(); // 噸
  const streak = getStreakDays();

  const lastSession = sessions[sessions.length - 1];
  const today = new Date();
  const hour = today.getHours();
  const greeting =
    hour < 12 ? '早安' : hour < 18 ? '午後' : '夜晚';

  const todayWorkout = trainingPlans[1].days[0]; // 預設推 Push 為今日

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

      {/* 今日訓練卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="relative overflow-hidden p-5">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-accent to-auxiliary" />
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className="text-accent" />
                <span className="text-[10px] uppercase tracking-widest text-text-secondary">
                  今日訓練
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
          <Button fullWidth size="lg" onClick={() => navigate('/workout')}>
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

      {/* 快速開始 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mt-6"
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
    </PageShell>
  );
}
