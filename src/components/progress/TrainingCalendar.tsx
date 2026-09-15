/**
 * T6 / T7 月曆（Training Calendar）
 *
 * Progress 頁月曆網格；點某天彈出訓練詳情。
 * 顯示規則：
 *   - planSnapshot 存在 → 顯示 dayName（如「PPL · 拉日 B」）
 *   - imported=true → 顯示「歷史記錄」
 *   - 兩者皆無 → 顯示「自由訓練」
 *
 * T7 修復：
 *   - date key 歸一化（sessionMap 與格子 key 皆用 dayKey）
 *   - 格子內顯示計畫日縮寫（9px）
 */
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Dumbbell, Pencil, Trash2, CalendarPlus } from 'lucide-react';
import { Card, Badge, StatTile } from '@/components/ui/Card';
import { useWorkoutStore } from '@/store/workoutStore';
import { calculateTotalVolume, getSessionPRs, formatDateFull } from '@/utils/workout';
import { dayKey, sessionDayKey } from '@/utils/time';
import { OVERLAY_SCRIM } from '@/data/theme';
import { settleAll } from '@/features/stats/settleAll';
import { buildSessionGCalUrl } from '@/utils/googleCalendar';
import { useProfileStore } from '@/store/profileStore';
import { useTelemetryStore } from '@/features/partner/stores/telemetryStore';
import type { WorkoutSession } from '@/types';
import { DaySessionEditor } from './DaySessionEditor';

