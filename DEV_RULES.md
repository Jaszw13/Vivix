# Vivix 開發守則（Phase C + L0 定位律 v2.1）

> 對應 Phase B 修復指示 v2.1 + 定位重定義 Errata v2.1。本文為長期守門規則，防止代碼再次劣化。所有 PR 必須符合此處規則。

## L0：定位律（Positioning Law）

```yaml
L0_positioning:
  statement: >
    Vivix 服務「記錄新手」：開始系統化記錄訓練的人。雙 lane 架構 —
    Lane A 訓練新手（第一次進健身房＋第一次系統記錄，教練式帶領的 5×5 入門流）；
    Lane B 經驗記錄者（會練但沒系統記錄／從 Excel 或其他工具轉移，承認你的過去）。
    一切功能、文案、文件必須同時對雙 lane 成立。
  brand_line: Vivix — 把每一次訓練，變成看得見的進步。
```

**glossary（所有 PR 守則）**：
1. 禁用統一稱呼「健身新手」作為對用戶的總稱；UI 與文件皆改用雙 lane 中性措辭：
   - Lane A 語氣：**帶你練**（教練）。
   - Lane B 語氣：**幫你記得**、**承認你的過去**（記錄）。
   - 中性共用：「你」、「訓練者」、「開始系統化記錄訓練的人」。
2. 舊張力（intermediate 計畫 vs 新手定位）**標記已解決**：計畫多樣性（5×5 / 上下分裂 / PPL）是 Lane B 剛需；
   Lane A 預設 5×5 但不鎖死（可於設定更換計畫）。
3. **兩種 totalWorkouts 語義（E15，嚴格避免混用）**：
   - **統計／成就／streak 用**（I-3）＝ `sessions.length`，即**全 sessions 計，包含 imported**；
     成就 metric、streak days、PR、部位體積、器械記憶均使用此語義。
   - **Partner 形態解鎖／XP 用**（I-4）＝ `sessions.filter(s => s.imported !== true).length`，
     即 `partnerStore.getTotalWorkouts()`：**僅非 imported 計**；避免 Lane B 匯入 50 筆後
     一次性解鎖所有 Partner 形態（稀釋 I-4「親自記錄」的語義）。

---

### 決策紀錄（Policy ＆ Import Decisions，P-1 / I-1…I-6）

| 代號 | 決策 | 生效點 |
|---|---|---|
| **P-1** | 目標用戶＝記錄新手（雙 lane）；L0 為最高位階，所有文案/文件必須對齊 | 所有頁面、README、DEV_RULES |
| **I-1** | Onboarding 首步「你的訓練經驗？」三選項 → `profile.experienceLevel: 'beginner' \| 'experienced'`（原始事實 persist）；profileStore v3，舊用戶 migrate 為 `'beginner'` | profileStore v3 migrate + Onboarding StepExperience |
| **I-2** | 匯入 v1＝ Excel 矩陣 TSV 貼上（matrixParser.ts）＋ 簡易 CSV 表格貼上（csv.ts）＋手動補錄；**禁任何新依賴**，ID 統一 `generateId`（src/utils/workout.ts） | src/utils/csv.ts、matrixParser.ts、fuzzy.ts、textSplit.ts |
| **I-3** | imported session **計入**：PR 列表、成就、streak、部位報告、進度曲線、器械記憶、週報總噸數（即上述「統計／成就用」totalWorkouts 語義） | computePRsFromSessions、selectors.getStreakDays、selectors groupStats、energy equipmentMemory 派生 |
| **I-4** | imported session **不計入**：Partner XP、Partner 形態解鎖（即「Partner 用」totalWorkouts 語義）；防止 Lane B 匯入一次解鎖所有形態 | partnerStore.getTotalWorkouts + settleAll skipPartner |
| **I-5** | 匯入完成：`settleAll(undefined, { silent:true, skipPartner:true })` 後一次性「**每匯入批次一次**」認可儀式 RecognitionModal；慶祝 queue 靜音（不重複彈 toast/celebration） | settleAll opts + RecognitionModal |
| **I-6** | 熱量估算（strength EE、週報總熱量）**僅限非 imported session**；Progress 熱量卡附註「匯入記錄不計入熱量估算」（匯入記錄缺乏 startedAt/finishedAt/rest 細節，不應進入 EE 雙段 MET） | stats/energy.ts 首行 guard、Progress EE card chip |

