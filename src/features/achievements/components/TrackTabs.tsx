/**
 * TrackTabs — 分段控制：力量 / 堅持 / 超越 / 行為
 */
import { memo } from 'react';
import { motion } from 'framer-motion';
import { TRACK_LABELS, TRACK_ICONS, type AchievementTrack } from '@/data/achievements';
import { cn } from '@/lib/utils';

interface Props {
  active: AchievementTrack;
  onChange: (track: AchievementTrack) => void;
  counts?: Partial<Record<AchievementTrack, { unlocked: number; total: number }>>;
}

const TRACKS: AchievementTrack[] = ['strength', 'consistency', 'progress', 'behavior'];

function TrackTabsImpl({ active, onChange, counts }: Props) {
  return (
    <div className="flex gap-1.5 p-1 bg-bg-secondary rounded-2xl border border-border/30">
      {TRACKS.map((track) => {
        const isActive = active === track;
        const c = counts?.[track];
        return (
          <button
            key={track}
            onClick={() => onChange(track)}
            className={cn(
              'relative flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-colors min-h-[44px]',
              isActive ? 'text-bg-primary' : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {isActive && (
              <motion.div
                layoutId="trackTabActive"
                className="absolute inset-0 rounded-xl bg-accent"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative text-base leading-none mb-0.5">
              {TRACK_ICONS[track]}
            </span>
            <span className="relative text-[10px] font-bold uppercase tracking-wider">
              {TRACK_LABELS[track]}
            </span>
            {c && (
              <span className={cn(
                'relative font-mono text-[9px] tabular-nums mt-0.5',
                isActive ? 'text-bg-primary/80' : 'text-text-secondary/60',
              )}>
                {c.unlocked}/{c.total}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export const TrackTabs = memo(TrackTabsImpl);
