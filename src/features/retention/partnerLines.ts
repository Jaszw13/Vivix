import type { WeeklyGoalState } from './selectors';

interface PartnerLineCtx {
  daysSinceLast: number | null;
  weekly: WeeklyGoalState;
  microDone: boolean;
}

/**
 * P1-4：虛擬夥伴的陪伴台詞（純本地、不做對話）。
 * 原則：不出現羞恥、失敗、落後；永遠把門檻降到「做一組」。
 */
export function getPartnerLine({ daysSinceLast, weekly, microDone }: PartnerLineCtx): string {
  if (daysSinceLast !== null && daysSinceLast >= 14) {
    return '你回來了。今天不用補進度，做一組就好，我在這裡陪你。';
  }
  if (microDone) {
    return '一組也是訓練。今天有動到，就比昨天多一點。';
  }
  if (weekly.hit) {
    return '本週目標達成了，剩下的都是加分。想再動也可以。';
  }
  if (weekly.remaining === 1) {
    return '再 1 次就達標。今天只做一組也算，先開始再說。';
  }
  if (weekly.days === 0) {
    return '這週還沒開始，先做一組？做完再決定要不要繼續。';
  }
  return '保持節奏就好。累了就做一組，別讓它中斷。';
}
