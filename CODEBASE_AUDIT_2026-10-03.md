# Vivix 代碼庫全面審計報告

> 審計日期：2026-10-03
> 審計範圍：`src/` 全部 46 個 `.ts` + 45 個 `.tsx`（含 `src/store`、`src/features/**`、`src/pages`、`src/components`）
> 審計基準：ARCHITECTURE.md / DEV_RULES.md（L0–L5）/ DATA_FLOW.md / REGRESSION_CHECKLIST.md
> 結論：**架構與守門律高度符合，Stage 0 Beta 就緒。發現 2 個實質程式問題、4 處 L1 白名單偏差、13 處文件漂移。**

---

## 1. 專案架構總覽

### 1.1 分層圖（實際狀態）

```
┌──────────────────────────────────────────────────────────────┐
│ Pages（src/pages, 11 檔）                                     │
│ Dashboard Workout WorkoutSummary Progress Achievements       │
│ Plans PlanDetail Exercises ExerciseDetail Onboarding Settings│
│ （Achievements.tsx = 1 行 re-export shim → features 版）      │
└──────────────┬───────────────────────────────────────────────┘
               │ read-only hooks
┌──────────────▼───────────────────────────────────────────────┐
│ Components（src/components 12 + features/*/components 12）    │
│ layout: PageShell BottomNav MiniTimerBar                     │
│ ui: Button Card                                              │
│ progress: TrainingCalendar DaySessionEditor                  │
│ workout: ExerciseSetList RestTimer RecoveryModal             │
│ root: ImportHistoryModal RecognitionModal WeeklyReportModal  │
│       TrialLock FeedbackModal CustomExerciseForm             │
└──────────────┬───────────────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────────────┐
│ 權威模組層（features/stats, features/exercises, utils, data） │
│ taxonomy.ts(分類) selectors.ts(統計) settleAll.ts(L3)        │
│ energy.ts(熱量) weeklyReport.ts(週報) metTable.ts(MET)       │
│ utils/time.ts utils/format.ts data/theme.ts                  │
└──────────────┬───────────────────────────────────────────────┘
               │ getState / actions
┌──────────────▼───────────────────────────────────────────────┐
│ Store 層（13 個，Zustand）                                    │
│ src/store: workout profile trial achievements cardio         │
│            bodyMetrics restTimer plans equipmentMemory theme │
│ features/partner/stores: partner quest telemetry featureFlags│
└──────────────┬───────────────────────────────────────────────┘
               │ persist (localStorage)
┌──────────────▼───────────────────────────────────────────────┐
│ 事實層（原始事實＋永久決定）                                  │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Store 總表（13 個）

| Store | 檔案 | persist key | version | 持久化欄位 | 排除（衍生） | migrate 邏輯 |
|---|---|---|---|---|---|---|
| **workoutStore** | `src/store/workoutStore.ts` | `ironpulse-workouts` | **11** | sessions, customExercises, activePlanId, nextDayIndex, taxonomyVersion, **activeSession** | personalRecords | v5 custom→v2 強制分類；v8 補 startedAt/finishedAt=null；v9 補 planSnapshot=null；v10 date→本地正午 ISO；v11 補 activeSession（缺 lastActivityAt→取 startedAt） |
| **profileStore** | `src/store/profileStore.ts` | `ironpulse-profile` | **5** | profile, onboardingCompleted, goal, weeklyReportSeenWeek, gymEquipmentIds | — | bodyWeight===75→null；補 experienceLevel='beginner'；補 weeklyReportSeenWeek=null；補 gymEquipmentIds=[] |
| **trialStore** | `src/store/trialStore.ts` | `ironpulse-trial` | **6** | 全 state（**無 partialize**） | — | 舊 5 階段(2/4/8/15/31/永久)等價映射至 4 階段(1/7/30/永久)；devMode 強制 false |
| **achievementsStore** | `src/store/achievementsStore.ts` | `ironpulse-achievements` | **4** | progress[id].unlockedAt, seenUnlockIds, pendingUnlockIds | lastMetrics, current | merge unlockedAt；保留已下架 id 的 unlockedAt；current 重設 0 |
| **cardioStore** | `src/store/cardioStore.ts` | `vivix-cardio-v1` | **1** | sessions（全事實：id/date/machine/durationMin/kcal/avgHr/distanceKm/createdAt） | — | unknown+guard；machine 白名單；durationMin>0 否則丟棄 |
| **bodyMetricsStore** | `src/store/bodyMetricsStore.ts` | `vivix-body-metrics-v1` | **1** | metrics（全事實） | — | unknown+guard；4 數值欄位 typeof number guard |
| **restTimerStore** | `src/store/restTimerStore.ts` | **（不 persist）** | — | 純 UI 狀態 | 全部 | — |
| **plansStore** | `src/store/plansStore.ts` | `vivix-plans-store-v1` | **1** | customPlans（**無 partialize**） | — | migratePlanToV2 |
| **partnerStore** | `src/features/partner/stores/partnerStore.ts` | `vivix-partner-store-v1` | **2** | species,name,xp,currentFormId,unlockedFormIds,cosmetics,titles,createdAt | level, totalWorkouts, totalTrainingDays | 剝除舊衍生欄位；只回傳白名單欄位 |
| **questStore** | `src/features/partner/stores/questStore.ts` | `vivix-quest-store-v1` | **2** | progress(claimed/completedAt) | current | 剝除 current（live 重算） |
| **telemetryStore** | `src/features/partner/stores/telemetryStore.ts` | `vivix-telemetry-store-v1` | **2** | events, enabled（**無 partialize**） | — | 欄位校驗 |
| **equipmentMemoryStore** | `src/store/equipmentMemoryStore.ts` | **（不 persist）** | — | 派生（無 persist wrapper） | memories | — |
| **themeStore** | `src/store/themeStore.ts` | `ironpulse-theme`（手動 localStorage） | — | theme | — | — |
| **featureFlags** | `src/features/partner/stores/featureFlags.ts` | `vivix-feature-flags-v1` | **2** | partnerEnabled（**無 partialize**） | — | 合併預設 |

> **核心 actions 對照**：workoutStore 含 `startSession/startEmptySession/addExerciseToActive/substituteExerciseInActive/updateSet/addSet/removeSet/toggleSetCompleted/removeExercise/finishSession(clearActiveSession)/importSessionsBatch/deleteSession/addPastSession/updatePastSession/deletePastSession` + 8 個統計薄 delegate；profileStore 含 `updateProfile/completeOnboarding/markWeeklyReportSeen/toggleGymEquipment/setGymEquipmentIds/resetAllData`；cardioStore `addCardio/deleteCardio`；bodyMetricsStore `addMetric/updateMetric/deleteMetric/getLatest/getSorted`。

### 1.3 Pages 職責

| Page | 職責 |
|---|---|
| `Dashboard.tsx` | 主控台：今日訓練卡、累積數據、Partner 卡、top PR、有氧入口；mount 時 `settleTaxonomyChange()` 冪等安全網 |
| `Workout.tsx` | 訓練進行頁：動作/組數編輯、替換動作、交通燈（最小化/放棄）、dock 休息計時、F2 elapsed（`startedAt`）、F3 完成時 cancel timer |
| `WorkoutSummary.tsx` | 完成總結：settleAll(rewardCtx) 唯一入口、新紀錄卡（T4）、熱量卡（E-D2 鎖定）、Partner 升級、GCal 匯出 |
| `Progress.tsx` | 4 子分頁（總覽/力量/有氧/身體）：月曆、歷週報告入口、總熱量、donut、PR 列表、重量/reps 曲線（T12）、8 週體積、有氧 bar、身體組成雙 Y 軸 |
| `Achievements.tsx` | 1 行 re-export → `features/achievements/AchievementsPage`（mount 時 `settleTaxonomyChange()`） |
| `Plans.tsx` | 計畫庫列表 + 一鍵產生計畫（T7-5 依器材匹配） |
| `PlanDetail.tsx` | 計畫編輯器（T7-1 local draft 消閃爍）、動作新增/替換 sheet |
| `Exercises.tsx` | 動作庫（內建+自訂）、新增/編輯/刪除自訂動作 → `settleTaxonomyChange()` |
| `ExerciseDetail.tsx` | 單一動作詳情 |
| `Onboarding.tsx` | 雙 lane 引導（Lane A 5×5 / Lane B 經驗+匯入 wizard） |
| `Settings.tsx` | 我的健身房器材（T7-3）、資料管理（匯入入口 I-2/E13）、主題、試用、重置 |

### 1.4 Feature 模組

| 模組 | 用途 |
|---|---|
| `features/stats/` | `selectors.ts` 統計權威、`settleAll.ts` 跨 store 編排（L3）、`energy.ts` 熱量、`weeklyReport.ts` 週報 |
| `features/exercises/taxonomy.ts` | 分類權威（resolveCurrentTaxonomy / resolveExerciseSnapshot / findExerciseById / getAllExercisesWith） |
| `features/achievements/` | 成就頁 + 6 組件（Badge/Grid/DetailSheet/CelebrationModal/NextAchievementCard/StrengthLadder/TimelineView/TrackTabs）+ `engine/nextAchievement.ts` |
| `features/partner/` | Partner 系統：6 組件、`data/`（cosmetics/forms/names/quests）、`engine/`（level/rewardEngine）、4 store（partner/quest/telemetry/featureFlags）、`types.ts` |

---

## 2. 資料流矩陣（feature → store → component）

| 流程 | 觸發點 | Store / Action | 派生模組 | Component |
|---|---|---|---|---|
| **訓練完成** | Workout `handleFinish` | `restTimer.cancel()` → `workoutStore.finishSession()` → `restTimer.cancel()` | WorkoutSummary mount → `settleAll(rewardCtx)` → achievements/partner/quest/telemetry | `WorkoutSummary`, `ExerciseSetList`(confetti), `PartnerLevelUpModal` |
| **歷史補錄** | `TrainingCalendar` 空過去日 / 日 sheet「編輯」 | `DaySessionEditor` → `addPastSession` / `updatePastSession` / `deletePastSession`（store 內**不** settle） | 呼叫端 `TrainingCalendar` → `settleAll(undefined,{silent:true})` + toast | `TrainingCalendar`, `DaySessionEditor` |
| **身體指標** | Progress 身體分頁「新增」 | `bodyMetricsStore.addMetric/deleteMetric` | Progress 內 `bodyChartData`/`bodyDelta` 派生 | `BodyMetricAddForm`（Progress 內嵌）, Recharts 雙 Y 軸 LineChart |
| **週報觸發** | `App.tsx` mount | `profileStore.weeklyReportSeenWeek` + `markWeeklyReportSeen` | `computeWeeklyReport`（純函數） | `WeeklyReportModal`（App 級 + Progress 入口） |
| **計畫執行** | Plans/PlanDetail → Dashboard 開始訓練 | `workoutStore.setActivePlan` → `startSession(planId,day)` 寫 `planSnapshot` | Workout 頁讀 `activeSession` | `Workout`, `RestTimer`(dock), `MiniTimerBar` |
| **休息計時** | `ExerciseSetList` 完成一組 | `restTimerStore.start()`（不 persist，timestamp-based） | `timerFeedback.ts`（音效/震動） | `RestTimer`(dock card) / `MiniTimerBar`(全局) |
| **有氧新增/刪除** | Dashboard/Progress | `cardioStore.addCardio/deleteCardio` → `settleAll()`（store 內直接呼叫，L3 例外） | streak union / cardio metrics / E-D4 XP | Progress 有氧分頁 |
| **匯入批次** | Settings / Onboarding wizard | `workoutStore.importSessionsBatch`（單次 set） | `settleAll(undefined,{silent:true,skipPartner:true})` | `ImportHistoryModal`(3 步) → `RecognitionModal` |
| **分類回寫** | Exercises 編輯/刪除自訂動作 | `editCustomExercise`/`deleteCustomExercise`（bump taxonomyVersion） | subscribe → `computePRsFromSessions`；呼叫端 `settleTaxonomyChange()` | PR 列表/圓餅/曲線/體積/成就即時遷移 |
| **PR 兩層慶祝** | set 完成 / finish | 即時：純 UI；總結：`settleAll` 第 5 節 log `pr_celebrated` | `getSessionPRs` 分 weighted/bodyweight 兩路 | `ExerciseSetList`(`animate-confetti`), `WorkoutSummary` |

**settleAll / settleTaxonomyChange / settleOnLoad 實際呼叫點（11 處）**：

| 檔案 | 行 | 呼叫 |
|---|---|---|
| `src/App.tsx` | 146 | `settleOnLoad()` |
| `src/pages/WorkoutSummary.tsx` | 57 | `settleAll({rewardCtx})` |
| `src/pages/Dashboard.tsx` | 92 | `settleTaxonomyChange()` |
| `src/pages/Exercises.tsx` | 219, 259 | `settleTaxonomyChange()` |
| `src/features/achievements/AchievementsPage.tsx` | 68 | `settleTaxonomyChange()` |
| `src/components/progress/TrainingCalendar.tsx` | 104, 113 | `settleAll(undefined,{silent:true})` |
| `src/components/ImportHistoryModal.tsx` | 301 | `settleAll(undefined,{silent:true,skipPartner:true})` |
| `src/store/cardioStore.ts` | 62, 74 | `settleAll()`（add/delete） |

---

## 3. 功能完整度清單

### T1–T6（用戶回饋整合 v1）

| 項 | 狀態 | 證據 |
|---|---|---|
| T1 試用 4 階段（trialStore v6） | ✅ | `STANDARD_STAGES` = 4 項（1/7/30/永久）；stage 0 免碼；version 6 |
| T2 0kg + 次數 PR + planSnapshot | ✅ | `PersonalRecord.repPR?`；`getSessionPRs` 兩路；`startSession` 寫 `planSnapshot`；`min=0` |
| T3 計時器架構（restTimerStore + dock + mini bar） | ✅ | `restTimerStore` 不 persist / timestamp-based；`RestTimer`(dock) + `MiniTimerBar` |
| T4 破 PR 兩層慶祝 | ✅ | `ExerciseSetList` `animate-confetti`（index.css 1.5s）；`WorkoutSummary` 新紀錄卡；telemetry 在 settleAll 第 5 節 |
| T5 週報 | ✅ | `weeklyReport.ts` 純函數；`profileStore.weeklyReportSeenWeek`；App mount 觸發；`WeeklyReportModal` 歷週導覽 |
| T6 月曆 | ✅ | `TrainingCalendar`；dayKey 歸一化；sheet 顯示 planSnapshot/歷史記錄/自由訓練 + 縮寫 |

### T7–T9（v2）

| 項 | 狀態 | 證據 |
|---|---|---|
| T7 計畫編輯器重構 | ✅ | PlanDetail `dayNameDrafts/setsDrafts/repsDrafts` + onBlur commit；`data/equipment.ts` 31 項；`gymEquipmentIds` |
| T8 身體組成追蹤 | ✅ | `bodyMetricsStore` v1；Progress 雙 Y 軸 LineChart + delta tiles |
| T9 歷史補錄 | ✅ | `DaySessionEditor`（local draft/取消零寫入/completed=true）；`addPastSession/updatePastSession/deletePastSession`；呼叫端 settleAll+toast |

### T11–T17（v3）

| 項 | 狀態 | 證據 |
|---|---|---|
| T11 Google Calendar 單向匯出 | ✅ | `utils/googleCalendar.ts`（`buildSessionGCalUrl`）；Summary + TrainingCalendar 入口；`window.open(...,'noopener')` |
| T12 BW 動作 reps 曲線 | ✅ | Progress `curveMode: 'auto'\|'weight'\|'reps'` |
| T13 MiniTimerBar 懸空縫修復 | ✅ | `isNoNavRoute` → `bottom-4` |
| T14 非空斷言清零 | ✅ | `grep -rnE "\w!\." src/` = 0 |
| T15 session.date 寫時歸一化 | ✅ | v10 migrate `${dayKey}T12:00:00`；`localNoonISO` |
| T16 統計搬遷 selectors.ts | ⚠️ | 已完成主體：`computePRsFromSessions/getGroupStats/getWeeklyVolume/getExerciseProgress/...` 皆在 selectors，workoutStore 為薄 delegate。**殘留**：`getLastSetsForExercise` 仍為 store 內 inline 實作 |
| T17 計畫庫擴充 | ✅ | `data/plans.ts` 含 `full-body-3`、`upper-lower-4`（連同 5x5-strength/push-pull-legs/upper-lower 共 5 preset） |

### F1–F4（v4）

| 項 | 狀態 | 證據 |
|---|---|---|
| F1 移除 Dashboard 快速開始 | ✅ | Dashboard 無「快速開始/選擇計畫/自由訓練」；入口保留於今日訓練卡 + Progress 有氧 |
| F2 頂欄 elapsed 修復 | ✅ | Workout 以 `activeSession.startedAt` 計算；`formatElapsed` clamp ≥0 |
| F3 完成訓練取消休息計時 | ✅ | `handleFinish` 前後 `restTimerStore.cancel()`；MiniTimerBar 條件 `activeSession!==null && !onWorkout`；stale 由 effect cancel |
| F4 未完成訓練回收 | ✅ | workoutStore v11 persist `activeSession`+`lastActivityAt`；`RecoveryModal` 三選；`finishSession(finishedAt?)` |

> **整體**：T1–T17 + F1–F4 **全部已實作且可運作**（T16 僅殘留 1 個 inline 函數）。無 ❌ 項。

---

## 4. 守門檢查結果（grep 摘要）

| 檢查 | 指令 | 期望 | 實測 | 結果 |
|---|---|---|---|---|
| `as any` | `grep -rn "as any" src/` | 0 | 0 | ✅ |
| hex 於 components | `grep -rnE "#[0-9a-fA-F]{6}" src/components/` | 0 | 0 | ✅ |
| 非空斷言 `!.` | `grep -rnE "\w!\." src/` | 0 | 0 | ✅ |
| 時間常數 | `grep -rn "86400000" src/` | 僅 `utils/time.ts` | 僅 `utils/time.ts:6` | ✅ |
| `toLocaleDateString` | `grep -rn "toLocaleDateString" src/` | pages/components = 0 | 僅 `utils/format.ts:23` 註釋 | ✅ |
| hex 於 pages | `grep -rnE "#[0-9a-fA-F]{3,8}" src/pages/` | 0 | 僅 Dashboard 註釋 `#185` | ✅ |
| 死 export | `grep -rnE "STANDARDS_META\|TIER_STYLES\|groupAchievementsByCategory\|getNextAchievement" src/` | 0 | 0 | ✅ |
| 無消費端 flag | `grep -rnE "partnerQuestsEnabled\|warmupEnabled\|telemetryEnabled\|debugPanelEnabled" src/` | 0 | 0 | ✅ |
| nanoid（禁） | `grep -rn "nanoid" src/` | 0 | 0 | ✅ |
| TODO/FIXME | `grep -rnE "TODO\|FIXME\|XXX\|HACK" src/` | 0 | 0 | ✅ |
| TypeScript | `npx tsc --noEmit` | 0 errors | **EXIT=0，0 errors** | ✅ |

