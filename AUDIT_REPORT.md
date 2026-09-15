# Vivix 全專案總審報告（T18）

> 審計日期：2026-09-15
> 審計範圍：T11–T17 完成後的全專案
> 結論：**Stage 0 Beta 就緒 — 架構驗證通過**

---

## Pass 1：守門律（L1–L5）

| 律 | 檢查項 | grep / 驗證 | 結果 |
|----|--------|-------------|------|
| L1 持久化 | partialize 存在 | `grep -rn "partialize" src/store/` | 5 store 全有 ✓ |
| L1 持久化 | persist key 不變 | `grep "name:" src/store/*.ts` | ironpulse-*/vivix-* 全不變 ✓ |
| L1 持久化 | 熱量不 persist | `grep -rn "kcal" src/store/` | 僅 cardioStore CardioSession.kcal（事實欄位）✓ |
| L2 派生 | 統計在 selectors | `workoutStore` 內無統計迴圈 | 全 delegate ✓ |
| L2 派生 | PR 由 subscribe 派生 | `computePRsFromSessions` 在 selectors | ✓ |
| L3 編排 | settleAll 觸發點 | `grep -rn "settleAll" src/` | App.tsx/TrainingCalendar/AchievementsPage ✓ |
| L4 遷移 | versioned migrate | workoutStore v10 + migrate | ✓ |
| L4 遷移 | unknown type guard | migrate 內 `typeof` guard | ✓ |
| L5 慶祝 | settleAll silent | imported session `{ silent: true, skipPartner: true }` | ✓ |
| 守門 | tsc 0 | `npx tsc --noEmit` | 0 errors ✓ |
| 守門 | build | `npm run build` | 成功，precache 36 entries ✓ |
| 守門 | as any | `grep -rn "as any" src` | 0 ✓ |
| 守門 | 非空斷言 | `grep -rnE "(^|[^!])!([.,;:)\]]|$)" src` | 0（僅 "LEVEL UP!" false positive）✓ |
| 守門 | hex gate | `grep "#[0-9A-Fa-f]{3,8}" src/components src/pages` | 0（僅註釋 #185）✓ |

**Store 版本白名單**：

| Store | persist key | version | 狀態 |
|-------|-------------|---------|------|
| workoutStore | ironpulse-workouts | 10 | T15 v10 date 歸一化 ✓ |
| profileStore | ironpulse-profile | 5 | gymEquipmentIds ✓ |
| trialStore | ironpulse-trial | 6 | 續用碼保留 ✓ |
| achievementsStore | ironpulse-achievements | 4 | ✓ |
| cardioStore | vivix-cardio-v1 | 1 | ✓ |
| bodyMetricsStore | vivix-body-metrics-v1 | 1 | ✓ |
| plansStore | vivix-plans-store-v1 | 1 | ✓ |

---

## Pass 2：用戶流走查

| 流程 | 步驟 | 狀態 |
|------|------|------|
| Onboarding 雙 lane | experience 選擇 → 不同流程 | ✓ |
| 訓練迴圈 | dock 計時 + mini bar 兩種底位 | T13 修復 noNav 路由 bottom-4 ✓ |
| Summary | 含 GCal 匯出按鈕（T11） | ✓ |
| 月曆補錄 | DaySessionEditor → settleAll silent + toast | ✓ |
| 月曆編輯 | openEditorForEdit → onSaved | ✓ |
| 月曆刪除 | deletePastSession → settleAll | ✓ |
| 匯入（矩陣/CSV） | ImportHistoryModal 3 步精靈 | T14 非空斷言清零 ✓ |
| 成就解鎖 | settleAll → achievementsStore | ✓ |
| D2 永久解鎖 | unlockedAt 永久保存 | ✓ |
| Partner XP/形態 | settleAll → partnerStore | ✓ |
| 試用 4 階段 | trialStore v6 碼 | ✓ |
| 週報觸發 | weeklyReport.ts | ✓ |
| 身體組成 | bodyMetricsStore + 雙 Y 軸圖 | ✓ |
| 雙主題 | Industrial Power / Elegant Beige | ✓ |
| PWA 離線 | VitePWA autoUpdate + skipWaiting | ✓ |
| GCal 匯出 | WorkoutSummary + TrainingCalendar 入口 | T11 ✓ |
| BW reps 曲線 | auto/weight/reps mode toggle | T12 ✓ |

**S0/S1 修復清單**：無。本輪 T11–T17 未引入任何 S0/S1 問題。

---

## Pass 3：migrate 鏈

| 版本 | 遷移內容 | 資料安全 |
|------|----------|----------|
| v6→v7 | CustomExercise 升級為強制分類結構 | ✓ |
| v7→v8 | 舊 session 補 startedAt/finishedAt = null | ✓ |
| v8→v9 | 舊 session 補 planSnapshot = null | ✓ |
| v9→v10 | session.date 歸一化為本地正午 ISO（無 Z） | ✓ |

**v10 migrate 驗證**：
- 舊 `new Date().toISOString()`（UTC with Z）→ `${dayKey(new Date(oldDate))}T12:00:00`
- 純日期 `YYYY-MM-DD`（cardio 類）→ 直接保留
- v10+ 已是正午格式 → 不再轉換

**T15 跨日驗證**：
- 23:50 本地訓練 → `dayKey(new Date('...T23:50...'))` → 當日 ✓
- 00:30 本地訓練 → `dayKey(new Date('...T00:30...'))` → 當日 ✓
- cardio 純日期 → `sessionDayKey` 直接回傳 ✓

---

## Pass 4：文件 vs 代碼一致性

| 文件 | 檢查項 | 狀態 |
|------|--------|------|
| DEV_RULES.md | Store 版本＝代碼版本 | workout v10 / profile v5 / trial v6 / cardio v1 / bodyMetrics v1 ✓ |
| DEV_RULES.md | G-1/J-1/D-10/B-01 決策記錄 | 已加入（T11）✓ |
| DEV_RULES.md | 排版律（header 不透明/pb-32/chart margin） | 已加入（v3.0）✓ |
| ARCHITECTURE.md | Progress IA 子分頁結構圖 | §18 已加入 ✓ |
| ARCHITECTURE.md | Global Shell 排版律 | §19 已加入 ✓ |
| ARCHITECTURE.md | 全部 store/模組 | workout/profile/trial/achievements/cardio/bodyMetrics/plans ✓ |
| REGRESSION_CHECKLIST.md | §18 排版矩陣 | 已加入 ✓ |
| REGRESSION_CHECKLIST.md | 非空斷言 pattern | 已更新為加寬 pattern（T14）✓ |

**S0/S1 修復清單**：無。

---

## Pass 5：路線對齊

| 階段 | 狀態 | 說明 |
|------|------|------|
| Stage 0 Beta | **就緒** | L1–L5 守門全過；tsc 0；build 成功；無 S0/S1 殘留 |
| Stage 1 | 規劃中 | 見 ROADMAP.md |
| Stage 2 | 規劃中 | 見 ROADMAP.md |

---

## 總結

- **S0/S1 殘留**：0
- **全 grep 守門矩陣**：綠
- **tsc**：0 errors
- **build**：成功，precache 36 entries
- **Stage 0 Beta 就緒結論**：**通過** — 架構驗證過的狀態
