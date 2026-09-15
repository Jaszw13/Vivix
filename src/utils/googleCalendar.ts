/**
 * Google Calendar 單向 template-URL 匯出（G-1）
 *
 * 純函數；無 OAuth、無後端、無網路請求。
 * 產出的 URL 由呼叫端 `window.open(url, '_blank', 'noopener')` 開啟。
 *
 * 時間格式：
 *   - 有 startedAt/finishedAt → 本地浮動區間（YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS，無 Z）
 *   - 無時間戳 → 全日事件（YYYYMMDD/YYYYMMDD，day+1）
 */
import type { WorkoutSession } from '@/types';
import { dayKey, addDays } from '@/utils/time';
import { estimateStrengthKcal } from '@/features/stats/energy';
import type { CustomExercise } from '@/store/workoutStore';

/** 本地浮動時間格式化（無 Z） */
export function gcalLocalTime(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  return `${y}${m}${dd}T${hh}${mm}${ss}`;
}

/** 全日事件日期格式化 */
function gcalAllDayDate(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${y}${m}${dd}`;
}

export interface GCalPayload {
  title: string;
  start: Date | null;
  end: Date | null;
  allDayDate?: string;
  details: string[];
}

/**
 * 構建 Google Calendar template URL
 * 全參數 encodeURIComponent 編碼
 */
export function buildGCalUrl(p: GCalPayload): string {
  const params = new URLSearchParams();
  params.set('action', 'TEMPLATE');
  params.set('text', p.title);

  if (p.start && p.end) {
    // 本地浮動區間
    params.set('dates', `${gcalLocalTime(p.start)}/${gcalLocalTime(p.end)}`);
  } else if (p.allDayDate) {
    // 全日事件：day ~ day+1
    const base = new Date(p.allDayDate);
    const next = addDays(base, 1);
    params.set('dates', `${gcalAllDayDate(base)}/${gcalAllDayDate(next)}`);
  }

  params.set('details', p.details.join('\n'));

  return `https://www.google.com/calendar/render?${params.toString()}`;
}

/**
 * 將 WorkoutSession 轉為 GCal payload
 *
 * details 內容（依規格）：
 *   1. 計畫：${planName}・${dayName}（無則「自由訓練」）
 *   2. 動作：${names.join('、')}（不含重量）
 *   3. 熱量：≈ ${kcal} kcal（imported session 寫「—」）
 *   4. via Vivix
 */
export function sessionToGCalPayload(
  session: WorkoutSession,
  ctx: {
    planName?: string | null;
    dayName?: string | null;
    kcal?: number | null;
  },
): GCalPayload {
  const dayName = ctx.dayName ?? session.dayName ?? null;
  const planName = ctx.planName ?? session.planName ?? null;

  const title = `Vivix · ${dayName ?? '自由訓練'}`;

  // 計畫行
  const planLine = planName
    ? `計畫：${planName}・${dayName ?? '自由訓練'}`
    : '自由訓練';

  // 動作名（不含重量）
  const exerciseNames = session.exercises.map((ex) => ex.name);
  const exerciseLine = exerciseNames.length > 0
    ? `動作：${exerciseNames.join('、')}`
    : '動作：—';

  // 熱量
  const kcalLine = ctx.kcal != null
    ? `熱量：≈ ${ctx.kcal} kcal`
    : '熱量：—';

  const details = [planLine, exerciseLine, kcalLine, 'via Vivix'];

  // 時間：有 startedAt/finishedAt → 本地浮動區間；否則全日事件
  let start: Date | null = null;
  let end: Date | null = null;
  let allDayDate: string | undefined;

  if (session.startedAt && session.finishedAt) {
    start = new Date(session.startedAt);
    end = new Date(session.finishedAt);
  } else {
    // 全日事件：用 dayKey(session.date) 作為日期
    allDayDate = dayKey(new Date(session.date));
  }

  return { title, start, end, allDayDate, details };
}

/**
 * 便捷：直接從 session + 上下文構建 GCal URL
 */
export function buildSessionGCalUrl(
  session: WorkoutSession,
  customExercises: CustomExercise[],
  bodyWeight: number | null,
): string {
  const energyResult = estimateStrengthKcal(session, customExercises, bodyWeight);
  const kcal = session.imported ? null : (energyResult?.kcal ?? null);

  const payload = sessionToGCalPayload(session, {
    planName: session.planName,
    dayName: session.dayName,
    kcal,
  });

  return buildGCalUrl(payload);
}
