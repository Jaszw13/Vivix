/**
 * Vivix StylePack 型別定義（風格系統 v1）
 *
 * 每個 StylePack 定義一組 CSS Variables + 形狀 + 字體 + 裝飾 + 動態人格，
 * 透過 themeStore.setPack() 動態注入 document.documentElement。
 *
 * Hex 規則：色碼只准出現在 src/data/stylePacks*.ts 與 src/data/theme.ts。
 */

export type PackLicense = 'core' | 'personal-only';

export type PackShadow = 'none' | 'soft' | 'hard' | 'glass';

export type PackDeco =
  | 'halftone'
  | 'starburst'
  | 'blob'
  | 'speedline'
  | 'grid'
  | 'bow'
  | 'clouds'
  | 'none';

export type PackTransition =
  | 'smooth'
  | 'snappy'
  | 'flip'
  | 'spring'
  | 'instant'
  | 'slow-fade'
  | 'elastic'
  | 'stamp'
  | 'bouncy'
  | 'jelly';

export type PackHover =
  | 'lift'
  | 'glow'
  | 'emboss'
  | 'scale'
  | 'shadow-collapse'
  | 'opacity'
  | 'inflation'
  | 'stamp-press'
  | 'wiggle'
  | 'squish';

export type PackClickFx =
  | 'shimmer'
  | 'glitch'
  | 'holo'
  | 'ripple'
  | 'confetti'
  | 'none'
  | 'sparkle'
  | 'stamp'
  | 'hearts'
  | 'stars';

export interface StylePack {
  id: string;
  label: string;
  license: PackLicense;
  /** light / dark / light-only（personal 款為 light-only，強制亮色） */
  mode: 'light' | 'dark' | 'light-only';
  /** CSS Variables 映射（key 不含 --，value 為色碼／長度字串） */
  vars: Record<string, string>;
  shape: {
    radiusCard: string;
    radiusBtn: string;
    borderWidth: string;
    shadow: PackShadow;
  };
  typo: {
    display: string;
    body: string;
    numbers: string;
  };
  deco: PackDeco[];
  /** aurora-glass 為 true：backdrop-filter + 半透明背景 */
  glass?: boolean;
  motion: {
    transition: PackTransition;
    hover: PackHover;
    clickFx: PackClickFx;
  };
}
