import type { RewardContext, RewardResult } from '../types';
import { usePartnerStore } from '../stores/partnerStore';
import { useQuestStore } from '../stores/questStore';
import { useTelemetryStore } from '../stores/telemetryStore';
import { QUESTS } from '../data/quests';
import { COSMETIC_MAP } from '../data/cosmetics';

// XP 規則
const XP_RULES = {
  workout_completed: 40,
  warmup_completed: 10,
  planned_sets_mostly_completed: 15, // ≥70% planned sets
  pr_achieved: 30,
  streak_day_2: 10,
  streak_day_3: 15,
  streak_day_7: 40,
  streak_day_14: 60,
} as const;

// 每日獎勵上限
const DAILY_LIMITS: Record<string, number> = {
  workout_completed: 1,
  warmup_completed: 1,
  planned_sets_mostly_completed: 1,
  pr_achieved: 2,
};

// 防濫用：同一日已領過嘅獎勵記錄
const dailyClaimedKey = (eventType: string, date: string) => `${eventType}:${date}`;

// Valid workout 判定
export function isValidWorkout(completedSets: number, plannedSets: number): boolean {
  if (completedSets >= 3) return true;
  if (plannedSets > 0 && completedSets / plannedSets >= 0.5) return true;
  return false;
}

/**
 * 核心獎勵引擎：處理訓練完成後嘅所有 Partner 獎勵邏輯
 * 1. 判斷 workout 是否 valid
 * 2. 計算 XP（含每日上限）
 * 3. 更新 Partner 等級
 * 4. 檢查形態解鎖
 * 5. 更新任務進度 + 自動 claim
 * 6. 解鎖化妝品 / 稱號
 * 7. 記錄 telemetry
 */
export function handleWorkoutCompleted(ctx: RewardContext): RewardResult {
  const partnerStore = usePartnerStore.getState();
  const questStore = useQuestStore.getState();
  const telemetry = useTelemetryStore.getState();

  const valid = isValidWorkout(ctx.completedSets, ctx.plannedSets);
  const dateKey = ctx.date.slice(0, 10); // YYYY-MM-DD

  let totalXp = 0;
  const newCosmeticIds: string[] = [];
  let newTitleId: string | undefined;
  let newFormId: string | undefined;
  const questRewards: RewardResult['questRewards'] = [];

  telemetry.log('workout_completed', { valid, completedSets: ctx.completedSets, plannedSets: ctx.plannedSets, date: ctx.date });

  if (!valid) {
    return {
      xpGained: 0,
      newLevel: partnerStore.level,
      leveledUp: false,
      newCosmeticIds: [],
      newFormId: undefined,
      newTitleId: undefined,
      questRewards: [],
    };
  }

  // 1. 記錄訓練次數
  partnerStore.recordWorkout();

  // 2. Workout completed XP（每日上限 1）
  if (!hasClaimedToday('workout_completed', dateKey)) {
    totalXp += XP_RULES.workout_completed;
    markClaimedToday('workout_completed', dateKey);
  }

  // 3. Warmup XP
  if (ctx.warmupCompleted && !hasClaimedToday('warmup_completed', dateKey)) {
    totalXp += XP_RULES.warmup_completed;
    markClaimedToday('warmup_completed', dateKey);
    telemetry.log('warmup_completed', { date: ctx.date });
  }

  // 4. Planned sets mostly completed (≥70%)
  if (ctx.plannedSets > 0 && ctx.completedSets / ctx.plannedSets >= 0.7) {
    if (!hasClaimedToday('planned_sets_mostly_completed', dateKey)) {
      totalXp += XP_RULES.planned_sets_mostly_completed;
      markClaimedToday('planned_sets_mostly_completed', dateKey);
    }
  }

  // 5. PR XP
  if (ctx.hasPR) {
    const prClaimCount = getTodayClaimCount('pr_achieved', dateKey);
    if (prClaimCount < (DAILY_LIMITS.pr_achieved ?? 1)) {
      totalXp += XP_RULES.pr_achieved;
      markClaimedToday('pr_achieved', dateKey);
      telemetry.log('pr_achieved', { date: ctx.date });
    }
  }

  // 6. Streak XP（由 caller 傳入 streakDays via ctx? 唔係——streak 係衍生數據，由 workoutStore 計）
  //    呢度唔直接加 streak XP，因為 streak 係跨日概念，應該由另一個 handler 處理
  //    為咗簡化 v1，將 streak XP 放喺 handleStreakUpdated

  // 7. 更新 XP + 等級
  const xpResult = partnerStore.addXp(totalXp);

  // 8. 檢查形態解鎖
  const formResult = partnerStore.checkFormUnlock();
  if (formResult.unlocked && formResult.newFormId) {
    newFormId = formResult.newFormId;
    telemetry.log('form_unlocked', { formId: newFormId, formName: formResult.newFormName });
  }

  // 9. 更新任務進度 + 自動 claim 已完成任務
  //    需要從 workoutStore 獲取 recentWorkoutDates + streak 等數據
  //    由 caller 傳入（簡化：暫時用 ctx 裡面嘅資料）
  const questCtx = {
    totalWorkouts: partnerStore.totalWorkouts,
    totalPRs: 0, // 由 caller 補充
    streakDays: 0, // 由 caller 補充
    warmupCount: ctx.warmupCompleted ? 1 : 0, // 簡化
    recentWorkoutDates: [], // 由 caller 補充
  };

  // 將 questCtx 補充完整（由外部传入）
  // 呢度用一個 workaround：直接從 questStore recompute
  // caller 會負責傳入完整 ctx

  if (xpResult.leveledUp) {
    telemetry.log('level_up', { newLevel: xpResult.newLevel });
  }

  return {
    xpGained: totalXp,
    newLevel: xpResult.newLevel,
    leveledUp: xpResult.leveledUp,
    newFormId,
    newCosmeticIds,
    newTitleId,
    questRewards,
  };
}

