import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MuscleGroup, UserProfile } from '@/types';
import type { AvoidEntry, TrainingGoal } from '@/domain/coach/types';
import { sanitizeAvoid } from '@/domain/coach/buildCoachContext';
import { clearFactKeys } from '@/domain/storage/logRepository';
import { createBrowserLogRepository } from '@/services/browserLogRepository';

export type TrainingGoalValue = TrainingGoal;

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
  /** T5：本週已顯示過週報的 ISO 週序號（防重複彈窗）；null=從未顯示 */
  weeklyReportSeenWeek: string | null;
  /** T7-3：我的健身房器材 ID 列表（equipmentLibrary 中的 eq-* id） */
  gymEquipmentIds: string[];
  /** P-RETENTION：每週訓練目標（1–5 次，預設 3） */
  weeklyGoal: number;
  /** 典型一次練幾分鐘。沒答過就是 45。 */
  sessionMinutes: number;
  /** 自己勾的少練部位或動作。空陣列有效。不是病歷。 */
  avoidList: AvoidEntry[];
  /** P-RETENTION：上次顯示「歡迎回來」卡的時間（ISO）；null = 從未 */
  comebackWelcomedAt: string | null;
  /** P-RETENTION P1-2：完成一組後自動跳到下一組 */
  autoNextSet: boolean;
  /** P2A-2：已領取獎勵的每週挑戰 id 清單（避免重複發獎） */
  claimedWeeklyChallengeIds: string[];
  updateProfile: (patch: Partial<UserProfile>) => void;
  completeOnboarding: (goal: TrainingGoalValue) => void;
  resetOnboarding: () => void;
  resetAllData: () => void;
  /** T5：標記某週的週報已顯示 */
  markWeeklyReportSeen: (weekKey: string) => void;
  /** T7-3：切換某器材的選取狀態 */
  toggleGymEquipment: (equipmentId: string) => void;
  /** T7-3：批量設定我的器材 */
  setGymEquipmentIds: (ids: string[]) => void;
  /** 設定每週訓練目標（夾在 1–5，與設定頁同一組數字） */
  setWeeklyGoal: (n: number) => void;
  setSessionMinutes: (n: number) => void;
  setAvoidList: (list: AvoidEntry[]) => void;
  toggleAvoidRegion: (region: MuscleGroup) => void;
  toggleAvoidExercise: (exerciseId: string) => void;
  /** P-RETENTION：標記回歸卡已顯示，避免短期內重複彈出 */
  markComebackWelcomed: () => void;
  /** P-RETENTION P1-2：切換自動跳到下一組 */
  setAutoNextSet: (on: boolean) => void;
  /** P2A-2：標記每週挑戰已領獎 */
  markWeeklyChallengeClaimed: (id: string) => void;
}

