import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Clock, Plus, Copy, Trash2 } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePlansStore } from '@/store/plansStore';
import { trainingPlans } from '@/data/plans';
import { DIFFICULTY_LABELS } from '@/types';
import { cn } from '@/lib/utils';
import { useTelemetryStore } from '@/features/partner/stores/telemetryStore';

type Tab = 'preset' | 'custom';

export default function Plans() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('preset');
  const customPlans = usePlansStore((s) => s.customPlans);
  const createPlan = usePlansStore((s) => s.createPlan);
  const duplicatePlan = usePlansStore((s) => s.duplicatePlan);
  const deletePlan = usePlansStore((s) => s.deletePlan);
  const log = useTelemetryStore((s) => s.log);

  const handleCreate = () => {
    const id = createPlan('我的計畫', '自訂訓練計畫');
    log('plan_created', { id });
    navigate(`/plans/${id}`);
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
    </PageShell>
  );
}
