import type { Exercise, ExerciseCategory, MuscleGroup, EquipmentType, MediaRef } from '@/types';
import { DEFAULT_MEDIA, resolveEquipmentType } from '@/types';

/**
 * 15 個內建動作（Vivix MVP 基礎動作庫）。
 * 每個動作皆已補齊：
 *   - muscleGroup / category（統一必填，語義一致，值相同）
 *   - equipmentType（結構化值）
 *   - muscleGroupDesc / equipmentDesc（顯示用自由描述）
 *   - isCustom: false
 *   - steps / tips（步驟與提示）
 *   - media（預設合規插圖 metadata，無品牌、無人臉）
 */
export const exercises: Exercise[] = [
  // ============ 胸部 chest ============
  {
    id: 'bench-press',
    name: '臥推',
    muscleGroup: 'chest',
    category: 'chest',
    secondaryGroups: ['shoulders', 'arms'],
    equipmentType: 'barbell',
    equipmentId: 'eq-barbell-flat-bench',
    muscleGroupDesc: '胸大肌、三頭肌、前三角肌',
    equipmentDesc: '槓鈴',
    equipment: '槓鈴',
    isCustom: false,
    steps: [
      '仰臥於臥推椅上，雙腳平貼地面',
      '雙手握槓，握距略寬於肩',
      '控制槓鈴下降至胸口',
      '發力將槓鈴推回起始位置',
    ],
    instructions: [
      '仰臥於臥推椅上，雙腳平貼地面',
      '雙手握槓，握距略寬於肩',
      '控制槓鈴下降至胸口',
      '發力將槓鈴推回起始位置',
    ],
    tips: ['肩胛骨後縮收緊', '臀部緊貼椅面', '手腕保持中立'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'incline-dumbbell-press',
    name: '上斜啞鈴推舉',
    muscleGroup: 'chest',
    category: 'chest',
    secondaryGroups: ['shoulders', 'arms'],
    equipmentType: 'dumbbell',
    equipmentId: 'eq-incline-bench-dumbbell',
    muscleGroupDesc: '上胸大肌',
    equipmentDesc: '啞鈴',
    equipment: '啞鈴',
    isCustom: false,
    steps: [
      '調整椅子至上斜 30-45 度',
      '雙手握啞鈴置於肩部兩側',
      '推舉至雙臂伸直',
      '控制下降至起始位置',
    ],
    instructions: [
      '調整椅子至上斜 30-45 度',
      '雙手握啞鈴置於肩部兩側',
      '推舉至雙臂伸直',
      '控制下降至起始位置',
    ],
    tips: ['手肘與身體呈 45 度', '頂端不鎖死', '控制節奏'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'cable-fly',
    name: '纜繩飛鳥',
    muscleGroup: 'chest',
    category: 'chest',
    equipmentType: 'cable',
    equipmentId: 'eq-cable-crossover',
    muscleGroupDesc: '胸大肌',
    equipmentDesc: '纜繩',
    equipment: '纜繩',
    isCustom: false,
    steps: [
      '雙手握住纜繩把手',
      '身體微前傾，膝蓋微彎',
      '將雙手向內靠攏',
      '緩慢回到起始位置',
    ],
    instructions: [
      '雙手握住纜繩把手',
      '身體微前傾，膝蓋微彎',
      '將雙手向內靠攏',
      '緩慢回到起始位置',
    ],
    tips: ['手肘微彎固定', '頂端擠壓胸部', '感受胸肌發力'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },

  // ============ 背部 back ============
  {
    id: 'deadlift',
    name: '硬舉',
    muscleGroup: 'back',
    category: 'back',
    secondaryGroups: ['legs'],
    equipmentType: 'barbell',
    equipmentId: 'eq-barbell-platform',
    muscleGroupDesc: '背闊肌、臀大肌、腿後側肌群',
    equipmentDesc: '槓鈴',
    equipment: '槓鈴',
    isCustom: false,
    steps: [
      '雙腳與肩同寬，槓鈴置於腳背正上方',
      '髖部後推，雙手握槓',
      '保持背部挺直，發力站起',
      '控制下放至地面',
    ],
    instructions: [
      '雙腳與肩同寬，槓鈴置於腳背正上方',
      '髖部後推，雙手握槓',
      '保持背部挺直，發力站起',
      '控制下放至地面',
    ],
    tips: ['核心繃緊', '槓鈴貼近身體', '不圓背'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'pull-up',
    name: '引體向上',
    muscleGroup: 'back',
    category: 'back',
    secondaryGroups: ['arms'],
    equipmentType: 'bodyweight',
    equipmentId: 'eq-pullup-bar',
    muscleGroupDesc: '背闊肌、二頭肌',
    equipmentDesc: '單槓',
    equipment: '單槓',
    isCustom: false,
    steps: [
      '雙手握槓，握距略寬於肩',
      '肩胛骨下壓收縮',
      '拉起身體至下巴過槓',
      '控制下放至完全伸展',
    ],
    instructions: [
      '雙手握槓，握距略寬於肩',
      '肩胛骨下壓收縮',
      '拉起身體至下巴過槓',
      '控制下放至完全伸展',
    ],
    tips: ['避免甩動', '頂端擠壓背肌', '全程控制'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'barbell-row',
    name: '槓鈴划船',
    muscleGroup: 'back',
    category: 'back',
    equipmentType: 'barbell',
    equipmentId: 'eq-barbell-flat',
    muscleGroupDesc: '背闊肌、菱形肌',
    equipmentDesc: '槓鈴',
    equipment: '槓鈴',
    isCustom: false,
    steps: [
      '髖部後推，上身前傾約 45 度',
      '雙手握槓自然下垂',
      '將槓鈴拉至下腹部',
      '控制下放',
    ],
    instructions: [
      '髖部後推，上身前傾約 45 度',
      '雙手握槓自然下垂',
      '將槓鈴拉至下腹部',
      '控制下放',
    ],
    tips: ['背部保持平直', '手肘靠近身體', '頂端擠壓'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },

  // ============ 腿部 legs ============
  {
    id: 'squat',
    name: '深蹲',
    muscleGroup: 'legs',
    category: 'legs',
    secondaryGroups: ['core'],
    equipmentType: 'barbell',
    equipmentId: 'eq-squat-rack',
    muscleGroupDesc: '股四頭肌、臀大肌、腿後側肌群',
    equipmentDesc: '槓鈴',
    equipment: '槓鈴',
    isCustom: false,
    steps: [
      '槓鈴置於上背斜方肌',
      '雙腳與肩同寬，腳尖微外八',
      '下蹲至大腿與地面平行',
      '發力站起',
    ],
    instructions: [
      '槓鈴置於上背斜方肌',
      '雙腳與肩同寬，腳尖微外八',
      '下蹲至大腿與地面平行',
      '發力站起',
    ],
    tips: ['膝蓋朝腳尖方向', '胸口朝前', '深度足夠'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'leg-press',
    name: '腿推',
    muscleGroup: 'legs',
    category: 'legs',
    equipmentType: 'machine',
    equipmentId: 'eq-leg-press-machine',
    muscleGroupDesc: '股四頭肌、臀大肌',
    equipmentDesc: '機械',
    equipment: '機械',
    isCustom: false,
    steps: [
      '背部貼緊椅背',
      '雙腳與肩同寬置於踏板',
      '推起踏板至雙腿伸直',
      '控制下降至 90 度',
    ],
    instructions: [
      '背部貼緊椅背',
      '雙腳與肩同寬置於踏板',
      '推起踏板至雙腿伸直',
      '控制下降至 90 度',
    ],
    tips: ['膝蓋不鎖死', '腳掌完整貼踏板', '控制速度'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'romanian-deadlift',
    name: '羅馬尼亞硬舉',
    muscleGroup: 'legs',
    category: 'legs',
    secondaryGroups: ['back'],
    equipmentType: 'barbell',
    equipmentId: 'eq-barbell-flat',
    muscleGroupDesc: '腿後側肌群、臀大肌',
    equipmentDesc: '槓鈴',
    equipment: '槓鈴',
    isCustom: false,
    steps: [
      '雙手握槓自然下垂',
      '髖部後推，膝蓋微彎',
      '槓鈴沿大腿下降至小腿中段',
      '發力回到起始位置',
    ],
    instructions: [
      '雙手握槓自然下垂',
      '髖部後推，膝蓋微彎',
      '槓鈴沿大腿下降至小腿中段',
      '發力回到起始位置',
    ],
    tips: ['感受腿後側拉伸', '背部保持平直', '不塌腰'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },

  // ============ 肩膀 shoulders ============
  {
    id: 'overhead-press',
    name: '肩推',
    muscleGroup: 'shoulders',
    category: 'shoulders',
    secondaryGroups: ['arms'],
    equipmentType: 'barbell',
    equipmentId: 'eq-barbell-flat',
    muscleGroupDesc: '三角肌、三頭肌',
    equipmentDesc: '槓鈴',
    equipment: '槓鈴',
    isCustom: false,
    steps: [
      '槓鈴置於鎖骨位置',
      '雙手握槓略寬於肩',
      '推舉至雙臂伸直過頭',
      '控制下降至鎖骨',
    ],
    instructions: [
      '槓鈴置於鎖骨位置',
      '雙手握槓略寬於肩',
      '推舉至雙臂伸直過頭',
      '控制下降至鎖骨',
    ],
    tips: ['核心繃緊', '避免腰部過度伸展', '頂端擠壓'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'lateral-raise',
    name: '側平舉',
    muscleGroup: 'shoulders',
    category: 'shoulders',
    equipmentType: 'dumbbell',
    equipmentId: 'eq-dumbbell-rack',
    muscleGroupDesc: '側三角肌',
    equipmentDesc: '啞鈴',
    equipment: '啞鈴',
    isCustom: false,
    steps: [
      '雙手握啞鈴置於身側',
      '手肘微彎',
      '將啞鈴舉至與肩同高',
      '控制下降',
    ],
    instructions: [
      '雙手握啞鈴置於身側',
      '手肘微彎',
      '將啞鈴舉至與肩同高',
      '控制下降',
    ],
    tips: ['不聳肩', '手肘引導動作', '控制全程'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },

  // ============ 手臂 arms ============
  {
    id: 'barbell-curl',
    name: '槓鈴二頭彎舉',
    muscleGroup: 'arms',
    category: 'arms',
    equipmentType: 'barbell',
    equipmentId: 'eq-barbell-curl-bar',
    muscleGroupDesc: '二頭肌',
    equipmentDesc: '槓鈴',
    equipment: '槓鈴',
    isCustom: false,
    steps: [
      '雙手握槓與肩同寬',
      '上臂貼緊身側',
      '彎舉至胸前',
      '控制下放',
    ],
    instructions: [
      '雙手握槓與肩同寬',
      '上臂貼緊身側',
      '彎舉至胸前',
      '控制下放',
    ],
    tips: ['手腕保持中立', '不甩動', '頂端擠壓'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'tricep-pushdown',
    name: '三頭下壓',
    muscleGroup: 'arms',
    category: 'arms',
    equipmentType: 'cable',
    equipmentId: 'eq-cable-tricep',
    muscleGroupDesc: '三頭肌',
    equipmentDesc: '纜繩',
    equipment: '纜繩',
    isCustom: false,
    steps: [
      '雙手握住纜繩把手',
      '上臂貼緊身側',
      '下壓至手臂完全伸直',
      '控制回到起始位置',
    ],
    instructions: [
      '雙手握住纜繩把手',
      '上臂貼緊身側',
      '下壓至手臂完全伸直',
      '控制回到起始位置',
    ],
    tips: ['手肘不外開', '頂端擠壓三頭', '固定上臂'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },

  // ============ 核心 core ============
  {
    id: 'plank',
    name: '棒式',
    muscleGroup: 'core',
    category: 'core',
    equipmentType: 'bodyweight',
    equipmentId: 'eq-mat',
    muscleGroupDesc: '腹橫肌、腹直肌',
    equipmentDesc: '徒手',
    equipment: '徒手',
    isCustom: false,
    steps: [
      '前臂撐地與肩同寬',
      '身體呈一直線',
      '核心繃緊保持姿勢',
      '維持指定時間',
    ],
    instructions: [
      '前臂撐地與肩同寬',
      '身體呈一直線',
      '核心繃緊保持姿勢',
      '維持指定時間',
    ],
    tips: ['不塌腰', '臀部不下沉', '呼吸均勻'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
  {
    id: 'hanging-leg-raise',
    name: '懸垂抬腿',
    muscleGroup: 'core',
    category: 'core',
    equipmentType: 'bodyweight',
    equipmentId: 'eq-pullup-bar',
    muscleGroupDesc: '腹直肌、髖屈肌',
    equipmentDesc: '單槓',
    equipment: '單槓',
    isCustom: false,
    steps: [
      '雙手握槓懸垂',
      '腹部發力將雙腿抬至水平',
      '控制下放',
      '重複動作',
    ],
    instructions: [
      '雙手握槓懸垂',
      '腹部發力將雙腿抬至水平',
      '控制下放',
      '重複動作',
    ],
    tips: ['不甩動', '控制速度', '頂端擠壓'],
    media: { ...DEFAULT_MEDIA } as MediaRef,
  },
];

/**
 * 合計：15 個內建動作，全部皆有 muscleGroup + equipmentType
 *   chest: 3
 *   back: 3
 *   legs: 3
 *   shoulders: 2
 *   arms: 2
 *   core: 2
 */

export function getExerciseById(id: string): Exercise | undefined {
  return exercises.find((e) => e.id === id);
}

/**
 * 工具：從「自由文字舊 Exercise」資料補齊缺失欄位（migrate 用）
 */
export function patchExerciseWithClassifications(e: Partial<Exercise>): Exercise {
  const id = e.id ?? `unknown-${Date.now()}`;
  const categoryOrGroup = (e.muscleGroup as MuscleGroup | undefined) ?? (e.category as MuscleGroup | undefined);
  const muscleGroup: MuscleGroup =
    categoryOrGroup && ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'].includes(categoryOrGroup)
      ? categoryOrGroup
      : 'chest';
  const equipmentType: EquipmentType = e.equipmentType ?? resolveEquipmentType(e.equipment);
  return {
    id,
    name: e.name ?? '未命名動作',
    muscleGroup,
    category: muscleGroup,
    secondaryGroups: e.secondaryGroups,
    equipmentType,
    equipmentId: e.equipmentId,
    muscleGroupDesc: e.muscleGroupDesc ?? e.muscleGroupDesc,
    equipmentDesc: e.equipmentDesc ?? e.equipment,
    equipment: e.equipment,
    isCustom: e.isCustom ?? true,
    steps: e.steps ?? e.instructions,
    instructions: e.instructions ?? e.steps,
    tips: e.tips,
    media: e.media ?? { ...DEFAULT_MEDIA },
    createdAt: e.createdAt,
  };
}
