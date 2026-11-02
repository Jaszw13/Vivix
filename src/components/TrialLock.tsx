import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Zap, AlertCircle, Smartphone } from 'lucide-react';
import { useTrialStore, STANDARD_STAGES, DEV_STAGES } from '@/store/trialStore';
import { DAY_MS } from '@/utils/time';
import { getMotionForPack, toFramerVariants, toFramerTransition } from '@/data/packMotion';
import { useThemeStore } from '@/store/themeStore';
import { routeStaysOpenWhenExpired } from '@/routing/trialAccess';

interface TrialLockProps {
  children: React.ReactNode;
}

export function TrialLock({ children }: TrialLockProps) {
  // ⚠️ 用細粒度 selector 拎 action。如果唔傳 selector 而拎成個 object，
  //    每次 render 都有新 ref，放落 useEffect deps 會 trigger 不必要嘅 re-run。
  //    zustand action 本身係 internal stable，但 destructuring 時冇 selector 會有問題
  const isExpired = useTrialStore((s) => s.isExpired);
  const initTrial = useTrialStore((s) => s.initTrial);
  const installedAt = useTrialStore((s) => s.installedAt);

  useEffect(() => {
    if (!installedAt) {
      initTrial();
    }
    // installedAt 由 ''(pre-hydrate/default) → ISO 後唔再跑；initTrial 係 zustand action stable
  }, [installedAt, initTrial]);

  // persist middleware hydrate 前 installedAt 可能係 undefined，如果此時直接 isExpired()
  // 可能誤判為 expired 並 render LockedScreen。等 hydrate 完（installedAt 有值 or 保持 null 都算初始化）
  const location = useLocation();
  const hydrated = installedAt !== undefined;
  if (!hydrated) {
    return (
      <div className="min-h-screen w-full max-w-[480px] mx-auto bg-bg-primary flex items-center justify-center">
        <div className="animate-pulse text-[10px] uppercase tracking-widest text-text-secondary">
          Loading Vivix…
        </div>
      </div>
    );
  }

  // 到期不再整頁換掉。進度、舊紀錄、設定、首頁都留著；
  // 今日點練在首頁裡另外收起。沒列進清單的路徑才看到全頁鎖。
  if (isExpired() && !routeStaysOpenWhenExpired(location.pathname)) {
    return <LockedScreen />;
  }

  return <>{children}</>;
}

/** 續用碼。到期後放在今日點練和設定，不再擋住紀錄。 */
export function TrialRedeemPanel() {
  const { currentStage, getStageInfo, redeemCode, devMode } = useTrialStore();
  const [code, setCode] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const stages = devMode ? DEV_STAGES : STANDARD_STAGES;
  const nextStage = stages[currentStage + 1];
  const stageInfo = getStageInfo();

  const handleRedeem = () => {
    if (!code.trim()) return;
    setResult(null);
    const res = redeemCode(code);
    setResult(res);
    if (res.success) setCode('');
  };

  if (!nextStage) {
    return (
      <p className="text-xs text-text-secondary">{stageInfo.label}</p>
    );
  }

  return (
    <div className="bg-bg-secondary rounded-card border border-border/40 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Unlock size={16} className="text-accent" />
        <span className="text-xs uppercase tracking-widest text-text-secondary">輸入續用碼</span>
      </div>
      <p className="text-xs text-text-secondary mb-3">
        {nextStage.durationMs === -1
          ? '輸入永久會員碼，再打開今日點練'
          : `輸入續用碼，延長 ${devMode ? nextStage.durationMs / 1000 + ' 秒' : nextStage.durationMs / DAY_MS + ' 天'}，再打開今日點練`}
      </p>
      <input
        type="text"
        value={code}
        onChange={(event) => {
          setCode(event.target.value);
          setResult(null);
        }}
        onKeyDown={(event) => event.key === 'Enter' && handleRedeem()}
        placeholder="輸入續用碼"
        className="w-full h-12 px-4 bg-bg-card rounded-button border-2 border-border text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none transition-colors font-mono tracking-wider"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={handleRedeem}
        disabled={!code.trim()}
        className="w-full h-12 mt-3 bg-accent text-bg-primary rounded-button text-sm font-bold uppercase tracking-wider disabled:opacity-40 disabled:pointer-events-none active:translate-y-px transition-all flex items-center justify-center gap-2"
      >
        <Unlock size={16} /> 解鎖
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
  );
}

function LockedScreen() {
  const navigate = useNavigate();
  const { currentStage, getStageInfo, getRemainingHuman, deviceId, devMode } = useTrialStore();
  const packId = useThemeStore((s) => s.activePackId);
  const motionEnabled = useThemeStore((s) => s.motionEnabled);
  const variant = getMotionForPack(packId, motionEnabled);

  const stageInfo = getStageInfo();
  const stages = devMode ? DEV_STAGES : STANDARD_STAGES;

  return (
    <div className="min-h-screen w-full max-w-[480px] mx-auto bg-bg-primary flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        variants={toFramerVariants(variant)}
        initial="hidden"
        animate="visible"
        transition={toFramerTransition(variant)}
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
            裝置 ID（僅供識別，續用碼不需綁定裝置）
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
                  background: i <= currentStage ? 'var(--accent)' : 'var(--border)',
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {stages.map((s, i) => (
              <span key={i} className="text-[9px] text-text-secondary">
                {s.durationMs === -1 ? '∞' : devMode ? Math.round(s.durationMs / 1000) + 's' : Math.round(s.durationMs / DAY_MS) + 'd'}
              </span>
            ))}
          </div>
        </div>

        <TrialRedeemPanel />

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => navigate('/progress')}
            className="h-11 rounded-button border border-border text-xs font-bold text-text-primary"
          >
            查看進度
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="h-11 rounded-button border border-border text-xs font-bold text-text-primary"
          >
            設定與備份
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-[11px] text-text-secondary/60">
            紀錄一直都在。續用碼只打開今日點練。
          </p>
        </div>
      </motion.div>
    </div>
  );
}
