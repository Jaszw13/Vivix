import { WEEK_MS, sessionDayKey } from '@/utils/time';
import type { ExperienceLane, FreqBucket, TrainingGoal } from './types';

/**
 * 目標 → 既有預設計畫。
 * 不改 5x5 / 上下 / PPL 的日課內容，只決定推薦哪一份。
 * 同一個經驗與頻率下，增肌 / 減脂 / 健康不會三個都落到同一個 id。
 */
export function recommendPlanId(input: {
  goal: TrainingGoal;
  experience: ExperienceLane;
  freq?: FreqBucket | null;
}): string {
  const { goal, experience } = input;
  if (experience === 'beginner') {
    if (goal === 'muscle') return '5x5-strength';
    if (goal === 'fatloss') return 'full-body-3';
    return 'upper-lower';
  }

  const freq = input.freq ?? '3-4';
  if (goal === 'muscle') {
    if (freq === '1') return '5x5-strength';
    if (freq === '2') return 'upper-lower';
    if (freq === '5+') return 'push-pull-legs';
    return 'upper-lower-4';
  }
  if (goal === 'fatloss') {
    if (freq === '1' || freq === '2') return 'full-body-3';
    return 'push-pull-legs';
  }
  if (freq === '1') return 'full-body-3';
  if (freq === '2') return 'upper-lower';
  if (freq === '5+') return 'upper-lower-4';
  return 'full-body-3';
}

/**
 * Errata E5 / Onboarding spec：近 8 週平均訓練日 → 頻率桶。
 * < 1.5 → 1（舊公式 5×5）；1.5–2.5 → 2（上下）；
 * 2.5–5 → 3-4（PPL）；≥ 5 → 5+（PPL）。
 * 目標再由 recommendPlanId 拆開，三個目標不會落到同一個計畫。
 */
export function freqBucketFromWeeklyAverage(avg: number): FreqBucket {
  if (!Number.isFinite(avg) || avg < 1.5) return '1';
  if (avg < 2.5) return '2';
  if (avg < 5) return '3-4';
  return '5+';
}

/**
 * 近 8 週訓練日 ÷ min(8, 自第一筆起到現在的週數)。
 * 沒有可讀日期時回 null，讓使用者自己選 chips。
 */
export function freqBucketFromRecentSessions(
  sessions: { date: string }[],
  now: Date = new Date(),
): FreqBucket | null {
  if (!sessions || sessions.length === 0) return null;
  const nowMs = now.getTime();
  const windowStart = nowMs - 8 * WEEK_MS;
  const trainDays = new Set<string>();
  let minDateMs = nowMs;
  let any = false;
  for (const session of sessions) {
    const at = new Date(session.date).getTime();
    if (!Number.isFinite(at)) continue;
    any = true;
    if (at < minDateMs) minDateMs = at;
    if (at >= windowStart) trainDays.add(sessionDayKey(session.date));
  }
  if (!any) return null;
  const rangeStart = Math.max(minDateMs, windowStart);
  const spanMs = Math.max(0, nowMs - rangeStart);
  const spanWeeks = Math.max(1, Math.ceil(spanMs / WEEK_MS) || 1);
  const eligibleWeeks = Math.min(8, spanWeeks);
  return freqBucketFromWeeklyAverage(trainDays.size / eligibleWeeks);
}

/** Settings 允許 1–5。3–4 次取 4，5+ 取 5。 */
export function freqBucketToWeeklyDays(bucket: FreqBucket): number {
  if (bucket === '1') return 1;
  if (bucket === '2') return 2;
  if (bucket === '3-4') return 4;
  return 5;
}

const PLAN_WEEKLY_DAYS: Record<string, number> = {
  '5x5-strength': 3,
  'full-body-3': 3,
  'upper-lower': 4,
  'upper-lower-4': 4,
  'push-pull-legs': 5,
};

/**
 * Lane B 用使用者選的頻率。
 * Lane A 沒有頻率題，改由計畫說明上的每週天數推斷。
 */
export function weeklyDaysForOnboarding(input: {
  experience: ExperienceLane;
  freq?: FreqBucket | null;
  planId: string;
}): number {
  if (input.experience === 'experienced' && input.freq) {
    return freqBucketToWeeklyDays(input.freq);
  }
  return PLAN_WEEKLY_DAYS[input.planId] ?? 3;
}

const FIVE_BY_FIVE_COPY =
  '因為三大項（深蹲/臥推/划船/硬舉）是新手入門最快建立力量的路徑，5 組 × 5 次不會太難跟隨，每完成一次都有清晰進步感。';

const PLAN_COPY: Record<string, string> = {
  '5x5-strength': FIVE_BY_FIVE_COPY,
  'full-body-3':
    '全身 3 天以器械和啞鈴為主，每次都練到全身，單次不會太長，適合減脂或先把習慣建立起來。',
  'upper-lower':
    '上下半身輪流練，訓練量和恢復比較平衡，適合想長期保持健康、穩定進步的人。',
  'upper-lower-4': '一週四次的上下半身，每個部位每週兩次，進步和恢復都顧到。',
  'push-pull-legs': '推、拉、腿分開練，部位刺激更聚焦。一週能練比較多次的時候，用這個密度。',
};

const FREQ_COPY: Record<FreqBucket, string> = {
  '1': '每週 1 次先培養規律，5×5 全身入門是最穩的起步。',
  '2': '每週 2 次以上可用上下分裂，上下半身輪流恢復。',
  '3-4': '每週 3–4 次節奏適合推拉腿 PPL，部位刺激更聚焦。',
  '5+': '每週 5 次以上同樣建議 PPL，把恢復日排在訓練日之間。',
};

function legacyPlanForFreq(freq: FreqBucket): string {
  if (freq === '1') return '5x5-strength';
  if (freq === '2') return 'upper-lower';
  return 'push-pull-legs';
}

/**
 * 規則文案。不呼叫模型。
 * 若這次推薦跟舊的「只看頻率」相同，就用原來那句；
 * 目標把計畫改掉時，改講這份計畫本身。
 */
export function explainPlan(input?: {
  goal?: TrainingGoal;
  experience?: ExperienceLane;
  freq?: FreqBucket | null;
  planId?: string;
}): string {
  const goal = input?.goal ?? 'health';
  const experience = input?.experience ?? 'beginner';
  const planId =
    input?.planId ??
    recommendPlanId({ goal, experience, freq: input?.freq });
  const planLine = PLAN_COPY[planId] ?? FIVE_BY_FIVE_COPY;
  if (experience === 'experienced' && input?.freq && planId === legacyPlanForFreq(input.freq)) {
    return FREQ_COPY[input.freq];
  }
  return planLine;
}
