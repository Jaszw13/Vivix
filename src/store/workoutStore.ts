import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  WorkoutSession,
  ExerciseLog,
  SetLog,
  PersonalRecord,
  PlannedExercise,
  PlanDay,
  MuscleGroup,
  EquipmentType,
  GroupStats,
  Exercise,
} from '@/types';
import { DEFAULT_MEDIA, resolveEquipmentType } from '@/types';
import {
  generateId,
  calculateTotalVolume,
  getSessionPRs,
  createExerciseLog as _createExerciseLog,
  estimate1RM,
} from '@/utils/workout';
import { getPlanById } from '@/data/plans';
import {
  exercises as builtinExercises,
  getExerciseById,
  patchExerciseWithClassifications,
} from '@/data/exercises';

// ============ 自訂動作 v2（完整分類） ============
// 與 Exercise 同結構，強制 isCustom: true。
// 未分類的遺留自訂動作暫存 muscleGroup='uncategorized' 顯示提示。
export type CustomExercise = Exercise & { isCustom: true };

/** 舊版自訂動作（僅 id/name/createdAt，migrate 用） */
interface LegacyCustomExercise {
  id: string;
  name: string;
  createdAt: string;
}

/**
 * @deprecated 僅作為舊 UI 調用的兼容介面；已更名為 CustomExercise。
 */
export type OldCustomExerciseShape = LegacyCustomExercise;

// ============ 工具：建立分類齊全的自訂動作 ============
function createCustomExerciseV2(
  name: string,
  muscleGroup: MuscleGroup,
  equipmentType: EquipmentType,
  extras: Partial<CustomExercise> = {}
): CustomExercise {
  const id = extras.id ?? generateId('custom');
  return {
    id,
    name: name.trim(),
    muscleGroup,
    category: muscleGroup,
    secondaryGroups: extras.secondaryGroups,
    equipmentType,
    equipmentId: extras.equipmentId,
    muscleGroupDesc: extras.muscleGroupDesc,
    equipmentDesc: extras.equipmentDesc,
    equipment: extras.equipment,
    isCustom: true,
    steps: extras.steps ?? extras.instructions,
    instructions: extras.instructions ?? extras.steps,
    tips: extras.tips,
    media: extras.media ?? { ...DEFAULT_MEDIA },
    createdAt: extras.createdAt ?? new Date().toISOString(),
  };
}

/**
 * 舊版未分類自訂動作 → v2。
 * 此版本遷移為 muscleGroup='chest'（隨便一個合法值，UI 會提示補分類），
 * 並標註 equipmentType='other'，避免 undefined 流入統計。
 */
function migrateLegacyCustomExercise(leg: LegacyCustomExercise): CustomExercise {
  return createCustomExerciseV2(leg.name, 'chest', 'other', {
    id: leg.id,
    createdAt: leg.createdAt,
    muscleGroupDesc: '尚未分類，請至動作庫補填部位',
    equipmentDesc: '尚未分類',
  });
}

// ============ Derive 輔助：取得動作的部位 / 器械快照 ============
function resolveExerciseSnapshot(exerciseId: string, fallbackName?: string) {
  const builtin = getExerciseById(exerciseId);
  if (builtin) {
    return {
      muscleGroup: builtin.muscleGroup as MuscleGroup,
      equipmentType: builtin.equipmentType,
      name: builtin.name,
    };
  }
  // 查不到就留空，migrate 時會以其他管道補
  return {
    muscleGroup: undefined as MuscleGroup | undefined,
    equipmentType: undefined as EquipmentType | undefined,
    name: fallbackName ?? '動作',
  };
}

// ============ Store 介面 ============
interface WorkoutState {
  sessions: WorkoutSession[];
  activeSession: WorkoutSession | null;
  personalRecords: PersonalRecord[];
  customExercises: CustomExercise[];
  activePlanId: string | null;
  nextDayIndex: number;

