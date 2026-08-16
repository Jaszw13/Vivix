/**
 * Vivix 成就目錄 v1.3 — 58 個成就，四軌 × 分級
 * 對應《執行規格 v1.3》§3 完整成就目錄 TS
 */
import type { MuscleGroup, LiftFamily } from '@/types';

export type AchievementTrack = 'strength' | 'consistency' | 'progress' | 'behavior';
// N-5：LiftFamily 權威定義已移至 @/types，此處 re-export 保持既有 import 兼容
export type { LiftFamily };

export type AchievementMetric =
  | 'est1RM_kg' | 'est1RM_bw' | 'est1RM_delta'
  | 'sessions' | 'streak' | 'weekly_rhythm'
  | 'volume_delta_months' | 'pr_count_session'
  | 'group_pr' | 'group_pr_all' | 'group_coverage'
  | 'warmup_count' | 'full_plan_count' | 'perfect_log_count' | 'explorer'
  | 'cardio_minutes' | 'cardio_sessions' | 'cardio_weekly_rhythm';

export interface AchievementDef {
  id: string;
  track: AchievementTrack;
  line: string;
  tier: 1 | 2 | 3 | 4 | 5;
  metric: AchievementMetric;
  threshold: number;
  title: string;
  copy: string;
  muscleGroup?: MuscleGroup;
  liftFamily?: LiftFamily;
  source?: string;
  partnerReward?: string;
}

