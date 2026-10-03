/**
 * StylePack 共用 helpers（S1）
 *
 * 抽出至獨立模組，讓 stylePacksPersonal.ts 可 import buildVars
 * 而不引入循環依賴。
 */
import type { PackShadow } from '@/types/theme';

export function shadowFor(kind: PackShadow): { card: string; button: string } {
  switch (kind) {
    case 'none':
      return { card: 'none', button: 'none' };
    case 'soft':
      return {
        card: '0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
        button: '0 1px 3px rgba(0,0,0,0.12)',
      };
    case 'hard':
      return {
        card: '0 4px 0 0 rgba(0,0,0,0.9)',
        button: '0 3px 0 0 rgba(0,0,0,0.9)',
      };
    case 'glass':
      // Apple HIG 玻璃：分層深度陰影 + 內光
      return {
        card: '0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.12)',
        button: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
      };
  }
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 建構 CSS Variables 映射。所有色碼僅存在於此處被呼叫（data/stylePacks*.ts）。
 * 參數對應 §0 既有 CSS 變數名。
 */
export function buildVars(
  bgPrimary: string,
  bgSecondary: string,
  bgCard: string,
  textPrimary: string,
  textSecondary: string,
  textMuted: string,
  accent: string,
  auxiliary: string,
  borderColor: string,
): Record<string, string> {
  return {
    'bg-primary': bgPrimary,
    'bg-secondary': bgSecondary,
    'bg-card': bgCard,
    'text-primary': textPrimary,
    'text-secondary': textSecondary,
    'text-muted': textMuted,
    accent,
    'accent-soft': hexToRgba(accent, 0.15),
    auxiliary,
    'data-color': accent,
    'border-color': borderColor,
  };
}

// 系統字體棧（不新增 @font-face 依賴）
export const SYSTEM_SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", Helvetica, Arial, sans-serif';
export const SYSTEM_SERIF =
  'Georgia, "Times New Roman", "Noto Serif TC", serif';
export const SYSTEM_SLAB =
  '"Rockwell", "Courier New", Georgia, serif';
export const SYSTEM_MONO =
  '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace';
export const SYSTEM_ROUNDED =
  '"Nunito", "Quicksand", "PingFang TC", "Noto Sans TC", sans-serif';
export const SYSTEM_GEOMETRIC =
  '"Futura", "Century Gothic", "Avenir Next", "Noto Sans TC", sans-serif';
export const SYSTEM_BUBBLE =
  '"Comic Sans MS", "Chalkboard SE", "Marker Felt", "Noto Sans TC", sans-serif';
export const SYSTEM_STENCIL =
  'Impact, "Arial Black", "Oswald", "Noto Sans TC", sans-serif';
export const SYSTEM_CHROME =
  '"Bebas Neue", "Oswald", Impact, "Noto Sans TC", sans-serif';
