import { create } from 'zustand';
import type { Theme } from '@/types';
import { getStylePack, packShadows } from '@/data/stylePacks';
import type { StylePack } from '@/types/theme';

interface ThemeState {
  theme: Theme;
  activePackId: string;
  /** 點擊特效開關（persist） */
  fxEnabled: boolean;
  /** 過場動畫開關（persist） */
  motionEnabled: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setPack: (id: string) => void;
  setFx: (on: boolean) => void;
  setMotion: (on: boolean) => void;
}

const STORAGE_KEY = 'ironpulse-theme';
const FX_KEY = 'vivix-fx-enabled';
const MOTION_KEY = 'vivix-motion-enabled';

// 預設 pack：dark → industrial-power，light → elegant-beige
const DEFAULT_PACK_DARK = 'industrial-power';
const DEFAULT_PACK_LIGHT = 'elegant-beige';

/**
 * 主題顏色常數（對應 THEME_DEFINITIONS 嘅 theme_color / background_color）
 * 雙主題 icon 系統（G-06）：切換主題時同步更新 favicon、manifest、apple-touch-icon 與 theme-color meta
 */
const THEME_META: Record<Theme, { themeColor: string }> = {
  light: { themeColor: '#F8F5F0' },
  dark: { themeColor: '#0A0A0B' },
};

function applyDocumentIcons(theme: Theme) {
  if (typeof document === 'undefined') return;
  const iconsBase = `/icons/vivix-icon-${theme}`;

  const manifestLink = document.getElementById('vivix-manifest') as HTMLLinkElement | null;
  if (manifestLink) {
    manifestLink.href = `/manifest-${theme}.webmanifest`;
  } else {
    const link = document.createElement('link');
    link.id = 'vivix-manifest';
    link.rel = 'manifest';
    link.href = `/manifest-${theme}.webmanifest`;
    document.head.appendChild(link);
  }

  const appleLink = document.getElementById('vivix-apple-touch') as HTMLLinkElement | null;
  if (appleLink) {
    appleLink.href = `${iconsBase}-180.png`;
  } else {
    const link = document.createElement('link');
    link.id = 'vivix-apple-touch';
    link.rel = 'apple-touch-icon';
    link.href = `${iconsBase}-180.png`;
    document.head.appendChild(link);
  }

  const faviconLink = document.getElementById('vivix-favicon') as HTMLLinkElement | null;
  if (faviconLink) {
    faviconLink.href = `${iconsBase}-32.png`;
  } else {
    const link = document.createElement('link');
    link.id = 'vivix-favicon';
    link.rel = 'icon';
    link.type = 'image/png';
    link.sizes = '32x32';
    link.href = `${iconsBase}-32.png`;
    document.head.appendChild(link);
  }

  const themeColorMeta = document.getElementById('vivix-theme-color') as HTMLMetaElement | null;
  if (themeColorMeta) {
    themeColorMeta.content = THEME_META[theme].themeColor;
  } else {
    const meta = document.createElement('meta');
    meta.id = 'vivix-theme-color';
    meta.name = 'theme-color';
    meta.content = THEME_META[theme].themeColor;
    document.head.appendChild(meta);
  }
}

/**
 * 將 StylePack 的 CSS Variables 注入 documentElement，並套用 shape/typo/attribute。
 * 所有色碼皆來自 data/stylePacks.ts，components/pages 內不出現 hex。
 */
export function applyPack(pack: StylePack) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // 1. 注入 CSS Variables
  Object.entries(pack.vars).forEach(([k, v]) => {
    root.style.setProperty(`--${k}`, v);
  });

  // 2. shape：圓角 + 邊框寬度 + 陰影
  root.style.setProperty('--radius-card', pack.shape.radiusCard);
  root.style.setProperty('--radius-button', pack.shape.radiusBtn);
  root.style.setProperty('--border-width', pack.shape.borderWidth);
  const shadows = packShadows(pack.shape.shadow);
  root.style.setProperty('--shadow-card', shadows.card);
  root.style.setProperty('--shadow-button', shadows.button);

  // 3. typo：字體棧
  root.style.setProperty('--font-display', pack.typo.display);
  root.style.setProperty('--font-body', pack.typo.body);
  root.style.setProperty('--font-numbers', pack.typo.numbers);

  // 4. mode → theme class（light-only 強制 light）
  const theme: Theme = pack.mode === 'dark' ? 'dark' : 'light';
  root.classList.remove('dark', 'light');
  root.classList.add(theme);

  // 5. attribute-driven 樣式（data-pack / data-theme / data-glass）
  root.setAttribute('data-pack', pack.id);
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-glass', pack.glass ? 'true' : 'false');
}

