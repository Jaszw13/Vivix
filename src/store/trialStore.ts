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

// P-7：4 階段試用（1/7/30/永久）；stage 0 免碼首日即用
export const STANDARD_STAGES: TrialStage[] = [
  { durationMs: 1 * DAY_MS, label: '首日體驗' }, // Stage 0: 1 天，免碼
  { durationMs: 7 * DAY_MS, label: '一週試用', code: '91531' }, // Stage 1: 7 天
  { durationMs: 30 * DAY_MS, label: '一月深度', code: '695497' }, // Stage 2: 30 天
  { durationMs: -1, label: '永久夥伴', code: 'Vivix-Eternal' }, // Stage 3: 永久
];

// 開發測試模式：每階段 1 分鐘
export const DEV_STAGES: TrialStage[] = [
  { durationMs: 60 * 1000, label: '[DEV] 首日體驗' },
  { durationMs: 60 * 1000, label: '[DEV] 一週試用', code: '91531' },
  { durationMs: 60 * 1000, label: '[DEV] 一月深度', code: '695497' },
  { durationMs: -1, label: '[DEV] 永久夥伴', code: 'Vivix-Eternal' },
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

        const stages = getStages(state);
        const nextStage = stages[currentStage + 1];

        if (!nextStage) {
          return { success: false, message: '無下一階段可解鎖' };
        }

        // P-7：stage 0→1 免碼直接升級（首日體驗 → 一週試用）
        if (currentStage === 0) {
          const newExpiresAt =
            nextStage.durationMs === -1 ? null : addIso(nextStage.durationMs);
          set({
            currentStage: 1,
            expiresAt: newExpiresAt,
            lastFeedbackAt: null,
            feedbackDismissedAt: null,
          });
          return {
            success: true,
            message: `已解鎖 ${nextStage.label} · ${(nextStage.durationMs / DAY_MS).toFixed(0)} 天`,
          };
        }

        // stage 1+ 需對應碼
        if (!nextStage.code) {
          return { success: false, message: '無下一階段可解鎖' };
        }

        const trimmed = code.trim();

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
      version: 6,
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
        // v2: HMAC 版；v3: 明文碼；v4: 新增 Stage 1；v5: Stage 0-4 +1天
        // v6: P-7 4 階段（1/7/30/永久）；舊 stage 等價映射
        const usedCodes =
          (s as { usedCodes?: string[] }).usedCodes ??
          ((s as { usedSignatures?: string[] }).usedSignatures ?? []);
        const oldStage = typeof s.currentStage === 'number' ? s.currentStage : 0;
        // 等價映射（按天數）：
        // 舊 stage 0 (2天) → 新 stage 0 (1天)
        // 舊 stage 1 (4天) / stage 2 (8天) → 新 stage 1 (7天)
        // 舊 stage 3 (15天) / stage 4 (31天) → 新 stage 2 (30天)
        // 舊 stage 5 (永久) → 新 stage 3 (永久)
        const newStage = oldStage === 5 ? 3 : oldStage <= 2 ? Math.min(oldStage, 1) : 2;
        const now = Date.now();
        const oldExp = s.expiresAt ? new Date(s.expiresAt).getTime() : null;
        const stillValid = oldExp !== null && oldExp >= now;
        const stages = STANDARD_STAGES;
        const newStageDef = stages[newStage] ?? stages[0];
        return {
          deviceId: s.deviceId || generateDeviceId(),
          installedAt: s.installedAt || new Date().toISOString(),
          currentStage: newStage,
          expiresAt: stillValid
            ? s.expiresAt
            : newStageDef.durationMs === -1 ? null : addIso(newStageDef.durationMs),
          usedCodes: usedCodes,
          lastFeedbackAt: s.lastFeedbackAt || null,
          feedbackCount: typeof s.feedbackCount === 'number' ? s.feedbackCount : 0,
          feedbackDismissedAt: s.feedbackDismissedAt || null,
          devMode: false,
        } as Partial<TrialState>;
      },
    }
  )
);
