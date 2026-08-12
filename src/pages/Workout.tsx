import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, Plus, Timer, X, Play, Flame, RefreshCw, Edit3,
} from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { Card, Badge } from '@/components/ui/Card';
import { ExerciseSetList } from '@/components/workout/ExerciseSetList';
import { RestTimer } from '@/components/workout/RestTimer';
import {
  useWorkoutStore,
  getAllExercises,
  type CustomExercise,
} from '@/store/workoutStore';
import { useEquipmentMemoryStore } from '@/store/equipmentMemoryStore';
import {
  exercises as builtinExercises,
  exerciseCategories,
} from '@/data/exercises';
import { getPlanById } from '@/data/plans';
import { formatDuration } from '@/utils/workout';
import type {
  ExerciseCategory, WarmupItem, MuscleGroup, EquipmentType,
  PlannedExercise, Exercise,
} from '@/types';
import {
  CATEGORY_LABELS, EQUIPMENT_TYPE_LABELS,
  MUSCLE_GROUP_OPTIONS, EQUIPMENT_TYPE_OPTIONS,
} from '@/types';
import { cn } from '@/lib/utils';

const WARMUP_TYPE_LABELS: Record<WarmupItem['type'], { label: string; color: string }> = {
  dynamic: { label: '動態伸展', color: 'accent' },
  lightSet: { label: '輕重量暖身', color: 'auxiliary' },
  general: { label: '一般熱身', color: 'default' },
};

