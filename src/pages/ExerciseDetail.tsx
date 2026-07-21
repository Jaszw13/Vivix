import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dumbbell, Check, AlertCircle, Plus } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { Card, SectionHeader, Badge } from '@/components/ui/Card';
import { getExerciseById } from '@/data/exercises';
import { CATEGORY_LABELS } from '@/types';
import { useWorkoutStore } from '@/store/workoutStore';

export default function ExerciseDetail() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const exercise = exerciseId ? getExerciseById(exerciseId) : undefined;
  const { activeSession, addExerciseToActive, startEmptySession } = useWorkoutStore();

  if (!exercise) {
    return (
      <PageShell title="找不到動作" showBack>
        <div className="text-center text-text-secondary mt-20">
          找不到此動作
        </div>
      </PageShell>
    );
  }

  const handleAddToWorkout = () => {
    if (!activeSession) {
      startEmptySession();
    }
    addExerciseToActive({
      id: `pe-${Date.now()}`,
      exerciseId: exercise.id,
      name: exercise.name,
      targetSets: 3,
      targetReps: '8-12',
    });
    navigate('/workout');
  };

  return (
    <PageShell title={exercise.name} showBack noPadding>
      {/* 封面 */}
      <div className="relative h-48 bg-gradient-to-br from-bg-secondary via-bg-secondary to-accent/10 flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, var(--accent) 0, var(--accent) 1px, transparent 1px, transparent 12px)',
          }}
        />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <Dumbbell size={72} className="text-accent" strokeWidth={1.5} />
        </motion.div>
      </div>

      <div className="p-4">
        {/* 標題與標籤 */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="accent">{CATEGORY_LABELS[exercise.category]}</Badge>
            <Badge>{exercise.equipment}</Badge>
          </div>
          <h1 className="font-display text-4xl tracking-wide uppercase text-text-primary">
            {exercise.name}
          </h1>
          <p className="text-xs text-text-secondary mt-1">{exercise.muscleGroup}</p>
        </div>

        <Button fullWidth size="lg" onClick={handleAddToWorkout}>
          <Plus size={18} /> 加入訓練
        </Button>

        {/* 執行步驟 */}
        <div className="mt-6">
          <SectionHeader title="執行步驟" subtitle="正確動作流程" />
          <Card className="divide-y divide-border/40">
            {exercise.instructions.map((step, i) => (
              <div key={i} className="p-3 flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-accent-soft flex items-center justify-center font-mono text-xs font-bold text-accent flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-sm text-text-primary leading-relaxed">{step}</p>
              </div>
            ))}
          </Card>
        </div>

        {/* 重點提示 */}
        <div className="mt-6">
          <SectionHeader
            title="重點提示"
            subtitle="避免常見錯誤"
            action={<AlertCircle size={16} className="text-auxiliary" />}
          />
          <Card className="p-4 flex flex-col gap-2">
            {exercise.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <Check size={14} className="text-accent mt-0.5 flex-shrink-0" />
                <span className="text-sm text-text-primary">{tip}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