**額外 L1 守門**：
- `grep -rnE "kcal|Kcal" src/store/` → **僅 `cardioStore.ts`**（`CardioSession.kcal` 事實欄位）✅
- `partialize` 存在於 7 個 store；**4 個 store 缺 partialize**（trialStore / telemetryStore / plansStore / featureFlags）⚠️（見 §6）

---

## 5. 文件同步狀態（不一致清單）

| # | 文件 | 文件內容 | 實際代碼 | 嚴重度 |
|---|---|---|---|---|
| 1 | `ARCHITECTURE.md` §7 | workoutStore **v8**、profileStore **v2** | workoutStore **v11**、profileStore **v5** | 中（表格整表過期） |
| 2 | `ARCHITECTURE.md` §10 / `REGRESSION_CHECKLIST.md` §2.4 | trial persist key `vivix-trial-*` | 實際 `ironpulse-trial` | 中（key 描述錯誤，易誤導 L1 守門） |
| 3 | `ARCHITECTURE.md` §3 + §3 selectors 表 / `DEV_RULES.md` L2 現況註記 / Backlog **B-01** | PR／groupStats 仍為 workoutStore 單一函數、待遷移 | **T16 已完成**，實作在 `features/stats/selectors.ts`，store 僅薄 delegate | 中（backlog 已完成卻仍列為待辦） |
| 4 | `ARCHITECTURE.md` §5「觸發點**僅四處**」/ `DEV_RULES.md` L3「觸發點**僅三處**」 | 3–4 個觸發點 | 實際 **11 處**（含 cardio add/delete、Dashboard/Exercises/AchievementsPage mount、ImportHistoryModal） | 中（規則描述與現況脫節） |
| 5 | `DEV_RULES.md`「試用階段」/ `REGRESSION_CHECKLIST.md` §2.4、§13.4 / `README.md` | 「**5 階段**漸進解鎖：2→4→8→15→31→永久」 | trialStore v6 = **4 階段**（1/7/30/永久），T1 已改 | 高（與 T1 直接矛盾） |
| 6 | `REGRESSION_CHECKLIST.md` §1.2 | 「當前：**16** precache entries」 | `AUDIT_REPORT.md` 記 36；需以 build 實測為準 | 低（兩文件互相矛盾） |
| 7 | `AUDIT_REPORT.md`（09-15） | workoutStore **v10** | 實際 **v11**（F4 新增） | 低（該報告已過期） |
| 8 | `ARCHITECTURE.md` §17.1 | `data/equipment.ts` 擴至 **30** 項 | 實際 **31** 項 | 低 |
| 9 | `ARCHITECTURE.md` §1「Phase C」/`DATA_FLOW.md` 標題 | 標題仍寫 Phase C / Phase B v2.1 | 代碼已至 v3.0/v4（T1–T17+F1–F4） | 低（版本標籤滯後） |
| 10 | `ARCHITECTURE.md` §5「觸發點僅四處」與 §2「頁面進入…為冪等安全網」 | 安全網只提 Dashboard/AchievementsPage | 實際 **Exercises.tsx 亦有** 2 處 | 低 |
| 11 | `DEV_RULES.md` L1 表 | `equipmentMemoryStore v2`（persist） | 實際**完全無 persist wrapper**（純派生） | 低（語義仍正確） |
| 12 | `ARCHITECTURE.md` §2 / §3 | `settleAll` 列於 Store 層下方註記 | 位於 `features/stats/`（非 store） | 低（可接受） |
| 13 | `REGRESSION_CHECKLIST.md` §15.1 | `trialStore` STAGES 長度 = 4 ✓（與 §2.4 自相矛盾） | 正確 | 低（同一文件內不一致） |

