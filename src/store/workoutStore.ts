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
  LiftFamily,
} from '@/types';
import { DEFAULT_MEDIA, resolveEquipmentType } from '@/types';
import {
  generateId,
  calculateTotalVolume,
  getSessionPRs,
  createExerciseLog as _createExerciseLog,
  estimate1RM,
} from '@/utils/workout';
import { FOURTEEN_DAYS_MS } from '@/utils/time';
import { getStreakDays as getStreakDaysSelector } from '@/features/stats/selectors';
import { useCardioStore } from '@/store/cardioStore';
import { getPlanById } from '@/data/plans';
import {
  exercises as builtinExercises,
  getExerciseById,
  patchExerciseWithClassifications,
} from '@/data/exercises';
// C1：分類權威模組 — workoutStore re-export 保持 import 兼容
import {
  resolveCurrentTaxonomy,
  resolveExerciseSnapshot,
  getAllExercisesWith,
  findExerciseById,
} from '@/features/exercises/taxonomy';
export { resolveCurrentTaxonomy, resolveExerciseSnapshot, findExerciseById };

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
    /** N-5：自訂動作可指定力量家族 */
    liftFamily: extras.liftFamily,
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

// ============ P-01：分類回寫 — 當前分類優先 ============
// 權威實作已移至 @/features/exercises/taxonomy（C1）；此處 re-export 保持兼容。
// resolveCurrentTaxonomy / resolveExerciseSnapshot 由上方 import re-export。

// ============ Store 介面 ============
interface WorkoutState {
  sessions: WorkoutSession[];
  activeSession: WorkoutSession | null;
  personalRecords: PersonalRecord[];
  customExercises: CustomExercise[];
  activePlanId: string | null;
  nextDayIndex: number;
  /** P-01：分類版本號，每次 editCustomExercise 改 muscleGroup/equipmentType 時 +1，用於 cache key */
  taxonomyVersion: number;

