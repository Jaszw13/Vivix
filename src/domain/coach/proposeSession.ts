import type { EquipmentType, MuscleGroup, WorkoutSession } from '@/types';
import { getFatigueSuggestion, type FatigueSuggestion } from '@/features/retention/fatigue';
import type { AvoidEntry } from './types';

export interface TaxonomyEntry {
  id: string;
  muscleGroup: MuscleGroup;
  equipmentType: EquipmentType;
}

export interface PlannedCandidate {
  exerciseId: string;
  targetWeight?: number;
  alternativeIds?: string[];
}

/**
 * 重量只供顯示。autoFill 永遠是 false，呼叫端不可以寫進紀錄組。
 * preset：沒有完成紀錄時，沿用計畫上已有的預設重量，不另外發明。
 * fatigue-range：區間直接來自 fatigue.ts，不會給出區間外的數字。
 */
export interface WeightHint {
  autoFill: false;
  kind: 'none' | 'preset' | 'last' | 'fatigue-range';
  presetKg?: number;
  lastKg?: number;
  minKg?: number;
  maxKg?: number;
}

export interface ProposedExercise {
  exerciseId: string;
  via: 'planned' | 'alternative';
  replacedId?: string;
  weight: WeightHint;
}

export interface ProposeSessionResult {
  status: 'ready' | 'empty';
  emptyReason?: 'no-candidates';
  exercises: ProposedExercise[];
}

export interface ProposeSessionInput {
  planned: PlannedCandidate[];
  taxonomy: TaxonomyEntry[];
  /** 空陣列或省略 = 使用者還沒勾器材，不過濾。 */
  allowedEquipmentTypes?: EquipmentType[] | null;
  avoid?: AvoidEntry[];
  sessions?: WorkoutSession[];
}

export function proposeSession(input: ProposeSessionInput): ProposeSessionResult {
  const byId = new Map(input.taxonomy.map((entry) => [entry.id, entry]));
  const known = new Set(byId.keys());
  const avoid = input.avoid ?? [];
  const allowed =
    input.allowedEquipmentTypes && input.allowedEquipmentTypes.length > 0
      ? new Set(input.allowedEquipmentTypes)
      : null;
  const sessions = input.sessions ?? [];

  const chosen: ProposedExercise[] = [];
  for (const item of input.planned) {
    const picked = pickExercise(item, byId, known, avoid, allowed);
    if (!picked) continue;
    chosen.push({
      exerciseId: picked.id,
      via: picked.via,
      replacedId: picked.replacedId,
      weight: { autoFill: false, kind: 'none' },
    });
  }

  if (chosen.length === 0) {
    return { status: 'empty', emptyReason: 'no-candidates', exercises: [] };
  }

  const synthetic = syntheticSession(chosen.map((item) => item.exerciseId));
  for (const item of chosen) {
    const source = input.planned.find(
      (planned) =>
        planned.exerciseId === item.exerciseId ||
        planned.exerciseId === item.replacedId,
    );
    item.weight = hintFor({
      exerciseId: item.exerciseId,
      via: item.via,
      targetWeight: item.via === 'planned' ? source?.targetWeight : undefined,
      sessions,
      synthetic,
    });
  }

  for (const item of chosen) {
    if (!known.has(item.exerciseId)) {
      return { status: 'empty', emptyReason: 'no-candidates', exercises: [] };
    }
  }

  return { status: 'ready', exercises: chosen };
}

export function weightHintLabel(hint: WeightHint): string {
  if (hint.kind === 'fatigue-range' && hint.minKg != null && hint.maxKg != null) {
    return `建議 ${hint.minKg}–${hint.maxKg} kg`;
  }
  if (hint.kind === 'last' && hint.lastKg != null) {
    return `上次 ${hint.lastKg} kg`;
  }
  if (hint.kind === 'preset' && hint.presetKg != null) {
    return `計畫預設 ${hint.presetKg} kg`;
  }
  return '重量自己決定';
}

