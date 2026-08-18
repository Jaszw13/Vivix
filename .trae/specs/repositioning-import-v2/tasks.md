# Vivix 定位重定義＋歷史記錄匯入 v2.1 實作佇列（tasks.md，Errata E1~E15 已合併）

佇列序：Task1(R-0) → Task2(R-1 types+profile+成就) → Task2b(抽 CustomExerciseForm E14) → Task3(parse 層 csv+matrix) → Task4(ImportHistoryModal 三步) → Task5(Onboarding 雙 lane + chips 四選 E5/E7) → Task6(settleAll opts + 批次寫入 E12 + RecognitionModal E8/E11) → Task7(分離規則 R-4 E10/E15) → Task8(Telemetry) → Task9(全回歸 §14) → Task10(Review)。

---

## Task 1：R-0 文件對齊（定位措辭 + brand_line + 兩種 totalWorkouts 語義 E15）

**Priority**：high **Status**：in_progress

### 覆蓋 AC
AC-R0-1 rule · AC-R0-2 rule · AC-DOC rubric

### 工作項目
1. 跑 `grep -rn "健身新手" . --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git`。7 個已知 hit 逐個替換：
   - `.trae/documents/PRD.md:3` → `Vivix 是一款服務「記錄新手」的陪伴型訓練 App（雙 lane：第一次進健身房的訓練新手／從 Excel 或其他工具轉移的經驗記錄者），專注力量訓練前 12 週，協助你記錄訓練、追蹤進步。`
   - `index.html:42 meta description` → `Vivix — 把每一次訓練，變成看得見的進步。力量訓練記錄、進度追蹤、雙主題與 Partner 陪伴系統。`
   - `index.html:45 og:description` → `Vivix — 把每一次訓練，變成看得見的進步。`
   - `README.md:3` → 開頭 `> Vivix — 把每一次訓練，變成看得見的進步。` + 一句描述「服務「記錄新手」：雙 lane 初入健身房的訓練者，或是從 Excel／其他 App 轉移的經驗記錄者。」
   - `package.json:5 description` → `Vivix — 把每一次訓練，變成看得見的進步。`
   - `manifest-light.webmanifest:4 description` → `Vivix — 把每一次訓練，變成看得見的進步。力量訓練記錄、進度追蹤、雙主題與 Partner 陪伴系統。`
   - `manifest-dark.webmanifest:4 description` → 同上。
   - 其他：`INSTALL_IPHONE.md`／`Settings.tsx about`／`FeedbackModal.tsx` 逐檔中性化（若有「健身新手」字眼）。
2. 逐份文檔新增內容：
   - **DEV_RULES.md**：頂部插入「L0 定位律」（statement + brand_line + glossary 4 點禁用/語氣/中性稱呼/張力已解決）；緊接「決策紀錄」P-1 與 I-1…I-6。**明寫兩種 totalWorkouts 語義（E15）**：① 成就、統計、streak 用＝sessions 全計（I-3，含 imported）；② Partner 形態解鎖、XP 用＝`sessions.filter(s => s.imported !== true).length`（I-4，partnerStore.getTotalWorkouts）。
   - **ARCHITECTURE.md**：新增 §Onboarding 雙 lane（experienceLevel；Lane A STEPS 不變，E7；Lane B experienced×2 sub-path）＋§匯入管線（matrix quote-aware split E2、anchor、session imported、sessions 單次批次 set() E12、settleAll silent skipPartner、RecognitionModal per-batch E8）。
   - **DATA_FLOW.md**：新增 §匯入流（貼上 → quote-aware parse → 動作映射 → sessions imported:true 單次批次 set() → settleAll silent+skipPartner → RecognitionModal per-batch）；streak union 含 imported；Partner XP/form unlock 過濾 `!imported`；EE 排除 imported。**明寫兩種 totalWorkouts 語義（E15）**，與 DEV_RULES 一致。
   - **REGRESSION_CHECKLIST.md**：新增 §14，完整 10 勾選項（spec §10）。
   - **ACHIEVEMENT_DESIGN.md**：Lane B 認可哲學（「承認你的過去」一段）；新增成就 `import_first`：track=behavior、tier=t1、metric=sessions_imported_total、threshold≥1、copy「你的過去，從今天起有了家。第一筆歷史匯入完成。」。
   - **CALORIE_MODEL.md**：I-6 註記「imported session 跳過估算；Progress 報告附『匯入記錄不計入熱量估算』」。
   - **PROJECT_SUMMARY.md**：若存在則更新簡介、目標用戶行、核心差異、§3 張力標記已解決、Roadmap 加「匯入 v1 矩陣＋表格」。不存在跳過。

