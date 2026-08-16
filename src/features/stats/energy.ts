/**
 * Vivix 熱量/能量衍生計算（E-01 / E-02 權威實作，L2）
 *
 * 禁止：persist 任何熱量值；元件 inline 計算。
 * 所有熱量一律由此檔派生。
 */
import type { CardioMachine, ExerciseLog, MuscleGroup, WorkoutSession } from '@/types';
import { STRENGTH_ACTIVE_MET, REST_MET, CARDIO_MET, CALORIE_ERROR_BAND_LOW, CALORIE_ERROR_BAND_HIGH, FALLBACK_ACTIVE_SECONDS_PER_COMPLETED_SET, FALLBACK_REST_SECONDS_PER_COMPLETED_SET } from '@/data/metTable';
import type { CustomExercise } from '@/store/workoutStore';
import { resolveCurrentTaxonomy } from '@/features/exercises/taxonomy';

/**
 * 力量熱量估算結果
 * kcal：best estimate；low/high：±15% 區間；activeMin/restMin：模型推導的分段時長（分鐘）
 * null 表示體重未填 → 鎖定（E-D2）
 */
export interface StrengthEnergyEstimate {
  kcal: number;
  low: number;
  high: number;
  activeMin: number;
  restMin: number;
}

/** 每個完成組的部位計數（用於加權 activeMET） */
type SetCountByGroup = Partial<Record<MuscleGroup, number>>;

function completedSetsByGroup(
  session: WorkoutSession,
  customExercises: CustomExercise[],
): { byGroup: SetCountByGroup; totalCompleted: number; totalRestSeconds: number } {
  const byGroup: SetCountByGroup = {};
  let totalCompleted = 0;
  let totalRestSeconds = 0;
  for (const ex of session.exercises) {
    const tx = resolveCurrentTaxonomy(ex.exerciseId, customExercises, {
      muscleGroup: ex.muscleGroup,
      equipmentType: ex.equipmentType,
      name: ex.name,
    });
    const group = tx.muscleGroup;
    if (!group) continue;
    // 完成組數（weight>0 reps>0 才算有效訓練組）
    let completedThisEx = 0;
    for (const set of ex.sets) {
      if (set.completed && set.weight >= 0 && set.reps > 0) {
        completedThisEx++;
      }
    }
    if (completedThisEx === 0) continue;
    byGroup[group] = (byGroup[group] ?? 0) + completedThisEx;
    totalCompleted += completedThisEx;
    // 完成組之間的休息：(completedThisEx 組) × (ex 綁定 restSeconds ?? 90)
    // 注意：實際 session 的 restSeconds 綁在 PlannedExercise，這裡透過 snapshot 傳入 ExerciseLog 缺；
    // 統一用 FALLBACK_REST_SECONDS_PER_COMPLETED_SET 當保守估，與規格一致。
    totalRestSeconds += completedThisEx * FALLBACK_REST_SECONDS_PER_COMPLETED_SET;
  }
  return { byGroup, totalCompleted, totalRestSeconds };
}

/**
 * 估算單次力量訓練消耗（雙段 MET 模型）
 *
 * 規格：
 *   strengthKcal ≈ activeMET(group, weighted) × kg × activeH + restMET × kg × restH
 *   restH   ＝ Σ（完成組數 × 90s 預設休息）/ 3600
 *   activeH ＝ max(0, sessionH − restH)，若缺 timestamp 則 fallback = completedSets × 40s / 3600
 *   range  ＝ kcal × 0.85 ~ kcal × 1.15
 *
 * bodyWeight=null → 回傳 null（E-D2：輸入體重解鎖）
 */
