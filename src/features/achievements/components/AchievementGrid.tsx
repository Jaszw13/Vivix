/**
 * AchievementGrid — 徽章卡網格（非力量軌用）
 */
import { memo } from 'react';
import { AchievementBadge } from './AchievementBadge';
import type { AchievementDef } from '@/data/achievements';
import type { AchievementProgress } from '@/store/achievementsStore';

interface Props {
  items: AchievementDef[];
  progress: Record<string, AchievementProgress>;
  formatCopy: (def: AchievementDef) => string;
  onTap?: (def: AchievementDef) => void;
}

function AchievementGridImpl({ items, progress, formatCopy, onTap }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((def, i) => (
        <AchievementBadge
          key={def.id}
          def={def}
          progress={progress[def.id] ?? { unlocked: false, current: 0 }}
          formattedCopy={formatCopy(def)}
          index={i}
          onTap={onTap}
        />
      ))}
    </div>
  );
}

export const AchievementGrid = memo(AchievementGridImpl);
