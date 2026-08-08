// ============ 基礎型別 ============

export type Theme = 'dark' | 'light';

export type ExerciseCategory = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  chest: '胸部',
  back: '背部',
  legs: '腿部',
  shoulders: '肩膀',
  arms: '手臂',
  core: '核心',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: '入門',
  intermediate: '進階',
  advanced: '高階',
};

// ============ 動作示範 Media 接口（D3：預留接口）============

export type ExerciseMediaSource = 'local' | 'external';

export interface ExerciseMedia {
  id: string;
  source: ExerciseMediaSource;
  /**
   * 若 source=local：未來將指向本地 storage 中的 video/GIF blob key
   * 若 source=external：例如 YouTube / Pinterest 等外部 URL
   */
  uri: string;
  title?: string;
  /** 縮圖 */
  thumbnail?: string;
}

// ============ 動作資料庫 ============

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  muscleGroup: string;
  equipment: string;
  instructions: string[];
  tips: string[];
  /** 動作示範 media 介接，預留給未來 3D / 影片 */
  media?: ExerciseMedia[];
}

// ============ 熱身項目（N1）============

export type WarmupType = 'dynamic' | 'lightSet' | 'general';

export interface WarmupItem {
  id: string;
  type: WarmupType;
  name: string;
  /** 簡短說明（教練語氣） */
  description: string;
  /** 建議時長（秒），套用 RestTimer 倒數；0 表示用戶自行判斷 */
  durationSec: number;
  /** 建議組數 / 次數（例如「10 次」「2 組」），僅文字顯示 */
  dosage?: string;
}

// ============ 訓練計畫 ============

export interface PlanExercise {
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
  /** 熱身步驟，依序完成後才進入工作組 */
  warmup: WarmupItem[];
  exercises: PlanExercise[];
}

export interface TrainingPlan {
  id: string;
  name: string;
  difficulty: Difficulty;
  description: string;
  cover: string; // emoji 或代稱
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
  sets: SetLog[];
}

export interface WorkoutSession {
  id: string;
  date: string; // ISO 字串
  planId?: string;
  planName?: string;
  dayId?: string;
  dayName?: string;
  /** 已完成的熱身項目 id（N1），activeSession 內會被更新 */
  warmupCompletedIds: string[];
  duration: number; // 秒
  totalVolume: number; // 總訓練量 (kg)
  exercises: ExerciseLog[];
}

// ============ 用戶資料 ============

export interface UserProfile {
  id: string;
  name: string;
  bodyWeight?: number;
  createdAt: string;
}

// ============ PR 紀錄 ============

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  date: string;
  estimated1RM: number;
}
