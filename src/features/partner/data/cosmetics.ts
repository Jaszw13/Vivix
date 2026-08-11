import type { Cosmetic } from '../types';

export const COSMETICS: Cosmetic[] = [
  { id: 'sport_headband', type: 'head', name: '運動頭帶' },
  { id: 'wristband', type: 'wrist', name: '護腕' },
  { id: 'scarf', type: 'neck', name: '小圍巾' },
  { id: 'small_backpack', type: 'back', name: '小背包' },
  { id: 'first_step_badge', type: 'badge', name: '第一步徽章' },
  { id: 'gym_background', type: 'background', name: '健身房背景' },
  { id: 'title_first_step', type: 'title', name: '第一步' },
  { id: 'title_breakthrough', type: 'title', name: '第一個突破' },
  { id: 'title_stable_trainer', type: 'title', name: '穩定訓練者' },
  { id: 'warmup_badge', type: 'badge', name: '熱身習慣徽章' },
];

export const COSMETIC_MAP: Record<string, Cosmetic> = Object.fromEntries(
  COSMETICS.map((c) => [c.id, c])
);
