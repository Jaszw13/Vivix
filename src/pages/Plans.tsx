import { useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Clock, Plus, Copy, Trash2, Wand2 } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePlansStore } from '@/store/plansStore';
import { useProfileStore } from '@/store/profileStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { trainingPlans } from '@/data/plans';
import { exercises as builtinExercises } from '@/data/exercises';
import { getEquipmentTypesForIds } from '@/data/equipment';
import { DIFFICULTY_LABELS } from '@/types';
import { cn } from '@/lib/utils';
import { useTelemetryStore } from '@/features/partner/stores/telemetryStore';

type Tab = 'preset' | 'custom';

export default function Plans() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('preset');
  const [toast, setToast] = useState<string | null>(null);
  const customPlans = usePlansStore((s) => s.customPlans);
  const createPlan = usePlansStore((s) => s.createPlan);
  const duplicatePlan = usePlansStore((s) => s.duplicatePlan);
  const deletePlan = usePlansStore((s) => s.deletePlan);
  const getPlanById = usePlansStore((s) => s.getPlanById);
  const updatePlan = usePlansStore((s) => s.updatePlan);
  const gymEquipmentIds = useProfileStore((s) => s.gymEquipmentIds);
  const customExercises = useWorkoutStore((s) => s.customExercises);
  const log = useTelemetryStore((s) => s.log);

  const allExercises = useMemo(
    () => [...builtinExercises, ...customExercises],
    [customExercises],
  );
  const gymEquipmentTypes = useMemo(
    () => new Set(getEquipmentTypesForIds(gymEquipmentIds)),
    [gymEquipmentIds],
  );

  // Toast 自動消失
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleCreate = () => {
    const id = createPlan('我的計畫', '自訂訓練計畫');
    log('plan_created', { id });
    navigate(`/plans/${id}`);
  };

  // T7-5：依我的器材一鍵產生計畫
  const handleGenerateFromEquipment = () => {
    if (gymEquipmentIds.length === 0) {
      setToast('請先到「設定 → 我的健身房器材」選擇你的器材');
      return;
    }

    // 依匹配率選最佳 preset
    let bestPreset = trainingPlans[0];
    let bestRate = -1;
    for (const preset of trainingPlans) {
      const total = preset.days.reduce((s, d) => s + d.exercises.length, 0);
      const matched = preset.days.reduce(
        (s, d) => s + d.exercises.filter((ex) => gymEquipmentTypes.has(ex.snapshot.equipmentType)).length,
        0,
      );
      const rate = total > 0 ? matched / total : 0;
      if (rate > bestRate) {
        bestRate = rate;
        bestPreset = preset;
      }
    }

    // 複製 preset 為自訂計畫（含新 ID）
    const newId = duplicatePlan(bestPreset.id, '我的器材計畫');
    const newPlan = getPlanById(newId);
    if (!newPlan) return;

    // 逐動作檢查：我的器材可匹配則保留，否則嘗試自動替換或標 ⚠
    const modifiedDays = newPlan.days.map((day) => ({
      ...day,
      exercises: day.exercises.map((ex) => {
        // 已在我的器材中 → 保留
        if (gymEquipmentTypes.has(ex.snapshot.equipmentType)) return ex;

        // 尋找同肌群 + 我的器材的候選
        const candidates = allExercises.filter(
          (e) =>
            e.muscleGroup === ex.snapshot.muscleGroup &&
            gymEquipmentTypes.has(e.equipmentType) &&
            e.id !== ex.exerciseId,
        );

        if (candidates.length === 1) {
          // 唯一候選 → 自動替換
          const rep = candidates[0];
          return {
            ...ex,
            exerciseId: rep.id,
            name: rep.name,
            snapshot: {
              name: rep.name,
              muscleGroup: ex.snapshot.muscleGroup,
              equipmentType: rep.equipmentType,
            },
          };
        }

        // 多候選或無候選 → 標 ⚠ 待手動替換
        const warnName = `⚠ ${ex.snapshot.name}`;
        return {
          ...ex,
          name: warnName,
          snapshot: { ...ex.snapshot, name: warnName },
        };
      }),
    }));

    updatePlan(newId, {
      days: modifiedDays,
      name: '我的器材計畫',
      description: '依你的健身房器材自動產生，標有 ⚠ 的動作請手動替換',
    });

    log('plan_generated_from_equipment', { presetId: bestPreset.id, id: newId });
    navigate(`/plans/${newId}`);
  };

  const handleDuplicate = (presetId: string) => {
    const id = duplicatePlan(presetId);
    log('plan_duplicated', { sourceId: presetId, id });
    navigate(`/plans/${id}`);
  };

  const handleDelete = (id: string) => {
    if (confirm('確定刪除這個自訂計畫？此操作無法復原。')) {
      deletePlan(id);
      log('plan_deleted', { id });
    }
  };

  const plans = tab === 'preset' ? trainingPlans : customPlans;

  return (
    <PageShell title="訓練計畫">
      {/* 分頁 */}
      <div className="flex gap-1.5 p-1 bg-bg-secondary rounded-2xl border border-border/30 mb-4">
        <button
          onClick={() => setTab('preset')}
          className={cn(
            'flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors',
            tab === 'preset' ? 'bg-accent text-bg-primary' : 'text-text-secondary',
          )}
        >
          預設
        </button>
        <button
          onClick={() => setTab('custom')}
          className={cn(
            'flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors',
            tab === 'custom' ? 'bg-accent text-bg-primary' : 'text-text-secondary',
          )}
        >
          我的 {customPlans.length > 0 && `(${customPlans.length})`}
        </button>
      </div>

      {/* T7-5：依我的器材一鍵產生計畫 */}
      {tab === 'preset' && gymEquipmentIds.length > 0 && (
        <Button fullWidth size="md" className="mb-4" onClick={handleGenerateFromEquipment}>
          <Wand2 size={16} /> 依我的器材產生計畫
        </Button>
      )}

      {tab === 'custom' && (
        <Button fullWidth size="md" className="mb-4" onClick={handleCreate}>
          <Plus size={16} /> 新建計畫
        </Button>
      )}

      {plans.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-text-secondary">
            {tab === 'custom' ? '尚未建立自訂計畫' : '無預設計畫'}
          </p>
          {tab === 'custom' && (
            <p className="text-xs text-text-secondary/60 mt-1">
              點上方「新建計畫」開始，或從預設計畫複製
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative"
            >
              <Card className="relative overflow-hidden p-0">
                <button
                  onClick={() => navigate(`/plans/${plan.id}`)}
                  className="text-left w-full"
                >
                  {/* 封面區 */}
                  <div className="relative h-32 bg-gradient-to-br from-bg-secondary via-bg-secondary to-accent/10 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 opacity-10" style={{
                      backgroundImage: 'repeating-linear-gradient(45deg, var(--accent) 0, var(--accent) 1px, transparent 1px, transparent 12px)'
                    }} />
                    <span className="font-display text-6xl tracking-wider text-accent relative">
                      {plan.cover}
                    </span>
                    <div className="absolute top-3 right-3 flex gap-2">
                      <Badge variant={plan.difficulty === 'beginner' ? 'accent' : 'default'}>
                        {DIFFICULTY_LABELS[plan.difficulty]}
                      </Badge>
                      {plan.isCustom && <Badge variant="auxiliary">自訂</Badge>}
                    </div>
                  </div>
                  {/* 內容區 */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-2xl tracking-wide uppercase text-text-primary">
                          {plan.name}
                        </h3>
                        <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                          {plan.description}
                        </p>
                      </div>
                      <ChevronRight size={20} className="text-text-secondary flex-shrink-0 mt-1" />
                    </div>
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/40">
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <Clock size={12} />
                        <span>{plan.days.length} 天 / 週期</span>
                      </div>
                      <div className="text-xs text-text-secondary">
                        {plan.days.reduce((s, d) => s + d.exercises.length, 0)} 個動作
                      </div>
                    </div>
                  </div>
                </button>

                {/* 自訂計畫快捷操作 */}
                {plan.isCustom && (
                  <div className="flex gap-2 px-4 pb-3">
                    {plan.derivedFromPresetId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/plans/${plan.id}?action=reset`)}
                      >
                        <Copy size={12} /> 恢復預設
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(plan.id)}
                      className="text-auxiliary"
                    >
                      <Trash2 size={12} /> 刪除
                    </Button>
                  </div>
                )}

                {/* 預設計畫快捷複製 */}
                {tab === 'preset' && (
                  <div className="flex gap-2 px-4 pb-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(plan.id)}
                    >
                      <Copy size={12} /> 複製為我的計畫
                    </Button>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-bg-primary border border-accent/40 rounded-button shadow-xl"
          >
            <span className="text-xs text-text-primary font-medium">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