### TR
- **TR T1 rule**：`grep -rn "健身新手" src` ＝ 0。
- **TR T2 rule**：文檔層 grep（排除 node_modules/dist/.git）＝ 0。
- **TR T3 rule**：DEV_RULES.md L0 heading 存在；glossary 4 點存在；P-1/I-1..I-6 存在；兩種 totalWorkouts 語義存在（E15）。
- **TR T4 rule**：REGRESSION_CHECKLIST.md §14 有 10 勾選項（逐項比對 spec §10 內容）。
- **TR T5 rule**：ACHIEVEMENT_DESIGN.md 有 `import_first` 定義且 Lane B 哲學段落存在。
- **TR T6 rule**：tsc 0。
- **TR T7 rule**（AC-DOC 0.5）：DEV_RULES + DATA_FLOW 兩種 totalWorkouts 文字一致。

---

## Task 2：R-1 types + profileStore v3 + 成就 import_first + currentOf E4

**Priority**：high **Status**：pending **Depends**：Task1

### 覆蓋 AC
AC-R1-1 rule · AC-ACH rule · AC-QUAL rubric(no as any)

### 工作項目
1. `src/types/index.ts`：
   - `UserProfile` 追加 `experienceLevel?: 'beginner' | 'experienced';`。
   - `WorkoutSession` 追加 `imported?: boolean;`。
2. `src/store/profileStore.ts`：version `2`→`3`。migrate(persistedState: unknown)：
   - const s = (persistedState ?? {}) as Partial<ProfileState>（unknown 進 guard）。
   - const migratedProfile：舊 v2 profile 補 `experienceLevel: 'beginner'`。
   - 其餘欄位保持 v2 migrate 行為（D3 bodyWeight 等）。
3. `src/data/achievements.ts`：
   - Metric union 若無 `sessions_imported_total` → 追加。
   - 追加 `import_first` 成就物件，不改其他陣列順序與字串。
   - 最後 `git diff src/data/achievements.ts` 驗證既有 67（58+9 cardio）成就零改動（copy/threshold/id）。
4. `src/store/achievementsStore.ts`：
   - computeMetrics：回傳 `sessions_imported_total: sessions.filter(s => s.imported === true).length`。
   - **currentOf(metric, context) switch（Errata E4）**：補 `case 'sessions_imported_total'`：回傳 metrics.sessions_imported_total。

### TR
- **TR T1 rule**：tsc 0；profileStore.version === 3。migrate 無 as any；v2 快照 → experienceLevel='beginner'。
- **TR T2 rule**：achievements.diff 僅新增 import_first 與 metric union 擴充；其他 67 成就 id/copy/threshold 比對不變。
- **TR T3 rule**：currentOf switch 有 `sessions_imported_total` 分支（E4）。

---

## Task 2b：抽出 CustomExerciseForm 共用元件（Errata E14）

**Priority**：high **Status**：pending **Depends**：Task2（需 types MuscleGroup / EquipmentType）

### 覆蓋 AC
AC-R2-4 rule (E14)

### 工作項目
1. 先讀現有 workoutStore.addCustomExerciseV2 呼叫路徑（例如 Settings/CustomExerciseManager 之類），把新建自訂表單抽出：`src/components/CustomExerciseForm.tsx`。
   - Props：`initialName?: string`（預填）、`open`、`onClose`、`onCreated(exercise: CustomExercise)`。
   - 表單欄位：name 必填、**分類 MuscleGroup 必填（未選 → 按鈕 disabled + 提示）**、equipment 選填 default barbell、liftFamily 選填。
   - 成功後 call workoutStore.addCustomExerciseV2 或現有 API，再回呼 onCreated。