> **總結**：DEV_RULES 的 L0–L5 律本身與代碼一致；主要漂移集中在**版本號表格、試用階段數、B-01 backlog 狀態、settleAll 觸發點計數、trial persist key**。

---

## 6. 已知問題與技術債

### 6.1 實質程式問題（建議修）

**P1 — `hasCustomPlans` 硬編碼 false，`explorer` 成就永不觸發**
- 位置：`src/features/stats/settleAll.ts:56`
- 代碼：`hasCustomPlans: false, // T-05 尚未實作 custom plans`
- 事實：`plansStore` v1 早已實作（Plans/PlanDetail），用戶可建立自訂計畫。
- 影響：`computeMetrics` 的 `explorer = hasCustomExercises || hasCustomPlans ? 1 : 0`，自訂計畫永遠不計；註釋過期。
- 建議：改為 `usePlansStore.getState().customPlans.length > 0`（注意勿造成循環 import；可在 settleAll 內讀取）。

**P2 — 有氧每日 XP 上限（E-D4）跨重整失效**
- 位置：`src/features/stats/settleAll.ts:65,74,79`
- 代碼：`let inMemCardioGrantedDay: string | null = null;`（模組級，**不 persist**）
- 影響：`settleOnLoad()` → `settleAll(undefined,{silent:true})` 會再次執行 `settleCardioDailyXp()`；只要當日有 cardio session，每次頁面重整即再發 20 XP → 「每日上限 1 次」被繞過。
- 建議：將 `cardioXpGrantedDay` 落為 partnerStore 的 persist 欄位（永久決定），或在 settleAll 內以 sessions/telemetry 派生判斷。

