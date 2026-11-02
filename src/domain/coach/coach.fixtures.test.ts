import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ExerciseLog, SetLog, WorkoutSession } from '@/types';
import { exercises } from '@/data/exercises';
import { equipmentLibrary } from '@/data/equipment';
import { trainingPlans } from '@/data/plans';
import { getFatigueSuggestion } from '@/features/retention/fatigue';
import { buildCoachContext } from './buildCoachContext';
import { loadCoachContext } from './loadCoachContext';
import {
  explainPlan,
  freqBucketFromRecentSessions,
  freqBucketFromWeeklyAverage,
  recommendPlanId,
} from './recommendPlan';
import { DAY_MS, WEEK_MS } from '@/utils/time';
import { proposeSession, type TaxonomyEntry } from './proposeSession';
import { FACT_KEYS, isFactKey } from '@/domain/storage/factKeys';
import {
  clearFactKeys,
  createMemoryLogRepository,
  exportSnapshot,
  importSnapshot,
} from '@/domain/storage/logRepository';
import { isHistoryRoute, routeStaysOpenWhenExpired } from '@/routing/trialAccess';

const taxonomy: TaxonomyEntry[] = exercises.map((exercise) => ({
  id: exercise.id,
  muscleGroup: exercise.muscleGroup,
  equipmentType: exercise.equipmentType,
}));
const knownIds = new Set(taxonomy.map((entry) => entry.id));

function oneSet(weight: number, reps: number, completed = true): SetLog {
  return {
    id: `set-${weight}-${reps}-${completed}`,
    setNumber: 1,
    weight,
    reps,
    completed,
  };
}

function exerciseLog(exerciseId: string, sets: SetLog[]): ExerciseLog {
  return {
    id: `log-${exerciseId}`,
    exerciseId,
    name: exerciseId,
    sets,
  };
}

function session(
  partial: Pick<WorkoutSession, 'id' | 'date'> & Partial<WorkoutSession>,
): WorkoutSession {
  return {
    warmupCompletedIds: [],
    duration: 0,
    totalVolume: 0,
    exercises: [],
    ...partial,
  };
}

describe('catalog', () => {
  it('keeps ids unique and points at real equipment', () => {
    const exerciseIds = exercises.map((exercise) => exercise.id);
    const equipmentIds = equipmentLibrary.map((item) => item.id);
    expect(new Set(exerciseIds).size).toBe(exerciseIds.length);
    expect(new Set(equipmentIds).size).toBe(equipmentIds.length);
    expect(exercises.length).toBeGreaterThan(60);
    expect(equipmentLibrary.length).toBeGreaterThan(45);
    const originalIds = new Set([
      'bench-press', 'incline-dumbbell-press', 'cable-fly', 'deadlift', 'pull-up',
      'barbell-row', 'squat', 'leg-press', 'romanian-deadlift', 'overhead-press',
      'lateral-raise', 'barbell-curl', 'tricep-pushdown', 'plank', 'hanging-leg-raise',
    ]);
    const banned = ['臥推', '推胸', '深蹲', '硬舉', '肩推'];
    for (const exercise of exercises) {
      expect(exercise.muscleGroup).toBe(exercise.category);
      if (exercise.equipmentId) expect(equipmentIds).toContain(exercise.equipmentId);
      expect(exercise.media?.url).toBeUndefined();
      if (!originalIds.has(exercise.id)) {
        for (const word of banned) {
          expect(exercise.name.includes(word)).toBe(false);
        }
      }
    }
    expect(originalIds.size).toBe(15);
    for (const id of originalIds) expect(exerciseIds).toContain(id);
  });
});

