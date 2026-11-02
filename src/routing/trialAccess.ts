/**
 * 試用到期後仍要開著的路徑。
 * 教練建議（今日點練）不是獨立路由，由首頁自己收起。
 * 沒列在這裡的未知路徑維持鎖定，避免新頁面默默繞過。
 */
const OPEN_EXACT = new Set([
  '/',
  '/onboarding',
  '/progress',
  '/settings',
  '/achievements',
  '/plans',
  '/workout',
  '/workout/summary',
  '/exercises',
  '/partner',
]);

export function routeStaysOpenWhenExpired(pathname: string): boolean {
  const path = pathname.split('?')[0] || '/';
  if (OPEN_EXACT.has(path)) return true;
  if (path.startsWith('/plans/')) return true;
  if (path.startsWith('/exercises/')) return true;
  if (path.startsWith('/workout/')) return true;
  return false;
}

/** 進度與舊訓練紀錄。到期後必須進得去。 */
export function isHistoryRoute(pathname: string): boolean {
  const path = pathname.split('?')[0] || '/';
  return path === '/progress' || path === '/workout/summary' || path.startsWith('/workout/');
}
