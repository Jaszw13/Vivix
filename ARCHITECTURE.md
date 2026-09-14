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

### 定位律附錄（L0，詳見 DEV_RULES.md L0）

Vivix 服務「記錄新手」雙 lane：
- **Lane A 訓練新手**：第一次進健身房＋第一次系統記錄。Onboarding 首步 experience=beginner → 其餘 Steps 序列不變（E7：教練流 5×5 入門）。
- **Lane B 經驗記錄者**：經驗自選 experienced 兩支 — ① 有在練但沒系統記錄；② 從 Excel／其他 App 轉移（觸發歷史匯入 wizard v1）。計畫依頻率或 8 週平均推薦（1→5×5、2→上下分裂、3-4/5+→PPL）。

**兩種 totalWorkouts 語義（E15）**：① 統計／成就／streak 用＝全 sessions（含 imported，I-3）；② Partner 形態解鎖／XP 用＝僅非 imported（I-4，`partnerStore.getTotalWorkouts()`）。

### §匯入管線（Import v1 Pipeline）

入口：Settings 資料管理「匯入歷史訓練」按鈕 ＋ Onboarding Lane B experienced_has_log step import-wizard（共用 ImportHistoryModal）。

```
用戶貼上 text（TSV 或 CSV）
  │
  ▼
detectMode：
  有 Weight+Reps markers 且 月/日 token   → matrix 模式（src/utils/matrixParser.ts）
  首行 header 似 date/exercise/weight/reps → table 模式（src/utils/csv.ts）
  其他                                   → 錯誤 + 兩種範例
  │
  ▼
Step1 quote-aware parse（src/utils/textSplit.ts splitQuoteAware shared by csv+matrix，支援多行引號 cell/E2）
  │  matrix: 年月 ctx → anchor header (name d-1, marker d, sets d+1..10, Load d+11) → multi-day anchor
  │  table: 欄位映射 chips + 日期格式選擇器(4種) + 單位(kg/lb)
  ▼
Step2 動作映射（fuzzy token overlap≥1 或 Levenshtein≤2，E1）
  │ unique 名單 → 每項 select dropdown（內建/既有自訂/建新自訂）
  │ 新建自訂：CustomExerciseForm 共用元件（E14），分類 MuscleGroup 必填，equipment default barbell
  ▼
Step3 預覽（N sessions / M unique exercises / 日期區間 / 總噸數 / skipped lines / Load warnings）
  │ Confirm CTA
  ▼
workoutStore.importSessionsBatch（單次 set() 批次寫入，E12）
  - sessions.imported = true
  - startedAt/finishedAt = null
  - sets.completed = true
  - session.notes = 合併 Feedback（同日同內容去重，E6）
  - IDs 統一 src/utils/workout.ts generateId（E3，禁 nanoid）
  │
  ▼
settleAll(undefined, { silent: true, skipPartner: true })
  → metrics 重算（imported 會參與成就/PR/streak，I-3）
  → celebration queue 靜音（silent 不 push toast/modal）
  → Partner XP / form unlock 短路（skipPartner，I-4）
  │
  ▼
RecognitionModal 每匯入批次一次（E8，非 ever-once）
  文案：「本批次認可：X sessions・Y training days・Z PR・W 成就・T 噸」
  CTA：成就牆 / Dashboard（走現有導航機制，E11）
```

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
│  Card / Badge / RestTimer / MiniTimerBar /             │
│  WeeklyReportModal / TrainingCalendar / DaySessionEditor│
│  / BodyMetricAddForm / ...                              │
└───────────────┬──────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────┐
│  權威模組層（Authoritative Modules）                      │
│  • exercises/taxonomy.ts   分類權威                       │
│  • stats/selectors.ts      統計權威（streak/PR/group...） │
│  • stats/settleAll.ts      跨排權威（L3 唯一入口）        │
│  • stats/energy.ts         熱量估算權威（雙段 MET）       │
│  • stats/weeklyReport.ts   週報派生權威（T5）             │
│  • data/metTable.ts        MET 常數權威（Compendium）     │
│  • utils/time.ts           時間常數權威                   │
│  • utils/format.ts         日期格式權威                   │
│  • data/theme.ts           UI token 權威                  │
└───────────────┬──────────────────────────────────────────┘
                │ getState / actions
