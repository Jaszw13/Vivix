// Errata E8：每次匯入批次一次「認可儀式」，非 ever-once。
// 呈現：X 次訓練 · Y 個訓練日 · Z 個 PR · W 個成就 · T 噸；
// 行為：關閉後 caller 決定 CTA 去向（E11：使用現有導航機制，非字面路徑）。
import { useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trophy, Target, Flame, Calendar, Dumbbell, Award, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { WorkoutSession } from '@/types';
import { estimate1RM } from '@/utils/workout';
import { resolveCurrentTaxonomy } from '@/features/exercises/taxonomy';
import type { CustomExercise } from '@/store/workoutStore';

export interface RecognitionStats {
  sessions: number;
  trainingDays: number;
  totalPRs: number;
  /** 這批匯入使得 progress 達到解鎖的成就數（永久解鎖 D2） */
  achievementUnlocks: number;
  totalVolumeKg: number;
}

export interface RecognitionModalProps {
  open: boolean;
  stats: RecognitionStats;
  onClose: () => void;
  /** E11：使用現有導航機制；caller 傳 react-router navigate / 回 dashboard 等 */
  onGoTrain?: () => void;
  onGoAchievements?: () => void;
}

/** 靜態計算某批匯入的 PR 數（與 PR 權威實作邏輯同義：exerciseId 的最大 estimated1RM 數） */
export function computeBatchRecognitionStats(
  imported: WorkoutSession[],
  customExercises: CustomExercise[],
  unlocks: string[],
): RecognitionStats {
  const daySet = new Set<string>();
  const bestByExercise = new Map<string, { rm: number }>();
  let volume = 0;
  for (const s of imported) {
    daySet.add(new Date(s.date).toDateString());
    for (const ex of s.exercises) {
      // 分類權威：匯入的 exerciseId 若為 custom id 會正確命中；否則 fallback 不影響 PR 計數
      resolveCurrentTaxonomy(ex.exerciseId, customExercises, {
        muscleGroup: ex.muscleGroup,
        equipmentType: ex.equipmentType,
        name: ex.name,
      });
      const completed = ex.sets.filter((x) => x.completed && x.weight >= 0 && x.reps > 0);
      let bestRm = 0;
      for (const set of completed) {
        volume += set.weight * set.reps;
        const rm = estimate1RM(set.weight, set.reps);
        if (rm > bestRm) bestRm = rm;
      }
      if (bestRm > 0) {
        const prev = bestByExercise.get(ex.exerciseId);
        if (!prev || bestRm > prev.rm) bestByExercise.set(ex.exerciseId, { rm: bestRm });
      }
    }
  }
  return {
    sessions: imported.length,
    trainingDays: daySet.size,
    totalPRs: bestByExercise.size,
    achievementUnlocks: unlocks.length,
    totalVolumeKg: volume,
  };
}

export default function RecognitionModal({
  open,
  stats,
  onClose,
  onGoTrain,
  onGoAchievements,
}: RecognitionModalProps) {
  const volTon = useMemo(() => (stats.totalVolumeKg / 1000).toFixed(1), [stats.totalVolumeKg]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const tiles: { label: string; value: React.ReactNode; icon: React.ReactNode; highlight?: boolean }[] = [
    { label: '匯入訓練', value: stats.sessions.toString(), icon: <Dumbbell size={18} /> },
    { label: '訓練日', value: stats.trainingDays.toString(), icon: <Calendar size={18} /> },
    { label: '個人紀錄', value: stats.totalPRs.toString(), icon: <Trophy size={18} />, highlight: true },
    { label: '永久成就', value: stats.achievementUnlocks.toString(), icon: <Award size={18} /> },
    { label: '總噸數', value: <>{volTon}<span className="text-xs ml-0.5 text-text-secondary">t</span></>, icon: <Target size={18} /> },
  ];

  return (
    <AnimatePresence>
      <motion.div
        key="recognition-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          key="recognition-panel"
          initial={{ y: 220, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 220, opacity: 0 }}
          transition={{ type: 'spring', damping: 26 }}
          className="w-full max-w-[480px] max-h-[92vh] bg-bg-primary rounded-t-3xl sm:rounded-3xl border border-border flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 pt-6 pb-4 text-center">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.05, type: 'spring', stiffness: 240 }}
              className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-accent/20 to-auxiliary/15 border border-accent/35 flex items-center justify-center text-accent"
            >
              <Flame size={40} />
            </motion.div>
            <h2 className="font-display text-3xl tracking-wide uppercase text-text-primary mt-5">
              你的過去，從今天起有了家
            </h2>
            <p className="text-sm text-text-secondary mt-2 leading-relaxed max-w-[22rem] mx-auto">
              我們已正式承接你過去的每一次訓練。這些進步一直都在，
              從此刻起在 Vivix 被記得、被計算、被一起推進。
            </p>
          </div>

          <div className="px-5 pb-4 overflow-y-auto">
            <Card className="p-4">
              <div className="grid grid-cols-2 gap-2 divide-y divide-border/60 sm:divide-none">
                {tiles.map((t) => (
                  <div key={t.label} className="flex items-center gap-3 py-2">
                    <div className="w-9 h-9 rounded-xl bg-accent-soft text-accent flex items-center justify-center flex-shrink-0">
                      {t.icon}
                    </div>
                    <div className="min-w-0">
                      <div className={
                        'font-mono font-bold leading-tight ' +
                        (t.highlight ? 'text-auxiliary text-xl' : 'text-text-primary text-lg')
                      }>
                        {t.value}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-text-secondary mt-0.5">
                        {t.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <p className="text-[11px] text-text-secondary/80 mt-4 text-center leading-relaxed">
              所有匯入紀錄已計入成就、連續天數、個人紀錄、進度報告與器械記憶。
              <br />成就一經解鎖即永久保留；未來刪除匯入紀錄時進度條會即時下降。
            </p>
          </div>

          <div className="p-5 border-t border-border flex flex-col gap-2">
            {onGoAchievements && (
              <Button variant="secondary" fullWidth onClick={onGoAchievements}>
                <Award size={16} /> 查看成就牆
              </Button>
            )}
            {onGoTrain ? (
              <Button fullWidth onClick={onGoTrain}>
                開始今天訓練 <ChevronRight size={16} />
              </Button>
            ) : (
              <Button fullWidth onClick={onClose}>
                <ChevronRight size={16} /> 完成
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
