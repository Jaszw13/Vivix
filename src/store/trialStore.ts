import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { verifyCode } from '@/utils/crypto';

// ============ 階梯定義 ============
export interface TrialStage {
  durationMs: number;
  label: string;
}

// 標準模式：天數
export const STANDARD_STAGES: TrialStage[] = [
  { durationMs: 5 * 86400000, label: '首次試用' },
  { durationMs: 7 * 86400000, label: '第二階段' },
  { durationMs: 14 * 86400000, label: '第三階段' },
  { durationMs: 30 * 86400000, label: '第四階段' },
  { durationMs: -1, label: '永久會員' }, // -1 = 永久
];

// 開發測試模式：短時段
export const DEV_STAGES: TrialStage[] = [
  { durationMs: 10 * 1000, label: '[DEV] 首次試用' },
  { durationMs: 30 * 1000, label: '[DEV] 第二階段' },
  { durationMs: 2 * 60 * 1000, label: '[DEV] 第三階段' },
  { durationMs: 3 * 60 * 1000, label: '[DEV] 第四階段' },
  { durationMs: -1, label: '[DEV] 永久會員' },
];

// 反饋間隔（標準模式：7 天；DEV 模式：20 秒）
const FEEDBACK_INTERVAL_MS_STD = 7 * 86400000;
const FEEDBACK_INTERVAL_MS_DEV = 20 * 1000;
const INSTALL_FOR_FEEDBACK_MS_STD = 3 * 86400000;
const INSTALL_FOR_FEEDBACK_MS_DEV = 5 * 1000;

