# Vivix 定位重定義＋歷史記錄匯入 v2.1 規格（Errata 已合併）

## 1. 問題、用戶、目標、非目標

### 1.1 問題
現有 Vivix 品牌定位為「給健身新手的陪伴型教練」，僅服務第一次進入健身房的 Lane A 用戶；但 Lane B（會練但沒系統記錄的使用者、從 Excel／其他 App 轉移的使用者）被定位措辭與功能（單一 5×5 推薦）排除。同時 Lane B 缺乏過去訓練記錄的匯入路徑，導致成就牆、streak、PR、器械記憶、進度曲線全部由零開始，傷害留存。現有 7 處 `健身新手` 措辭（UI 文案、meta、manifest、package、文檔）需對齊雙 lane 定位。

### 1.2 用戶（L0 定位律：雙 lane 同時成立）
- **Lane A 訓練新手**：第一次進健身房＋第一次系統記錄。需要教練式帶領（現有 Onboarding STEPS 零改動，僅前置 experience step）。
- **Lane B 經驗記錄者**：會練但沒系統記錄 / 從 Excel 或其他工具轉移。需要 Past Recognition（承認過去、幫你記得）、靈活計畫（PPL / 上下分裂 / 5×5 依頻率）、以及貼上式匯入精靈（matrix + table）。

### 1.3 目標
1. 所有 UI / meta / manifest / 文檔措辭改為雙 lane 中性；`grep "健身新手" src = 0`。
2. Onboarding 首步新增經驗自選（beginner/experienced×2）；Lane A 後續 STEPS 以現有序列為準零改動；Lane B Partner＋（可選）匯入＋四選 chips 或 8 週頻率推薦。
3. 匯入 v1：雙模式（Excel 矩陣 TSV 貼上＋CSV 表格貼上）＋三步 Wizard（模式/欄位→動作映射→預覽確認）。**ID 統一 `generateId`（`src/utils/workout.ts`），禁止 nanoid 新導入。**
4. imported session 納入 PR／成就（含 cardio 9 個，既有 67 個成就總體）／streak／報告／器械記憶（I-3），但 Partner XP／形態解鎖／熱量估算排除（I-4、I-6）。
5. 匯入完成：settle silent（skipPartner）＋**每批次一次** RecognitionModal（I-5，Errata E8：非 ever-once）。
6. 新增成就 `import_first`（behavior track，t1）；**既有 67 個成就（58 力量 + 9 cardio）id／threshold／copy 零 diff**。
7. persist key（`ironpulse-*` / `vivix-*`）完全不變；profileStore version bump 至 3，migrate 舊資料 experienceLevel='beginner'。
8. 不加任何 dependency（禁 xlsx / papaparse / nanoid 等）；全走前端 blob + 原生 TS parse。
9. sessions 寫入：**單次 set() 批次寫入**（Errata E12）。

### 1.4 非目標
- Lane A Onboarding STEPS（experience 之後）零改動；不重排 goal/recommend/tutorial 順序。
- 不移動 / 重構 Partner 引擎、成就 engine、休息計時。
- 不新增後端；不改試用鎖行為；不新增 VBT / 心率相關 schema。
- 不修改 `mobile-app/`（FROZEN.md）。

## 2. 功能需求（Functional Requirements）

