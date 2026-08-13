import type { Equipment, EquipmentType, MuscleGroup, MediaRef } from '@/types';
import { DEFAULT_MEDIA } from '@/types';

/**
 * 通用器械 library（不含品牌名稱，避免商標/著作權問題）
 *
 * 命名規則：
 *   - 使用通用名稱（例：「坐姿推胸機」而非「Hammer Strength 推胸機」）
 *   - ID 前綴 `eq-`，描述性英文 snake_case
 *
 * 媒體政策（§5.7 / T-07）：
 *   - 預設 type: 'illustration'，使用 generic 2D 插圖
 *   - 不得含品牌 Logo、人臉、未經授權照片
 */
export const equipmentLibrary: Equipment[] = [
  // ============ barbell 槓鈴系列 ============
  {
    id: 'eq-barbell-flat',
    name: '標準槓鈴（平地）',
    category: 'barbell',
    typicalMuscleGroups: ['chest', 'back', 'legs', 'shoulders', 'arms'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'eq-barbell-flat-bench',
    name: '臥推架 + 平凳',
    category: 'barbell',
    typicalMuscleGroups: ['chest', 'shoulders', 'arms'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'eq-squat-rack',
    name: '深蹲架',
    category: 'barbell',
    typicalMuscleGroups: ['legs', 'core'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'eq-barbell-platform',
    name: '舉重台',
    category: 'barbell',
    typicalMuscleGroups: ['back', 'legs'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'eq-barbell-curl-bar',
    name: '彎舉桿（EZ 槓）',
    category: 'barbell',
    typicalMuscleGroups: ['arms'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },

  // ============ dumbbell 啞鈴系列 ============
  {
    id: 'eq-dumbbell-rack',
    name: '啞鈴組',
    category: 'dumbbell',
    typicalMuscleGroups: ['chest', 'shoulders', 'arms', 'back'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'eq-incline-bench-dumbbell',
    name: '上斜凳 + 啞鈴',
    category: 'dumbbell',
    typicalMuscleGroups: ['chest', 'shoulders'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },

  // ============ machine 機械系列 ============
  {
    id: 'eq-leg-press-machine',
    name: '坐姿腿推機',
    category: 'machine',
    typicalMuscleGroups: ['legs'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'eq-chest-press-machine',
    name: '坐姿推胸機',
    category: 'machine',
    typicalMuscleGroups: ['chest', 'arms', 'shoulders'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'eq-leg-curl-machine',
    name: '腿後側彎舉機',
    category: 'machine',
    typicalMuscleGroups: ['legs'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'eq-leg-extension-machine',
    name: '腿伸展機',
    category: 'machine',
    typicalMuscleGroups: ['legs'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'eq-lat-pulldown-machine',
    name: '高位下拉機',
    category: 'machine',
    typicalMuscleGroups: ['back', 'arms'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'eq-seated-row-machine',
    name: '坐姿划船機',
    category: 'machine',
    typicalMuscleGroups: ['back'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'eq-shoulder-press-machine',
    name: '坐姿肩推機',
    category: 'machine',
    typicalMuscleGroups: ['shoulders', 'arms'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },

  // ============ cable 纜繩系列 ============
  {
    id: 'eq-cable-crossover',
    name: '纜繩飛鳥機',
    category: 'cable',
    typicalMuscleGroups: ['chest', 'back', 'arms'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'eq-cable-tricep',
    name: '三頭下壓纜繩站',
    category: 'cable',
    typicalMuscleGroups: ['arms'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'eq-cable-bicep',
    name: '二頭彎舉纜繩站',
    category: 'cable',
    typicalMuscleGroups: ['arms'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'eq-cable-facepull',
    name: '臉拉纜繩站',
    category: 'cable',
    typicalMuscleGroups: ['shoulders', 'back'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },

  // ============ bodyweight 徒手系列 ============
  {
    id: 'eq-pullup-bar',
    name: '單槓（引體向上架）',
    category: 'bodyweight',
    typicalMuscleGroups: ['back', 'arms', 'core'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'eq-dips-bar',
    name: '雙槓撐體架',
    category: 'bodyweight',
    typicalMuscleGroups: ['chest', 'arms', 'shoulders'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'eq-mat',
    name: '瑜珈墊',
    category: 'bodyweight',
    typicalMuscleGroups: ['core'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'eq-bench-bodyweight',
    name: '平凳（徒手動作）',
    category: 'bodyweight',
    typicalMuscleGroups: ['chest', 'arms', 'core'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },

  // ============ kettlebell 壺鈴 ============
  {
    id: 'eq-kettlebell-rack',
    name: '壺鈴組',
    category: 'kettlebell',
    typicalMuscleGroups: ['legs', 'back', 'core', 'shoulders'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
];
