/**
 * Vivix 8 款 Core StylePack 定義（S1 + S2）
 *
 * 色碼僅存在於此檔與 stylePacksPersonal.ts，透過 themeStore.setPack() 動態注入 CSS Variables。
 * components/pages 內禁止出現 hex（Hex Gate = 0）。
 *
 * S5 Release gate：personal-only packs 放在 stylePacksPersonal.ts，
 * production build 下三元表達式 false branch 被消除，Rollup tree-shake 整個模組。
 */
import type { StylePack, PackShadow } from '@/types/theme';
import {
  buildVars,
  shadowFor,
  SYSTEM_SANS,
  SYSTEM_SERIF,
  SYSTEM_SLAB,
  SYSTEM_MONO,
  SYSTEM_ROUNDED,
  SYSTEM_GEOMETRIC,
  SYSTEM_BUBBLE,
  SYSTEM_STENCIL,
  SYSTEM_CHROME,
} from './stylePacksShared';
import { PERSONAL_PACKS } from './stylePacksPersonal';

const isProduction = import.meta.env.VITE_RELEASE_MODE === 'production';

// 8 款 Core（恆常打包，release-safe）
export const CORE_PACKS: StylePack[] = [
  // 1. Elegant Beige — 高雅米白
  {
    id: 'elegant-beige',
    label: '高雅米白',
    license: 'core',
    mode: 'light',
    vars: buildVars('#F8F5F0', '#F0ECE4', '#FFFFFF', '#2C2B28', '#7A756D', '#A8A39A', '#C9A96E', '#E8A87C', '#E5DFD4'),
    shape: { radiusCard: '16px', radiusBtn: '12px', borderWidth: '1px', shadow: 'soft' },
    typo: { display: SYSTEM_SERIF, body: SYSTEM_SANS, numbers: SYSTEM_MONO },
    deco: ['none'],
    motion: { transition: 'smooth', hover: 'lift', clickFx: 'shimmer' },
  },
  // 2. Industrial Power — 工業電力
  {
    id: 'industrial-power',
    label: '工業電力',
    license: 'core',
    mode: 'dark',
    vars: buildVars('#0A0A0B', '#1C1C1E', '#2C2C2E', '#FFFFFF', '#8E8E93', '#6E6E73', '#D4FF00', '#FF6B35', '#3A3A3C'),
    shape: { radiusCard: '4px', radiusBtn: '4px', borderWidth: '2px', shadow: 'none' },
    typo: { display: SYSTEM_STENCIL, body: SYSTEM_SANS, numbers: SYSTEM_MONO },
    deco: ['grid'],
    motion: { transition: 'snappy', hover: 'glow', clickFx: 'glitch' },
  },
  // 3. Retro Card — 90s 復古球員卡
  {
    id: 'retro-card',
    label: '復古球員卡',
    license: 'core',
    mode: 'light',
    vars: buildVars('#F2EBD9', '#E8DFC8', '#FBF6E6', '#1A1A1A', '#5A4A3A', '#8A7A6A', '#C99A2E', '#7C2D12', '#1A1A1A'),
    shape: { radiusCard: '2px', radiusBtn: '2px', borderWidth: '3px', shadow: 'hard' },
    typo: { display: SYSTEM_SLAB, body: SYSTEM_SANS, numbers: SYSTEM_CHROME },
    deco: ['halftone', 'starburst'],
    motion: { transition: 'flip', hover: 'emboss', clickFx: 'holo' },
  },
  // 4. Aurora Glass — 極光玻璃（Apple HIG）
  {
    id: 'aurora-glass',
    label: '極光玻璃',
    license: 'core',
    mode: 'dark',
    vars: buildVars('#0B1026', '#131A3A', '#1A2247', '#E8ECFF', '#9AA3C7', '#6B7399', '#4FD1C5', '#A78BFA', '#2A3566'),
    shape: { radiusCard: '20px', radiusBtn: '16px', borderWidth: '1px', shadow: 'glass' },
    typo: { display: SYSTEM_SANS, body: SYSTEM_SANS, numbers: SYSTEM_MONO },
    deco: ['none'],
    glass: true,
    motion: { transition: 'spring', hover: 'scale', clickFx: 'ripple' },
  },
  // 5. Neobrutal Pop — 新野蠻普普
  {
    id: 'neobrutal-pop',
    label: '新野蠻普普',
    license: 'core',
    mode: 'light',
    vars: buildVars('#FFFFFF', '#F5F5F0', '#FFFFFF', '#1A1A1A', '#555555', '#999999', '#FFD02E', '#FF7AC3', '#1A1A1A'),
    shape: { radiusCard: '0px', radiusBtn: '0px', borderWidth: '2px', shadow: 'hard' },
    typo: { display: SYSTEM_SANS, body: SYSTEM_SANS, numbers: SYSTEM_MONO },
    deco: ['none'],
    motion: { transition: 'instant', hover: 'shadow-collapse', clickFx: 'confetti' },
  },
  // 6. Muji Calm — 無印靜謐
  {
    id: 'muji-calm',
    label: '無印靜謐',
    license: 'core',
    mode: 'light',
    vars: buildVars('#F7F5F1', '#EFEAE2', '#FFFFFF', '#3A3A38', '#7A7A76', '#A8A8A2', '#B0653F', '#8A9A7A', '#E0DCD4'),
    shape: { radiusCard: '4px', radiusBtn: '4px', borderWidth: '1px', shadow: 'none' },
    typo: { display: SYSTEM_SANS, body: SYSTEM_SANS, numbers: SYSTEM_MONO },
    deco: ['none'],
    motion: { transition: 'slow-fade', hover: 'opacity', clickFx: 'none' },
  },
  // 7. Y2K Chrome — Y2K 鉻金
  {
    id: 'y2k-chrome',
    label: 'Y2K 鉻金',
    license: 'core',
    mode: 'light',
    vars: buildVars('#E8EEF5', '#D8E2F0', '#F0F4FA', '#2A3A5A', '#6A7A9A', '#9AA8C0', '#6EC1FF', '#FF6EC7', '#B8C8E0'),
    shape: { radiusCard: '999px', radiusBtn: '999px', borderWidth: '1px', shadow: 'soft' },
    typo: { display: SYSTEM_BUBBLE, body: SYSTEM_SANS, numbers: SYSTEM_CHROME },
    deco: ['starburst'],
    motion: { transition: 'elastic', hover: 'inflation', clickFx: 'sparkle' },
  },
  // 8. WPA Trail — 山徑戶外
  {
    id: 'wpa-trail',
    label: '山徑戶外',
    license: 'core',
    mode: 'light',
    vars: buildVars('#EAE0CC', '#DDD2B8', '#F5EFE0', '#2A2A28', '#6A6458', '#9A9488', '#24493A', '#D96F32', '#C8BCA0'),
    shape: { radiusCard: '12px', radiusBtn: '8px', borderWidth: '2px', shadow: 'soft' },
    typo: { display: SYSTEM_GEOMETRIC, body: SYSTEM_SANS, numbers: SYSTEM_MONO },
    deco: ['none'],
    motion: { transition: 'stamp', hover: 'stamp-press', clickFx: 'stamp' },
  },
];

/**
 * 正式發行版過濾 personal-only：
 * isProduction 為 true 時，Rollup 消除 false branch，
 * stylePacksPersonal.ts 整模組被 tree-shake（Hello Kitty / Kawaii 色碼與裝飾不進 bundle）。
 */
export const STYLE_PACKS: StylePack[] = isProduction
  ? CORE_PACKS
  : [...CORE_PACKS, ...PERSONAL_PACKS];

/**
 * 依 id 查 StylePack；找不到回 null
 */
export function getStylePack(id: string): StylePack | null {
  return STYLE_PACKS.find((p) => p.id === id) ?? null;
}

/**
 * 依 PackShadow 取得 card/button shadow 值
 */
export function packShadows(kind: PackShadow): { card: string; button: string } {
  return shadowFor(kind);
}