  // 動作 / 計畫
  setActivePlan: (planId: string) => void;
  incrementDayIndex: () => void;
  startSession: (planId: string, planName: string, day: PlanDay) => void;
  startEmptySession: () => void;
  addExerciseToActive: (pe: PlannedExercise) => void;
  /** @deprecated 改用 addCustomExerciseV2（強制分類）。舊方法僅保留兼容，會走默認 chest/other */
  addCustomExercise: (name: string) => CustomExercise;
  addCustomExerciseV2: (args: {
    name: string;
    muscleGroup: MuscleGroup;
    equipmentType: EquipmentType;
    steps?: string[];
    tips?: string[];
  }) => CustomExercise;
  editCustomExercise: (
    id: string,
    patch: Partial<Pick<CustomExercise, 'name' | 'muscleGroup' | 'equipmentType' | 'steps' | 'tips' | 'muscleGroupDesc' | 'equipmentDesc' | 'secondaryGroups'>>
  ) => void;
  deleteCustomExercise: (id: string) => void;

  // 訓練中替換動作（T-04 基礎）
  substituteExerciseInActive: (
    exerciseLogId: string,
    nextExerciseId: string
  ) => void;

  toggleWarmupCompleted: (warmupId: string) => void;
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
  getExerciseProgress: (
    exerciseId: string
  ) => { date: string; maxWeight: number; estimated1RM: number }[];
  getWeeklyVolume: () => { week: string; volume: number }[];
  getLastSetsForExercise: (exerciseId: string) => SetLog[] | null;

  // 分部位統計（T-02 用）
  getGroupStats: () => Record<MuscleGroup, GroupStats>;
  getGroupWeeklyVolume: (group: MuscleGroup) => { week: string; volume: number }[];
  getGroupExerciseProgress: (
    group: MuscleGroup
  ) => { date: string; normalized1RM: number; exercises: number }[];
  /** 列出未完成至少 1 次有效訓練的部位（報告用） */
  getUnderTrainedGroups: () => MuscleGroup[];
}