/**
 * 處理 streak 更新獎勵
 */
export function handleStreakUpdated(streakDays: number): { xpGained: number } {
  const partnerStore = usePartnerStore.getState();
  const telemetry = useTelemetryStore.getState();
  let xp = 0;

  if (streakDays === 2) xp += XP_RULES.streak_day_2;
  else if (streakDays === 3) xp += XP_RULES.streak_day_3;
  else if (streakDays === 7) xp += XP_RULES.streak_day_7;
  else if (streakDays === 14) xp += XP_RULES.streak_day_14;

  if (xp > 0) {
    partnerStore.addXp(xp);
    telemetry.log('streak_updated', { streakDays, xpGained: xp });
  }

  return { xpGained: xp };
}

/**
 * 處理任務 claim 獎勵
 */
export function handleQuestClaimed(
  questId: string,
  questCtx: Parameters<ReturnType<typeof useQuestStore.getState>['recompute']>[0]
): { xpGained: number; cosmeticsUnlocked: string[]; titlesUnlocked: string[] } {
  const partnerStore = usePartnerStore.getState();
  const questStore = useQuestStore.getState();
  const telemetry = useTelemetryStore.getState();
  const quest = QUESTS.find((q) => q.id === questId);
  if (!quest) return { xpGained: 0, cosmeticsUnlocked: [], titlesUnlocked: [] };

  // 先 recompute 確保進度最新
  questStore.recompute(questCtx);
  const claimed = questStore.claim(questId);
  if (!claimed) return { xpGained: 0, cosmeticsUnlocked: [], titlesUnlocked: [] };

  let xp = 0;
  const cosmetics: string[] = [];
  const titles: string[] = [];

  if (quest.reward.xp) {
    xp += quest.reward.xp;
    partnerStore.addXp(xp);
  }
  if (quest.reward.cosmeticId) {
    partnerStore.unlockCosmetic(quest.reward.cosmeticId);
    cosmetics.push(quest.reward.cosmeticId);
  }
  if (quest.reward.badgeId) {
    partnerStore.unlockCosmetic(quest.reward.badgeId);
    cosmetics.push(quest.reward.badgeId);
  }
  if (quest.reward.titleId) {
    partnerStore.unlockTitle(quest.reward.titleId);
    titles.push(quest.reward.titleId);
  }
  if (quest.reward.formId) {
    // 形態由 workouts 觸發，quest 只標記
  }

  telemetry.log('quest_completed', { questId, questName: quest.name, xpGained: xp });

  return { xpGained: xp, cosmeticsUnlocked: cosmetics, titlesUnlocked: titles };
}

// ============ 每日防濫用追蹤（內存，唔持久化） ============
const dailyClaims: Map<string, number> = new Map();

function hasClaimedToday(eventType: string, dateKey: string): boolean {
  const key = dailyClaimedKey(eventType, dateKey);
  return (dailyClaims.get(key) ?? 0) >= (DAILY_LIMITS[eventType] ?? 1);
}

function getTodayClaimCount(eventType: string, dateKey: string): number {
  return dailyClaims.get(dailyClaimedKey(eventType, dateKey)) ?? 0;
}

function markClaimedToday(eventType: string, dateKey: string): void {
  const key = dailyClaimedKey(eventType, dateKey);
  dailyClaims.set(key, (dailyClaims.get(key) ?? 0) + 1);
}
