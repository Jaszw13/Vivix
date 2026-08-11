import type { QuestDef } from '../types';

export const QUESTS: QuestDef[] = [
  {
    id: 'first_workout',
    name: '第一步',
    description: '完成第一次訓練',
    condition: { type: 'workout_count', threshold: 1 },
    reward: { xp: 40, cosmeticId: 'sport_headband' },
  },
  {
    id: 'first_warmup',
    name: '熱身開始',
    description: '完成一次熱身',
    condition: { type: 'warmup_count', threshold: 1 },
    reward: { xp: 10 },
  },
  {
    id: 'three_workouts',
    name: '三次訓練',
    description: '累計完成 3 次訓練',
    condition: { type: 'workout_count', threshold: 3 },
    reward: { formId: 'stage_2' },
  },
  {
    id: 'first_pr',
    name: '第一個 PR',
    description: '達成第一個個人記錄',
    condition: { type: 'pr_count', threshold: 1 },
    reward: { titleId: 'title_breakthrough' },
  },
  {
    id: 'streak_3',
    name: '連續 3 天',
    description: '連續 3 天進行訓練',
    condition: { type: 'streak_days', threshold: 3 },
    reward: { cosmeticId: 'scarf' },
  },
  {
    id: 'weekly_two',
    name: '完成一週',
    description: '7 天內完成 2 次訓練',
    condition: { type: 'weekly_workouts', threshold: 2, windowDays: 7 },
    reward: { xp: 30 },
  },
  {
    id: 'weekly_three',
    name: '穩定訓練',
    description: '7 天內完成 3 次訓練',
    condition: { type: 'weekly_workouts', threshold: 3, windowDays: 7 },
    reward: { titleId: 'title_stable_trainer' },
  },
  {
    id: 'warmup_habit',
    name: '熱身習慣',
    description: '在 3 次訓練中完成熱身',
    condition: { type: 'warmup_count', threshold: 3 },
    reward: { badgeId: 'warmup_badge' },
  },
  {
    id: 'two_week_partner',
    name: '兩週夥伴',
    description: '14 天內完成 4 次訓練',
    condition: { type: 'workouts_in_days', threshold: 4, windowDays: 14 },
    reward: { cosmeticId: 'small_backpack' },
  },
  {
    id: 'ten_workouts',
    name: '訓練夥伴',
    description: '累計完成 10 次訓練',
    condition: { type: 'workout_count', threshold: 10 },
    reward: { cosmeticId: 'gym_background' },
  },
];

export const QUEST_MAP: Record<string, QuestDef> = Object.fromEntries(
  QUESTS.map((q) => [q.id, q])
);
