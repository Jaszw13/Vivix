import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeName, ThemeColors } from '@/theme/colors';
import { darkTheme, lightTheme } from '@/theme/colors';

interface ThemeState {
  theme: ThemeName;
  colors: ThemeColors;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
  loadTheme: () => Promise<void>;
}

const STORAGE_KEY = 'ironpulse-theme';

function getColors(theme: ThemeName): ThemeColors {
  return theme === 'dark' ? darkTheme : lightTheme;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  colors: darkTheme,
  setTheme: (theme) => {
    set({ theme, colors: getColors(theme) });
    AsyncStorage.setItem(STORAGE_KEY, theme);
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    set({ theme: next, colors: getColors(next) });
    AsyncStorage.setItem(STORAGE_KEY, next);
  },
  loadTheme: async () => {
    try {
      const saved = (await AsyncStorage.getItem(STORAGE_KEY)) as ThemeName | null;
      if (saved === 'dark' || saved === 'light') {
        set({ theme: saved, colors: getColors(saved) });
      }
    } catch (e) {
      // 載入失敗使用預設值
    }
  },
}));
