import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, Gift } from 'lucide-react';
import type { WorkoutSession } from '@/types';
import { Card } from '@/components/ui/Card';
import { getWeeklyChallenge } from '@/features/retention/challenge';
import { useProfileStore } from '@/store/profileStore';
import { usePartnerStore } from '@/features/partner/stores/partnerStore';
import { useTelemetryStore } from '@/features/partner/stores/telemetryStore';

interface Props {
  sessions: WorkoutSession[];
  cardioDates: string[];
}

/**
 * P2A-2：每週挑戰卡（首頁）。
 * 每週一刷新，完成後自動發 XP，失敗無懲罰。
 */
export function WeeklyChallengeCard({ sessions, cardioDates }: Props) {
  const challenge = useMemo(
    () => getWeeklyChallenge(sessions, cardioDates),
    [sessions, cardioDates],
  );

  const claimedIds = useProfileStore((s) => s.claimedWeeklyChallengeIds);
  const markClaimed = useProfileStore((s) => s.markWeeklyChallengeClaimed);
  const alreadyClaimed = claimedIds.includes(challenge.id);

  // 完成後自動發獎（只一次）
  useEffect(() => {
    if (!challenge.completed || alreadyClaimed) return;
    usePartnerStore.getState().addXp(challenge.rewardXp);
    markClaimed(challenge.id);
    useTelemetryStore.getState().log('weekly_challenge_completed', {
      challengeId: challenge.id,
      rewardXp: challenge.rewardXp,
    });
  }, [challenge.completed, challenge.id, challenge.rewardXp, alreadyClaimed, markClaimed]);

  const pct = Math.min(100, Math.round((challenge.current / challenge.target) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 }}
      className="mb-4"
    >
      <Card className="p-4 border-accent/40 bg-gradient-to-br from-accent/10 via-transparent to-transparent">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-button bg-accent/15 text-accent flex items-center justify-center flex-shrink-0">
              <Target size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-accent font-bold">
                本週挑戰
              </div>
              <div className="text-sm font-bold text-text-primary truncate">
                {challenge.title}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-text-secondary flex-shrink-0">
            <Gift size={12} className="text-accent" />
            <span className="font-mono font-bold text-accent">+{challenge.rewardXp}</span>
          </div>
        </div>

        <p className="text-[11px] text-text-secondary mt-2 leading-snug">
          {challenge.description}
        </p>

        <div className="mt-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-mono text-sm font-bold text-text-primary">
              {challenge.current}
              <span className="text-text-secondary text-xs"> / {challenge.target}</span>
            </span>
            {challenge.completed && (
              <span className="text-[10px] px-2 py-0.5 rounded-button bg-accent text-bg-primary font-bold">
                已完成
              </span>
            )}
          </div>
          <div className="w-full h-1.5 bg-bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