### 6.2 L1 白名單偏差（低風險）

**P3 — 4 個 persist store 缺明確 `partialize`**
- `trialStore`、`telemetryStore`、`plansStore`、`featureFlags` 未列 `partialize`，違反 DEV_RULES L1 規則 2「禁止 `...state` 全存」。
- 實務風險低（Zustand persist 以 JSON 序列化，函數不會被存），但白名單不明確，未來新增衍生欄位易誤 persist。
- 建議：補顯式 `partialize` 列舉欄位。

### 6.3 效能 / 邊界

**P4 — equipmentMemory memo 只以 sessions ref 為 key**
- 位置：`src/store/equipmentMemoryStore.ts:102-111`
- `computeMemoriesFromSessions` 依賴 `getAllExercises()`（含 customExercises），但 memo 僅在 `sessions` ref 變時失效。新增/編輯自訂動作（sessions 不變）時，器械記憶不會即時重算，需等到下次 session 寫入。
- 建議：memo key 加入 `taxonomyVersion` 或 customExercises ref。

**P5 — `getLastSetsForExercise` 未遷入 selectors**
- 位置：`src/store/workoutStore.ts:578-592`（inline 迴圈）
- B-01 殘留，其餘統計已遷移。建議一併移入 `selectors.ts`。

### 6.4 死碼 / 註釋