describe('proposeSession fixtures', () => {
  it('blank history returns the plan preset and does not invent a weight', () => {
    const result = proposeSession({
      planned: [{ exerciseId: 'bench-press', targetWeight: 40 }, { exerciseId: 'pull-up' }],
      taxonomy,
      sessions: [],
    });
    expect(result.status).toBe('ready');
    expect(result.exercises.map((item) => item.exerciseId)).toEqual(['bench-press', 'pull-up']);
    expect(result.exercises[0].weight).toEqual({ autoFill: false, kind: 'preset', presetKg: 40 });
    expect(result.exercises[1].weight).toEqual({ autoFill: false, kind: 'none' });
    const context = buildCoachContext({
      goal: 'health',
      weeklyDays: 3,
      sessionMinutes: 45,
      equipmentIds: [],
      avoid: [],
      sessions: [],
      now: new Date('2026-11-02T00:00:00.000Z'),
    });
    expect(context.version).toBe(1);
    expect(context.logSummary.sessionCount).toBe(0);
    expect(context.logSummary.totalVolumeKg).toBe(0);
    expect(context.lastCompletedSets).toEqual([]);
  });

  it('imported-only history is readable and does not invent a heavier weight', () => {
    const sessions = [
      session({
        id: 'imported-1',
        date: '2026-10-20T12:00:00',
        imported: true,
        exercises: [exerciseLog('squat', [oneSet(100, 5)])],
      }),
    ];
    const context = buildCoachContext({
      goal: 'muscle',
      weeklyDays: 3,
      sessionMinutes: 45,
      equipmentIds: [],
      avoid: [],
      sessions,
      now: new Date('2026-11-02T00:00:00.000Z'),
    });
    expect(context.logSummary.sessionCount).toBe(1);
    expect(context.logSummary.importedSessionCount).toBe(1);
    expect(context.lastCompletedSets).toEqual([
      {
        exerciseId: 'squat',
        date: '2026-10-20T12:00:00',
        sessionId: 'imported-1',
        imported: true,
        sets: [{ weight: 100, reps: 5 }],
      },
    ]);
    const result = proposeSession({
      planned: [{ exerciseId: 'squat', targetWeight: 140 }],
      taxonomy,
      sessions,
    });
    expect(result.exercises[0].weight).toEqual({ autoFill: false, kind: 'last', lastKg: 100 });
  });

  it('avoiding a body region drops that region', () => {
    const result = proposeSession({
      planned: [
        { exerciseId: 'squat', targetWeight: 80, alternativeIds: ['leg-press', 'front-squat'] },
        { exerciseId: 'bench-press', targetWeight: 40 },
      ],
      taxonomy,
      avoid: [{ kind: 'region', region: 'legs' }],
    });
    expect(result.status).toBe('ready');
    expect(result.exercises.map((item) => item.exerciseId)).toEqual(['bench-press']);
  });

  it('returns an explicit empty result when equipment leaves no candidate', () => {
    const result = proposeSession({
      planned: [
        { exerciseId: 'squat', alternativeIds: ['bench-press', 'not-a-real-lift'] },
      ],
      taxonomy,
      allowedEquipmentTypes: ['kettlebell'],
    });
    expect(result).toEqual({
      status: 'empty',
      emptyReason: 'no-candidates',
      exercises: [],
    });
  });

  it('never emits an unknown exercise id', () => {
    for (const plan of trainingPlans) {
      for (const day of plan.days) {
        const result = proposeSession({
          planned: day.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            targetWeight: exercise.targetWeight,
            alternativeIds: exercise.alternativeIds,
          })),
          taxonomy,
          sessions: [],
        });
        for (const item of result.exercises) {
          expect(knownIds.has(item.exerciseId)).toBe(true);
          expect(item.weight.autoFill).toBe(false);
        }
      }
    }
    const fake = proposeSession({
      planned: [{ exerciseId: 'not-a-real-lift', alternativeIds: ['also-missing'] }],
      taxonomy,
    });
    expect(fake.status).toBe('empty');
    expect(fake.exercises).toEqual([]);
  });

  it('keeps a fatigue suggestion inside the range fatigue.ts already computes', () => {
    const sessions = [1, 2, 3].map((index) =>
      session({
        id: `hist-${index}`,
        date: `2026-01-0${index}T12:00:00`,
        exercises: [exerciseLog('squat', [oneSet(80, 5)])],
      }),
    );
    const active = session({
      id: 'active',
      date: '2026-02-01T12:00:00',
      exercises: [exerciseLog('squat', [oneSet(0, 0, false)])],
    });
    const fatigue = getFatigueSuggestion(sessions, active, 'squat');
    expect(fatigue).not.toBeNull();
    const result = proposeSession({
      planned: [{ exerciseId: 'squat', targetWeight: 200 }],
      taxonomy,
      sessions,
    });
    const hint = result.exercises[0].weight;
    expect(hint.autoFill).toBe(false);
    expect(hint.kind).toBe('fatigue-range');
    expect(hint.minKg).toBe(fatigue?.minWeight);
    expect(hint.maxKg).toBe(fatigue?.maxWeight);
    expect(hint.presetKg).toBeUndefined();
    expect(hint.lastKg).toBeUndefined();
  });

  it('does not let imported history invent a heavier target', () => {
    const importedOnly = [1, 2, 3].map((index) =>
      session({
        id: `imp-${index}`,
        date: `2026-01-0${index}T12:00:00`,
        imported: true,
        exercises: [exerciseLog('squat', [oneSet(80, 5)])],
      }),
    );
    const fromImports = proposeSession({
      planned: [{ exerciseId: 'squat', targetWeight: 200 }],
      taxonomy,
      sessions: importedOnly,
    });
    expect(fromImports.exercises[0].weight).toEqual({
      autoFill: false,
      kind: 'last',
      lastKg: 80,
    });

    const mixed = proposeSession({
      planned: [{ exerciseId: 'squat', targetWeight: 200 }],
      taxonomy,
      sessions: [
        session({
          id: 'own',
          date: '2026-10-01T12:00:00',
          exercises: [exerciseLog('squat', [oneSet(60, 5)])],
        }),
        session({
          id: 'imported-later',
          date: '2026-10-28T12:00:00',
          imported: true,
          exercises: [exerciseLog('squat', [oneSet(150, 5)])],
        }),
      ],
    });
    expect(mixed.exercises[0].weight).toEqual({ autoFill: false, kind: 'last', lastKg: 60 });
  });
});

