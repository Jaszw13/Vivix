import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Dumbbell } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { Card, Badge, SectionHeader } from '@/components/ui/Card';
import { getPlanById } from '@/data/plans';
import { useWorkoutStore } from '@/store/workoutStore';
import { DIFFICULTY_LABELS } from '@/types';

export default function PlanDetail() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const plan = planId ? getPlanById(planId) : undefined;
  const startSession = useWorkoutStore((s) => s.startSession);

  if (!plan) {
    return (
      <PageShell title="找不到計畫" showBack>
        <div className="text-center text-text-secondary mt-20">
          找不到此訓練計畫
        </div>
      </PageShell>
    );
  }

  const handleStart = (dayId: string) => {
    const day = plan.days.find((d) => d.id === dayId);
    if (!day) return;
    startSession(plan.id, plan.name, day);
    navigate('/workout');
  };

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
        <div className="absolute top-3 right-3">
          <Badge variant={plan.difficulty === 'beginner' ? 'accent' : 'default'}>
            {DIFFICULTY_LABELS[plan.difficulty]}
          </Badge>
        </div>
      </div>

      <div className="p-4">
        <p className="text-sm text-text-secondary leading-relaxed mb-5">
          {plan.description}
        </p>

        <SectionHeader
          title="訓練日"
          subtitle={`${plan.days.length} 天排程`}
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
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-text-secondary">
                      Day {day.dayIndex + 1}
                    </div>
                    <h3 className="font-display text-2xl tracking-wide uppercase text-text-primary">
                      {day.dayName}
                    </h3>
                  </div>
                  <Button size="sm" onClick={() => handleStart(day.id)}>
                    <Play size={14} /> 開始
                  </Button>
                </div>
                <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-border/40">
                  {day.exercises.map((ex) => (
                    <div
                      key={ex.id}
                      className="flex items-center gap-3 py-1.5"
                    >
                      <div className="w-7 h-7 rounded bg-accent-soft flex items-center justify-center flex-shrink-0">
                        <Dumbbell size={13} className="text-accent" />
                      </div>
                      <span className="text-sm text-text-primary flex-1 truncate">
                        {ex.name}
                      </span>
                      <span className="font-mono text-xs text-text-secondary">
                        {ex.targetSets}×{ex.targetReps}
                        {ex.targetWeight ? ` · ${ex.targetWeight}kg` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
