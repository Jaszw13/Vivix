/**
 * T6 月曆（Training Calendar）
 *
 * Progress 頁月曆網格；點某天彈出訓練詳情。
 * 顯示規則：
 *   - planSnapshot 存在 → 顯示 dayName（如「PPL · 拉日 B」）
 *   - imported=true → 顯示「歷史記錄」
 *   - 兩者皆無 → 顯示「自由訓練」
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Dumbbell } from 'lucide-react';
import { Card, Badge, StatTile } from '@/components/ui/Card';
import { useWorkoutStore } from '@/store/workoutStore';
import { calculateTotalVolume, getSessionPRs, formatDateFull } from '@/utils/workout';
import { dayKey } from '@/utils/time';
import { OVERLAY_SCRIM } from '@/data/theme';
import type { WorkoutSession } from '@/types';

interface TrainingCalendarProps {
  year: number;
  month: number; // 0-11
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export function TrainingCalendar({ year, month }: TrainingCalendarProps) {
  const sessions = useWorkoutStore((s) => s.sessions);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 日期 → session 映射
  const sessionMap = useMemo(() => {
    const m = new Map<string, WorkoutSession>();
    for (const s of sessions) {
      m.set(s.date, s);
    }
    return m;
  }, [sessions]);

  const todayKey = dayKey(new Date());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sunday

  const selectedSession = selectedDate ? sessionMap.get(selectedDate) ?? null : null;

  return (
    <div>
      {/* 星期標題 */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] uppercase tracking-widest text-text-secondary py-1">
            {d}
          </div>
        ))}
      </div>

      {/* 日期網格 */}
      <div className="grid grid-cols-7 gap-1">
        {/* 前置空格 */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {/* 月內日期 */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const session = sessionMap.get(dateStr);
          const isToday = dateStr === todayKey;

          return (
            <button
              key={day}
              onClick={() => session && setSelectedDate(dateStr)}
              className={`
                aspect-square flex items-center justify-center rounded text-xs font-mono transition-all
                ${session ? 'bg-accent/20 text-text-primary font-bold hover:bg-accent/30' : 'text-text-secondary'}
                ${isToday ? 'ring-1 ring-accent' : ''}
                ${session ? 'cursor-pointer' : 'cursor-default'}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* 詳情 bottom sheet */}
      <AnimatePresence>
        {selectedSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: OVERLAY_SCRIM.background }}
            onClick={() => setSelectedDate(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[480px] bg-bg-primary rounded-t-card max-h-[70vh] overflow-y-auto scrollbar-hide"
            >
              {/* 拖把 */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>

              {/* 標題 */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <Dumbbell size={18} className="text-accent flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-display text-base tracking-wide uppercase text-text-primary">
                      {formatDateFull(selectedSession.date)}
                    </h3>
                    <p className="text-[10px] text-text-secondary mt-0.5">
                      {selectedSession.planSnapshot
                        ? selectedSession.planSnapshot.dayName
                        : selectedSession.imported
                          ? '歷史記錄'
                          : '自由訓練'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* 動作 chips */}
                {selectedSession.exercises.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSession.exercises.map((ex) => (
                      <Badge key={ex.id} variant="default">
                        {ex.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* 統計 */}
                <Card className="p-2 grid grid-cols-2 gap-1">
                  <StatTile
                    label="總噸數"
                    value={`${(calculateTotalVolume(selectedSession) / 1000).toFixed(1)}`}
                    unit="t"
                  />
                  <StatTile
                    label="PR 數"
                    value={getSessionPRs(selectedSession).length}
                  />
                </Card>

                {/* 動作列表 */}
                {selectedSession.exercises.length > 0 && (
                  <div className="space-y-2">
                    {selectedSession.exercises.map((ex) => {
                      const completedSets = ex.sets.filter((s) => s.completed);
                      if (completedSets.length === 0) return null;
                      return (
                        <div
                          key={ex.id}
                          className="flex items-center justify-between py-2 border-b last:border-0 border-border/40"
                        >
                          <div className="text-sm text-text-primary truncate min-w-0">
                            {ex.name}
                          </div>
                          <div className="font-mono text-xs text-text-secondary flex-shrink-0 ml-2">
                            {completedSets.map((s) =>
                              s.weight > 0
                                ? `${s.weight}×${s.reps}`
                                : `BW×${s.reps}`
                            ).join(' · ')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