function generateDeviceId(): string {
  const arr = new Uint8Array(10);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

interface TrialState {
  // 裝置唯一 ID（用於綁定續用碼）
  deviceId: string;
  // 安裝時間
  installedAt: string;
  // 當前階梯索引
  currentStage: number;
  // 當前階梯到期時間（ISO 字串，永久時為 null）
  expiresAt: string | null;
  // 已使用的續用碼簽章（防止重複）
  usedSignatures: string[];
  // 上次反饋時間
  lastFeedbackAt: string | null;
  // 反饋次數
  feedbackCount: number;
  // 是否已關閉反饋彈窗（當前週期）
  feedbackDismissedAt: string | null;

  // 開發模式
  devMode: boolean;

  // 方法
  initTrial: () => void;
  redeemCode: (code: string) => Promise<{ success: boolean; message: string }>;
  isExpired: () => boolean;
  isPermanent: () => boolean;
  getRemainingMs: () => number;
  getRemainingHuman: () => string;
  getStageInfo: () => { label: string; durationMs: number; remainingMs: number };
  shouldShowFeedback: () => boolean;
  submitFeedback: () => void;
  dismissFeedback: () => void;

  // 開發者工具
  enableDevMode: () => void;
  disableDevMode: () => void;
  devForceExpireNow: () => void;
  devForceFeedbackNow: () => void;
  devResetTrial: () => void;
  devAdvanceStage: () => void;
}

function addIso(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

function getStages(state: TrialState): TrialStage[] {
  return state.devMode ? DEV_STAGES : STANDARD_STAGES;
}

export const useTrialStore = create<TrialState>()(
  persist(
    (set, get) => ({
      deviceId: '',
      installedAt: '',
      currentStage: 0,
      expiresAt: null,
      usedSignatures: [],
      lastFeedbackAt: null,
      feedbackCount: 0,
      feedbackDismissedAt: null,
      devMode: false,

      initTrial: () => {
        const state = get();
        if (state.installedAt && state.deviceId) return;
        const deviceId = state.deviceId || generateDeviceId();
        const stages = state.devMode ? DEV_STAGES : STANDARD_STAGES;
        const firstDur = stages[0].durationMs;
        set({
          deviceId,
          installedAt: new Date().toISOString(),
          currentStage: 0,
          expiresAt: firstDur === -1 ? null : addIso(firstDur),
        });
      },

      redeemCode: async (code) => {
        const state = get();
        const { deviceId, currentStage, usedSignatures, isPermanent } = state;
        if (isPermanent()) {
          return { success: false, message: '已是永久會員，無需續用' };
        }

        // 驗證 HMAC 簽章
        const result = await verifyCode(code, deviceId);
        if (!result.success) {
          return { success: false, message: result.message };
        }

        // 檢查是否下一階段或更高
        const targetStage = result.stage;
        if (targetStage <= currentStage) {
          return { success: false, message: '此階段已啟用，請使用更高階段續用碼' };
        }

        const stages = getStages(state);
        if (targetStage >= stages.length) {
          return { success: false, message: '無效的階段碼' };
        }

        // 檢查是否重複使用（以碼的原始字串判斷）
        const codeNorm = code.trim().toUpperCase();
        if (usedSignatures.includes(codeNorm)) {
          return { success: false, message: '此續用碼已使用過' };
        }

        const stage = stages[targetStage];
        const newExpiresAt = stage.durationMs === -1 ? null : addIso(stage.durationMs);

        set({
          currentStage: targetStage,
          expiresAt: newExpiresAt,
          usedSignatures: [...usedSignatures, codeNorm],
          lastFeedbackAt: null,
          feedbackDismissedAt: null,
        });

        return {
          success: true,
          message:
            stage.durationMs === -1
              ? '已解鎖永久會員'
              : `已解鎖 Stage ${targetStage} · ${state.devMode ? (stage.durationMs / 1000).toFixed(0) + ' 秒' : (stage.durationMs / 86400000).toFixed(0) + ' 天'}`,
        };
      },

      isExpired: () => {
        const { expiresAt } = get();
        if (!expiresAt) return false;
        return new Date(expiresAt).getTime() < Date.now();
      },

      isPermanent: () => {
        return get().currentStage >= getStages(get()).length - 1;
      },

      getRemainingMs: () => {
        const { expiresAt } = get();
        if (!expiresAt) return Infinity;
        return Math.max(0, new Date(expiresAt).getTime() - Date.now());
      },

      getRemainingHuman: () => {
        const { expiresAt, devMode } = get();
        if (!expiresAt) return '∞';
        const ms = new Date(expiresAt).getTime() - Date.now();
        if (ms <= 0) return '已到期';
        if (devMode) {
          const s = Math.ceil(ms / 1000);
          const m = Math.floor(s / 60);
          const sec = s % 60;
          return m > 0 ? `${m}分 ${sec}秒` : `${sec}秒`;
        }
        const days = Math.ceil(ms / 86400000);
        return `${days}天`;
      },

      getStageInfo: () => {
        const state = get();
        const stages = getStages(state);
        const stage = stages[state.currentStage] ?? stages[0];
        return {
          label: stage.label,
          durationMs: stage.durationMs,
          remainingMs: state.expiresAt ? Math.max(0, new Date(state.expiresAt).getTime() - Date.now()) : Infinity,
        };
      },

      shouldShowFeedback: () => {
        const { lastFeedbackAt, feedbackDismissedAt, currentStage, installedAt, devMode, isPermanent } = get();
        if (isPermanent()) return false;
        const now = Date.now();
        const fbInterval = devMode ? FEEDBACK_INTERVAL_MS_DEV : FEEDBACK_INTERVAL_MS_STD;
        const installFor = devMode ? INSTALL_FOR_FEEDBACK_MS_DEV : INSTALL_FOR_FEEDBACK_MS_STD;
        if (!installedAt) return false;
        if (!lastFeedbackAt) {
          // 從未反饋過：安裝超過閾值才問
          return now - new Date(installedAt).getTime() >= installFor;
        }
        // 上次反饋超過間隔
        if (now - new Date(lastFeedbackAt).getTime() >= fbInterval) {
          if (feedbackDismissedAt) {
            // DEV：10 秒後再問；STD：3 天後再問
            const dismissCool = devMode ? 10 * 1000 : 3 * 86400000;
            if (now - new Date(feedbackDismissedAt).getTime() < dismissCool) {
              return false;
            }
          }
          return true;
        }
        return false;
      },

      submitFeedback: () => {
        const s = get();
        set({
          lastFeedbackAt: new Date().toISOString(),
          feedbackCount: s.feedbackCount + 1,
          feedbackDismissedAt: null,
        });
      },

      dismissFeedback: () => {
        set({ feedbackDismissedAt: new Date().toISOString() });
      },

      // ========== 開發者工具 ==========
      enableDevMode: () => {
        set({ devMode: true });
        const state = get();
        const stages = DEV_STAGES;
        // 以當前階段重新計算到期時間
        const stage = stages[state.currentStage] ?? stages[0];
        set({
          expiresAt: stage.durationMs === -1 ? null : addIso(stage.durationMs),
          feedbackDismissedAt: null,
        });
      },

      disableDevMode: () => {
        set({ devMode: false });
        const state = get();
        const stages = STANDARD_STAGES;
        const stage = stages[state.currentStage] ?? stages[0];
        set({
          expiresAt: stage.durationMs === -1 ? null : addIso(stage.durationMs),
          feedbackDismissedAt: null,
        });
      },

      devForceExpireNow: () => {
        set({ expiresAt: new Date(Date.now() - 1000).toISOString() });
      },

      devForceFeedbackNow: () => {
        set({ lastFeedbackAt: new Date(Date.now() - 30 * 86400000).toISOString() });
      },

      devResetTrial: () => {
        const state = get();
        const stages = state.devMode ? DEV_STAGES : STANDARD_STAGES;
        const stage = stages[0];
        set({
          installedAt: new Date().toISOString(),
          currentStage: 0,
          expiresAt: stage.durationMs === -1 ? null : addIso(stage.durationMs),
          usedSignatures: [],
          lastFeedbackAt: null,
          feedbackCount: 0,
          feedbackDismissedAt: null,
        });
      },

      devAdvanceStage: () => {
        const state = get();
        const stages = getStages(state);
        const next = Math.min(state.currentStage + 1, stages.length - 1);
        const stage = stages[next];
        set({
          currentStage: next,
          expiresAt: stage.durationMs === -1 ? null : addIso(stage.durationMs),
        });
      },
    }),
    {
      name: 'ironpulse-trial',
      version: 2,
      migrate: (persistedState, version) => {
        const s = (persistedState ?? {}) as Partial<TrialState>;
        if (version < 2) {
          // 舊版沒有 deviceId / usedSignatures / devMode
          return {
            deviceId: generateDeviceId(),
            installedAt: s.installedAt || new Date().toISOString(),
            currentStage: typeof s.currentStage === 'number' ? Math.min(s.currentStage, 0) : 0,
            expiresAt: s.expiresAt || null,
            usedSignatures: [],
            lastFeedbackAt: s.lastFeedbackAt || null,
            feedbackCount: typeof s.feedbackCount === 'number' ? s.feedbackCount : 0,
            feedbackDismissedAt: s.feedbackDismissedAt || null,
            devMode: false,
          } as Partial<TrialState>;
        }
        // 確保 deviceId 存在
        if (!s.deviceId) {
          return { ...s, deviceId: generateDeviceId() } as Partial<TrialState>;
        }
        return s;
      },
    }
  )
);
