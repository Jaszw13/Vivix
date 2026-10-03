/**
 * 點擊特效 spawner（P-FIX-0-C 動態人格層）
 *
 * spawnClickFxType(x, y, type)：依 clickFx 類型在 (x,y) 建立粒子 DOM，
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

function spawnParticle(x: number, y: number, type: PackClickFx): void {
  if (!isFxEnabled() || activeCount >= MAX_PARTICLES) return;

  const el = document.createElement('div');
  el.className = `vivix-fx vivix-fx-${type}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.position = 'fixed';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '9999';
  el.style.transform = 'translate(-50%, -50%)';

  const count = type === 'confetti' ? 8 : type === 'stars' || type === 'hearts' ? 5 : 4;

  // 容器先掛載（在迴圈外，只掛一次）
  document.body.appendChild(el);

  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.style.position = 'absolute';
    p.style.left = '0';
    p.style.top = '0';

    // 每顆粒子獨立擴散角度與距離（修正全部重疊）
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const dist = 22 + Math.random() * 18;
    p.style.setProperty('--fx-dx', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--fx-dy', `${Math.sin(angle) * dist - 12}px`);

    el.appendChild(p);
  }

  activeCount += 1;
  el.addEventListener('animationend', () => {
    el.remove();
    activeCount = Math.max(0, activeCount - 1);
  });
}

/**
 * 明確指定 clickFx 類型的 spawn（對外唯一入口）。
 */
export function spawnClickFxType(x: number, y: number, type: PackClickFx): void {
  if (type === 'none') return;
  spawnParticle(x, y, type);
}
