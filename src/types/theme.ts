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
  | 'grid'
  | 'polka'
  | 'rays'
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
  /** personal-only 可愛版圖片資產（路徑相對於 src/）；core pack 不填 */
  assets?: Partial<PackAssets>;
  motion: {
    transition: PackTransition;
    hover: PackHover;
    clickFx: PackClickFx;
  };
}

/**
 * 可愛版圖片資產（P-FIX-1）
 * 僅 personal pack 填入；core pack 的 assets 為 undefined。
 * 所有路徑均為 Vite 可解析的 import URL（含副檔名）。
 */
export interface PackAssets {
  /** 頭像（夥伴／Dashboard 右上） */
  avatar: string;
  /** 背景裝飾（PackDeco 背景圖） */
  bg: string;
  /** 空狀態插畫（訓練／成就空清單） */
  empty: string;
  /** 慶祝插畫（PR／解鎖彈窗） */
  celebrate: string;
  /** 吉祥物（輔助裝飾，選用） */
  mascot: string;
  /** 徽章（成就解鎖 badge） */
  badge: string;
}
