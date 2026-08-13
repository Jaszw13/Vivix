import type { TrainingPlan, WarmupItem, PlannedExercise, MuscleGroup, EquipmentType } from '@/types';
import { exercises as builtinExercises, getExerciseById } from '@/data/exercises';

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
    name: '肩胛俯臥撑',
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

/**
 * 建立 v2 PlannedExercise：
 *   - 自動從 exercises 庫讀取 muscleGroup / equipmentType 建立 snapshot
 *   - alternativeIds：同部位非自身的內建動作（T-04 訓練中替換用）
 */
function buildPlannedExercise(
  id: string,
  exerciseId: string,
  name: string,
  targetSets: number,
  targetReps: string,
  opts: {
    targetWeight?: number;
    restSeconds?: number;
    alternativeIds?: string[];
  } = {}
): PlannedExercise {
  const ex = getExerciseById(exerciseId);
  const muscleGroup: MuscleGroup =
    (ex?.muscleGroup as MuscleGroup) ?? (ex?.category as MuscleGroup) ?? 'chest';
  const equipmentType: EquipmentType = ex?.equipmentType ?? 'other';

  // 自動建議替代動作：同部位的其他內建動作
  // （若使用者有手動指定，優先用手動）
  let alternativeIds = opts.alternativeIds;
  if (!alternativeIds) {
    alternativeIds = builtinExercises
      .filter((e) => e.muscleGroup === muscleGroup && e.id !== exerciseId)
      .slice(0, 4)
      .map((e) => e.id);
  }

  return {
    id,
    exerciseId,
    name,
    snapshot: {
      name,
      muscleGroup,
      equipmentType,
    },
    targetSets,
    targetReps,
    targetWeight: opts.targetWeight,
    restSeconds: opts.restSeconds ?? 90,
    alternativeIds,
  };
}

const DEFAULT_REST: Record<string, number> = {
  compound: 150, // 深蹲、硬舉、臥推、划船、肩推
  accessory: 90, // 輔助 / 啞鈴 / 纜繩
  core: 60,
};

