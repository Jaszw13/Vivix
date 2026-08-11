import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { QuestProgress } from '../types';
import { QUESTS, QUEST_MAP } from '../data/quests';

interface QuestState {
  progress: Record<string, QuestProgress>;
  // 更新任務進度（根據各種指標）
  recompute: (ctx: {
    totalWorkouts: number;
    totalPRs: number;
    streakDays: number;
    warmupCount: number;
    recentWorkoutDates: string[]; // ISO dates for window-based quests
  }) => QuestProgress[];
  claim: (questId: string) => QuestProgress | null;
  reset: () => void;
}

function computeQuestCurrent(
  questId: string,
  ctx: {
    totalWorkouts: number;
    totalPRs: number;
    streakDays: number;
    warmupCount: number;
    recentWorkoutDates: string[];
  }
): number {
  const def = QUEST_MAP[questId];
  if (!def) return 0;
  const { type, threshold, windowDays } = def.condition;
  switch (type) {
    case 'workout_count':
      return ctx.totalWorkouts;
    case 'warmup_count':
      return ctx.warmupCount;
    case 'pr_count':
      return ctx.totalPRs;
    case 'streak_days':
      return ctx.streakDays;
    case 'weekly_workouts':
    case 'workouts_in_days': {
      if (!windowDays) return 0;
      const cutoff = Date.now() - windowDays * 86400000;
      return ctx.recentWorkoutDates.filter((d) => new Date(d).getTime() >= cutoff).length;
    }
    default:
      return 0;
  }
}

export const useQuestStore = create<QuestState>()(
  persist(
    (set, get) => ({
      progress: {},

      recompute: (ctx) => {
        const state = get();
        const updated: QuestProgress[] = [];
        const newProgress = { ...state.progress };

        for (const quest of QUESTS) {
          const existing = state.progress[quest.id];
          if (existing?.claimed) {
            updated.push(existing);
            continue;
          }
          const current = computeQuestCurrent(quest.id, ctx);
          const completed = current >= quest.condition.threshold;
          const newEntry: QuestProgress = {
            questId: quest.id,
            completed,
            claimed: existing?.claimed ?? false,
            current,
            completedAt: existing?.completedAt ?? (completed ? new Date().toISOString() : undefined),
          };
          newProgress[quest.id] = newEntry;
          updated.push(newEntry);
        }

        set({ progress: newProgress });
        return updated;
      },

      claim: (questId) => {
        const state = get();
        const existing = state.progress[questId];
        if (!existing || !existing.completed || existing.claimed) return null;
        const updated: QuestProgress = { ...existing, claimed: true, claimedAt: new Date().toISOString() } as QuestProgress;
        set({
          progress: { ...state.progress, [questId]: updated },
        });
        return updated;
      },

      reset: () => set({ progress: {} }),
    }),
    {
      name: 'vivix-quest-store-v1',
      version: 1,
    }
  )
);
