// ============ 基礎型別 ============

export type Theme = 'dark' | 'light';

// §5.1 部位分類（與既有 ExerciseCategory 值一致，別名保留）
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core';

/** 兼容舊命名，等同 MuscleGroup */
export type ExerciseCategory = MuscleGroup;

/**
 * N-5：力量動作家族（成就力量軌分組用）。
 * 權威定義於 types；data/achievements re-export 保持兼容。
 */
export type LiftFamily = 'bench' | 'squat' | 'deadlift' | 'ohp';

/** E-2：有氧器材類型（cardioStore 事實欄位） */
export type CardioMachine = 'treadmill' | 'stair' | 'elliptical' | 'bike' | 'rower' | 'other';

/** E-2：器材顯示名 */
export const CARDIO_MACHINE_LABELS: Record<CardioMachine, string> = {
  treadmill: '跑步機',
  stair: '階梯機',
  elliptical: '橢圓機',
  bike: '飛輪車',
  rower: '划船機',
  other: '其他',
};

/** E-2：有氧訓練記錄（原始事實，cardioStore persist；L1） */
export interface CardioSession {
  id: string;
  /** ISO date string（作為日期分組用，與 WorkoutSession.date 同格式） */
  date: string;
  machine: CardioMachine;
  /** 訓練時長（分鐘），必填 >0 */
  durationMin: number;
  /** 機器顯示 kcal（選填）；缺時走 MET fallback（E-D5） */
  kcal?: number | null;
  /** 平均心率（選填） */
  avgHr?: number | null;
  /** 距離 km（選填） */
  distanceKm?: number | null;
  createdAt: string;
}

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: '胸部',
  back: '背部',
  legs: '腿部',
  shoulders: '肩膀',
  arms: '手臂',
  core: '核心',
};

// 兼容舊命名
export const CATEGORY_LABELS = MUSCLE_GROUP_LABELS;

export const MUSCLE_GROUP_OPTIONS: {
  value: MuscleGroup;
  label: string;
  emoji: string;
}[] = [
  { value: 'chest', label: '胸', emoji: '胸' },
  { value: 'back', label: '背', emoji: '背' },
  { value: 'legs', label: '腿', emoji: '腿' },
  { value: 'shoulders', label: '肩', emoji: '肩' },
  { value: 'arms', label: '手臂', emoji: '臂' },
  { value: 'core', label: '核心', emoji: '核' },
];

// 兼容舊命名（exerciseCategories）
export const exerciseCategories = MUSCLE_GROUP_OPTIONS;

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: '入門',
  intermediate: '進階',
  advanced: '高階',
};

// §5.2 器械類型
export type EquipmentType =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'other';

export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  barbell: '槓鈴',
  dumbbell: '啞鈴',
  machine: '機械',
  cable: '纜繩',
  bodyweight: '徒手',
  kettlebell: '壺鈴',
  other: '其他',
};

export const EQUIPMENT_TYPE_OPTIONS: {
  value: EquipmentType;
  label: string;
}[] = [
  { value: 'barbell', label: '槓鈴' },
  { value: 'dumbbell', label: '啞鈴' },
  { value: 'machine', label: '機械' },
  { value: 'cable', label: '纜繩' },
  { value: 'bodyweight', label: '徒手' },
  { value: 'kettlebell', label: '壺鈴' },
  { value: 'other', label: '其他' },
];

// ============ §5.7 MediaRef ============

export type MediaType = 'illustration' | 'stock' | 'self_shot' | 'none';

export interface MediaRef {
  type: MediaType;
  /**
   * 插圖/Stock URL 或 local blob key（首選插圖 SVG data URI）
   */
  url?: string;
  /** License 類型，例如 "Unsplash License"、"Public Domain"、"Self-shot" */
  license?: string;
  /** 來源：網站名稱或 "self" */
  source?: string;
  /** 作者署名 */
  credit?: string;
  /** Self-shot 強制：已去 Logo */
  logoRemoved?: boolean;
  /** Self-shot 強制：已去人臉 */
  facesRemoved?: boolean;
  /** Self-shot 強制：場地同意 */
  venueConsent?: boolean;
}

/**
 * 內建動作預設 media policy：
 *   使用 generic 2D SVG 插圖（不暴露品牌 Logo、不涉及人臉）。
 *   這裡只放 metadata，實際 SVG 渲染由 ExerciseMediaCard 依插圖關鍵字產生。
 */
export const DEFAULT_MEDIA: MediaRef = {
  type: 'illustration',
  license: 'Project Internal — Generic 2D Vector Placeholder',
  source: 'vivix-builtin',
  credit: 'Vivix Team',
};

// ============ 動作示範 Media 接口（保留兼容但標註 deprecated，未來統一 MediaRef）============

