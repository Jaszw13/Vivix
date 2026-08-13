/**
 * Next-achievement selector — 進度% 最高者優先
 * 從 achievementsStore 抽出，保持 pure function。
 */
import {
  ACHIEVEMENTS,
  type AchievementDef,
} from '@/data/achievements';
import type { AchievementProgress } from '@/store/achievementsStore';

// currentOf 邏輯由 store 統一管理，這裡只做「挑最近一個」的排序
export function pickNextAchievement(
  progress: Record<string, AchievementProgress>,
  currentOf: (def: AchievementDef) => number,
): { def: AchievementDef; ratio: number; current: number; threshold: number } | null {
  let best: { def: AchievementDef; ratio: number; current: number; threshold: number } | null = null;
  for (const def of ACHIEVEMENTS) {
    const p = progress[def.id];
    if (p?.unlocked) continue;
    const current = currentOf(def);
    const ratio = def.threshold > 0 ? Math.min(current / def.threshold, 1) : 0;
    // 體重比成就在未填體重時 current=0，不選為「最近」以免誤導
    if (def.metric === 'est1RM_bw' && current === 0) continue;
    if (!best || ratio > best.ratio) {
      best = { def, ratio, current, threshold: def.threshold };
    }
  }
  return best;
}
