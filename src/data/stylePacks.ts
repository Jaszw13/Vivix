/**
 * Vivix 14 款 StylePack 定義（S2 + S5）
 *
 * 色碼僅存在於此檔與 stylePacksPersonal.ts，透過 themeStore.setPack() 動態注入 CSS Variables。
 * components/pages 內禁止出現 hex（Hex Gate = 0）。
 *
 * S5 Release gate：personal-only packs 放在 stylePacksPersonal.ts，
 * production build 下三元表達式 false branch 被消除，Rollup tree-shake 整個模組。
 */
import type { StylePack, PackShadow } from '@/types/theme';
import { buildVars, shadowFor, SYSTEM_SANS, SYSTEM_SERIF, SYSTEM_SLAB, SYSTEM_MONO } from './stylePacksShared';
import { PERSONAL_PACKS } from './stylePacksPersonal';

const isProduction = import.meta.env.VITE_RELEASE_MODE === 'production';

// Core + Experimental（13 款，恆常打包）
const CORE_EXP_PACKS: StylePack[] = [
  // ============ Core ============
  {
    id: 'elegant-beige',
    label: '高雅米白',
    license: 'core',
    dark: false,
    vars: buildVars('#F8F5F0', '#F0ECE4', '#FFFFFF', '#2C2B28', '#7A756D', '#A8A39A', '#C9A96E', '#E8A87C', '#E5DFD4'),
    shape: { radiusCard: '16px', radiusBtn: '12px', shadow: 'soft' },
    typo: { display: SYSTEM_SERIF, body: SYSTEM_SANS, numbers: SYSTEM_MONO },
    deco: ['none'],
  },
  {
    id: 'industrial-power',
    label: '工業電力',
    license: 'core',
    dark: true,
    vars: buildVars('#0A0A0B', '#1C1C1E', '#2C2C2E', '#FFFFFF', '#8E8E93', '#6E6E73', '#D4FF00', '#FF6B35', '#3A3A3C'),
    shape: { radiusCard: '4px', radiusBtn: '4px', shadow: 'none' },
    typo: { display: 'Impact, "Arial Black", ' + SYSTEM_SANS, body: SYSTEM_SANS, numbers: SYSTEM_MONO },
    deco: ['none'],
  },
  {
    id: '90s-retro-card',
    label: '90s 復古卡',
    license: 'core',
    dark: false,
    vars: buildVars('#F2EBD9', '#E8DFC8', '#FBF6E6', '#1A1A1A', '#5A4A3A', '#8A7A6A', '#C99A2E', '#7C2D12', '#1A1A1A'),
    shape: { radiusCard: '2px', radiusBtn: '2px', shadow: 'hard' },
    typo: { display: SYSTEM_SLAB, body: SYSTEM_SANS, numbers: SYSTEM_SLAB },
    deco: ['halftone', 'starburst'],
  },
  {
    id: 'neobrutal-pop',
    label: '新野蠻普普',
    license: 'core',
    dark: false,
    vars: buildVars('#FFFFFF', '#F5F5F0', '#FFFFFF', '#1A1A1A', '#555555', '#999999', '#FFD02E', '#FF7AC3', '#1A1A1A'),
    shape: { radiusCard: '0px', radiusBtn: '0px', shadow: 'hard' },
    typo: { display: SYSTEM_SANS, body: SYSTEM_SANS, numbers: SYSTEM_MONO },
    deco: ['none'],
  },
  {
    id: 'aurora-glass',
    label: '極光玻璃',
    license: 'core',
    dark: true,
    vars: buildVars('#0B1026', '#131A3A', '#1A2247', '#E8ECFF', '#9AA3C7', '#6B7399', '#4FD1C5', '#A78BFA', '#2A3566'),
    shape: { radiusCard: '20px', radiusBtn: '16px', shadow: 'soft' },
    typo: { display: SYSTEM_SANS, body: SYSTEM_SANS, numbers: SYSTEM_MONO },
    deco: ['blob'],
  },
  {
    id: 'pastel-pal',
    label: '粉彩夥伴',
    license: 'core',
    dark: false,
    vars: buildVars('#FDF7F2', '#F5EBE3', '#FFFFFF', '#5A4A4A', '#A08A8A', '#C8B8B8', '#6FB5A0', '#F2B8CD', '#E8DCD0'),
    shape: { radiusCard: '28px', radiusBtn: '24px', shadow: 'soft' },
    typo: { display: SYSTEM_SANS, body: SYSTEM_SANS, numbers: SYSTEM_MONO },
    deco: ['blob'],
  },
  {
    id: 'neon-gym',
    label: '霓虹健身',
    license: 'core',
    dark: true,
    vars: buildVars('#0C0F12', '#161A1F', '#1C2128', '#F0FFE0', '#8A9A8A', '#5A6A5A', '#C8FF00', '#FF2E88', '#2A3038'),
    shape: { radiusCard: '8px', radiusBtn: '6px', shadow: 'glow' },
    typo: { display: 'Impact, "Arial Black", ' + SYSTEM_SANS, body: SYSTEM_SANS, numbers: SYSTEM_MONO },
    deco: ['speedline'],
  },
  {
    id: 'muji-calm',
    label: '無印靜謐',
    license: 'core',
    dark: false,
    vars: buildVars('#F7F5F1', '#EFEAE2', '#FFFFFF', '#3A3A38', '#7A7A76', '#A8A8A2', '#B0653F', '#8A9A7A', '#E0DCD4'),
    shape: { radiusCard: '4px', radiusBtn: '4px', shadow: 'none' },
    typo: { display: SYSTEM_SANS, body: SYSTEM_SANS, numbers: SYSTEM_MONO },
    deco: ['none'],
  },
  {
    id: 'swiss-data',
    label: '瑞士數據',
    license: 'core',
    dark: false,
    vars: buildVars('#FFFFFF', '#F4F4F4', '#FFFFFF', '#000000', '#555555', '#999999', '#E63946', '#1D3557', '#000000'),
    shape: { radiusCard: '0px', radiusBtn: '0px', shadow: 'none' },
    typo: { display: 'Helvetica, Arial, ' + SYSTEM_SANS, body: 'Helvetica, Arial, ' + SYSTEM_SANS, numbers: SYSTEM_MONO },
    deco: ['grid'],
  },
  {
    id: 'trail-wpa',
    label: '山徑戶外',
    license: 'core',
    dark: false,
    vars: buildVars('#EAE0CC', '#DDD2B8', '#F5EFE0', '#2A2A28', '#6A6458', '#9A9488', '#24493A', '#D96F32', '#C8BCA0'),
    shape: { radiusCard: '12px', radiusBtn: '8px', shadow: 'soft' },
    typo: { display: SYSTEM_SANS, body: SYSTEM_SANS, numbers: SYSTEM_MONO },
    deco: ['none'],
  },
  // ============ Experimental ============
  {
    id: 'y2k-chrome',
    label: 'Y2K 鉻金',
    license: 'experimental',
    dark: false,
    vars: buildVars('#E8EEF5', '#D8E2F0', '#F0F4FA', '#2A3A5A', '#6A7A9A', '#9AA8C0', '#6EC1FF', '#FF6EC7', '#B8C8E0'),
    shape: { radiusCard: '18px', radiusBtn: '14px', shadow: 'soft' },
    typo: { display: SYSTEM_SANS, body: SYSTEM_SANS, numbers: SYSTEM_MONO },
    deco: ['starburst'],
  },
  {
    id: 'club-old-money',
    label: '俱樂部老錢',
    license: 'experimental',
    dark: false,
    vars: buildVars('#F5F0E6', '#EAE4D6', '#FAF7F0', '#1E3A2F', '#5A6A5A', '#8A9A8A', '#6E1423', '#1E3A2F', '#D4CFC4'),
    shape: { radiusCard: '6px', radiusBtn: '4px', shadow: 'soft' },
    typo: { display: SYSTEM_SERIF, body: SYSTEM_SERIF, numbers: SYSTEM_MONO },
    deco: ['none'],
  },
  {
    id: 'manga-ink',
    label: '漫畫墨筆',
    license: 'experimental',
    dark: false,
    vars: buildVars('#FAFAFA', '#EEEEEE', '#FFFFFF', '#0A0A0A', '#555555', '#999999', '#E3350D', '#0A0A0A', '#0A0A0A'),
    shape: { radiusCard: '0px', radiusBtn: '0px', shadow: 'hard' },
    typo: { display: SYSTEM_SANS, body: SYSTEM_SANS, numbers: SYSTEM_MONO },
    deco: ['speedline'],
  },
];

/**
 * 正式發行版過濾 personal-only：
 * isProduction 為 true 時，Rollup 消除 false branch，
 * stylePacksPersonal.ts 整模組被 tree-shake（Hello Kitty 色碼與 bow 不進 bundle）。
 */
export const STYLE_PACKS: StylePack[] = isProduction
  ? CORE_EXP_PACKS
  : [...CORE_EXP_PACKS, ...PERSONAL_PACKS];

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
