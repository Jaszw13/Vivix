import { create } from 'zustand';
import type {
  EquipmentMemory,
  WorkoutSession,
  Exercise,
  EquipmentType,
} from '@/types';
import { estimate1RM } from '@/utils/workout';
import { WEEK_MS } from '@/utils/time';
import { useWorkoutStore, getAllExercises } from './workoutStore';
import { getExerciseById } from '@/data/exercises';

interface EquipmentMemoryState {
  // A-014 / C4：memories 不再 persist；改為每次讀取時從 workoutStore.sessions 派生
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

  /** 重建：C4 起改為 noop（sessions 即為單一來源，派生自 workoutStore） */
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

/**
 * 純函數：從 sessions 派生 memories map。
 * 同 equipmentMemoryStore v1 的 updateFromSession / rebuildFromSessions 邏輯合併。
 */
function computeMemoriesFromSessions(sessions: WorkoutSession[]): Record<string, EquipmentMemory> {
  const mems: Record<string, EquipmentMemory> = {};
  const ordered = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  for (const s of ordered) {
    for (const ex of s.exercises) {
      const completed = ex.sets.filter((x) => x.completed);
      if (completed.length === 0) continue;
      const def =
        getExerciseById(ex.exerciseId) ??
        getAllExercises().find((e) => e.id === ex.exerciseId);
      const equipmentId = def?.equipmentId ?? def?.equipmentType ?? ex.equipmentType;
      const k = keyOf(equipmentId, ex.exerciseId);
      const cur: EquipmentMemory =
        mems[k] ?? emptyMemory(equipmentId, ex.exerciseId);
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
  return mems;
}

/**
 * Lightweight memo：以 sessions ref 為 key 快取派生結果，
 * 同一 ref 多次讀取不重算。sessions 是不可變 push（workoutStore 一律 set 新陣列），
 * 因此 ref 比較有效。
 */
let _memoSessionsRef: WorkoutSession[] | null = null;
let _memoResult: Record<string, EquipmentMemory> = {};
function getMemoizedMemories(): Record<string, EquipmentMemory> {
  const sessions = useWorkoutStore.getState().sessions;
  if (sessions !== _memoSessionsRef) {
    _memoSessionsRef = sessions;
    _memoResult = computeMemoriesFromSessions(sessions);
  }
  return _memoResult;
}

export const useEquipmentMemoryStore = create<EquipmentMemoryState>()(
  // C4：memories 改為派生 → 不需要 persist wrapper
  () => ({
    // C4：noop — memories 派生自 workoutStore.sessions
    updateFromSession: () => {
      /* no-op：派生在 getMemories 時自動反映 */
    },

    getMemory: (equipmentId, exerciseId) => {
      return getMemoizedMemories()[keyOf(equipmentId, exerciseId)];
    },

    getLatestMemoryForExercise: (exerciseId) => {
      const all = Object.values(getMemoizedMemories()).filter(
        (m) => m.exerciseId === exerciseId,
      );
      if (all.length === 0) return undefined;
      return all.sort((a, b) => {
        const ta = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
        const tb = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
        return tb - ta;
      })[0];
    },

    sortCandidatesByMemory: (candidates, currentEquipmentType) => {
      const mems = getMemoizedMemories();
      const now = Date.now();
      return [...candidates].sort((a, b) => {
        let scoreA = currentEquipmentType && a.equipmentType === currentEquipmentType ? 50 : 0;
        let scoreB = currentEquipmentType && b.equipmentType === currentEquipmentType ? 50 : 0;

        const ma =
          mems[keyOf(a.equipmentId ?? a.equipmentType, a.id)] ??
          mems[keyOf(undefined, a.id)];
        const mb =
          mems[keyOf(b.equipmentId ?? b.equipmentType, b.id)] ??
          mems[keyOf(undefined, b.id)];
        scoreA += (ma?.usageCount ?? 0) * 10;
        scoreB += (mb?.usageCount ?? 0) * 10;

        const ra = ma?.lastUsedAt ? now - new Date(ma.lastUsedAt).getTime() : Infinity;
        const rb = mb?.lastUsedAt ? now - new Date(mb.lastUsedAt).getTime() : Infinity;
        if (ra < WEEK_MS) scoreA += 15;
        else if (ra < 4 * WEEK_MS) scoreA += 5;
        if (rb < WEEK_MS) scoreB += 15;
        else if (rb < 4 * WEEK_MS) scoreB += 5;

        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.name.localeCompare(b.name, 'zh-HK');
      });
    },

    // C4：noop — 派生自動跟隨 workoutStore.sessions
    rebuildFromSessions: () => {
      /* no-op */
    },

    reset: () => {
      _memoSessionsRef = null;
      _memoResult = {};
    },
  }),
);