┌───────────────▼──────────────────────────────────────────┐
│  Store 層（Zustand + persist + migrate）                  │
│  workoutStore / achievementsStore / questStore /         │
│  partnerStore / profileStore / equipmentMemoryStore /   │
│  cardioStore / bodyMetricsStore / plansStore /          │
│  themeStore / trialStore / featureFlags /               │
│  restTimerStore（不 persist）                           │
└───────────────┬──────────────────────────────────────────┘
                │ persist (localStorage)
┌───────────────▼──────────────────────────────────────────┐
│  事實層（只存原始事實＋永久決定）                          │
│  sessions（含 startedAt/finishedAt）、customExercises、  │
│  plans、profile（含 gymEquipmentIds）、cardioSessions、  │
│  bodyMetrics、unlockedAt/seen/pending/claimed、        │
│  theme、trial                                          │
└──────────────────────────────────────────────────────────┘
```

## 3. 權威模組（C1）

| 模組 | 職責 | 唯一性保證 |
|------|------|-----------|
| `src/features/exercises/taxonomy.ts` | `resolveCurrentTaxonomy` / `resolveExerciseSnapshot` / `getAllExercisesWith` / `findExerciseById` | `workoutStore.ts` re-export 保持 import 兼容；所有分類查找皆 import 本模組 |
| `src/utils/time.ts` | `DAY_MS` / `WEEK_MS` / `FOURTEEN_DAYS_MS` / `dayKey` / `diffDays` / `addDays` / `getISOWeek` / `getWeekStart`（T5 週報用） | grep `86400000` 僅出現於此 |
| `src/utils/format.ts` | `formatDateShort` / `formatDateFull` / `formatUnlockDate` / `formatWeekdayShort` | grep `toLocaleDateString` 於 pages/components = 0 |
| `src/data/theme.ts` | `REST_TIMER_THEME` / `THEME_DEFINITIONS` / `CHART_WEEK_COLORS` / `OVERLAY_SCRIM` | grep hex 於 components/pages = 0 |
| `src/features/stats/selectors.ts` | `getStreakDays`（D1 + E-D3 union 語義：力量日 ∪ 有氧日）；熱量統計（每週力量/有氧 kcal、總和）同源於本檔；PR／groupStats／volume 現仍為 workoutStore 單一函數（`computePRsFromSessions`／`getGroupStats`），無重複實作；漸進移入為 backlog B-01 | store/元件不得 inline 重算 |
| `src/features/stats/settleAll.ts` | `settleAll` / `settleTaxonomyChange` / `settleOnLoad`；cardio metrics 納入 buildAchieveCtx；有氧日 XP（20/日上限 1 次）；streak union 所有消費端；T4 `pr_celebrated` telemetry 第 5 節 | 跨 store 結算唯一入口（L3） |
| `src/features/stats/weeklyReport.ts` | `computeWeeklyReport`（純函數；全派生不 persist）、`generatePartnerMessage`（規則式文案） | T5 週報唯一計算來源；元件禁止 inline |
| `src/features/stats/energy.ts` | `estimateStrengthKcal`（雙段 MET，null＝體重未填）；`estimateCardioKcal`（用戶 kcal 優先，否則 MET fallback，null＝體重未填且無 kcal）；純函式 | 僅 selectors.ts 消費；元件禁止 inline import |
| `src/data/metTable.ts` | `STRENGTH_ACTIVE_MET` / `CARDIO_MET` / `REST_MET` / `CALORIE_ERROR_BAND_LOW|HIGH` / `FALLBACK_*_SECONDS`；fetchedAt = 2026-08-16（2024 Compendium 查證） | 常數單一來源；禁止散落常數 |

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

1. `metrics = computeMetrics`（透過 `achievementsStore.recompute`，ctx 由 workout + profile + **cardio** 派生；cardio 計 3 新 metric：`cardioMinutesTotal` / `cardioSessionsTotal` / `cardioWeeklyRhythmWeeks`）
2. `partner.addXp`：
   a. `handleWorkoutCompleted(rewardCtx)`（僅力量 session，提供 rewardCtx 時）
   b. **`settleCardioDailyXp()`**（有氧 20 XP / 日，每日上限 1 次；E-D4）
3. `achievements` settlement：達標且未 unlocked → `unlockedAt = now` + pending（+9 cardio 成就納入；舊 58 不動）
4. `quests` settlement：達標 → completed（ctx streak 取 **力量日 ∪ 有氧日 union**，E-D3）
5. `telemetry`：新解鎖統一在此 log；另 cardio add/delete 與 EE 事件在 action 內觸發

**觸發點僅四處**：

- `finishSession` 後（WorkoutSummary mount）
- `addCardio` / `deleteCardio` / `editCustomExercise` / `deleteCustomExercise` 後（走 `settleTaxonomyChange`）
- `addPastSession` / `updatePastSession` / `deletePastSession` 後（T9-3；由 TrainingCalendar 呼叫端執行 `settleAll(undefined, { silent: true })`，store 內不 settle）
- load / migrate 後一次（`settleOnLoad`，`silent: true` 不彈慶祝）

註：頁面進入（Dashboard／AchievementsPage mount）呼叫 `settleTaxonomyChange` 為冪等安全網 — `unlockedAt` 永久，不會重複慶祝／重複 telemetry。

## 6. 有氧與熱量（E-1 / E-2）

### 6.1 雙段力量熱量（E-1）

```text
strengthKcal ≈ activeMET_weighted × kg × activeH ＋ REST_MET × kg × restH
```

- 輸入：sessions（含 startedAt/finishedAt 事實，v8 migrate 舊 session → null）、customExercises、bodyWeight（可 null）
- bodyWeight null → 回 null（E-D2：鎖定提示，不落假數字）
- timestamp null → activeH fallback = completedSets × 40s
- 部位加權：多部位 session 按完成組數加權 average MET
- 輸出：`{ kcal, low, high, activeMin, restMin }`（皆衍生，永不 persist）

### 6.2 有氧事實 store（E-2）

`cardioStore v1`，persist key `vivix-cardio-v1`，version 1 + migrate（L4）。

```ts
interface CardioSession {
  id: string; date: string; machine: CardioMachine;
  durationMin: number;                 // 必填 >0，事實
  kcal?: number | null;                // 機器顯示值，選填，事實（可 persist）
  avgHr?: number | null;               // 選填，事實
  distanceKm?: number | null;          // 選填，事實
  createdAt: string;
}
```

Actions：`addCardio` / `deleteCardio`（皆觸發 `settleTaxonomyChange` 後結算）

### 6.3 有氧 kcal 三態（E-D5）

| 狀態 | 來源 | 顯示 |
|------|------|------|
| 用戶輸入 kcal | cardioSession.kcal（事實） | `{kcal} kcal（機器）` |
| 未輸入 kcal + 有體重 | CARDIO_MET × kg × min/60 | `≈ {kcal} kcal（推估值）` |
| 未輸入 kcal + 無體重 | 無法估算 | `—` + 提示 |

### 6.4 Streak union（E-D3）

唯一來源：`selectors.getStreakDays(workoutSessions, cardioSessions)`

```
trainingDays = dayKey(sessions.date) ∪ dayKey(cardioSessions.date)
```

- D1 語義保留（昨天有練、今天未練仍延續）
- 消費端：Dashboard streak tile / AchievementsPage streak / questCtx.streakDays / report 全部同源

### 6.5 成就 +9（cardio_*）

metric 擴充：`cardioMinutesTotal` / `cardioSessionsTotal` / `cardioWeeklyRhythmWeeks`

| id（風格） | 階梯 | copy 語氣 |
|-----------|------|----------|
| cardio_first (t1) | sessions ≥ 1 | 「有氧初體驗」 |
| cardio_min (t1–t5) | 30/60/120/300/600 min | 「累積 60 分鐘有氧。跑步機上的每一分鐘都算數。」 |
| cardio_sess (t2–t3) | 10/25 次 | 「完成 25 次有氧。心肺能力看得見。」 |
| cardio_weekly (t2) | 每週 ≥1 × 4 週 | 「連續 4 週維持有氧節奏。這就是習慣。」 |

舊 58 成就 id/threshold/copy 全不動。

## 7. 去快取化（C4 / D2）

衍生欄位一律移出 persist，改由 sessions/customExercises 即時派生。

| Store | 版本 | persist 內容 | 不再 persist 的衍生欄位 |
|-------|------|-------------|----------------------|
| workoutStore | v8 | sessions（含 startedAt/finishedAt）、customExercises、activePlanId、nextDayIndex、taxonomyVersion | personalRecords、任何 kcal/MET 結果 |
| achievementsStore | v4 | progress[id].unlockedAt（永久 D2） | lastMetrics, current |
| questStore | v2 | claimed, completedAt | current |
| partnerStore | v2 | species, name, unlockedFormIds, ... | level, totalWorkouts, totalTrainingDays |
| equipmentMemoryStore | v2 | （改讀取時派生） | memories |
| cardioStore | v1 | CardioSession 原始事實（durationMin/kcal 輸入/avgHr/distanceKm/...） | fallback kcal、kcal low/high、任何 MET 計算結果 |
| profileStore | v2 | profile, onboardingCompleted, goal | — |

**D2 語義**：`unlockedAt` 永久保存；進度條 live 反映真實數據（手造刪 sessions 後進度即時下降，但已 unlocked 成就不消失）。

## 8. 身體重量（D3）

`profileStore.bodyWeight: number | null`，預設 `null`。

- migrate：舊 `bodyWeight === 75`（舊 default）→ `null`
- `null` 時 BW 軌成就不觸發、不顯示假數字；**力量熱量同步鎖定（E-D2）＋有氧 kcal fallback 亦鎖定（E-D5）**
- AchievementsPage / WorkoutSummary 顯示「輸入體重解鎖」鎖定提示
- settleAll 傳 `profile.profile.bodyWeight`（不再 `?? 75`）

## 9. 力量家族（N-5）

`LiftFamily = 'bench' | 'squat' | 'deadlift' | 'ohp'`，權威定義於 `types/index.ts`。

- `Exercise.liftFamily?`：自訂動作可明確指定
- `PersonalRecord.liftFamily?`：PR snapshot 保留
- `taxonomy.ts` 的 `resolveCurrentTaxonomy` 回傳 `liftFamily`
- `getLiftFamily(exerciseId, exerciseName?, explicitFamily?)`：優先 explicit，其次依名稱推斷
- Workout.tsx 自訂表單提供力量家族選擇器（含「自動推斷」選項）

## 10. 試用鎖與 Onboarding

- 試用：4 階段漸進解鎖（1/7/30/永久天數），數字碼驗證；stage 0 免碼直接升級（T1）
- `trialStore` v6；persist key `vivix-trial-*` 不變
- Onboarding：首次啟動流程，完成後 `profileStore.onboardingCompleted = true`
- 試用續用碼本期保留；商業化前移 env（D6，寫入 DEV_RULES，本期不動）

## 11. mobile-app（D4）

已凍結為 prototype：

- `mobile-app/FROZEN.md`：prototype、不投資、schema 與 web 分叉聲明
- `sampleSessions` seed 已移除，新裝見空狀態
- 不再加功能

## 12. 雙主題與 PWA

- 雙主題：Industrial Power（dark）、Elegant Beige（light）
- 主題色盤單一來源：`data/theme.ts` 的 `THEME_DEFINITIONS`
- PWA：`vite-plugin-pwa`，離線快取 16 entries；iPhone 需刪除重裝以載入新版（舊 SW cache 限制）
- 行動優先：max-width 480px、5 頁底部導航

## 13. 完成一組 → 休息計時（不可破壞）

- T3 架構升級：RestTimer 改為 Workout 頁底部 sticky 內嵌卡片（dock）；離開頁面顯示全局 `MiniTimerBar`
- `restTimerStore`（不 persist）：timestamp-based 純 UI 狀態；全局 ticker 100ms 在 App.tsx
- `timerFeedback.ts`：完成反饋（音效＋震動）邏輯模組化，使 store 在計時完成時也能觸發
- 像素與行為皆不變：auto-start / ±15s / 暫停 / 音效 / 震動 / 最後 3 秒預熱零變化
- `RestTimer` 顏色讀 `REST_TIMER_THEME.buttonFg`（原硬編碼 `#FFF` / `#0A0A0B`）
- 任何修改不得改變此體驗

