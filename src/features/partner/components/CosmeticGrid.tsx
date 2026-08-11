import { motion } from 'framer-motion';
import { Lock, Check, Shirt } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Cosmetic } from '../types';
import { COSMETIC_MAP } from '../data/cosmetics';

interface CosmeticGridProps {
  cosmetics: Cosmetic[];
  unlockedIds: string[];
  equippedIds: string[];
  onEquip: (id: string) => void;
  onUnequip: (id: string) => void;
}

const TYPE_LABEL: Record<Cosmetic['type'], string> = {
  head: '頭部',
  neck: '頸部',
  wrist: '腕部',
  back: '背部',
  badge: '徽章',
  background: '背景',
  title: '稱號',
};

export function CosmeticGrid({
  cosmetics,
  unlockedIds,
  equippedIds,
  onEquip,
  onUnequip,
}: CosmeticGridProps) {
  if (cosmetics.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-text-secondary">
        暫無可顯示的配件
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {cosmetics.map((item, i) => {
        const resolved = COSMETIC_MAP[item.id] ?? item;
        const unlocked = unlockedIds.includes(item.id);
        const equipped = equippedIds.includes(item.id);
        const handleClick = () => {
          if (!unlocked) return;
          if (equipped) onUnequip(item.id);
          else onEquip(item.id);
        };

        return (
          <motion.button
            key={item.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.02 * i, duration: 0.25 }}
            whileTap={unlocked ? { scale: 0.96 } : undefined}
            onClick={handleClick}
            disabled={!unlocked}
            className={cn(
              'relative text-left p-3 rounded-card border transition-colors',
              equipped
                ? 'bg-accent-soft border-accent/50'
                : unlocked
                  ? 'bg-bg-card border-border/50 hover:border-accent/40'
                  : 'bg-bg-secondary border-border/40 opacity-70'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center border',
                  unlocked
                    ? 'bg-bg-card border-border/50'
                    : 'bg-bg-secondary border-border/40'
                )}
              >
                {unlocked ? (
                  <Shirt size={16} className="text-text-primary" />
                ) : (
                  <Lock size={14} className="text-text-secondary/60" />
                )}
              </div>
              {equipped && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent">
                  <Check size={12} className="text-bg-primary" strokeWidth={3} />
                </span>
              )}
            </div>

            <h4
              className={cn(
                'mt-2 text-sm font-bold leading-tight',
                unlocked ? 'text-text-primary' : 'text-text-secondary'
              )}
            >
              {resolved.name}
            </h4>
            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-text-secondary">
              {TYPE_LABEL[resolved.type]}
            </p>

            <div className="mt-2">
              {!unlocked && (
                <span className="text-[10px] uppercase tracking-wider text-text-secondary/70">
                  未解鎖
                </span>
              )}
              {unlocked && !equipped && (
                <span className="text-[10px] uppercase tracking-wider text-text-secondary">
                  點擊裝備
                </span>
              )}
              {equipped && (
                <span className="text-[10px] uppercase tracking-wider font-bold text-accent">
                  已裝備
                </span>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
