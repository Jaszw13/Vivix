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

// ============ 生成範例歷史資料 ============

function buildSampleHistory(): WorkoutSession[] {
  const now = Date.now();
  const day = 86400000;
  const sessions: WorkoutSession[] = [];

  // 過去 8 週的範例資料（每週 3 次訓練）
  const sampleWorkouts: { daysAgo: number; exercises: { id: string; name: string; sets: { w: number; r: number }[] }[]; planName: string; dayName: string }[] = [
    { daysAgo: 56, planName: '5x5 力量基礎', dayName: 'A 日', exercises: [
      { id: 'squat', name: '深蹲', sets: [{ w: 60, r: 5 }, { w: 60, r: 5 }, { w: 60, r: 5 }, { w: 60, r: 5 }, { w: 60, r: 5 }] },
      { id: 'bench-press', name: '臥推', sets: [{ w: 40, r: 5 }, { w: 40, r: 5 }, { w: 40, r: 5 }, { w: 40, r: 5 }, { w: 40, r: 5 }] },
      { id: 'barbell-row', name: '槓鈴划船', sets: [{ w: 40, r: 5 }, { w: 40, r: 5 }, { w: 40, r: 5 }, { w: 40, r: 5 }, { w: 40, r: 5 }] },
    ] },
    { daysAgo: 54, planName: '5x5 力量基礎', dayName: 'B 日', exercises: [
      { id: 'squat', name: '深蹲', sets: [{ w: 62.5, r: 5 }, { w: 62.5, r: 5 }, { w: 62.5, r: 5 }, { w: 62.5, r: 5 }, { w: 62.5, r: 5 }] },
      { id: 'overhead-press', name: '肩推', sets: [{ w: 25, r: 5 }, { w: 25, r: 5 }, { w: 25, r: 5 }, { w: 25, r: 5 }, { w: 25, r: 5 }] },
      { id: 'deadlift', name: '硬舉', sets: [{ w: 60, r: 5 }] },
    ] },
    { daysAgo: 52, planName: '5x5 力量基礎', dayName: 'A 日', exercises: [
      { id: 'squat', name: '深蹲', sets: [{ w: 65, r: 5 }, { w: 65, r: 5 }, { w: 65, r: 5 }, { w: 65, r: 5 }, { w: 65, r: 5 }] },
      { id: 'bench-press', name: '臥推', sets: [{ w: 42.5, r: 5 }, { w: 42.5, r: 5 }, { w: 42.5, r: 5 }, { w: 42.5, r: 5 }, { w: 42.5, r: 5 }] },
      { id: 'barbell-row', name: '槓鈴划船', sets: [{ w: 42.5, r: 5 }, { w: 42.5, r: 5 }, { w: 42.5, r: 5 }, { w: 42.5, r: 5 }, { w: 42.5, r: 5 }] },
    ] },
    { daysAgo: 49, planName: '5x5 力量基礎', dayName: 'B 日', exercises: [
      { id: 'squat', name: '深蹲', sets: [{ w: 67.5, r: 5 }, { w: 67.5, r: 5 }, { w: 67.5, r: 5 }, { w: 67.5, r: 5 }, { w: 67.5, r: 5 }] },
      { id: 'overhead-press', name: '肩推', sets: [{ w: 27.5, r: 5 }, { w: 27.5, r: 5 }, { w: 27.5, r: 5 }, { w: 27.5, r: 5 }, { w: 27.5, r: 5 }] },
      { id: 'deadlift', name: '硬舉', sets: [{ w: 65, r: 5 }] },
    ] },
    { daysAgo: 47, planName: '5x5 力量基礎', dayName: 'A 日', exercises: [
      { id: 'squat', name: '深蹲', sets: [{ w: 70, r: 5 }, { w: 70, r: 5 }, { w: 70, r: 5 }, { w: 70, r: 5 }, { w: 70, r: 5 }] },
      { id: 'bench-press', name: '臥推', sets: [{ w: 45, r: 5 }, { w: 45, r: 5 }, { w: 45, r: 5 }, { w: 45, r: 5 }, { w: 45, r: 5 }] },
      { id: 'barbell-row', name: '槓鈴划船', sets: [{ w: 45, r: 5 }, { w: 45, r: 5 }, { w: 45, r: 5 }, { w: 45, r: 5 }, { w: 45, r: 5 }] },
    ] },
    { daysAgo: 42, planName: '5x5 力量基礎', dayName: 'B 日', exercises: [
      { id: 'squat', name: '深蹲', sets: [{ w: 72.5, r: 5 }, { w: 72.5, r: 5 }, { w: 72.5, r: 5 }, { w: 72.5, r: 5 }, { w: 72.5, r: 5 }] },
      { id: 'overhead-press', name: '肩推', sets: [{ w: 30, r: 5 }, { w: 30, r: 5 }, { w: 30, r: 5 }, { w: 30, r: 5 }, { w: 30, r: 5 }] },
      { id: 'deadlift', name: '硬舉', sets: [{ w: 70, r: 5 }] },
    ] },
    { daysAgo: 40, planName: '5x5 力量基礎', dayName: 'A 日', exercises: [
      { id: 'squat', name: '深蹲', sets: [{ w: 75, r: 5 }, { w: 75, r: 5 }, { w: 75, r: 5 }, { w: 75, r: 5 }, { w: 75, r: 5 }] },
      { id: 'bench-press', name: '臥推', sets: [{ w: 47.5, r: 5 }, { w: 47.5, r: 5 }, { w: 47.5, r: 5 }, { w: 47.5, r: 5 }, { w: 47.5, r: 5 }] },
      { id: 'barbell-row', name: '槓鈴划船', sets: [{ w: 47.5, r: 5 }, { w: 47.5, r: 5 }, { w: 47.5, r: 5 }, { w: 47.5, r: 5 }, { w: 47.5, r: 5 }] },
    ] },
    { daysAgo: 35, planName: '5x5 力量基礎', dayName: 'B 日', exercises: [
      { id: 'squat', name: '深蹲', sets: [{ w: 77.5, r: 5 }, { w: 77.5, r: 5 }, { w: 77.5, r: 5 }, { w: 77.5, r: 5 }, { w: 77.5, r: 5 }] },
      { id: 'overhead-press', name: '肩推', sets: [{ w: 32.5, r: 5 }, { w: 32.5, r: 5 }, { w: 32.5, r: 5 }, { w: 32.5, r: 5 }, { w: 32.5, r: 5 }] },
      { id: 'deadlift', name: '硬舉', sets: [{ w: 75, r: 5 }] },
    ] },
    { daysAgo: 33, planName: '5x5 力量基礎', dayName: 'A 日', exercises: [
      { id: 'squat', name: '深蹲', sets: [{ w: 80, r: 5 }, { w: 80, r: 5 }, { w: 80, r: 5 }, { w: 80, r: 5 }, { w: 80, r: 5 }] },
      { id: 'bench-press', name: '臥推', sets: [{ w: 50, r: 5 }, { w: 50, r: 5 }, { w: 50, r: 5 }, { w: 50, r: 5 }, { w: 50, r: 5 }] },
      { id: 'barbell-row', name: '槓鈴划船', sets: [{ w: 50, r: 5 }, { w: 50, r: 5 }, { w: 50, r: 5 }, { w: 50, r: 5 }, { w: 50, r: 5 }] },
    ] },
    { daysAgo: 28, planName: '推拉腿 PPL', dayName: '推 Push', exercises: [
      { id: 'bench-press', name: '臥推', sets: [{ w: 55, r: 6 }, { w: 55, r: 6 }, { w: 55, r: 6 }, { w: 55, r: 6 }] },
      { id: 'overhead-press', name: '肩推', sets: [{ w: 35, r: 8 }, { w: 35, r: 8 }, { w: 35, r: 8 }] },
      { id: 'tricep-pushdown', name: '三頭下壓', sets: [{ w: 25, r: 12 }, { w: 25, r: 12 }, { w: 25, r: 12 }, { w: 25, r: 12 }] },
    ] },
    { daysAgo: 26, planName: '推拉腿 PPL', dayName: '拉 Pull', exercises: [
      { id: 'deadlift', name: '硬舉', sets: [{ w: 80, r: 5 }, { w: 80, r: 5 }, { w: 80, r: 5 }] },
      { id: 'barbell-row', name: '槓鈴划船', sets: [{ w: 55, r: 8 }, { w: 55, r: 8 }, { w: 55, r: 8 }, { w: 55, r: 8 }] },
      { id: 'barbell-curl', name: '槓鈴二頭彎舉', sets: [{ w: 30, r: 12 }, { w: 30, r: 12 }, { w: 30, r: 12 }, { w: 30, r: 12 }] },
    ] },
    { daysAgo: 24, planName: '推拉腿 PPL', dayName: '腿 Legs', exercises: [
      { id: 'squat', name: '深蹲', sets: [{ w: 85, r: 6 }, { w: 85, r: 6 }, { w: 85, r: 6 }, { w: 85, r: 6 }] },
      { id: 'romanian-deadlift', name: '羅馬尼亞硬舉', sets: [{ w: 60, r: 8 }, { w: 60, r: 8 }, { w: 60, r: 8 }] },
    ] },
    { daysAgo: 21, planName: '推拉腿 PPL', dayName: '推 Push', exercises: [
      { id: 'bench-press', name: '臥推', sets: [{ w: 57.5, r: 6 }, { w: 57.5, r: 6 }, { w: 57.5, r: 6 }, { w: 57.5, r: 6 }] },
      { id: 'overhead-press', name: '肩推', sets: [{ w: 37.5, r: 8 }, { w: 37.5, r: 8 }, { w: 37.5, r: 8 }] },
    ] },
    { daysAgo: 19, planName: '推拉腿 PPL', dayName: '拉 Pull', exercises: [
      { id: 'deadlift', name: '硬舉', sets: [{ w: 85, r: 5 }, { w: 85, r: 5 }, { w: 85, r: 5 }] },
      { id: 'barbell-row', name: '槓鈴划船', sets: [{ w: 57.5, r: 8 }, { w: 57.5, r: 8 }, { w: 57.5, r: 8 }, { w: 57.5, r: 8 }] },
    ] },
    { daysAgo: 17, planName: '推拉腿 PPL', dayName: '腿 Legs', exercises: [
      { id: 'squat', name: '深蹲', sets: [{ w: 87.5, r: 6 }, { w: 87.5, r: 6 }, { w: 87.5, r: 6 }, { w: 87.5, r: 6 }] },
      { id: 'leg-press', name: '腿推', sets: [{ w: 140, r: 12 }, { w: 140, r: 12 }, { w: 140, r: 12 }] },
    ] },
    { daysAgo: 14, planName: '推拉腿 PPL', dayName: '推 Push', exercises: [
      { id: 'bench-press', name: '臥推', sets: [{ w: 60, r: 6 }, { w: 60, r: 6 }, { w: 60, r: 6 }, { w: 60, r: 6 }] },
      { id: 'overhead-press', name: '肩推', sets: [{ w: 40, r: 8 }, { w: 40, r: 8 }, { w: 40, r: 8 }] },
    ] },
    { daysAgo: 12, planName: '推拉腿 PPL', dayName: '拉 Pull', exercises: [
      { id: 'deadlift', name: '硬舉', sets: [{ w: 90, r: 5 }, { w: 90, r: 5 }, { w: 90, r: 5 }] },
      { id: 'barbell-row', name: '槓鈴划船', sets: [{ w: 60, r: 8 }, { w: 60, r: 8 }, { w: 60, r: 8 }, { w: 60, r: 8 }] },
    ] },
    { daysAgo: 10, planName: '推拉腿 PPL', dayName: '腿 Legs', exercises: [
      { id: 'squat', name: '深蹲', sets: [{ w: 90, r: 6 }, { w: 90, r: 6 }, { w: 90, r: 6 }, { w: 90, r: 6 }] },
      { id: 'romanian-deadlift', name: '羅馬尼亞硬舉', sets: [{ w: 65, r: 8 }, { w: 65, r: 8 }, { w: 65, r: 8 }] },
    ] },
    { daysAgo: 7, planName: '推拉腿 PPL', dayName: '推 Push', exercises: [
      { id: 'bench-press', name: '臥推', sets: [{ w: 62.5, r: 6 }, { w: 62.5, r: 6 }, { w: 62.5, r: 6 }, { w: 62.5, r: 6 }] },
      { id: 'overhead-press', name: '肩推', sets: [{ w: 42.5, r: 8 }, { w: 42.5, r: 8 }, { w: 42.5, r: 8 }] },
    ] },
    { daysAgo: 5, planName: '推拉腿 PPL', dayName: '拉 Pull', exercises: [
      { id: 'deadlift', name: '硬舉', sets: [{ w: 95, r: 5 }, { w: 95, r: 5 }, { w: 95, r: 5 }] },
      { id: 'barbell-row', name: '槓鈴划船', sets: [{ w: 62.5, r: 8 }, { w: 62.5, r: 8 }, { w: 62.5, r: 8 }, { w: 62.5, r: 8 }] },
    ] },
    { daysAgo: 3, planName: '推拉腿 PPL', dayName: '腿 Legs', exercises: [
      { id: 'squat', name: '深蹲', sets: [{ w: 92.5, r: 6 }, { w: 92.5, r: 6 }, { w: 92.5, r: 6 }, { w: 92.5, r: 6 }] },
      { id: 'leg-press', name: '腿推', sets: [{ w: 150, r: 12 }, { w: 150, r: 12 }, { w: 150, r: 12 }] },
    ] },
    { daysAgo: 1, planName: '推拉腿 PPL', dayName: '推 Push', exercises: [
      { id: 'bench-press', name: '臥推', sets: [{ w: 65, r: 6 }, { w: 65, r: 6 }, { w: 65, r: 6 }, { w: 65, r: 6 }] },
      { id: 'overhead-press', name: '肩推', sets: [{ w: 45, r: 8 }, { w: 45, r: 8 }, { w: 45, r: 8 }] },
      { id: 'tricep-pushdown', name: '三頭下壓', sets: [{ w: 30, r: 12 }, { w: 30, r: 12 }, { w: 30, r: 12 }, { w: 30, r: 12 }] },
    ] },
  ];

  for (const sw of sampleWorkouts) {
    const date = new Date(now - sw.daysAgo * day).toISOString();
    const exercises: ExerciseLog[] = sw.exercises.map((ex) => {
      const sets: SetLog[] = ex.sets.map((s, i) => ({
        id: generateId('set'),
        setNumber: i + 1,
        weight: s.w,
        reps: s.r,
        completed: true,
      }));
      return {
        id: generateId('ex'),
        exerciseId: ex.id,
        name: ex.name,
        sets,
      };
    });
    const session: WorkoutSession = {
      id: generateId('session'),
      date,
      planName: sw.planName,
      dayName: sw.dayName,
      duration: 3000 + Math.floor(Math.random() * 1200),
      totalVolume: 0,
      exercises,
    };
    session.totalVolume = calculateTotalVolume(session);
    sessions.push(session);
  }

  return sessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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

const sampleSessions = buildSampleHistory();
const samplePRs = computePRsFromSessions(sampleSessions);

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      sessions: sampleSessions,
      activeSession: null,
      personalRecords: samplePRs,

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
      // 不持久化 activeSession
      partialize: (state) => ({
        sessions: state.sessions,
        personalRecords: state.personalRecords,
      }),
    }
  )
);