/** @deprecated 使用 MediaRef 替代 */
export type ExerciseMediaSource = 'local' | 'external';

/** @deprecated 使用 MediaRef 替代 */
export interface ExerciseMedia {
  id: string;
  source: ExerciseMediaSource;
  uri: string;
  title?: string;
  thumbnail?: string;
}

// ============ §5.3 Exercise 模型更新 ============

export interface Exercise {
  id: string;
  name: string;
  /**
   * 主要部位（必填，按肌肉羣統計用）。
   * 新邏輯統一讀此欄；`category` 為兼容舊命名，值必須與 muscleGroup 一致。
   */
  muscleGroup: MuscleGroup;
  /** 兼容舊命名：值必須等於 muscleGroup */
  category: ExerciseCategory;
  /** 次要部位（可選，輔助統計） */
  secondaryGroups?: MuscleGroup[];
  /**
   * 器械類型（必填結構化值）
   */
  equipmentType: EquipmentType;
  /**
   * 關聯器械 library id（可選，T-06 之後會逐步補齊）
   */
  equipmentId?: string;
  /**
   * 次要肌肉羣自由描述（舊欄位保留，僅顯示用）
   */
  muscleGroupDesc?: string;
  /** 舊自由文字器械描述（保留顯示用，不做統計） */
  equipmentDesc?: string;
  /**
   * @deprecated 僅作為舊資料顯示 fallback；新邏輯一律使用 equipmentType + equipmentDesc
   */
  equipment?: string;
  /** 是否用戶自訂 */
  isCustom: boolean;
  /** 動作步驟（舊 exercises.ts 中叫 instructions，這裡統一為 steps） */
  steps?: string[];
  /**
   * N-5：力量動作家族（選填）。
   * 自訂動作可明確指定以正確歸入力量軌成就；未指定時由 getLiftFamily 從 ID/名稱推斷。
   */
  liftFamily?: LiftFamily;
  /** @deprecated 兼容舊 exercises.ts：等同 steps */
  instructions?: string[];
  tips?: string[];
  /** 合規媒體引用（T-07） */
  media?: MediaRef;
  createdAt?: string;
}

// ============ §5.4 Equipment 模型 ============

export interface Equipment {
  id: string;
  /** 通用名稱，例如「坐姿推胸機」，不使用品牌名 */
  name: string;
  category: EquipmentType;
  typicalMuscleGroups: MuscleGroup[];
  media?: MediaRef;
}

// ============ §5.5 Equipment Memory ============

export interface EquipmentMemory {
  /** `${equipmentId}:${exerciseId}` 或 `__noequipment__:${exerciseId}` */
  key: string;
  equipmentId: string;
  exerciseId: string;
  lastWeightKg?: number;
  lastReps?: number;
  usageCount: number;
  lastUsedAt?: string;
  personalBest?: {
    weightKg: number;
    reps: number;
    estimated1RM: number;
    at: string;
  };
}

// ============ 熱身項目 ============

export type WarmupType = 'dynamic' | 'lightSet' | 'general';

export interface WarmupItem {
  id: string;
  type: WarmupType;
  name: string;
  description: string;
  durationSec: number;
  dosage?: string;
}

// ============ §5.6 Plan 模型更新 ============

/**
 * v2 PlannedExercise：加入 snapshot（避免動作被刪除後壞掉）
 * 以及 alternativeIds（替換候選動作 id）
 */
export interface PlannedExercise {
  id: string;
  exerciseId: string;
  /** v2：snapshot，防止外部 exercise 被刪除/改名後計畫損毀 */
  snapshot: {
    name: string;
    muscleGroup: MuscleGroup;
    equipmentType: EquipmentType;
  };
  /** 兼容舊欄位：直接顯示用 snapshot.name */
  name: string;
  targetSets: number;
  targetReps: string;
  targetWeight?: number;
  restSeconds?: number;
  /** v2：替換候選動作（同部位優先） */
  alternativeIds?: string[];
}

/** 舊 PlanExercise：結構化欄位不足的版本（保留類型用於 migrate） */
export interface LegacyPlanExercise {
  id: string;
  exerciseId: string;
  name: string;
  targetSets: number;
  targetReps: string;
  targetWeight?: number;
}

export interface PlanDay {
  id: string;
  dayName: string;
  dayIndex: number;
  warmup: WarmupItem[];
  exercises: PlannedExercise[];
}

export interface TrainingPlan {
  id: string;
  name: string;
  difficulty: Difficulty;
  description: string;
  cover: string;
  /** 是否系統預設（預設計畫可 reset 回原狀） */
  isPreset: boolean;
  /** 是否為用戶建立的自訂計畫 */
  isCustom: boolean;
  /** 若衍生自預設，記錄來源 preset id，便於 reset */
  derivedFromPresetId?: string;
  /** 用戶是否編輯過（影響 canResetToPreset 可用性） */
  editedByUser?: boolean;
  days: PlanDay[];
}

