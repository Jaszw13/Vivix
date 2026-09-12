/**
 * T9-1：DaySessionEditor — 歷史補錄／跨輯訓練編輯器
 *
 * 由 TrainingCalendar 日 sheet「補錄／編輯這天訓練」按鈕觸發。
 *   - 無 existingSession → 補錄模式（建立過去日 session）
 *   - 有 existingSession → 跨輯模式（預填 + updatePastSession）
 *
 * 設計重點：
 *   - 本地 draft state（ExerciseLog[]），onChange 只改 draft → 不閃爍
 *   - 取消零寫入（不呼叫 store action）
 *   - 動作選擇：allExercises（含自訂）+ 預設我的器材過濾（toggle）
 *   - 每動作組數行：weight/reps 增減 + 增減組 + 刪除動作
 *   - 儲存時所有組預設 completed=true（補錄過去訓練自然為完成）
 *
 * L3：store actions（addPastSession/updatePastSession）內不 settle；
 *      settleAll 由呼叫端（TrainingCalendar）於儲存後執行（T9-3）。
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2, Search, Dumbbell, Save } from 'lucide-react';
import { Card, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useWorkoutStore, getAllExercises } from '@/store/workoutStore';
import { useProfileStore } from '@/store/profileStore';
import { getEquipmentTypesForIds } from '@/data/equipment';
import { generateId, createEmptySet, formatDateFull } from '@/utils/workout';
import { OVERLAY_SCRIM } from '@/data/theme';
import {
  MUSCLE_GROUP_LABELS,
  EQUIPMENT_TYPE_LABELS,
} from '@/types';
import type {
  WorkoutSession,
  ExerciseLog,
  SetLog,
  MuscleGroup,
  EquipmentType,
  Exercise,
} from '@/types';
import { cn } from '@/lib/utils';

interface DaySessionEditorProps {
  /** dayKey "YYYY-MM-DD" */
  date: string;
  /** 編輯模式預填的既有 session；null = 補錄模式 */
  existingSession?: WorkoutSession | null;
  onClose: () => void;
  /** 儲存成功後回呼（T9-3：呼叫端執行 settleAll + toast） */
  onSaved?: (session: WorkoutSession) => void;
}

/** 從 Exercise 定義建立草稿 ExerciseLog（預設 3 組空 set，completed=true） */
function buildDraftLogFromExercise(ex: Exercise): ExerciseLog {
  const sets: SetLog[] = Array.from({ length: 3 }, (_, i) => ({
    ...createEmptySet(i + 1),
    completed: true,
  }));
  return {
    id: generateId('ex'),
    exerciseId: ex.id,
    name: ex.name,
    muscleGroup: ex.muscleGroup,
    equipmentType: ex.equipmentType,
    sets,
  };
}

/** 從既有 session 的 ExerciseLog 複製為可編輯草稿（深拷貝 sets） */
function cloneDraftLog(log: ExerciseLog): ExerciseLog {
  return {
    ...log,
    id: generateId('ex'),
    sets: log.sets.map((s) => ({ ...s })),
  };
}

