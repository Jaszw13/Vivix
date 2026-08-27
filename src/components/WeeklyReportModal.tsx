/**
 * T5 週報 Modal（bottom sheet）
 *
 * 顯示某週的訓練統計：次數／天數／噸數／vs 上週 %／PR／成就／streak／Partner 一句話。
 * 全派生不 persist（L2）；weeklyReportSeenWeek 只記「是否顯示過」防重複彈窗。
 */
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, X, Trophy, Flame, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, SectionHeader, StatTile, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useWorkoutStore } from '@/store/workoutStore';
import { useCardioStore } from '@/store/cardioStore';
import { useAchievementsStore } from '@/store/achievementsStore';
import { computeWeeklyReport, type AchievementUnlockRecord } from '@/features/stats/weeklyReport';
import { formatDateFull } from '@/utils/workout';
import { OVERLAY_SCRIM } from '@/data/theme';

interface WeeklyReportModalProps {
  open: boolean;
  onClose: () => void;
  weekOffset: number; // 初始週偏移；-1=上週（自動彈出用），0=本週
}

export function WeeklyReportModal({ open, onClose, weekOffset }: WeeklyReportModalProps) {
  const navigate = useNavigate();
  const sessions = useWorkoutStore((s) => s.sessions);
  const cardioSessions = useCardioStore((s) => s.sessions);
  const achievementsProgress = useAchievementsStore((s) => s.progress);
  // 內部可瀏覽歷週（初始 = prop；每次開啟重設）
  const [offset, setOffset] = useState(weekOffset);
  useEffect(() => {
    if (open) setOffset(weekOffset);
  }, [open, weekOffset]);

  const report = useMemo(() => {
    // 從 achievementsStore 派生解鎖紀錄（unlockedAt 為永久事實）
    const unlocks: AchievementUnlockRecord[] = Object.entries(achievementsProgress)
      .filter(([, p]) => p.unlockedAt)
      .map(([id, p]) => ({ id, unlockedAt: p.unlockedAt as string }));
    return computeWeeklyReport(sessions, cardioSessions, unlocks, offset);
  }, [sessions, cardioSessions, achievementsProgress, offset]);

  const weekLabel = `${formatDateFull(report.weekStart.toISOString())} – ${formatDateFull(
    addDaysISO(report.weekEnd.toISOString(), -1),
  )}`;

  const volumeT = report.totalVolume / 1000; // kg → ton
  const deltaStr = Number.isNaN(report.volumeDelta)
    ? '—'
    : `${report.volumeDelta > 0 ? '+' : ''}${report.volumeDelta.toFixed(0)}%`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: OVERLAY_SCRIM.background }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[480px] bg-bg-primary rounded-t-card max-h-[90vh] overflow-y-auto scrollbar-hide"
          >
            {/* 拖把 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* 標題 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2 min-w-0">
                <BarChart3 size={18} className="text-accent flex-shrink-0" />
                <div className="min-w-0">
                  <h2 className="font-display text-lg tracking-wide uppercase text-text-primary">
                    {offset === 0 ? '本週訓練報告' : offset === -1 ? '上週訓練報告' : '歷週訓練報告'}
                  </h2>
                  <p className="text-[10px] text-text-secondary mt-0.5">{weekLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setOffset((o) => o - 1)}
                  className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-accent transition-colors"
                  aria-label="上一週"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setOffset((o) => (o < 0 ? o + 1 : o))}
                  disabled={offset >= 0}
                  className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-accent transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  aria-label="下一週"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* 統計格 */}
              <Card className="p-2 grid grid-cols-2 gap-1">
                <StatTile label="訓練次數" value={report.sessionCount} />
                <StatTile label="訓練天數" value={report.trainingDays} />
                <StatTile label="總噸數" value={volumeT.toFixed(1)} unit="t" />
                <StatTile
                  label="vs 上週"
                  value={deltaStr}
                  highlight={!Number.isNaN(report.volumeDelta) && report.volumeDelta > 0}
                />
              </Card>

              {/* streak + 成就 */}
              <div className="grid grid-cols-2 gap-2">
                <Card className="p-3 flex items-center gap-2">
                  <Flame size={20} className="text-auxiliary flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-mono text-lg font-bold text-text-primary">
                      {report.streak}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-text-secondary">
                      連續天數
                    </div>
                  </div>
                </Card>
                <Card className="p-3 flex items-center gap-2">
                  <Trophy size={20} className="text-accent flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-mono text-lg font-bold text-text-primary">
                      {report.achievementsUnlocked.length}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-text-secondary">
                      本週解鎖
                    </div>
                  </div>
                </Card>
              </div>

              {/* 新紀錄（top 3） */}
              {report.prs.length > 0 && (
                <div>
                  <SectionHeader title="新紀錄" subtitle="本週刷新的個人紀錄" />
                  <Card className="p-3 border-accent/30">
                    {report.prs.slice(0, 3).map((pr) => (
                      <div
                        key={pr.exerciseId}
                        className="flex items-center justify-between py-2 border-b last:border-0 border-border/40"
                      >
                        <div className="text-sm font-bold text-text-primary truncate min-w-0">
                          {pr.exerciseName}
                        </div>
                        <div className="font-mono text-sm font-bold text-accent flex-shrink-0 ml-2">
                          {pr.repPR !== undefined
                            ? `BW × ${pr.repPR}`
                            : `${pr.weight}kg × ${pr.reps}`}
                        </div>
                      </div>
                    ))}
                  </Card>
                </div>
              )}

              {/* 最佳一舉 */}
              {report.topLift && report.topLift.estimated1RM > 0 && (
                <Card className="p-3 flex items-center gap-3 border-accent/30">
                  <TrendingUp size={20} className="text-accent flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-text-secondary">
                      最佳一舉
                    </div>
                    <div className="text-sm font-bold text-text-primary truncate">
                      {report.topLift.exerciseName}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-lg font-bold text-accent">
                      {report.topLift.estimated1RM}
                      <span className="text-xs ml-0.5 text-text-secondary">kg</span>
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-text-secondary">
                      1RM
                    </div>
                  </div>
                </Card>
              )}

              {/* 本週解鎖的成就 chips */}
              {report.achievementsUnlocked.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {report.achievementsUnlocked.map((a) => (
                    <Badge key={a.id} variant="accent">
                      {a.id}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Partner 一句話 */}
              <div className="bg-accent-soft border border-accent/30 rounded-card p-4">
                <p className="text-sm text-text-primary leading-relaxed">
                  {report.partnerMessage}
                </p>
              </div>

              {/* 操作 */}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    onClose();
                    navigate('/progress');
                  }}
                >
                  查看進度
                </Button>
                <Button className="flex-1" onClick={onClose}>
                  關閉
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** helper：ISO 字串加天數（不引入外部依賴） */
function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