## 14. PR 兩層慶祝（T4 / L5）

- **即時微慶祝**：`ExerciseSetList` 偵測破 PR → set 行 `animate-confetti` CSS 動畫（1.5s 非阻斷）
- **總結慶祝**：`WorkoutSummary` 新紀錄卡（old → new 對比；weighted 看 1RM，bodyweight 看 reps）
- **telemetry**：`pr_celebrated` 在 `settleAll` 第 5 節統一 log（不經 UI 層）
- `getSessionPRs` 分兩路：weighted（estimated1RM）vs bodyweight（repPR，key 加 `-bw` 後綴）

## 15. 週報（T5）

- `computeWeeklyReport`（`features/stats/weeklyReport.ts`）：純函數，全派生不 persist
- `profileStore.weeklyReportSeenWeek`（v4）：記錄「是否顯示過」防重複彈窗（唯一 persist 的事實）
- 自動觸發：App.tsx mount 時檢查 `weeklyReportSeenWeek !== currentWeek` 且上週有 session → 彈出上週報告
- `WeeklyReportModal`：bottom sheet；內建歷週導覽（‹ ›）；Progress 頁有「歷週訓練報告」入口
- Partner 文案規則：休息週不羞辱（「這週休息也很好，下週繼續。」）

## 16. 月曆（T6）