2. 原本調用位置替換為 CustomExerciseForm 元件。
3. Onboarding/匯入 Step2 建自訂時復用（Task4 Step2）。

### TR
- **TR T1 rule**：CustomExerciseForm.tsx 存在；未選 MuscleGroup 時 CTA disabled。
- **TR T2 rule**：原有自訂管理頁面能繼續建立自訂（零 regression）。
- **TR T3 rule**：tsc 0。

---

## Task 3：R-2 解析層（csv.ts + matrixParser.ts + 共用 quote-aware splitter E2 + 無 nanoid E3）

**Priority**：high **Status**：pending **Depends**：Task2

### 覆蓋 AC
AC-R2-1 · AC-R2-2 · AC-R2-3 · AC-R2-6 · AC-QUAL rubric

### 工作項目
1. 先建立 `src/utils/textSplit.ts`（or inline 匯出 from csv.ts）公用 quote-aware split：
   - `splitQuoteAware(text: string, fieldSep: string, lineSep = '\n'): string[][]`：
     - 演算法狀態機：行內走 `"` inQuotes toggle；fieldSep 遇非 quote 才切；行切換時若仍在 quote → cell 接 `\n` 繼續（多行 cell）。
   - 導出供 csv.ts（逗號分隔）與 matrixParser.ts（tab 分隔）共用。
2. `src/utils/csv.ts`：
   - `parseCSV(text): string[][]`：strip BOM `\uFEFF`、strip \r、splitQuoteAware(',')。
   - `parseDate(s, fmtHint): string|null`（四格式→YYYY-MM-DD）。
   - `parseWeight(s, unit='kg'): number|null`（剝 kg/後數字；lb×0.4536）。
   - `csvToPreviewRows(text, opts)` → ParsedRow + skipped。
   - `buildTemplateBlob(): Blob`：`date,exercise,weight_kg,reps\n2026-01-01,Back Squat,60,5\n2026-01-03,Bench Press,40,8`。
3. `src/utils/matrixParser.ts`：
   - 介面：`MatrixLoadWarning`, `ParsedSession{dateISO, exercises[], notes}`。
   - `splitMatrixTSV(text)`：splitQuoteAware('\t')（支援多行 Feedback 引號 cell，E2）。
   - `parseMatrixTSV(text, overrides?)` 按 spec §5.2 步驟 1-10：
     - 年月 ctx regex 匹配；overrides 優先。
     - header anchor 掃描：每個日期 token 於 column d → anchor{d, dateISO, weightsBuffer}，持久到下一個 header 日期行（多日並排 anchor 列表可累積）。
     - 資料行每 anchor：name=cells[d-1], marker=cells[d], vals=cells.slice(d+1, d+11), loadCell=cells[d+11]。
     - marker='Weight'：存 weightsBuffer[exerciseName]。
     - marker='Reps'：與 weights 配對；weights 缺失（上一行 marker 缺）→ **丟棄 E6**；name 空 → skip E6。
     - vals 每 cell parse：`/` 或空→skip；kg 剝數字；bw→0 BW note；`a*b` 展開 a 組 b 次；Load Σ vs cell |diff|>1 warning。
     - marker 忽略白名單（Load/Intensity/Total Load/Tonne/Avg Intensity/Week Toone/Monday..Saturday/Set1..10/Exercises）。
     - marker ∈ VBT 集合 → 丟棄。
     - Feedback cell（Feedbck:/Feedback 開頭長度>10）→ 該日 session notes；**同日內容去重 E6**。
     - 日期分組 sessions。
4. fuzzy helper 放 `src/utils/fuzzy.ts`（E1）：
   - `normalize(s)`：lower、去 ASCII 標點（全形標點保留中文）、trim。
   - `tokenize(norm)`：split(/\s+|(?<=[\u4e00-\u9fff])(?=[a-zA-Z])/g...) → token list。
   - `fuzzyMatch(a,b): {overlap:number, lev:number, pass:boolean}`：overlap ≥ 1 或 lev ≤ 2 → pass。非 ASCII 的 Lev 走 char level。

