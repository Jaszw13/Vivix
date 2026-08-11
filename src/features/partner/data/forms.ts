import type { PartnerForm } from '../types';

export const PARTNER_FORMS: PartnerForm[] = [
  {
    id: 'stage_0',
    name: '初見',
    requiredWorkouts: 0,
    description: 'Partner 在引導時出現。',
  },
  {
    id: 'stage_1',
    name: '起步',
    requiredWorkouts: 1,
    description: 'Partner 獲得第一個配件並升級。',
  },
  {
    id: 'stage_2',
    name: '活躍',
    requiredWorkouts: 3,
    description: 'Partner 出現明顯視覺變化。',
  },
  {
    id: 'stage_3',
    name: '穩定',
    requiredWorkouts: 7,
    description: 'Partner 獲得徽章或背景。',
  },
  {
    id: 'stage_4',
    name: '默契',
    requiredWorkouts: 14,
    description: 'Partner 獲得高級配件或稀有背景。',
  },
];

export function getFormForWorkouts(totalWorkouts: number): PartnerForm {
  let result = PARTNER_FORMS[0];
  for (const form of PARTNER_FORMS) {
    if (totalWorkouts >= form.requiredWorkouts) {
      result = form;
    }
  }
  return result;
}

export function getNextForm(currentFormId: string): PartnerForm | null {
  const idx = PARTNER_FORMS.findIndex((f) => f.id === currentFormId);
  if (idx < 0 || idx >= PARTNER_FORMS.length - 1) return null;
  return PARTNER_FORMS[idx + 1];
}
