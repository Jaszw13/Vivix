import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Dumbbell, Plus, Trash2, Copy, RotateCcw, Edit3, Check, X, ChevronUp, ChevronDown, Search, CheckCircle2 } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { Card, Badge, SectionHeader } from '@/components/ui/Card';
import { usePlansStore } from '@/store/plansStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { exercises as builtinExercisesList } from '@/data/exercises';
import { DIFFICULTY_LABELS, MUSCLE_GROUP_LABELS, EQUIPMENT_TYPE_LABELS } from '@/types';
import type { MuscleGroup, EquipmentType } from '@/types';
import { cn } from '@/lib/utils';

export default function PlanDetail() {
  const { planId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const getPlanById = usePlansStore((s) => s.getPlanById);
  const duplicatePlan = usePlansStore((s) => s.duplicatePlan);
  const resetToPreset = usePlansStore((s) => s.resetToPreset);
  const deletePlan = usePlansStore((s) => s.deletePlan);
  const updatePlan = usePlansStore((s) => s.updatePlan);
  const addDay = usePlansStore((s) => s.addDay);
  const deleteDay = usePlansStore((s) => s.deleteDay);
  const reorderDay = usePlansStore((s) => s.reorderDay);
  const updateDay = usePlansStore((s) => s.updateDay);
  const addExerciseToDay = usePlansStore((s) => s.addExerciseToDay);
  const removeExerciseFromDay = usePlansStore((s) => s.removeExerciseFromDay);
  const updateExerciseInDay = usePlansStore((s) => s.updateExerciseInDay);

  const startSession = useWorkoutStore((s) => s.startSession);
  const setActivePlan = useWorkoutStore((s) => s.setActivePlan);

  const plan = planId ? getPlanById(planId) : undefined;
  const isCustom = plan?.isCustom ?? false;
  const canEdit = isCustom;
  const canReset = isCustom && !!plan?.derivedFromPresetId;

  const [editMode, setEditMode] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [pickerDayId, setPickerDayId] = useState<string | null>(null);
  const [pickerFilter, setPickerFilter] = useState<MuscleGroup | 'all'>('all');
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerEquip, setPickerEquip] = useState<EquipmentType | 'all'>('all');
  const [toast, setToast] = useState<string | null>(null);

  // Task 1：打通自訂動作資料流（L2 派生）
  const customExercises = useWorkoutStore((s) => s.customExercises);
  const allExercises = useMemo(
    () => [...builtinExercisesList, ...customExercises],
    [customExercises],
  );

  // Toast 自動消失
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // 處理 ?action=reset
  useEffect(() => {
    if (searchParams.get('action') === 'reset' && planId && canReset) {
      if (confirm('恢復為預設計畫？你對此計畫的修改將會遺失。')) {
        resetToPreset(planId);
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, planId, canReset, resetToPreset, setSearchParams]);

  const handleStart = (dayId: string) => {
    if (!plan) return;
    const day = plan.days.find((d) => d.id === dayId);
    if (!day) return;
    setActivePlan(plan.id);
    const idx = plan.days.findIndex((d) => d.id === dayId);
    if (idx >= 0) useWorkoutStore.setState({ nextDayIndex: idx });
    startSession(plan.id, plan.name, day);
    navigate('/workout');
  };

  const handleDuplicate = () => {
    if (!planId) return;
    const id = duplicatePlan(planId);
    navigate(`/plans/${id}`);
  };

  const handleSaveName = () => {
    if (planId && nameDraft.trim()) {
      updatePlan(planId, { name: nameDraft.trim() });
    }
    setEditingName(false);
  };

  const filteredExercises = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return allExercises.filter((e) => {
      if (pickerFilter !== 'all' && e.muscleGroup !== pickerFilter) return false;
      if (pickerEquip !== 'all' && e.equipmentType !== pickerEquip) return false;
      if (q && !e.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allExercises, pickerFilter, pickerEquip, pickerQuery]);

  if (!plan) {
    return (
      <PageShell title="找不到計畫" showBack>
        <div className="text-center text-text-secondary mt-20">
          找不到此訓練計畫
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={plan.name} showBack noPadding>
      {/* 封面 */}
      <div className="relative h-44 bg-gradient-to-br from-bg-secondary via-bg-secondary to-accent/10 flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, var(--accent) 0, var(--accent) 1px, transparent 1px, transparent 12px)',
          }}
        />
        <motion.span
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="font-display text-8xl tracking-wider text-accent relative"
        >
          {plan.cover}
        </motion.span>
        <div className="absolute top-3 right-3 flex gap-2">
          <Badge variant={plan.difficulty === 'beginner' ? 'accent' : 'default'}>
            {DIFFICULTY_LABELS[plan.difficulty]}
          </Badge>
          {isCustom && <Badge variant="auxiliary">自訂</Badge>}
        </div>
      </div>

      <div className="p-4">
        {/* 計畫名稱（可編輯） */}
        {editingName ? (
          <div className="flex gap-2 mb-4">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              className="flex-1 bg-bg-card border border-accent/40 rounded-button px-3 py-2 font-display text-xl text-text-primary"
              autoFocus
            />
            <Button size="sm" onClick={handleSaveName}><Check size={14} /></Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}><X size={14} /></Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-2">
            <h1 className="font-display text-3xl tracking-wide uppercase text-text-primary flex-1">
              {plan.name}
            </h1>
            {canEdit && (
              <button
                onClick={() => { setNameDraft(plan.name); setEditingName(true); }}
                className="text-text-secondary hover:text-accent"
              >
                <Edit3 size={16} />
              </button>
            )}
          </div>
        )}

        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          {plan.description}
        </p>

        {/* 操作列 */}
        <div className="flex flex-wrap gap-2 mb-5">
          {!isCustom && (
            <Button variant="secondary" size="sm" onClick={handleDuplicate}>
              <Copy size={14} /> 複製為我的計畫
            </Button>
          )}
          {canEdit && (
            <Button
              variant={editMode ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setEditMode(!editMode)}
            >
              <Edit3 size={14} /> {editMode ? '完成編輯' : '編輯計畫'}
            </Button>
          )}
          {canReset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm('恢復為預設計畫？你的修改將會遺失。')) {
                  resetToPreset(plan.id);
                }
              }}
            >
              <RotateCcw size={14} /> 恢復預設
            </Button>
          )}
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="text-auxiliary"
              onClick={() => {
                if (confirm('確定刪除這個自訂計畫？')) {
                  deletePlan(plan.id);
                  navigate('/plans');
                }
              }}
            >
              <Trash2 size={14} /> 刪除
            </Button>
          )}
        </div>

        <SectionHeader
          title="訓練日"
          subtitle={`${plan.days.length} 天排程`}
          action={
            editMode && (
              <button
                onClick={() => addDay(plan.id, `Day ${plan.days.length + 1}`)}
                className="text-xs uppercase tracking-wider text-accent font-bold flex items-center gap-1"
              >
                <Plus size={14} /> 新增
              </button>
            )
          }
        />

        <div className="flex flex-col gap-4">
          {plan.days.map((day, i) => (
            <motion.div
              key={day.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-text-secondary">
                      Day {day.dayIndex + 1}
                    </div>
                    {editMode ? (
                      <input
                        value={day.dayName}
                        onChange={(e) => updateDay(plan.id, day.id, { dayName: e.target.value })}
                        className="font-display text-2xl tracking-wide uppercase text-text-primary bg-transparent border-b border-accent/40"
                      />
                    ) : (
                      <h3 className="font-display text-2xl tracking-wide uppercase text-text-primary">
                        {day.dayName}
                      </h3>
                    )}
                  </div>
                  {!editMode && (
                    <Button size="sm" onClick={() => handleStart(day.id)}>
                      <Play size={14} /> 開始
                    </Button>
                  )}
                </div>

                {/* 動作列表 */}
                <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-border/40">
                  {day.exercises.map((ex) => (
                    <div key={ex.id} className="flex items-center gap-3 py-1.5">
                      <div className="w-7 h-7 rounded bg-accent-soft flex items-center justify-center flex-shrink-0">
                        <Dumbbell size={13} className="text-accent" />
                      </div>
                      <span className="text-sm text-text-primary flex-1 truncate">
                        {ex.name}
                      </span>
                      {editMode ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={ex.targetSets}
                            onChange={(e) => updateExerciseInDay(plan.id, day.id, ex.exerciseId, { targetSets: parseInt(e.target.value) || 0 })}
                            className="w-12 bg-bg-secondary border border-border/40 rounded px-1 py-0.5 font-mono text-xs text-center"
                          />
                          <span className="text-text-secondary text-xs">×</span>
                          <input
                            value={ex.targetReps}
                            onChange={(e) => updateExerciseInDay(plan.id, day.id, ex.exerciseId, { targetReps: e.target.value })}
                            className="w-16 bg-bg-secondary border border-border/40 rounded px-1 py-0.5 font-mono text-xs text-center"
                          />
                          <button
                            onClick={() => removeExerciseFromDay(plan.id, day.id, ex.exerciseId)}
                            className="text-auxiliary ml-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="font-mono text-xs text-text-secondary">
                          {ex.targetSets}×{ex.targetReps}
                          {ex.targetWeight ? ` · ${ex.targetWeight}kg` : ''}
                        </span>
                      )}
                    </div>
                  ))}

                  {/* 空狀態 */}
                  {day.exercises.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-xs text-text-secondary/60">尚無動作</p>
                    </div>
                  )}

                  {/* 新增動作 */}
                  {editMode && (
                    <button
                      onClick={() => {
                        if (pickerDayId !== day.id) {
                          setPickerQuery('');
                          setPickerEquip('all');
                          setPickerFilter('all');
                        }
                        setPickerDayId(pickerDayId === day.id ? null : day.id);
                      }}
                      className="flex items-center gap-2 text-xs text-accent font-bold mt-2 py-1"
                    >
                      <Plus size={14} /> 新增動作
                    </button>
                  )}

                  {/* 動作選擇器 */}
                  {editMode && pickerDayId === day.id && (
                    <div className="mt-2 p-3 bg-bg-secondary rounded-2xl border border-border/40">
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
                      <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
                        {filteredExercises.length === 0 && (
                          <div className="py-5 text-center text-[11px] text-text-secondary/70">
                            找不到符合的動作
                          </div>
                        )}
                        {filteredExercises.map((ex) => (
                          <button
                            key={ex.id}
                            onClick={() => {
                              addExerciseToDay(plan.id, day.id, ex.id);
                              setToast(`已加入「${ex.name}」`);
                              setPickerDayId(null);
                            }}
                            className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-bg-card text-left"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs text-text-primary truncate">{ex.name}</span>
                              {ex.isCustom && (
                                <Badge variant="auxiliary" className="flex-shrink-0 !text-[8px] !px-1.5 !py-0">
                                  自訂
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
                  )}
                </div>

                {/* 訓練日排序/刪除 */}
                {editMode && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/40">
                    <button
                      onClick={() => reorderDay(plan.id, day.id, 'up')}
                      disabled={i === 0}
                      className="text-text-secondary disabled:opacity-30"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      onClick={() => reorderDay(plan.id, day.id, 'down')}
                      disabled={i === plan.days.length - 1}
                      className="text-text-secondary disabled:opacity-30"
                    >
                      <ChevronDown size={16} />
                    </button>
                    {plan.days.length > 1 && (
                      <button
                        onClick={() => {
                          if (confirm(`刪除「${day.dayName}」？`)) deleteDay(plan.id, day.id);
                        }}
                        className="text-auxiliary ml-auto"
                      >
                        <Trash2 size={16} /> 刪除訓練日
                      </button>
                    )}
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 全局 Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-bg-primary border border-accent/40 rounded-button shadow-xl flex items-center gap-2"
          >
            <CheckCircle2 size={16} className="text-accent" />
            <span className="text-xs text-text-primary font-medium">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
