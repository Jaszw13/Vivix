import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PartnerState, PartnerSpecies } from '../types';
import { getFormForWorkouts, getNextForm } from '../data/forms';
import { getLevelForXp, getXpProgress } from '../engine/level';

interface PartnerStoreState extends PartnerState {
  // 初始化
  createPartner: (species: PartnerSpecies, name: string) => void;
  renamePartner: (name: string) => void;
  // XP / 等級
  addXp: (amount: number) => { xpGained: number; newLevel: number; leveledUp: boolean };
  // 訓練行為
  recordWorkout: () => void;
  recordTrainingDay: () => void;
  // 形態
  checkFormUnlock: () => { unlocked: boolean; newFormId?: string; newFormName?: string };
  // 化妝品 / 稱號
  unlockCosmetic: (cosmeticId: string) => void;
  equipCosmetic: (cosmeticId: string) => void;
  unequipCosmetic: (cosmeticId: string) => void;
  unlockTitle: (titleId: string) => void;
  equipTitle: (titleId: string) => void;
  // 工具
  resetPartner: () => void;
  getLevelProgress: () => ReturnType<typeof getXpProgress>;
  getNextMilestone: () => string | null;
}

const DEFAULT_PARTNER: PartnerState = {
  species: 'cat',
  name: '',
  level: 1,
  xp: 0,
  totalWorkouts: 0,
  totalTrainingDays: 0,
  currentFormId: 'stage_0',
  unlockedFormIds: ['stage_0'],
  unlockedCosmeticIds: [],
  equippedCosmeticIds: [],
  unlockedTitleIds: [],
  equippedTitleId: undefined,
  createdAt: '',
};

export const usePartnerStore = create<PartnerStoreState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_PARTNER,

      createPartner: (species, name) => {
        set({
          ...DEFAULT_PARTNER,
          species,
          name,
          createdAt: new Date().toISOString(),
        });
      },

      renamePartner: (name) => set({ name }),

      addXp: (amount) => {
        const state = get();
        const oldLevel = state.level;
        const newXp = state.xp + amount;
        const newLevel = getLevelForXp(newXp);
        set({ xp: newXp, level: newLevel });
        return {
          xpGained: amount,
          newLevel,
          leveledUp: newLevel > oldLevel,
        };
      },

      recordWorkout: () => {
        const state = get();
        set({ totalWorkouts: state.totalWorkouts + 1 });
      },

      recordTrainingDay: () => {
        const state = get();
        set({ totalTrainingDays: state.totalTrainingDays + 1 });
      },

      checkFormUnlock: () => {
        const state = get();
        const correctForm = getFormForWorkouts(state.totalWorkouts);
        if (state.currentFormId === correctForm.id) {
          return { unlocked: false };
        }
        if (state.unlockedFormIds.includes(correctForm.id)) {
          set({ currentFormId: correctForm.id });
          return { unlocked: false };
        }
        // 新形態解鎖
        set({
          currentFormId: correctForm.id,
          unlockedFormIds: [...state.unlockedFormIds, correctForm.id],
        });
        return {
          unlocked: true,
          newFormId: correctForm.id,
          newFormName: correctForm.name,
        };
      },

      unlockCosmetic: (cosmeticId) => {
        const state = get();
        if (state.unlockedCosmeticIds.includes(cosmeticId)) return;
        set({
          unlockedCosmeticIds: [...state.unlockedCosmeticIds, cosmeticId],
        });
      },

      equipCosmetic: (cosmeticId) => {
        const state = get();
        if (!state.unlockedCosmeticIds.includes(cosmeticId)) return;
        const equipped = state.equippedCosmeticIds.filter((id) => id !== cosmeticId);
        set({ equippedCosmeticIds: [...equipped, cosmeticId] });
      },

      unequipCosmetic: (cosmeticId) => {
        const state = get();
        set({
          equippedCosmeticIds: state.equippedCosmeticIds.filter((id) => id !== cosmeticId),
        });
      },

      unlockTitle: (titleId) => {
        const state = get();
        if (state.unlockedTitleIds.includes(titleId)) return;
        set({ unlockedTitleIds: [...state.unlockedTitleIds, titleId] });
      },

      equipTitle: (titleId) => set({ equippedTitleId: titleId }),

      resetPartner: () => set({ ...DEFAULT_PARTNER }),

      getLevelProgress: () => getXpProgress(get().xp),

      getNextMilestone: () => {
        const state = get();
        const nextForm = getNextForm(state.currentFormId);
        if (!nextForm) return null;
        const remaining = nextForm.requiredWorkouts - state.totalWorkouts;
        if (remaining <= 0) return null;
        return `再完成 ${remaining} 次訓練，Partner 將進入「${nextForm.name}」形態`;
      },
    }),
    {
      name: 'vivix-partner-store-v1',
      version: 1,
      // 安全 migrate：未來版本變更時保留現有數據
      migrate: (persistedState, version) => {
        const s = (persistedState ?? {}) as Partial<PartnerStoreState>;
        return {
          ...DEFAULT_PARTNER,
          ...s,
        } as Partial<PartnerStoreState>;
      },
    }
  )
);
