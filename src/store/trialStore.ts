import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============ 階梯定義 ============
// 每個階段對應一個試用天數與續用碼
// Stage 0 為首次試用，不需碼；之後每階段需輸入對應碼解鎖
export const TRIAL_STAGES = [
  { days: 5, code: '', label: '首次試用' },
  { days: 7, code: 'IRON-7', label: '第二階段' },
  { days: 14, code: 'IRON-14', label: '第三階段' },
  { days: 30, code: 'IRON-30', label: '第四階段' },
  { days: -1, code: 'IRON-FOREVER', label: '永久會員' }, // -1 = 永久
] as const;

// 反饋間隔（天）
const FEEDBACK_INTERVAL_DAYS = 7;

interface TrialState {
  // 安裝時間
  installedAt: string;
  // 當前階梯索引
  currentStage: number;
  // 當前階梯到期時間（ISO 字串，永久時為 null）
  expiresAt: string | null;
  // 已使用的續用碼（防止重複）
  usedCodes: string[];
  // 上次反饋時間
  lastFeedbackAt: string | null;
  // 反饋次數
  feedbackCount: number;
  // 是否已關閉反饋彈窗（當前週期）
  feedbackDismissedAt: string | null;

  // 方法
  initTrial: () => void;
  redeemCode: (code: string) => { success: boolean; message: string };
  isExpired: () => boolean;
  isPermanent: () => boolean;
  getRemainingDays: () => number;
  getStageInfo: () => { label: string; days: number; remaining: number };
  shouldShowFeedback: () => boolean;
  submitFeedback: () => void;
  dismissFeedback: () => void;
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export const useTrialStore = create<TrialState>()(
  persist(
    (set, get) => ({
      installedAt: '',
      currentStage: 0,
      expiresAt: null,
      usedCodes: [],
      lastFeedbackAt: null,
      feedbackCount: 0,
      feedbackDismissedAt: null,

      initTrial: () => {
        const state = get();
        if (!state.installedAt) {
          set({
            installedAt: new Date().toISOString(),
            currentStage: 0,
            expiresAt: addDaysIso(TRIAL_STAGES[0].days),
          });
        }
      },

      redeemCode: (code) => {
        const state = get();
        const trimmed = code.trim().toUpperCase();

        // 已是永久會員
        if (state.currentStage >= TRIAL_STAGES.length - 1) {
          return { success: false, message: '已是永久會員，無需續用' };
        }

        // 檢查碼是否重複使用
        if (state.usedCodes.includes(trimmed)) {
          return { success: false, message: '此續用碼已使用過' };
        }

        // 找下一個階梯的碼
        const nextStageIndex = state.currentStage + 1;
        const nextStage = TRIAL_STAGES[nextStageIndex];

        if (trimmed !== nextStage.code) {
          return { success: false, message: '續用碼無效' };
        }

        // 解鎖
        const newExpiresAt = nextStage.days === -1 ? null : addDaysIso(nextStage.days);
        set({
          currentStage: nextStageIndex,
          expiresAt: newExpiresAt,
          usedCodes: [...state.usedCodes, trimmed],
          // 重置反饋週期
          lastFeedbackAt: null,
          feedbackDismissedAt: null,
        });

        return {
          success: true,
          message: nextStage.days === -1 ? '已解鎖永久會員' : `已延長 ${nextStage.days} 天`,
        };
      },

      isExpired: () => {
        const { expiresAt } = get();
        if (!expiresAt) return false; // 永久
        return new Date(expiresAt).getTime() < Date.now();
      },

      isPermanent: () => {
        return get().currentStage >= TRIAL_STAGES.length - 1;
      },

      getRemainingDays: () => {
        const { expiresAt } = get();
        if (!expiresAt) return Infinity;
        const ms = new Date(expiresAt).getTime() - Date.now();
        return Math.ceil(ms / 86400000);
      },

      getStageInfo: () => {
        const { currentStage, expiresAt } = get();
        const stage = TRIAL_STAGES[currentStage];
        const remaining =
          !expiresAt ? Infinity : Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
        return { label: stage.label, days: stage.days, remaining };
      },

      shouldShowFeedback: () => {
        const { lastFeedbackAt, feedbackDismissedAt, currentStage } = get();
        // 永久會員不再強制反饋
        if (currentStage >= TRIAL_STAGES.length - 1) return false;
        const now = new Date().toISOString();
        // 從未反饋過
        if (!lastFeedbackAt) {
          // 安裝超過 3 天才開始問
          const installed = get().installedAt;
          if (installed && daysBetween(installed, now) >= 3) return true;
          return false;
        }
        // 上次反饋超過 7 天
        if (daysBetween(lastFeedbackAt, now) >= FEEDBACK_INTERVAL_DAYS) {
          // 若被關閉過，且關閉時間在 3 天內，則不顯示
          if (feedbackDismissedAt && daysBetween(feedbackDismissedAt, now) < 3) {
            return false;
          }
          return true;
        }
        return false;
      },

      submitFeedback: () => {
        const state = get();
        set({
          lastFeedbackAt: new Date().toISOString(),
          feedbackCount: state.feedbackCount + 1,
          feedbackDismissedAt: null,
        });
      },

      dismissFeedback: () => {
        set({ feedbackDismissedAt: new Date().toISOString() });
      },
    }),
    {
      name: 'ironpulse-trial',
    }
  )
);
