/**
 * Personal-only StylePacks（S5 release gate）
 *
 * 此模組僅在非 production build 被打包；
 * production 下 STYLE_PACKS 的三元表達式 false branch 被消除，
 * Rollup 連帶 tree-shake 整個模組（含 Hello Kitty 色碼與 bow 裝飾）。
 */
import type { StylePack } from '@/types/theme';
import { buildVars } from './stylePacksShared';

const SYSTEM_SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", Helvetica, Arial, sans-serif';
const SYSTEM_MONO =
  '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace';

export const PERSONAL_PACKS: StylePack[] = [
  {
    id: 'hello-kitty',
    label: 'Hello Kitty',
    license: 'personal-only',
    dark: false,
    vars: buildVars('#FFF6F8', '#FFE8EE', '#FFFFFF', '#5A4A52', '#A08A96', '#C8B8C0', '#FF7FA5', '#E63946', '#FFD0DC'),
    shape: { radiusCard: '24px', radiusBtn: '20px', shadow: 'soft' },
    typo: { display: SYSTEM_SANS, body: SYSTEM_SANS, numbers: SYSTEM_MONO },
    deco: ['bow'],
  },
];
