/**
 * Vivix 計畫編輯器 Store (T-05)
 *
 * 管理：
 *   - customPlans：用戶建立/複製的自訂計畫（持久化）
 *   - CRUD：create / update / delete / duplicate
 *   - resetToPreset：衍生自預設的計畫可恢復原狀
 *
 * 預設計畫來自 @/data/plans（靜態、唯讀）；
 * 自訂計畫存於 localStorage，與預設合併對外暴露。
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TrainingPlan, PlanDay, PlannedExercise, MuscleGroup, EquipmentType } from '@/types';
import { trainingPlans, getPlanById as getPresetPlanById, migratePlanToV2 } from '@/data/plans';
import { findExerciseById } from '@/features/exercises/taxonomy';
import { useWorkoutStore } from '@/store/workoutStore';

interface PlansState {
  customPlans: TrainingPlan[];

  // 查詢
  getAllPlans: () => TrainingPlan[];
  getPlanById: (id: string) => TrainingPlan | undefined;
  getPresetPlans: () => TrainingPlan[];
  getCustomPlans: () => TrainingPlan[];

  // CRUD
  createPlan: (name: string, description?: string) => string;
  duplicatePlan: (sourceId: string, newName?: string) => string;
  updatePlan: (id: string, patch: Partial<Pick<TrainingPlan, 'name' | 'description' | 'difficulty' | 'cover'>>) => void;
  deletePlan: (id: string) => void;
  resetToPreset: (id: string) => boolean;

  // 訓練日操作
  addDay: (planId: string, dayName: string) => void;
  updateDay: (planId: string, dayId: string, patch: Partial<Pick<PlanDay, 'dayName'>>) => void;
  deleteDay: (planId: string, dayId: string) => void;
  reorderDay: (planId: string, dayId: string, direction: 'up' | 'down') => void;

  // 動作操作（在指定訓練日內）
  addExerciseToDay: (planId: string, dayId: string, exerciseId: string, opts?: { targetSets?: number; targetReps?: string; definition?: { name: string; muscleGroup: MuscleGroup; equipmentType: EquipmentType } }) => void;
  updateExerciseInDay: (planId: string, dayId: string, exerciseId: string, patch: Partial<Pick<PlannedExercise, 'targetSets' | 'targetReps' | 'targetWeight' | 'restSeconds'>>) => void;
  removeExerciseFromDay: (planId: string, dayId: string, exerciseId: string) => void;
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * 建立 PlannedExercise snapshot（S-02 修復：打通自訂動作資料流）
 *
 * 優先序（L2 合規）：
 *   1. 呼叫端顯式傳入 definition（PlanDetail 從 getAllExercises() 取得物件時直接傳入，免重查）
 *   2. findExerciseById(exerciseId, customExercises)：builtin + custom 聯合查詢
 *   3. 最後兜底：保留名「未知動作」（僅限 exerciseId 確實無法解析的已刪動作）
 *
 * customExercises 由 useWorkoutStore 傳入（store 層自行 pull latest state，免 caller 擔心）。
 */
function buildPlannedExercise(
  exerciseId: string,
  opts: {
    targetSets?: number;
    targetReps?: string;
    definition?: { name: string; muscleGroup: MuscleGroup; equipmentType: EquipmentType };
    customExercises?: Array<{ id: string; name: string; muscleGroup?: MuscleGroup; equipmentType?: EquipmentType }>;
  } = {},
): PlannedExercise {
  const { targetSets = 3, targetReps = '8-12', definition, customExercises = [] } = opts;
  const resolved = definition ?? findExerciseById(exerciseId, customExercises);
  const muscleGroup: MuscleGroup =
    (resolved?.muscleGroup as MuscleGroup) ??
    'chest';
  const equipmentType: EquipmentType = resolved?.equipmentType ?? 'other';
  const name = resolved?.name ?? '未知動作';
  return {
    id: genId('pe'),
    exerciseId,
    snapshot: { name, muscleGroup, equipmentType },
    name,
    targetSets,
    targetReps,
    restSeconds: 90,
  };
}

