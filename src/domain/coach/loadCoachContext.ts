import type { WorkoutSession } from '@/types';
import type { LogRepository } from '@/domain/storage/logRepository';
import { buildCoachContext, defaultSessionMinutes, sanitizeAvoid } from './buildCoachContext';
import type { AvoidEntry, CoachContext, TrainingGoal } from './types';

/**
 * 教練快照的儲存轉接。
 * 讀的是 Zustand 今天寫進儲存體的同一把鑰匙：
 * `ironpulse-profile`、`ironpulse-workouts`。
 * 不 import React / Zustand。網頁把 LogRepository 傳進來；測試用記憶體實作。
 */
export function loadCoachContext(repo: LogRepository, now = new Date()): CoachContext {
  const profile = unwrapState(repo.read('ironpulse-profile'));
  const workouts = unwrapState(repo.read('ironpulse-workouts'));
  const sessions = Array.isArray(workouts.sessions)
    ? (workouts.sessions as WorkoutSession[])
    : [];
  return buildCoachContext({
    goal: parseGoal(profile.goal),
    weeklyDays: typeof profile.weeklyGoal === 'number' ? profile.weeklyGoal : 3,
    sessionMinutes:
      typeof profile.sessionMinutes === 'number'
        ? profile.sessionMinutes
        : defaultSessionMinutes(),
    equipmentIds: stringList(profile.gymEquipmentIds),
    avoid: sanitizeAvoid(profile.avoidList as AvoidEntry[] | undefined),
    sessions,
    now,
  });
}

function unwrapState(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const record = parsed as Record<string, unknown>;
    if (record.state && typeof record.state === 'object') {
      return record.state as Record<string, unknown>;
    }
    return record;
  } catch {
    return {};
  }
}

function parseGoal(value: unknown): TrainingGoal | null {
  if (value === 'muscle' || value === 'fatloss' || value === 'health') return value;
  return null;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}