const defaultProfile: UserProfile = {
  id: 'user-default',
  name: '鐵人',
  bodyWeight: null,
  createdAt: new Date().toISOString(),
  // I-1：新用戶預設 beginner；Lane B 用戶會於 Onboarding StepExperience 覆寫
  experienceLevel: 'beginner',
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: defaultProfile,
      onboardingCompleted: false,
      goal: null,
      weeklyReportSeenWeek: null,
      gymEquipmentIds: [],
      weeklyGoal: 3,
      sessionMinutes: 45,
      avoidList: [],
      comebackWelcomedAt: null,
      autoNextSet: true,
      claimedWeeklyChallengeIds: [],
      updateProfile: (patch) =>
        set((state) => ({ profile: { ...state.profile, ...patch } })),
      markWeeklyReportSeen: (weekKey) => set({ weeklyReportSeenWeek: weekKey }),
      toggleGymEquipment: (equipmentId) =>
        set((state) => {
          const has = state.gymEquipmentIds.includes(equipmentId);
          return {
            gymEquipmentIds: has
              ? state.gymEquipmentIds.filter((id) => id !== equipmentId)
              : [...state.gymEquipmentIds, equipmentId],
          };
        }),
      setGymEquipmentIds: (ids) => set({ gymEquipmentIds: ids }),
      setWeeklyGoal: (n) =>
        set({ weeklyGoal: Math.min(5, Math.max(1, Math.round(n))) }),
      setSessionMinutes: (n) =>
        set({ sessionMinutes: Math.min(120, Math.max(20, Math.round(n))) }),
      setAvoidList: (list) => set({ avoidList: sanitizeAvoid(list) }),
      toggleAvoidRegion: (region) =>
        set((state) => {
          const has = state.avoidList.some((item) => item.kind === 'region' && item.region === region);
          return {
            avoidList: has
              ? state.avoidList.filter((item) => !(item.kind === 'region' && item.region === region))
              : [...state.avoidList, { kind: 'region', region }],
          };
        }),
      toggleAvoidExercise: (exerciseId) =>
        set((state) => {
          const has = state.avoidList.some(
            (item) => item.kind === 'exercise' && item.exerciseId === exerciseId,
          );
          return {
            avoidList: has
              ? state.avoidList.filter(
                  (item) => !(item.kind === 'exercise' && item.exerciseId === exerciseId),
                )
              : [...state.avoidList, { kind: 'exercise', exerciseId }],
          };
        }),
      markComebackWelcomed: () => set({ comebackWelcomedAt: new Date().toISOString() }),
      setAutoNextSet: (on) => set({ autoNextSet: on }),
      markWeeklyChallengeClaimed: (id) =>
        set((state) => ({
          claimedWeeklyChallengeIds: state.claimedWeeklyChallengeIds.includes(id)
            ? state.claimedWeeklyChallengeIds
            : [...state.claimedWeeklyChallengeIds, id],
        })),
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
        // 先清儲存再重新載入。不要在清除後 set()，否則 persist 會把 profile 寫回去。
        clearFactKeys(createBrowserLogRepository());
        window.location.reload();
      },
    }),
    {
      name: 'ironpulse-profile',
      version: 9,
      partialize: (state) => ({
        profile: state.profile,
        onboardingCompleted: state.onboardingCompleted,
        goal: state.goal,
        weeklyReportSeenWeek: state.weeklyReportSeenWeek,
        gymEquipmentIds: state.gymEquipmentIds,
        weeklyGoal: state.weeklyGoal,
        sessionMinutes: state.sessionMinutes,
        avoidList: state.avoidList,
        comebackWelcomedAt: state.comebackWelcomedAt,
        autoNextSet: state.autoNextSet,
        claimedWeeklyChallengeIds: state.claimedWeeklyChallengeIds,
      }),
      // ⚠️ 容錯兜底：LocalStorage 損壞時優雅重置為預設值，唔會白屏崩潰
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('[profileStore] Zustand hydration failed, falling back to defaults', error);
            try {
              localStorage.removeItem('ironpulse-profile');
            } catch {}
          }
        };
      },
      migrate: (persistedState: unknown) => {
        const raw = (persistedState ?? {}) as Partial<ProfileState>;
        const oldProfile = raw.profile;
        // D3：舊 default 75 視為未填 → null（真 75kg 用戶需重填，UI 會提示）
        let migratedProfile: UserProfile;
        if (oldProfile && typeof oldProfile === 'object') {
          const op = oldProfile as Partial<UserProfile>;
          const bodyWeight: number | null =
            typeof op.bodyWeight === 'number'
              ? op.bodyWeight === 75
                ? null
                : op.bodyWeight
              : null;
          // I-1 (L4 unknown guard)：舊 v1/v2 profile 一律補 experienceLevel='beginner'
          const experienceLevel: 'beginner' | 'experienced' =
            op.experienceLevel === 'experienced' ? 'experienced' : 'beginner';
          migratedProfile = {
            id: typeof op.id === 'string' ? op.id : 'user-default',
            name: typeof op.name === 'string' ? op.name : '鐵人',
            bodyWeight,
            createdAt:
              typeof op.createdAt === 'string' ? op.createdAt : new Date().toISOString(),
            experienceLevel,
          };
        } else {
          migratedProfile = { ...defaultProfile, createdAt: new Date().toISOString() };
        }
        const onboardingCompleted = typeof raw.onboardingCompleted === 'boolean'
          ? raw.onboardingCompleted
          : false;
        const goal: TrainingGoalValue | null =
          raw.goal === 'muscle' || raw.goal === 'fatloss' || raw.goal === 'health'
            ? raw.goal
            : null;
        // T5 v3→v4：補 weeklyReportSeenWeek（null = 從未顯示）
        const weeklyReportSeenWeek: string | null =
          typeof raw.weeklyReportSeenWeek === 'string'
            ? raw.weeklyReportSeenWeek
            : null;
        // T7-3 v4→v5：補 gymEquipmentIds（空陣列 = 未設定）
        const gymEquipmentIds: string[] = Array.isArray(raw.gymEquipmentIds)
          ? raw.gymEquipmentIds.filter((id): id is string => typeof id === 'string')
          : [];
        // P-RETENTION v5→v6：週目標預設 3；回歸卡從未顯示
        const weeklyGoal =
          typeof raw.weeklyGoal === 'number'
            ? Math.min(5, Math.max(1, Math.round(raw.weeklyGoal)))
            : 3;
        const sessionMinutes =
          typeof raw.sessionMinutes === 'number'
            ? Math.min(120, Math.max(20, Math.round(raw.sessionMinutes)))
            : 45;
        const avoidList = sanitizeAvoid(raw.avoidList as AvoidEntry[] | undefined);
        const comebackWelcomedAt =
          typeof raw.comebackWelcomedAt === 'string' ? raw.comebackWelcomedAt : null;
        // P1-2 v6→v7：自動跳到下一組，預設開啟
        const autoNextSet = typeof raw.autoNextSet === 'boolean' ? raw.autoNextSet : true;
        // P2A v7→v8：每週挑戰已領獎清單
        const claimedWeeklyChallengeIds = Array.isArray(raw.claimedWeeklyChallengeIds)
          ? raw.claimedWeeklyChallengeIds
          : [];
        return {
          profile: migratedProfile,
          onboardingCompleted,
          goal,
          weeklyReportSeenWeek,
          gymEquipmentIds,
          weeklyGoal,
          sessionMinutes,
          avoidList,
          comebackWelcomedAt,
          autoNextSet,
          claimedWeeklyChallengeIds,
        };
      },
    }
  )
);
