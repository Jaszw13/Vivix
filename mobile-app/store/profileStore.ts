import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
        AsyncStorage.removeItem('ironpulse-workouts');
        AsyncStorage.removeItem('ironpulse-profile');
        set({ profile: { ...defaultProfile, createdAt: new Date().toISOString() } });
      },
    }),
    {
      name: 'ironpulse-profile',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
