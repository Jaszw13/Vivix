import type { WorkoutSession } from '@/types';
import { bestCompletedSet } from '@/utils/workout';

export interface FatigueSuggestion {
  /** 建議重量下限（kg） */
  minWeight: number;
  /** 建議重量上限（kg） */
  maxWeight: number;
  /** 給用戶看的一句話，例如「上次先做這個動作用 80kg，今天排比較後面，建議降到 75–77.5kg」 */
  reason: string;
}

interface ExerciseOrder {
  sessionId: string;
  /** 此動作在該次訓練中的執行順序（1 = 第一個做），沒有 firstCompletedAt 則用陣列順序 */
  rank: number;
  /** 該動作最佳組重量 */
  bestWeight: number;
}

/**
 * 取得某動作在歷史訓練中的執行順序與最佳重量（僅含已完成組）。
 */
function getExerciseHistory(
  sessions: WorkoutSession[],
  exerciseId: string,
): ExerciseOrder[] {
  const result: ExerciseOrder[] = [];
  for (const session of sessions) {
    const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    const completed = ex.sets.filter((s) => s.completed);
    if (completed.length === 0) continue;

    // 依 firstCompletedAt 排序所有有完成組的動作，決定 rank
    const completedExercises = session.exercises.filter((e) =>
      e.sets.some((s) => s.completed),
    );
    const sorted = [...completedExercises].sort((a, b) => {
      const at = a.firstCompletedAt ?? '';
      const bt = b.firstCompletedAt ?? '';
      if (!at || !bt) return 0;
      return at.localeCompare(bt);
    });
    const rank = sorted.findIndex((e) => e.exerciseId === exerciseId) + 1 || 1;

    const best = bestCompletedSet(completed);
    if (!best) continue;
    result.push({ sessionId: session.id, rank, bestWeight: best.weight });
  }
  return result;
}

/**
 * P2A-1：疲勞感知建議。
 *
 * 邏輯：
 * - 只在該動作有 ≥3 次歷史完成紀錄時顯示（避免樣本不足）。
 * - 取「上次同動作」的最佳重量與當時的執行順序（rank）。
 * - 對比「本次訓練」中此動作的順序：
 *   - 本次 rank > 上次 rank → 動作排較後面、累積疲勞較高 → 建議降 5% 左右。
 *   - 本次 rank < 上次 rank → 動作排較前面、體力較好 → 建議小幅上調 2.5kg。
 *   - 相同 rank → 建議與上次相同。
 * - 永遠只給「建議區間」，不自動填入，用戶可自由覆寫。
 *
 * @returns null 表示資料不足或不顯示。
 */
export function getFatigueSuggestion(
  sessions: WorkoutSession[],
  activeSession: WorkoutSession | null | undefined,
  exerciseId: string,
): FatigueSuggestion | null {
  if (!activeSession) return null;

  // 歷史：至少 3 次完成此動作
  const history = getExerciseHistory(sessions, exerciseId);
  if (history.length < 3) return null;

  // 取最近一次（最新 session）
  const last = history[history.length - 1];
  if (!last || last.bestWeight <= 0) return null; // 徒手不建議重量

  // 本次訓練中此動作的 rank（依 firstCompletedAt，若尚未完成則用陣列順序）
  const activeEx = activeSession.exercises.find((e) => e.exerciseId === exerciseId);
  if (!activeEx) return null;

  let currentRank = 1;
  const activeCompleted = activeSession.exercises.filter((e) =>
    e.sets.some((s) => s.completed),
  );
  if (activeCompleted.length > 0) {
    const sorted = [...activeCompleted].sort((a, b) => {
      const at = a.firstCompletedAt ?? '';
      const bt = b.firstCompletedAt ?? '';
      if (!at || !bt) return 0;
      return at.localeCompare(bt);
    });
    currentRank = sorted.findIndex((e) => e.exerciseId === exerciseId) + 1 || 1;
  } else {
    // 都還沒做 → 用計畫順序（陣列 index + 1）
    currentRank = activeSession.exercises.findIndex((e) => e.exerciseId === exerciseId) + 1;
  }

  // 以 2.5kg 為階梯的四捨五入
  const round25 = (w: number) => Math.max(0, Math.round(w / 2.5) * 2.5);

  let baseWeight = last.bestWeight;
  let reason = '';
  if (currentRank > last.rank) {
    // 排較後面 → 降 5%
    const adjusted = round25(last.bestWeight * 0.95);
    baseWeight = adjusted;
    reason = `上次第 ${last.rank} 個做、用 ${last.bestWeight}kg；今天排第 ${currentRank} 個，疲勞會累積，建議降到`;
  } else if (currentRank < last.rank) {
    // 排較前面 → 小幅加 2.5kg（不超過上次）
    const adjusted = round25(last.bestWeight + 2.5);
    baseWeight = adjusted;
    reason = `上次第 ${last.rank} 個做、用 ${last.bestWeight}kg；今天排第 ${currentRank} 個，體力較好，可以試試`;
  } else {
    reason = `上次第 ${last.rank} 個做、用 ${last.bestWeight}kg；今天順序差不多，建議維持`;
  }

  // 區間：base ± 2.5kg（下限不低於 5kg）
  const minWeight = Math.max(5, round25(baseWeight - 2.5));
  const maxWeight = round25(baseWeight + 2.5);

  return {
    minWeight,
    maxWeight,
    reason: `${reason} ${minWeight}–${maxWeight}kg`,
  };
}