- `TrainingCalendar`（`components/progress/TrainingCalendar.tsx`）：月曆網格；訓練日 accent 點；今天 ring
- 點擊某天 → bottom sheet 顯示：planSnapshot.dayName / 「歷史記錄」（imported）/ 「自由訓練」（null）+ 動作 chips + 總噸數 + PR 數
- `WorkoutSession.planSnapshot`：startSession 時寫入 `{ planId, dayId, dayName }`；舊 session migrate 補 null
- Progress 頁月份切換（‹ ›）；不 persist calendar state（每次進頁預設當月）

## 17. 回饋整合 v2（T7–T9）

### 17.1 計畫編輯器重構＋器械檔案（T7）

- **PlanDetail local draft**（T7-1）：受控輸入改 local draft state（`dayNameDrafts`/`setsDrafts`/`repsDrafts`），onChange 只寫 draft → onBlur／儲存鈕／切換日時 commit 到 plansStore，消除逐字刷新。
- **器械庫擴展**（T7-2）：`data/equipment.ts` 擴至 30 項（固定器械／自由重量／纜繩／壺鈴／彈力帶／徒手／其他）；查詢函式 `getEquipmentByCategory` / `getEquipmentTypesForIds`。
- **我的健身房器材**（T7-3）：`profileStore` v4→v5 加 `gymEquipmentIds: string[]`（partialize＋migrate 預設 `[]`）；Settings 多選 chips 按 category 分組。
- **器械過濾＋替換優先**（T7-4）：PlanDetail「新增動作」sheet 預設只顯示我的器材（toggle 可顯示全部）；替換 sheet 排序：同肌群＋我的器材優先；「我的健身房」badge。
- **一鍵產生計畫**（T7-5）：Plans 頁按鈕依匹配率選 preset → deep copy → 不在我的器材的動作：唯一同肌群候選自動替換，否則標 ⚠ 待手動。

