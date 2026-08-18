import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PartnerState, PartnerSpecies } from '../types';
import { getFormForWorkouts, getNextForm } from '../data/forms';
import { getLevelForXp, getXpProgress } from '../engine/level';
import { useWorkoutStore } from '@/store/workoutStore';

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
  // C4：衍生讀取（不 persist）
  getLevel: () => number;
  getTotalWorkouts: () => number;
  getTotalTrainingDays: () => number;
}

const DEFAULT_PARTNER: PartnerState = {
  species: 'cat',
  name: '',
  level: 1, // C4：保留於型別，實際由 getLevel() 派生；state 中不再寫入
  xp: 0,
  totalWorkouts: 0, // C4：保留於型別，實際由 getTotalWorkouts() 派生
  totalTrainingDays: 0, // C4：同上
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
        const oldLevel = getLevelForXp(state.xp);
        const newXp = state.xp + amount;
        const newLevel = getLevelForXp(newXp);
        // C4：只 set xp；level 由 getLevel() 派生（getLevelForXp(xp)）
        set({ xp: newXp });
        return {
          xpGained: amount,
          newLevel,
          leveledUp: newLevel > oldLevel,
        };
      },

      // C4：noop — totalWorkouts 由 getTotalWorkouts() 從 sessions 派生
      recordWorkout: () => {
        /* no-op */
      },

      // C4：noop — totalTrainingDays 由 getTotalTrainingDays() 從 sessions 派生
      recordTrainingDay: () => {
        /* no-op */
      },

      checkFormUnlock: () => {
        const state = get();
        const totalWorkouts = get().getTotalWorkouts();
        const correctForm = getFormForWorkouts(totalWorkouts);
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
        const totalWorkouts = get().getTotalWorkouts();
        const remaining = nextForm.requiredWorkouts - totalWorkouts;
        if (remaining <= 0) return null;
        return `再完成 ${remaining} 次訓練，Partner 將進入「${nextForm.name}」形態`;
      },

      // ── C4：衍生讀取（從 workoutStore.sessions 派生） ──
      // I-4 / Errata E15：Partner XP／形態解鎖的 totalWorkouts 僅計非 imported session
      getLevel: () => getLevelForXp(get().xp),
      getTotalWorkouts: () => useWorkoutStore.getState().sessions.filter((s) => s.imported !== true).length,
      getTotalTrainingDays: () => {
        const sessions = useWorkoutStore.getState().sessions.filter((s) => s.imported !== true);
        return new Set(sessions.map((s) => new Date(s.date).toDateString())).size;
      },
    }),
    {
      name: 'vivix-partner-store-v1',
      version: 2,
      // ⚠️ 容錯兜底：LocalStorage 損壞時優雅重置為預設值，唔會白屏崩潰
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('[partnerStore] Zustand hydration failed, falling back to defaults', error);
            try {
              localStorage.removeItem('vivix-partner-store-v1');
            } catch {}
          }
        };
      },
      // C4 / L1：排除衍生欄位（level/totalWorkouts/totalTrainingDays）；只 persist 永久決定
      partialize: (state) => ({
        species: state.species,
        name: state.name,
        xp: state.xp,
        currentFormId: state.currentFormId,
        unlockedFormIds: state.unlockedFormIds,
        unlockedCosmeticIds: state.unlockedCosmeticIds,
        equippedCosmeticIds: state.equippedCosmeticIds,
        unlockedTitleIds: state.unlockedTitleIds,
        equippedTitleId: state.equippedTitleId,
        createdAt: state.createdAt,
      }),
      migrate: (persistedState, version) => {
        const s = (persistedState ?? {}) as Record<string, unknown>;
        // C4：移除舊持久化的 level/totalWorkouts/totalTrainingDays（改為派生）
        const { level, totalWorkouts, totalTrainingDays, ...rest } = s;
        // 只回傳 partialize 會持久化的欄位
        return {
          species: (rest.species as PartnerSpecies) ?? DEFAULT_PARTNER.species,
          name: (rest.name as string) ?? DEFAULT_PARTNER.name,
          xp: (rest.xp as number) ?? DEFAULT_PARTNER.xp,
          currentFormId: (rest.currentFormId as string) ?? DEFAULT_PARTNER.currentFormId,
          unlockedFormIds: (rest.unlockedFormIds as string[]) ?? DEFAULT_PARTNER.unlockedFormIds,
          unlockedCosmeticIds: (rest.unlockedCosmeticIds as string[]) ?? DEFAULT_PARTNER.unlockedCosmeticIds,
          equippedCosmeticIds: (rest.equippedCosmeticIds as string[]) ?? DEFAULT_PARTNER.equippedCosmeticIds,
          unlockedTitleIds: (rest.unlockedTitleIds as string[]) ?? DEFAULT_PARTNER.unlockedTitleIds,
          equippedTitleId: (rest.equippedTitleId as string) ?? DEFAULT_PARTNER.equippedTitleId,
          createdAt: (rest.createdAt as string) ?? DEFAULT_PARTNER.createdAt,
        };
      },
    }
  )
);
