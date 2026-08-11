import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ArrowUp, Sparkles, Shirt } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { RewardResult } from '../types';
import { PARTNER_FORMS } from '../data/forms';
import { COSMETIC_MAP } from '../data/cosmetics';

interface PartnerRewardToastProps {
  result: RewardResult | null;
  onDismiss: () => void;
}

const DISMISS_MS = 4000;

export function PartnerRewardToast({ result, onDismiss }: PartnerRewardToastProps) {
  // 重要事件（升等 / 形態 / 化妝品）必須由用戶手動確認，唔自動消失；
  // 只有純 XP 獎勵先會 4 秒後自動 dismiss。
  const hasImportantEvent = Boolean(
    result &&
      (result.leveledUp ||
        result.newFormId ||
        (result.newCosmeticIds && result.newCosmeticIds.length > 0) ||
        result.newTitleId)
  );

  useEffect(() => {
    if (!result) return;
    if (hasImportantEvent) return;
    const timer = window.setTimeout(onDismiss, DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [result, hasImportantEvent, onDismiss]);

  const formName = result?.newFormId
    ? PARTNER_FORMS.find((f) => f.id === result.newFormId)?.name
    : undefined;

  return (
    <AnimatePresence>
      {result && (
        <motion.div
          key="toast-root"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-[480px] pointer-events-auto"
        >
          <div className="bg-bg-card rounded-card border border-accent/40 shadow-card overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/12 via-transparent to-auxiliary/10 pointer-events-none" />
            <div className="relative p-4">
              <button
                onClick={onDismiss}
                aria-label="關閉"
                className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-accent-soft border border-accent/30 flex items-center justify-center">
                  <Zap size={16} className="text-accent" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-text-secondary">
                    訓練完成
                  </p>
                  <p className="font-display text-base tracking-wide text-text-primary">
                    獲得獎勵
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-2xl font-bold text-auxiliary tabular-nums">
                    +{result.xpGained}
                  </span>
                  <span className="text-xs uppercase tracking-wider text-text-secondary font-bold">
                    XP
                  </span>
                </div>

                {result.leveledUp && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-auxiliary/15 border border-auxiliary/30"
                  >
                    <ArrowUp size={14} className="text-auxiliary" />
                    <span className="text-xs font-bold text-auxiliary uppercase tracking-wider">
                      等級提升 → Lv.{result.newLevel}
                    </span>
                  </motion.div>
                )}

                {result.newFormId && formName && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.18 }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-accent-soft border border-accent/30"
                  >
                    <Sparkles size={14} className="text-accent" />
                    <span className="text-xs font-bold text-accent uppercase tracking-wider">
                      新形態解鎖：{formName}
                    </span>
                  </motion.div>
                )}

                {result.newCosmeticIds.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.26 }}
                    className="flex items-start gap-2 px-2.5 py-1.5 rounded bg-bg-secondary border border-border/60"
                  >
                    <Shirt size={14} className="text-text-primary mt-0.5" />
                    <span className="text-xs font-bold text-text-primary">
                      新配件：
                      {result.newCosmeticIds
                        .map((id) => COSMETIC_MAP[id]?.name ?? id)
                        .join('、')}
                    </span>
                  </motion.div>
                )}

                {result.newTitleId && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.34 }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-bg-secondary border border-border/60"
                  >
                    <Sparkles size={14} className="text-text-primary" />
                    <span className="text-xs font-bold text-text-primary">
                      新稱號解鎖
                    </span>
                  </motion.div>
                )}
              </div>

              {hasImportantEvent && (
                <Button
                  size="sm"
                  fullWidth
                  className="mt-3"
                  onClick={onDismiss}
                >
                  收下
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