### 17.2 身體組成追蹤（T8）

- **bodyMetricsStore v1**（T8-1）：persist key `vivix-body-metrics-v1`；`BodyMetric{id, date, weightKg?, muscleMassKg?, bodyFatPercent?, fatMassKg?, createdAt}`；add/update/delete + `getLatest`/`getSorted` selectors；migrate unknown + guard。
- **Progress 身體組成 section**（T8-2）：表單 modal（日期預設今天、4 欄選填 ≥1）；Recharts LineChart 雙 Y 軸（左 kg：體重/肌肉/脂肪量；右 %：體脂）；delta tile（最新 vs 最早）；Progress 頂部入口卡。
- T8-3（Dashboard chip）SKIP。

### 17.3 歷史追蹤直接補錄（T9）

- **DaySessionEditor**（T9-1）：`components/progress/DaySessionEditor.tsx`；本地 draft（`ExerciseLog[]`）；動作選擇 picker（allExercises 含自訂、預設我的器材過濾）；每動作組數行 weight/reps 增減 + 增減組；儲存時所有組 `completed=true`；取消零寫入。TrainingCalendar 空過去日格子可點擊開 editor（補錄模式）；日 sheet 加「編輯這天訓練」按鈕（跨輯模式預填）。
- **past-session store actions**（T9-2）：`addPastSession(date, exerciseLogs)` / `updatePastSession(sessionId, patch)` / `deletePastSession(sessionId)`。`planSnapshot = null`（月曆顯示「自由訓練」）；`imported = false`（手動補錄非匯入）；sessions 保持日期排序；personalRecords 由底部 subscribe 自動重算。**L3：store 內不 settle，由呼叫端走 settleAll**。
- **結算同步**（T9-3）：TrainingCalendar 於儲存／刪除後執行 `settleAll(undefined, { silent: true })` + toast「已同步：連續 X 天」。`getStreakDays`／週報／成就皆反映；刪除 → 派生視圖回退但已 unlocked 成就仍在（D2）。
- T9-4（ImportHistoryModal 統一寫入路徑）SKIP。

