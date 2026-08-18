import { create } from 'zustand';
import type { Theme } from '@/types';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'ironpulse-theme';

/**
 * 主題顏色常數（對應 THEME_DEFINITIONS 嘅 theme_color / background_color）
 * 雙主題 icon 系統（G-06）：切換主題時同步更新 favicon、manifest、apple-touch-icon 與 theme-color meta
 * ⚠️ iOS 已安裝 PWA 嘅主畫面圖標：需要刪除重裝先會更新（平台限制，屬預期）
 */
const THEME_META: Record<Theme, { themeColor: string }> = {
  light: { themeColor: '#F8F5F0' },
  dark: { themeColor: '#0A0A0B' },
};

function applyDocumentIcons(theme: Theme) {
  if (typeof document === 'undefined') return;
  const iconsBase = `/icons/vivix-icon-${theme}`;

  // 1. manifest link
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

  // 2. apple-touch-icon link
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

  // 3. favicon link
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

  // 4. theme-color meta
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

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (saved === 'dark' || saved === 'light') return saved;
  // 預設為高雅米白淺色主題
  return 'light';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  // 加入過渡 class
  root.classList.add('theme-transition');
  root.classList.remove('dark', 'light');
  root.classList.add(theme);
  localStorage.setItem(STORAGE_KEY, theme);
  // 雙主題 icon 系統同步
  applyDocumentIcons(theme);
  // 移除過渡 class（讓後續操作不要都有過渡）
  window.setTimeout(() => root.classList.remove('theme-transition'), 250);
}

// 啟動時立即套用初始主題
if (typeof window !== 'undefined') {
  const initial = getInitialTheme();
  document.documentElement.classList.add(initial);
  // 啟動時同步一次 document icons（防止 SSR / 初始 hydration 唔一致）
  applyDocumentIcons(initial);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    set({ theme: next });
  },
}));
