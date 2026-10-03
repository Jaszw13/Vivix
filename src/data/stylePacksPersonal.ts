/**
 * Personal-only StylePacks（S5 release gate）
 *
 * 此模組僅在非 production build 被打包；
 * production 下 STYLE_PACKS 的三元表達式 false branch 被消除，
 * Rollup 連帶 tree-shake 整個模組（含 Kawaii Pastel 色碼與素材）。
 *
 * 版權：Kawaii Pastel 素材含 Sanrio（My Melody、Hangyodon）與第三方 IP，
 * 僅供個人使用，不得散布、商用或納入 release build。
 */
import type { StylePack } from '@/types/theme';
import { buildVars, SYSTEM_SANS, SYSTEM_MONO, SYSTEM_ROUNDED, SYSTEM_BUBBLE } from './stylePacksShared';
import { getKawaiiAssets } from '@/themes/personal/resolveAssets';

// 個人款 CSS（hover／btn／card 規則）僅在非 production 載入。
// production 下整個 stylePacksPersonal 模組被 tree-shake，此 import 一併消除，
// release 閘門 grep "kawaii" dist/ = 0。
if (import.meta.env.VITE_RELEASE_MODE !== 'production') {
  import('@/themes/personal/personal.css');
}

export const PERSONAL_PACKS: StylePack[] = [
  // Kawaii Pastel — 可愛粉彩（強制亮色，light-only）
  {
    id: 'kawaii-pastel',
    label: '粉彩甜心',
    license: 'personal-only',
    mode: 'light-only',
    vars: buildVars('#FDF7F2', '#F5EBE3', '#FFFFFF', '#5A4A4A', '#A08A8A', '#C8B8B8', '#6FB5A0', '#F2B8CD', '#E8DCD0'),
    shape: { radiusCard: '28px', radiusBtn: '24px', borderWidth: '1px', shadow: 'soft' },
    typo: { display: SYSTEM_BUBBLE, body: SYSTEM_ROUNDED, numbers: SYSTEM_MONO },
    deco: ['polka', 'rays'],
    assets: getKawaiiAssets() ?? undefined,
    motion: { transition: 'jelly', hover: 'squish', clickFx: 'stars' },
  },
];
