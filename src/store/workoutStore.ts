import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkoutSession, ExerciseLog, SetLog, PersonalRecord, PlanExercise, PlanDay } from '@/types';
import {
  generateId,
  calculateTotalVolume,
  getSessionPRs,
  createExerciseLog,
  estimate1RM,
} from '@/utils/workout';

interface WorkoutState {
  // 歷史記錄
  sessions: WorkoutSession[];
  // 進行中的訓練
  activeSession: WorkoutSession | null;
  // PR 紀錄（按動作分組）
  personalRecords: PersonalRecord[];

  // 動作
  startSession: (planId: string, planName: string, day: PlanDay) => void;
  startEmptySession: () => void;
  addExerciseToActive: (ex: PlanExercise) => void;
  updateSet: (exerciseLogId: string, setId: string, patch: Partial<SetLog>) => void;
  addSet: (exerciseLogId: string) => void;
  removeSet: (exerciseLogId: string, setId: string) => void;
  toggleSetCompleted: (exerciseLogId: string, setId: string) => void;
  removeExercise: (exerciseLogId: string) => void;
  finishSession: () => WorkoutSession | null;
  clearActiveSession: () => void;

  // 統計
  getTotalSessions: () => number;
  getTotalVolume: () => number;
  getStreakDays: () => number;
  getExerciseProgress: (exerciseId: string) => { date: string; maxWeight: number; estimated1RM: number }[];
  getWeeklyVolume: () => { week: string; volume: number }[];
}

