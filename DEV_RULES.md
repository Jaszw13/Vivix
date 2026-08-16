# Vivix 開發守則（Phase C）

> 對應 Phase B 修復指示 v2.1。本文為長期守門規則，防止代碼再次劣化。所有 PR 必須符合此處規則。

## L1：持久化律（Persistence Law）

只持久化原始事實＋永久決定；衍生欄位一律由 `partialize` 排除、`migrate` 剝除。

### 持久化白名單

| Store | persist | 不 persist（衍生） |
|-------|---------|------------------|
| workoutStore v7 | sessions, customExercises, activePlanId, nextDayIndex, taxonomyVersion | personalRecords |
| achievementsStore v4 | progress[id].unlockedAt（永久 D2）、seen、pending | lastMetrics、current |
| questStore v2 | claimed、completedAt | current |
| partnerStore v2 | species、name、unlockedFormIds、cosmetics | level、totalWorkouts、totalTrainingDays |
| equipmentMemoryStore v2 | （改讀取時派生） | memories |
| profileStore v2 | profile、onboardingCompleted、goal | — |
| plansStore v1 | customPlans | — |
| themeStore | theme | — |
| trialStore v5 | stage、usedCodes、... | — |
| featureFlags v2 | partnerEnabled | （已刪 4 個無消費端 flag） |
| telemetryStore v2 | events | — |

### 規則

1. 新增 store 欄位時，先問：「這是事實還是衍生？」衍生 → 不 persist。
2. `partialize` 必須明確列舉持久化欄位，禁止 `...state` 全存。
3. `migrate` 必須剝除舊衍生欄位（如 v6 的 personalRecords）。
4. persist key 全部不變（`ironpulse-*` / `vivix-*`），不得換 key 造成資料丟失。

## L2：派生律（Derivation Law）

統計一律出自 `src/features/stats/selectors.ts`；分類一律出自 taxonomy 權威模組。

### 現況註記

- streak 權威在 selectors.ts（D1 語義）。
- PR／groupStats／volume 現仍為 workoutStore 單一函數（`computePRsFromSessions`／`getGroupStats`），無重複實作；漸進移入 selectors 為 backlog **B-01**。

### 規則

1. 統計計算禁止散落於 store/元件；集中 selectors（或 workoutStore 單一函數，依 B-01 漸進移入）。
2. 分類查找禁止用 `getExerciseById` 作 fallback；走 `resolveCurrentTaxonomy`。
3. memo key = `(sessions ref, taxonomyVersion, profileVersion)`。
4. 元件不得 inline 計算統計（如 inline 算 streak、inline 算 volume）。
5. 日期格式化一律用 `utils/format.ts`；禁止 `toLocaleDateString` 散落。
6. 時間常數一律用 `utils/time.ts`；禁止硬編碼 `86400000`。
7. UI 顏色一律用 `data/theme.ts`；禁止 hex 散落於 components/pages。

### 驗收 grep

- `grep "86400000" src` 僅出現於 `utils/time.ts`
- `grep toLocaleDateString src/pages|components` = 0
- `grep "#[0-9A-Fa-f]{3,8}" src/components src/pages` = 0（data/theme.ts 除外）
- `grep "as any" src` = 0

## L3：編排律（Orchestration Law）

跨 store 的衍生結算一律經過 `src/features/stats/settleAll.ts`，順序固定可測。

### 結算順序

1. `metrics = computeMetrics`（透過 `achievementsStore.recompute`）
2. `partner`：`addXp` + form unlock（`handleWorkoutCompleted`，僅 partner 啟用）
3. `achievements` settlement：達標且未 unlocked → `unlockedAt = now` + pending
4. `quests` settlement：達標 → completed（claim 由用戶）
5. `telemetry`：新解鎖統一在此 log

### 觸發點（僅三處）

- `finishSession` 後（WorkoutSummary mount）→ `settleAll(rewardCtx)`
- `editCustomExercise` / `deleteCustomExercise` 後 → `settleTaxonomyChange()`
- load / migrate 後一次 → `settleOnLoad()`（`silent: true` 不彈慶祝）

註：頁面進入（Dashboard／AchievementsPage mount）呼叫 `settleTaxonomyChange` 為冪等安全網 — `unlockedAt` 永久，不會重複慶祝／重複 telemetry。

### 規則

1. 禁止在元件、store action 內直接呼叫其他 store 的結算（如 achievementsStore 直接 telemetry.log）。
2. 禁止多處獨立觸發結算造成重複慶祝批次。
3. 一次 finish 只產生一組慶祝批次。

## L4：遷移律（Migration Law）

所有 persist store 必須版本化＋migrate；migrate 用 `unknown` + guard，不得 `as any`。

### 規則

1. 新增 store 必須 `version` + `migrate`。
2. `migrate(persistedState)` 第一行：`const raw = (persistedState ?? {}) as Record<string, unknown>`（或對應型）。
3. 每個欄位讀取前 guard 型別（`Array.isArray`、`typeof === 'string'` 等）。
4. migrate 必須處理舊 payload 不丟資料、不 crash。
5. 升版時 bump `version` 並在 migrate 剝除舊衍生欄位。

