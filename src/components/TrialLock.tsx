import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Zap, AlertCircle } from 'lucide-react';
import { useTrialStore, TRIAL_STAGES } from '@/store/trialStore';

interface TrialLockProps {
  children: React.ReactNode;
}

export function TrialLock({ children }: TrialLockProps) {
  const { isExpired, initTrial, installedAt } = useTrialStore();
  const [initialized, setInitialized] = useState(false);

  // 確保 trial 已初始化
  if (!initialized) {
    if (!installedAt) {
      initTrial();
    }
    setInitialized(true);
  }

  if (isExpired()) {
    return <LockedScreen />;
  }

  return <>{children}</>;
}

function LockedScreen() {
  const { currentStage, getStageInfo, redeemCode } = useTrialStore();
  const [code, setCode] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const stageInfo = getStageInfo();
  const nextStage = TRIAL_STAGES[currentStage + 1];

  const handleRedeem = () => {
    if (!code.trim()) return;
    const res = redeemCode(code);
    setResult(res);
    if (res.success) {
      setCode('');
    }
  };

  return (
    <div className="min-h-screen w-full max-w-[480px] mx-auto bg-bg-primary flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        {/* 鎖定圖示 */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{
              background: 'var(--accent-soft)',
              border: '2px solid var(--accent)',
            }}
          >
            <Lock size={32} className="text-accent" />
          </motion.div>
          <h1 className="font-display text-3xl tracking-wide uppercase text-text-primary text-center">
            試用已到期
          </h1>
          <p className="text-sm text-text-secondary mt-2 text-center">
            {stageInfo.label} · 已結束
          </p>
        </div>

        {/* 階梯進度 */}
        <div className="bg-bg-card rounded-card border border-border/40 p-4 mb-6">
          <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-3">
            試用進度
          </div>
          <div className="flex items-center gap-1">
            {TRIAL_STAGES.map((stage, i) => (
              <div
                key={i}
                className="flex-1 h-2 rounded-full transition-all"
                style={{
                  background: i <= currentStage ? 'var(--accent)' : 'var(--border-color)',
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[9px] text-text-secondary">5天</span>
            <span className="text-[9px] text-text-secondary">7天</span>
            <span className="text-[9px] text-text-secondary">14天</span>
            <span className="text-[9px] text-text-secondary">30天</span>
            <span className="text-[9px] text-text-secondary">永久</span>
          </div>
        </div>

        {/* 續用碼輸入 */}
        {nextStage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-bg-card rounded-card border border-border/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Unlock size={16} className="text-accent" />
                <span className="text-xs uppercase tracking-widest text-text-secondary">
                  輸入續用碼
                </span>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                {nextStage.days === -1
                  ? '輸入永久會員碼，解鎖無限期使用'
                  : `輸入續用碼，延長 ${nextStage.days} 天試用`}
              </p>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setResult(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                placeholder="例如：IRON-7"
                className="w-full h-12 px-4 bg-bg-secondary rounded-button border-2 border-border text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none transition-colors font-mono uppercase tracking-wider"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                onClick={handleRedeem}
                disabled={!code.trim()}
                className="w-full h-12 mt-3 bg-accent text-bg-primary rounded-button text-sm font-bold uppercase tracking-wider disabled:opacity-40 disabled:pointer-events-none active:translate-y-px transition-all"
              >
                解鎖
              </button>

              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3"
                  >
                    {result.success ? (
                      <div className="flex items-center gap-2 text-xs text-accent">
                        <Zap size={14} />
                        <span>{result.message}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-auxiliary">
                        <AlertCircle size={14} />
                        <span>{result.message}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* 提示 */}
        <div className="mt-6 text-center">
          <p className="text-[11px] text-text-secondary/60">
            向開發者索取續用碼以繼續使用
          </p>
        </div>
      </motion.div>
    </div>
  );
}
