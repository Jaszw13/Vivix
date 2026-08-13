/**
 * Vivix Strength Standards — 力量標準查證資料
 * 
 * 來源：
 *   - ExRx.net Strength Standards (https://exrx.net/Testing/WeightLifting/StrengthStandards)
 *   - StrengthLevel.com 社群數據 (https://strengthlevel.com)
 *   - Jeff Nippard 影片標準 (YouTube)
 * 
 * 查證日期：2026-08-12
 * 查證者：AI Agent
 * 
 * 門檻校準原則：
 *   - plate 文化門檻：60/100/140/180kg（1–4 片 per side，含 20kg 槓）
 *   - 體重比門檻取 intermediate→advanced 區間
 *   - lb→kg 轉換後取整到乾淨數字
 *   - 不鼓勵測 1RM 最大值；一律用 Epley 估算
 */

export interface StrengthTier {
  id: string;
  kg?: number;
  bw?: number;
  plates?: string;
  note?: string;
}

export interface StrengthStandard {
  family: 'bench' | 'squat' | 'deadlift' | 'ohp';
  name: string;
  tiers: StrengthTier[];
}

export const STRENGTH_STANDARDS: StrengthStandard[] = [
  {
    family: 'bench',
    name: '臥推',
    tiers: [
      { id: 'bench.t1', kg: 40, plates: '空槓+小片', note: 'Novice 下限；ExRx Novice 50kg@75kg BW → 取整 40kg' },
      { id: 'bench.t2', kg: 60, plates: '1 片', note: 'ExRx Novice 70kg@75kg BW → 取 plate 門檻 60kg' },
      { id: 'bench.t3', kg: 100, plates: '2 片', note: 'ExRx Intermediate 85kg@75kg BW；plate 文化門檻 100kg' },
      { id: 'bench.t4', bw: 1.25, note: 'ExRx Intermediate 1.25×BW (male)' },
      { id: 'bench.t5', bw: 1.5, note: 'ExRx Intermediate→Advanced 過渡區 1.5×BW' },
    ],
  },
  {
    family: 'squat',
    name: '深蹲',
    tiers: [
      { id: 'squat.t1', kg: 60, plates: '1 片', note: 'ExRx Novice 95kg@75kg → 取 plate 門檻 60kg' },
      { id: 'squat.t2', kg: 100, plates: '2 片', note: 'ExRx Novice→Intermediate 過渡' },
      { id: 'squat.t3', kg: 140, plates: '3 片', note: 'ExRx Intermediate 130kg@75kg → plate 門檻 140kg' },
      { id: 'squat.t4', bw: 1.5, note: 'ExRx Intermediate 1.5×BW (male)；Jeff Nippard Beginner 上限' },
      { id: 'squat.t5', bw: 2, note: 'ExRx Advanced 2×BW (male)；健身圈公認強者線' },
    ],
  },
  {
    family: 'deadlift',
    name: '硬舉',
    tiers: [
      { id: 'deadlift.t1', kg: 100, plates: '2 片', note: 'ExRx Novice 108kg@75kg → 取 100kg' },
      { id: 'deadlift.t2', kg: 140, plates: '3 片', note: 'ExRx Novice→Intermediate 過渡' },
      { id: 'deadlift.t3', kg: 180, plates: '4 片', note: 'ExRx Intermediate 150kg@75kg → plate 門檻 180kg' },
      { id: 'deadlift.t4', bw: 2, note: 'ExRx Intermediate 2×BW (male)' },
      { id: 'deadlift.t5', bw: 2.5, note: 'ExRx Advanced 2.5×BW (male)' },
    ],
  },
  {
    family: 'ohp',
    name: '肩推',
    tiers: [
      { id: 'ohp.t1', kg: 30, note: 'ExRx Novice 42kg@75kg → 取整 30kg' },
      { id: 'ohp.t2', kg: 40, note: 'ExRx Novice→Intermediate 過渡' },
      { id: 'ohp.t3', kg: 60, note: 'ExRx Intermediate 55kg@75kg → 取整 60kg' },
      { id: 'ohp.t4', bw: 0.75, note: 'ExRx Intermediate 0.75×BW (male)' },
      { id: 'ohp.t5', bw: 1, note: 'ExRx Advanced 1×BW (male)；肩膀畢業門檻' },
    ],
  },
];

export const STANDARDS_META = {
  sources: [
    'ExRx.net — https://exrx.net/Testing/WeightLifting/StrengthStandards',
    'StrengthLevel.com — https://strengthlevel.com',
    'Jeff Nippard (YouTube) — Realistic Strength Standards',
  ],
  fetchedAt: '2026-08-12',
  verifiedBy: 'AI Agent',
  notes: [
    '所有門檻以男性標準為基準（女性約為男性的 60-70%）',
    'plate 門檻 = 20kg 槓 + N×20kg per side（60=1片, 100=2片, 140=3片, 180=4片）',
    '不鼓勵測 1RM 最大值；一律用 Epley 公式估算',
    '體重比成就需要用戶填寫體重；未填時顯示為挑戰、不誤觸發',
  ],
};

export function getStandardByFamily(family: string): StrengthStandard | undefined {
  return STRENGTH_STANDARDS.find((s) => s.family === family);
}
