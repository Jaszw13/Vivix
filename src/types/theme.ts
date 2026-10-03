/**
 * Vivix StylePack 型別定義（風格系統 S1）
 *
 * 每個 StylePack 定義一組 CSS Variables + 形狀 + 字體 + 裝飾，
 * 透過 themeStore.setPack() 動態注入 document.documentElement。
 */

export type PackLicense = 'core' | 'experimental' | 'personal-only';

export type PackShadow = 'none' | 'soft' | 'hard' | 'glow';

export type PackDeco = 'halftone' | 'starburst' | 'blob' | 'speedline' | 'grid' | 'bow' | 'none';

export interface StylePack {
  id: string;
  label: string;
  license: PackLicense;
  /** 是否為深色系（決定 dark/light class，影響 RestTimer 等讀 theme 的地方） */
  dark: boolean;
  /** CSS Variables 映射（key 不含 --，value 為色碼／長度字串） */
  vars: Record<string, string>;
  shape: {
    radiusCard: string;
    radiusBtn: string;
    shadow: PackShadow;
  };
  typo: {
    display: string;
    body: string;
    numbers: string;
  };
  deco: PackDeco[];
}
