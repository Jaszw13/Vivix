/**
 * Vivix 成就頁 v1.3 — 美感重設計
 *
 * 結構：
 *   Header → NextAchievementCard(hero) → TrackTabs → 內容區 → 視圖切換
 *   strength → 4 張 StrengthLadder；其他軌 → AchievementGrid
 *   Overlays: AchievementDetailSheet
 *
 * 雙主題一致、有 hero 進度卡、無灰階羞辱
 */
import { useMemo, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Clock, LayoutGrid } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, SectionHeader } from '@/components/ui/Card';
import { useWorkoutStore } from '@/store/workoutStore';
import { useProfileStore } from '@/store/profileStore';
import {
  useAchievementsStore,
  formatAchievementCopy,
  type AchievementProgress,
} from '@/store/achievementsStore';
import {
  ACHIEVEMENTS,
  SORTED_ACHIEVEMENTS,
  TIER_COLORS,
  TRACK_LABELS,
  groupByTrack,
  groupByLine,
  getLiftFamily,
  type AchievementDef,
  type AchievementTrack,
  type LiftFamily,
} from '@/data/achievements';
import { useTelemetryStore } from '@/features/partner/stores/telemetryStore';
import { settleTaxonomyChange } from '@/features/stats/settleAll';
import { NextAchievementCard } from './components/NextAchievementCard';
import { TrackTabs } from './components/TrackTabs';
import { StrengthLadder } from './components/StrengthLadder';
import { AchievementGrid } from './components/AchievementGrid';
import { AchievementDetailSheet } from './components/AchievementDetailSheet';
import { TimelineView } from './components/TimelineView';
import { pickNextAchievement } from './engine/nextAchievement';
import { cn } from '@/lib/utils';
import { formatUnlockDate } from '@/utils/format';

const LIFT_FAMILIES: { family: LiftFamily; label: string }[] = [
  { family: 'bench', label: '臥推' },
  { family: 'squat', label: '深蹲' },
  { family: 'deadlift', label: '硬舉' },
  { family: 'ohp', label: '肩推' },
];