## 18. Progress 頁 IA（子分頁結構，v3.0）

Progress 頁面單一滾動過長，改為 4 個子分頁（segmented control），每頁頂層 section ≤ 5。

```
Progress（PageShell title = 進度追蹤）
└─ segmented control（sticky top-0 z-20，bg-bg-primary border-b）
   ├─ 總覽 overview
   │   1. TrainingCalendar（月曆，月份 ‹ › 切換）
   │   2. 歷週訓練報告入口
   │   3. 累積數據 StatTile（3 欄：訓練次數 / 總噸數 / 連續天數）
   │   4. 累積總熱量卡（力量推估 + 有氧，±15–20% 免責小字）
   │   5. 有氧 vs 力量 時間占比 donut
   ├─ 力量 strength
   │   1. 檢視範圍 chips（全局 / 各肌群）
   │   2. 部位摘要卡片（選定部位時）
   │   3. 個人紀錄 PR 列表
   │   4. 重量曲線 LineChart（全局：選動作；部位：平均 1RM）
   │   5. 訓練量 BarChart（8 週）+ 部位體積比較（全局）
   ├─ 有氧 cardio
   │   1. 每週有氧分鐘 BarChart（近 8 週，本週 bar = auxiliary，badge「本週累計 X 分」）
   │   2. 有氧紀錄 list + 新增按鈕
   └─ 身體 body
       1. 身體組成（entry 摘要 + delta tiles + 雙 Y 軸 LineChart + 紀錄 list）
```

**去重規則**：
- donut 只出現在總覽；有氧紀錄 list 只出現在有氧頁；累積總熱量只出現一次（總覽）。
- 檢視範圍 chips 只影響力量頁的 PR / 曲線 / 訓練量。

**Chart 統一參數**（src/pages/Progress.tsx 頂部常數）：

```ts
const CHART_MARGIN = { top: 8, right: 8, bottom: 0, left: 4 };
const Y_AXIS_PROPS = { stroke: 'var(--text-secondary)', tick: { fontSize: 10 }, tickLine: false, axisLine: false, width: 36, tickMargin: 4 };
// ResponsiveContainer 固定高度：bar 220px / line 220px / donut 200px
```

## 19. Global Shell 排版律（v3.0）

- **PageShell header**：`sticky top-0 z-30 bg-bg-primary border-b border-border/40`；不透明，無 backdrop-blur。
- **底部留白**：`main` 加 `pb-32`（含 safe-area），確保最後一卡完整可見於浮動 BottomNav 之上。
- **統一節奏**：section 間 `space-y-6`；SectionHeader `mb-3`；Card `p-4`。
- 頁面容器底部預留浮動 nav 空間，禁止內容被 BottomNav 遮擋。
