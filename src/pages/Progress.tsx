import { useState, useMemo } from 'react';
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
} from 'recharts';
import { Trophy, TrendingUp, BarChart3, AlertCircle, Dumbbell } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, SectionHeader, Badge } from '@/components/ui/Card';
import { useWorkoutStore, getAllExercises } from '@/store/workoutStore';
import { formatDate } from '@/utils/workout';
import {
  MUSCLE_GROUP_LABELS,
  EQUIPMENT_TYPE_LABELS,
  MUSCLE_GROUP_OPTIONS,
} from '@/types';
import type { MuscleGroup, PersonalRecord } from '@/types';
import { cn } from '@/lib/utils';
import { CHART_WEEK_COLORS } from '@/data/theme';

type ProgressScope = 'all' | MuscleGroup;

export default function Progress() {
  const navigate = useNavigate();
  const {
    personalRecords,
    getExerciseProgress,
    getWeeklyVolume,
    getGroupStats,
    getGroupWeeklyVolume,
    getGroupExerciseProgress,
    getUnderTrainedGroups,
    sessions,
  } = useWorkoutStore();

  // T-02：部位 selector（'all' 代表全局）
  const [scope, setScope] = useState<ProgressScope>('all');

  // ----- 全局數據 -----
  const globalWeeklyVolume = getWeeklyVolume();
  const allExercises = getAllExercises();
  const defaultEx = allExercises[0]?.id ?? 'bench-press';
  const [selectedExerciseId, setSelectedExerciseId] = useState(defaultEx);
  const progress = getExerciseProgress(selectedExerciseId);
  const selectedExercise = allExercises.find((e) => e.id === selectedExerciseId);

  // ----- 分部位數據 -----
  const groupStats = useMemo(() => getGroupStats(), [getGroupStats]);
  const groupWeeklyVolume = scope !== 'all' ? getGroupWeeklyVolume(scope) : [];
  const groupProgressPoints =
    scope !== 'all' ? getGroupExerciseProgress(scope) : [];
  const underTrainedGroups = useMemo(
    () => getUnderTrainedGroups(),
    [getUnderTrainedGroups]
  );

  // ----- PR 列表：按部位或全局 -----
  const scopedPRs = useMemo<PersonalRecord[]>(() => {
    if (scope === 'all') return personalRecords;
    return personalRecords.filter((pr) => {
      const g =
        (pr.muscleGroup as MuscleGroup | undefined) ??
        allExercises.find((e) => e.id === pr.exerciseId)?.muscleGroup;
      return g === scope;
    });
  }, [personalRecords, scope, allExercises]);

  // ----- 部位分佈（部位體積） -----
  const groupVolumeData = useMemo(
    () =>
      MUSCLE_GROUP_OPTIONS.map((o) => ({
        key: o.value,
        name: MUSCLE_GROUP_LABELS[o.value],
        value: Math.round((groupStats[o.value].totalVolumeKg ?? 0) / 1000),
        workouts: groupStats[o.value].workoutCount ?? 0,
      })),
    [groupStats]
  );

  // C7：週色盤改讀 data/theme.ts（原 inline hex）
  const WEEK_COLORS = CHART_WEEK_COLORS;

  return (
    <PageShell title="進度追蹤">
      {/* ===== 部位 selector（T-02 新增） ===== */}
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <p className="text-[10px] uppercase tracking-widest text-text-secondary mb-2">
          檢視範圍
        </p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
          <ScopeChip
            label="全局"
            active={scope === 'all'}
            onClick={() => setScope('all')}
          />
          {MUSCLE_GROUP_OPTIONS.map((o) => (
            <ScopeChip
              key={o.value}
              label={MUSCLE_GROUP_LABELS[o.value]}
              active={scope === o.value}
              onClick={() => setScope(o.value)}
            />
          ))}
        </div>
      </motion.div>

      {/* ===== 部位摘要卡片（選定部位時顯示） ===== */}
      {scope !== 'all' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <Card className="p-4 border-accent/20 bg-gradient-to-br from-bg-card to-accent/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-accent/15 flex items-center justify-center">
                <Dumbbell size={20} className="text-accent" />
              </div>
              <div>
                <h3 className="font-display text-lg tracking-wide uppercase text-text-primary">
                  {MUSCLE_GROUP_LABELS[scope]}
                </h3>
                <p className="text-[10px] uppercase tracking-widest text-text-secondary">
                  部位獨立統計
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-border/40">
              <GroupStatTile
                label="訓練次數"
                value={groupStats[scope].workoutCount}
                unit="次"
              />
              <GroupStatTile
                label="累積體積"
                value={Math.round(groupStats[scope].totalVolumeKg / 1000)}
                unit="t"
              />
              <GroupStatTile
                label="部位 PR"
                value={groupStats[scope].prCount}
                unit="次"
              />
            </div>
            {groupStats[scope].lastTrainedAt && (
              <p className="mt-3 text-[10px] uppercase tracking-widest text-text-secondary">
                上次訓練：{formatDate(groupStats[scope].lastTrainedAt!)}
              </p>
            )}
          </Card>
        </motion.div>
      )}

      {/* ===== 部位偏低提醒（報告，T-02） ===== */}
      {scope === 'all' && underTrainedGroups.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-3 rounded-button bg-amber-500/10 border border-amber-500/30"
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-xs leading-relaxed">
              <p className="font-bold text-text-primary mb-0.5">部位訓練量提醒</p>
              <p className="text-text-secondary">
                建議優先安排：
                {underTrainedGroups.map((g, i) => (
                  <span key={g} className="text-amber-500 font-bold">
                    {i > 0 && '、'}
                    {MUSCLE_GROUP_LABELS[g]}
                  </span>
                ))}
              </p>
              <p className="text-[10px] mt-1 text-text-secondary/80">
                （最近 14 天未接觸，或從未訓練）
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ===== PR 列表（按 scope 過濾） ===== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <SectionHeader
          title={scope === 'all' ? '個人紀錄' : `${MUSCLE_GROUP_LABELS[scope]}個人紀錄`}
          subtitle={
            scope === 'all'
              ? '所有動作最佳表現'
              : `只計入${MUSCLE_GROUP_LABELS[scope]}動作 PR`
          }
        />
        <Card className="divide-y divide-border/40">
          {scopedPRs.length === 0 ? (
            <div className="p-8 text-center text-sm text-text-secondary">
              {scope === 'all' ? '尚無個人紀錄' : `${MUSCLE_GROUP_LABELS[scope]}尚無 PR`}
            </div>
          ) : (
            scopedPRs.map((pr) => {
              const mg: MuscleGroup | undefined =
                (pr.muscleGroup as MuscleGroup) ??
                allExercises.find((e) => e.id === pr.exerciseId)?.muscleGroup;
              return (
                <div key={pr.exerciseId} className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-auxiliary/15 flex items-center justify-center">
                    <Trophy size={14} className="text-auxiliary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-text-primary truncate">
                      {pr.exerciseName}
                    </div>
                    <div className="font-mono text-[10px] text-text-secondary flex items-center gap-2 flex-wrap">
                      <span>{pr.weight}kg × {pr.reps} · {formatDate(pr.date)}</span>
                      {mg && (
                        <Badge variant="auxiliary" className="!py-0 !text-[9px]">
                          {MUSCLE_GROUP_LABELS[mg]}
                        </Badge>
                      )}
                      {pr.equipmentType && (
                        <span className="text-text-secondary/70">
                          {EQUIPMENT_TYPE_LABELS[pr.equipmentType]}
                        </span>
                      )}
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
              );
            })
          )}
        </Card>
      </motion.div>

      {/* ===== 部位進度曲線（選定部位時） vs 單動作曲線（全局時） ===== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-6"
      >
        <SectionHeader
          title={scope === 'all' ? '重量曲線' : `${MUSCLE_GROUP_LABELS[scope]}進步軌跡`}
          subtitle={
            scope === 'all'
              ? `${selectedExercise?.name ?? ''} 進步軌跡`
              : '部位平均 1RM（標準化）'
          }
        />

        {/* 全局模式：動作選擇器；部位模式：不顯示 */}
        {scope === 'all' && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 mb-3 pb-1">
            {allExercises.slice(0, 10).map((ex) => (
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
        )}

        <Card className="p-4">
          {scope === 'all' ? (
            progress.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-text-secondary">
                尚無此動作的訓練記錄
              </div>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={progress.map((p) => ({
                      date: formatDate(p.date),
                      value: p.estimated1RM,
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
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: 'var(--text-secondary)' }}
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
            )
          ) : (
            groupProgressPoints.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-text-secondary">
                {MUSCLE_GROUP_LABELS[scope]}尚無訓練記錄
              </div>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={groupProgressPoints.map((p) => ({
                      date: formatDate(p.date),
                      value: p.normalized1RM,
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
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: 'var(--text-secondary)' }}
                      formatter={(v: number) => [`${v} kg`, `${MUSCLE_GROUP_LABELS[scope]}平均 1RM`]}
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
            )
          )}
        </Card>
      </motion.div>

      {/* ===== 訓練量統計（全局 vs 部位週量 / 部位分佈條形） ===== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6"
      >
        <SectionHeader
          title={scope === 'all' ? '訓練量' : `${MUSCLE_GROUP_LABELS[scope]}每週訓練量`}
          subtitle={
            scope === 'all'
              ? '近 8 週每週總量（噸）'
              : `${MUSCLE_GROUP_LABELS[scope]}近 8 週體積（噸）`
          }
          action={<BarChart3 size={18} className="text-accent" />}
        />
        <Card className="p-4">
          {(() => {
            const data = scope === 'all' ? globalWeeklyVolume : groupWeeklyVolume;
            if (data.length === 0) {
              return (
                <div className="h-48 flex items-center justify-center text-sm text-text-secondary">
                  {scope === 'all' ? '尚無訓練量數據' : `${MUSCLE_GROUP_LABELS[scope]}尚無體積數據`}
                </div>
              );
            }
            return (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data}
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
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: 'var(--text-secondary)' }}
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
            );
          })()}
        </Card>
      </motion.div>

      {/* ===== 全局：部位體積條形比較 ===== */}
      {scope === 'all' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6"
        >
          <SectionHeader
            title="部位體積比較"
            subtitle="各部位累積訓練量（噸）"
          />
          <Card className="p-4">
            <div className="flex flex-col gap-3">
              {groupVolumeData.map((d, i) => {
                const max = Math.max(1, ...groupVolumeData.map((x) => x.value));
                const pct = Math.round((d.value / max) * 100);
                return (
                  <div
                    key={d.key}
                    onClick={() => setScope(d.key as MuscleGroup)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-text-primary font-bold flex items-center gap-2">
                        {d.name}
                        <span className="text-[9px] text-text-secondary font-normal">
                          {d.workouts} 次訓練
                        </span>
                      </span>
                      <span className="font-mono text-text-secondary">{d.value}t</span>
                    </div>
                    <div className="h-2.5 bg-border/60 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: WEEK_COLORS[i % WEEK_COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}
    </PageShell>
  );
}

// ===== 共用樣式 =====
const tooltipStyle = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  fontSize: '12px',
  fontFamily: 'JetBrains Mono',
};

// ===== scope chip（全局 / 部位切換） =====
function ScopeChip({
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
        'px-3 py-1.5 text-xs uppercase tracking-wider rounded-button whitespace-nowrap border transition-colors',
        active
          ? 'bg-accent text-bg-primary border-accent'
          : 'bg-transparent text-text-secondary border-border hover:text-text-primary'
      )}
    >
      {label}
    </button>
  );
}

// ===== 部位 stat tile =====
function GroupStatTile({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit?: string;
}) {
  return (
    <div className="py-2 flex flex-col items-center justify-center first:pl-0 last:pr-0 px-3">
      <div className="font-mono text-2xl font-bold text-text-primary flex items-baseline gap-0.5">
        {value}
        {unit && (
          <span className="text-[10px] text-text-secondary font-normal ml-0.5">
            {unit}
          </span>
        )}
      </div>
      <div className="text-[9px] uppercase tracking-widest text-text-secondary mt-0.5">
        {label}
      </div>
    </div>
  );
}