// ============ 訓練記錄 ============

export interface SetLog {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe?: number;
  completed: boolean;
}

export interface ExerciseLog {
  id: string;
  exerciseId: string;
  name: string;
  /** v2：部位 snapshot，便於分部位統計 */
  muscleGroup?: MuscleGroup;
  /** v2：器械 snapshot */
  equipmentType?: EquipmentType;
  /** v2：若為替換動作，記錄原本 exerciseId */
  substitutedFrom?: string;
  sets: SetLog[];
}

export interface WorkoutSession {
  id: string;
  date: string;
  planId?: string;
  planName?: string;
  dayId?: string;
  dayName?: string;
  warmupCompletedIds: string[];
  duration: number;
  totalVolume: number;
  exercises: ExerciseLog[];
  /** E-01：訓練開始／結束時間（原始事實，persist）。migrate：舊 session 設 null */
  startedAt?: string | null;
  finishedAt?: string | null;
  /** I-2：匯入 v1 標記；=== true 表示來自歷史匯入（Excel / CSV）。
   *  讀取端一律 `s.imported === true`（舊資料沒該欄 = false / undefined 視為非匯入） */
  imported?: boolean;
  /** I-2：非結構化附註（來源：matrix Feedback 或用戶手動），原始事實 persist */
  notes?: string;
}

// ============ 用戶資料 ============

export interface UserProfile {
  id: string;
  name: string;
  /** D3：null 表示未填寫（舊 default 75 視為未填）；BW 軌成就於 null 時鎖定 */
  bodyWeight: number | null;
  createdAt: string;
  /** I-1：Onboarding 經驗自選結果（原始事實 persist；profileStore v3 migrate 舊資料補 'beginner'） */
  experienceLevel?: 'beginner' | 'experienced';
}

// ============ PR 紀錄 ============

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  /** v2：部位 snapshot */
  muscleGroup?: MuscleGroup;
  /** v2：器械 snapshot */
  equipmentType?: EquipmentType;
  /** N-5：力量家族 snapshot（自訂動作可明確指定） */
  liftFamily?: LiftFamily;
  weight: number;
  reps: number;
  date: string;
  estimated1RM: number;
}

// ============ 小工具：中文器械名 → EquipmentType（migrate 用）============

/**
 * 將舊自由文字 equipment 欄位映射到結構化 EquipmentType。
 * 找不到 → 'other'
 */
export function resolveEquipmentType(equipmentChinese: string | undefined | null): EquipmentType {
  if (!equipmentChinese) return 'other';
  const s = equipmentChinese.trim().toLowerCase();
  if (s.includes('槓鈴') || s.includes('barbell')) return 'barbell';
  if (s.includes('啞鈴') || s.includes('dumbbell')) return 'dumbbell';
  if (s.includes('機械') || s.includes('機器') || s.includes('腿推') || s.includes('machine')) return 'machine';
  if (s.includes('纜繩') || s.includes('纜線') || s.includes('cable') || s.includes('下壓') || s.includes('飛鳥')) return 'cable';
  if (s.includes('徒手') || s.includes('棒式') || s.includes('單槓') || s.includes('引體') || s.includes('bodyweight')) return 'bodyweight';
  if (s.includes('壺鈴') || s.includes('kettlebell')) return 'kettlebell';
  return 'other';
}

// ============ §5 分部位統計與成就相關輔助 ============

/**
 * 部位重量里程碑校準系數（用於成就門檻，確保腿部 PR 不加速胸部成就）
 * 參考文件 §6 T-02
 */
export const WEIGHT_MILESTONE_MULTIPLIERS: Record<MuscleGroup, number> = {
  chest: 1.0,
  back: 1.2,
  legs: 1.8,
  shoulders: 0.6,
  arms: 0.5,
  core: 0.4,
};

/**
 * 分部位統計聚合結果（用於成就 / 進度曲線 / 部位報告）
 */
export interface GroupStats {
  muscleGroup: MuscleGroup;
  /** 完成次數（有至少 1 組完成的訓練日） */
  workoutCount: number;
  /** 總體積 kg（已完成組重量×次數累計） */
  totalVolumeKg: number;
  /** PR 次數（新增個人紀錄） */
  prCount: number;
  /** 涉及動作種類數 */
  exerciseVariety: number;
  /** 最近 1 次訓練日期 */
  lastTrainedAt?: string;
}

/**
 * 分部位成就定義 kind 擴展（保留全局 kind 為兼容）
 */
export type GroupAchievementKind =
  | 'group_workouts'
  | 'group_pr_count'
  | 'group_volume_ton';

