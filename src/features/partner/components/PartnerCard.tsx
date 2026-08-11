import { motion } from 'framer-motion';
import { Cat, Dog, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { usePartnerStore } from '../stores/partnerStore';
import { getXpProgress, LEVEL_CAP } from '../engine/level';
import type { PartnerSpecies } from '../types';

interface PartnerCardProps {
  className?: string;
}

const SPECIES_ICON: Record<PartnerSpecies, typeof Cat> = {
  cat: Cat,
  dog: Dog,
};

export function PartnerCard({ className }: PartnerCardProps) {
  const partner = usePartnerStore();

  const { name, species, level, xp } = partner;
  const progress = getXpProgress(xp);
  const milestone = partner.getNextMilestone();
  const Icon = SPECIES_ICON[species] ?? Cat;

  const isMaxLevel = level >= LEVEL_CAP;
  const pct = Math.round(progress.progress * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={className}
    >
      <Card className="relative overflow-hidden p-4 border-accent/30">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-auxiliary/8 pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 flex-shrink-0 rounded-2xl bg-accent-soft border border-accent/30 flex items-center justify-center">
            <Icon size={26} className="text-accent" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg tracking-wide text-text-primary truncate">
                {name || '—'}
              </h3>
              <span className="font-mono text-xs font-bold text-accent uppercase tracking-wider">
                Lv.{level}
              </span>
            </div>
            {isMaxLevel ? (
              <p className="text-[10px] uppercase tracking-widest text-auxiliary font-bold mt-0.5">
                已達最高等級
              </p>
            ) : (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1.5 bg-border/60 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-accent to-auxiliary"
                  />
                </div>
                <span className="font-mono text-[10px] text-text-secondary tabular-nums">
                  {progress.xpInCurrentLevel}/{progress.xpForNextLevel}
                </span>
              </div>
            )}
          </div>
        </div>
        {milestone && (
          <div
            className={cn(
              'relative mt-3 flex items-start gap-1.5 pt-3 border-t border-border/40',
              'text-[11px] text-text-secondary leading-relaxed'
            )}
          >
            <Sparkles size={12} className="text-accent flex-shrink-0 mt-0.5" />
            <span>{milestone}</span>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
