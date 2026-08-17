import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FeatureFlags } from '../types';

interface FeatureFlagsState extends FeatureFlags {
  setFlag: <K extends keyof FeatureFlags>(key: K, value: FeatureFlags[K]) => void;
  reset: () => void;
}

const DEFAULT_FLAGS: FeatureFlags = {
  partnerEnabled: true,
};

export const useFeatureFlags = create<FeatureFlagsState>()(
  persist(
    (set) => ({
      ...DEFAULT_FLAGS,
      setFlag: (key, value) => set({ [key]: value } as Partial<FeatureFlagsState>),
      reset: () => set({ ...DEFAULT_FLAGS }),
    }),
    {
      name: 'vivix-feature-flags-v1',
      version: 2,
      // ⚠️ 容錯兜底：LocalStorage 損壞時優雅重置為預設值，唔會白屏崩潰
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('[featureFlags] Zustand hydration failed, falling back to defaults', error);
            try {
              localStorage.removeItem('vivix-feature-flags-v1');
            } catch {}
          }
        };
      },
      // C6：補 migrate — 合併預設 + 欄位校驗，避免舊 payload 缺欄位 crash
      migrate: (persistedState) => {
        const s = (persistedState ?? {}) as Partial<FeatureFlags>;
        return {
          partnerEnabled: typeof s.partnerEnabled === 'boolean' ? s.partnerEnabled : DEFAULT_FLAGS.partnerEnabled,
        };
      },
    }
  )
);
