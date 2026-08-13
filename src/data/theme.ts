/**
 * Vivix UI token 單一來源（C7 / A-008）
 *
 * 收編散落於元件的 hex / rgba 常值，改為具名 token。
 * 行為與像素零變化 — 僅集中定義。
 */

// ============ RestTimer 主題色值（原 RestTimer.tsx:56-83） ============
export const REST_TIMER_THEME = {
  light: {
    bgBase: 'rgba(248, 245, 240, 0.98)',     // #F8F5F0
    ringTrack: 'rgba(201, 169, 110, 0.15)',  // 淡金軌道
    ringActive: '#C9A96E',                    // 進行中：暖金
    ringPreheat: '#D4B886',                   // 預熱：稍微提亮
    ringComplete: '#E8D5A8',                   // 完成：奶油米白 #FFFAD2 偏柔
    breathGlow: 'rgba(232, 213, 168, 0.18)',  // 呼吸光暈
    textPrimary: '#2A2520',
    textSecondary: '#8B7E6E',
    textComplete: '#8B6F2E',
    label: '休息結束',
    progressFilter: 'none',
    buttonFg: '#FFF', // 播放/暫停鈕前景（原 RestTimer.tsx:353 light）
  },
  dark: {
    bgBase: 'rgba(10, 10, 11, 0.98)',          // #0A0A0B
    ringTrack: 'rgba(30, 70, 100, 0.2)',       // 暗冰藍軌道
    ringActive: '#1E4664',                     // 進行中：暗冰藍
    ringPreheat: '#2A5A7F',                    // 預熱：稍提亮
    ringComplete: '#23553F',                   // 完成：工業暗苔綠
    breathGlow: 'rgba(35, 85, 63, 0.22)',      // 暗綠呼吸光暈
    textPrimary: '#F0F0F0',
    textSecondary: '#8A8A8A',
    textComplete: '#3A7A5A',
    label: '就緒',
    progressFilter: 'drop-shadow(0 0 6px rgba(35,85,63,0.5))',
    buttonFg: '#0A0A0B', // 播放/暫停鈕前景（原 RestTimer.tsx:353 dark）
  },
} as const;

// ============ Settings 主題預覽色盤（原 Settings.tsx:138-171） ============
export const THEME_DEFINITIONS = {
  dark: {
    bg: '#0A0A0B',
    text: '#FFFFFF',
    card: '#2C2C2E',
    accent: '#D4FF00',
    muted: '#8E8E93',
  },
  light: {
    bg: '#F8F5F0',
    text: '#2C2B28',
    card: '#FFFFFF',
    accent: '#C9A96E',
    muted: '#7A756D',
  },
} as const;

// ============ Progress 圖表週色盤（原 Progress.tsx:87） ============
export const CHART_WEEK_COLORS = [
  '#D4FF00', // 工業電力綠
  '#FF6B35', // 暖橘
  '#4A7C7A', // 深青
  '#C9A96E', // 暖金
  '#E8A87C', // 桃膚
  '#8E8E93', // 系統灰
] as const;

// ============ Overlay 遮罩（統一 FeedbackModal 52/200、CelebrationModal 53） ============
export const OVERLAY_SCRIM = {
  // FeedbackModal 行 52 用 0.6；行 200 用 0.7
  // 統一為 0.7（較深，符合 CelebrationModal bg-black/75 視覺）
  background: 'rgba(0, 0, 0, 0.7)',
  // Tailwind 等效 class（供 className 使用）
  tailwindClass: 'bg-black/70',
} as const;
