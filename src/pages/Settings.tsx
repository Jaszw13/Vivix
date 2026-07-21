import { motion } from 'framer-motion';
import { Moon, Sun, User, Trash2, Dumbbell } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useThemeStore } from '@/store/themeStore';
import { useProfileStore } from '@/store/profileStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { cn } from '@/lib/utils';

export default function Settings() {
  const { theme, toggleTheme } = useThemeStore();
  const { profile, updateProfile, resetAllData } = useProfileStore();
  const { getTotalSessions, getTotalVolume, personalRecords } = useWorkoutStore();

  const handleReset = () => {
    if (
      window.confirm(
        '確定要重置所有訓練資料？此操作將清除所有記錄且無法復原。'
      )
    ) {
      resetAllData();
    }
  };

  return (
    <PageShell title="設定">
      {/* 主題切換 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <SectionHeader title="外觀主題" subtitle="選擇你的風格" />
        <div className="grid grid-cols-2 gap-3">
          {/* 工業電力 */}
          <ThemeCard
            active={theme === 'dark'}
            onClick={() => theme !== 'dark' && toggleTheme()}
            name="工業電力"
            description="深黑 · 電力綠"
            preview={
              <div className="bg-[#0A0A0B] h-full flex flex-col p-3">
                <div className="text-[#FFFFFF] font-bold text-xs mb-2" style={{ fontFamily: 'Bebas Neue' }}>
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
          {/* 高雅米白 */}
          <ThemeCard
            active={theme === 'light'}
            onClick={() => theme !== 'light' && toggleTheme()}
            name="高雅米白"
            description="米白 · 香檳金"
            preview={
              <div className="bg-[#F8F5F0] h-full flex flex-col p-3">
                <div className="text-[#2C2B28] font-bold text-xs mb-2" style={{ fontFamily: 'Playfair Display' }}>
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

      {/* 關於 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-6"
      >
        <SectionHeader title="關於" />
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <Dumbbell size={20} className="text-accent" />
            <div>
              <div className="font-display text-xl tracking-wide uppercase text-text-primary">
                IRONPULSE
              </div>
              <div className="text-[10px] text-text-secondary">v1.0.0 · 力量訓練</div>
            </div>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            一款專為力量訓練打造的手機應用，協助你記錄訓練、追蹤進度、突破 PR。所有資料皆儲存於本地裝置，無需網路即可使用。
          </p>
        </Card>
      </motion.div>

      {/* 危險區 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
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
        active
          ? 'border-accent shadow-button'
          : 'border-border hover:border-accent/50'
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
