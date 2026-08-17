import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DAY_MS } from '@/utils/time';

// ============ 階梯定義 ============
export interface TrialStage {
  durationMs: number;
  label: string;
  /** 對應的續用碼（Stage 0 不需碼） */
  code?: string;
}

// 標準模式：天數 （2026-08-11 調整：Stage 0-4 全數 +1，Stage 5 永久保持 -1）
export const STANDARD_STAGES: TrialStage[] = [
  { durationMs: 2 * DAY_MS, label: '首次試用' }, // Stage 0: 1→2 天
  { durationMs: 4 * DAY_MS, label: '第二階段', code: '547' }, // Stage 1: 3→4 天
  { durationMs: 8 * DAY_MS, label: '第三階段', code: '2678' }, // Stage 2: 7→8 天
  { durationMs: 15 * DAY_MS, label: '第四階段', code: '91431' }, // Stage 3: 14→15 天
  { durationMs: 31 * DAY_MS, label: '第五階段', code: '695497' }, // Stage 4: 30→31 天
  { durationMs: -1, label: '永久會員', code: 'IRON-ETERNAL' }, // Stage 5: 永久，不變
];

// 開發測試模式：每階段 1 分鐘
export const DEV_STAGES: TrialStage[] = [
  { durationMs: 60 * 1000, label: '[DEV] 首次試用' },
  { durationMs: 60 * 1000, label: '[DEV] 第二階段', code: '547' },
  { durationMs: 60 * 1000, label: '[DEV] 第三階段', code: '2678' },
  { durationMs: 60 * 1000, label: '[DEV] 第四階段', code: '91431' },
  { durationMs: 60 * 1000, label: '[DEV] 第五階段', code: '695497' },
  { durationMs: -1, label: '[DEV] 永久會員', code: 'IRON-ETERNAL' },
];

// 反饋間隔
const FEEDBACK_INTERVAL_MS_STD = 7 * DAY_MS;
const FEEDBACK_INTERVAL_MS_DEV = 20 * 1000;
const INSTALL_FOR_FEEDBACK_MS_STD = 3 * DAY_MS;
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
  // 裝置唯一 ID（保留顯示用，但不用於綁定續用碼）
  deviceId: string;
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

  // 開發模式
  devMode: boolean;

  // 方法
  initTrial: () => void;
  redeemCode: (code: string) => { success: boolean; message: string };
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
      usedCodes: [],
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

      redeemCode: (code) => {
        const state = get();
        const { currentStage, usedCodes } = state;
        if (state.currentStage >= getStages(state).length - 1) {
          return { success: false, message: '已是永久會員，無需續用' };
        }

        const trimmed = code.trim();
        const stages = getStages(state);
        const nextStage = stages[currentStage + 1];

        if (!nextStage || !nextStage.code) {
          return { success: false, message: '無下一階段可解鎖' };
        }

        if (trimmed !== nextStage.code) {
          return { success: false, message: '續用碼無效' };
        }

        if (usedCodes.includes(trimmed)) {
          return { success: false, message: '此續用碼已使用過' };
        }

        const newExpiresAt =
          nextStage.durationMs === -1 ? null : addIso(nextStage.durationMs);

        set({
          currentStage: currentStage + 1,
          expiresAt: newExpiresAt,
          usedCodes: [...usedCodes, trimmed],
          lastFeedbackAt: null,
          feedbackDismissedAt: null,
        });

        return {
          success: true,
          message:
            nextStage.durationMs === -1
              ? '已解鎖永久會員'
              : `已解鎖 ${nextStage.label} · ${state.devMode ? (nextStage.durationMs / 1000).toFixed(0) + ' 秒' : (nextStage.durationMs / DAY_MS).toFixed(0) + ' 天'}`,
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
        const days = Math.ceil(ms / DAY_MS);
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
        const { lastFeedbackAt, feedbackDismissedAt, installedAt, devMode, isPermanent } = get();
        if (isPermanent()) return false;
        const now = Date.now();
        const fbInterval = devMode ? FEEDBACK_INTERVAL_MS_DEV : FEEDBACK_INTERVAL_MS_STD;
        const installFor = devMode ? INSTALL_FOR_FEEDBACK_MS_DEV : INSTALL_FOR_FEEDBACK_MS_STD;
        if (!installedAt) return false;
        if (!lastFeedbackAt) {
          return now - new Date(installedAt).getTime() >= installFor;
        }
        if (now - new Date(lastFeedbackAt).getTime() >= fbInterval) {
          if (feedbackDismissedAt) {
            const dismissCool = devMode ? 10 * 1000 : 3 * DAY_MS;
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
        set({ lastFeedbackAt: new Date(Date.now() - 30 * DAY_MS).toISOString() });
      },

      devResetTrial: () => {
        const state = get();
        const stages = state.devMode ? DEV_STAGES : STANDARD_STAGES;
        const stage = stages[0];
        set({
          installedAt: new Date().toISOString(),
          currentStage: 0,
          expiresAt: stage.durationMs === -1 ? null : addIso(stage.durationMs),
          usedCodes: [],
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
      version: 5,
      // ⚠️ 容錯兜底：LocalStorage 損壞時優雅重置為預設值，唔會白屏崩潰
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('[trialStore] Zustand hydration failed, falling back to defaults', error);
            try {
              localStorage.removeItem('ironpulse-trial');
            } catch {}
          }
        };
      },
      migrate: (persistedState, version) => {
        const s = (persistedState ?? {}) as Partial<TrialState>;
        // v2: HMAC 版；v3: 明文碼；v4: 新增 Stage 1（3天/547）；
        // v5: Stage 0-4 天數全部 +1（詳見 STANDARD_STAGES 注釋）。
        const usedCodes =
          (s as { usedCodes?: string[] }).usedCodes ??
          ((s as { usedSignatures?: string[] }).usedSignatures ?? []);
        // v3→v4 / v4→v5：唔會重置舊用戶 expiresAt，避免用戶突然被減少天數 / 提前到期。
        //   只會對 **新 redeem 續用碼** 採用新 stage duration（redeemCode 內讀 STANDARD_STAGES）。
        const resetStage = version < 4;
        // v5：如果舊 expiresAt 仍然未到期就原狀保留；如果到期咗就跟新 Stage 0 重新給 2 天（遷移當日即生效的優惠）。
        const now = Date.now();
        const oldExp = s.expiresAt ? new Date(s.expiresAt).getTime() : null;
        const stillValid = oldExp !== null && oldExp >= now;
        return {
          deviceId: s.deviceId || generateDeviceId(),
          installedAt: resetStage
            ? new Date().toISOString()
            : s.installedAt || new Date().toISOString(),
          currentStage: resetStage
            ? 0
            : typeof s.currentStage === 'number'
              ? s.currentStage
              : 0,
          expiresAt: resetStage
            ? addIso(2 * DAY_MS)
            : version < 5
              ? stillValid
                ? s.expiresAt // 舊用戶仲有效 → 保留原本到期日
                : addIso(2 * DAY_MS) // 舊用戶過期咗 → 補償式俾 2 天 Stage 0 新 duration
              : s.expiresAt || null,
          usedCodes: resetStage ? [] : usedCodes,
          lastFeedbackAt: s.lastFeedbackAt || null,
          feedbackCount: typeof s.feedbackCount === 'number' ? s.feedbackCount : 0,
          feedbackDismissedAt: s.feedbackDismissedAt || null,
          devMode: false,
        } as Partial<TrialState>;
      },
    }
  )
);