const A = (
  id: string, track: AchievementTrack, line: string, tier: 1|2|3|4|5,
  metric: AchievementMetric, threshold: number, title: string, copy: string,
  extra: Partial<AchievementDef> = {},
): AchievementDef => ({ id, track, line, tier, metric, threshold, title, copy, ...extra });

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── 力量門檻軌（來源見 strengthStandards.ts）──
  A('bench_t1','strength','bench',1,'est1RM_kg',40,'上槓','臥推 {kg}kg，槓鈴之路開始。',{liftFamily:'bench'}),
  A('bench_t2','strength','bench',2,'est1RM_kg',60,'第一片','臥推 {kg}kg，每邊第一片 20kg 上槓。',{liftFamily:'bench'}),
  A('bench_t3','strength','bench',3,'est1RM_kg',100,'100kg 俱樂部','臥推 {kg}kg！從 {startKg}kg 到今天：{weeks} 週、{sessions} 次訓練。你正式進入 100kg 俱樂部。',{liftFamily:'bench',partnerReward:'mini_barbell_badge',source:'standards#bench.t3'}),
  A('bench_t4','strength','bench',4,'est1RM_bw',1.25,'超越體重','臥推達到體重 {ratio} 倍。',{liftFamily:'bench',source:'standards#bench.t4'}),
  A('bench_t5','strength','bench',5,'est1RM_bw',1.5,'推胸高手','臥推體重 {ratio} 倍，這是多數訓練者兩年內的目標。',{liftFamily:'bench',source:'standards#bench.t5'}),

  A('squat_t1','strength','squat',1,'est1RM_kg',60,'起蹲','深蹲 {kg}kg，腿部地圖解鎖。',{liftFamily:'squat'}),
  A('squat_t2','strength','squat',2,'est1RM_kg',100,'百公斤蹲','深蹲 {kg}kg，兩位數變三位數。',{liftFamily:'squat'}),
  A('squat_t3','strength','squat',3,'est1RM_kg',140,'三片','深蹲 {kg}kg，每邊三片。',{liftFamily:'squat',source:'standards#squat.t3'}),
  A('squat_t4','strength','squat',4,'est1RM_bw',1.5,'1.5 倍體重','深蹲體重 {ratio} 倍。',{liftFamily:'squat',source:'standards#squat.t4'}),
  A('squat_t5','strength','squat',5,'est1RM_bw',2,'雙倍體重深蹲','深蹲體重 {ratio} 倍——健身圈公認的強者線。',{liftFamily:'squat',partnerReward:'explorer_cap',source:'standards#squat.t5'}),

  A('dead_t1','strength','deadlift',1,'est1RM_kg',100,'百公斤拉','硬舉 {kg}kg。',{liftFamily:'deadlift'}),
  A('dead_t2','strength','deadlift',2,'est1RM_kg',140,'三片拉起','硬舉 {kg}kg。',{liftFamily:'deadlift'}),
  A('dead_t3','strength','deadlift',3,'est1RM_kg',180,'四片','硬舉 {kg}kg，每邊四片。',{liftFamily:'deadlift',source:'standards#deadlift.t3'}),
  A('dead_t4','strength','deadlift',4,'est1RM_bw',2,'雙倍體重','硬舉體重 {ratio} 倍。',{liftFamily:'deadlift',source:'standards#deadlift.t4'}),
  A('dead_t5','strength','deadlift',5,'est1RM_bw',2.5,'硬舉強者','硬舉體重 {ratio} 倍，力量軌的燈塔。',{liftFamily:'deadlift',source:'standards#deadlift.t5'}),

  A('ohp_t1','strength','ohp',1,'est1RM_kg',30,'舉起','肩推 {kg}kg。',{liftFamily:'ohp'}),
  A('ohp_t2','strength','ohp',2,'est1RM_kg',40,'過半','肩推 {kg}kg。',{liftFamily:'ohp'}),
  A('ohp_t3','strength','ohp',3,'est1RM_kg',60,'六十肩推','肩推 {kg}kg。',{liftFamily:'ohp'}),
  A('ohp_t4','strength','ohp',4,'est1RM_bw',0.75,'四分之三體重','肩推體重 {ratio} 倍。',{liftFamily:'ohp',source:'standards#ohp.t4'}),
  A('ohp_t5','strength','ohp',5,'est1RM_bw',1,'體重肩推','肩推體重 {ratio} 倍，肩膀的畢業門檻。',{liftFamily:'ohp',source:'standards#ohp.t5'}),

  // ── 堅持節奏軌 ──
  A('sess_t1','consistency','sessions',1,'sessions',1,'第一步','第一次訓練完成。所有人都會說「下次開始」，你今天真的開始了。'),
  A('sess_t2','consistency','sessions',2,'sessions',5,'五練','累計 {sessions} 次訓練。'),
  A('sess_t3','consistency','sessions',3,'sessions',10,'十練','累計 {sessions} 次，習慣正在成形。'),
  A('sess_t4','consistency','sessions',4,'sessions',25,'習慣成形','累計 {sessions} 次。研究說習慣約需 66 天，你已過半。'),
  A('sess_t5','consistency','sessions',5,'sessions',50,'五十練老兵','累計 {sessions} 次訓練，這已經是你的生活方式。'),

  A('streak_t1','consistency','streak',1,'streak',3,'三連','連續 3 天訓練。'),
  A('streak_t2','consistency','streak',2,'streak',7,'一週連貫','連續 7 天，一週不斷。'),
  A('streak_t3','consistency','streak',3,'streak',14,'兩週節奏','連續 14 天。'),
  A('streak_t4','consistency','streak',4,'streak',30,'三十天夥伴','連續 30 天，Partner 的圍巾為你解鎖。',{partnerReward:'scarf'}),
  A('streak_t5','consistency','streak',5,'streak',60,'六十天傳說','連續 60 天。'),

  A('rhythm_t1','consistency','rhythm',1,'weekly_rhythm',2,'兩週穩定','連續 2 週每週 ≥2 練。'),
  A('rhythm_t2','consistency','rhythm',2,'weekly_rhythm',4,'月穩定','連續 4 週每週 ≥2 練。'),
  A('rhythm_t3','consistency','rhythm',3,'weekly_rhythm',8,'雙月穩定','連續 8 週。'),
  A('rhythm_t4','consistency','rhythm',4,'weekly_rhythm',12,'季度穩定','連續 12 週，一季不斷。'),
  A('rhythm_t5','consistency','rhythm',5,'weekly_rhythm',16,'十六週鐵律','連續 16 週每週 ≥2 練。'),

  A('cover_t1','consistency','coverage',1,'group_coverage',1,'全地圖訓練者','六個部位都練過一次，沒有被遺忘的肌肉。',{partnerReward:'explorer_cap'}),
  A('cover_t2','consistency','coverage',2,'group_coverage',3,'無弱點','六個部位各 ≥3 次。'),

  // ── 自我超越軌 ──
  A('pr_chest','progress','group_pr',1,'group_pr',1,'胸部突破','胸部第一次 PR，你比上次的自己強。',{muscleGroup:'chest'}),
  A('pr_back','progress','group_pr',1,'group_pr',1,'背部突破','背部第一次 PR。',{muscleGroup:'back'}),
  A('pr_legs','progress','group_pr',1,'group_pr',1,'腿部突破','腿部第一次 PR。',{muscleGroup:'legs'}),
  A('pr_shoulders','progress','group_pr',1,'group_pr',1,'肩部突破','肩部第一次 PR。',{muscleGroup:'shoulders'}),
  A('pr_arms','progress','group_pr',1,'group_pr',1,'手臂突破','手臂第一次 PR。',{muscleGroup:'arms'}),
  A('pr_core','progress','group_pr',1,'group_pr',1,'核心突破','核心第一次 PR。',{muscleGroup:'core'}),
  A('pr_all','progress','group_pr_all',1,'group_pr_all',6,'六線突破','六個部位全部 PR，全面變強。'),
  A('delta_t1','progress','delta',1,'est1RM_delta',0.10,'強 10%','任一動作估算 1RM 比首次記錄 +10%。'),
  A('delta_t2','progress','delta',2,'est1RM_delta',0.25,'強 25%','比首次記錄 +25%。'),
  A('delta_t3','progress','delta',3,'est1RM_delta',0.50,'強 50%','比首次記錄 +50%，判若兩人。'),
  A('vol_t1','progress','volume',1,'volume_delta_months',1,'超越 30 天前的自己','本月訓練量超過上月。'),
  A('vol_t2','progress','volume',2,'volume_delta_months',3,'三連升','連續 3 個月訓練量上升。'),
  A('vol_t3','progress','volume',3,'volume_delta_months',6,'半年上升曲線','連續 6 個月上升。'),
  A('triple','progress','session_pr',1,'pr_count_session',3,'單場三響','一次訓練 3 個 PR，今天狀態封神。'),

  // ── 行為掌握軌 ──
  A('warm_t1','behavior','warmup',1,'warmup_count',1,'熱身先鋒','第一次完成熱身，安全也是實力。'),
  A('warm_t2','behavior','warmup',2,'warmup_count',10,'熱身習慣','10 次熱身完成。'),
  A('warm_t3','behavior','warmup',3,'warmup_count',25,'熱身大師','25 次熱身完成。'),
  A('plan_t1','behavior','full_plan',1,'full_plan_count',1,'完整完成','第一次完成當日全部計劃組數。'),
  A('plan_t2','behavior','full_plan',2,'full_plan_count',10,'十次完整','10 次完整完成計劃。'),
  A('log_t1','behavior','perfect_log',1,'perfect_log_count',10,'完美記錄','10 次訓練完整記錄所有組數。'),
  A('explorer','behavior','explorer',1,'explorer',1,'探索者','建立並分類自訂動作，或建立自訂計劃。'),

  // ── 有氧增量（+9，E-05；id/metric 與 §5 規格一致）──
  A('cardio_first',   'consistency','cardio_first',1,'cardio_sessions',1,'有氧初體驗','第一次完成有氧。跑步機上的每一分鐘都算數。'),
  A('cardio_min_t1',  'consistency','cardio_min',  1,'cardio_minutes',30, '三十分鐘打底','累積 30 分鐘有氧。循序漸進，穩步前進。'),
  A('cardio_min_t2',  'consistency','cardio_min',  2,'cardio_minutes',60, '一小時里程碑','累積 60 分鐘有氧。節奏穩住，進步就會發生。'),
  A('cardio_min_t3',  'consistency','cardio_min',  3,'cardio_minutes',120,'兩小時達標','累積 120 分鐘有氧。每一次都在累積未來的底氣。'),
  A('cardio_min_t4',  'consistency','cardio_min',  4,'cardio_minutes',300,'五小時俱樂部','累積 300 分鐘有氧。耐力看得見。'),
  A('cardio_min_t5',  'consistency','cardio_min',  5,'cardio_minutes',600,'十小時巔峰','累積 600 分鐘有氧。汗水不會騙人。'),
  A('cardio_sess_t2', 'consistency','cardio_sess', 2,'cardio_sessions',10,'十次有氧達成','10 次有氧完成。每一次出發都算。'),
  A('cardio_sess_t3', 'consistency','cardio_sess', 3,'cardio_sessions',25,'二十五次里程碑','25 次有氧完成。節律已在體內。'),
  A('cardio_weekly',  'consistency','cardio_wk',   2,'cardio_weekly_rhythm',4,'四週連動','連續 4 週至少 1 次有氧。你已經建立有氧節律。'),
];