export function estimateStrengthKcal(
  session: WorkoutSession,
  customExercises: CustomExercise[],
  bodyWeight: number | null,
): StrengthEnergyEstimate | null {
  if (bodyWeight === null || bodyWeight <= 0) return null;

  const { byGroup, totalCompleted, totalRestSeconds } = completedSetsByGroup(session, customExercises);
  if (totalCompleted === 0) {
    return { kcal: 0, low: 0, high: 0, activeMin: 0, restMin: 0 };
  }

  // 部位加權 activeMET：按各部位完成組數加權
  let weightedActiveMet = 0;
  for (const [g, n] of Object.entries(byGroup)) {
    const met = STRENGTH_ACTIVE_MET[g as MuscleGroup] ?? 4.0;
    weightedActiveMet += met * (n ?? 0);
  }
  weightedActiveMet = weightedActiveMet / totalCompleted;

  // 時長：有 timestamp → 真實 sessionH；否則 fallback 40s/set
  let sessionH: number;
  if (session.startedAt && session.finishedAt) {
    const ms = new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime();
    sessionH = Math.max(0, ms) / 3_600_000;
  } else {
    sessionH = (totalCompleted * FALLBACK_ACTIVE_SECONDS_PER_COMPLETED_SET) / 3600;
  }

  const restH = totalRestSeconds / 3600;
  const activeH = Math.max(0, sessionH - restH);
  // 若 activeH 變 0（如極短 session），仍以 fallback 40s/set 當 activeH，避免低估到 0
  const safeActiveH = activeH > 0 ? activeH : (totalCompleted * FALLBACK_ACTIVE_SECONDS_PER_COMPLETED_SET) / 3600;

  const kcal = weightedActiveMet * bodyWeight * safeActiveH + REST_MET * bodyWeight * restH;
  return {
    kcal: Math.round(kcal),
    low: Math.round(kcal * CALORIE_ERROR_BAND_LOW),
    high: Math.round(kcal * CALORIE_ERROR_BAND_HIGH),
    activeMin: Math.round(safeActiveH * 60),
    restMin: Math.round(restH * 60),
  };
}

/**
 * 加總多個 session 的力量熱量（依日期篩選等由 caller 決定）
 */
export function sumStrengthKcal(
  sessions: WorkoutSession[],
  customExercises: CustomExercise[],
  bodyWeight: number | null,
): StrengthEnergyEstimate {
  let totalKcal = 0, totalLow = 0, totalHigh = 0, totalActive = 0, totalRest = 0;
  for (const s of sessions) {
    const r = estimateStrengthKcal(s, customExercises, bodyWeight);
    if (!r) continue;
    totalKcal += r.kcal;
    totalLow += r.low;
    totalHigh += r.high;
    totalActive += r.activeMin;
    totalRest += r.restMin;
  }
  return { kcal: totalKcal, low: totalLow, high: totalHigh, activeMin: totalActive, restMin: totalRest };
}

/**
 * 有氧熱量結果
 * isFallback = 用戶沒填 kcal，走 MET 推估；source = 'machine' | 'fallback' | 'unset'（unset 僅體重也缺）
 */
export type CardioEnergySource = 'machine' | 'fallback' | 'unset';

export interface CardioEnergyResult {
  kcal: number | null;
  source: CardioEnergySource;
}

/**
 * 單次有氧熱量（E-D5）
 *   - 用戶有填 kcal → 原數回傳（source='machine'）
 *   - 否則若有 bodyWeight → MET × kg × 時數（source='fallback'）
 *   - 否則 → null ＋ source='unset'（UI 顯示「—」＋提示）
 */
export function estimateCardioKcal(
  machine: CardioMachine,
  durationMin: number,
  bodyWeight: number | null,
  kcalInput?: number | null,
): CardioEnergyResult {
  if (typeof kcalInput === 'number' && !Number.isNaN(kcalInput) && kcalInput > 0) {
    return { kcal: Math.round(kcalInput), source: 'machine' };
  }
  if (bodyWeight === null || bodyWeight <= 0) {
    return { kcal: null, source: 'unset' };
  }
  const met = CARDIO_MET[machine] ?? CARDIO_MET.other;
  const kcal = met * bodyWeight * (durationMin / 60);
  return { kcal: Math.round(kcal), source: 'fallback' };
}
