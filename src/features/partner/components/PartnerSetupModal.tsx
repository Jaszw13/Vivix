import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cat, Dog, CheckCircle2, Gift, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { usePartnerStore } from '../stores/partnerStore';
import { useTelemetryStore } from '../stores/telemetryStore';
import { CAT_DEFAULT_NAMES, DOG_DEFAULT_NAMES } from '../data/partnerNames';
import type { PartnerSpecies } from '../types';

interface PartnerSetupModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 補建立 Partner 的 Modal：
 *   針對 Partner 系統上線前已完成 onboarding 的舊用戶，
 *   讓他們也能建立 Partner（選物種 + 改名）。
 */
export function PartnerSetupModal({ open, onClose }: PartnerSetupModalProps) {
  const createPartner = usePartnerStore((s) => s.createPartner);
  const telemetryLog = useTelemetryStore((s) => s.log);
  const [species, setSpecies] = useState<PartnerSpecies | null>(null);
  const [name, setName] = useState('');

  const handleSelect = (s: PartnerSpecies) => {
    setSpecies(s);
    if (!name.trim()) {
      setName(s === 'cat' ? CAT_DEFAULT_NAMES[0] : DOG_DEFAULT_NAMES[0]);
    }
  };

  const handleConfirm = () => {
    if (!species) return;
    const finalName =
      name.trim() ||
      (species === 'cat' ? CAT_DEFAULT_NAMES[0] : DOG_DEFAULT_NAMES[0]);
    createPartner(species, finalName);
    telemetryLog('partner_selected', { species, name: finalName, source: 'setup_modal' });
    onClose();
  };

  const speciesOptions: {
    id: PartnerSpecies;
    icon: typeof Cat;
    label: string;
    desc: string;
    names: string[];
  }[] = [
    { id: 'cat', icon: Cat, label: '貓', desc: '冷靜、溫柔、安靜陪伴', names: CAT_DEFAULT_NAMES },
    { id: 'dog', icon: Dog, label: '狗', desc: '活力、鼓勵、溫暖同行', names: DOG_DEFAULT_NAMES },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="partner-setup-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[120] flex items-center justify-center px-5 bg-bg-primary/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[400px] max-h-[88vh] overflow-y-auto bg-bg-card rounded-card border border-accent/40 shadow-card"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/12 via-transparent to-auxiliary/8 pointer-events-none rounded-card" />

            <button
              onClick={onClose}
              aria-label="關閉"
              className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
            >
              <X size={18} />
            </button>

            <div className="relative px-5 pt-8 pb-5">
              <p className="text-[10px] uppercase tracking-widest text-text-secondary">
                訓練夥伴
              </p>
              <h2 className="font-display text-2xl tracking-wide uppercase text-text-primary mt-1 leading-tight">
                揀你嘅 Partner
              </h2>
              <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                你訓練，Partner 成長。佢會陪你記錄、陪你休息、陪你進步。
              </p>

              {/* 物種選擇 */}
              <div className="grid grid-cols-2 gap-3 mt-5">
                {speciesOptions.map((s, i) => {
                  const Icon = s.icon;
                  const isSel = species === s.id;
                  return (
                    <motion.button
                      key={s.id}
                      type="button"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => handleSelect(s.id)}
                      className={cn(
                        'relative p-3 rounded-card border-2 text-center transition-all',
                        isSel
                          ? 'border-accent bg-gradient-to-br from-accent/10 via-bg-card to-bg-card shadow-card'
                          : 'border-border/60 bg-bg-card hover:border-accent/40'
                      )}
                    >
                      <div
                        className={cn(
                          'w-14 h-14 mx-auto rounded-2xl flex items-center justify-center',
                          isSel ? 'bg-accent text-bg-primary' : 'bg-accent-soft text-accent'
                        )}
                      >
                        <Icon size={26} />
                      </div>
                      <h3 className="font-display text-base tracking-wide uppercase text-text-primary mt-1.5">
                        {s.label}
                      </h3>
                      <p className="text-[10px] text-text-secondary mt-0.5 leading-snug">
                        {s.desc}
                      </p>
                      <CheckCircle2
                        size={18}
                        className={cn(
                          'absolute top-1.5 right-1.5 transition-all',
                          isSel ? 'text-accent opacity-100 scale-100' : 'opacity-0 scale-75'
                        )}
                      />
                    </motion.button>
                  );
                })}
              </div>

              {/* 改名區 */}
              <AnimatePresence>
                {species && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 overflow-hidden"
                  >
                    <label className="text-[10px] uppercase tracking-widest text-text-secondary block mb-2">
                      幫 Partner 改名（可以唔改）
                    </label>
                    <div className="flex gap-2 flex-wrap mb-2">
                      {(species === 'cat' ? CAT_DEFAULT_NAMES : DOG_DEFAULT_NAMES).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setName(n)}
                          className={cn(
                            'px-2.5 py-1.5 rounded-button text-xs font-bold transition-colors',
                            name === n
                              ? 'bg-accent text-bg-primary'
                              : 'bg-bg-secondary border border-border text-text-secondary hover:border-accent/40'
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={name}
                      maxLength={12}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                      placeholder="自訂名字…"
                      className="w-full h-11 px-4 bg-bg-secondary rounded-button border-2 border-border text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none transition-colors"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 獎勵預覽 */}
              <div className="mt-4 p-3 rounded-card bg-accent/8 border border-accent/25">
                <div className="flex items-center gap-2 mb-1">
                  <Gift size={14} className="text-accent" />
                  <span className="text-[10px] uppercase tracking-widest text-accent font-bold">
                    完成訓練 → Partner 獲得 XP 並成長
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  3 次訓練內，Partner 會出現明顯成長變化。
                </p>
              </div>

              <Button
                fullWidth
                size="lg"
                className="mt-5"
                disabled={!species}
                onClick={handleConfirm}
              >
                確認建立
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