export default function Workout() {
  const navigate = useNavigate();
  const {
    activeSession,
    startEmptySession,
    finishSession,
    clearActiveSession,
    addExerciseToActive,
    toggleWarmupCompleted,
    substituteExerciseInActive,
  } = useWorkoutStore();

  const [showTimer, setShowTimer] = useState(false);
  const [timerPresetSec, setTimerPresetSec] = useState<number | undefined>(undefined);
  const [elapsed, setElapsed] = useState(0);
  const [showAddExercise, setShowAddExercise] = useState(false);
  // T-04：替換彈窗
  const [substituteTarget, setSubstituteTarget] = useState<{
    exerciseLogId: string;
    currentExerciseId: string;
    muscleGroup: MuscleGroup;
    currentEquipmentType?: EquipmentType;
  } | null>(null);

  // 完成訓練後，同步寫入器械記憶（T-06）
  const updateFromSession = useEquipmentMemoryStore((s) => s.updateFromSession);

  useEffect(() => {
    if (!activeSession) {
      startEmptySession();
    }
  }, [activeSession, startEmptySession]);

  useEffect(() => {
    if (!activeSession) return;
    const startTime = new Date(activeSession.date).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const warmupItems = useMemo<WarmupItem[]>(() => {
    if (!activeSession?.planId || !activeSession.dayId) return [];
    const plan = getPlanById(activeSession.planId);
    if (!plan) return [];
    const day = plan.days.find((d) => d.id === activeSession.dayId);
    return day?.warmup ?? [];
  }, [activeSession?.planId, activeSession?.dayId]);

  const warmupDoneIds = activeSession?.warmupCompletedIds ?? [];
  const warmupDoneCount = warmupItems.filter((w) => warmupDoneIds.includes(w.id)).length;
  const warmupAllDone = warmupItems.length > 0 && warmupDoneCount === warmupItems.length;
  const showWorkSection = warmupItems.length === 0 || warmupAllDone;

  if (!activeSession) {
    return (
      <PageShell title="訓練中" showBack showNav={false}>
        <div className="text-center text-text-secondary mt-20">載入中…</div>
      </PageShell>
    );
  }

  const handleFinish = () => {
    const finished = finishSession();
    if (finished) {
      updateFromSession(finished); // T-06：更新器械記憶／usageCount／PB
      navigate('/workout/summary', { state: { session: finished } });
    }
  };

  const handleExit = () => {
    if (window.confirm('放棄這次訓練？記錄將不會儲存。')) {
      clearActiveSession();
      navigate('/');
    }
  };

  const openWarmupTimer = (seconds: number) => {
    if (seconds <= 0) return;
    setTimerPresetSec(seconds);
    setShowTimer(true);
  };

  const buildPlannedExercise = (exerciseId: string, name: string): PlannedExercise => {
    const all = getAllExercises();
    const ex = all.find((e) => e.id === exerciseId);
    const mg: MuscleGroup = (ex?.muscleGroup as MuscleGroup) ?? 'chest';
    const et: EquipmentType = ex?.equipmentType ?? 'other';
    return {
      id: `pe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      exerciseId,
      name: ex?.name ?? name,
      snapshot: {
        name: ex?.name ?? name,
        muscleGroup: mg,
        equipmentType: et,
      },
      targetSets: 3,
      targetReps: '8-12',
      alternativeIds: builtinExercises
        .filter((e) => e.muscleGroup === mg && e.id !== exerciseId)
        .slice(0, 4)
        .map((e) => e.id),
    };
  };

  return (
    <PageShell
      title="訓練中"
      showNav={false}
      noPadding
      rightAction={
        <div className="flex items-center gap-3 pr-1">
          <div className="font-mono text-sm text-accent tabular-nums">
            {formatDuration(elapsed)}
          </div>
          <button
            onClick={handleExit}
            className="w-9 h-9 flex items-center justify-center text-text-secondary hover:text-auxiliary"
            aria-label="放棄訓練"
          >
            <X size={22} />
          </button>
        </div>
      }
    >
      <div className="px-4 py-4 flex-1 flex flex-col">
        {/* 訓練資訊 */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="text-[10px] uppercase tracking-widest text-text-secondary">
            {activeSession.planName ?? '自由訓練'}
          </div>
          <h1 className="font-display text-3xl tracking-wide uppercase text-text-primary">
            {activeSession.dayName ?? '今日訓練'}
          </h1>
        </motion.div>

        {/* 熱身區塊（N1） */}
        {warmupItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 }}
            className="mb-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Flame size={14} className="text-accent" />
                <span className="text-[11px] uppercase tracking-widest text-text-secondary">
                  熱身 · {warmupDoneCount}/{warmupItems.length}
                </span>
              </div>
              {!warmupAllDone && (
                <button
                  onClick={() => {
                    if (window.confirm('跳過熱身，直接進入工作組？')) {
                      warmupItems.forEach((w) => {
                        if (!warmupDoneIds.includes(w.id)) toggleWarmupCompleted(w.id);
                      });
                    }
                  }}
                  className="text-[10px] text-text-secondary hover:text-auxiliary underline underline-offset-2"
                >
                  跳過
                </button>
              )}
            </div>

            <div className="h-1 w-full bg-border/60 rounded-full mb-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(warmupDoneCount / warmupItems.length) * 100}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-accent to-auxiliary"
              />
            </div>

            <div className="flex flex-col gap-2">
              {warmupItems.map((item, idx) => {
                const done = warmupDoneIds.includes(item.id);
                const t = WARMUP_TYPE_LABELS[item.type];
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                  >
                    <Card
                      className={`p-3 border transition-colors ${
                        done
                          ? 'border-accent/40 bg-accent/5'
                          : 'border-border/50 bg-bg-card hover:border-border'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleWarmupCompleted(item.id)}
                          aria-label={done ? '標記未完成' : '標記完成'}
                          className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            done
                              ? 'bg-accent border-accent text-bg-primary'
                              : 'border-text-secondary/40 text-transparent hover:border-accent'
                          }`}
                        >
                          <Check size={14} strokeWidth={3.5} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={t.color as 'accent' | 'auxiliary' | 'default'}>
                              {t.label}
                            </Badge>
                            <h3 className="font-bold text-sm text-text-primary">
                              {item.name}
                            </h3>
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed">
                            {item.description}
                          </p>
                          {item.dosage && (
                            <p className="mt-1 text-[11px] text-accent font-mono">
                              建議：{item.dosage}
                            </p>
                          )}
                        </div>
                        {item.durationSec > 0 && (
                          <button
                            onClick={() => openWarmupTimer(item.durationSec)}
                            className="w-9 h-9 flex-shrink-0 rounded-full bg-accent-soft text-accent flex items-center justify-center hover:bg-accent/20 transition-colors"
                            aria-label="啟動計時器"
                          >
                            <Play size={14} className="ml-0.5" />
                          </button>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* 工作組入口提示 */}
        {warmupItems.length > 0 && !warmupAllDone && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-[11px] text-text-secondary py-2 mb-2"
          >
            完成熱身後就可以進入工作組，保護自己避免受傷 🛡️
          </motion.div>
        )}

        {/* 動作列表（工作組） */}
        <AnimatePresence mode="wait">
          {showWorkSection && (
            <motion.div
              key="work-section"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-col gap-3 flex-1"
            >
              <AnimatePresence>
                {activeSession.exercises.map((ex, i) => (
                  <motion.div
                    key={ex.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <ExerciseSetList
                      exercise={ex}
                      onSetCompleted={() => {
                        setTimerPresetSec(undefined);
                        setShowTimer(true);
                      }}
                      onSubstitute={() => {
                        const found = getAllExercises().find((e) => e.id === ex.exerciseId);
                        const mg = (ex.muscleGroup as MuscleGroup) ??
                          (found?.muscleGroup as MuscleGroup) ??
                          'chest';
                        const eq = (ex.equipmentType as EquipmentType) ?? found?.equipmentType;
                        setSubstituteTarget({
                          exerciseLogId: ex.id,
                          currentExerciseId: ex.exerciseId,
                          muscleGroup: mg,
                          currentEquipmentType: eq,
                        });
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              {activeSession.exercises.length === 0 && (
                <Card className="p-8 text-center">
                  <p className="text-sm text-text-secondary mb-4">
                    尚未加入任何動作
                  </p>
                  <Button onClick={() => setShowAddExercise(true)}>
                    <Plus size={16} /> 新增動作
                  </Button>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 底部操作 */}
      <div className="sticky bottom-0 -mx-4 px-2 pt-3 pb-4 bg-gradient-to-t from-bg-primary via-bg-primary to-transparent">
        <div className="flex gap-2 w-full">
          <Button
            variant="secondary"
            className="flex-1 h-14 px-2"
            onClick={() => setShowAddExercise(true)}
            disabled={!showWorkSection}
          >
            <Plus size={18} />
            <span className="text-xs">增加動作</span>
          </Button>
          <Button
            variant="secondary"
            className="w-14 h-14 px-0 flex-shrink-0"
            onClick={() => {
              setTimerPresetSec(undefined);
              setShowTimer(true);
            }}
          >
            <Timer size={18} />
          </Button>
          <Button className="flex-1 h-14 px-2" onClick={handleFinish}>
            <Check size={18} />
            <span className="text-xs">完成訓練</span>
          </Button>
        </div>
      </div>

      {/* 休息 / 熱身計時器 */}
      <AnimatePresence>
        {showTimer && (
          <RestTimer
            initialSeconds={timerPresetSec}
            onClose={() => {
              setShowTimer(false);
              setTimerPresetSec(undefined);
            }}
          />
        )}
      </AnimatePresence>

      {/* 新增動作彈窗 */}
      <AnimatePresence>
        {showAddExercise && (
          <AddExerciseSheet
            onClose={() => setShowAddExercise(false)}
            onSelect={(exerciseId, name) => {
              addExerciseToActive(buildPlannedExercise(exerciseId, name));
              setShowAddExercise(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* 訓練中替換動作彈窗（T-04） */}
      <AnimatePresence>
        {substituteTarget && (
          <SubstituteSheet
            target={substituteTarget}
            onClose={() => setSubstituteTarget(null)}
            onConfirm={(nextExerciseId) => {
              substituteExerciseInActive(substituteTarget.exerciseLogId, nextExerciseId);
              setSubstituteTarget(null);
            }}
          />
        )}
      </AnimatePresence>
    </PageShell>
  );
}

// ============ 新增動作彈窗（T-03：強制自訂分類） ============

interface AddExerciseSheetProps {
  onClose: () => void;
  onSelect: (exerciseId: string, name: string) => void;
}

function AddExerciseSheet({ onClose, onSelect }: AddExerciseSheetProps) {
  const [category, setCategory] = useState<ExerciseCategory | 'all'>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentType | 'all'>('all');
  const [query, setQuery] = useState('');

  // 自訂動作 v2 表單（強制分類）
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customMuscle, setCustomMuscle] = useState<MuscleGroup | ''>('');
  const [customEquip, setCustomEquip] = useState<EquipmentType | ''>('');
  const [customSteps, setCustomSteps] = useState('');
  const [customTips, setCustomTips] = useState('');

  const { customExercises, addCustomExerciseV2 } = useWorkoutStore();

  const allList = useMemo<Exercise[]>(() => {
    return [
      ...builtinExercises.map((e) => e as Exercise),
      ...(customExercises as CustomExercise[]),
    ];
  }, [customExercises]);

  const list = useMemo(() => {
    return allList.filter((ex) => {
      if (category !== 'all' && ex.category !== category) return false;
      if (equipmentFilter !== 'all' && ex.equipmentType !== equipmentFilter) return false;
      if (query && !ex.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [allList, category, equipmentFilter, query]);

  const canSubmitCustom = customName.trim().length > 0 && !!customMuscle && !!customEquip;

  const handleSubmitCustom = () => {
    if (!canSubmitCustom) return;
    const name = customName.trim();
    // 已存在相同名稱自訂動作 → 直接選取
    const existing = customExercises.find((c) => c.name === name);
    if (existing) {
      onSelect(existing.id, existing.name);
      return;
    }
    const created = addCustomExerciseV2({
      name,
      muscleGroup: customMuscle as MuscleGroup,
      equipmentType: customEquip as EquipmentType,
      steps: customSteps
        .split(/\n|；|;/)
        .map((s) => s.trim())
        .filter(Boolean),
      tips: customTips
        .split(/\n|；|;/)
        .map((s) => s.trim())
        .filter(Boolean),
    });
    onSelect(created.id, created.name);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] h-[88vh] bg-bg-primary rounded-t-card flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-display text-2xl tracking-wide uppercase text-text-primary">
            {showCustomForm ? '新增自訂動作' : '選擇動作'}
          </h3>
          <div className="flex items-center gap-1">
            {!showCustomForm && (
              <button
                onClick={() => setShowCustomForm(true)}
                className="mr-2 h-9 px-3 flex items-center gap-1.5 rounded-button border border-accent/40 text-accent text-xs hover:bg-accent/10 transition-colors"
              >
                <Edit3 size={14} /> 自訂
              </button>
            )}
            {showCustomForm && (
              <button
                onClick={() => setShowCustomForm(false)}
                className="mr-2 h-9 px-3 rounded-button border border-border text-text-secondary text-xs hover:border-accent hover:text-accent transition-colors"
              >
                返回
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center text-text-secondary hover:text-text-primary"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {!showCustomForm ? (
          <>
            {/* 搜尋 & 器械篩選 */}
            <div className="p-3 border-b border-border bg-bg-secondary/50 space-y-2">
              <div className="relative">
                <Plus
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary rotate-45"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜尋動作…"
                  className="w-full h-10 pl-9 pr-3 bg-bg-card rounded-button border border-border text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                <FilterChip
                  label="全部器械"
                  active={equipmentFilter === 'all'}
                  onClick={() => setEquipmentFilter('all')}
                />
                {EQUIPMENT_TYPE_OPTIONS.map((o) => (
                  <FilterChip
                    key={o.value}
                    label={o.label}
                    active={equipmentFilter === o.value}
                    onClick={() => setEquipmentFilter(o.value)}
                  />
                ))}
              </div>
            </div>

            {/* 分類標籤 */}
            <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-border">
              <CategoryChip
                label="全部"
                active={category === 'all'}
                onClick={() => setCategory('all')}
              />
              {exerciseCategories.map((c) => (
                <CategoryChip
                  key={c.value}
                  label={c.label}
                  active={category === c.value}
                  onClick={() => setCategory(c.value)}
                />
              ))}
            </div>

            {/* 動作列表 */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-2">
                {list.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => onSelect(ex.id, ex.name)}
                    className="flex items-center justify-between p-3 bg-bg-card rounded-button border border-border/40 hover:border-accent/50 transition-colors text-left"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="text-sm font-bold text-text-primary">{ex.name}</div>
                        {(ex as CustomExercise).isCustom && (
                          <Badge variant="auxiliary">自訂</Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-text-secondary mt-0.5">
                        {CATEGORY_LABELS[ex.category]} · {EQUIPMENT_TYPE_LABELS[ex.equipmentType]}
                      </div>
                    </div>
                    <Plus size={18} className="text-accent" />
                  </button>
                ))}
                {list.length === 0 && (
                  <div className="text-center text-text-secondary text-xs py-8">
                    找不到符合的動作，點右上角「自訂」建立吧 ✨
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          // ============ 自訂動作 v2 表單（強制分類） ============
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <Field label="動作名稱">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="例如：單手啞鈴划船"
                maxLength={30}
                className="w-full h-11 px-3 bg-bg-card rounded-button border border-border text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
              />
            </Field>

            <Field label="部位（必填）" required>
              <div className="grid grid-cols-3 gap-2">
                {MUSCLE_GROUP_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setCustomMuscle(o.value)}
                    className={cn(
                      'py-2 text-xs rounded-button border transition-colors',
                      customMuscle === o.value
                        ? 'bg-accent text-bg-primary border-accent'
                        : 'bg-bg-card text-text-secondary border-border hover:text-text-primary'
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="器械類型（必填）" required>
              <div className="grid grid-cols-4 gap-2">
                {EQUIPMENT_TYPE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setCustomEquip(o.value)}
                    className={cn(
                      'py-2 text-[11px] rounded-button border transition-colors',
                      customEquip === o.value
                        ? 'bg-accent text-bg-primary border-accent'
                        : 'bg-bg-card text-text-secondary border-border hover:text-text-primary'
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="步驟（選填，每行一步驟）">
              <textarea
                value={customSteps}
                onChange={(e) => setCustomSteps(e.target.value)}
                rows={4}
                placeholder={'雙腳與肩同寬\n髖部向後推\n保持背部挺直'}
                className="w-full px-3 py-2 bg-bg-card rounded-button border border-border text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
              />
            </Field>

            <Field label="提示（選填，每行一項）">
              <textarea
                value={customTips}
                onChange={(e) => setCustomTips(e.target.value)}
                rows={3}
                placeholder={'核心繃緊\n不圓背\n控制節奏'}
                className="w-full px-3 py-2 bg-bg-card rounded-button border border-border text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
              />
            </Field>

            <div className="pt-2">
              <Button fullWidth size="lg" disabled={!canSubmitCustom} onClick={handleSubmitCustom}>
                儲存並加入訓練
              </Button>
              {!canSubmitCustom && (
                <p className="text-center text-[11px] text-text-secondary mt-2">
                  請填寫名稱、選擇部位與器械類型
                </p>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-2">
        {label} {required && <span className="text-auxiliary">*</span>}
      </div>
      {children}
    </div>
  );
}

function CategoryChip({ label, active, onClick }: {
  label: string; active: boolean; onClick: () => void;
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

function FilterChip({ label, active, onClick }: {
  label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2.5 py-1 text-[11px] whitespace-nowrap rounded-button border transition-colors',
        active
          ? 'bg-auxiliary/15 text-auxiliary border-auxiliary/50'
          : 'bg-bg-card text-text-secondary border-border hover:text-text-primary'
      )}
    >
      {label}
    </button>
  );
}

// ============ T-04 訓練中替換動作 Sheet ============

interface SubstituteSheetProps {
  target: {
    exerciseLogId: string;
    currentExerciseId: string;
    muscleGroup: MuscleGroup;
    currentEquipmentType?: EquipmentType;
  };
  onClose: () => void;
  onConfirm: (nextExerciseId: string) => void;
}

function SubstituteSheet({ target, onClose, onConfirm }: SubstituteSheetProps) {
  const customExercises = useWorkoutStore((s) => s.customExercises);
  // T-06：依器械記憶排序候選
  const sortByMemory = useEquipmentMemoryStore((s) => s.sortCandidatesByMemory);
  const candidates = useMemo<Exercise[]>(() => {
    const all: Exercise[] = [
      ...builtinExercises.map((e) => e as Exercise),
      ...(customExercises as CustomExercise[]),
    ];
    const filtered = all
      .filter((e) => e.muscleGroup === target.muscleGroup && e.id !== target.currentExerciseId);
    // T-06：排序 - 最近用過的器械記憶優先 → 同器械類型優先 → 名稱
    return sortByMemory(filtered, target.currentEquipmentType);
  }, [customExercises, target.muscleGroup, target.currentExerciseId, target.currentEquipmentType, sortByMemory]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] h-[70vh] bg-bg-primary rounded-t-card flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-display text-xl tracking-wide uppercase text-text-primary">
              替換動作
            </h3>
            <p className="text-[11px] text-text-secondary mt-0.5">
              同部位（{CATEGORY_LABELS[target.muscleGroup]}）其他動作，組數次數模板保留
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-text-secondary hover:text-text-primary"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {candidates.length === 0 ? (
            <div className="text-center text-text-secondary text-xs py-12">
              尚未有其他同部位動作可替換 🤔
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {candidates.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => onConfirm(ex.id)}
                  className="flex items-center justify-between p-3 bg-bg-card rounded-button border border-border/40 hover:border-accent/50 transition-colors text-left"
                >
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="text-sm font-bold text-text-primary">{ex.name}</div>
                      {(ex as CustomExercise).isCustom && (
                        <Badge variant="auxiliary">自訂</Badge>
                      )}
                    </div>
                    <div className="text-[10px] text-text-secondary mt-0.5">
                      {EQUIPMENT_TYPE_LABELS[ex.equipmentType]}
                    </div>
                  </div>
                  <RefreshCw size={16} className="text-accent" />
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