### FR R-0 定位措辭對齊
- R-0-1：全域 grep "健身新手"（排除 node_modules/dist/.git），逐 hit 依術語表替換為中性措辭（「給訓練者的」／「開始系統化記錄訓練的人」等，視語境）：
  - 檔案層：README.md（開頭＋brand_line）、package.json description、index.html meta description 與 og:description、manifest-light/dark.webmanifest description、.trae/documents/PRD.md。
  - 文檔層：
    - DEV_RULES.md：**頂部插入 L0 定位律**（statement + brand_line + glossary 4 點）＋決策紀錄 P-1 / I-1~I-6。**明寫兩種 totalWorkouts 語義（Errata E15）：① 成就／統計用＝全 sessions 計（含 imported，I-3）；② Partner 形態解鎖 XP 用＝非 imported 計（I-4，partnerStore.getTotalWorkouts）。**
    - ARCHITECTURE.md：新增 §Onboarding 雙 lane（experienceLevel、Lane A/B 分流；E7：Lane A STEPS 序列不變）＋§匯入管線（雙模式、matrix quote-aware 分割、anchor 機制、session.imported、批次 set()、silent settle、每批次 RecognitionModal）。
    - DATA_FLOW.md：新增 §匯入流（貼上→quote-aware parse→map→sessions(imported:true, 單次批次 set())→settle silent→RecognitionModal per-batch）＋streak union 含 imported＋Partner XP/form unlock 過濾 `!imported`＋EE 排除 imported。**明寫兩種 totalWorkouts 語義（E15）**：stats/selectors 全計；partnerStore.getTotalWorkouts 僅非 imported。
    - REGRESSION_CHECKLIST.md：新增 §14（spec §10 第 9 節 10 勾選項）。
    - ACHIEVEMENT_DESIGN.md：Lane B 認可哲學一段；新增成就 `import_first`（track behavior、threshold=1、copy「你的過去，從今天起有了家。第一筆歷史匯入完成。」）。
    - CALORIE_MODEL.md：I-6 註記（imported session 跳過估算；Progress 附註）。
    - INSTALL_IPHONE.md：中性化措辭。
    - src/pages/Settings.tsx about 區塊：中性化。
    - src/components/FeedbackModal.tsx：中性化。
  - PROJECT_SUMMARY.md 若存在則同步（一句話簡介、定位表、舊張力標記已解決、Roadmap 加「匯入 v1 矩陣＋表格」）；不存在跳過。
- R-0-2：brand_line 統一 `Vivix — 把每一次訓練，變成看得見的進步。`。
- R-0-3：中性稱呼守則：用「你」、「訓練者」；禁用統一稱呼「健身新手」；文檔允許術語表白名單解釋 Lane A/B。

### FR R-1 experienceLevel 與 Onboarding 雙 lane
- R-1-1：types `UserProfile.experienceLevel?: 'beginner' | 'experienced'`（原始事實 persist）。
- R-1-2：Onboarding STEPS 首步插入 `experience`（Errata E7：Lane A 其餘步驟以現有序列為準，零改動）；三選項：
  - `第一次進健身房` → beginner → 後續 steps 序列＝當前 STEPS 內容（Lane A 零改動）。
  - `有在練，但還沒系統記錄` → experienced → steps：partner → plan-freq-chips → 與 Lane A 同樣的 recommend + tutorial。
  - `用 Excel／其他 App 記錄過` → experienced → steps：partner → import-wizard（ImportHistoryModal，可跳過）→ plan-prompt（有匯入→近 8 週平均套公式；無匯入→chips 套公式）→ recommend + tutorial。
- R-1-3：**Lane B 推薦公式（Errata E5：四選 chips 對應公式）**
  - chips 四選：`1 次／週`→ 5×5；`2 次／週`→ 上下分裂；`3-4 次／週`→ PPL；`5+ 次／週`→ PPL。
  - 有匯入時：近 8 週（56 天內）每週平均訓練日 → 套同一公式（mean≥5 → PPL；mean 3-4 → PPL；mean 2 → 上下分裂；mean≤1 → 5×5）。
- R-1-4：profileStore version bump 至 3，migrate unknown+guard 為舊 v2 profile 補 `experienceLevel='beginner'`。

### FR R-2 匯入管線（雙模式＋三步 Wizard）
- R-2-1：常設入口 `Settings → 資料管理 → 匯入歷史訓練`（Settings.tsx 資料管理區加按鈕）；Onboarding Lane B step import-wizard 共用同一 `ImportHistoryModal`。
- R-2-2：模式自動偵測：
  - 含日期 token（`(\d{1,2})月(\d{1,2})日`，引號包容）＋同時有 `Weight` 與 `Reps` marker → 矩陣模式。
  - 否則首行似 header（date/exercise/weight/reps，大小寫/分隔容錯）→ 表格模式。
  - 都不是 → 錯誤提示 + 兩範例。
