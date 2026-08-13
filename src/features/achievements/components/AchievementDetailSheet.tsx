/**
 * AchievementDetailSheet — 點節點/徽章開啟的詳情面板
 */
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Card';
import { TIER_COLORS, TRACK_LABELS, type AchievementDef } from '@/data/achievements';
import type { AchievementProgress } from '@/store/achievementsStore';

interface Props {
  def: AchievementDef | null;
  progress?: AchievementProgress;
  formattedCopy?: string;
  open: boolean;
  onClose: () => void;
}

export function AchievementDetailSheet({ def, progress, formattedCopy, open, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && def && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="w-full max-w-md bg-bg-primary rounded-t-3xl border border-border/40 p-6 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 拖把 */}
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-bg-secondary flex items-center justify-center"
            >
              <X size={16} className="text-text-secondary" />
            </button>

            {(() => {
              const tier = TIER_COLORS[def.tier];
              const unlocked = progress?.unlocked ?? false;
              const ratio = Math.min(1, (progress?.current ?? 0) / Math.max(1, def.threshold));
              return (
                <div className="text-center">
                  {/* 大徽章 */}
                  <div
                    className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center border-2 mb-4"
                    style={unlocked ? {
                      backgroundColor: `${tier.color}25`,
                      borderColor: tier.color,
                      boxShadow: `0 0 30px ${tier.color}60`,
                    } : {
                      borderColor: 'var(--border-color)',
                      borderStyle: 'dashed',
                    }}
                  >
                    {unlocked ? (
                      <Check size={40} strokeWidth={3} style={{ color: tier.color }} />
                    ) : (
                      <span className="font-display text-3xl tracking-wider text-text-secondary">
                        {tier.label}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                      style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
                    >
                      {tier.label}
                    </span>
                    <Badge variant="default">{TRACK_LABELS[def.track]}</Badge>
                    {!unlocked && <Badge variant="default" className="border-dashed">挑戰</Badge>}
                  </div>

                  <h2 className="font-display text-2xl tracking-wide uppercase text-text-primary mb-3">
                    {def.title}
                  </h2>

                  <p className="text-sm text-text-secondary leading-relaxed mb-4">
                    {formattedCopy ?? def.copy}
                  </p>

                  {/* 進度 */}
                  {!unlocked && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase tracking-widest text-text-secondary">進度</span>
                        <span className="font-mono text-xs text-text-secondary tabular-nums">
                          {Math.round(ratio * 100)}%
                        </span>
                      </div>
                      <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${ratio * 100}%`,
                            background: `linear-gradient(90deg, ${tier.color}80, ${tier.color})`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {unlocked && progress?.unlockedAt && (
                    <p className="text-[10px] uppercase tracking-widest font-bold mb-4" style={{ color: tier.color }}>
                      於 {new Date(progress.unlockedAt).toLocaleDateString('zh-TW')} 解鎖
                    </p>
                  )}

                  {def.source && (
                    <p className="text-[9px] text-text-secondary/60 mt-3">
                      力量標準來源：{def.source}
                    </p>
                  )}

                  <Button fullWidth size="md" className="mt-2" onClick={onClose}>
                    關閉
                  </Button>
                </div>
              );
            })()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