describe('onboarding goal mapping', () => {
  it('does not collapse 增肌 / 減脂 / 健康 onto one plan', () => {
    const beginner = (['muscle', 'fatloss', 'health'] as const).map((goal) =>
      recommendPlanId({ goal, experience: 'beginner' }),
    );
    expect(new Set(beginner).size).toBeGreaterThanOrEqual(2);
    expect(explainPlan({ goal: 'muscle', experience: 'beginner' })).toContain('三大項');
    expect(explainPlan({ goal: 'muscle', experience: 'experienced', freq: '1' })).toContain('每週 1 次');
    expect(freqBucketFromWeeklyAverage(1.4)).toBe('1');
    expect(freqBucketFromWeeklyAverage(1.5)).toBe('2');
    expect(freqBucketFromWeeklyAverage(2.4)).toBe('2');
    expect(freqBucketFromWeeklyAverage(2.5)).toBe('3-4');
    expect(freqBucketFromWeeklyAverage(3.2)).toBe('3-4');
    expect(freqBucketFromWeeklyAverage(5)).toBe('5+');
    const now = new Date('2026-11-02T12:00:00.000Z');
    const windowStart = now.getTime() - 8 * WEEK_MS;
    const dense = Array.from({ length: 25 }, (_, index) =>
      session({
        id: `dense-${index}`,
        date: new Date(windowStart + index * DAY_MS).toISOString(),
      }),
    );
    expect(freqBucketFromRecentSessions(dense, now)).toBe('3-4');
    expect(
      freqBucketFromRecentSessions(
        [session({ id: 'once', date: new Date(now.getTime() - 3 * WEEK_MS).toISOString() })],
        now,
      ),
    ).toBe('1');
    expect(freqBucketFromRecentSessions([], now)).toBeNull();
    for (const freq of ['1', '2', '3-4', '5+'] as const) {
      const ids = (['muscle', 'fatloss', 'health'] as const).map((goal) =>
        recommendPlanId({ goal, experience: 'experienced', freq }),
      );
      expect(new Set(ids).size).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('registry snapshot', () => {
  it('round-trips export and import, and still accepts a legacy flat file', () => {
    const repo = createMemoryLogRepository({
      'ironpulse-profile': JSON.stringify({
        state: { goal: 'muscle', weeklyGoal: 4, sessionMinutes: 45, avoidList: [] },
        version: 9,
      }),
      'vivix-cardio-v1': JSON.stringify({ state: { sessions: [{ id: 'c1' }] }, version: 1 }),
      'ironpulse-trial': JSON.stringify({ state: { currentStage: 0 }, version: 6 }),
      'unrelated-key': 'keep-me',
    });
    const now = new Date('2026-11-02T00:00:00.000Z');
    const snapshot = exportSnapshot(repo, now);
    expect(snapshot.vivixSnapshotVersion).toBe(1);
    expect(snapshot.keys['ironpulse-profile']).toMatchObject({
      state: { goal: 'muscle', weeklyGoal: 4 },
    });
    const removed = clearFactKeys(repo);
    expect(removed).toEqual(expect.arrayContaining([
      'ironpulse-profile',
      'vivix-cardio-v1',
      'ironpulse-trial',
    ]));
    expect(repo.read('unrelated-key')).toBe('keep-me');
    expect(repo.read('ironpulse-profile')).toBeNull();

    const imported = importSnapshot(repo, snapshot);
    expect(imported.ok).toBe(true);
    expect(exportSnapshot(repo, now).keys).toEqual(snapshot.keys);

    const legacy = createMemoryLogRepository();
    const legacyResult = importSnapshot(legacy, {
      'ironpulse-workouts': { state: { sessions: [{ id: 'old', imported: true }] }, version: 11 },
      note: 'ignore me',
    });
    expect(legacyResult.ok).toBe(true);
    expect(JSON.parse(legacy.read('ironpulse-workouts') ?? '{}')).toMatchObject({
      state: { sessions: [{ id: 'old', imported: true }] },
    });
    expect(legacy.read('note')).toBeNull();

    const loaded = loadCoachContext(repo, now);
    expect(loaded.goal).toBe('muscle');
    expect(loaded.weeklyDays).toBe(4);
    expect(loaded.sessionMinutes).toBe(45);
  });

  it('lists every known fact key', () => {
    for (const key of FACT_KEYS) expect(isFactKey(key)).toBe(true);
    expect(FACT_KEYS).toEqual(expect.arrayContaining([
      'ironpulse-workouts',
      'ironpulse-profile',
      'ironpulse-theme',
      'ironpulse-achievements',
      'ironpulse-trial',
      'vivix-cardio-v1',
      'vivix-body-metrics-v1',
      'vivix-rest-days-v1',
      'vivix-plans-store-v1',
      'vivix-partner-store-v1',
      'vivix-quest-store-v1',
      'vivix-telemetry-store-v1',
      'vivix-social-store-v1',
      'vivix-feature-flags-v1',
      'vivix-fx-enabled',
      'vivix-motion-enabled',
      'vivix-equipment-memory',
    ]));
  });
});

describe('trial routing', () => {
  it('keeps progress and past sessions open after expiry', () => {
    expect(isHistoryRoute('/progress')).toBe(true);
    expect(isHistoryRoute('/workout/summary')).toBe(true);
    expect(routeStaysOpenWhenExpired('/progress')).toBe(true);
    expect(routeStaysOpenWhenExpired('/workout/summary')).toBe(true);
    expect(routeStaysOpenWhenExpired('/settings')).toBe(true);
    expect(routeStaysOpenWhenExpired('/')).toBe(true);
    expect(routeStaysOpenWhenExpired('/not-a-vivix-page')).toBe(false);
  });
});

describe('domain boundary', () => {
  it('does not import React, Zustand, or react-dom', () => {
    const root = path.resolve('src/domain');
    const files = walk(root).filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const imports = readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => line.trimStart().startsWith('import '))
        .join('\n');
      expect(imports.includes("from 'react'") || imports.includes('from "react"')).toBe(false);
      expect(imports.toLowerCase().includes('zustand')).toBe(false);
      expect(imports.includes('react-dom')).toBe(false);
    }
  });
});

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}