/** 套用 fx/motion 開關至 <html> data attribute */
function applyFxMotion(fx: boolean, motion: boolean) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-fx', fx ? 'on' : 'off');
  root.setAttribute('data-motion', motion ? 'on' : 'off');
}

/** 從 localStorage 讀 fx/motion；若 prefers-reduced-motion 且用戶未手動設 → 預設 off */
function getInitialFxMotion(): { fxEnabled: boolean; motionEnabled: boolean } {
  if (typeof window === 'undefined') return { fxEnabled: true, motionEnabled: true };
  const fxRaw = localStorage.getItem(FX_KEY);
  const motionRaw = localStorage.getItem(MOTION_KEY);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 用戶未手動設 + reduced-motion → 關閉；否則預設開
  const fxEnabled = fxRaw ? fxRaw === 'true' : !reducedMotion;
  const motionEnabled = motionRaw ? motionRaw === 'true' : !reducedMotion;
  return { fxEnabled, motionEnabled };
}

/** 從舊版 localStorage（只存 'dark'|'light'）或新版（存 packId）解析初始狀態 */
function getInitialPackId(): { theme: Theme; activePackId: string } {
  if (typeof window === 'undefined') {
    return { theme: 'light', activePackId: DEFAULT_PACK_LIGHT };
  }
  const saved = localStorage.getItem(STORAGE_KEY);
  // Migrate：舊版只存 'dark' | 'light' → 映射至對應預設 pack
  if (saved === 'dark' || saved === 'light') {
    const packId = saved === 'dark' ? DEFAULT_PACK_DARK : DEFAULT_PACK_LIGHT;
    return { theme: saved, activePackId: packId };
  }
  // 新版存 packId
  if (saved) {
    const pack = getStylePack(saved);
    if (pack) {
      const theme: Theme = pack.mode === 'dark' ? 'dark' : 'light';
      return { theme, activePackId: saved };
    }
    // activePackId 為 personal 但 production 下不存在 → fallback 預設
    return { theme: 'light', activePackId: DEFAULT_PACK_LIGHT };
  }
  // 預設
  return { theme: 'light', activePackId: DEFAULT_PACK_LIGHT };
}

/** 套用主題 class + icons（不含 pack vars；pack vars 由 applyPack 處理） */
function applyThemeClass(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.add('theme-transition');
  root.classList.remove('dark', 'light');
  root.classList.add(theme);
  applyDocumentIcons(theme);
  window.setTimeout(() => root.classList.remove('theme-transition'), 250);
}

// 啟動時立即套用初始 pack（CSS vars + class + icons）
if (typeof window !== 'undefined') {
  const initial = getInitialPackId();
  const pack = getStylePack(initial.activePackId);
  if (pack) {
    applyPack(pack);
  } else {
    applyThemeClass(initial.theme);
  }
  applyDocumentIcons(initial.theme);
  const { fxEnabled, motionEnabled } = getInitialFxMotion();
  applyFxMotion(fxEnabled, motionEnabled);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialPackId().theme,
  activePackId: getInitialPackId().activePackId,
  fxEnabled: getInitialFxMotion().fxEnabled,
  motionEnabled: getInitialFxMotion().motionEnabled,

  setTheme: (theme) => {
    // 切換 dark/light 時同步切換至對應預設 pack
    const packId = theme === 'dark' ? DEFAULT_PACK_DARK : DEFAULT_PACK_LIGHT;
    const pack = getStylePack(packId);
    if (pack) applyPack(pack);
    applyThemeClass(theme);
    localStorage.setItem(STORAGE_KEY, packId);
    set({ theme, activePackId: packId });
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  setPack: (id) => {
    const pack = getStylePack(id);
    if (!pack) return;
    applyPack(pack);
    const theme: Theme = pack.mode === 'dark' ? 'dark' : 'light';
    applyDocumentIcons(theme);
    localStorage.setItem(STORAGE_KEY, id);
    set({ theme, activePackId: id });
  },

  setFx: (on) => {
    localStorage.setItem(FX_KEY, String(on));
    applyFxMotion(on, get().motionEnabled);
    set({ fxEnabled: on });
  },

  setMotion: (on) => {
    localStorage.setItem(MOTION_KEY, String(on));
    applyFxMotion(get().fxEnabled, on);
    set({ motionEnabled: on });
  },
}));
