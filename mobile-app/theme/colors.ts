// ============ 雙主題色彩系統 ============

export type ThemeName = 'dark' | 'light';

export interface ThemeColors {
  // 背景色
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  // 文字
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // 強調色
  accent: string;
  accentSoft: string;
  // 輔助色
  auxiliary: string;
  dataColor: string;
  // 邊框
  borderColor: string;
  // 圓角
  radiusCard: number;
  radiusButton: number;
  // 陰影
  shadowCard: object;
  shadowButton: object;
  // 字體
  fontDisplay: string;
  // 圖示線寬
  iconStroke: number;
}

export const darkTheme: ThemeColors = {
  bgPrimary: '#0A0A0B',
  bgSecondary: '#1C1C1E',
  bgCard: '#2C2C2E',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  textMuted: '#6E6E73',
  accent: '#D4FF00',
  accentSoft: 'rgba(212, 255, 0, 0.15)',
  auxiliary: '#FF6B35',
  dataColor: '#D4FF00',
  borderColor: '#3A3A3C',
  radiusCard: 4,
  radiusButton: 4,
  shadowCard: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 1,
    elevation: 0,
  },
  shadowButton: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
    elevation: 0,
  },
  fontDisplay: 'Bebas Neue',
  iconStroke: 2.5,
};

export const lightTheme: ThemeColors = {
  bgPrimary: '#F8F5F0',
  bgSecondary: '#F0ECE4',
  bgCard: '#FFFFFF',
  textPrimary: '#2C2B28',
  textSecondary: '#7A756D',
  textMuted: '#A8A39A',
  accent: '#C9A96E',
  accentSoft: 'rgba(201, 169, 110, 0.12)',
  auxiliary: '#E8A87C',
  dataColor: '#4A7C7A',
  borderColor: '#E5DFD4',
  radiusCard: 16,
  radiusButton: 12,
  shadowCard: {
    shadowColor: '#2C2B28',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  shadowButton: {
    shadowColor: '#C9A96E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 1,
  },
  fontDisplay: 'Playfair Display',
  iconStroke: 1.5,
};