export default function AchievementsPage() {
  const { sessions, personalRecords } = useWorkoutStore();
  const { profile } = useProfileStore();
  const progress = useAchievementsStore((s) => s.progress);
  const lastMetrics = useAchievementsStore((s) => s.lastMetrics);
  const log = useTelemetryStore((s) => s.log);

  const [activeTrack, setActiveTrack] = useState<AchievementTrack>('strength');
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [detailDef, setDetailDef] = useState<AchievementDef | null>(null);

  // 進入頁面時重算（確保分類變更後即時反映）
  useEffect(() => {
    // C5：統一透過 settleTaxonomyChange 結算（保證 achievements + quests 同源）
    settleTaxonomyChange();
    log('achievement_wall_viewed');
  }, [sessions, personalRecords, profile.bodyWeight, log]);

  // 格式化 copy
  const formatCopy = useCallback(
    (def: AchievementDef) => {
      if (lastMetrics) return formatAchievementCopy(def, lastMetrics);
      return def.copy;
    },
    [lastMetrics],
  );

  // 統計
  const unlockedCount = SORTED_ACHIEVEMENTS.filter((a) => progress[a.id]?.unlocked).length;
  const totalCount = SORTED_ACHIEVEMENTS.length;
  const unlockRate = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  // 最近解鎖日期
  const lastUnlockDate = useMemo(() => {
    let latest: string | null = null;
    for (const a of ACHIEVEMENTS) {
      const p = progress[a.id];
      if (p?.unlocked && p.unlockedAt) {
        if (!latest || p.unlockedAt > latest) latest = p.unlockedAt;
      }
    }
    return latest;
  }, [progress]);

  // 各軌解鎖計數
  const trackCounts = useMemo(() => {
    const byTrack = groupByTrack();
    const out: Partial<Record<AchievementTrack, { unlocked: number; total: number }>> = {};
    for (const track of Object.keys(byTrack) as AchievementTrack[]) {
      const items = byTrack[track];
      const unlocked = items.filter((a) => progress[a.id]?.unlocked).length;
      out[track] = { unlocked, total: items.length };
    }
    return out;
  }, [progress]);

  // 下一個最近成就
  const nextAchievement = useMemo(() => {
    if (!lastMetrics) return null;
    return pickNextAchievement(progress, (def) => {
      // 用 engine 的 currentOf 邏輯 — 透過 store 的 lastMetrics 取值
      const m = lastMetrics;
      switch (def.metric) {
        case 'est1RM_kg': return def.liftFamily ? (m.maxEst1RMByFamily[def.liftFamily] ?? 0) : 0;
        case 'est1RM_bw': return def.liftFamily ? (m.maxEst1RMBWByFamily[def.liftFamily] ?? 0) : 0;
        case 'est1RM_delta': return m.maxDelta;
        case 'sessions': return m.sessions;
        case 'streak': return m.streak;
        case 'weekly_rhythm': return m.weeklyRhythm;
        case 'volume_delta_months': return m.volumeDeltaMonths;
        case 'pr_count_session': return m.maxPRsPerSession;
        case 'group_pr': return def.muscleGroup ? (m.groupPR[def.muscleGroup] ?? 0) : 0;
        case 'group_pr_all': return m.groupPRAll;
        case 'group_coverage': return def.threshold <= 1 ? m.groupCoverage1 : m.groupCoverage3;
        case 'warmup_count': return m.warmupCount;
        case 'full_plan_count': return m.fullPlanCount;
        case 'perfect_log_count': return m.perfectLogCount;
        case 'explorer': return m.explorer;
        default: return 0;
      }
    });
  }, [progress, lastMetrics]);

  // 力量軌：按 liftFamily 分組的 ladder 資料
  const strengthByFamily = useMemo(() => {
    const byLine = groupByLine('strength');
    const out: Record<LiftFamily, AchievementDef[]> = {
      bench: [], squat: [], deadlift: [], ohp: [],
    };
    for (const [line, defs] of Object.entries(byLine)) {
      const family = getLiftFamily(`${line}-press`, line);
      if (family) {
        out[family] = defs.sort((a, b) => a.tier - b.tier);
      }
    }
    return out;
  }, []);

  // 當前軌的成就列表（非力量軌用）
  const currentTrackItems = useMemo(() => {
    const byTrack = groupByTrack();
    return byTrack[activeTrack] ?? [];
  }, [activeTrack]);

  const handleNodeTap = useCallback((def: AchievementDef) => {
    setDetailDef(def);
    if (activeTrack === 'strength') {
      log('ladder_node_tapped', { id: def.id });
    }
  }, [activeTrack, log]);

  const handleNextCardTap = useCallback(() => {
    if (nextAchievement) {
      setDetailDef(nextAchievement.def);
      log('next_card_tapped', { id: nextAchievement.def.id });
    }
  }, [nextAchievement, log]);

  return (
    <PageShell title="成就" showBack>
      {/* Header：成就總數／已解鎖／最近解鎖日期 */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5"
      >
        <Card className="relative overflow-hidden p-5 border-accent/30">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/12 via-transparent to-auxiliary/8 pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-text-secondary">
                成就總覽
              </p>
              <h2 className="font-display text-3xl tracking-wide uppercase text-text-primary mt-1">
                {unlockedCount}
                <span className="text-lg ml-1 text-text-secondary">
                  / {totalCount}
                </span>
              </h2>
              {lastUnlockDate && (
                <p className="text-[10px] text-text-secondary mt-1">
                  最近解鎖 {formatUnlockDate(lastUnlockDate)}
                </p>
              )}
            </div>
            <div className="w-16 h-16 rounded-2xl bg-accent text-bg-primary flex items-center justify-center font-display text-2xl tracking-wider shadow-lg">
              {unlockRate}%
            </div>
          </div>
          <div className="relative h-1.5 w-full bg-border/60 rounded-full overflow-hidden mt-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${unlockRate}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-accent via-accent to-auxiliary"
            />
          </div>
        </Card>
      </motion.section>

      {/* NextAchievementCard (hero) */}
      {nextAchievement && (
        <div className="mb-5">
          <NextAchievementCard
            def={nextAchievement.def}
            ratio={nextAchievement.ratio}
            current={nextAchievement.current}
            onTap={handleNextCardTap}
          />
        </div>
      )}

      {/* 視圖切換：成就牆 / 時間軸 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('grid')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-2xl border text-xs font-bold uppercase tracking-wider transition-colors',
            viewMode === 'grid'
              ? 'border-accent/40 bg-accent-soft text-accent'
              : 'border-border/40 text-text-secondary',
          )}
        >
          <LayoutGrid size={14} /> 成就牆
        </button>
        <button
          onClick={() => setViewMode('timeline')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-2xl border text-xs font-bold uppercase tracking-wider transition-colors',
            viewMode === 'timeline'
              ? 'border-accent/40 bg-accent-soft text-accent'
              : 'border-border/40 text-text-secondary',
          )}
        >
          <Clock size={14} /> 時間軸
        </button>
      </div>

      {viewMode === 'timeline' ? (
        <TimelineView progress={progress} />
      ) : (
        <>
          {/* TrackTabs */}
          <div className="mb-5">
            <TrackTabs
              active={activeTrack}
              onChange={setActiveTrack}
              counts={trackCounts}
            />
          </div>

          {/* 內容區 */}
          {activeTrack === 'strength' ? (
            <div className="flex flex-col gap-4">
              {/* D3：未填體重時 BW 軌成就鎖定提示 */}
              {profile.bodyWeight === null && (
                <div className="px-3 py-2 rounded-card border border-dashed border-auxiliary/40 bg-auxiliary/5 text-[10px] text-text-secondary leading-relaxed">
                  未填體重：相對力量（×BW）成就已鎖定。請至「設定」輸入體重即可解鎖。
                </div>
              )}
              {LIFT_FAMILIES.map(({ family, label }) => {
                const tiers = strengthByFamily[family];
                if (!tiers || tiers.length === 0) return null;
                return (
                  <StrengthLadder
                    key={family}
                    family={family}
                    label={label}
                    tiers={tiers}
                    progress={progress}
                    onNodeTap={handleNodeTap}
                  />
                );
              })}
            </div>
          ) : (
            <AchievementGrid
              items={currentTrackItems}
              progress={progress}
              formatCopy={formatCopy}
              onTap={handleNodeTap}
            />
          )}
        </>
      )}

      {/* DetailSheet */}
      <AchievementDetailSheet
        def={detailDef}
        progress={detailDef ? progress[detailDef.id] : undefined}
        formattedCopy={detailDef ? formatCopy(detailDef) : undefined}
        open={!!detailDef}
        onClose={() => setDetailDef(null)}
      />
    </PageShell>
  );
}