  // 動作 / 計畫
  setActivePlan: (planId: string) => void;
  incrementDayIndex: () => void;
  startSession: (planId: string, planName: string, day: PlanDay) => void;
  startEmptySession: () => void;
  addExerciseToActive: (pe: PlannedExercise) => void;
  addCustomExerciseV2: (args: {
    name: string;
    muscleGroup: MuscleGroup;
    equipmentType: EquipmentType;
    steps?: string[];
    tips?: string[];
    /** N-5：選填力量家族，指定後正確歸入力量軌成就 */
    liftFamily?: LiftFamily;
  }) => CustomExercise;
  editCustomExercise: (
    id: string,
    patch: Partial<Pick<CustomExercise, 'name' | 'muscleGroup' | 'equipmentType' | 'steps' | 'tips' | 'muscleGroupDesc' | 'equipmentDesc' | 'secondaryGroups' | 'liftFamily'>>
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

  // 匯入（Errata E12：單次 set() 批次寫入，不觸發 finishSession 路徑）
  importSessionsBatch: (incoming: WorkoutSession[]) => void;
  /** 刪除指定 session（匯入 session 刪除後進度 live 下降；成就永久保留 D2） */
  deleteSession: (sessionId: string) => void;

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

// ============ PR 從 sessions rebuild（P-01：優先讀取當前分類） ============
function computePRsFromSessions(
  sessions: WorkoutSession[],
  customExercises: CustomExercise[] = [],
): PersonalRecord[] {
  const map = new Map<string, PersonalRecord>();
  for (const session of sessions) {
    const sessionPRs = getSessionPRs(session);
    for (const pr of sessionPRs) {
      // P-01：優先使用當前 exercise 定義的分類，snapshot 僅兜底
      const cur = resolveCurrentTaxonomy(pr.exerciseId, customExercises, {
        muscleGroup: pr.muscleGroup,
        equipmentType: pr.equipmentType,
        name: pr.exerciseName,
      });
      const existing = map.get(pr.exerciseId);
      if (!existing || pr.estimated1RM > existing.estimated1RM) {
        map.set(pr.exerciseId, {
          ...pr,
          muscleGroup: cur.muscleGroup,
          equipmentType: cur.equipmentType,
          liftFamily: cur.liftFamily,
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
      taxonomyVersion: 0,

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
        const { customExercises } = get();
        const exercises: ExerciseLog[] = day.exercises.map((pe) => {
          // S-02 修復：用 resolveCurrentTaxonomy（builtin+custom）取代 builtin-only 的 resolveExerciseSnapshot
          // 優先級：當前定義 > snapshot 兜底，確保 custom-xxx session 建立時取得正確 name/muscleGroup/equipmentType
          const tax = resolveCurrentTaxonomy(
            pe.exerciseId,
            customExercises,
            {
              muscleGroup: pe.snapshot?.muscleGroup,
              equipmentType: pe.snapshot?.equipmentType,
              name: pe.snapshot?.name ?? pe.name,
            },
          );
          const log = _createExerciseLog(
            pe.exerciseId,
            tax.name,
            pe.targetSets,
            pe.targetWeight
          );
          return {
            ...log,
            muscleGroup: tax.muscleGroup ?? pe.snapshot?.muscleGroup,
            equipmentType: tax.equipmentType ?? pe.snapshot?.equipmentType,
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
          startedAt: new Date().toISOString(),
          finishedAt: null,
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
          startedAt: new Date().toISOString(),
          finishedAt: null,
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
        // S-02 修復：resolveCurrentTaxonomy（builtin+custom），同步 startSession 的解析策略
        const tax = resolveCurrentTaxonomy(
          pe.exerciseId,
          get().customExercises,
          {
            muscleGroup: pe.snapshot?.muscleGroup,
            equipmentType: pe.snapshot?.equipmentType,
            name: pe.snapshot?.name ?? pe.name,
          },
        );
        const newEx = _createExerciseLog(
          pe.exerciseId,
          tax.name,
          pe.targetSets || 3,
          pe.targetWeight
        );
        newEx.muscleGroup = tax.muscleGroup ?? pe.snapshot?.muscleGroup;
        newEx.equipmentType = tax.equipmentType ?? pe.snapshot?.equipmentType;
        set({
          activeSession: {
            ...active,
            exercises: [...active.exercises, newEx],
          },
        });
      },

      addCustomExerciseV2: ({ name, muscleGroup, equipmentType, steps, tips, liftFamily }) => {
        const custom = createCustomExerciseV2(name, muscleGroup, equipmentType, {
          steps,
          tips,
          liftFamily,
        });
        set({ customExercises: [...get().customExercises, custom] });
        return custom;
      },

      editCustomExercise: (id, patch) => {
        set((state) => {
          const ce = state.customExercises.find((e) => e.id === id);
          const classificationChanged = ce && (
            (patch.muscleGroup && patch.muscleGroup !== ce.muscleGroup) ||
            (patch.equipmentType && patch.equipmentType !== ce.equipmentType)
          );
          return {
            customExercises: state.customExercises.map((ce) => {
              if (ce.id !== id) return ce;
              const next: CustomExercise = { ...ce, ...patch };
              if (patch.muscleGroup) next.category = patch.muscleGroup;
              return next;
            }),
            // P-01：分類變更 → bump taxonomyVersion，觸發所有派生 selector 重算
            // C4：personalRecords 由 subscribe 自動派生
            taxonomyVersion: classificationChanged
              ? state.taxonomyVersion + 1
              : state.taxonomyVersion,
          };
        });
      },

      deleteCustomExercise: (id) => {
        // 僅從動作庫移除，已存在的 sessions/plans snapshot 保留不動（符合 §7 邊界處理）
        // C4：personalRecords 由 subscribe 自動派生（已刪動作的 PR 透過 snapshot fallback 保留）
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
        const now = new Date().toISOString();
        const startedAt = active.startedAt ?? now;
        const durationSec = Math.max(0, Math.floor((new Date(now).getTime() - new Date(startedAt).getTime()) / 1000));
        const finished: WorkoutSession = {
          ...active,
          startedAt,
          finishedAt: now,
          duration: durationSec > 0 ? durationSec : active.duration,
          totalVolume: calculateTotalVolume(active),
        };
        const newSessions = [...get().sessions, finished].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        const state = get();
        let nextIndex = state.nextDayIndex;
        if (active.planId && state.activePlanId === active.planId) {
          const plan = getPlanById(active.planId);
          if (plan) nextIndex = (state.nextDayIndex + 1) % plan.days.length;
        }
        // C4：不再寫 personalRecords；由底部 subscribe 自動派生（sessions 變化 → 重算 PR）
        set({
          sessions: newSessions,
          activeSession: null,
          nextDayIndex: nextIndex,
        });
        return finished;
      },

      clearActiveSession: () => set({ activeSession: null }),

      // I-2 / Errata E12：匯入 session 單次 set() 批次寫入；不 finishSession、不排序 caller 決定
      importSessionsBatch: (incoming) => {
        if (!incoming || incoming.length === 0) return;
        set((s) => ({
          sessions: [...s.sessions, ...incoming],
        }));
      },

      deleteSession: (sessionId) => {
        set((s) => ({
          sessions: s.sessions.filter((sess) => sess.id !== sessionId),
        }));
      },

      getTotalSessions: () => get().sessions.length,

      getTotalVolume: () =>
        Math.round(
          get().sessions.reduce((sum, s) => sum + s.totalVolume, 0) / 1000
        ),

      // C3：統一走 selectors 權威（避免 inline 重算）；E-D3：streak = 力量日 ∪ 有氧日
      getStreakDays: () => getStreakDaysSelector(get().sessions, useCardioStore.getState().sessions),

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
        const customExs = get().customExercises;
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
            // P-01：優先讀取當前 exercise 定義的分類，snapshot 僅兜底
            const cur = resolveCurrentTaxonomy(ex.exerciseId, customExs, {
              muscleGroup: ex.muscleGroup as MuscleGroup | undefined,
              equipmentType: ex.equipmentType,
              name: ex.name,
            });
            const group = cur.muscleGroup;
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
          // P-01：PR 分類也跟隨當前 taxonomy
          const cur = resolveCurrentTaxonomy(pr.exerciseId, customExs, {
            muscleGroup: pr.muscleGroup as MuscleGroup | undefined,
            equipmentType: pr.equipmentType,
            name: pr.exerciseName,
          });
          if (cur.muscleGroup) prCountByGroup[cur.muscleGroup]++;
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
        const customExs = get().customExercises;
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
            // P-01：使用當前分類
            const cur = resolveCurrentTaxonomy(ex.exerciseId, customExs, {
              muscleGroup: ex.muscleGroup as MuscleGroup | undefined,
            });
            if (cur.muscleGroup !== group) continue;
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
        const customExs = get().customExercises;
        const points: { date: string; normalized1RM: number; exercises: number }[] = [];
        for (const s of sessions) {
          const exs = s.exercises.filter((ex) => {
            // P-01：使用當前分類
            const cur = resolveCurrentTaxonomy(ex.exerciseId, customExs, {
              muscleGroup: ex.muscleGroup as MuscleGroup | undefined,
            });
            return cur.muscleGroup === group && ex.sets.some((set) => set.completed);
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
        return groups.filter((g) => {
          const s = stats[g];
          if (s.workoutCount === 0) return true;
          if (s.lastTrainedAt && now - new Date(s.lastTrainedAt).getTime() > FOURTEEN_DAYS_MS) {
            return true;
          }
          return false;
        });
      },
    }),
    {
      name: 'ironpulse-workouts',
      version: 8,
      partialize: (state) => ({
        sessions: state.sessions,
        customExercises: state.customExercises,
        activePlanId: state.activePlanId,
        nextDayIndex: state.nextDayIndex,
        taxonomyVersion: state.taxonomyVersion,
        // C4 / L1：personalRecords 為衍生資料，不 persist；讀取時由 sessions + customExercises 派生
      }),
      // ⚠️ 容錯兜底：LocalStorage 損壞時優雅重置為預設值，唔會白屏崩潰
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('[workoutStore] Zustand hydration failed, falling back to defaults', error);
            try {
              localStorage.removeItem('ironpulse-workouts');
            } catch {}
          }
        };
      },
      migrate: (persistedState, version) => {
        const raw = (persistedState ?? {}) as Record<string, unknown>;
        const sessionsIn: unknown = Array.isArray(raw.sessions) ? raw.sessions : [];
        // C4：忽略舊 persist 的 personalRecords（v6 之前有寫），改由 sessions 派生
        // E-01 v8：為舊 session 補 startedAt/finishedAt = null（體重為 null 時熱量會 fallback 到 set 數公式）
        const safeSessions: WorkoutSession[] = (sessionsIn as WorkoutSession[]).map((s) => ({
          ...s,
          startedAt: typeof s.startedAt === 'string' ? s.startedAt : null,
          finishedAt: typeof s.finishedAt === 'string' ? s.finishedAt : null,
        }));

        // v5：CustomExercise 升級為強制分類結構
        let customExercises: CustomExercise[] = [];
        const incomingCustom: unknown[] = Array.isArray(raw.customExercises) ? raw.customExercises : [];
        for (const item of incomingCustom) {
          if (typeof item !== 'object' || item === null) continue;
          const obj = item as Record<string, unknown>;
          // 舊版只有 id/name/createdAt（LegacyCustomExercise）
          const isLegacy =
            typeof obj.id === 'string' &&
            typeof obj.name === 'string' &&
            typeof obj.muscleGroup !== 'string'; // 舊版無 muscleGroup
          if (isLegacy) {
            customExercises.push(migrateLegacyCustomExercise(obj as unknown as LegacyCustomExercise));
          } else {
            // v2 已有分類（或部分分類）：走 patchExerciseWithClassifications 補齊
            try {
              const patched = patchExerciseWithClassifications(obj as object);
              customExercises.push({ ...patched, isCustom: true });
            } catch {
              // 損壞條目：建立最小可用條目
              customExercises.push(
                createCustomExerciseV2(
                  typeof obj.name === 'string' ? obj.name : '遺失名稱動作',
                  'chest',
                  'other',
                  {
                    id: typeof obj.id === 'string' ? obj.id : generateId('custom'),
                    createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : new Date().toISOString(),
                  }
                )
              );
            }
          }
        }

        // A-002 / C4：personalRecords 由 subscribe 自動派生，migrate 不需處理

        return {
          sessions: safeSessions,
          customExercises,
          activePlanId: typeof raw.activePlanId === 'string' ? raw.activePlanId : null,
          nextDayIndex: typeof raw.nextDayIndex === 'number' ? raw.nextDayIndex : 0,
          taxonomyVersion: typeof raw.taxonomyVersion === 'number' ? raw.taxonomyVersion : 0,
        };
      },
    }
  )
);

// C4：personalRecords 為衍生資料 — 監聽 sessions / customExercises 變化自動派生
// 觸發點：finishSession、editCustomExercise（分類變更）、deleteCustomExercise、migrate
useWorkoutStore.subscribe((state, prevState) => {
  if (state.sessions === prevState.sessions && state.customExercises === prevState.customExercises) {
    return;
  }
  const prs = computePRsFromSessions(state.sessions, state.customExercises);
  // 避免無變化時無謂 setState
  if (prs !== state.personalRecords) {
    useWorkoutStore.setState({ personalRecords: prs });
  }
});

// 彙出 helper：取所有動作（內建 + 自訂），供 UI/替換選單使用
// C1：委派至 taxonomy 權威模組
export function getAllExercises(): Exercise[] {
  return getAllExercisesWith(useWorkoutStore.getState().customExercises);
}