function pickExercise(
  item: PlannedCandidate,
  byId: Map<string, TaxonomyEntry>,
  known: Set<string>,
  avoid: AvoidEntry[],
  allowed: Set<EquipmentType> | null,
): { id: string; via: 'planned' | 'alternative'; replacedId?: string } | null {
  if (known.has(item.exerciseId)) {
    const entry = byId.get(item.exerciseId);
    if (entry && passes(entry, avoid, allowed)) {
      return { id: item.exerciseId, via: 'planned' };
    }
  }
  for (const alt of item.alternativeIds ?? []) {
    if (!known.has(alt)) continue;
    const entry = byId.get(alt);
    if (!entry || !passes(entry, avoid, allowed)) continue;
    return { id: alt, via: 'alternative', replacedId: item.exerciseId };
  }
  return null;
}

function passes(
  entry: TaxonomyEntry,
  avoid: AvoidEntry[],
  allowed: Set<EquipmentType> | null,
): boolean {
  for (const rule of avoid) {
    if (rule.kind === 'exercise' && rule.exerciseId === entry.id) return false;
    if (rule.kind === 'region' && rule.region === entry.muscleGroup) return false;
  }
  if (allowed && !allowed.has(entry.equipmentType)) return false;
  return true;
}

function hintFor(args: {
  exerciseId: string;
  via: 'planned' | 'alternative';
  targetWeight?: number;
  sessions: WorkoutSession[];
  synthetic: WorkoutSession;
}): WeightHint {
  // 疲勞區間只看親自記錄。匯入紀錄可以讀，但不能拿來發明比上次更重的目標。
  const ownHistory = args.sessions.filter((session) => session.imported !== true);
  const fatigue = getFatigueSuggestion(ownHistory, args.synthetic, args.exerciseId);
  if (fatigue) return rangeHint(fatigue);
  const last = lastPositiveWeight(args.sessions, args.exerciseId);
  if (last != null) return { autoFill: false, kind: 'last', lastKg: last };
  if (
    args.via === 'planned' &&
    typeof args.targetWeight === 'number' &&
    args.targetWeight > 0
  ) {
    return { autoFill: false, kind: 'preset', presetKg: args.targetWeight };
  }
  return { autoFill: false, kind: 'none' };
}

function rangeHint(fatigue: FatigueSuggestion): WeightHint {
  return {
    autoFill: false,
    kind: 'fatigue-range',
    minKg: fatigue.minWeight,
    maxKg: fatigue.maxWeight,
  };
}

function lastPositiveWeight(sessions: WorkoutSession[], exerciseId: string): number | null {
  const ordered = [...sessions].sort((a, b) => sessionTime(a) - sessionTime(b));
  const own = latestPositive(
    ordered.filter((session) => session.imported !== true),
    exerciseId,
  );
  if (own != null) return own;
  // 只有匯入紀錄時，顯示那次實際完成的重量，不改用計畫上更重的預設。
  return latestPositive(
    ordered.filter((session) => session.imported === true),
    exerciseId,
  );
}

function latestPositive(sessions: WorkoutSession[], exerciseId: string): number | null {
  for (let i = sessions.length - 1; i >= 0; i -= 1) {
    const exercise = sessions[i].exercises?.find((item) => item.exerciseId === exerciseId);
    if (!exercise) continue;
    // 自重組的 weight 是額外公斤，不能當成下次的絕對槓重。autoFill 仍永遠是 false。
    const done = exercise.sets.filter((set) => set.completed && set.weight > 0 && set.load !== 'bw');
    if (done.length === 0) continue;
    return done.reduce((best, set) => (set.weight > best ? set.weight : best), done[0].weight);
  }
  return null;
}

function sessionTime(session: WorkoutSession): number {
  const at = new Date(session.date).getTime();
  return Number.isFinite(at) ? at : 0;
}

function syntheticSession(exerciseIds: string[]): WorkoutSession {
  return {
    id: 'propose-session',
    date: '1970-01-01T00:00:00.000Z',
    warmupCompletedIds: [],
    duration: 0,
    totalVolume: 0,
    exercises: exerciseIds.map((exerciseId, index) => ({
      id: `propose-ex-${index}`,
      exerciseId,
      name: exerciseId,
      sets: [
        {
          id: `propose-set-${index}`,
          setNumber: 1,
          weight: 0,
          reps: 0,
          completed: false,
        },
      ],
    })),
  };
}
