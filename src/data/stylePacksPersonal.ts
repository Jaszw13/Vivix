/**
 * Personal-only StylePacks（S5 release gate）
 *
 * 此模組僅在非 production build 被打包；
 * production 下 STYLE_PACKS 的三元表達式 false branch 被消除，
 * Rollup 連帶 tree-shake 整個模組（含 Hello Kitty / Kawaii 色碼與 bow 裝飾）。
 *
 * 版權：Hello Kitty 為 Sanrio 註冊商標，此 pack 僅供個人使用，
 * 不得散布、商用或納入 release build。
 */
import type { StylePack } from '@/types/theme';
import { buildVars, SYSTEM_SANS, SYSTEM_MONO, SYSTEM_ROUNDED, SYSTEM_BUBBLE } from './stylePacksShared';

export const PERSONAL_PACKS: StylePack[] = [
  // 1. Hello Kitty — 強制亮色（light-only）
  {
    id: 'hello-kitty',
    label: 'Hello Kitty',
    license: 'personal-only',
    mode: 'light-only',
    vars: buildVars('#FFF6F8', '#FFE8EE', '#FFFFFF', '#5A4A52', '#A08A96', '#C8B8C0', '#FF7FA5', '#E63946', '#FFD0DC'),
    shape: { radiusCard: '24px', radiusBtn: '20px', borderWidth: '2px', shadow: 'soft' },
    typo: { display: SYSTEM_ROUNDED, body: SYSTEM_SANS, numbers: SYSTEM_MONO },
    deco: ['bow', 'clouds'],
    motion: { transition: 'bouncy', hover: 'wiggle', clickFx: 'hearts' },
  },
  // 2. Kawaii Pastel — 可愛粉彩（強制亮色）
  {
    id: 'kawaii-pastel',
    label: '粉彩甜心',
    license: 'personal-only',
    mode: 'light-only',
    vars: buildVars('#FDF7F2', '#F5EBE3', '#FFFFFF', '#5A4A4A', '#A08A8A', '#C8B8B8', '#6FB5A0', '#F2B8CD', '#E8DCD0'),
    shape: { radiusCard: '28px', radiusBtn: '24px', borderWidth: '1px', shadow: 'soft' },
    typo: { display: SYSTEM_BUBBLE, body: SYSTEM_ROUNDED, numbers: SYSTEM_MONO },
    deco: ['clouds', 'blob'],
    motion: { transition: 'jelly', hover: 'squish', clickFx: 'stars' },
  },
];
