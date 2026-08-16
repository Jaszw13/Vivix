import { useState, useMemo, useEffect, useRef } from 'react';
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
  Legend,
} from 'recharts';
import { Trophy, TrendingUp, BarChart3, AlertCircle, Dumbbell, Activity, Plus, X, Zap, Info, Trash2 } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, SectionHeader, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useWorkoutStore, getAllExercises } from '@/store/workoutStore';
import { useProfileStore } from '@/store/profileStore';
import { useCardioStore } from '@/store/cardioStore';
import { formatDate, formatDateFull } from '@/utils/workout';
import {
  MUSCLE_GROUP_LABELS,
  EQUIPMENT_TYPE_LABELS,
  MUSCLE_GROUP_OPTIONS,
} from '@/types';
import type { MuscleGroup, PersonalRecord, CardioSession, CardioMachine } from '@/types';
import { cn } from '@/lib/utils';
import { CHART_WEEK_COLORS } from '@/data/theme';
import { estimateStrengthKcal, estimateCardioKcal } from '@/features/stats/energy';
import { useTelemetryStore } from '@/features/partner/stores/telemetryStore';

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
    customExercises,
  } = useWorkoutStore();
  const { profile } = useProfileStore();
  const cardioSessions = useCardioStore((s) => s.sessions);
  const addCardio = useCardioStore((s) => s.addCardio);
  const deleteCardio = useCardioStore((s) => s.deleteCardio);
  const [cardioAddOpen, setCardioAddOpen] = useState(false);
  const WEEK_COLORS = CHART_WEEK_COLORS;

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

  // ---------- E-02 cardio 衍生圖表與熱量（L2：全衍生） ----------
  const cardioWeeklyMinutes = useMemo(() => {
    const weeks: { week: string; minutes: number }[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const thisMon = new Date(now);
    thisMon.setDate(now.getDate() - diff);
    for (let i = 7; i >= 1; i--) {
      const monday = new Date(thisMon);
      monday.setDate(thisMon.getDate() - (i - 1) * 7);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      let minutes = 0;
      for (const c of cardioSessions) {
        const d = new Date(c.date);
        if (d >= monday && d <= sunday) minutes += Number.isFinite(c.durationMin) ? c.durationMin : 0;
      }
      const mm = String(monday.getMonth() + 1).padStart(2, '0');
      const dd = String(monday.getDate()).padStart(2, '0');
      weeks.push({ week: `${mm}/${dd}`, minutes: Math.round(minutes * 10) / 10 });
    }
    return weeks;
  }, [cardioSessions]);

  const timeSplitPie = useMemo(() => {
    // 以 sessions 原始活躍時長 fallback 估（40s/completed set），若有 startedAt/finishedAt 則優先使用（總體力量時長）
    let strengthMin = 0;
    for (const s of sessions) {
      if (s.startedAt && s.finishedAt) {
        strengthMin += Math.max(0, (new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime()) / 60000);
      } else {
        const completed = s.exercises.reduce((n, e) => n + e.sets.filter((x) => x.completed).length, 0);
        strengthMin += completed * (40 / 60);
      }
    }
    const cardioMin = cardioSessions.reduce((s, c) => s + (Number.isFinite(c.durationMin) ? c.durationMin : 0), 0);
    const data: { name: string; value: number }[] = [];
    if (Math.round(strengthMin) > 0) data.push({ name: '力量', value: Math.round(strengthMin) });
    if (Math.round(cardioMin) > 0) data.push({ name: '有氧', value: Math.round(cardioMin) });
    return data;
  }, [sessions, cardioSessions]);

  const totalEnergySummary = useMemo(() => {
    // E-D6：總熱量 = 力量推估 + 有氧（輸入 or fallback）；附免責小字
    let strengthKcalSum = 0;
    let strengthLocked = false;
    if (profile.bodyWeight !== null) {
      for (const s of sessions) {
        const est = estimateStrengthKcal(s, customExercises, profile.bodyWeight);
        if (est) strengthKcalSum += est.kcal;
      }
    } else {
      strengthLocked = true;
    }
    let cardioKcalSum = 0;
    let cardioFallbackUsed = 0;
    let cardioUnsetCount = 0;
    for (const c of cardioSessions) {
      const r = estimateCardioKcal(c.machine, c.durationMin, profile.bodyWeight, c.kcal);
      if (r.kcal !== null) cardioKcalSum += r.kcal;
      if (r.source === 'fallback') cardioFallbackUsed++;
      if (r.source === 'unset') cardioUnsetCount++;
    }
    return {
      strengthKcal: strengthLocked ? null : strengthKcalSum,
      cardioKcal: cardioKcalSum,
      totalKcal: strengthLocked ? (cardioKcalSum > 0 ? cardioKcalSum : null) : strengthKcalSum + cardioKcalSum,
      cardioFallbackUsed,
      cardioUnsetCount,
      strengthLocked,
    };
  }, [sessions, cardioSessions, profile.bodyWeight, customExercises]);

  // cardio_fallback_used：首次有 fallback 紀錄時 log 一次
  const fallbackLogged = useRef(false);
  useEffect(() => {
    if (fallbackLogged.current) return;
    if (totalEnergySummary.cardioFallbackUsed > 0) {
      fallbackLogged.current = true;
      useTelemetryStore.getState().log('cardio_fallback_used', { count: totalEnergySummary.cardioFallbackUsed });
    }
  }, [totalEnergySummary.cardioFallbackUsed]);

  // cardio 列表按日期遞減
  const cardioSorted = useMemo(
    () => [...cardioSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [cardioSessions],
  );

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
            {groupStats[scope].lastTrainedAt ? (
              <p className="mt-3 text-[10px] uppercase tracking-widest text-text-secondary">
                上次訓練：{formatDate(groupStats[scope].lastTrainedAt)}
              </p>
            ) : (
              <p className="mt-3 text-[10px] uppercase tracking-widest text-text-secondary">
                上次訓練：—
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

      {/* ===== 有氧區（E-02：列表＋刪除＋圖表＋新增＋總熱量卡） ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="mt-8"
      >
        <SectionHeader
          title="有氧"
          subtitle="跑步機、橢圓機、階梯機等機器讀數記錄"
          action={
            <button
              onClick={() => setCardioAddOpen(true)}
              className="text-xs uppercase tracking-wider text-accent font-bold flex items-center gap-1"
            >
              <Plus size={14} /> 新增
            </button>
          }
        />

        {/* 總熱量卡（E-D1/E-D2/E-D6） */}
        <Card className="p-4 mb-4 relative overflow-hidden border-auxiliary/25">
          <div className="absolute inset-0 bg-gradient-to-br from-auxiliary/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-auxiliary" />
              <div className="text-[10px] uppercase tracking-widest text-text-secondary">
                累積總熱量
              </div>
            </div>
            {totalEnergySummary.totalKcal !== null ? (
              <div className="flex items-baseline gap-2 flex-wrap">
                <div className="font-mono text-4xl font-bold text-text-primary">
                  ≈ {totalEnergySummary.totalKcal}
                </div>
                <div className="font-mono text-sm text-text-secondary">kcal</div>
                {(totalEnergySummary.cardioFallbackUsed ?? 0) > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-auxiliary/15 text-auxiliary uppercase tracking-widest">
                    含推估值
                  </span>
                )}
              </div>
            ) : (
              <div className="font-mono text-3xl font-bold text-text-secondary">— — kcal</div>
            )}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-border/40 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-1">
                  力量推估
                </div>
                <div className="font-mono text-text-primary">
                  {totalEnergySummary.strengthKcal === null ? '—' : `≈ ${totalEnergySummary.strengthKcal} kcal`}
                </div>
                {totalEnergySummary.strengthLocked && (
                  <p className="text-[11px] text-text-secondary mt-1">
                    尚未填入體重，無法估算。至設定輸入體重解鎖。
                  </p>
                )}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-1">
                  有氧
                </div>
                <div className="font-mono text-text-primary">
                  {totalEnergySummary.cardioKcal > 0 || totalEnergySummary.cardioUnsetCount === 0
                    ? `${totalEnergySummary.cardioKcal} kcal`
                    : '—'}
                </div>
                {totalEnergySummary.cardioUnsetCount > 0 && (
                  <p className="text-[11px] text-text-secondary mt-1">
                    {totalEnergySummary.cardioUnsetCount} 筆缺少體重無法推估
                  </p>
                )}
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-text-secondary flex gap-2">
              <Info size={12} className="flex-shrink-0 mt-0.5" />
              機器讀數與代謝估算皆約 ±15–20% 誤差，僅供方向參考；熱量為衍生值，不會被儲存。
            </p>
          </div>
        </Card>

        {/* 週有氧分鐘長條（Recharts，§4.3） */}
        <Card className="p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-display text-xl tracking-wide uppercase text-text-primary">
                每週有氧分鐘
              </div>
              <p className="text-xs text-text-secondary">近 8 週累計（含今週）</p>
            </div>
            <Badge variant="auxiliary">{cardioWeeklyMinutes.reduce((s, w) => s + w.minutes, 0).toFixed(0)} 分</Badge>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cardioWeeklyMinutes} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="var(--border-color)" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="week" stroke="var(--text-secondary)" tick={{ fontSize: 9, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--text-secondary)' }} formatter={(v: number) => [`${v.toFixed(0)} 分`, '有氧分鐘']} />
                <Bar dataKey="minutes" radius={[3, 3, 0, 0]} maxBarSize={30}>
                  {cardioWeeklyMinutes.map((_, i) => (
                    <Cell key={i} fill={WEEK_COLORS[i % WEEK_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 有氧 vs 力量時間圓餅 */}
        <Card className="p-4 mb-4">
          <div className="font-display text-xl tracking-wide uppercase text-text-primary mb-1">
            有氧 vs 力量 時間占比
          </div>
          <p className="text-xs text-text-secondary mb-3">以累計訓練分鐘計</p>
          {timeSplitPie.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-text-secondary">
              尚無紀錄，開始你的第一組或第一次有氧吧
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={timeSplitPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={2}
                  >
                    <Cell fill="var(--accent)" />
                    <Cell fill="var(--auxiliary)" />
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: 'var(--text-secondary)' }}
                    formatter={(v: number) => [`${v} 分`, '時間']}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* 有氧列表（可刪除） */}
        <Card className="divide-y divide-border/40 overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div>
              <div className="font-display text-xl tracking-wide uppercase text-text-primary">
                有氧紀錄
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                {cardioSorted.length === 0 ? '尚未記錄有氧' : `${cardioSorted.length} 筆紀錄`}
              </p>
            </div>
            <Button size="sm" variant="ghost" className="border border-border/40" onClick={() => setCardioAddOpen(true)}>
              <Plus size={14} /> 新增
            </Button>
          </div>
          {cardioSorted.length === 0 ? (
            <div className="p-10 text-center text-text-secondary text-sm">
              <Activity size={28} className="mx-auto mb-2 opacity-50" />
              尚未有有氧紀錄，點擊右上新增
            </div>
          ) : (
            cardioSorted.map((c: CardioSession) => {
              const r = estimateCardioKcal(c.machine, c.durationMin, profile.bodyWeight, c.kcal);
              return (
                <div key={c.id} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-auxiliary/15 text-auxiliary flex items-center justify-center flex-shrink-0">
                    <Activity size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="text-sm font-bold text-text-primary truncate">
                        {CARDIO_MACHINE_LABELS[c.machine]}
                      </div>
                      {r.source === 'fallback' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-auxiliary/15 text-auxiliary uppercase tracking-widest">
                          推估
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[11px] text-text-secondary">
                      {formatDate(c.date)} · {c.durationMin} 分鐘
                      {typeof c.distanceKm === 'number' && c.distanceKm > 0 ? ` · ${c.distanceKm} km` : ''}
                      {typeof c.avgHr === 'number' && c.avgHr > 0 ? ` · 心率 ${Math.round(c.avgHr)}` : ''}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-sm font-bold text-text-primary">
                      {r.kcal === null ? '—' : `${r.kcal} kcal`}
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('確認刪除這筆有氧紀錄？')) deleteCardio(c.id);
                      }}
                      className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-text-secondary hover:text-auxiliary transition-colors"
                      aria-label="刪除這筆有氧"
                    >
                      <Trash2 size={11} /> 刪除
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </Card>
      </motion.div>

      {/* 有氧新增表單（與 Dashboard 同款，這邊保持最小獨立） */}
      <CardioAddForm
        open={cardioAddOpen}
        onClose={() => setCardioAddOpen(false)}
        onSubmit={(payload) => { addCardio(payload); setCardioAddOpen(false); }}
      />
    </PageShell>
  );
}

const CARDIO_MACHINE_LABELS: Record<CardioMachine, string> = {
  treadmill: '跑步機',
  stair: '階梯機',
  elliptical: '橢圓機',
  bike: '腳踏車',
  rower: '划船機',
  other: '其他有氧',
};

// tooltip 樣式（§4.3 長條/圓餅圖，以及下方訓練量圖表共用）


interface CardioFormPayload {
  date?: string;
  machine: CardioMachine;
  durationMin: number;
  kcal?: number | null;
  avgHr?: number | null;
  distanceKm?: number | null;
}
interface CardioFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (p: CardioFormPayload) => void;
}
function CardioAddForm({ open, onClose, onSubmit }: CardioFormProps) {
  const [machine, setMachine] = useState<CardioMachine>('treadmill');
  const [durationMin, setDurationMin] = useState('');
  const [kcal, setKcal] = useState('');
  const [avgHr, setAvgHr] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [err, setErr] = useState('');
  const reset = () => {
    setMachine('treadmill');
    setDurationMin('');
    setKcal('');
    setAvgHr('');
    setDistanceKm('');
    setErr('');
  };
  const close = () => { reset(); onClose(); };
  const submit = () => {
    const dm = parseFloat(durationMin);
    if (!(dm > 0)) { setErr('請輸入有氧時長（分鐘）'); return; }
    onSubmit({
      machine,
      durationMin: dm,
      kcal: kcal.trim() ? parseFloat(kcal) : null,
      avgHr: avgHr.trim() ? parseFloat(avgHr) : null,
      distanceKm: distanceKm.trim() ? parseFloat(distanceKm) : null,
    });
    reset();
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-md bg-bg-primary rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl border border-border/40 animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-2xl tracking-wide uppercase text-text-primary">
              記錄有氧
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">填入機器讀數，kcal 可選</p>
          </div>
          <button onClick={close} className="text-text-secondary hover:text-text-primary" aria-label="關閉">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-1">器材</div>
            <div className="grid grid-cols-3 gap-2">
              {(['treadmill','stair','elliptical','bike','rower','other'] as CardioMachine[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMachine(v)}
                  className={cn(
                    'px-2 py-2 rounded-button text-xs font-bold border transition-colors',
                    machine === v
                      ? 'bg-accent/15 text-accent border-accent/50'
                      : 'bg-bg-secondary text-text-secondary border-border/40 hover:text-text-primary',
                  )}
                >
                  {CARDIO_MACHINE_LABELS[v]}
                </button>
              ))}
            </div>
          </label>
          <label className="block">
            <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-1">時長（分鐘） *</div>
            <input type="number" min={0.5} step={0.5} inputMode="decimal" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} placeholder="例如 30"
              className="w-full bg-bg-secondary rounded-button px-3 py-2 text-text-primary font-mono border border-border/40 focus:border-accent focus:outline-none" />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="block">
              <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-1">kcal（選填）</div>
              <input type="number" min={0} step={1} inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="250"
                className="w-full bg-bg-secondary rounded-button px-3 py-2 text-text-primary font-mono border border-border/40 focus:border-accent focus:outline-none" />
            </label>
            <label className="block">
              <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-1">心率（選填）</div>
              <input type="number" min={0} step={1} inputMode="numeric" value={avgHr} onChange={(e) => setAvgHr(e.target.value)} placeholder="135"
                className="w-full bg-bg-secondary rounded-button px-3 py-2 text-text-primary font-mono border border-border/40 focus:border-accent focus:outline-none" />
            </label>
            <label className="block">
              <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-1">km（選填）</div>
              <input type="number" min={0} step={0.1} inputMode="decimal" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} placeholder="3.2"
                className="w-full bg-bg-secondary rounded-button px-3 py-2 text-text-primary font-mono border border-border/40 focus:border-accent focus:outline-none" />
            </label>
          </div>
          {err && <p className="text-[11px] text-auxiliary">{err}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <Button variant="ghost" onClick={close}>取消</Button>
          <Button onClick={submit}>記錄</Button>
        </div>
      </div>
    </div>
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