export const usePlansStore = create<PlansState>()(
  persist(
    (set, get) => ({
      customPlans: [],

      getAllPlans: () => [...trainingPlans, ...get().customPlans],
      getPresetPlans: () => trainingPlans,
      getCustomPlans: () => get().customPlans,
      getPlanById: (id) => {
        return getPresetPlanById(id) ?? get().customPlans.find((p) => p.id === id);
      },

      createPlan: (name, description = '') => {
        const id = genId('plan');
        const plan: TrainingPlan = {
          id,
          name,
          difficulty: 'intermediate',
          description,
          cover: '自訂',
          isPreset: false,
          isCustom: true,
          editedByUser: true,
          days: [
            {
              id: genId('day'),
              dayName: 'Day 1',
              dayIndex: 0,
              warmup: [],
              exercises: [],
            },
          ],
        };
        set((s) => ({ customPlans: [...s.customPlans, plan] }));
        return id;
      },

      duplicatePlan: (sourceId, newName) => {
        const source = get().getPlanById(sourceId);
        if (!source) return '';
        const id = genId('plan');
        const plan: TrainingPlan = {
          ...JSON.parse(JSON.stringify(source)),
          id,
          name: newName ?? `${source.name}（副本）`,
          isPreset: false,
          isCustom: true,
          derivedFromPresetId: source.isPreset ? source.id : source.derivedFromPresetId,
          editedByUser: false,
        };
        // 重新生成 day/exercise IDs 避免衝突
        plan.days = plan.days.map((d, i) => ({
          ...d,
          id: genId('day'),
          dayIndex: i,
          exercises: d.exercises.map((ex) => ({ ...ex, id: genId('pe') })),
        }));
        set((s) => ({ customPlans: [...s.customPlans, plan] }));
        return id;
      },

      updatePlan: (id, patch) => {
        set((s) => ({
          customPlans: s.customPlans.map((p) =>
            p.id === id ? { ...p, ...patch, editedByUser: true } : p,
          ),
        }));
      },

      deletePlan: (id) => {
        set((s) => ({
          customPlans: s.customPlans.filter((p) => p.id !== id),
        }));
      },

      resetToPreset: (id) => {
        const plan = get().customPlans.find((p) => p.id === id);
        if (!plan?.derivedFromPresetId) return false;
        const preset = getPresetPlanById(plan.derivedFromPresetId);
        if (!preset) return false;
        set((s) => ({
          customPlans: s.customPlans.map((p) =>
            p.id === id
              ? { ...JSON.parse(JSON.stringify(preset)), id: p.id, isPreset: false, isCustom: true, derivedFromPresetId: p.derivedFromPresetId, editedByUser: false }
              : p,
          ),
        }));
        return true;
      },

      addDay: (planId, dayName) => {
        set((s) => ({
          customPlans: s.customPlans.map((p) => {
            if (p.id !== planId) return p;
            const newDay: PlanDay = {
              id: genId('day'),
              dayName,
              dayIndex: p.days.length,
              warmup: [],
              exercises: [],
            };
            return { ...p, days: [...p.days, newDay], editedByUser: true };
          }),
        }));
      },

      updateDay: (planId, dayId, patch) => {
        set((s) => ({
          customPlans: s.customPlans.map((p) =>
            p.id !== planId ? p : {
              ...p,
              days: p.days.map((d) => (d.id === dayId ? { ...d, ...patch } : d)),
              editedByUser: true,
            },
          ),
        }));
      },

      deleteDay: (planId, dayId) => {
        set((s) => ({
          customPlans: s.customPlans.map((p) => {
            if (p.id !== planId) return p;
            if (p.days.length <= 1) return p; // 至少保留一天
            return {
              ...p,
              days: p.days.filter((d) => d.id !== dayId).map((d, i) => ({ ...d, dayIndex: i })),
              editedByUser: true,
            };
          }),
        }));
      },

      reorderDay: (planId, dayId, direction) => {
        set((s) => ({
          customPlans: s.customPlans.map((p) => {
            if (p.id !== planId) return p;
            const idx = p.days.findIndex((d) => d.id === dayId);
            if (idx < 0) return p;
            const swapWith = direction === 'up' ? idx - 1 : idx + 1;
            if (swapWith < 0 || swapWith >= p.days.length) return p;
            const days = [...p.days];
            [days[idx], days[swapWith]] = [days[swapWith], days[idx]];
            return {
              ...p,
              days: days.map((d, i) => ({ ...d, dayIndex: i })),
              editedByUser: true,
            };
          }),
        }));
      },

      addExerciseToDay: (planId, dayId, exerciseId, opts = {}) => {
        // S-02：寫入時拉取最新 customExercises（workoutStore import 零循環）
        const customEx = useWorkoutStore.getState().customExercises;
        const pe = buildPlannedExercise(exerciseId, { ...opts, customExercises: customEx });
        set((s) => ({
          customPlans: s.customPlans.map((p) => {
            if (p.id !== planId) return p;
            return {
              ...p,
              days: p.days.map((d) =>
                d.id !== dayId ? d : { ...d, exercises: [...d.exercises, pe] },
              ),
              editedByUser: true,
            };
          }),
        }));
      },

      updateExerciseInDay: (planId, dayId, exerciseId, patch) => {
        set((s) => ({
          customPlans: s.customPlans.map((p) => {
            if (p.id !== planId) return p;
            return {
              ...p,
              days: p.days.map((d) =>
                d.id !== dayId ? d : {
                  ...d,
                  exercises: d.exercises.map((ex) =>
                    ex.exerciseId === exerciseId ? { ...ex, ...patch } : ex,
                  ),
                },
              ),
              editedByUser: true,
            };
          }),
        }));
      },

      removeExerciseFromDay: (planId, dayId, exerciseId) => {
        set((s) => ({
          customPlans: s.customPlans.map((p) => {
            if (p.id !== planId) return p;
            return {
              ...p,
              days: p.days.map((d) =>
                d.id !== dayId ? d : { ...d, exercises: d.exercises.filter((ex) => ex.exerciseId !== exerciseId) },
              ),
              editedByUser: true,
            };
          }),
        }));
      },
    }),
    {
      name: 'vivix-plans-store-v1',
      version: 1,
      // ⚠️ 容錯兜底：LocalStorage 損壞時優雅重置為預設值，唔會白屏崩潰
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('[plansStore] Zustand hydration failed, falling back to defaults', error);
            try {
              localStorage.removeItem('vivix-plans-store-v1');
            } catch {}
          }
        };
      },
      migrate: (persistedState, version) => {
        const s = (persistedState ?? {}) as Partial<PlansState>;
        // 確保 customPlans 存在且為 v2 結構
        const customPlans = (s.customPlans ?? []).map((p) => migratePlanToV2(p));
        return { customPlans } as PlansState;
      },
    },
  ),
);
