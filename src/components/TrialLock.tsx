import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Zap, AlertCircle, Smartphone } from 'lucide-react';
import { useTrialStore, STANDARD_STAGES, DEV_STAGES } from '@/store/trialStore';

interface TrialLockProps {
  children: React.ReactNode;
}

export function TrialLock({ children }: TrialLockProps) {
  const { isExpired, initTrial, installedAt } = useTrialStore();
  const [initialized, setInitialized] = useState(false);

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
  const { currentStage, getStageInfo, getRemainingHuman, redeemCode, deviceId, devMode } =
    useTrialStore();
  const [code, setCode] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const stageInfo = getStageInfo();
  const stages = devMode ? DEV_STAGES : STANDARD_STAGES;
  const nextStage = stages[currentStage + 1];

  const handleRedeem = async () => {
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    setResult(null);
    const res = await redeemCode(code);
    setResult(res);
    setSubmitting(false);
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
            {stageInfo.label} · {getRemainingHuman()}
          </p>
        </div>

        {/* 裝置 ID */}
        <div className="bg-bg-card rounded-card border border-border/40 p-3 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Smartphone size={14} className="text-text-secondary" />
            <span className="text-[10px] uppercase tracking-widest text-text-secondary">
              裝置 ID
            </span>
          </div>
          <div
            className="font-mono text-[13px] text-text-primary tracking-wider break-all select-all cursor-pointer"
            onClick={() => deviceId && navigator.clipboard?.writeText(deviceId)}
            title="點擊複製"
          >
            {deviceId || '—'}
          </div>
          <div className="text-[9px] text-text-secondary/60 mt-1">
            向管理員索取續用碼時請提供此裝置 ID
          </div>
        </div>

        {/* 階梯進度 */}
        <div className="bg-bg-card rounded-card border border-border/40 p-4 mb-6">
          <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-3">
            試用進度
          </div>
          <div className="flex items-center gap-1">
            {stages.map((s, i) => (
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
            {stages.map((s, i) => (
              <span key={i} className="text-[9px] text-text-secondary">
                {s.durationMs === -1 ? '∞' : devMode ? Math.round(s.durationMs / 1000) + 's' : Math.round(s.durationMs / 86400000) + 'd'}
              </span>
            ))}
          </div>
        </div>

        {/* 續用碼輸入 */}
        {nextStage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="bg-bg-card rounded-card border border-border/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Unlock size={16} className="text-accent" />
                <span className="text-xs uppercase tracking-widest text-text-secondary">
                  輸入續用碼
                </span>
              </div>
              <p className="text-xs text-text-secondary mb-3">
                {nextStage.durationMs === -1
                  ? '輸入永久會員碼，解鎖無限期使用'
                  : `輸入續用碼，延長 ${devMode ? (nextStage.durationMs / 1000) + ' 秒' : (nextStage.durationMs / 86400000) + ' 天'}試用`}
              </p>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setResult(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                placeholder="格式：IRON-XXXXXXXX-STAGE-SIG"
                className="w-full h-12 px-4 bg-bg-secondary rounded-button border-2 border-border text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none transition-colors font-mono uppercase tracking-wider"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                onClick={handleRedeem}
                disabled={!code.trim() || submitting}
                className="w-full h-12 mt-3 bg-accent text-bg-primary rounded-button text-sm font-bold uppercase tracking-wider disabled:opacity-40 disabled:pointer-events-none active:translate-y-px transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span className="opacity-70">驗證中…</span>
                ) : (
                  <>
                    <Unlock size={16} /> 解鎖
                  </>
                )}
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