interface TrainingCalendarProps {
  year: number;
  month: number; // 0-11
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

/** 取計畫日縮寫（格子內 9px 顯示） */
function getDayAbbrev(session: WorkoutSession): string {
  if (session.imported) return '歷史';
  if (session.planSnapshot?.dayName) {
    const name = session.planSnapshot.dayName;
    // 「推 PUSH」→「推」；「拉 PULL」→「拉」；「腿 LEGS」→「腿」；其他→前两字
    const firstChar = name.charAt(0);
    if (firstChar === '推' || firstChar === '拉' || firstChar === '腿') return firstChar;
    return name.slice(0, 2);
  }
  return '自由';
}

export function TrainingCalendar({ year, month }: TrainingCalendarProps) {
  const sessions = useWorkoutStore((s) => s.sessions);
  const deletePastSession = useWorkoutStore((s) => s.deletePastSession);
  const getStreakDays = useWorkoutStore((s) => s.getStreakDays);
  const customExercises = useWorkoutStore((s) => s.customExercises);
  const bodyWeight = useProfileStore((s) => s.profile.bodyWeight);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // T9-1：DaySessionEditor 狀態
  const [editorDate, setEditorDate] = useState<string | null>(null);
  const [editorSession, setEditorSession] = useState<WorkoutSession | null>(null);
  // T9-3：同步 toast
  const [toast, setToast] = useState<string | null>(null);

  // T9-3：toast 自動消失
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // 日期 → session 映射（T7：dayKey 歸一化；同天多 session 取最後一筆）
  const sessionMap = useMemo(() => {
    const m = new Map<string, WorkoutSession>();
    for (const s of sessions) {
      const key = sessionDayKey(s.date);
      m.set(key, s); // 後寫覆蓋前寫 → 取最後一筆
    }
    return m;
  }, [sessions]);

  const todayKey = dayKey(new Date());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sunday

  const selectedSession = selectedDate ? sessionMap.get(selectedDate) ?? null : null;

  // T9-1：開啟 DaySessionEditor（補錄模式）
  const openEditorForEmpty = (dateStr: string) => {
    setEditorDate(dateStr);
    setEditorSession(null);
  };

  // T9-1：開啟 DaySessionEditor（跨輯模式）
  const openEditorForEdit = (session: WorkoutSession) => {
    setSelectedDate(null); // 關閉詳情 sheet
    setEditorSession(session);
    setEditorDate(sessionDayKey(session.date));
  };

  // T9-3：儲存後由呼叫端執行 settleAll（silent，無慶祝）+ toast 顯示 streak 同步
  const handleEditorSaved = () => {
    setEditorDate(null);
    setEditorSession(null);
    // L3：store actions 不 settle；此處（呼叫端）執行統一結算
    settleAll(undefined, { silent: true });
    const streak = getStreakDays();
    setToast(`已同步：連續 ${streak} 天`);
  };

  // T9-3：刪除後同樣執行 settleAll + toast
  const handleDelete = (sessionId: string) => {
    deletePastSession(sessionId);
    setSelectedDate(null);
    settleAll(undefined, { silent: true });
    const streak = getStreakDays();
    setToast(`已刪除，連續 ${streak} 天`);
  };

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
          // T7：格子 key 用 dayKey 歸一化
          const dateStr = dayKey(new Date(year, month, day));
          const session = sessionMap.get(dateStr);
          const isToday = dateStr === todayKey;
          const abbrev = session ? getDayAbbrev(session) : '';
          // T9-1：過去日或今天（含未記錄日）允許點擊補錄；未來日不可補錄
          const isPastOrToday = dateStr <= todayKey;

          return (
            <button
              key={day}
              onClick={() => {
                if (session) {
                  setSelectedDate(dateStr);
                } else if (isPastOrToday) {
                  openEditorForEmpty(dateStr);
                }
              }}
              className={`
                aspect-square flex flex-col items-center justify-center rounded text-xs font-mono transition-all gap-0.5
                ${session ? 'bg-accent/20 text-text-primary font-bold hover:bg-accent/30' : 'text-text-secondary'}
                ${!session && isPastOrToday ? 'hover:bg-bg-card cursor-pointer' : ''}
                ${isToday ? 'ring-1 ring-accent' : ''}
                ${session || isPastOrToday ? 'cursor-pointer' : 'cursor-default'}
              `}
            >
              <span>{day}</span>
              {abbrev && (
                <span className="text-[9px] leading-none opacity-70 truncate max-w-full">
                  {abbrev}
                </span>
              )}
              {/* T9-1：未記錄過去日顯示淡 + 號提示 */}
              {!session && isPastOrToday && (
                <span className="text-[8px] leading-none opacity-30">+</span>
              )}
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

                {/* T9-1/T9-2：跨輯入口 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditorForEdit(selectedSession)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs uppercase tracking-wider text-accent font-bold border border-accent/40 rounded-button hover:bg-accent/10 transition-colors"
                  >
                    <Pencil size={14} /> 編輯這天訓練
                  </button>
                  <button
                    onClick={() => {
                      const url = buildSessionGCalUrl(selectedSession, customExercises, bodyWeight);
                      useTelemetryStore.getState().log('google_calendar_export', { sessionId: selectedSession.id });
                      window.open(url, '_blank', 'noopener');
                    }}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs uppercase tracking-wider text-text-secondary font-bold border border-border/40 rounded-button hover:bg-bg-card transition-colors"
                    aria-label="同步到 Google Calendar"
                  >
                    <CalendarPlus size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('確認刪除這天的訓練記錄？刪除後進度會回退，但已解鎖的成就仍保留。')) {
                        handleDelete(selectedSession.id);
                      }
                    }}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs uppercase tracking-wider text-auxiliary font-bold border border-auxiliary/40 rounded-button hover:bg-auxiliary/10 transition-colors"
                    aria-label="刪除這天訓練"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* T9-1：DaySessionEditor（補錄／跨輯） */}
      <AnimatePresence>
        {editorDate && (
          <DaySessionEditor
            key={editorSession?.id ?? editorDate}
            date={editorDate}
            existingSession={editorSession}
            onClose={() => {
              setEditorDate(null);
              setEditorSession(null);
            }}
            onSaved={handleEditorSaved}
          />
        )}
      </AnimatePresence>

      {/* T9-3：同步 toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 bg-bg-card border border-border rounded-button shadow-card max-w-[90vw]"
          >
            <span className="text-xs text-text-primary font-medium">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