### TR
- **TR T1 rule**（矩陣 7/11 block）：輸入 TSV → 1 session 2026-07-11；Deadlift 8 sets Σ=1310±1；OHP Σ=300±1；Bulgarian Σ=600±1；Hip Abduction Σ=476±1；Hip Addcution Σ=266±1；notes 含「Deadlift腰弓嚴重」。
- **TR T2 rule**（E2 多行 Feedback）：含 "\nFeedbck: 多行\n第二行" 的引號 cell → notes 有兩行文字且去重（重複 cell 不 double）。
- **TR T3 rule**（E6）：Weight 無 Reps marker → 不產出 sets；name 空 → 完全不進 exercises。
- **TR T4 rule**（E1）：fuzzy('overhand press', 'Overhead Press') pass=true。
- **TR T5 rule**（csv BOM/lb/四格式）：BOM csv + 一行 `2026/01/01,Squat,220 lb,5` → Squat weight ≈ 99.792；日期格式四選皆回正確 ISO。
- **TR T6 rule**（禁 nanoid，E3）：`grep -rn "nanoid" src` ＝ 0。
- **TR T7 rule**：tsc 0；parse 檔案 0 外部 import（除本地 types 外）。

---

## Task 4：ImportHistoryModal Wizard 三步 + Settings 入口（E13/E14/E5/E1）

**Priority**：high **Status**：pending **Depends**：Task2b + Task3

### 覆蓋 AC
AC-R2-1 · AC-R2-4 · AC-R2-5 · AC-QUAL rubric（UX） · AC-BUILD（Settings 入口存在）

### 工作項目
1. `src/components/ImportHistoryModal.tsx`：
   - 內部 state：`step ∈ {1,2,3}`、text、mode(detectMode)、overrides(matrix year/month)、csvOpts{unit,dateFormat,mapping}、parseResult、mapping:{rawName -> exerciseId| 'custom-pending'}、customFormOpen、customPendingName。
   - detectMode(text) 正則按規則。
   - Step1：textarea、範例展示、表格模式才出現的欄位映射 chips + **日期格式選擇器四選（E13）** + 單位 kg/lb；矩陣模式顯示偵測到的 ctx（年月）可改；**「範本下載」按鈕：URL.createObjectURL(buildTemplateBlob()) ＋ <a download="vivix-template.csv">（E13）**。
   - Step2：unique(rawNames) list → 每項 select dropdown（內建、既有自訂、新建自訂）。fuzzyMatch 每項最多 3 suggestion chip。新建自訂按鈕 → 打開 `CustomExerciseForm`（E14），成功即入 mapping。
   - Step3：預覽卡片：sessions N、unique exercises M、dateRange、totalTonne、skipped lines、Load warnings。
   - 回呼：`onImported(parsedSessions: ParsedSession[], mapping)` → 上層處理寫入（Task6）；導出 `buildWorkoutSessions(parseResult, mapping): WorkoutSession[]`。
2. `src/store/workoutStore.ts`：新增 action `importSessionsBatch(incoming: WorkoutSession[])` → `set((s) => ({ sessions: [...s.sessions, ...incoming] }), true)`（單次 set 批次 E12）。ID 確保在 buildWorkoutSessions 用 `generateId` 來自 `src/utils/workout.ts`（E3）。
3. Settings.tsx 資料管理區加入按鈕：`匯入歷史訓練` → 開 ImportHistoryModal（E13 Settings 入口存在）。
4. telemetry：modal first open → import_started；關閉未 confirm → import_cancelled。

### TR
- **TR T1 rule**：Settings 頁資料管理區「匯入歷史訓練」按鈕存在（grep 或元件渲染）。
- **TR T2 rule**：範本 CSV 按鈕 URL.createObjectURL 可下載（E13）。
- **TR T3 rule**：Step2 新建自訂 MuscleGroup 未選 → CTA disabled。
- **TR T4 rule**：buildWorkoutSessions 輸出 sessions 每項 imported:true、startedAt/finishedAt:null、sets[].completed:true；ID 長度/格式與 generateId 一致（E3）。
- **TR T5 rule**：tsc 0；build 成功。

---

## Task 5：Onboarding 首步 experience + Lane A 零改動 + Lane B chips 四選（E5/E7）

