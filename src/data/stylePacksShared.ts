/**
 * StylePack 共用 helpers（S2）
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
        card: '0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        button: '0 1px 2px rgba(0,0,0,0.1)',
      };
    case 'hard':
      return {
        card: '0 4px 0 0 rgba(0,0,0,0.85)',
        button: '0 3px 0 0 rgba(0,0,0,0.85)',
      };
    case 'glow':
      return {
        card: '0 0 12px rgba(200,255,0,0.25), 0 0 2px rgba(255,46,136,0.3)',
        button: '0 0 8px rgba(200,255,0,0.4)',
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

// 系統字體棧（不新增 @font-face）
export const SYSTEM_SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", Helvetica, Arial, sans-serif';
export const SYSTEM_SERIF =
  'Georgia, "Times New Roman", "Noto Serif TC", serif';
export const SYSTEM_SLAB =
  '"Rockwell", "Courier New", Georgia, serif';
export const SYSTEM_MONO =
  '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace';