function computePRsFromSessions(sessions: WorkoutSession[]): PersonalRecord[] {
  const map = new Map<string, PersonalRecord>();
  for (const session of sessions) {
    const sessionPRs = getSessionPRs(session);
    for (const pr of sessionPRs) {
      const existing = map.get(pr.exerciseId);
      if (!existing || pr.estimated1RM > existing.estimated1RM) {
        map.set(pr.exerciseId, pr);
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.estimated1RM - a.estimated1RM);
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      // 初始狀態為空，使用者自己的訓練資料會透過 finishSession 累積
      sessions: [],
      activeSession: null,
      personalRecords: [],

      startSession: (planId, planName, day) => {
        const exercises: ExerciseLog[] = day.exercises.map((pe) =>
          createExerciseLog(pe.exerciseId, pe.name, pe.targetSets, pe.targetWeight)
        );
        const session: WorkoutSession = {
          id: generateId('session'),
          date: new Date().toISOString(),
          planId,
          planName,
          dayName: day.dayName,
          duration: 0,
          totalVolume: 0,
          exercises,
        };
        set({ activeSession: session });
      },

      startEmptySession: () => {
        const session: WorkoutSession = {
          id: generateId('session'),
          date: new Date().toISOString(),
          duration: 0,
          totalVolume: 0,
          exercises: [],
        };
        set({ activeSession: session });
      },

      addExerciseToActive: (ex) => {
        const active = get().activeSession;
        if (!active) return;
        const newEx = createExerciseLog(ex.exerciseId, ex.name, ex.targetSets || 3, ex.targetWeight);
        set({ activeSession: { ...active, exercises: [...active.exercises, newEx] } });
      },

      updateSet: (exerciseLogId, setId, patch) => {
        const active = get().activeSession;
        if (!active) return;
        const exercises = active.exercises.map((ex) => {
          if (ex.id !== exerciseLogId) return ex;
          return {
            ...ex,
            sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
          };
        });
        set({ activeSession: { ...active, exercises } });
      },

      addSet: (exerciseLogId) => {
        const active = get().activeSession;
        if (!active) return;
        const exercises = active.exercises.map((ex) => {
          if (ex.id !== exerciseLogId) return ex;
          const lastSet = ex.sets[ex.sets.length - 1];
          const newSet: SetLog = {
            id: generateId('set'),
            setNumber: ex.sets.length + 1,
            weight: lastSet?.weight ?? 0,
            reps: lastSet?.reps ?? 0,
            completed: false,
          };
          return { ...ex, sets: [...ex.sets, newSet] };
        });
        set({ activeSession: { ...active, exercises } });
      },

      removeSet: (exerciseLogId, setId) => {
        const active = get().activeSession;
        if (!active) return;
        const exercises = active.exercises.map((ex) => {
          if (ex.id !== exerciseLogId) return ex;
          const filtered = ex.sets.filter((s) => s.id !== setId);
          return {
            ...ex,
            sets: filtered.map((s, i) => ({ ...s, setNumber: i + 1 })),
          };
        });
        set({ activeSession: { ...active, exercises } });
      },

      toggleSetCompleted: (exerciseLogId, setId) => {
        const active = get().activeSession;
        if (!active) return;
        const exercises = active.exercises.map((ex) => {
          if (ex.id !== exerciseLogId) return ex;
          return {
            ...ex,
            sets: ex.sets.map((s) =>
              s.id === setId ? { ...s, completed: !s.completed } : s
            ),
          };
        });
        set({ activeSession: { ...active, exercises } });
      },

      removeExercise: (exerciseLogId) => {
        const active = get().activeSession;
        if (!active) return;
        set({
          activeSession: {
            ...active,
            exercises: active.exercises.filter((ex) => ex.id !== exerciseLogId),
          },
        });
      },

      finishSession: () => {
        const active = get().activeSession;
        if (!active) return null;
        const finished: WorkoutSession = {
          ...active,
          totalVolume: calculateTotalVolume(active),
        };
        const newSessions = [...get().sessions, finished].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        // 更新 PR
        const newPRs = [...get().personalRecords];
        for (const pr of getSessionPRs(finished)) {
          const idx = newPRs.findIndex((p) => p.exerciseId === pr.exerciseId);
          if (idx === -1 || pr.estimated1RM > newPRs[idx].estimated1RM) {
            if (idx >= 0) newPRs[idx] = pr;
            else newPRs.push(pr);
          }
        }
        newPRs.sort((a, b) => b.estimated1RM - a.estimated1RM);
        set({ sessions: newSessions, personalRecords: newPRs, activeSession: null });
        return finished;
      },

      clearActiveSession: () => set({ activeSession: null }),

      getTotalSessions: () => get().sessions.length,

      getTotalVolume: () =>
        Math.round(
          get().sessions.reduce((sum, s) => sum + s.totalVolume, 0) / 1000
        ),

      getStreakDays: () => {
        const sessions = get().sessions;
        if (sessions.length === 0) return 0;
        const dates = sessions
          .map((s) => new Date(s.date).toDateString())
          .filter((d, i, arr) => arr.indexOf(d) === i)
          .map((d) => new Date(d))
          .sort((a, b) => b.getTime() - a.getTime());
        let streak = 0;
        let cursor = new Date();
        cursor.setHours(0, 0, 0, 0);
        for (const d of dates) {
          const day = new Date(d);
          day.setHours(0, 0, 0, 0);
          const diff = Math.round((cursor.getTime() - day.getTime()) / 86400000);
          if (diff === 0) {
            streak++;
          } else if (diff === 1) {
            streak++;
            cursor = day;
          } else {
            break;
          }
        }
        return streak;
      },

      getExerciseProgress: (exerciseId) => {
        const sessions = get().sessions;
        const points: { date: string; maxWeight: number; estimated1RM: number }[] = [];
        for (const s of sessions) {
          const ex = s.exercises.find((e) => e.exerciseId === exerciseId);
          if (!ex) continue;
          const completed = ex.sets.filter((set) => set.completed);
          if (completed.length === 0) continue;
          const max = completed.reduce((m, set) =>
            estimate1RM(set.weight, set.reps) > estimate1RM(m.weight, m.reps) ? set : m
          );
          points.push({
            date: s.date,
            maxWeight: max.weight,
            estimated1RM: estimate1RM(max.weight, max.reps),
          });
        }
        return points;
      },

      getWeeklyVolume: () => {
        const sessions = get().sessions;
        const weeklyMap = new Map<string, number>();
        for (const s of sessions) {
          const d = new Date(s.date);
          // 找到該週週一
          const day = d.getDay();
          const diff = day === 0 ? 6 : day - 1;
          const monday = new Date(d);
          monday.setDate(d.getDate() - diff);
          const key = `${monday.getMonth() + 1}/${monday.getDate()}`;
          weeklyMap.set(key, (weeklyMap.get(key) ?? 0) + s.totalVolume);
        }
        return Array.from(weeklyMap.entries())
          .map(([week, volume]) => ({ week, volume: Math.round(volume / 1000) }))
          .slice(-8);
      },
    }),
    {
      name: 'ironpulse-workouts',
      version: 2,
      // 不持久化 activeSession
      partialize: (state) => ({
        sessions: state.sessions,
        personalRecords: state.personalRecords,
      }),
      // v1 含有開發時的範例資料（22 個 sample sessions），升級到 v2 時清空
      migrate: (persistedState, version) => {
        const state = (persistedState ?? {}) as Partial<WorkoutState>;
        if (version < 2) {
          // 舊版有 sample data，全部清空讓使用者從零開始
          return {
            sessions: [],
            personalRecords: [],
          } as Pick<WorkoutState, 'sessions' | 'personalRecords'>;
        }
        return {
          sessions: state.sessions ?? [],
          personalRecords: state.personalRecords ?? [],
        } as Pick<WorkoutState, 'sessions' | 'personalRecords'>;
      },
    }
  )
);
