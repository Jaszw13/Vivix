// ============ Partner 系統類型定義 ============

export type PartnerSpecies = 'cat' | 'dog';

export interface PartnerState {
  species: PartnerSpecies;
  name: string;
  level: number;
  xp: number;
  totalWorkouts: number;
  totalTrainingDays: number;
  currentFormId: string;
  unlockedFormIds: string[];
  unlockedCosmeticIds: string[];
  equippedCosmeticIds: string[];
  unlockedTitleIds: string[];
  equippedTitleId?: string;
  createdAt: string;
}

export interface PartnerForm {
  id: string;
  name: string;
  requiredWorkouts: number;
  description: string;
}

export interface Cosmetic {
  id: string;
  type: 'head' | 'neck' | 'wrist' | 'back' | 'badge' | 'background' | 'title';
  name: string;
}

export interface QuestDef {
  id: string;
  name: string;
  description: string;
  condition: {
    type: 'workout_count' | 'warmup_count' | 'pr_count' | 'streak_days' | 'weekly_workouts' | 'workouts_in_days';
    threshold: number;
    windowDays?: number;
  };
  reward: {
    xp?: number;
    cosmeticId?: string;
    formId?: string;
    titleId?: string;
    badgeId?: string;
  };
}

export interface QuestProgress {
  questId: string;
  completed: boolean;
  claimed: boolean;
  current: number;
  completedAt?: string;
}

export interface TelemetryEvent {
  id: string;
  name: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

export interface FeatureFlags {
  partnerEnabled: boolean;
}

// XP 獎勵事件類型
export type RewardEventType =
  | 'WORKOUT_COMPLETED'
  | 'WARMUP_COMPLETED'
  | 'PR_ACHIEVED'
  | 'STREAK_UPDATED'
  | 'QUEST_COMPLETED';

export interface RewardContext {
  workoutId?: string;
  date: string;
  completedSets: number;
  plannedSets: number;
  hasPR: boolean;
  durationSeconds: number;
  warmupCompleted: boolean;
}

export interface RewardResult {
  xpGained: number;
  newLevel: number;
  leveledUp: boolean;
  newFormId?: string;
  newCosmeticIds: string[];
  newTitleId?: string;
  questRewards: { questId: string; name: string; reward: QuestDef['reward'] }[];
}
