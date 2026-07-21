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

// ============ 動作資料庫 ============

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  muscleGroup: string;
  equipment: string;
  instructions: string[];
  tips: string[];
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
  dayName?: string;
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
