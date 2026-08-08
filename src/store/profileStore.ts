import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '@/types';

export type TrainingGoalValue = 'muscle' | 'fatloss' | 'health';

export const TRAINING_GOAL_LABELS: Record<TrainingGoalValue, { title: string; desc: string }> = {
  muscle: {
    title: '增肌變壯',
    desc: '想練大隻、提升力量',
  },
  fatloss: {
    title: '減脂塑形',
    desc: '想減脂、維持肌肉線條',
  },
  health: {
    title: '健康運動',
    desc: '規律訓練、保持體能',
  },
};

interface ProfileState {
  profile: UserProfile;
  /** 是否已完成首次 onboarding 引導（N3） */
  onboardingCompleted: boolean;
  /** onboarding 中選擇的目標 */
  goal: TrainingGoalValue | null;
  updateProfile: (patch: Partial<UserProfile>) => void;
  completeOnboarding: (goal: TrainingGoalValue) => void;
  resetOnboarding: () => void;
  resetAllData: () => void;
}

const defaultProfile: UserProfile = {
  id: 'user-default',
  name: '鐵人',
  bodyWeight: 75,
  createdAt: new Date().toISOString(),
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: defaultProfile,
      onboardingCompleted: false,
      goal: null,
      updateProfile: (patch) =>
        set((state) => ({ profile: { ...state.profile, ...patch } })),
      completeOnboarding: (goal) => {
        // onboarding 完成後，順便把名字更新得更個人化
        const stored = localStorage.getItem('ironpulse-profile');
        let patchName = {};
        if (!stored) {
          patchName = { name: '新手教練學員' };
        }
        set((state) => ({
          goal,
          onboardingCompleted: true,
          profile: { ...state.profile, ...patchName },
        }));
      },
      resetOnboarding: () => set({ onboardingCompleted: false, goal: null }),
      resetAllData: () => {
        localStorage.removeItem('ironpulse-workouts');
        localStorage.removeItem('ironpulse-profile');
        localStorage.removeItem('ironpulse-theme');
        localStorage.removeItem('ironpulse-achievements');
        set({
          profile: { ...defaultProfile, createdAt: new Date().toISOString() },
          onboardingCompleted: false,
          goal: null,
        });
        // 重新載入以重置所有 store
        window.location.reload();
      },
    }),
    {
      name: 'ironpulse-profile',
      version: 1,
      partialize: (state) => ({
        profile: state.profile,
        onboardingCompleted: state.onboardingCompleted,
        goal: state.goal,
      }),
      migrate: (persistedState) => {
        const s = (persistedState ?? {}) as Partial<ProfileState>;
        return {
          profile: s.profile ?? { ...defaultProfile, createdAt: new Date().toISOString() },
          onboardingCompleted: s.onboardingCompleted ?? false,
          goal: s.goal ?? null,
        };
      },
    }
  )
);