**Priority**：high **Status**：pending **Depends**：Task2（types）、Task4（ImportHistoryModal import-wizard）

### 覆蓋 AC
AC-R1-1 · AC-R1-2 · AC-R1-3 · AC-LANE rubric · AC-R5-1

### 工作項目
1. 先讀 Onboarding.tsx 現有 STEPS（陣列內容與順序）。**Lane A 後續 steps 以該內容為準，不重排、不刪（E7）**。
2. StepExperience 元件：三選項 card。
3. STEPS 陣列調整：頭項插入 `experience`，其餘：
   - beginner：現有 STEPS 原內容保留。
   - experienced_no_log：partner → plan-freq-chips（四選 E5）→ recommend + tutorial。
   - experienced_has_log：partner → import-wizard（ImportHistoryModal open、跳過按鈕）→ plan-prompt（依匯入結果）→ recommend + tutorial。
4. recommend 函數：`recommendPlanByFreq(avgSessionsPerWeek: 1|2|3|4|5): PlanId`（E5：1→5×5；2→上下；3-4→PPL；5+→PPL）。有匯入用 8 週平均；無匯入用 chips。
5. telemetry：選擇後 `telemetryLog('onboarding_experience_selected', { level })`。
6. profile：updateProfile({ experienceLevel: 'beginner' | 'experienced' }) 寫入。

### TR
- **TR T1 rule**：beginner 路線的 Step 組件集合（goal/recommend/tutorial… 等）與改動前完全一致（陣列內容 diff 證）。
- **TR T2 rule**：experienced_no_log chips 選 1 → 5×5；選 2 → 上下；選 3-4 → PPL；選 5+ → PPL。
- **TR T3 rule**：experienced_has_log 匯入有 50 sessions 56 天內（平均 3.57）→ PPL；8 天（平均 1）→ 5×5。
- **TR T4 rule**：onboarding_experience_selected 事件三選項各有 call path。
- **TR T5 rule**：tsc 0。

---

## Task 6：settleAll opts + 批次寫入 + RecognitionModal per-batch（E8/E11/E12）

**Priority**：high **Status**：pending **Depends**：Task4（sessions 匯入調用）

### 覆蓋 AC
AC-R3-1 · AC-R3-2 · AC-R3-3 · AC-ACH（import_first） · AC-R5-1（import_completed）

### 工作項目
1. `settleAll.ts`：
   - `export function settleAll(triggerSession?, opts?: { silent?: boolean; skipPartner?: boolean })`。
   - silent：celebration queue 不 push、不 schedule modal（只 return achievementUnlocks ids）。
   - skipPartner：partner reward（addXp / form unlock）整段短路。
2. 匯入完成流程（ImportHistoryModal onConfirm 或上層 call）：
   - `workoutStore.importSessionsBatch(sessions)`（單次 set E12）。
   - `telemetryStore.log('import_completed', { mode, sessions: N, exercises: M, skipped })`。
   - `settleAll(undefined, { silent: true, skipPartner: true })`。
   - collect stats（N sessions / unique days / PR count from computePRs / unlockedAchievements length diff before→after / total tonne Σ）。
   - open RecognitionModal(stats)。
3. `src/components/RecognitionModal.tsx`（**每批次一次 E8**；非 ever-once；關閉後下一批再開可）：CTA 用 **現有導航機制（useNavigate from router）** 到成就頁／Dashboard（E11，禁止字面 '/achievements' 若導航不是 literal 路徑）。

### TR
- **TR T1 rule**：settleAll({silent:true}) 不 push 任何 celebration pending。
- **TR T2 rule**：settleAll({skipPartner:true}) 前後 partner xp 完全不變。
- **TR T3 rule**：連續匯入兩批 → RecognitionModal 彈二次（E8）。
- **TR T4 rule**：匯入有至少 1 imported session → achievements 有 import_first unlocked。
- **TR T5 rule**：CTA 點擊 → 實際導航到成就頁與 Dashboard（路由跳轉證據）。
- **TR T6 rule**：tsc 0。

---

## Task 7：R-4 分離規則（Partner totalWorkouts / energy.ts imported null / Progress notes）

**Priority**：medium **Status**：pending **Depends**：Task2（WorkoutSession imported）

