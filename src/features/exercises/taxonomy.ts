/**
 * Exercise taxonomy 權威模組（C1）
 *
 * 唯一來源：resolveCurrentTaxonomy / resolveExerciseSnapshot / getAllExercises。
 * workoutStore.ts 改為 re-export 保持 import 兼容。
 *
 * 優先序：當前 exercise 定義（builtin + custom）→ 記錄 snapshot → fallback。
 * 這是保證「分類變更後所有統計即時遷移」的核心。
 */
import type { Exercise, MuscleGroup, EquipmentType, LiftFamily } from '@/types';
import { exercises as builtinExercises, getExerciseById } from '@/data/exercises';

// CustomExercise 與 workoutStore 同結構，避免循環依賴，這裡僅取所需欄位
interface CustomExerciseLike {
  id: string;
  name: string;
  muscleGroup?: MuscleGroup;
  equipmentType?: EquipmentType;
  /** N-5：自訂動作可指定力量家族 */
  liftFamily?: LiftFamily;
  isCustom?: boolean;
}

export interface ResolvedTaxonomy {
  muscleGroup: MuscleGroup | undefined;
  equipmentType: EquipmentType | undefined;
  /** N-5：力量家族（自訂動作可明確指定） */
  liftFamily: LiftFamily | undefined;
  name: string;
}

/**
 * P-01：以當前 exercise 定義優先查找分類，snapshot 僅兜底。
 * @param exerciseId 動作 ID（內建或自訂）
 * @param customExercises 當前自訂動作清單（通常來自 workoutStore.getState().customExercises）
 * @param fallback 記錄中的 snapshot（muscleGroup/equipmentType/name）
 */
export function resolveCurrentTaxonomy(
  exerciseId: string,
  customExercises: CustomExerciseLike[],
  fallback?: { muscleGroup?: MuscleGroup; equipmentType?: EquipmentType; name?: string },
): ResolvedTaxonomy {
  // 1. 查內建動作
  const builtin = getExerciseById(exerciseId);
  if (builtin) {
    return {
      muscleGroup: builtin.muscleGroup as MuscleGroup,
      equipmentType: builtin.equipmentType as EquipmentType,
      liftFamily: builtin.liftFamily,
      name: builtin.name,
    };
  }
  // 2. 查自訂動作（可能已被用戶改過分類）
  const custom = customExercises.find((e) => e.id === exerciseId);
  if (custom) {
    return {
      muscleGroup: custom.muscleGroup as MuscleGroup,
      equipmentType: custom.equipmentType as EquipmentType,
      liftFamily: custom.liftFamily,
      name: custom.name,
    };
  }
  // 3. fallback：記錄中的 snapshot 或空
  return {
    muscleGroup: fallback?.muscleGroup,
    equipmentType: fallback?.equipmentType,
    liftFamily: undefined,
    name: fallback?.name ?? '動作',
  };
}

/**
 * 舊版保留：僅查內建（migrate 用）。
 * 不查自訂動作，避免 migrate 階段 store 尚未就緒。
 */
export function resolveExerciseSnapshot(
  exerciseId: string,
  fallbackName?: string,
): ResolvedTaxonomy {
  const builtin = getExerciseById(exerciseId);
  if (builtin) {
    return {
      muscleGroup: builtin.muscleGroup as MuscleGroup,
      equipmentType: builtin.equipmentType,
      liftFamily: builtin.liftFamily,
      name: builtin.name,
    };
  }
  return {
    muscleGroup: undefined as MuscleGroup | undefined,
    equipmentType: undefined as EquipmentType | undefined,
    liftFamily: undefined,
    name: fallbackName ?? '動作',
  };
}

/**
 * 彙出 helper：取所有動作（內建 + 自訂），供 UI/替換選單使用。
 * 注意：此函數依賴 workoutStore 的 customExercises，由 workoutStore re-export 時
 * 傳入當前 customExercises；直接呼叫此模組版需自行傳入。
 */
export function getAllExercisesWith(customExercises: CustomExerciseLike[]): Exercise[] {
  return [...builtinExercises, ...(customExercises as Exercise[])];
}

/**
 * 依 exerciseId 查找單一動作（內建 + 自訂）。
 * UI 層 fallback 用，取代只查內建的 getExerciseById。
 */
export function findExerciseById(
  exerciseId: string,
  customExercises: CustomExerciseLike[],
): Exercise | undefined {
  return getExerciseById(exerciseId) ?? customExercises.find((e) => e.id === exerciseId) as Exercise | undefined;
}