- R-2-3：`src/utils/csv.ts` 表格模式：
  - `parseCSV(text)`：quote-aware 行分割（Errata E2：與 matrix 共用 quote-aware splitter；支援多行引號 cell）。
  - `parseDate(s, formatHint)`：四格式（YYYY-MM-DD／YYYY/MM/DD／DD/MM/YYYY／MM/DD/YYYY）→ `YYYY-MM-DD`。
  - `parseWeight(s, unit)`：kg/lb；lb×0.4536。
  - `csvToPreviewRows(text, {unit, dateFormat})`：ParsedRow + skipped。
  - `buildTemplateBlob(): Blob`：header `date,exercise,weight_kg,reps` ＋ 2 行範例。前端 `<a download>` 觸發。
  - Wizard Step1 UI 提供日期格式選擇器（四選）＋單位切換（kg/lb）。
- R-2-4：`src/utils/matrixParser.ts` 矩陣模式（共用 quote-aware splitter，Errata E2）：
  - `splitMatrixRows(text: string): string[][]`：CRLF strip \r、quote-aware 多行 cell split（特別係 Feedback 可能跨引號多行）。
  - `parseMatrixTSV(text, overrides?)`：
    1. rows/cells 走 quote-aware split；trim。
    2. 年月 ctx：`/^(\d{4})\s+(January|February|March|April|May|June|July|August|September|October|November|December)$/i`。
    3. 日期 token 正規化：去引號與空白，匹配 `(\d{1,2})月(\d{1,2})日`（兼容 `7"月"11"日"`、`7月13日`）。
    4. header day anchor（name=d-1, marker=d, sets=d+1..10, Load=d+11）；支持多日並排；anchor 持久到下一個 header 日期行。
    5. 資料行：對每 anchor 取 name／marker／vals。marker=Weight 存 weights (day,name)；marker=Reps 與 weights 配對产出 sets。
    6. 值解析：`20kg`/`20KG`→20；純數字 OK；`/` 或空→skip；**Weight 有但 Reps 缺失／空→丟棄（E6）**；name 空→skip（E6）；self weight／bw／自重→weight=0＋notes 標 BW。reps `a*b`→展開 a 組 b 次（例：Bulgarian 25kg × `2*6` × 2 欄 → 4 sets × 6 × 25kg = 600）。Load 交叉驗證：|Σ - Load| > 1 → warning。
    7. 忽略 marker 白名單：Load / Intensity / Total Load / Tonne / Average Intensity / Weekly/Monthly/Yearly Toone / Monday..Saturday / Set1..Set10 / Exercises。
    8. VBT markers ∈ {MV, PV, DISP, PP, V-Loss} → 丟棄（不改 schema、不入 notes）。
    9. Feedback：cell 以 `Feedbck:` 或 `Feedback` 開頭且長度>10 → 該日 session notes；**同日相同 Feedback 內容去重（E6）**；多行引號 cell 透過 quote-aware split 自動支援多行 Feedback 向量（E2）。
    10. 分組：(dateISO, exerciseName) → session.exercises；一日一 session。動作名保留原文（含 typo，如 Hip Addcution／chess supported row）。
- R-2-5：Wizard 三步。共用 `CustomExerciseForm` 元件（Errata E14：先抽出 Step2 新建自訂復用的 form）。
  - Step1：模式顯示＋表格模式才需欄位映射＋日期格式選擇器＋單位；矩陣模式顯示偵測的天數/年月（可改 year/month）；同時提供「範本下載」按鈕（呼叫 buildTemplateBlob，E13）。
  - Step2：unique 動作名 → 每項下拉（內建／既有自訂／建新自訂）。**Fuzzy 升級（Errata E1）**：兩字串 normalize 為 tokens（lower、去標點、中文保留、空白分詞），判斷：① token overlap ≥ 1；② 或 Levenshtein ≤ 2（非 ASCII 允許 fallback 到 char level 距離）。新建自訂走 CustomExerciseForm：名稱預填原字串、**分類 MuscleGroup 必填**、equipment 選填 default barbell；成功立即加入 dropdown 選項。
  - Step3 預覽：N sessions／M 獨立動作／日期區間／總噸數／skipped／Load warnings 列表。Confirm CTA。
