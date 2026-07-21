import type { Exercise, ExerciseCategory } from '@/types';

export const exercises: Exercise[] = [
  // 胸部
  {
    id: 'bench-press',
    name: '臥推',
    category: 'chest',
    muscleGroup: '胸大肌、三頭肌、前三角肌',
    equipment: '槓鈴',
    instructions: [
      '仰臥於臥推椅上，雙腳平貼地面',
      '雙手握槓，握距略寬於肩',
      '控制槓鈴下降至胸口',
      '發力將槓鈴推回起始位置',
    ],
    tips: ['肩胛骨後縮收緊', '臀部緊貼椅面', '手腕保持中立'],
  },
  {
    id: 'incline-dumbbell-press',
    name: '上斜啞鈴推舉',
    category: 'chest',
    muscleGroup: '上胸大肌',
    equipment: '啞鈴',
    instructions: [
      '調整椅子至上斜 30-45 度',
      '雙手握啞鈴置於肩部兩側',
      '推舉至雙臂伸直',
      '控制下降至起始位置',
    ],
    tips: ['手肘與身體呈 45 度', '頂端不鎖死', '控制節奏'],
  },
  {
    id: 'cable-fly',
    name: '纜繩飛鳥',
    category: 'chest',
    muscleGroup: '胸大肌',
    equipment: '纜繩',
    instructions: [
      '雙手握住纜繩把手',
      '身體微前傾，膝蓋微彎',
      '將雙手向內靠攏',
      '緩慢回到起始位置',
    ],
    tips: ['手肘微彎固定', '頂端擠壓胸部', '感受胸肌發力'],
  },
  // 背部
  {
    id: 'deadlift',
    name: '硬舉',
    category: 'back',
    muscleGroup: '背闊肌、臀大肌、腿後側肌群',
    equipment: '槓鈴',
    instructions: [
      '雙腳與肩同寬，槓鈴置於腳背正上方',
      '髖部後推，雙手握槓',
      '保持背部挺直，發力站起',
      '控制下放至地面',
    ],
    tips: ['核心繃緊', '槓鈴貼近身體', '不圓背'],
  },
  {
    id: 'pull-up',
    name: '引體向上',
    category: 'back',
    muscleGroup: '背闊肌、二頭肌',
    equipment: '單槓',
    instructions: [
      '雙手握槓，握距略寬於肩',
      '肩胛骨下壓收縮',
      '拉起身體至下巴過槓',
      '控制下放至完全伸展',
    ],
    tips: ['避免甩動', '頂端擠壓背肌', '全程控制'],
  },
  {
    id: 'barbell-row',
    name: '槓鈴划船',
    category: 'back',
    muscleGroup: '背闊肌、菱形肌',
    equipment: '槓鈴',
    instructions: [
      '髖部後推，上身前傾約 45 度',
      '雙手握槓自然下垂',
      '將槓鈴拉至下腹部',
      '控制下放',
    ],
    tips: ['背部保持平直', '手肘靠近身體', '頂端擠壓'],
  },
  // 腿部
  {
    id: 'squat',
    name: '深蹲',
    category: 'legs',
    muscleGroup: '股四頭肌、臀大肌、腿後側肌群',
    equipment: '槓鈴',
    instructions: [
      '槓鈴置於上背斜方肌',
      '雙腳與肩同寬，腳尖微外八',
      '下蹲至大腿與地面平行',
      '發力站起',
    ],
    tips: ['膝蓋朝腳尖方向', '胸口朝前', '深度足夠'],
  },
  {
    id: 'leg-press',
    name: '腿推',
    category: 'legs',
    muscleGroup: '股四頭肌、臀大肌',
    equipment: '機械',
    instructions: [
      '背部貼緊椅背',
      '雙腳與肩同寬置於踏板',
      '推起踏板至雙腿伸直',
      '控制下降至 90 度',
    ],
    tips: ['膝蓋不鎖死', '腳掌完整貼踏板', '控制速度'],
  },
  {
    id: 'romanian-deadlift',
    name: '羅馬尼亞硬舉',
    category: 'legs',
    muscleGroup: '腿後側肌群、臀大肌',
    equipment: '槓鈴',
    instructions: [
      '雙手握槓自然下垂',
      '髖部後推，膝蓋微彎',
      '槓鈴沿大腿下降至小腿中段',
      '發力回到起始位置',
    ],
    tips: ['感受腿後側拉伸', '背部保持平直', '不塌腰'],
  },
  // 肩膀
  {
    id: 'overhead-press',
    name: '肩推',
    category: 'shoulders',
    muscleGroup: '三角肌、三頭肌',
    equipment: '槓鈴',
    instructions: [
      '槓鈴置於鎖骨位置',
      '雙手握槓略寬於肩',
      '推舉至雙臂伸直過頭',
      '控制下降至鎖骨',
    ],
    tips: ['核心繃緊', '避免腰部過度伸展', '頂端擠壓'],
  },
  {
    id: 'lateral-raise',
    name: '側平舉',
    category: 'shoulders',
    muscleGroup: '側三角肌',
    equipment: '啞鈴',
    instructions: [
      '雙手握啞鈴置於身側',
      '手肘微彎',
      '將啞鈴舉至與肩同高',
      '控制下降',
    ],
    tips: ['不聳肩', '手肘引導動作', '控制全程'],
  },
  // 手臂
  {
    id: 'barbell-curl',
    name: '槓鈴二頭彎舉',
    category: 'arms',
    muscleGroup: '二頭肌',
    equipment: '槓鈴',
    instructions: [
      '雙手握槓與肩同寬',
      '上臂貼緊身側',
      '彎舉至胸前',
      '控制下放',
    ],
    tips: ['手腕保持中立', '不甩動', '頂端擠壓'],
  },
  {
    id: 'tricep-pushdown',
    name: '三頭下壓',
    category: 'arms',
    muscleGroup: '三頭肌',
    equipment: '纜繩',
    instructions: [
      '雙手握住纜繩把手',
      '上臂貼緊身側',
      '下壓至手臂完全伸直',
      '控制回到起始位置',
    ],
    tips: ['手肘不外開', '頂端擠壓三頭', '固定上臂'],
  },
  // 核心
  {
    id: 'plank',
    name: '棒式',
    category: 'core',
    muscleGroup: '腹橫肌、腹直肌',
    equipment: '徒手',
    instructions: [
      '前臂撐地與肩同寬',
      '身體呈一直線',
      '核心繃緊保持姿勢',
      '維持指定時間',
    ],
    tips: ['不塌腰', '臀部不下沉', '呼吸均勻'],
  },
  {
    id: 'hanging-leg-raise',
    name: '懸垂抬腿',
    category: 'core',
    muscleGroup: '腹直肌、髖屈肌',
    equipment: '單槓',
    instructions: [
      '雙手握槓懸垂',
      '腹部發力將雙腿抬至水平',
      '控制下放',
      '重複動作',
    ],
    tips: ['不甩動', '控制速度', '頂端擠壓'],
  },
];

export function getExerciseById(id: string): Exercise | undefined {
  return exercises.find((e) => e.id === id);
}

export function getExercisesByCategory(category: ExerciseCategory): Exercise[] {
  return exercises.filter((e) => e.category === category);
}

export const exerciseCategories: { value: ExerciseCategory; label: string }[] = [
  { value: 'chest', label: '胸' },
  { value: 'back', label: '背' },
  { value: 'legs', label: '腿' },
  { value: 'shoulders', label: '肩' },
  { value: 'arms', label: '手臂' },
  { value: 'core', label: '核心' },
];
