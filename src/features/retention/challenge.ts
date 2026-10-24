import type { WorkoutSession } from '@/types';
import { getWeekStart } from './selectors';

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  /** 目標值 */
  target: number;
  /** 當前進度 */
  current: number;
  /** 是否已完成 */
  completed: boolean;
  /** 獎勵 XP */
  rewardXp: number;
  /** 本週一日期（yyyy-MM-dd），用於確認是哪一週的挑戰 */
  weekStart: string;
}

interface ChallengeTemplate {
  id: string;
  title: string;
  description: (target: number) => string;
  /** 依歷史訓練量動態計算目標 */
  computeTarget: (avgWeeklySessions: number) => number;
  /** 計算本週進度 */
  computeCurrent: (
    sessions: WorkoutSession[],
    cardioDates: string[],
    weekStart: Date,
    weekEnd: Date,
  ) => number;
  rewardXp: number;
}

const ISO_WEEK = (d: Date): string => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

/** 計算使用者的週平均訓練天數（用於動態調整挑戰難度） */
function getAvgWeeklyTrainingDays(sessions: WorkoutSession[], cardioDates: string[]): number {
  if (sessions.length === 0 && cardioDates.length === 0) return 0;
  // 取最近 4 週
  const now = new Date();
  const fourWeeksAgo = new Date(now.getTime() - 28 * 86400000);
  const trainingDays = new Set<string>();
  for (const s of sessions) {
    const d = new Date(s.date);
    if (d >= fourWeeksAgo) trainingDays.add(d.toDateString());
  }
  for (const iso of cardioDates) {
    const d = new Date(iso);
    if (d >= fourWeeksAgo) trainingDays.add(d.toDateString());
  }
  return trainingDays.size / 4;
}

const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    id: 'weekly_sessions',
    title: '本週訓練量',
    description: (target) => `本週完成 ${target} 次訓練（含 micro）`,
    computeTarget: (avg) => Math.max(2, Math.round(avg) + 1),
    computeCurrent: (sessions, _cardioDates, weekStart, weekEnd) =>
      sessions.filter((s) => {
        const d = new Date(s.date);
        return d >= weekStart && d < weekEnd;
      }).length,
    rewardXp: 50,
  },
  {
    id: 'weekly_volume',
    title: '本週總容量',
    description: (target) => `本週總容量達到 ${(target / 1000).toFixed(0)} 噸`,
    computeTarget: (_avg) => 5000, // 5 噸為基準
    computeCurrent: (sessions, _cardioDates, weekStart, weekEnd) =>
      sessions
        .filter((s) => {
          const d = new Date(s.date);
          return d >= weekStart && d < weekEnd;
        })
        .reduce((sum, s) => sum + s.totalVolume, 0),
    rewardXp: 60,
  },
  {
    id: 'try_new_exercise',
    title: '嘗試新動作',
    description: () => '本週在訓練中加入一個從未做過的動作',
    computeTarget: () => 1,
    computeCurrent: (sessions, _cardioDates, weekStart, weekEnd) => {
      // 本週前已做過的動作集合
      const before = new Set<string>();
      for (const s of sessions) {
        const d = new Date(s.date);
        if (d < weekStart) {
          for (const ex of s.exercises) before.add(ex.exerciseId);
        }
      }
      // 本週訓練中出現的「新」動作
      const seenThisWeek = new Set<string>();
      for (const s of sessions) {
        const d = new Date(s.date);
        if (d >= weekStart && d < weekEnd) {
          for (const ex of s.exercises) {
            if (!before.has(ex.exerciseId) && ex.sets.some((st) => st.completed)) {
              seenThisWeek.add(ex.exerciseId);
            }
          }
        }
      }
      return seenThisWeek.size > 0 ? 1 : 0;
    },
    rewardXp: 40,
  },
];

/**
 * P2A-2：取得本週挑戰。
 *
 * - 挑戰每週一刷新，同一週內固定（用 ISO week 雜湊選 template）。
 * - 目標難度依使用者近 4 週平均訓練天數動態調整。
 * - 失敗無懲罰，完成給 XP。
 */
export function getWeeklyChallenge(
  sessions: WorkoutSession[],
  cardioDates: string[],
  now = new Date(),
): WeeklyChallenge {
  const weekStart = getWeekStart(now);
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  const weekKey = ISO_WEEK(now);

  // 用週別雜湊選模板，確保同週不變
  let hash = 0;
  for (let i = 0; i < weekKey.length; i++) {
    hash = (hash * 31 + weekKey.charCodeAt(i)) >>> 0;
  }
  const template = CHALLENGE_TEMPLATES[hash % CHALLENGE_TEMPLATES.length];

  const avgWeekly = getAvgWeeklyTrainingDays(sessions, cardioDates);
  const target = template.computeTarget(avgWeekly);
  const current = template.computeCurrent(sessions, cardioDates, weekStart, weekEnd);
  const completed = current >= target;

  return {
    id: `${template.id}-${weekKey}`,
    title: template.title,
    description: template.description(target),
    target,
    current: Math.min(current, target),
    completed,
    rewardXp: template.rewardXp,
    weekStart: weekStart.toISOString().slice(0, 10),
  };
}