- **無 TODO/FIXME/XXX/HACK**（grep = 0）。
- **無死 export**（grep = 0）。
- `src/pages/Achievements.tsx` 為 1 行 re-export shim（設計如此，非死碼）。
- 過期註釋：`settleAll.ts:56`（T-05 未實作）、`settleAll.ts:14-18`（觸發點僅三處）、`DEV_RULES.md` B-01。
- `Achievements.tsx`、`ARCHITECTURE.md` §1 標題「Phase C」等版本標籤滯後。

### 6.5 效能瓶頸評估

- 統計全為 O(n·sets) 純函數派生，Beta 規模（<數千 session）無瓶頸。
- `equipmentMemoryStore` 有 memo，良好。
- `telemetryStore` MAX_EVENTS=1000 + splice 截尾，OK。
- 長列表（Exercises/Progress）**無虛擬化**；資料量大時可考慮，目前非阻塞。

---

## 7. 建議下一步（優先級排序）

| 優先 | 項目 | 類型 | 說明 |
|---|---|---|---|
| **P0** | 修 P2：cardio 每日 XP 落 persist | Bug | 現有每日上限可被重整繞過，影響 Partner 經濟 |
| **P0** | 修 P1：`hasCustomPlans` 接 plansStore | Bug | explorer 成就無法由自訂計畫觸發 |
| **P1** | 校正文件漂移 §5 清單（尤其 #1 #2 #3 #5） | 文件 | 版本表、trial key、B-01 狀態、4 階段試用；避免下輪審計誤判 |
| **P1** | 統一 `settleAll` 觸發點描述（DEV_RULES L3 / ARCHITECTURE §5） | 文件 | 由 3–4 處更新為 11 處，並明列 cardio/import/page-mount 例外 |
| **P2** | 補 4 個 store 的 `partialize`（P3） | 衛生 | 對齊 L1 規則 2 |
| **P2** | memo key 加 taxonomyVersion（P4） | 效能/正確性 | 自訂動作變更即時反映 |
| **P2** | 遷移 `getLastSetsForExercise` 至 selectors（P5） | 重構 | 收尾 B-01 |
| **P3** | 清理過期註釋與 Phase 標籤 | 衛生 | settleAll/ARCHITECTURE/DEV_RULES 版本標籤 |
| **P3** | 實測 build 校準 precache entries 數字 | 文件 | 統一 §1.2 與 AUDIT_REPORT 的 16/36 矛盾 |

---

## 附錄：審計方法

- 逐一完整讀取 13 個 store 的 `migrate` / `partialize` / 狀態欄位 / actions。
- 完整讀取權威模組（selectors/settleAll/weeklyReport/energy）與 11 個關鍵組件/頁面。
- 執行守門矩陣 grep（含 macOS BSD grep 相容寫法）+ `npx tsc --noEmit`（EXIT=0）。
- 交叉比對 4 份文件（ARCHITECTURE / DEV_RULES / DATA_FLOW / REGRESSION_CHECKLIST）與代碼。