- R-2-6：寫入規則。sessions push：
  - 每 session：`imported: true`、`startedAt: null`、`finishedAt: null`、sets `completed: true`、notes=feedback 合併。
  - **單次批次 set()**（Errata E12）：workoutStore 暴露 `importSessionsBatch(sessions[])` action 或直接 `set({ sessions: [...old, ...new] })`；禁止逐 session push。
  - 不觸發 finishSession 路徑。
  - ID 統一 `generateId`（`src/utils/workout.ts`）；不用 nanoid（Errata E3）。

### FR R-3 結算＋認可儀式
- R-3-1：`settleAll(triggerSession?, opts?: { silent?: boolean; skipPartner?: boolean })`。silent：慶祝 queue/modal 不 push；skipPartner：Partner addXp/form unlock 短路。
- R-3-2：匯入確認後 call `settleAll(undefined, { silent:true, skipPartner:true })`。
- R-3-3：**RecognitionModal 每匯入批次 show 一次（Errata E8：非 ever-once）**。統計卡片：「本批次認可：X sessions・Y training days・Z PR・W 成就・T 噸」。CTA：**以現有導航機制（useNavigate or 路由 action，非字面 path）導航到成就牆 / Dashboard**（Errata E11）。
- R-3-4：D2 守則：unlocked 永久；刪 imported 後進度 live 下降，但已解鎖成就不消失。

### FR R-4 分離規則
- R-4-1：`partnerStore.getTotalWorkouts()`＝`sessions.filter(s => s.imported !== true).length`（Partner 用，I-4）。
- R-4-2：`selectors.getStreakDays` 全 sessions（含 imported，I-3），不改。
- R-4-3：**energy.ts（Errata E10）首行檢查 session.imported===true → 立即 return null；其後才 timestamp fallback 走 estimateStrengthKcal 主流程**。Progress 熱量卡附註「匯入記錄不計入熱量估算」。
- R-4-4：器械記憶派生自 sessions（imported 自動包含），零改動。

### FR R-5 Telemetry
- `import_started`（ImportHistoryModal 首次 open）。
- `import_completed{mode, sessions, exercises, skipped}`（Confirm CTA 後）。
- `import_cancelled`（未 confirm 就 modal 關閉）。
- `onboarding_experience_selected{level}`（experience step 選擇）。

## 3. 非功能需求（NFR）
- NFR-1 到 NFR-4：同 v2；**NFR-4 補充 themeStore 全文 git diff 零變化（Errata E9）**。
- NFR-5（成就穩定性）：**既有 67 成就（58 力量 + 9 cardio）id/threshold/copy 零 diff**；僅新增 import_first。achievementsStore `currentOf(metric)` switch 補 `sessions_imported_total` 分支（Errata E4）。
- NFR-6：imported 相容性（嚴格 === true / !== true）。

## 4. 約束、相依、假設
- 不新增任何依賴；persist key 不變；mobile-app/ 凍結；休息計時／雙主題／試用鎖零變化（themeStore 零 diff）。
- 假設：矩陣模式 TSV 為 Excel 複製輸出；表格模式為標準 CSV。

## 5. 驗收標準（Acceptance Criteria）

