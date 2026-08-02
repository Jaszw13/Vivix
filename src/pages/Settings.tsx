import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun, User, Trash2, Dumbbell, Clock, Shield, Smartphone, Copy, RotateCcw, FastForward, AlertTriangle, Bug } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, SectionHeader, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useThemeStore } from '@/store/themeStore';
import { useProfileStore } from '@/store/profileStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { useTrialStore, STANDARD_STAGES, DEV_STAGES } from '@/store/trialStore';
import { cn } from '@/lib/utils';

export default function Settings() {
  const { theme, toggleTheme } = useThemeStore();
  const { profile, updateProfile, resetAllData } = useProfileStore();
  const { getTotalSessions, getTotalVolume, personalRecords } = useWorkoutStore();
  const {
    isPermanent,
    getStageInfo,
    getRemainingHuman,
    currentStage,
    feedbackCount,
    deviceId,
    devMode,
    enableDevMode,
    disableDevMode,
    devForceExpireNow,
    devForceFeedbackNow,
    devResetTrial,
    devAdvanceStage,
  } = useTrialStore();

  // 開發者選單隱藏開關：連點 IRONPULSE 5 次
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<number | null>(null);
  const [devMenuOpen, setDevMenuOpen] = useState(false);

  const stageInfo = getStageInfo();
  const stages = devMode ? DEV_STAGES : STANDARD_STAGES;

  const handleLogoTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
    tapTimerRef.current = window.setTimeout(() => {
      tapCountRef.current = 0;
    }, 800);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      setDevMenuOpen((x) => !x);
    }
  };

  const handleReset = () => {
    if (window.confirm('確定要重置所有訓練資料？此操作將清除所有記錄且無法復原。')) {
      resetAllData();
    }
  };

  const copyDeviceId = () => {
    if (deviceId) {
      navigator.clipboard?.writeText(deviceId);
    }
  };

  return (
    <PageShell title="設定">
      {/* 主題切換 */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <SectionHeader title="外觀主題" subtitle="選擇你的風格" />
        <div className="grid grid-cols-2 gap-3">
          <ThemeCard
            active={theme === 'dark'}
            onClick={() => theme !== 'dark' && toggleTheme()}
            name="工業電力"
            description="深黑 · 電力綠"
            preview={
              <div className="bg-[#0A0A0B] h-full flex flex-col p-3">
                <div
                  className="text-[#FFFFFF] font-bold text-xs mb-2"
                  style={{ fontFamily: 'Bebas Neue' }}
                >
                  IRONPULSE
                </div>
                <div className="bg-[#2C2C2E] flex-1 rounded-sm p-2 flex flex-col gap-1">
                  <div className="h-1.5 w-8 bg-[#D4FF00] rounded-sm" />
                  <div className="h-1 w-6 bg-[#8E8E93] rounded-sm" />
                </div>
                <div className="mt-2 bg-[#D4FF00] h-3 rounded-sm" />
              </div>
            }
            icon={<Moon size={16} />}
          />
          <ThemeCard
            active={theme === 'light'}
            onClick={() => theme !== 'light' && toggleTheme()}
            name="高雅米白"
            description="米白 · 香檳金"
            preview={
              <div className="bg-[#F8F5F0] h-full flex flex-col p-3">
                <div
                  className="text-[#2C2B28] font-bold text-xs mb-2"
                  style={{ fontFamily: 'Playfair Display' }}
                >
                  IRONPULSE
                </div>
                <div className="bg-[#FFFFFF] flex-1 rounded-lg p-2 flex flex-col gap-1 shadow-sm">
                  <div className="h-1.5 w-8 bg-[#C9A96E] rounded-sm" />
                  <div className="h-1 w-6 bg-[#7A756D] rounded-sm" />
                </div>
                <div className="mt-2 bg-[#C9A96E] h-3 rounded-md" />
              </div>
            }
            icon={<Sun size={16} />}
          />
        </div>
      </motion.div>

      {/* 個人資料 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-6"
      >
        <SectionHeader title="個人資料" />
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-accent-soft flex items-center justify-center">
              <User size={22} className="text-accent" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-widest text-text-secondary">
                名稱
              </div>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => updateProfile({ name: e.target.value })}
                className="bg-transparent text-lg font-bold text-text-primary w-full focus:outline-none"
              />
            </div>
          </div>
          <div className="pt-4 border-t border-border/40">
            <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-1">
              體重
            </div>
            <div className="flex items-baseline gap-1">
              <input
                type="number"
                value={profile.bodyWeight ?? ''}
                onChange={(e) =>
                  updateProfile({ bodyWeight: parseFloat(e.target.value) || undefined })
                }
                className="bg-transparent font-mono text-2xl font-bold text-text-primary w-24 focus:outline-none"
                inputMode="decimal"
              />
              <span className="text-sm text-text-secondary">kg</span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* 訓練概況 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6"
      >
        <SectionHeader title="訓練概況" />
        <Card className="p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="font-mono text-2xl font-bold text-text-primary">
                {getTotalSessions()}
              </div>
              <div className="text-[9px] uppercase tracking-widest text-text-secondary mt-1">
                總訓練
              </div>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-text-primary">
                {getTotalVolume()}
                <span className="text-xs text-text-secondary ml-0.5">t</span>
              </div>
              <div className="text-[9px] uppercase tracking-widest text-text-secondary mt-1">
                總噸數
              </div>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-text-primary">
                {personalRecords.length}
              </div>
              <div className="text-[9px] uppercase tracking-widest text-text-secondary mt-1">
                PR 數
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* 試用狀態 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-6"
      >
        <SectionHeader title="試用狀態" subtitle="授權與到期" />
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'var(--accent-soft)' }}
            >
              {isPermanent() ? (
                <Shield size={20} className="text-accent" />
              ) : (
                <Clock size={20} className="text-accent" />
              )}
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-widest text-text-secondary">
                {isPermanent() ? '永久會員' : stageInfo.label}
              </div>
              <div className="font-mono text-lg font-bold text-text-primary">
                {getRemainingHuman()}
              </div>
            </div>
            {isPermanent() && <Badge variant="accent">永久</Badge>}
            {devMode && <Badge variant="auxiliary">DEV MODE</Badge>}
          </div>

          {/* 裝置 ID */}
          <div className="pt-3 border-t border-border/40">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-widest text-text-secondary flex items-center gap-1">
                <Smartphone size={10} />
                裝置 ID
              </span>
              <button
                onClick={copyDeviceId}
                className="text-[10px] text-accent flex items-center gap-0.5"
                title="複製裝置 ID"
              >
                <Copy size={10} />
                複製
              </button>
            </div>
            <div className="font-mono text-[11px] text-text-primary break-all select-all bg-bg-secondary rounded-button px-2 py-1.5 border border-border/30">
              {deviceId || '—'}
            </div>
            <div className="text-[9px] text-text-secondary/70 mt-1">
              向管理員索取續用碼時請提供此 ID
            </div>
          </div>

          {/* 階梯進度 */}
          <div className="pt-3 mt-3 border-t border-border/40">
            <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-2">
              階梯進度
            </div>
            <div className="flex items-center gap-1">
              {stages.map((s, i) => (
                <div key={i} className="flex-1">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      background: i <= currentStage ? 'var(--accent)' : 'var(--border-color)',
                    }}
                  />
                  <div className="text-[8px] text-center mt-1 text-text-secondary">
                    {s.durationMs === -1
                      ? '∞'
                      : devMode
                      ? Math.round(s.durationMs / 1000) + 's'
                      : Math.round(s.durationMs / 86400000) + 'd'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 反饋次數 */}
          <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-text-secondary">
              已提交反饋
            </span>
            <span className="font-mono text-sm font-bold text-text-primary">
              {feedbackCount} 次
            </span>
          </div>
        </Card>
      </motion.div>

      {/* 開發者選單 */}
      {devMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.17 }}
          className="mt-6"
        >
          <SectionHeader
            title="開發者選單"
            subtitle="連點 5 次 IRONPULSE Logo 開啟"
            action={
              <Badge variant="auxiliary">
                <Bug size={10} /> DEV
              </Badge>
            }
          />
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-text-secondary">
                  測試模式
                </div>
                <div className="text-xs text-text-secondary">
                  開啟後階段時長變為秒級，方便測試
                </div>
              </div>
              <button
                onClick={() => (devMode ? disableDevMode() : enableDevMode())}
                className={cn(
                  'h-9 w-16 rounded-full relative transition-colors',
                  devMode ? 'bg-accent' : 'bg-border'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 left-1 w-7 h-7 rounded-full bg-bg-card transition-transform',
                    devMode && 'translate-x-7'
                  )}
                />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={devForceExpireNow}
                className="flex flex-col items-center gap-1 p-3 rounded-button border border-auxiliary/40 text-auxiliary hover:bg-auxiliary/10 transition-colors"
              >
                <AlertTriangle size={18} />
                <span className="text-[10px] uppercase tracking-wider font-bold">立即過期</span>
              </button>
              <button
                onClick={devForceFeedbackNow}
                className="flex flex-col items-center gap-1 p-3 rounded-button border border-accent/40 text-accent hover:bg-accent-soft transition-colors"
              >
                <MessageSquare size={18} />
                <span className="text-[10px] uppercase tracking-wider font-bold">彈出反饋</span>
              </button>
              <button
                onClick={devAdvanceStage}
                className="flex flex-col items-center gap-1 p-3 rounded-button border border-accent/40 text-accent hover:bg-accent-soft transition-colors"
              >
                <FastForward size={18} />
                <span className="text-[10px] uppercase tracking-wider font-bold">跳到下一階段</span>
              </button>
              <button
                onClick={devResetTrial}
                className="flex flex-col items-center gap-1 p-3 rounded-button border border-border text-text-secondary hover:bg-bg-secondary transition-colors"
              >
                <RotateCcw size={18} />
                <span className="text-[10px] uppercase tracking-wider font-bold">重置試用期</span>
              </button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* 關於 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: devMenuOpen ? 0.22 : 0.2 }}
        className="mt-6"
      >
        <SectionHeader title="關於" />
        <Card className="p-4">
          <button
            onClick={handleLogoTap}
            className="flex items-center gap-3 mb-2 w-full text-left"
          >
            <Dumbbell size={20} className="text-accent flex-shrink-0" />
            <div>
              <div className="font-display text-xl tracking-wide uppercase text-text-primary select-none">
                IRONPULSE
              </div>
              <div className="text-[10px] text-text-secondary">v1.0.0 · 力量訓練</div>
            </div>
          </button>
          <p className="text-xs text-text-secondary leading-relaxed">
            一款專為力量訓練打造的手機應用，協助你記錄訓練、追蹤進度、突破 PR。所有資料皆儲存於本地裝置，無需網路即可使用。
          </p>
        </Card>
      </motion.div>

      {/* 危險區 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: devMenuOpen ? 0.25 : 0.25 }}
        className="mt-6"
      >
        <SectionHeader title="資料管理" />
        <Button variant="danger" fullWidth onClick={handleReset}>
          <Trash2 size={16} /> 重置所有資料
        </Button>
        <p className="text-[10px] text-text-secondary mt-2 text-center">
          清除所有訓練記錄與個人資料
        </p>
      </motion.div>
    </PageShell>
  );
}

// 缺的 icon 宣告（順利編譯）
function MessageSquare({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

interface ThemeCardProps {
  active: boolean;
  onClick: () => void;
  name: string;
  description: string;
  preview: React.ReactNode;
  icon: React.ReactNode;
}

function ThemeCard({ active, onClick, name, description, preview, icon }: ThemeCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-card border-2 overflow-hidden transition-all',
        active ? 'border-accent shadow-button' : 'border-border hover:border-accent/50'
      )}
    >
      <div className="h-28 p-1">
        <div className="w-full h-full overflow-hidden rounded-card">{preview}</div>
      </div>
      <div className="p-3 flex items-center gap-2 bg-bg-card">
        <div
          className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
            active ? 'bg-accent text-bg-primary' : 'bg-bg-secondary text-text-secondary'
          )}
        >
          {icon}
        </div>
        <div className="text-left flex-1">
          <div className={cn('text-sm font-bold', active ? 'text-accent' : 'text-text-primary')}>
            {name}
          </div>
          <div className="text-[10px] text-text-secondary">{description}</div>
        </div>
      </div>
    </button>
  );
}