### 覆蓋 AC
AC-R4-1 · AC-R4-2 · AC-BUILD rule · AC-DOC（兩種 totalWorkouts E15 對照）

### 工作項目
1. partnerStore.getTotalWorkouts：`useWorkoutStore.getState().sessions.filter(s => s.imported !== true).length`（I-4，與 DEV_RULES/DATA_FLOW 敘述一致，E15）。
2. energy.ts estimateStrengthKcal：**函數開頭（E10）** if (session.imported === true) return null；其後 timestamp fallback 等主流程。
3. Progress.tsx 熱量區：加一個小字 chip「匯入記錄不計入熱量估算」（若有至少 1 imported session 在日期區間則顯示；或固定顯示）。
4. 驗證 selectors.getStreakDays（不改，I-3）：grep 確認未對 imported 進行過濾。

### TR
- **TR T1 rule**：加 5 imported → getTotalWorkouts() 回傳值不加（相對 baseline 不變）。
- **TR T2 rule**：estimateStrengthKcal(imported) → null；非 imported → 原行為不變。
- **TR T3 rule**：Progress EE 附註存在（E13-like visual check via grep）。
- **TR T4 rule**：streak 計算對 imported day 仍計入（手動單測或 grep）。

---

## Task 8：Telemetry 完整性（R-5）

**Priority**：low **Status**：pending **Depends**：Task4/5/6

### 覆蓋 AC
AC-R5-1 rule

### 工作項目
1. 四事件確認都有 log：
   - import_started：ImportHistoryModal mount 時 useEffect 或 onOpenOnce guard。
   - import_completed：Task6 已加。
   - import_cancelled：ImportHistoryModal 關閉未 confirm（step<3 或 text 空就關）→ log。
   - onboarding_experience_selected：Task5 已加。
2. 確保 payload 符合 Record<string, unknown> schema（無 error）。

### TR
- **TR T1 rule**：grep 四事件名 src 內至少 1 log call（每事件≥1 hit）。

---

## Task 9：全回歸（REGRESSION_CHECKLIST §14 10 項＋Build＋NOREG）

**Priority**：high **Status**：pending **Depends**：Task1..Task8 all completed

### 覆蓋 AC
AC-BUILD · AC-NOREG · AC-R0-1 · AC-LANE · AC-DOC

### 工作項目
1. 跑 10 項驗收並收集證據：
   1. Lane A 零改動 + Lane B 推薦正確（Task5 TR 證）。
   2. 矩陣模式 11 向量（Task3 TR1/TR2/TR3 證）。
   3. 表格模式 BOM/CRLF/引號/日期四格式/lb/skipped（Task3 TR5 證）。
   4. Step2 強制分類/fuzzy/預覽（Task4 TR3 證）。
   5. imported session 在 PR list/圓餅/曲線/器械記憶（手動比對 computePRsFromSessions 輸出）。
   6. RecognitionModal 數字正確 + silent only once/batch（Task6 TR3 證）。
   7. Partner XP 不給 + totalWorkouts 不計（Task7 TR1 證）。
   8. streak 含 imported / EE 排除（Task7 TR2/TR4 證）。
   9. 刪 imported session：派生下降；成就仍在（D2）。
   10. grep src 健身新手=0；tsc 0；build ✓；precache ≥16（E9）。
2. NOREG：
   - `git diff --name-only | grep restTimer` 空。
   - `git diff src/store/themeStore.ts` 空（E9 themeStore 零 diff）。
   - `git diff src/store/trialStore.ts` 空。

### TR
- **TR T1 rule**：10 項全綠；tsc 0；vite build 成功；precache≥16；NOREG diff=0。任何一項失敗 → Task9 留 in_progress，回前 Task 修復。

---

## Task 10：獨立 Review（Review 階段產出 review.md）

**Priority**：high **Status**：pending **Depends**：Task9 completed

獨立 Reviewer（fresh context）核：
- spec.md 每 rule/rubric AC 有獨立證據。
- tasks.md 每 Task 有完成證據、TR 全過、文件有逐份 diff。
- 輸出 pass/fail/blocked。fail 則在此 tasks.md 新增 remediation issues。