### migrate 範本

```typescript
migrate: (persistedState: unknown) => {
  const s = (persistedState ?? {}) as Partial<MyState>;
  return {
    fieldA: typeof s.fieldA === 'string' ? s.fieldA : DEFAULT.fieldA,
    fieldB: Array.isArray(s.fieldB) ? s.fieldB : [],
    // ...
  };
},
```

## 決策記錄（D1–D6）

### D1：streak 語義

「昨天有練、今天未練」仍顯示延續，當日結束才斷。實作於 `selectors.getStreakDays`，同源於 Dashboard / AchievementsPage / questStore。

### D2：成就 unlocked 永久

`unlockedAt` 永久保存；進度條 live 反映真實數據。手造刪 sessions 後進度下降，但已 unlocked 成就不消失。禁止 `Math.max` 單調遞增。

### D3：bodyWeight 可空

`profileStore.bodyWeight: number | null`，預設 `null`。migrate：舊 `=== 75` → `null`。`null` 時 BW 軌成就鎖定 + 「輸入體重解鎖」提示。

### D4：mobile-app 凍結

mobile-app 為 prototype，不加功能。`FROZEN.md` 聲明；sampleSessions seed 移除，新裝見空狀態。

### D5：flags 清理

刪除 4 個無消費端 flag（`partnerQuestsEnabled` / `warmupEnabled` / `telemetryEnabled` / `debugPanelEnabled`），僅保留 `partnerEnabled`。

### D6：trial 續用碼本期保留

試用續用碼本期保留；商業化前移 env（寫入本規則，本期不動）。商業化時將續用碼邏輯移至環境變數，前端不硬編碼。

## 工程慣例

### 狀態管理

- Zustand + persist + migrate
- UI 元件：重用既有 Card / SectionHeader / StatTile / Badge
- Timer：timestamp-based 計算（背景可靠）
- persist key：`ironpulse-*` / `vivix-*` 不變

### 試用階段

- 5 階段漸進解鎖：2→4→8→15→31→永久天數
- 數字碼驗證（簡單數字碼，非加密）

### 訓練計畫

- 新手計畫（5×5）每天 ≥3 暖身項目
- `DEFAULT_BEGINNER_PLAN_ID` 單一 export 自 `data/plans.ts`

### 自訂動作

- 顯示「自訂」badge
- 支援 edit/delete
- 可指定 `liftFamily`（N-5）
- 完全整合進統計與成就

### 器械記憶

- key 格式：`${equipmentId}:${exerciseId}`
- 跨 app 重啟持久（透過 sessions 派生）
- 不同器械重量不互相覆蓋

### 媒體

- 預設：2D flat illustrations + 完整 metadata
- 支援本地影片/GIF 上傳 + 外部影片連結
- 遵守合規政策

### 達成/PR/進度曲線/報告

- 一律按肌群計算
- 自訂動作完全整合
- 訓練中替換動作 ≤10 秒完成

## 禁止清單

- 新依賴 / 後端 / 外部服務 / 帳號 / 雲同步 / 付款
- 外部 AI API 呼叫做動作分類
- 未授權圖片下載
- 器械識別用品牌名/logo
- 品牌圖片進 build
- 新功能干擾預設新手體驗
- 在元件內新增衍生計算
- 更換 persist key
- 改休息計時行為或成就目錄數值（58 個）
- 在 C1–C8 之外新增功能或重構
- 讓 mobile-app 繼續長功能
- `as any`、非空斷言 `!`（改安全 guard）

## 教訓記錄（Lessons Learned）

- Vercel 中國大陸可能不可達；Cloudflare Pages 為替代
- 前端 trial 系統可被清除瀏覽器資料重置
- React 18 StrictMode 對 render-phase setState 或不穩 useEffect deps 會無限 re-render
- iPhone PWA 可能需刪除重裝以載入新版（舊 SW cache）
- 全局 weight metrics 造成腿成就獨霸；需按肌群計算
- koa-connect wrapper 造成 ctx 洩漏；需 native Koa rewrite（歷史）

## Backlog

| ID | 項目 | 說明 |
|----|------|------|
| B-01 | stats 移入 selectors | `computePRsFromSessions`／`getGroupStats` 等函數從 workoutStore 漸進移入 `features/stats/selectors.ts`；保持單一實作，優先不重構 |
| B-02 | 孤兒 key 清理機制 | 見 R-3 一次性清理（`vivix-equipment-memory`）；下次升級 store 版本時，可擴充 `ORPHAN_KEYS` 陣列集中管理 |

## 部署

- Vercel（優先免費 hosting）；Cloudflare Pages 為替代
- GitHub main 分支 push 自動觸發 Vercel 部署（2-3 分鐘）
- PWA：`vite-plugin-pwa`，generateSW mode
