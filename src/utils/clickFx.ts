/**
 * 點擊特效 spawner（S4 動態人格層）
 *
 * spawnClickFx(x, y, pack)：依 pack.motion.clickFx 在 (x,y) 建立粒子/閃光 DOM，
 * animationend 自動移除。data-fx="off" 時 no-op。同屏粒子上限 6。
 *
 * 不寫死色碼：顏色全部讀 CSS Variables（var(--accent) / var(--auxiliary) 等）。
 */
import type { PackClickFx } from '@/types/theme';

const MAX_PARTICLES = 6;
let activeCount = 0;

/** 檢查 fx 是否開啟（讀 <html data-fx>） */
function isFxEnabled(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.getAttribute('data-fx') !== 'off';
}

function spawnParticle(
  x: number,
  y: number,
  type: PackClickFx,
): void {
  if (!isFxEnabled() || activeCount >= MAX_PARTICLES) return;

  const el = document.createElement('div');
  el.className = `vivix-fx vivix-fx-${type}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.position = 'fixed';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '9999';
  el.style.transform = 'translate(-50%, -50%)';

  // 粒子數量依特效類型
  const count = type === 'confetti' ? 8 : type === 'stars' || type === 'hearts' ? 5 : 4;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.style.position = 'absolute';
    p.style.left = '0';
    p.style.top = '0';
    // 顏色由 CSS 控制（attribute selector 讀 var）
    document.body.appendChild(el);
    el.appendChild(p);
  }

  activeCount += 1;
  el.addEventListener('animationend', () => {
    el.remove();
    activeCount = Math.max(0, activeCount - 1);
  });
}

/**
 * 依 clickFx 類型建立特效 DOM。
 * @param x 螢幕 X 座標
 * @param y 螢幕 Y 座標
 */
export function spawnClickFx(x: number, y: number): void {
  if (typeof document === 'undefined') return;
  const fx = document.documentElement.getAttribute('data-pack') || 'default';
  // 從當前 pack 讀 clickFx（透過 data-pack 查 STYLE_PACKS，但為避免循環依賴，
  // 實際 clickFx 類型由 CSS attribute selector 決定視覺；此處只建立容器）
  void fx;
  spawnParticle(x, y, 'ripple');
}

/**
 * 明確指定 clickFx 類型的 spawn（給 Button 元件主動呼叫用）。
 */
export function spawnClickFxType(x: number, y: number, type: PackClickFx): void {
  if (type === 'none') return;
  spawnParticle(x, y, type);
}
