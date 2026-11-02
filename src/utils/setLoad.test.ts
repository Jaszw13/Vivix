import { describe, expect, it } from 'vitest';
import type { ExerciseLog, SetLog, WorkoutSession } from '@/types';
import {
  formatRecordLoad,
  formatSetCompact,
  formatSetLoadLabel,
  formatSetWithReps,
  getSessionPRs,
  sanitizeSessionLoads,
  sanitizeSetLoad,
  setLoadKg,
} from './workout';

function set(partial: Partial<SetLog> & Pick<SetLog, 'weight' | 'reps'>): SetLog {
  return {
    id: `set-${partial.weight}-${partial.reps}-${partial.load ?? 'abs'}`,
    setNumber: 1,
    completed: true,
    ...partial,
  };
}

function session(exercises: ExerciseLog[]): WorkoutSession {
  return {
    id: 'session-1',
    date: '2026-11-02T12:00:00',
    warmupCompletedIds: [],
    duration: 0,
    totalVolume: 0,
    exercises,
  };
}

describe('set load', () => {
  it('keeps a missing load as absolute kilograms', () => {
    expect(formatSetLoadLabel({ weight: 60 })).toBe('60kg');
    expect(formatSetWithReps({ weight: 60, reps: 5 })).toBe('60kg × 5');
    expect(formatSetCompact({ weight: 60, reps: 5 })).toBe('60×5');
    expect(setLoadKg({ weight: 60, reps: 5, drops: [{ weight: 40, reps: 3 }] })).toBe(60 * 5 + 40 * 3);
  });

  it('keeps a legacy zero-weight set on the existing bodyweight label without adding body mass', () => {
    expect(formatSetLoadLabel({ weight: 0 })).toBe('BW');
    expect(formatSetCompact({ weight: 0, reps: 8 })).toBe('BW×8');
    expect(setLoadKg({ weight: 0, reps: 8 })).toBe(0);
  });

  it('renders pure BW and BW plus extra kilograms, and only counts the extra', () => {
    expect(formatSetLoadLabel({ weight: 0, load: 'bw' })).toBe('BW');
    expect(formatSetLoadLabel({ weight: 10, load: 'bw' })).toBe('BW+10');
    expect(formatSetLoadLabel({ weight: 2.5, load: 'bw' })).toBe('BW+2.5');
    expect(formatSetWithReps({ weight: 10, reps: 5, load: 'bw' })).toBe('BW+10 × 5');
    expect(formatSetCompact({ weight: 10, reps: 5, load: 'bw' })).toBe('BW+10×5');
    expect(setLoadKg({ weight: 0, reps: 12, load: 'bw' })).toBe(0);
    expect(
      setLoadKg({
        weight: 10,
        reps: 5,
        load: 'bw',
        drops: [{ weight: 5, reps: 3 }],
      }),
    ).toBe(10 * 5 + 5 * 3);
  });

  it('drops unknown load values and leaves the stored kilograms alone', () => {
    const dirty = sanitizeSetLoad({
      id: 'a',
      setNumber: 1,
      weight: 40,
      reps: 5,
      completed: true,
      load: 'chain' as unknown as SetLog['load'],
    });
    expect(dirty.load).toBeUndefined();
    expect(dirty.weight).toBe(40);

    const kept = sanitizeSetLoad(set({ weight: 0, reps: 8, load: 'bw' }));
    expect(kept.load).toBe('bw');
    expect(kept.weight).toBe(0);

    const sessionIn = session([
      {
        id: 'ex',
        exerciseId: 'squat',
        name: '深蹲',
        sets: [
          {
            id: 'bad',
            setNumber: 1,
            weight: 100,
            reps: 3,
            completed: true,
            load: 'extra' as unknown as SetLog['load'],
          },
        ],
      },
    ]);
    const cleaned = sanitizeSessionLoads(sessionIn);
    expect(cleaned.exercises[0].sets[0].load).toBeUndefined();
    expect(cleaned.exercises[0].sets[0].weight).toBe(100);
  });

  it('keeps pure bodyweight on the rep PR path and scores BW+extra like that many kilograms', () => {
    const prs = getSessionPRs(
      session([
        {
          id: 'pull',
          exerciseId: 'pull-up',
          name: '引體向上',
          sets: [set({ weight: 0, reps: 12, load: 'bw' })],
        },
        {
          id: 'pull-chain',
          exerciseId: 'pull-up-chain',
          name: '負重引體',
          sets: [set({ weight: 10, reps: 5, load: 'bw' })],
        },
        {
          id: 'bench',
          exerciseId: 'bench-press',
          name: '臥推',
          sets: [set({ weight: 100, reps: 5 })],
        },
        {
          id: 'legacy',
          exerciseId: 'dip',
          name: '雙槓臂屈伸',
          sets: [set({ weight: 0, reps: 8 })],
        },
      ]),
    );

    const pure = prs.find((pr) => pr.exerciseId === 'pull-up-bw');
    expect(pure?.repPR).toBe(12);
    expect(pure?.weight).toBe(0);
    expect(pure?.estimated1RM).toBe(0);
    expect(formatRecordLoad(pure!)).toBe('BW × 12');

    const extra = prs.find((pr) => pr.exerciseId === 'pull-up-chain');
    expect(extra?.load).toBe('bw');
    expect(extra?.weight).toBe(10);
    expect(extra?.repPR).toBeUndefined();
    expect(extra?.estimated1RM).toBe(12);
    expect(formatRecordLoad(extra!)).toBe('BW+10 × 5');

    const bench = prs.find((pr) => pr.exerciseId === 'bench-press');
    expect(bench?.load).toBeUndefined();
    expect(bench?.weight).toBe(100);
    expect(bench?.estimated1RM).toBe(117);
    expect(formatRecordLoad(bench!)).toBe('100kg × 5');

    const legacy = prs.find((pr) => pr.exerciseId === 'dip-bw');
    expect(legacy?.repPR).toBe(8);
    expect(formatRecordLoad(legacy!)).toBe('BW × 8');
  });

  it('does not mark a heavier absolute set as bodyweight just because another set is', () => {
    const prs = getSessionPRs(
      session([
        {
          id: 'squat',
          exerciseId: 'squat',
          name: '深蹲',
          sets: [
            set({ weight: 100, reps: 5 }),
            set({ weight: 20, reps: 8, load: 'bw' }),
          ],
        },
      ]),
    );
    expect(prs).toHaveLength(1);
    expect(prs[0].weight).toBe(100);
    expect(prs[0].load).toBeUndefined();
  });
});
