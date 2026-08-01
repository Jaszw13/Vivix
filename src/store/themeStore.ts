import { create } from 'zustand';
import type { Theme } from '@/types';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'ironpulse-theme';

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
  // 移除過渡 class（讓後續操作不要都有過渡）
  window.setTimeout(() => root.classList.remove('theme-transition'), 250);
}

// 啟動時立即套用初始主題
if (typeof window !== 'undefined') {
  const initial = getInitialTheme();
  document.documentElement.classList.add(initial);
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
