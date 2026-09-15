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
  createExerciseLog as _createExerciseLog,
} from '@/utils/workout';
import { dayKey, localNoonISO } from '@/utils/time';
import {
  getStreakDays as getStreakDaysSelector,
  computePRsFromSessions,
  getTotalSessions as getTotalSessionsSelector,
  getTotalVolume as getTotalVolumeSelector,
  getWeeklyVolume as getWeeklyVolumeSelector,
  getGroupStats as getGroupStatsSelector,
  getGroupWeeklyVolume as getGroupWeeklyVolumeSelector,
  getExerciseProgress as getExerciseProgressSelector,
  getGroupExerciseProgress as getGroupExerciseProgressSelector,
  getUnderTrainedGroups as getUnderTrainedGroupsSelector,
} from '@/features/stats/selectors';
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

  // T9：歷史補錄 store actions（L1 純事實寫入；L3 不 settle，由呼叫端走 settleAll）
  /** T9-1/T9-2：補錄過去日訓練。date 為 dayKey "YYYY-MM-DD"；logs 由 DaySessionEditor 構建。
   *  planSnapshot = null（月曆顯示「自由訓練」）；imported = false（手動補錄非匯入）。
   *  sessions 保持日期排序；personalRecords 由底部 subscribe 自動重算。 */
  addPastSession: (date: string, exerciseLogs: ExerciseLog[]) => WorkoutSession;
  /** T9-2：更新既有過去 session（跨輯模式儲存）。保留 id/date/imported；覆寫 exercises/duration/totalVolume。 */
  updatePastSession: (sessionId: string, patch: Partial<Pick<WorkoutSession, 'exercises' | 'duration' | 'totalVolume' | 'notes'>>) => void;
  /** T9-2：刪除過去 session（補錄刪除；confirm 由呼叫端 UI 處理）。L3：不 settle。 */
  deletePastSession: (sessionId: string) => void;

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

// ============ PR / group stats：權威實作已遷至 @/features/stats/selectors（T16/B-01） ============
// 此處僅保留 store 介面下的薄 delegate（見下方 method 實作）。

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
          date: localNoonISO(new Date()),
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
          // P-5：計畫快照（T6 月曆用）
          planSnapshot: { planId, dayId: day.id, dayName: day.dayName },
        };
        set({ activeSession: session });
      },

      startEmptySession: () => {
        const session: WorkoutSession = {
          id: generateId('session'),
          date: localNoonISO(new Date()),
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

      // T9-1/T9-2：歷史補錄（L1 純事實；L3 不 settle — 由呼叫端 Progress/Calendar 走 settleAll）
      addPastSession: (date, exerciseLogs) => {
        // T15 / D-10：本地正午 ISO（無 Z），避免跨時區跨日
        const sessionDate = `${date}T12:00:00`;
        const session: WorkoutSession = {
          id: generateId('session'),
          date: sessionDate,
          warmupCompletedIds: [],
          duration: 0,
          totalVolume: exerciseLogs.reduce(
            (sum, ex) => sum + ex.sets.filter((s) => s.completed).reduce((s2, s) => s2 + s.weight * s.reps, 0),
            0,
          ),
          exercises: exerciseLogs,
          startedAt: null,
          finishedAt: null,
          imported: false,
          planSnapshot: null,
        };
        const next = [...get().sessions, session].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
        set({ sessions: next });
        return session;
      },

      // T9-2：跨輯模式更新既有過去 session（保留 id/date/imported）
      updatePastSession: (sessionId, patch) => {
        set((s) => ({
          sessions: s.sessions
            .map((sess) => {
              if (sess.id !== sessionId) return sess;
              const merged: WorkoutSession = { ...sess, ...patch };
              // 重算 totalVolume（若 exercises 變更）
              if (patch.exercises) {
                merged.totalVolume = patch.exercises.reduce(
                  (sum, ex) => sum + ex.sets.filter((set) => set.completed).reduce((s2, set) => s2 + set.weight * set.reps, 0),
                  0,
                );
              }
              return merged;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        }));
      },

      // T9-2：刪除過去 session（L3：不 settle — 由呼叫端走 settleAll；confirm 由 UI 處理）
      deletePastSession: (sessionId) => {
        set((s) => ({
          sessions: s.sessions.filter((sess) => sess.id !== sessionId),
        }));
      },

      // ============ 統計：薄 delegate 至 @/features/stats/selectors（T16/B-01） ============
      getTotalSessions: () => getTotalSessionsSelector(get().sessions),

      getTotalVolume: () => getTotalVolumeSelector(get().sessions),

      // C3：統一走 selectors 權威（避免 inline 重算）；E-D3：streak = 力量日 ∪ 有氧日
      getStreakDays: () => getStreakDaysSelector(get().sessions, useCardioStore.getState().sessions),

      getExerciseProgress: (exerciseId) =>
        getExerciseProgressSelector(get().sessions, exerciseId),

      getWeeklyVolume: () => getWeeklyVolumeSelector(get().sessions),

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

      // ============ 分部位統計（T-02）：薄 delegate 至 selectors ============
      getGroupStats: () =>
        getGroupStatsSelector(get().sessions, get().personalRecords, get().customExercises),

      getGroupWeeklyVolume: (group) =>
        getGroupWeeklyVolumeSelector(get().sessions, get().customExercises, group),

      getGroupExerciseProgress: (group) =>
        getGroupExerciseProgressSelector(get().sessions, get().customExercises, group),

      getUnderTrainedGroups: () =>
        getUnderTrainedGroupsSelector(get().sessions, get().personalRecords, get().customExercises),
    }),
    {
      name: 'ironpulse-workouts',
      version: 10,
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
        // E-01 v8：為舊 session 補 startedAt/finishedAt = null
        // P-5 v9：為舊 session 補 planSnapshot = null（T6 月曆顯示「自由訓練」）
        // T15 v10：session.date 歸一化為本地正午 ISO（無 Z），避免跨日偏移
        const safeSessions: WorkoutSession[] = (sessionsIn as WorkoutSession[]).map((s) => {
          // v10：將舊 date（可能為 UTC ISO with Z）歸一化為本地正午
          const oldDate = typeof s.date === 'string' ? s.date : new Date().toISOString();
          const normalizedDate = /^\d{4}-\d{2}-\d{2}$/.test(oldDate)
            ? oldDate // 純日期（不應出現但保留）
            : version < 10
              ? `${dayKey(new Date(oldDate))}T12:00:00`
              : oldDate; // v10+ 已是正午格式
          return {
            ...s,
            date: normalizedDate,
            startedAt: typeof s.startedAt === 'string' ? s.startedAt : null,
            finishedAt: typeof s.finishedAt === 'string' ? s.finishedAt : null,
            planSnapshot: s.planSnapshot ?? null,
          };
        });

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
