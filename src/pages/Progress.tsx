import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Trophy, TrendingUp, BarChart3 } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, SectionHeader, Badge } from '@/components/ui/Card';
import { useWorkoutStore } from '@/store/workoutStore';
import { exercises, getExerciseById } from '@/data/exercises';
import { formatDate } from '@/utils/workout';
import { cn } from '@/lib/utils';

type Metric = 'estimated1RM' | 'maxWeight';

export default function Progress() {
  const navigate = useNavigate();
  const { personalRecords, getExerciseProgress, getWeeklyVolume, sessions } =
    useWorkoutStore();

  const [selectedExerciseId, setSelectedExerciseId] = useState('squat');
  const [metric, setMetric] = useState<Metric>('estimated1RM');

  const progress = getExerciseProgress(selectedExerciseId);
  const weeklyVolume = getWeeklyVolume();
  const selectedExercise = getExerciseById(selectedExerciseId);

  // 訓練量分布（依部位）
  const categoryVolume = new Map<string, number>();
  for (const s of sessions) {
    for (const ex of s.exercises) {
      const ex0 = exercises.find((e) => e.id === ex.exerciseId);
      if (!ex0) continue;
      const vol = ex.sets
        .filter((set) => set.completed)
        .reduce((sum, set) => sum + set.weight * set.reps, 0);
      categoryVolume.set(
        ex0.category,
        (categoryVolume.get(ex0.category) ?? 0) + vol
      );
    }
  }
  const pieData = Array.from(categoryVolume.entries())
    .map(([category, volume]) => ({
      name: category,
      value: Math.round(volume / 1000),
    }))
    .sort((a, b) => b.value - a.value);

  const PIE_COLORS = ['#D4FF00', '#FF6B35', '#4A7C7A', '#C9A96E', '#E8A87C', '#8E8E93'];

  return (
    <PageShell title="進度追蹤">
      {/* PR 列表 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <SectionHeader
          title="個人紀錄"
          subtitle="所有動作最佳表現"
        />
        <Card className="divide-y divide-border/40">
          {personalRecords.map((pr) => (
            <div key={pr.exerciseId} className="p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-auxiliary/15 flex items-center justify-center">
                <Trophy size={14} className="text-auxiliary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-text-primary truncate">
                  {pr.exerciseName}
                </div>
                <div className="font-mono text-[10px] text-text-secondary">
                  {pr.weight}kg × {pr.reps} · {formatDate(pr.date)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-lg font-bold text-accent">
                  {pr.estimated1RM}
                </div>
                <div className="text-[9px] uppercase tracking-widest text-text-secondary">
                  1RM kg
                </div>
              </div>
            </div>
          ))}
        </Card>
      </motion.div>

      {/* 重量曲線 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-6"
      >
        <SectionHeader
          title="重量曲線"
          subtitle={`${selectedExercise?.name ?? ''} 進步軌跡`}
        />

        {/* 動作選擇器 */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 mb-3 pb-1">
          {exercises.slice(0, 8).map((ex) => (
            <button
              key={ex.id}
              onClick={() => setSelectedExerciseId(ex.id)}
              className={cn(
                'px-3 py-1.5 text-xs uppercase tracking-wider rounded-button whitespace-nowrap border transition-colors',
                selectedExerciseId === ex.id
                  ? 'bg-accent text-bg-primary border-accent'
                  : 'bg-transparent text-text-secondary border-border hover:text-text-primary'
              )}
            >
              {ex.name}
            </button>
          ))}
        </div>

        {/* 指標切換 */}
        <div className="flex gap-2 mb-3">
          <MetricChip
            label="估算 1RM"
            active={metric === 'estimated1RM'}
            onClick={() => setMetric('estimated1RM')}
          />
          <MetricChip
            label="最大重量"
            active={metric === 'maxWeight'}
            onClick={() => setMetric('maxWeight')}
          />
        </div>

        <Card className="p-4">
          {progress.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-text-secondary">
              尚無此動作的訓練記錄
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={progress.map((p) => ({
                    date: formatDate(p.date),
                    value: metric === 'estimated1RM' ? p.estimated1RM : p.maxWeight,
                  }))}
                  margin={{ top: 10, right: 10, bottom: 0, left: -16 }}
                >
                  <CartesianGrid stroke="var(--border-color)" strokeDasharray="2 4" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="var(--text-secondary)"
                    tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--text-secondary)"
                    tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono',
                    }}
                    labelStyle={{ color: 'var(--text-secondary)' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--accent)"
                    strokeWidth={2.5}
                    dot={{ fill: 'var(--accent)', r: 3 }}
                    activeDot={{ r: 5, fill: 'var(--accent)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </motion.div>

      {/* 訓練量統計 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6"
      >
        <SectionHeader
          title="訓練量"
          subtitle="近 8 週每週總量（噸）"
          action={<BarChart3 size={18} className="text-accent" />}
        />
        <Card className="p-4">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyVolume}
                margin={{ top: 10, right: 10, bottom: 0, left: -16 }}
              >
                <CartesianGrid stroke="var(--border-color)" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="week"
                  stroke="var(--text-secondary)"
                  tick={{ fontSize: 9, fontFamily: 'JetBrains Mono' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--text-secondary)"
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'JetBrains Mono',
                  }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  formatter={(v: number) => [`${v} t`, '訓練量']}
                />
                <Bar
                  dataKey="volume"
                  fill="var(--accent)"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      {/* 部位分布 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-6"
      >
        <SectionHeader title="部位分布" subtitle="累積訓練量比例" />
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-32 h-32 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={56}
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                        stroke="var(--bg-card)"
                        strokeWidth={1}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono',
                    }}
                    formatter={(v: number) => [`${v} t`, '訓練量']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              {pieData.slice(0, 6).map((d, i) => {
                const labels: Record<string, string> = {
                  chest: '胸',
                  back: '背',
                  legs: '腿',
                  shoulders: '肩',
                  arms: '手臂',
                  core: '核心',
                };
                return (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="text-text-primary flex-1">
                      {labels[d.name] ?? d.name}
                    </span>
                    <span className="font-mono text-text-secondary">
                      {d.value}t
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </motion.div>
    </PageShell>
  );
}

function MetricChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-wider rounded-button border transition-colors',
        active
          ? 'bg-accent-soft text-accent border-accent/40'
          : 'bg-transparent text-text-secondary border-border hover:text-text-primary'
      )}
    >
      <TrendingUp size={12} />
      {label}
    </button>
  );
}
