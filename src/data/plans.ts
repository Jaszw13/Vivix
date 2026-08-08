import type { TrainingPlan, WarmupItem } from '@/types';

/**
 * 通用熱身樣板，減少重複：
 *  - beginFull：完整 5 個動態伸展（新手 A/B 日用）
 *  - fullLight：完整動態 + 輕重量暖身（新手/中階通用）
 *  - intermediate：中階計畫簡化 3 項（跑一下動態+關節活化）
 */

const dynamicWarmups: WarmupItem[] = [
  {
    id: 'wu-arm-circle',
    type: 'dynamic',
    name: '關節環繞',
    description: '肩、肘、腕各向前向後各 10 圈，放鬆關節囊',
    durationSec: 45,
    dosage: '前後各 10 圈',
  },
  {
    id: 'wu-bodyweight-squat',
    type: 'dynamic',
    name: '徒手深蹲',
    description: '動作要慢，下降時膝蓋對腳尖，感受髖屈與大腿伸展',
    durationSec: 45,
    dosage: '2 組 × 10 次',
  },
  {
    id: 'wu-cat-cow',
    type: 'dynamic',
    name: '貓牛式',
    description: '吸氣翹臀挺胸、吐氣拱背圓肩，喚醒脊椎活動度',
    durationSec: 30,
    dosage: '8–10 次',
  },
  {
    id: 'wu-high-knee',
    type: 'dynamic',
    name: '原地高抬腿',
    description: '抬膝到腰高度，手臂跟著擺，把心跳拉上來',
    durationSec: 45,
    dosage: '30 秒 × 2 回合',
  },
  {
    id: 'wu-scapular-push',
    type: 'dynamic',
    name: '肩胛俯卧撑',
    description: '預備姿勢縮/放肩胛骨，預備臥推/划船的肩胛穩定',
    durationSec: 30,
    dosage: '10 次',
  },
];

function lightSet(name: string, weight: string): WarmupItem {
  return {
    id: `wu-light-${name}`,
    type: 'lightSet',
    name: `${name} · 輕重量暖身`,
    description: `用工作重量的約 40–50%（大約 ${weight}）做 1 組，不用力，專注動作流暢`,
    durationSec: 0,
    dosage: '1 組 × 8–10 次',
  };
}

// 新手 5x5 A 日：深蹲/臥推/划船
const beginnerAWarmup: WarmupItem[] = [
  dynamicWarmups[0],
  dynamicWarmups[1],
  dynamicWarmups[2],
  dynamicWarmups[4],
  lightSet('深蹲', '20–30 kg'),
  lightSet('臥推', '15–20 kg'),
];

// 新手 5x5 B 日：深蹲/肩推/硬舉
const beginnerBWarmup: WarmupItem[] = [
  dynamicWarmups[0],
  dynamicWarmups[1],
  dynamicWarmups[3],
  dynamicWarmups[2],
  lightSet('肩推', '10–15 kg'),
  lightSet('硬舉', '25–35 kg'),
];

// 中階簡化（PPL / UL 都共用）
const intermediateWarmup: WarmupItem[] = [
  dynamicWarmups[0],
  dynamicWarmups[3],
  dynamicWarmups[4],
];

