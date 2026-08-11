import { motion } from 'framer-motion';
import { Check, Gift, Star } from 'lucide-react';
import { Card, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { QuestDef, QuestProgress } from '../types';

interface QuestListProps {
  quests: QuestDef[];
  progress: Record<string, QuestProgress>;
  onClaim: (questId: string) => void;
}

function describeReward(reward: QuestDef['reward']): string {
  const parts: string[] = [];
  if (reward.xp) parts.push(`+${reward.xp} XP`);
  if (reward.cosmeticId) parts.push('配件');
  if (reward.badgeId) parts.push('徽章');
  if (reward.titleId) parts.push('稱號');
  if (reward.formId) parts.push('新形態');
  return parts.length > 0 ? parts.join('・') : '獎勵';
}

export function QuestList({ quests, progress, onClaim }: QuestListProps) {
  if (quests.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-text-secondary">
        暫無任務
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {quests.map((quest, i) => {
        const p = progress[quest.id];
        const current = p?.current ?? 0;
        const threshold = quest.condition.threshold;
        const completed = p?.completed ?? false;
        const claimed = p?.claimed ?? false;
        const ratio = Math.min(1, current / Math.max(1, threshold));
        const canClaim = completed && !claimed;

        return (
          <motion.div
            key={quest.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.02 * i, duration: 0.25 }}
          >
            <Card
              className={cn(
                'relative overflow-hidden p-3 border',
                claimed
                  ? 'border-border/40 bg-bg-secondary/60'
                  : completed
                    ? 'border-accent/40 bg-gradient-to-br from-bg-card to-accent/8'
                    : 'border-border/50 bg-bg-card'
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center border',
                    claimed
                      ? 'bg-bg-secondary border-border/40'
                      : completed
                        ? 'bg-accent-soft border-accent/40'
                        : 'bg-bg-secondary border-border/40'
                  )}
                >
                  {claimed ? (
                    <Check size={16} className="text-text-secondary" strokeWidth={2.5} />
                  ) : completed ? (
                    <Gift size={16} className="text-accent" />
                  ) : (
                    <Star size={16} className="text-text-secondary/70" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-bold text-sm text-text-primary truncate">
                      {quest.name}
                    </h4>
                    {claimed && (
                      <Badge variant="default" className="border-border">
                        已領取
                      </Badge>
                    )}
                    {!claimed && completed && (
                      <Badge variant="accent">可領取</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    {quest.description}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-border/60 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.round(ratio * 100)}%` }}
                        transition={{ duration: 0.5, delay: 0.1 + i * 0.02 }}
                        className={cn(
                          'h-full rounded-full',
                          claimed
                            ? 'bg-text-secondary/40'
                            : 'bg-gradient-to-r from-accent to-auxiliary'
                        )}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-text-secondary tabular-nums">
                      {current}/{threshold}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-text-secondary">
                      獎勵：{describeReward(quest.reward)}
                    </span>
                    {canClaim && (
                      <Button
                        size="sm"
                        className="h-7 px-2.5 text-[10px]"
                        onClick={() => onClaim(quest.id)}
                      >
                        領取
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