---

## L1：持久化律（Persistence Law）

只持久化原始事實＋永久決定；衍生欄位一律由 `partialize` 排除、`migrate` 剝除。

### 持久化白名單

| Store | persist | 不 persist（衍生） |
|-------|---------|------------------|
| workoutStore v8 | sessions（含 startedAt/finishedAt）、customExercises、activePlanId、nextDayIndex、taxonomyVersion | personalRecords |
| achievementsStore v4 | progress[id].unlockedAt（永久 D2）、seen、pending | lastMetrics、current |
| questStore v2 | claimed、completedAt | current |
| partnerStore v2 | species、name、unlockedFormIds、cosmetics | level、totalWorkouts、totalTrainingDays |
| equipmentMemoryStore v2 | （改讀取時派生） | memories |
| profileStore v3 | profile（含 experienceLevel 原始事實）、onboardingCompleted、goal | — |
| plansStore v1 | customPlans | — |
| cardioStore v1 | sessions（id/date/machine/durationMin/kcal/avgHr/distanceKm/createdAt） | —（皆原始事實） |
| themeStore | theme | — |
| trialStore v5 | stage、usedCodes、... | — |
| featureFlags v2 | partnerEnabled | （已刪 4 個無消費端 flag） |
| telemetryStore v2 | events | — |

### 規則

1. 新增 store 欄位時，先問：「這是事實還是衍生？」衍生 → 不 persist。
2. `partialize` 必須明確列舉持久化欄位，禁止 `...state` 全存。
3. `migrate` 必須剝除舊衍生欄位（如 v6 的 personalRecords）。
4. persist key 全部不變（`ironpulse-*` / `vivix-*`），不得換 key 造成資料丟失。
5. **熱量值一律禁止 persist**：strengthKcal / cardioKcal / MET 計算結果（含 low/high/activeMin/restMin/isFallback）皆為衍生，走 `features/stats/energy.ts` 即時派生；唯一例外是 `CardioSession.kcal` — 此為**用戶手動輸入的機器原始讀數**，定義為「事實」而非「推估」，屬 cardioStore 白名單（見 CALORIE_MODEL.md §4.1）。

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

### E-D1：力量熱量雙段 MET 模型

顯示「≈ X kcal（約 L–H）」＋「推估值」標籤。公式見 CALORIE_MODEL.md §3。

### E-D2：bodyWeight 為 null → 力量熱量鎖定

`profileStore.profile.bodyWeight === null` 時，力量熱量卡顯示「輸入體重解鎖」提示（沿用 D3 門檻），不顯示假數字。

### E-D3：有氧日計入 streak

`streak = 力量日 ∪ 有氧日`（E-04 selectors union）；D1 語義不變（昨天有練今天未練仍延續）。

### E-D4：有氧 Partner XP 20/日

settleAll 內每日有氧結算 20 XP，每日上限 1 次；Partner 形態解鎖的 `totalWorkouts` 仍只算力量 session（不稀釋原語義）。

### E-D5：有氧 kcal 選填，缺則 MET fallback

`CardioSession.kcal`：用戶輸入 = 機器讀數（事實，persist 白名單）；未輸入 → MET × kg × (min/60) fallback（標「推估值」）；缺 kcal 且 `bodyWeight === null` → 顯示「—」＋提示。

### E-D6：總熱量＝力量推估＋有氧（輸入或 fallback）

報告總熱量卡合併兩項，附免責小字：「機器讀數與代謝估算皆約 ±15–20% 誤差，僅供參考」。

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
- 改休息計時行為或成就目錄既有 67（58 力量基礎 + 9 有氧）數值（僅追加新 metric/成就）
- 在 C1–C8 之外新增功能或重構
- 讓 mobile-app 繼續長功能
- `as any`、非空斷言 `!`（改安全 guard）
- **persist 熱量／MET 推估結果**（strengthKcal / cardio fallback kcal / low/high/activeMin/restMin/isFallback）；`CardioSession.kcal` 僅限用戶手動輸入的機器讀數可 persist
- **醫療級宣稱**（如「可降血壓」「保證減 X kg」）
- **假設穿戴裝置**（心率帶、手錶、腳踏車功率計等皆不做整合）

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
