import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  EquipmentMemory,
  WorkoutSession,
  MuscleGroup,
  Exercise,
  EquipmentType,
} from '@/types';
import { estimate1RM } from '@/utils/workout';
import { getAllExercises } from './workoutStore';
import { getExerciseById } from '@/data/exercises';

interface EquipmentMemoryState {
  memories: Record<string, EquipmentMemory>;

  /**
   * 完成訓練 session 後，依每個 completed 的 set 更新 memory。
   * 同一器械+動作的 lastWeight/lastReps/usageCount/PB 都寫入。
   */
  updateFromSession: (session: WorkoutSession) => void;

  /** 讀取某組合的 memory（無則 undefined） */
  getMemory: (equipmentId: string | undefined, exerciseId: string) => EquipmentMemory | undefined;

  /** 讀取某動作所有器械 memory 的最新一筆（供 ExerciseSetList 預填重量） */
  getLatestMemoryForExercise: (exerciseId: string) => EquipmentMemory | undefined;

  /**
   * 替換排序用：依 muscleGroup 的候選動作按 memory score 排序。
   *   score = usageCount*10 + (lastUsedAt recency bonus) + (同 equipmentType bonus)
   */
  sortCandidatesByMemory: (
    candidates: Exercise[],
    currentEquipmentType?: EquipmentType
  ) => Exercise[];

  /** 重建：從歷史 sessions 反向初始化 memory（首次載入 migrate 用） */
  rebuildFromSessions: (sessions: WorkoutSession[]) => void;

  reset: () => void;
}

function keyOf(equipmentId: string | undefined, exerciseId: string): string {
  return `${equipmentId ?? '__noequipment__'}:${exerciseId}`;
}

function emptyMemory(equipmentId: string | undefined, exerciseId: string): EquipmentMemory {
  return {
    key: keyOf(equipmentId, exerciseId),
    equipmentId: equipmentId ?? '__noequipment__',
    exerciseId,
    usageCount: 0,
  };
}

export const useEquipmentMemoryStore = create<EquipmentMemoryState>()(
  persist(
    (set, get) => ({
      memories: {},

      updateFromSession: (session) => {
        const mems = { ...get().memories };
        const now = new Date().toISOString();
        for (const ex of session.exercises) {
          const completed = ex.sets.filter((s) => s.completed);
          if (completed.length === 0) continue;

          // 取得 exercise 的 equipmentId（先查動作庫，無則用 exerciseLog 中的 equipmentType fallback key）
          const def =
            getExerciseById(ex.exerciseId) ??
            getAllExercises().find((e) => e.id === ex.exerciseId);
          const equipmentId = def?.equipmentId ?? def?.equipmentType ?? ex.equipmentType;

          const k = keyOf(equipmentId, ex.exerciseId);
          const cur: EquipmentMemory = mems[k] ?? emptyMemory(equipmentId as any, ex.exerciseId);

          // 最新一組 completed 作為 lastWeight / lastReps
          const last = completed[completed.length - 1];
          // PB：所有 completed 中找最高 estimated1RM
          let best = cur.personalBest;
          for (const s of completed) {
            const rm = estimate1RM(s.weight, s.reps);
            if (!best || rm > best.estimated1RM) {
              best = {
                weightKg: s.weight,
                reps: s.reps,
                estimated1RM: rm,
                at: session.date,
              };
            }
          }

          mems[k] = {
            ...cur,
            lastWeightKg: last.weight,
            lastReps: last.reps,
            usageCount: cur.usageCount + 1,
            lastUsedAt: now,
            personalBest: best,
          };
        }
        set({ memories: mems });
      },

      getMemory: (equipmentId, exerciseId) => {
        return get().memories[keyOf(equipmentId, exerciseId)];
      },

      getLatestMemoryForExercise: (exerciseId) => {
        const all = Object.values(get().memories).filter(
          (m) => m.exerciseId === exerciseId
        );
        if (all.length === 0) return undefined;
        return all.sort((a, b) => {
          const ta = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
          const tb = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
          return tb - ta;
        })[0];
      },

      sortCandidatesByMemory: (candidates, currentEquipmentType) => {
        const mems = get().memories;
        const now = Date.now();
        const WEEK = 7 * 86400000;
        return [...candidates].sort((a, b) => {
          // 1) 同器械類型優先（練習器械熟度）
          let scoreA = currentEquipmentType && a.equipmentType === currentEquipmentType ? 50 : 0;
          let scoreB = currentEquipmentType && b.equipmentType === currentEquipmentType ? 50 : 0;

          // 2) usageCount * 10
          const ma =
            mems[keyOf(a.equipmentId ?? a.equipmentType, a.id)] ??
            mems[keyOf(undefined, a.id)];
          const mb =
            mems[keyOf(b.equipmentId ?? b.equipmentType, b.id)] ??
            mems[keyOf(undefined, b.id)];
          scoreA += (ma?.usageCount ?? 0) * 10;
          scoreB += (mb?.usageCount ?? 0) * 10;

          // 3) recency：近 1 週用過 +15，近 1 月用過 +5
          const ra = ma?.lastUsedAt ? now - new Date(ma.lastUsedAt).getTime() : Infinity;
          const rb = mb?.lastUsedAt ? now - new Date(mb.lastUsedAt).getTime() : Infinity;
          if (ra < WEEK) scoreA += 15;
          else if (ra < 4 * WEEK) scoreA += 5;
          if (rb < WEEK) scoreB += 15;
          else if (rb < 4 * WEEK) scoreB += 5;

          // 4) 同名稱排序（穩定）
          if (scoreB !== scoreA) return scoreB - scoreA;
          return a.name.localeCompare(b.name, 'zh-HK');
        });
      },

      rebuildFromSessions: (sessions) => {
        const tmp: EquipmentMemoryState = {
          memories: {},
        } as EquipmentMemoryState;
        // 逐 session 套用，保持舊到新的順序
        const ordered = [...sessions].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        for (const s of ordered) {
          const mems = tmp.memories;
          for (const ex of s.exercises) {
            const completed = ex.sets.filter((x) => x.completed);
            if (completed.length === 0) continue;
            const def =
              getExerciseById(ex.exerciseId) ??
              getAllExercises().find((e) => e.id === ex.exerciseId);
            const equipmentId = def?.equipmentId ?? def?.equipmentType ?? ex.equipmentType;
            const k = keyOf(equipmentId, ex.exerciseId);
            const cur: EquipmentMemory =
              mems[k] ?? emptyMemory(equipmentId as any, ex.exerciseId);
            const last = completed[completed.length - 1];
            let best = cur.personalBest;
            for (const set of completed) {
              const rm = estimate1RM(set.weight, set.reps);
              if (!best || rm > best.estimated1RM) {
                best = {
                  weightKg: set.weight,
                  reps: set.reps,
                  estimated1RM: rm,
                  at: s.date,
                };
              }
            }
            mems[k] = {
              ...cur,
              lastWeightKg: last.weight,
              lastReps: last.reps,
              usageCount: cur.usageCount + 1,
              lastUsedAt: s.date,
              personalBest: best,
            };
          }
        }
        set({ memories: tmp.memories });
      },

      reset: () => set({ memories: {} }),
    }),
    {
      name: 'vivix-equipment-memory',
      version: 1,
      migrate: (persistedState) => {
        const s = (persistedState ?? {}) as Partial<EquipmentMemoryState>;
        return {
          memories: s.memories ?? {},
        };
      },
    }
  )
);