### Rule AC（二元可驗證）
- **AC-R0-1 rule**：`grep -rn "健身新手" src` ＝ 0。
- **AC-R0-2 rule**：12 份文件（README、package.json、index.html、manifest×2、PRD.md、DEV_RULES、ARCHITECTURE、DATA_FLOW、REGRESSION_CHECKLIST §14、ACHIEVEMENT_DESIGN（含 import_first）、CALORIE_MODEL、INSTALL_IPHONE）逐份有對應修改證據（diff）；DEV_RULES / DATA_FLOW 明寫兩種 totalWorkouts 語義（Errata E15）。
- **AC-R1-1 rule**：types UserProfile experienceLevel 存在；profileStore version===3；migrate unknown guard；舊 v2 profile → 'beginner'。
- **AC-R1-2 rule**：Onboarding STEPS 首步 experience；三選項對應 3 code path。
- **AC-R1-3 rule**：Lane A 後續 STEPS 序列與改動前一致（E7）；Lane B experienced two sub-path 正確；chips 四選（1→5×5；2→上下分裂；3-4→PPL；5+→PPL）＋8 週平均套同公式（E5）。
- **AC-R2-1 rule**：ImportHistoryModal 存在（於 Settings 入口按鈕可見，E13）；csv.ts + matrixParser.ts 存在；parseCSV 與 parseMatrixTSV 共用 quote-aware splitter（E2）；0 new dependency（含禁 nanoid，E3）。
- **AC-R2-2 rule**：matrix 步驟 1-10 全部實作；Weight 無 Reps 丟；name 空 skip；同日 Feedback 去重（E6）；多行 Feedback cell 經 quote-aware split 正確合併（E2）。
- **AC-R2-3 rule**：csv BOM/CRLF/引號/四格式日期選擇器/lb×0.4536；範本 blob 可下載（E13）。
- **AC-R2-4 rule**：Wizard Step2：CustomExerciseForm 先抽出再復用（E14）；新建自訂 MuscleGroup 未選 → CTA disabled；Fuzzy tokens overlap≥1 或 Levenshtein≤2（E1）；預覽數字正確。
- **AC-R2-5 rule**：sessions 寫入 imported:true, startedAt/finishedAt:null, sets completed:true；ID 用 generateId()（E3）；單次批次 set()（E12）。
- **AC-R2-6 rule**：矩陣 2026-07-11 測試向量 6 項（1/notes/Deadlift/OHP/Bulgarian/Hip Abd/Addc）；另加 Feedback 多行向量（E2）正確入 notes。
- **AC-R3-1 rule**：settleAll opts silent / skipPartner 行為正確。
- **AC-R3-2 rule**：匯入後 settleAll 參數 === {silent:true, skipPartner:true}。
- **AC-R3-3 rule**：RecognitionModal per-batch（重複匯入兩次各自彈，E8）；CTA 用現有導航機制導航成就牆/Dashboard（E11）；D2 守則。
- **AC-R4-1 rule**：partnerStore.getTotalWorkouts() 不含 imported。
- **AC-R4-2 rule**：streak 含 imported；energy.ts 首行 imported===true → null（E10）；Progress EE 附註。
- **AC-R5-1 rule**：4 個 telemetry 事件名全部在 src 中出現至少一處 log call。
- **AC-ACH rule**：既有 67（58+9 cardio）成就 id/threshold/copy 零 diff；新增 import_first；achievementsStore currentOf switch 有 sessions_imported_total 分支（E4）。
- **AC-BUILD rule**：tsc --noEmit = 0；vite build 成功；SW precache ≥ 16（E9）。
- **AC-NOREG rule**：restTimer.tsx diff=0；themeStore.ts diff=0（E9）；trialStore.ts diff=0。

### Rubric AC（品質評估）
- **AC-LANE rubric**（0-2，≥1.5 pass）：Lane A 流程/copy 零 regression（1）；Lane B 文案幫你記得/承認過去 tone 正確（1）。
- **AC-QUAL rubric**（0-2，≥1.5 pass）：csv + matrix 純函數 quote-aware（0.5）；Wizard 三步 UX 無死路 + 即時回饋 + 日期格式選擇器 + 範本下載（0.5）；migrate/容錯 unknown guard 無 as any；generateId 不用 nanoid；sessions 批次 set()（0.5）；imported === true / !== true 一致保護舊資料；RecognitionModal per-batch（0.5）。
- **AC-DOC rubric**（0-2，≥1.5 pass）：DEV_RULES L0 + 術語表 + P-1/I-1..I-6 + 兩種 totalWorkouts 語義（0.5）；ARCH/DATA_FLOW 匯入章節正確＋兩種 totalWorkouts 語義（E15）（0.5）；REGRESSION §14 10 勾選項齊（0.5）；其他文件逐份對齊無矛盾（0.5）。
