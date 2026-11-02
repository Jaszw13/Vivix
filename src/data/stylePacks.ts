/**
 * Vivix 6 款 Core StylePack。
 *
 * 高雅米白、工業電力維持不變。其餘四款是日常可穿的記錄器，
 * 不是戲服：素白紙本、清晨水岸、舊式鐵館、深夜銅燈。
 * 已移除的 id（retro-card、aurora-glass、neobrutal-pop、muji-calm、
 * y2k-chrome、wpa-trail）由 themeStore 落回高雅米白。
 *
 * 色碼僅存在於此檔與 stylePacksPersonal.ts，透過 themeStore.setPack() 動態注入 CSS Variables。
 * components/pages 內禁止出現 hex（Hex Gate = 0）。
 *
 * 強調色同時當文字和小按鈕底。淺色包用深色強調，深色包用亮色強調，
 * 這樣「字在底上」和「底色字在按鈕上」才讀得清楚。
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
  SYSTEM_MONO,
  SYSTEM_STENCIL,
} from './stylePacksShared';
import { PERSONAL_PACKS } from './stylePacksPersonal';

const isProduction = import.meta.env.VITE_RELEASE_MODE === 'production';

// 6 款 Core（恆常打包，release-safe）
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
  // 3. Plain Paper — 素白紙本。冷白、墨藍，給不想要風格的人。
  {
    id: 'plain-paper',
    label: '素白紙本',
    license: 'core',
    mode: 'light',
    vars: buildVars('#F7F8FA', '#ECEEF2', '#FFFFFF', '#1B1E23', '#4A5160', '#626A78', '#1E3A5F', '#8A5A44', '#D5D9E0'),
    shape: { radiusCard: '12px', radiusBtn: '10px', borderWidth: '1px', shadow: 'soft' },
    typo: { display: SYSTEM_SANS, body: SYSTEM_SANS, numbers: SYSTEM_MONO },
    deco: ['none'],
    motion: { transition: 'smooth', hover: 'lift', clickFx: 'shimmer' },
  },
  // 4. Dawn Shore — 清晨水岸。冷綠紙、深水綠，給健康／恢復那條路。
  {
    id: 'dawn-shore',
    label: '清晨水岸',
    license: 'core',
    mode: 'light',
    vars: buildVars('#F3F7F6', '#E5EFEC', '#FFFFFF', '#1A2C2A', '#3E5C56', '#547068', '#0E5C4A', '#C46B3A', '#D3E2DC'),
    shape: { radiusCard: '16px', radiusBtn: '12px', borderWidth: '1px', shadow: 'soft' },
    typo: { display: SYSTEM_SANS, body: SYSTEM_SANS, numbers: SYSTEM_MONO },
    deco: ['none'],
    motion: { transition: 'slow-fade', hover: 'opacity', clickFx: 'ripple' },
  },
  // 5. Iron Hall — 舊式鐵館。石膏牆、鐵紅，白天的健身房，不是螢光。
  {
    id: 'iron-hall',
    label: '舊式鐵館',
    license: 'core',
    mode: 'light',
    vars: buildVars('#F4F0E8', '#E8E0D2', '#FFFCF7', '#241C18', '#5A4C44', '#746658', '#7A1A16', '#C4A574', '#D9CFC2'),
    shape: { radiusCard: '8px', radiusBtn: '6px', borderWidth: '1px', shadow: 'none' },
    typo: { display: SYSTEM_SANS, body: SYSTEM_SANS, numbers: SYSTEM_MONO },
    deco: ['none'],
    motion: { transition: 'snappy', hover: 'lift', clickFx: 'shimmer' },
  },
  // 6. Night Copper — 深夜銅燈。暖黑、亮銅，高雅米白的夜版。
  {
    id: 'night-copper',
    label: '深夜銅燈',
    license: 'core',
    mode: 'dark',
    vars: buildVars('#161311', '#241F1B', '#2E2823', '#F7F1E8', '#D2C4B4', '#A89886', '#F0B56B', '#E07A4C', '#4A4038'),
    shape: { radiusCard: '14px', radiusBtn: '12px', borderWidth: '1px', shadow: 'soft' },
    typo: { display: SYSTEM_SERIF, body: SYSTEM_SANS, numbers: SYSTEM_MONO },
    deco: ['none'],
    motion: { transition: 'smooth', hover: 'glow', clickFx: 'shimmer' },
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
