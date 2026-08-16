# Vivix 架構文件（Phase C）

> 對應 Phase B 修復指示 v2.1。本文描述 C1–C8 完成後的目標架構，作為後續開發的單一事實來源。

## 1. 設計原則（最高原則）

> **persist 只存事實，顯示一律派生，更新單一編排；每一刀後，整個軟體更像一個軟體。**

四條守門律（詳見 DEV_RULES.md）：

| 律 | 名稱 | 一句話 |
|----|------|--------|
| L1 | 持久化律 | 只持久化原始事實＋永久決定；衍生欄位由 partialize 排除、migrate 剝除 |
| L2 | 派生律 | 統計出自 `stats/selectors.ts`；分類出自 taxonomy 權威模組 |
| L3 | 編排律 | 跨 store 結算一律走 `stats/settleAll.ts`，順序固定 |
| L4 | 遷移律 | 所有 persist store 版本化＋migrate；migrate 用 `unknown` + guard |

## 2. 分層總覽

```
┌──────────────────────────────────────────────────────────┐
│  Pages（src/pages）                                       │
│  Dashboard / Workout / Progress / Achievements / Plans   │
│  只負責呈現，不內嵌衍生計算                                │
└───────────────┬──────────────────────────────────────────┘
                │ read-only hooks
┌───────────────▼──────────────────────────────────────────┐
│  Components（src/components, src/features/*/components）  │
│  Card / Badge / RestTimer / AchievementBadge ...        │
└───────────────┬──────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────┐
│  權威模組層（Authoritative Modules）                      │
│  • exercises/taxonomy.ts   分類權威                       │
│  • stats/selectors.ts      統計權威（streak/PR/group...） │
│  • stats/settleAll.ts      編排權威（L3 唯一入口）        │
│  • utils/time.ts           時間常數權威                   │
│  • utils/format.ts         日期格式權威                   │
│  • data/theme.ts           UI token 權威                  │
└───────────────┬──────────────────────────────────────────┘
                │ getState / actions
┌───────────────▼──────────────────────────────────────────┐
│  Store 層（Zustand + persist + migrate）                  │
│  workoutStore / achievementsStore / questStore /         │
│  partnerStore / profileStore / equipmentMemoryStore /   │
│  plansStore / themeStore / trialStore / featureFlags    │
└───────────────┬──────────────────────────────────────────┘
                │ persist (localStorage)
┌───────────────▼──────────────────────────────────────────┐
│  事實層（只存原始事實＋永久決定）                          │
│  sessions, customExercises, plans, profile,             │
│  unlockedAt/seen/pending/claimed, theme, trial          │
└──────────────────────────────────────────────────────────┘
```

## 3. 權威模組（C1）

| 模組 | 職責 | 唯一性保證 |
|------|------|-----------|
| `src/features/exercises/taxonomy.ts` | `resolveCurrentTaxonomy` / `resolveExerciseSnapshot` / `getAllExercisesWith` / `findExerciseById` | `workoutStore.ts` re-export 保持 import 兼容；所有分類查找皆 import 本模組 |
| `src/utils/time.ts` | `DAY_MS` / `WEEK_MS` / `FOURTEEN_DAYS_MS` / `dayKey` / `diffDays` | grep `86400000` 僅出現於此 |
| `src/utils/format.ts` | `formatDateShort` / `formatDateFull` / `formatUnlockDate` / `formatWeekdayShort` | grep `toLocaleDateString` 於 pages/components = 0 |
| `src/data/theme.ts` | `REST_TIMER_THEME` / `THEME_DEFINITIONS` / `CHART_WEEK_COLORS` / `OVERLAY_SCRIM` | grep hex 於 components/pages = 0 |
| `src/features/stats/selectors.ts` | `getStreakDays`（D1 語義）；PR／groupStats／volume 現仍為 workoutStore 單一函數（`computePRsFromSessions`／`getGroupStats`），無重複實作；漸進移入為 backlog B-01 | store/元件不得 inline 重算 |
| `src/features/stats/settleAll.ts` | `settleAll` / `settleTaxonomyChange` / `settleOnLoad` | 跨 store 結算唯一入口（L3） |

## 4. 分類回寫機制（P-01 / C2）

核心問題：自訂動作補分類後，所有歷史統計需即時遷移。

**優先序**（`resolveCurrentTaxonomy`）：

1. 當前 exercise 定義（builtin + customExercises）→ 權威
2. 記錄 snapshot（`PersonalRecord.muscleGroup` 等）→ 兜底
3. fallback

**三連閉環**：

