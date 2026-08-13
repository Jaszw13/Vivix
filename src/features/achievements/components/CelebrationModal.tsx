/**
 * CelebrationModal — 成就解鎖慶祝儀式
 * 徽章 spring scale-in + 主題光暈 + 大標題 + 具體 copy + Partner cameo
 * ≤3 秒可跳過；同一 session 多解鎖時合併為一次慶祝清單
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Sparkles, Award, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TIER_COLORS, TRACK_LABELS, type AchievementDef } from '@/data/achievements';

export interface CelebrationItem {
  def: AchievementDef;
  formattedCopy: string;
}

interface Props {
  items: CelebrationItem[];
  open: boolean;
  onContinue: () => void;
  onViewWall: () => void;
}

export function CelebrationModal({ items, open, onContinue, onViewWall }: Props) {
  const [idx, setIdx] = useState(0);
  const current = items[idx];

  // 3 秒自動跳到下一個或關閉
  useEffect(() => {
    if (!open || items.length === 0) return;
    const timer = setTimeout(() => {
      if (idx < items.length - 1) {
        setIdx((i) => i + 1);
      } else {
        onContinue();
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [open, idx, items.length, onContinue]);

  // 重置 index 當 modal 重開
  useEffect(() => {
    if (open) setIdx(0);
  }, [open]);

  return (
    <AnimatePresence>
      {open && current && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-6"
          onClick={onContinue}
        >
          <motion.div
            key={current.def.id}
            initial={{ scale: 0.6, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 260, mass: 0.9 }}
            className="w-full max-w-xs bg-bg-primary rounded-3xl p-6 text-center border border-accent/30 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const tier = TIER_COLORS[current.def.tier];
              return (
                <>
                  {/* 背景光暈 — 主題電光 */}
                  <div
                    className="absolute inset-0 opacity-50 pointer-events-none blur-2xl"
                    style={{
                      background: `radial-gradient(circle at 50% 30%, ${tier.color}, transparent 70%)`,
                    }}
                  />

                  {/* 多解鎖計數 */}
                  {items.length > 1 && (
                    <div className="relative mb-2">
                      <span className="text-[10px] uppercase tracking-widest text-accent font-bold">
                        {idx + 1} / {items.length} 解鎖
                      </span>
                    </div>
                  )}

                  {/* 徽章 spring scale-in */}
                  <motion.div
                    initial={{ rotate: -20, scale: 0.3 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 15 }}
                    className="relative w-24 h-24 mx-auto rounded-full flex items-center justify-center border-2 shadow-2xl"
                    style={{
                      backgroundColor: `${tier.color}30`,
                      borderColor: tier.color,
                      boxShadow: `0 0 40px ${tier.color}80`,
                    }}
                  >
                    <Award size={40} style={{ color: tier.color }} strokeWidth={2} />
                    <Sparkles size={16} className="absolute -top-1 -right-1 text-accent" strokeWidth={2.5} />
                    <Sparkles size={12} className="absolute -bottom-1 -left-2 text-accent" strokeWidth={2.5} />
                  </motion.div>

                  {/* tier 標籤 */}
                  <div className="relative mt-5 flex items-center justify-center gap-2">
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                      style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
                    >
                      {tier.label} 解鎖
                    </span>
                    <span className="text-[10px] text-text-secondary uppercase tracking-wider">
                      {TRACK_LABELS[current.def.track]}
                    </span>
                  </div>

                  {/* 大標題 */}
                  <h3 className="relative font-display text-2xl tracking-wide uppercase text-text-primary mt-3">
                    {current.def.title}
                  </h3>

                  {/* 具體 copy（數字 + 時間軸） */}
                  <p className="relative text-sm text-text-secondary mt-2 leading-relaxed">
                    {current.formattedCopy}
                  </p>

                  {/* Partner cameo 槽位 */}
                  {current.def.partnerReward && (
                    <p className="relative text-[10px] text-accent mt-2">
                      Partner 獲得新配件
                    </p>
                  )}

                  {/* 按鈕 */}
                  <div className="relative mt-6 flex gap-2">
                    <Button fullWidth size="md" onClick={onContinue}>
                      繼續
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={onViewWall}
                      aria-label="查看成就牆"
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>

                  {/* 進度 dots（多解鎖時） */}
                  {items.length > 1 && (
                    <div className="relative flex justify-center gap-1.5 mt-4">
                      {items.map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full transition-all"
                          style={{
                            backgroundColor: i === idx ? 'var(--accent)' : 'var(--border-color)',
                            transform: i === idx ? 'scale(1.3)' : 'scale(1)',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
