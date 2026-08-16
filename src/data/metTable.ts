/**
 * Vivix MET 常數表（E-01 / E-02 雙段模型）
 *
 * 來源：
 *   - 2024 Adult Compendium of Physical Activities（Herrmann et al. 2024,
 *     J Sport Health Sci 13(1):6–12. doi:10.1016/j.jshs.2023.10.010；
 *     PMC10818145）：resistance training 分級 3.5（輕）/ 5.0（中）/ 6.0（重）。
 *   - Older Adult Compendium（Willis et al. 2024, JSHS 13(1):13–17；PMC10818108）：
 *     squats light = 5.3，heavy squat 約 6.0。
 *   - Mitchell et al. 2024 Sports Med 54(9):2357（PMC11393209）：
 *     Compendium 的 resistance exercise 3.5/5.0/6.0 已被驗證與測量差 ±10–25%。
 *
 * fetchedAt: 2026-08-16（Phase B v3.0 實作時查證）
 *
 * 部位 → activeMET（訓練段）分級（依肌群工作量合理微調，皆在文獻範圍內）：
 *   legs 6.0      ｜ chest・back 5.0 ｜ shoulders・arms・core 4.0
 * restMET = 1.8（安靜坐臥，通用文獻 REST_MET）
 */
import type { CardioMachine, MuscleGroup } from '@/types';

/** 休息段 MET（清醒坐臥） */
export const REST_MET = 1.8;

/**
 * 力量訓練 activeMET（主部位）
 * 依 2024 Compendium 三級分級並按部位工作量微調，全數在文獻可信區間。
 */
export const STRENGTH_ACTIVE_MET: Record<MuscleGroup, number> = {
  legs: 6.0,       // 與 squats heavy 級一致
  chest: 5.0,      // 中等強度 bench / press
  back: 5.0,       // 中等強度 row / pull
  shoulders: 4.0,  // 輕中級 OHP / lateral
  arms: 4.0,       // 輕中級 curl / triceps
  core: 4.0,       // 中等 plank / dead-bug
} as const;

/**
 * 有氧器材 fallback MET（kcal 未由用戶輸入時使用）
 * 來源：2024 Adult Compendium（代碼 01xxxx / 02xxxx 有氧大項中值）
 *   treadmill 7.0 = 慢跑 ~8 km/h 混合
 *   stair     9.0 = 台階登山中等
 *   elliptical 5.0 = 中等阻力
 *   bike     6.8 = 飛輪車 100–120W
 *   rower    7.0 = 划船中等節奏
 *   other    5.0 = 通用保守中值
 */
export const CARDIO_MET: Record<CardioMachine, number> = {
  treadmill: 7.0,
  stair: 9.0,
  elliptical: 5.0,
  bike: 6.8,
  rower: 7.0,
  other: 5.0,
} as const;

/** 誤差範圍（0.85–1.15）：依 Mitchell 2024 review 宣稱約 ±15–20%，取保守 15% */
export const CALORIE_ERROR_BAND_LOW = 0.85;
export const CALORIE_ERROR_BAND_HIGH = 1.15;

/** 無 timestamp 時 fallback：每個完成組的活動時間（秒），經驗保守值 */
export const FALLBACK_ACTIVE_SECONDS_PER_COMPLETED_SET = 40;

/** 無計畫 restSeconds 時 fallback：90 秒 */
export const FALLBACK_REST_SECONDS_PER_COMPLETED_SET = 90;
