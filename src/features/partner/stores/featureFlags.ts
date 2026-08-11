import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FeatureFlags } from '../types';

interface FeatureFlagsState extends FeatureFlags {
  setFlag: <K extends keyof FeatureFlags>(key: K, value: FeatureFlags[K]) => void;
  reset: () => void;
}

const DEFAULT_FLAGS: FeatureFlags = {
  partnerEnabled: true,
  partnerQuestsEnabled: true,
  warmupEnabled: true,
  telemetryEnabled: true,
  debugPanelEnabled: true,
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
      version: 1,
    }
  )
);