// ── Tier 視覺樣式 ──
export const TIER_COLORS: Record<number, { label: string; color: string; bg: string; ring: string; text: string }> = {
  1: { label: '石', color: '#8A8F98', bg: 'bg-stone-500/15', ring: 'ring-stone-500/30', text: 'text-stone-400' },
  2: { label: '銅', color: '#B0805A', bg: 'bg-amber-700/15', ring: 'ring-amber-700/30', text: 'text-amber-600' },
  3: { label: '銀', color: '#C0C6D1', bg: 'bg-slate-400/15', ring: 'ring-slate-400/30', text: 'text-slate-300' },
  4: { label: '金', color: '#C9A24B', bg: 'bg-amber-500/15', ring: 'ring-amber-500/30', text: 'text-amber-400' },
  5: { label: '電', color: '#F59E0B', bg: 'bg-amber-400/20', ring: 'ring-amber-400/40', text: 'text-amber-300' },
};

export const TRACK_LABELS: Record<AchievementTrack, string> = {
  strength: '力量',
  consistency: '堅持',
  progress: '超越',
  behavior: '行為',
};

export const TRACK_ICONS: Record<AchievementTrack, string> = {
  strength: '💪',
  consistency: '🔥',
  progress: '📈',
  behavior: '🎯',
};

