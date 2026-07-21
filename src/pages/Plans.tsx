import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Clock } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, Badge } from '@/components/ui/Card';
import { trainingPlans } from '@/data/plans';
import { DIFFICULTY_LABELS } from '@/types';

export default function Plans() {
  const navigate = useNavigate();

  return (
    <PageShell title="訓練計畫">
      <p className="text-xs text-text-secondary mb-4">
        選擇適合你的力量訓練模板
      </p>
      <div className="flex flex-col gap-4">
        {trainingPlans.map((plan, i) => (
          <motion.button
            key={plan.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(`/plans/${plan.id}`)}
            className="text-left"
          >
            <Card className="relative overflow-hidden p-0">
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
            </Card>
          </motion.button>
        ))}
      </div>
    </PageShell>
  );
}
