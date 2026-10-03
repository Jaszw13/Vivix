/**
 * 全域點擊特效監聽（P-FIX-2）
 *
 * 讓所有可點擊元素（button / a[href] / [role=button] / [data-fx-trigger]）
 * 都觸發 clickFx，不限共用 Button。
 *
 * 三重過濾：
 * 1. 只回應主要滑鼠鍵（e.button === 0）
 * 2. 白名單：目標必須是可點擊元素（closest FX_TRIGGER_SELECTOR）
 * 3. 黑名單：輸入框 / Slider / contenteditable / [data-fx-off] 一律排除
 *
 * 用 click 而非 pointerdown：行動裝置上 pointerdown 會在「手指按下開始捲動」時觸發。
 */
import { spawnClickFxType } from './clickFx';
import { getStylePack } from '@/data/stylePacks';

/** 白名單：只有真正可點擊的元素才觸發 */
const FX_TRIGGER_SELECTOR = [
  'button',
  '[role="button"]',
  'a[href]',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  '[data-fx-trigger]',
].join(',');

/** 黑名單：輸入類一律排除；data-fx-off 為個別元素的退出開關 */
const FX_EXCLUDE_SELECTOR = [
  'input:not([type="button"]):not([type="submit"]):not([type="reset"])',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[data-fx-off]',
].join(',');

export function installClickFxListener(): () => void {
  const handler = (e: MouseEvent) => {
    if (document.documentElement.getAttribute('data-fx') === 'off') return;
    if (e.button !== 0) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (!target.closest(FX_TRIGGER_SELECTOR)) return;
    if (target.closest(FX_EXCLUDE_SELECTOR)) return;

    const packId = document.documentElement.getAttribute('data-pack');
    if (!packId) return;
    const pack = getStylePack(packId);
    if (!pack || pack.motion.clickFx === 'none') return;

    spawnClickFxType(e.clientX, e.clientY, pack.motion.clickFx);
  };

  document.addEventListener('click', handler);
  return () => document.removeEventListener('click', handler);
}
