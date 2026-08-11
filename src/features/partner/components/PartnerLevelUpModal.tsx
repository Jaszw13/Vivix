import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PartnerLevelUpModalProps {
  result: { newLevel: number; partnerName: string } | null;
  onDismiss: () => void;
}

export function PartnerLevelUpModal({ result, onDismiss }: PartnerLevelUpModalProps) {
  return (
    <AnimatePresence>
      {result && (
        <motion.div
          key="lvlup-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-bg-primary/80 backdrop-blur-md"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ scale: 0.4, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.5, rotate: 8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[360px] bg-bg-card rounded-card border border-accent/50 shadow-card overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/18 via-transparent to-auxiliary/14 pointer-events-none" />

            <motion.div
              aria-hidden
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
              className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-accent flex items-center justify-center shadow-button"
            >
              <Sparkles size={22} className="text-bg-primary" />
            </motion.div>

            <div className="relative px-6 pt-12 pb-6 text-center">
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-display text-3xl tracking-widest uppercase text-accent font-bold"
              >
                LEVEL UP!
              </motion.p>

              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 240, damping: 16 }}
                className="mt-4 inline-flex items-baseline gap-1.5"
              >
                <span className="font-mono text-6xl font-bold text-text-primary tabular-nums">
                  {result.newLevel}
                </span>
                <span className="font-mono text-sm uppercase tracking-wider text-text-secondary">
                  Lv
                </span>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="mt-3 text-sm text-text-secondary"
              >
                <span className="text-text-primary font-bold">
                  {result.partnerName || 'Partner'}
                </span>{' '}
                變得更強了
              </motion.p>

              <Button
                fullWidth
                className="mt-6"
                onClick={onDismiss}
              >
                繼續
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
