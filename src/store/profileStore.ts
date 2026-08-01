import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '@/types';

interface ProfileState {
  profile: UserProfile;
  updateProfile: (patch: Partial<UserProfile>) => void;
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
      updateProfile: (patch) =>
        set((state) => ({ profile: { ...state.profile, ...patch } })),
      resetAllData: () => {
        localStorage.removeItem('ironpulse-workouts');
        localStorage.removeItem('ironpulse-profile');
        localStorage.removeItem('ironpulse-theme');
        set({ profile: { ...defaultProfile, createdAt: new Date().toISOString() } });
        // 重新載入以重置所有 store
        window.location.reload();
      },
    }),
    {
      name: 'ironpulse-profile',
    }
  )
);