export const trainingPlans: TrainingPlan[] = [
  {
    id: '5x5-strength',
    name: '5x5 力量基礎',
    difficulty: 'beginner',
    description: '經典新手力量訓練計畫，以三大項為核心，每週 3 天，專注於漸進超負荷。',
    cover: '5×5',
    isPreset: true,
    isCustom: false,
    editedByUser: false,
    days: [
      {
        id: '5x5-day-a',
        dayName: 'A 日',
        dayIndex: 0,
        warmup: beginnerAWarmup,
        exercises: [
          buildPlannedExercise('p1-e1', 'squat', '深蹲', 5, '5', { targetWeight: 60, restSeconds: DEFAULT_REST.compound }),
          buildPlannedExercise('p1-e2', 'bench-press', '臥推', 5, '5', { targetWeight: 40, restSeconds: DEFAULT_REST.compound }),
          buildPlannedExercise('p1-e3', 'barbell-row', '槓鈴划船', 5, '5', { targetWeight: 40, restSeconds: DEFAULT_REST.compound }),
        ],
      },
      {
        id: '5x5-day-b',
        dayName: 'B 日',
        dayIndex: 1,
        warmup: beginnerBWarmup,
        exercises: [
          buildPlannedExercise('p1-e4', 'squat', '深蹲', 5, '5', { targetWeight: 62.5, restSeconds: DEFAULT_REST.compound }),
          buildPlannedExercise('p1-e5', 'overhead-press', '肩推', 5, '5', { targetWeight: 25, restSeconds: DEFAULT_REST.compound }),
          buildPlannedExercise('p1-e6', 'deadlift', '硬舉', 1, '5', { targetWeight: 60, restSeconds: DEFAULT_REST.compound }),
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
    isPreset: true,
    isCustom: false,
    editedByUser: false,
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
          buildPlannedExercise('p2-e1', 'bench-press', '臥推', 4, '6-8', { targetWeight: 60, restSeconds: DEFAULT_REST.compound }),
          buildPlannedExercise('p2-e2', 'incline-dumbbell-press', '上斜啞鈴推舉', 3, '8-10', { targetWeight: 20, restSeconds: DEFAULT_REST.accessory }),
          buildPlannedExercise('p2-e3', 'overhead-press', '肩推', 3, '8-10', { targetWeight: 35, restSeconds: DEFAULT_REST.compound }),
          buildPlannedExercise('p2-e4', 'tricep-pushdown', '三頭下壓', 4, '10-12', { targetWeight: 25, restSeconds: DEFAULT_REST.accessory }),
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
          buildPlannedExercise('p2-e5', 'deadlift', '硬舉', 3, '5', { targetWeight: 80, restSeconds: DEFAULT_REST.compound }),
          buildPlannedExercise('p2-e6', 'pull-up', '引體向上', 4, '6-8', { restSeconds: DEFAULT_REST.accessory }),
          buildPlannedExercise('p2-e7', 'barbell-row', '槓鈴划船', 4, '8-10', { targetWeight: 50, restSeconds: DEFAULT_REST.compound }),
          buildPlannedExercise('p2-e8', 'barbell-curl', '槓鈴二頭彎舉', 4, '10-12', { targetWeight: 25, restSeconds: DEFAULT_REST.accessory }),
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
          buildPlannedExercise('p2-e9', 'squat', '深蹲', 4, '6-8', { targetWeight: 80, restSeconds: DEFAULT_REST.compound }),
          buildPlannedExercise('p2-e10', 'romanian-deadlift', '羅馬尼亞硬舉', 3, '8-10', { targetWeight: 60, restSeconds: DEFAULT_REST.compound }),
          buildPlannedExercise('p2-e11', 'leg-press', '腿推', 4, '10-12', { targetWeight: 120, restSeconds: DEFAULT_REST.accessory }),
          buildPlannedExercise('p2-e12', 'plank', '棒式', 3, '60s', { restSeconds: DEFAULT_REST.core }),
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
    isPreset: true,
    isCustom: false,
    editedByUser: false,
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
          buildPlannedExercise('p3-e1', 'bench-press', '臥推', 4, '5', { targetWeight: 65, restSeconds: DEFAULT_REST.compound }),
          buildPlannedExercise('p3-e2', 'barbell-row', '槓鈴划船', 4, '6-8', { targetWeight: 55, restSeconds: DEFAULT_REST.compound }),
          buildPlannedExercise('p3-e3', 'overhead-press', '肩推', 3, '8', { targetWeight: 40, restSeconds: DEFAULT_REST.compound }),
          buildPlannedExercise('p3-e4', 'barbell-curl', '槓鈴二頭彎舉', 3, '10', { targetWeight: 30, restSeconds: DEFAULT_REST.accessory }),
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
          buildPlannedExercise('p3-e5', 'squat', '深蹲', 4, '5', { targetWeight: 90, restSeconds: DEFAULT_REST.compound }),
          buildPlannedExercise('p3-e6', 'romanian-deadlift', '羅馬尼亞硬舉', 3, '8', { targetWeight: 70, restSeconds: DEFAULT_REST.compound }),
          buildPlannedExercise('p3-e7', 'leg-press', '腿推', 3, '12', { targetWeight: 140, restSeconds: DEFAULT_REST.accessory }),
          buildPlannedExercise('p3-e8', 'hanging-leg-raise', '懸垂抬腿', 3, '10-12', { restSeconds: DEFAULT_REST.core }),
        ],
      },
    ],
  },
];

/**
 * A-011：新手預設計畫 ID 單一來源（Onboarding / Dashboard 共用）
 */
export const DEFAULT_BEGINNER_PLAN_ID = '5x5-strength';

export function getPlanById(id: string): TrainingPlan | undefined {
  return trainingPlans.find((p) => p.id === id);
}

/**
 * 從舊版本的 TrainingPlan（無 snapshot/alternativeIds）
 * 轉換為 v2 TrainingPlan（migrate 用）
 */
export function migratePlanToV2(plan: Partial<TrainingPlan>): TrainingPlan {
  const days = (plan.days ?? []).map((d) => ({
    ...d,
    exercises: (d.exercises ?? []).map((pe) =>
      buildPlannedExercise(pe.id, pe.exerciseId, pe.name, pe.targetSets, pe.targetReps, {
        targetWeight: pe.targetWeight,
        restSeconds: pe.restSeconds,
      })
    ),
  }));
  return {
    id: plan.id ?? `plan-${Date.now()}`,
    name: plan.name ?? '未命名計畫',
    difficulty: plan.difficulty ?? 'beginner',
    description: plan.description ?? '',
    cover: plan.cover ?? '自訂',
    isPreset: plan.isPreset ?? false,
    isCustom: plan.isCustom ?? true,
    derivedFromPresetId: plan.derivedFromPresetId,
    editedByUser: plan.editedByUser ?? false,
    days,
  };
}