export function DaySessionEditor({ date, existingSession, onClose, onSaved }: DaySessionEditorProps) {
  const isEdit = !!existingSession;
  const addPastSession = useWorkoutStore((s) => s.addPastSession);
  const updatePastSession = useWorkoutStore((s) => s.updatePastSession);
  const allExercises = getAllExercises();
  const gymEquipmentIds = useProfileStore((s) => s.gymEquipmentIds);

  // 本地草稿（T9-1：受控輸入只改 draft，不觸發 store 寫入）
  const [draft, setDraft] = useState<ExerciseLog[]>(() =>
    existingSession ? existingSession.exercises.map(cloneDraftLog) : [],
  );

  // Picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerFilter, setPickerFilter] = useState<MuscleGroup | 'all'>('all');
  const [pickerEquip, setPickerEquip] = useState<EquipmentType | 'all'>('all');
  const [pickerGymOnly, setPickerGymOnly] = useState(gymEquipmentIds.length > 0);

  const gymEquipmentTypes = useMemo(
    () => new Set(getEquipmentTypesForIds(gymEquipmentIds)),
    [gymEquipmentIds],
  );

  // 已在草稿中的 exerciseId 集合（避免重複加入）
  const draftExerciseIds = useMemo(() => new Set(draft.map((d) => d.exerciseId)), [draft]);

  const filteredExercises = useMemo(() => {
    return allExercises.filter((e) => {
      if (draftExerciseIds.has(e.id)) return false;
      if (pickerQuery && !e.name.toLowerCase().includes(pickerQuery.toLowerCase())) return false;
      if (pickerFilter !== 'all' && e.muscleGroup !== pickerFilter) return false;
      if (pickerEquip !== 'all' && e.equipmentType !== pickerEquip) return false;
      // T9-1：預設只顯示我的器材
      if (pickerGymOnly && gymEquipmentIds.length > 0 && !gymEquipmentTypes.has(e.equipmentType)) return false;
      return true;
    });
  }, [allExercises, draftExerciseIds, pickerQuery, pickerFilter, pickerEquip, pickerGymOnly, gymEquipmentIds, gymEquipmentTypes]);

  // ----- Draft mutations（純本地，不寫 store）-----
  const addExercise = (ex: Exercise) => {
    setDraft((prev) => [...prev, buildDraftLogFromExercise(ex)]);
    setPickerOpen(false);
    setPickerQuery('');
  };

  const removeExercise = (logId: string) => {
    setDraft((prev) => prev.filter((d) => d.id !== logId));
  };

  const addSet = (logId: string) => {
    setDraft((prev) =>
      prev.map((d) =>
        d.id === logId
          ? { ...d, sets: [...d.sets, { ...createEmptySet(d.sets.length + 1), completed: true }] }
          : d,
      ),
    );
  };

  const removeSet = (logId: string, setId: string) => {
    setDraft((prev) =>
      prev.map((d) => {
        if (d.id !== logId) return d;
        const nextSets = d.sets.filter((s) => s.id !== setId).map((s, i) => ({ ...s, setNumber: i + 1 }));
        return { ...d, sets: nextSets };
      }),
    );
  };

  const updateSet = (logId: string, setId: string, patch: Partial<SetLog>) => {
    setDraft((prev) =>
      prev.map((d) =>
        d.id === logId
          ? { ...d, sets: d.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }
          : d,
      ),
    );
  };

  // ----- 儲存 -----
  const canSave = draft.length > 0 && draft.every((d) => d.sets.length > 0 && d.sets.some((s) => s.reps > 0));
  const handleSave = () => {
    if (!canSave) return;
    // 補錄的組數預設 completed=true；保險起見再次標記
    const cleanLogs: ExerciseLog[] = draft.map((d) => ({
      ...d,
      sets: d.sets.map((s) => ({ ...s, completed: true })),
    }));

    if (isEdit && existingSession) {
      updatePastSession(existingSession.id, { exercises: cleanLogs });
      onSaved?.({ ...existingSession, exercises: cleanLogs });
    } else {
      const session = addPastSession(date, cleanLogs);
      onSaved?.(session);
    }
    onClose();
  };

  const handleCancel = () => {
    // 取消零寫入（draft 未 commit 到 store）
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-end justify-center"
        style={{ background: OVERLAY_SCRIM.background }}
        onClick={handleCancel}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[480px] bg-bg-primary rounded-t-card max-h-[85vh] overflow-y-auto scrollbar-hide flex flex-col"
        >
          {/* 拖把 */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* 標題 */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Dumbbell size={18} className="text-accent flex-shrink-0" />
              <div className="min-w-0">
                <h3 className="font-display text-base tracking-wide uppercase text-text-primary">
                  {formatDateFull(date)}
                </h3>
                <p className="text-[10px] text-text-secondary mt-0.5">
                  {isEdit ? '編輯這天訓練' : '補錄這天訓練'}
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
              aria-label="關閉"
            >
              <X size={18} />
            </button>
          </div>

          {/* 內容 */}
          <div className="px-5 py-4 space-y-3 flex-1 overflow-y-auto">
            {/* 動作列表 */}
            {draft.length === 0 ? (
              <div className="py-8 text-center">
                <Dumbbell size={28} className="mx-auto mb-2 text-text-secondary opacity-50" />
                <p className="text-sm text-text-secondary">尚未加入動作</p>
                <p className="text-[11px] text-text-secondary/70 mt-1">
                  點下方「加入動作」開始補錄這天的訓練
                </p>
              </div>
            ) : (
              draft.map((log) => (
                <Card key={log.id} className="p-3">
                  {/* 動作標題列 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-text-primary truncate">{log.name}</span>
                        {gymEquipmentTypes.has(log.equipmentType ?? 'other') && (
                          <Badge variant="accent" className="flex-shrink-0 !text-[8px] !px-1.5 !py-0">
                            我的
                          </Badge>
                        )}
                      </div>
                      <div className="text-[9px] uppercase tracking-widest text-text-secondary mt-0.5">
                        {log.muscleGroup ? MUSCLE_GROUP_LABELS[log.muscleGroup] : '未分類'}
                        {log.equipmentType && ` · ${EQUIPMENT_TYPE_LABELS[log.equipmentType]}`}
                      </div>
                    </div>
                    <button
                      onClick={() => removeExercise(log.id)}
                      className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-auxiliary transition-colors flex-shrink-0"
                      aria-label="刪除動作"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* 標題列 */}
                  <div className="grid grid-cols-[1.5rem_1fr_1fr_1.5rem] gap-2 px-1 mb-1.5 text-[9px] uppercase tracking-widest text-text-secondary">
                    <div className="text-center">#</div>
                    <div className="text-center">重量 kg</div>
                    <div className="text-center">次數</div>
                    <div className="text-center" />
                  </div>

                  {/* 組數行 */}
                  <div className="flex flex-col gap-1.5">
                    {log.sets.map((set) => (
                      <div key={set.id} className="grid grid-cols-[1.5rem_1fr_1fr_1.5rem] gap-2 items-center">
                        <div className="font-mono text-xs text-text-secondary text-center">{set.setNumber}</div>
                        <NumberInput
                          value={set.weight}
                          step={2.5}
                          onDecrease={() => updateSet(log.id, set.id, { weight: Math.max(0, set.weight - 2.5) })}
                          onIncrease={() => updateSet(log.id, set.id, { weight: set.weight + 2.5 })}
                          onChange={(v) => updateSet(log.id, set.id, { weight: v })}
                        />
                        <NumberInput
                          value={set.reps}
                          step={1}
                          onDecrease={() => updateSet(log.id, set.id, { reps: Math.max(0, set.reps - 1) })}
                          onIncrease={() => updateSet(log.id, set.id, { reps: set.reps + 1 })}
                          onChange={(v) => updateSet(log.id, set.id, { reps: v })}
                        />
                        <button
                          onClick={() => removeSet(log.id, set.id)}
                          className="w-6 h-6 mx-auto flex items-center justify-center text-text-secondary hover:text-auxiliary transition-colors"
                          aria-label="刪除組"
                        >
                          <Minus size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => addSet(log.id)}
                    className="w-full mt-2 py-1.5 text-[10px] uppercase tracking-wider text-text-secondary hover:text-accent border border-dashed border-border rounded-button transition-colors"
                  >
                    + 新增組
                  </button>
                </Card>
              ))
            )}

            {/* 加入動作按鈕 */}
            <button
              onClick={() => {
                setPickerQuery('');
                setPickerFilter('all');
                setPickerEquip('all');
                setPickerGymOnly(gymEquipmentIds.length > 0);
                setPickerOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-xs uppercase tracking-wider text-accent font-bold border border-accent/40 rounded-button hover:bg-accent/10 transition-colors"
            >
              <Plus size={14} /> 加入動作
            </button>

            {/* Picker */}
            <AnimatePresence>
              {pickerOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 bg-bg-secondary rounded-2xl border border-border/40">
                    {/* 搜尋框 */}
                    <div className="relative mb-2">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
                      <input
                        type="text"
                        value={pickerQuery}
                        onChange={(e) => setPickerQuery(e.target.value)}
                        placeholder="搜尋內建或自訂動作…"
                        className="w-full h-9 pl-8 pr-3 bg-bg-card rounded-button border border-border text-xs text-text-primary placeholder:text-text-secondary focus:border-accent transition-colors"
                      />
                    </div>
                    {/* 我的器材 toggle */}
                    {gymEquipmentIds.length > 0 && (
                      <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-[10px] uppercase tracking-widest text-text-secondary">
                          只顯示我的器材
                        </span>
                        <button
                          onClick={() => setPickerGymOnly(!pickerGymOnly)}
                          className={cn(
                            'h-5 w-9 rounded-full relative transition-colors',
                            pickerGymOnly ? 'bg-accent' : 'bg-border',
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-bg-card transition-transform',
                              pickerGymOnly && 'translate-x-4',
                            )}
                          />
                        </button>
                      </div>
                    )}
                    {/* 部位 filter */}
                    <div className="flex gap-1.5 mb-1.5 overflow-x-auto scrollbar-hide">
                      <button
                        onClick={() => setPickerFilter('all')}
                        className={cn(
                          'px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap',
                          pickerFilter === 'all' ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-secondary',
                        )}
                      >
                        全部
                      </button>
                      {(['chest', 'back', 'legs', 'shoulders', 'arms', 'core'] as MuscleGroup[]).map((g) => (
                        <button
                          key={g}
                          onClick={() => setPickerFilter(g)}
                          className={cn(
                            'px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap',
                            pickerFilter === g ? 'bg-accent text-bg-primary' : 'bg-bg-card text-text-secondary',
                          )}
                        >
                          {MUSCLE_GROUP_LABELS[g]}
                        </button>
                      ))}
                    </div>
                    {/* 器械 filter */}
                    <div className="flex gap-1.5 mb-2 overflow-x-auto scrollbar-hide">
                      <button
                        onClick={() => setPickerEquip('all')}
                        className={cn(
                          'px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap',
                          pickerEquip === 'all' ? 'bg-accent/80 text-bg-primary' : 'bg-bg-card/60 text-text-secondary',
                        )}
                      >
                        全器械
                      </button>
                      {(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'other'] as EquipmentType[]).map((eq) => (
                        <button
                          key={eq}
                          onClick={() => setPickerEquip(eq)}
                          className={cn(
                            'px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap',
                            pickerEquip === eq ? 'bg-accent/80 text-bg-primary' : 'bg-bg-card/60 text-text-secondary',
                          )}
                        >
                          {EQUIPMENT_TYPE_LABELS[eq]}
                        </button>
                      ))}
                    </div>
                    {/* 動作列表 */}
                    <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
                      {filteredExercises.length === 0 && (
                        <div className="py-5 text-center text-[11px] text-text-secondary/70">
                          找不到符合的動作
                        </div>
                      )}
                      {filteredExercises.map((ex) => (
                        <button
                          key={ex.id}
                          onClick={() => addExercise(ex)}
                          className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-bg-card text-left"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs text-text-primary truncate">{ex.name}</span>
                            {ex.isCustom && (
                              <Badge variant="auxiliary" className="flex-shrink-0 !text-[8px] !px-1.5 !py-0">
                                自訂
                              </Badge>
                            )}
                            {gymEquipmentTypes.has(ex.equipmentType) && (
                              <Badge variant="accent" className="flex-shrink-0 !text-[8px] !px-1.5 !py-0">
                                我的
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[8px] text-text-secondary uppercase">{MUSCLE_GROUP_LABELS[ex.muscleGroup]}</span>
                            <span className="text-[8px] text-text-secondary uppercase opacity-60">· {EQUIPMENT_TYPE_LABELS[ex.equipmentType]}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 底部操作列 */}
          <div className="px-5 py-3 border-t border-border flex gap-2 flex-shrink-0 bg-bg-primary sticky bottom-0">
            <Button variant="ghost" onClick={handleCancel} className="flex-1">
              取消
            </Button>
            <Button onClick={handleSave} disabled={!canSave} className="flex-1">
              <Save size={14} /> {isEdit ? '儲存變更' : '儲存補錄'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

interface NumberInputProps {
  value: number;
  step?: number;
  onChange: (v: number) => void;
  onIncrease: () => void;
  onDecrease: () => void;
}

function NumberInput({ value, onChange, onIncrease, onDecrease }: NumberInputProps) {
  return (
    <div className="flex items-center bg-bg-secondary rounded-button overflow-hidden">
      <button
        onClick={onDecrease}
        className="w-7 h-9 flex items-center justify-center text-text-secondary hover:text-accent flex-shrink-0"
      >
        <Minus size={12} />
      </button>
      <input
        type="number"
        value={value === 0 ? '' : value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          onChange(isNaN(v) ? 0 : v);
        }}
        className="w-full h-9 bg-transparent text-center font-mono text-xs text-text-primary tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        inputMode="decimal"
      />
      <button
        onClick={onIncrease}
        className="w-7 h-9 flex items-center justify-center text-text-secondary hover:text-accent flex-shrink-0"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}