- `Progress.tsx` PR 列表 → 走 taxonomy 權威，禁用 `getExerciseById` 作 fallback
- `workoutStore.migrate` → return 前以當前 `customExercises` 重跑 `computePRsFromSessions`（純函數）
- `editCustomExercise` / `deleteCustomExercise` → 結尾觸發 PR 重算；已刪自訂動作的 PR 保留 snapshot 分類不消失

## 5. 跨 store 編排（C5 / L3）

`settleAll.ts` 固定順序：

1. `metrics = computeMetrics`（透過 `achievementsStore.recompute`，ctx 由 workout + profile 派生）
2. `partner.addXp` + form unlock（`handleWorkoutCompleted`，僅 partner 啟用）
3. `achievements` settlement：達標且未 unlocked → `unlockedAt = now` + pending
4. `quests` settlement：達標 → completed（claim 由用戶）
5. `telemetry`：新解鎖統一在此 log

**觸發點僅三處**：

- `finishSession` 後（WorkoutSummary mount）
- `editCustomExercise` / `deleteCustomExercise` 後（走 `settleTaxonomyChange`）
- load / migrate 後一次（`settleOnLoad`，`silent: true` 不彈慶祝）

註：頁面進入（Dashboard／AchievementsPage mount）呼叫 `settleTaxonomyChange` 為冪等安全網 — `unlockedAt` 永久，不會重複慶祝／重複 telemetry。

## 6. 去快取化（C4 / D2）

衍生欄位一律移出 persist，改由 sessions/customExercises 即時派生。

| Store | 版本 | persist 內容 | 不再 persist 的衍生欄位 |
|-------|------|-------------|----------------------|
| workoutStore | v7 | sessions, customExercises, activePlanId, nextDayIndex, taxonomyVersion | personalRecords |
| achievementsStore | v4 | progress[id].unlockedAt（永久 D2） | lastMetrics, current |
| questStore | v2 | claimed, completedAt | current |
| partnerStore | v2 | species, name, unlockedFormIds, ... | level, totalWorkouts, totalTrainingDays |
| equipmentMemoryStore | v2 | （改讀取時派生） | memories |
| profileStore | v2 | profile, onboardingCompleted, goal | — |

**D2 語義**：`unlockedAt` 永久保存；進度條 live 反映真實數據（手造刪 sessions 後進度即時下降，但已 unlocked 成就不消失）。

## 7. 身體重量（D3）

`profileStore.bodyWeight: number | null`，預設 `null`。

- migrate：舊 `bodyWeight === 75`（舊 default）→ `null`
- `null` 時 BW 軌成就不觸發、不顯示假數字
- AchievementsPage 顯示「輸入體重解鎖」鎖定提示
- settleAll 傳 `profile.profile.bodyWeight`（不再 `?? 75`）

## 8. 力量家族（N-5）

`LiftFamily = 'bench' | 'squat' | 'deadlift' | 'ohp'`，權威定義於 `types/index.ts`。

- `Exercise.liftFamily?`：自訂動作可明確指定
- `PersonalRecord.liftFamily?`：PR snapshot 保留
- `taxonomy.ts` 的 `resolveCurrentTaxonomy` 回傳 `liftFamily`
- `getLiftFamily(exerciseId, exerciseName?, explicitFamily?)`：優先 explicit，其次依名稱推斷
- Workout.tsx 自訂表單提供力量家族選擇器（含「自動推斷」選項）

## 9. 試用鎖與 Onboarding

- 試用：5 階段漸進解鎖（2→4→8→15→31→永久天數），數字碼驗證
- `trialStore` v5；persist key `vivix-trial-*` 不變
- Onboarding：首次啟動流程，完成後 `profileStore.onboardingCompleted = true`
- 試用續用碼本期保留；商業化前移 env（D6，寫入 DEV_RULES，本期不動）

## 10. mobile-app（D4）

已凍結為 prototype：

- `mobile-app/FROZEN.md`：prototype、不投資、schema 與 web 分叉聲明
- `sampleSessions` seed 已移除，新裝見空狀態
- 不再加功能

## 11. 雙主題與 PWA

- 雙主題：Industrial Power（dark）、Elegant Beige（light）
- 主題色盤單一來源：`data/theme.ts` 的 `THEME_DEFINITIONS`
- PWA：`vite-plugin-pwa`，離線快取 16 entries；iPhone 需刪除重裝以載入新版（舊 SW cache 限制）
- 行動優先：max-width 480px、5 頁底部導航

## 12. 完成一組 → 休息計時（不可破壞）

- 像素與行為皆不變
- `RestTimer` 顏色讀 `REST_TIMER_THEME.buttonFg`（原硬編碼 `#FFF` / `#0A0A0B`）
- 任何修改不得改變此體驗