// ── Lift Family 映射 ──
const LIFT_FAMILY_KEYWORDS: Record<LiftFamily, string[]> = {
  bench: ['臥推', 'bench', '推胸'],
  squat: ['深蹲', 'squat'],
  deadlift: ['硬舉', 'deadlift', 'dead'],
  ohp: ['肩推', 'overhead', 'ohp', 'military'],
};

export function getLiftFamily(
  exerciseId: string,
  exerciseName?: string,
  explicitFamily?: LiftFamily,
): LiftFamily | undefined {
  // N-5：優先明確欄位（自訂動作可指定）
  if (explicitFamily) return explicitFamily;
  // 先查內建 ID
  if (exerciseId === 'bench-press') return 'bench';
  if (exerciseId === 'squat') return 'squat';
  if (exerciseId === 'deadlift') return 'deadlift';
  if (exerciseId === 'overhead-press') return 'ohp';
  // 名稱匹配（含自訂動作）
  const name = (exerciseName ?? '').toLowerCase();
  for (const [family, keywords] of Object.entries(LIFT_FAMILY_KEYWORDS)) {
    if (keywords.some((kw) => name.includes(kw.toLowerCase()))) {
      return family as LiftFamily;
    }
  }
  return undefined;
}

// ── 排序後的成就列表（按軌 → 等級 → 門檻）──
export const SORTED_ACHIEVEMENTS = [...ACHIEVEMENTS].sort((a, b) => {
  const trackOrder: Record<AchievementTrack, number> = { strength: 0, consistency: 1, progress: 2, behavior: 3 };
  return trackOrder[a.track] - trackOrder[b.track]
    || a.line.localeCompare(b.line)
    || a.tier - b.tier;
});

// ── 按軌分組 ──
export function groupByTrack(): Record<AchievementTrack, AchievementDef[]> {
  const out: Record<AchievementTrack, AchievementDef[]> = {
    strength: [], consistency: [], progress: [], behavior: [],
  };
  for (const a of ACHIEVEMENTS) {
    out[a.track].push(a);
  }
  return out;
}

// ── 按 line 分組（用於 StrengthLadder）──
export function groupByLine(track: AchievementTrack): Record<string, AchievementDef[]> {
  const out: Record<string, AchievementDef[]> = {};
  for (const a of ACHIEVEMENTS) {
    if (a.track !== track) continue;
    if (!out[a.line]) out[a.line] = [];
    out[a.line].push(a);
  }
  return out;
}