// ============ PR 從 sessions rebuild ============
function computePRsFromSessions(sessions: WorkoutSession[]): PersonalRecord[] {
  const map = new Map<string, PersonalRecord>();
  for (const session of sessions) {
    const sessionPRs = getSessionPRs(session);
    for (const pr of sessionPRs) {
      // 嘗試補齊 muscleGroup / equipmentType（若 session 中沒快照）
      const snap = resolveExerciseSnapshot(pr.exerciseId, pr.exerciseName);
      const existing = map.get(pr.exerciseId);
      if (!existing || pr.estimated1RM > existing.estimated1RM) {
        map.set(pr.exerciseId, {
          ...pr,
          muscleGroup: (pr as any).muscleGroup ?? snap.muscleGroup,
          equipmentType: (pr as any).equipmentType ?? snap.equipmentType,
        });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.estimated1RM - a.estimated1RM);
}

// ============ 初始化空分部位統計骨架 ============
function emptyGroupStatsMap(): Record<MuscleGroup, GroupStats> {
  const groups: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];
  const out = {} as Record<MuscleGroup, GroupStats>;
  for (const g of groups) {
    out[g] = {
      muscleGroup: g,
      workoutCount: 0,
      totalVolumeKg: 0,
      prCount: 0,
      exerciseVariety: 0,
    };
  }
  return out;
}

// ============ Store 實作 ============
export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSession: null,
      personalRecords: [],
      customExercises: [],
      activePlanId: null,
      nextDayIndex: 0,

      setActivePlan: (planId) => {
        set({ activePlanId: planId, nextDayIndex: 0 });
      },

      incrementDayIndex: () => {
        const { activePlanId, nextDayIndex } = get();
        if (!activePlanId) return;
        const plan = getPlanById(activePlanId);
        if (!plan) return;
        set({ nextDayIndex: (nextDayIndex + 1) % plan.days.length });
      },

      startSession: (planId, planName, day) => {
        const exercises: ExerciseLog[] = day.exercises.map((pe) => {
          const snap = resolveExerciseSnapshot(pe.exerciseId, pe.name);
          const log = _createExerciseLog(
            pe.exerciseId,
            pe.snapshot?.name ?? pe.name,
            pe.targetSets,
            pe.targetWeight
          );
          return {
            ...log,
            muscleGroup: pe.snapshot?.muscleGroup ?? snap.muscleGroup,
            equipmentType: pe.snapshot?.equipmentType ?? snap.equipmentType,
          };
        });
        const session: WorkoutSession = {
          id: generateId('session'),
          date: new Date().toISOString(),
          planId,
          planName,
          dayId: day.id,
          dayName: day.dayName,
          warmupCompletedIds: [],
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
          warmupCompletedIds: [],
          duration: 0,
          totalVolume: 0,
          exercises: [],
        };
        set({ activeSession: session });
      },

      toggleWarmupCompleted: (warmupId) => {
        const active = get().activeSession;
        if (!active) return;
        const done = active.warmupCompletedIds.includes(warmupId);
        set({
          activeSession: {
            ...active,
            warmupCompletedIds: done
              ? active.warmupCompletedIds.filter((x) => x !== warmupId)
              : [...active.warmupCompletedIds, warmupId],
          },
        });
      },

      addExerciseToActive: (pe) => {
        const active = get().activeSession;
        if (!active) return;
        const snap = resolveExerciseSnapshot(pe.exerciseId, pe.name);
        const newEx = _createExerciseLog(
          pe.exerciseId,
          pe.snapshot?.name ?? pe.name,
          pe.targetSets || 3,
          pe.targetWeight
        );
        newEx.muscleGroup = pe.snapshot?.muscleGroup ?? snap.muscleGroup;
        newEx.equipmentType = pe.snapshot?.equipmentType ?? snap.equipmentType;
        set({
          activeSession: {
            ...active,
            exercises: [...active.exercises, newEx],
          },
        });
      },

      addCustomExercise: (name) => {
        // 舊介面兼容：隨便填 chest/other 先通過 schema
        const custom = createCustomExerciseV2(name, 'chest', 'other');
        set({ customExercises: [...get().customExercises, custom] });
        return custom;
      },

      addCustomExerciseV2: ({ name, muscleGroup, equipmentType, steps, tips }) => {
        const custom = createCustomExerciseV2(name, muscleGroup, equipmentType, {
          steps,
          tips,
        });
        set({ customExercises: [...get().customExercises, custom] });
        return custom;
      },

      editCustomExercise: (id, patch) => {
        set((state) => ({
          customExercises: state.customExercises.map((ce) => {
            if (ce.id !== id) return ce;
            const next: CustomExercise = { ...ce, ...patch };
            // 若 muscleGroup 有變，同步 category 保持一致
            if (patch.muscleGroup) next.category = patch.muscleGroup;
            return next;
          }),
        }));
      },

      deleteCustomExercise: (id) => {
        // 僅從動作庫移除，已存在的 sessions/plans snapshot 保留不動（符合 §7 邊界處理）
        set((state) => ({
          customExercises: state.customExercises.filter((ce) => ce.id !== id),
        }));
      },

      substituteExerciseInActive: (exerciseLogId, nextExerciseId) => {
        const active = get().activeSession;
        if (!active) return;
        // 取得所有動作（內建 + 自訂）
        const allExercises = [...builtinExercises, ...get().customExercises];
        const next = allExercises.find((e) => e.id === nextExerciseId);
        if (!next) return;
        const exercises = active.exercises.map((ex) => {
          if (ex.id !== exerciseLogId) return ex;
          // 保留舊組數/次數模板（用戶可再編輯）
          return {
            ...ex,
            exerciseId: next.id,
            name: next.name,
            muscleGroup: next.muscleGroup,
            equipmentType: next.equipmentType,
            substitutedFrom: ex.exerciseId, // 記錄從哪個動作替換而來
          } as ExerciseLog;
        });
        set({ activeSession: { ...active, exercises } });
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
        // 重建 PR（並補部位/器械快照）
        const newPRs = computePRsFromSessions(newSessions);
        const state = get();
        let nextIndex = state.nextDayIndex;
        if (active.planId && state.activePlanId === active.planId) {
          const plan = getPlanById(active.planId);
          if (plan) nextIndex = (state.nextDayIndex + 1) % plan.days.length;
        }
        set({
          sessions: newSessions,
          personalRecords: newPRs,
          activeSession: null,
          nextDayIndex: nextIndex,
        });
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

      getLastSetsForExercise: (exerciseId) => {
        const sessions = get().sessions;
        const sorted = [...sessions].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        for (const session of sorted) {
          const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
          if (ex) {
            const completedSets = ex.sets.filter((s) => s.completed);
            if (completedSets.length > 0) return completedSets;
            return ex.sets.length > 0 ? ex.sets : null;
          }
        }
        return null;
      },

      // ============ 分部位統計（T-02） ============
      getGroupStats: () => {
        const sessions = get().sessions;
        const prs = get().personalRecords;
        const out = emptyGroupStatsMap();

        // 每個部位的 unique 訓練日期 set 與 unique 動作 set
        const trainDatesByGroup: Record<MuscleGroup, Set<string>> = {
          chest: new Set(), back: new Set(), legs: new Set(),
          shoulders: new Set(), arms: new Set(), core: new Set(),
        };
        const varietyByGroup: Record<MuscleGroup, Set<string>> = {
          chest: new Set(), back: new Set(), legs: new Set(),
          shoulders: new Set(), arms: new Set(), core: new Set(),
        };
        const lastTrainedByGroup: Record<MuscleGroup, number> = {
          chest: 0, back: 0, legs: 0, shoulders: 0, arms: 0, core: 0,
        };

        for (const session of sessions) {
          const dateKey = new Date(session.date).toDateString();
          const ts = new Date(session.date).getTime();
          for (const ex of session.exercises) {
            const group = (ex.muscleGroup as MuscleGroup | undefined) ??
              resolveExerciseSnapshot(ex.exerciseId, ex.name).muscleGroup;
            if (!group) continue;
            const completed = ex.sets.filter((s) => s.completed);
            if (completed.length === 0) continue;
            const vol = completed.reduce((s, x) => s + x.weight * x.reps, 0);
            out[group].totalVolumeKg += vol;
            trainDatesByGroup[group].add(dateKey);
            varietyByGroup[group].add(ex.exerciseId);
            if (ts > lastTrainedByGroup[group]) lastTrainedByGroup[group] = ts;
          }
        }

        // PR 按部位計數（PR 可能來自舊無快照紀錄，此處補齊）
        const prCountByGroup: Record<MuscleGroup, number> = {
          chest: 0, back: 0, legs: 0, shoulders: 0, arms: 0, core: 0,
        };
        for (const pr of prs) {
          const g = (pr.muscleGroup as MuscleGroup | undefined) ??
            resolveExerciseSnapshot(pr.exerciseId, pr.exerciseName).muscleGroup;
          if (g) prCountByGroup[g]++;
        }

        const groups: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];
        for (const g of groups) {
          out[g].workoutCount = trainDatesByGroup[g].size;
          out[g].exerciseVariety = varietyByGroup[g].size;
          out[g].prCount = prCountByGroup[g];
          out[g].lastTrainedAt = lastTrainedByGroup[g] > 0
            ? new Date(lastTrainedByGroup[g]).toISOString()
            : undefined;
        }
        return out;
      },

      getGroupWeeklyVolume: (group) => {
        const sessions = get().sessions;
        const weeklyMap = new Map<string, number>();
        for (const s of sessions) {
          const d = new Date(s.date);
          const day = d.getDay();
          const diff = day === 0 ? 6 : day - 1;
          const monday = new Date(d);
          monday.setDate(d.getDate() - diff);
          const key = `${monday.getMonth() + 1}/${monday.getDate()}`;
          let weekVol = 0;
          for (const ex of s.exercises) {
            const g = (ex.muscleGroup as MuscleGroup | undefined) ??
              resolveExerciseSnapshot(ex.exerciseId, ex.name).muscleGroup;
            if (g !== group) continue;
            weekVol += ex.sets
              .filter((x) => x.completed)
              .reduce((sum, x) => sum + x.weight * x.reps, 0);
          }
          if (weekVol > 0) {
            weeklyMap.set(key, (weeklyMap.get(key) ?? 0) + weekVol);
          }
        }
        return Array.from(weeklyMap.entries())
          .map(([week, volume]) => ({ week, volume: Math.round(volume / 1000) }))
          .slice(-8);
      },

      getGroupExerciseProgress: (group) => {
        const sessions = get().sessions;
        const points: { date: string; normalized1RM: number; exercises: number }[] = [];
        for (const s of sessions) {
          const exs = s.exercises.filter((ex) => {
            const g = (ex.muscleGroup as MuscleGroup | undefined) ??
              resolveExerciseSnapshot(ex.exerciseId, ex.name).muscleGroup;
            return g === group && ex.sets.some((set) => set.completed);
          });
          if (exs.length === 0) continue;
          let total1RM = 0;
          for (const ex of exs) {
            const completed = ex.sets.filter((set) => set.completed);
            const best = completed.reduce((m, set) =>
              estimate1RM(set.weight, set.reps) > estimate1RM(m.weight, m.reps) ? set : m
            );
            total1RM += estimate1RM(best.weight, best.reps);
          }
          points.push({
            date: s.date,
            normalized1RM: Math.round(total1RM / exs.length),
            exercises: exs.length,
          });
        }
        return points;
      },

      getUnderTrainedGroups: () => {
        const stats = get().getGroupStats();
        const groups: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];
        // 至少有 1 次訓練的部位視為已接觸；否則偏低
        // 另：最近 14 天沒碰且 volume 偏低者也標示
        const now = Date.now();
        const FOURTEEN_DAYS = 14 * 86400000;
        return groups.filter((g) => {
          const s = stats[g];
          if (s.workoutCount === 0) return true;
          if (s.lastTrainedAt && now - new Date(s.lastTrainedAt).getTime() > FOURTEEN_DAYS) {
            return true;
          }
          return false;
        });
      },
    }),
    {
      name: 'ironpulse-workouts',
      version: 5,
      partialize: (state) => ({
        sessions: state.sessions,
        personalRecords: state.personalRecords,
        customExercises: state.customExercises,
        activePlanId: state.activePlanId,
        nextDayIndex: state.nextDayIndex,
      }),
      migrate: (persistedState, version) => {
        const raw = (persistedState ?? {}) as any;
        const sessions = Array.isArray(raw.sessions) ? raw.sessions : [];
        const personalRecords = Array.isArray(raw.personalRecords) ? raw.personalRecords : [];

        // v5：CustomExercise 升級為強制分類結構
        let customExercises: CustomExercise[] = [];
        const incomingCustom: any[] = Array.isArray(raw.customExercises) ? raw.customExercises : [];
        for (const item of incomingCustom) {
          // 舊版只有 id/name/createdAt（LegacyCustomExercise）
          const isLegacy =
            typeof item === 'object' &&
            item !== null &&
            typeof item.id === 'string' &&
            typeof item.name === 'string' &&
            typeof item.muscleGroup !== 'string'; // 舊版無 muscleGroup
          if (isLegacy) {
            customExercises.push(migrateLegacyCustomExercise(item as LegacyCustomExercise));
          } else if (typeof item === 'object' && item !== null) {
            // v2 已有分類（或部分分類）：走 patchExerciseWithClassifications 補齊
            try {
              const patched = patchExerciseWithClassifications(item);
              customExercises.push({ ...patched, isCustom: true });
            } catch {
              // 損壞條目：建立最小可用條目
              customExercises.push(
                createCustomExerciseV2(item.name ?? '遺失名稱動作', 'chest', 'other', {
                  id: item.id ?? generateId('custom'),
                  createdAt: item.createdAt,
                })
              );
            }
          }
        }

        return {
          sessions,
          personalRecords,
          customExercises,
          activePlanId: typeof raw.activePlanId === 'string' ? raw.activePlanId : null,
          nextDayIndex: typeof raw.nextDayIndex === 'number' ? raw.nextDayIndex : 0,
        };
      },
    }
  )
);

// 彙出 helper：取所有動作（內建 + 自訂），供 UI/替換選單使用
export function getAllExercises(): Exercise[] {
  return [
    ...builtinExercises,
    ...useWorkoutStore.getState().customExercises,
  ];
}