export const trainingPlans: TrainingPlan[] = [
  {
    id: '5x5-strength',
    name: '5x5 力量基礎',
    difficulty: 'beginner',
    description: '經典新手力量訓練計畫，以三大項為核心，每週 3 天，專注於漸進超負荷。',
    cover: '5×5',
    days: [
      {
        id: '5x5-day-a',
        dayName: 'A 日',
        dayIndex: 0,
        warmup: beginnerAWarmup,
        exercises: [
          { id: 'p1-e1', exerciseId: 'squat', name: '深蹲', targetSets: 5, targetReps: '5', targetWeight: 60 },
          { id: 'p1-e2', exerciseId: 'bench-press', name: '臥推', targetSets: 5, targetReps: '5', targetWeight: 40 },
          { id: 'p1-e3', exerciseId: 'barbell-row', name: '槓鈴划船', targetSets: 5, targetReps: '5', targetWeight: 40 },
        ],
      },
      {
        id: '5x5-day-b',
        dayName: 'B 日',
        dayIndex: 1,
        warmup: beginnerBWarmup,
        exercises: [
          { id: 'p1-e4', exerciseId: 'squat', name: '深蹲', targetSets: 5, targetReps: '5', targetWeight: 62.5 },
          { id: 'p1-e5', exerciseId: 'overhead-press', name: '肩推', targetSets: 5, targetReps: '5', targetWeight: 25 },
          { id: 'p1-e6', exerciseId: 'deadlift', name: '硬舉', targetSets: 1, targetReps: '5', targetWeight: 60 },
        ],
      },
    ],
  },
  {
    id: 'push-pull-legs',
    name: '推拉腿 PPL',
    difficulty: 'intermediate',
    description: '經典 6 天推拉腿分化訓練，高訓練量適合進階者，每個肌群每週刺激兩次。',
    cover: 'PPL',
    days: [
      {
        id: 'ppl-push',
        dayName: '推 Push',
        dayIndex: 0,
        warmup: [
          ...intermediateWarmup,
          lightSet('臥推', '25–30 kg'),
        ],
        exercises: [
          { id: 'p2-e1', exerciseId: 'bench-press', name: '臥推', targetSets: 4, targetReps: '6-8', targetWeight: 60 },
          { id: 'p2-e2', exerciseId: 'incline-dumbbell-press', name: '上斜啞鈴推舉', targetSets: 3, targetReps: '8-10', targetWeight: 20 },
          { id: 'p2-e3', exerciseId: 'overhead-press', name: '肩推', targetSets: 3, targetReps: '8-10', targetWeight: 35 },
          { id: 'p2-e4', exerciseId: 'tricep-pushdown', name: '三頭下壓', targetSets: 4, targetReps: '10-12', targetWeight: 25 },
        ],
      },
      {
        id: 'ppl-pull',
        dayName: '拉 Pull',
        dayIndex: 1,
        warmup: [
          ...intermediateWarmup,
          dynamicWarmups[2],
          lightSet('硬舉', '35–45 kg'),
        ],
        exercises: [
          { id: 'p2-e5', exerciseId: 'deadlift', name: '硬舉', targetSets: 3, targetReps: '5', targetWeight: 80 },
          { id: 'p2-e6', exerciseId: 'pull-up', name: '引體向上', targetSets: 4, targetReps: '6-8' },
          { id: 'p2-e7', exerciseId: 'barbell-row', name: '槓鈴划船', targetSets: 4, targetReps: '8-10', targetWeight: 50 },
          { id: 'p2-e8', exerciseId: 'barbell-curl', name: '槓鈴二頭彎舉', targetSets: 4, targetReps: '10-12', targetWeight: 25 },
        ],
      },
      {
        id: 'ppl-legs',
        dayName: '腿 Legs',
        dayIndex: 2,
        warmup: [
          dynamicWarmups[0],
          dynamicWarmups[1],
          dynamicWarmups[3],
          lightSet('深蹲', '35–45 kg'),
        ],
        exercises: [
          { id: 'p2-e9', exerciseId: 'squat', name: '深蹲', targetSets: 4, targetReps: '6-8', targetWeight: 80 },
          { id: 'p2-e10', exerciseId: 'romanian-deadlift', name: '羅馬尼亞硬舉', targetSets: 3, targetReps: '8-10', targetWeight: 60 },
          { id: 'p2-e11', exerciseId: 'leg-press', name: '腿推', targetSets: 4, targetReps: '10-12', targetWeight: 120 },
          { id: 'p2-e12', exerciseId: 'plank', name: '棒式', targetSets: 3, targetReps: '60s' },
        ],
      },
    ],
  },
  {
    id: 'upper-lower',
    name: '上下分裂',
    difficulty: 'intermediate',
    description: '每週 4 天上下半身分化，平衡訓練量與恢復，適合追求穩定進步的訓練者。',
    cover: 'U/L',
    days: [
      {
        id: 'ul-upper-a',
        dayName: '上 A',
        dayIndex: 0,
        warmup: [
          ...intermediateWarmup,
          lightSet('臥推', '30–35 kg'),
        ],
        exercises: [
          { id: 'p3-e1', exerciseId: 'bench-press', name: '臥推', targetSets: 4, targetReps: '5', targetWeight: 65 },
          { id: 'p3-e2', exerciseId: 'barbell-row', name: '槓鈴划船', targetSets: 4, targetReps: '6-8', targetWeight: 55 },
          { id: 'p3-e3', exerciseId: 'overhead-press', name: '肩推', targetSets: 3, targetReps: '8', targetWeight: 40 },
          { id: 'p3-e4', exerciseId: 'barbell-curl', name: '槓鈴二頭彎舉', targetSets: 3, targetReps: '10', targetWeight: 30 },
        ],
      },
      {
        id: 'ul-lower-a',
        dayName: '下 A',
        dayIndex: 1,
        warmup: [
          dynamicWarmups[0],
          dynamicWarmups[1],
          dynamicWarmups[3],
          lightSet('深蹲', '40–50 kg'),
        ],
        exercises: [
          { id: 'p3-e5', exerciseId: 'squat', name: '深蹲', targetSets: 4, targetReps: '5', targetWeight: 90 },
          { id: 'p3-e6', exerciseId: 'romanian-deadlift', name: '羅馬尼亞硬舉', targetSets: 3, targetReps: '8', targetWeight: 70 },
          { id: 'p3-e7', exerciseId: 'leg-press', name: '腿推', targetSets: 3, targetReps: '12', targetWeight: 140 },
          { id: 'p3-e8', exerciseId: 'hanging-leg-raise', name: '懸垂抬腿', targetSets: 3, targetReps: '10-12' },
        ],
      },
    ],
  },
];

export function getPlanById(id: string): TrainingPlan | undefined {
  return trainingPlans.find((p) => p.id === id);
}
