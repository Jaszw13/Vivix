import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, Timer, X, Play, Flame } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { Card, Badge } from '@/components/ui/Card';
import { ExerciseSetList } from '@/components/workout/ExerciseSetList';
import { RestTimer } from '@/components/workout/RestTimer';
import { useWorkoutStore } from '@/store/workoutStore';
import { exercises, exerciseCategories } from '@/data/exercises';
import { getPlanById } from '@/data/plans';
import { formatDuration } from '@/utils/workout';
import type { ExerciseCategory, WarmupItem } from '@/types';

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
  } = useWorkoutStore();

  const [showTimer, setShowTimer] = useState(false);
  const [timerPresetSec, setTimerPresetSec] = useState<number | undefined>(undefined);
  const [elapsed, setElapsed] = useState(0);
  const [showAddExercise, setShowAddExercise] = useState(false);

  // 若無進行中訓練，自動建立空白 session
  useEffect(() => {
    if (!activeSession) {
      startEmptySession();
    }
  }, [activeSession, startEmptySession]);

  // 整體訓練計時
  useEffect(() => {
    if (!activeSession) return;
    const startTime = new Date(activeSession.date).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // 依 planId + dayId 查回當日的 warmup 項目
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

            {/* 進度條 */}
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
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* 新增動作 */}
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
              addExerciseToActive({
                id: `pe-${Date.now()}`,
                exerciseId,
                name,
                targetSets: 3,
                targetReps: '8-12',
              });
              setShowAddExercise(false);
            }}
          />
        )}
      </AnimatePresence>
    </PageShell>
  );
}

// ============ 新增動作彈窗 ============

interface AddExerciseSheetProps {
  onClose: () => void;
  onSelect: (exerciseId: string, name: string) => void;
}

function AddExerciseSheet({ onClose, onSelect }: AddExerciseSheetProps) {
  const [category, setCategory] = useState<ExerciseCategory | 'all'>('all');
  const [customName, setCustomName] = useState('');
  const { customExercises, addCustomExercise } = useWorkoutStore();

  const list = category === 'all'
    ? exercises
    : exercises.filter((e) => e.category === category);

  const handleAddCustom = () => {
    const name = customName.trim();
    if (!name) return;
    const existing = customExercises.find((c) => c.name === name);
    if (existing) {
      onSelect(existing.id, existing.name);
    } else {
      const created = addCustomExercise(name);
      onSelect(created.id, created.name);
    }
    setCustomName('');
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
        className="w-full max-w-[480px] h-[85vh] bg-bg-primary rounded-t-card flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-display text-2xl tracking-wide uppercase text-text-primary">
            選擇動作
          </h3>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-text-secondary hover:text-text-primary"
          >
            <X size={20} />
          </button>
        </div>

        {/* 自訂動作輸入 */}
        <div className="p-3 border-b border-border bg-bg-secondary/50">
          <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-2">
            找不到想要的動作？自行輸入
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
              placeholder="輸入動作名稱，例如：單手啞鈴划船"
              className="flex-1 h-10 px-3 bg-bg-card rounded-button border border-border text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
            />
            <button
              onClick={handleAddCustom}
              disabled={!customName.trim()}
              className="h-10 px-4 bg-accent text-bg-primary rounded-button text-sm font-bold disabled:opacity-40 disabled:pointer-events-none"
            >
              加入
            </button>
          </div>
          {/* 自訂動作快捷選項 */}
          {customExercises.length > 0 && (
            <div className="mt-3">
              <div className="text-[9px] uppercase tracking-widest text-text-secondary/60 mb-1.5">
                我的自訂動作
              </div>
              <div className="flex flex-wrap gap-1.5">
                {customExercises.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c.id, c.name)}
                    className="px-2.5 py-1 text-[11px] rounded-button border border-accent/40 text-accent hover:bg-accent/10 transition-colors"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
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
                  <div className="text-sm font-bold text-text-primary">{ex.name}</div>
                  <div className="text-[10px] text-text-secondary mt-0.5">
                    {ex.muscleGroup} · {ex.equipment}
                  </div>
                </div>
                <Plus size={18} className="text-accent" />
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface CategoryChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function CategoryChip({ label, active, onClick }: CategoryChipProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded-button whitespace-nowrap border transition-colors ${
        active
          ? 'bg-accent text-bg-primary border-accent'
          : 'bg-transparent text-text-secondary border-border hover:text-text-primary'
      }`}
    >
      {label}
    </button>
  );
}
