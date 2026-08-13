/**
 * Vivix 統一編排點（N-3 / C5）
 *
 * L3 規範：所有「跨 store 的衍生結算」一律經過 settleAll()，順序固定可測。
 *
 * 結算順序：
 *   1. metrics = computeMetrics（透過 achievementsStore.recompute）
 *   2. partner：addXp + form unlock（透過 handleWorkoutCompleted）
 *   3. achievements settlement：達標且未 unlocked → unlockedAt=now + pending
 *   4. quests settlement：達標 → completed
 *   5. telemetry：新解鎖統一在此 log
 *
 * 觸發點（僅三處）：
 *   - finishSession 後（WorkoutSummary mount）
 *   - editCustomExercise / deleteCustomExercise 後（分類變更）
 *   - load / migrate 後一次（補解锁，不彈慶祝）
 */
import type { WorkoutSession, PersonalRecord, MuscleGroup, GroupStats } from '@/types';
import { useWorkoutStore, getAllExercises } from '@/store/workoutStore';
import { useProfileStore } from '@/store/profileStore';
import { useAchievementsStore, type DeriveContext } from '@/store/achievementsStore';
import { useQuestStore } from '@/features/partner/stores/questStore';
import { usePartnerStore } from '@/features/partner/stores/partnerStore';
import { useTelemetryStore } from '@/features/partner/stores/telemetryStore';
import { useFeatureFlags } from '@/features/partner/stores/featureFlags';
import { handleWorkoutCompleted } from '@/features/partner/engine/rewardEngine';
import type { RewardContext, RewardResult } from '@/features/partner/types';

export interface SettleResult {
  partnerReward: RewardResult | null;
  achievementUnlocks: string[];
}

/**
 * 派生 DeriveContext（給 achievementsStore.recompute 用）
 * 從當前 workoutStore + profileStore 派生，不依賴快取
 */
function buildAchieveCtx(): DeriveContext {
  const workout = useWorkoutStore.getState();
  const profile = useProfileStore.getState();
  const customExercises = workout.customExercises;
  return {
    sessions: workout.sessions,
    personalRecords: workout.personalRecords,
    bodyWeight: profile.profile.bodyWeight,
    hasCustomExercises: customExercises.length > 0,
    hasCustomPlans: false, // T-05 尚未實作 custom plans
    groupStats: workout.getGroupStats(),
  };
}

/**
 * 派生 quest recompute ctx
 */
function buildQuestCtx(streakDays: number) {
  const workout = useWorkoutStore.getState();
  const partner = usePartnerStore.getState();
  const sessions = workout.sessions;
  return {
    totalWorkouts: sessions.length,
    totalPRs: workout.personalRecords.length,
    streakDays,
    warmupCount: sessions.reduce((sum, s) => sum + (s.warmupCompletedIds?.length ?? 0), 0),
    recentWorkoutDates: sessions.map((s) => s.date),
  };
}

/**
 * 統一編排：結算所有衍生 store
 *
 * @param rewardCtx 若提供則執行 partner XP 結算（finishSession 後）；否則僅結算 achievements/quests
 * @param options.silent 若 true，不觸發慶祝（load/migrate 補解锁用）
 */
export function settleAll(
  rewardCtx?: RewardContext,
  options: { silent?: boolean } = {},
): SettleResult {
  const { silent = false } = options;
  const telemetry = useTelemetryStore.getState();
  const flags = useFeatureFlags.getState();
  const partnerEnabled = flags.partnerEnabled;

  // 1. metrics + achievements settlement
  const achieveCtx = buildAchieveCtx();
  const achievementsStore = useAchievementsStore.getState();
  const achievementUnlocks = achievementsStore.recompute(achieveCtx);

  // 2. partner：addXp + form unlock（僅在提供 rewardCtx 且 partner 啟用時）
  let partnerReward: RewardResult | null = null;
  if (rewardCtx && partnerEnabled) {
    const partner = usePartnerStore.getState();
    if (partner.name) {
      partnerReward = handleWorkoutCompleted(rewardCtx);
    }
  }

  // 3. quests settlement（用派生 counters）
  const workout = useWorkoutStore.getState();
  const streakDays = workout.getStreakDays();
  const questCtx = buildQuestCtx(streakDays);
  const questStore = useQuestStore.getState();
  questStore.recompute(questCtx);

  // 4. telemetry：新解鎖統一 log（achievementsStore 已移除直接 telemetry import 的責任）
  if (!silent && achievementUnlocks.length > 0) {
    for (const id of achievementUnlocks) {
      const def = useAchievementsStore.getState().progress[id];
      if (def?.unlocked) {
        telemetry.log('achievement_unlocked', { id });
      }
    }
  }

  return {
    partnerReward,
    achievementUnlocks: silent ? [] : achievementUnlocks,
  };
}

/**
 * 結算 achievements + quests（不觸發 partner XP）
 * 用於：editCustomExercise / deleteCustomExercise 後，分類變更可能補解鎖 group_pr 類成就
 */
export function settleTaxonomyChange(): string[] {
  const achieveCtx = buildAchieveCtx();
  const achievementsStore = useAchievementsStore.getState();
  const unlocks = achievementsStore.recompute(achieveCtx);

  // quests 也重算（totalPRs 可能因分類變化而改變）
  const workout = useWorkoutStore.getState();
  const streakDays = workout.getStreakDays();
  const questCtx = buildQuestCtx(streakDays);
  useQuestStore.getState().recompute(questCtx);

  return unlocks;
}

/**
 * 載入 / migrate 後一次性補結算
 * silent=true：不彈慶祝（補解锁僅更新 state）
 */
export function settleOnLoad(): void {
  settleAll(undefined, { silent: true });
}
