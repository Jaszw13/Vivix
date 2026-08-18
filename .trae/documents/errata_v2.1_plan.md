# Errata v2.1 補齊執行計劃（E1–E15）

## Repository Research（盤點結果）

根據代碼實地盤點（`src/`、`REGRESSION_CHECKLIST.md`），現將 Errata E1-E15 分為「✅ 已合規」與「🔴 缺口待補」：

| Errata | 要求 | 現況 | 結論 |
|---|---|---|---|
| E1 | fuzzy token 級（lower+去標點+分詞，overlap≥1 或 LV≤2）；TR T2 不變 | `src/utils/fuzzy.ts` 已實作 tokenize + overlap + LV + pass；ImportHistoryModal 呼叫 fuzzySuggest(topN) | ✅ 合規 |
| E2 | matrixParser 行分割共用 quote-aware splitter；TR 加多行 Feedback 向量 | splitQuoteAware 已在 textSplit.ts 共用；matrixParser / csv 皆引用；REGRESSION §14 已有「多行 Feedback 向量」 | ✅ 合規 |
| E3 | 刪 nanoid；統一 generateId(utils/workout) | grep nanoid src = 0；所有新建 id 走 generateId（workoutStore / cardioStore / ImportHistoryModal）| ✅ 合規 |
| E4 | 58→既有 67（58+9 cardio）；Task2 補 sessions_imported_total | achievements.ts header 已改；achievementsStore L392 currentOf switch 含 sessions_imported_total；import_first 成就已加 | ✅ 合規 |
| E5 | chips 邏輯：1→5×5；2→上下分裂；3-4→PPL；5+→PPL；有匯入用 8 週平均套同公式 | 🔴 **Onboarding STEPS 仍為 welcome→partner→goal→recommend→tutorial，完全無 experience 前置（E7/E5 同時缺口）**；StepRecommend 目前僅硬編碼 DEFAULT_BEGINNER_PLAN_ID，**完全無 chips 選擇器 與 8 週平均公式** | 🔴 缺口最大項 |
| E6 | Weight 無 Reps→丟棄；name 空→skip；同日相同 Feedback 去重 | matrixParser.ts L296 name空skip、L312 Weight無Reps丟棄、L271 Feedback去重 皆存在 | ✅ 合規 |
| E7 | Lane A 以 Onboarding.tsx 現有序列為準，僅前置 experience | 🔴 STEPS 完全缺 experience step；Onboarding 未按 E7 插入 | 🔴 缺口（同 E5） |
| E8 | RecognitionModal 每次匯入批次一次儀式（非 ever-once） | ImportHistoryModal L507 每批觸發 RecognitionModal；無 ever-once flag 檢查 | ✅ 合規 |
| E9 | AC-BUILD precache≥16；AC-NOREG themeStore 零 diff | 🔴 **未經實證**（必須 tsc/build 後人工清點 precache 數；themeStore 內 migrate 與 default 必須零行為變更）| 🔴 待驗證 |
| E10 | energy.ts 首行 imported===true→null；其後 timestamp fallback | `src/features/stats/energy.ts` 首行已 `if (session.imported === true) return null;` | ✅ 合規 |
| E11 | CTA 用現有導航機制，非字面路徑 | ImportHistoryModal Props 接受 onGoTrain / onGoAchievements callback；Settings 傳入 navigate('/')、navigate('/achievements')；未見 window.location.href 字面跳 | ✅ 合規 |
| E12 | sessions 單次 set() 批次寫入 | workoutStore.importSessionsBatch 使用 `set(s=>({sessions:[...s.sessions,...incoming]}))` 單次 set | ✅ 合規 |
| E13 | TR：範本 blob 可下載；Settings 入口存在；表格模式日期格式選擇器 | ✅ buildTemplateBlob + a.click 下載；Settings 匯入入口按鈕存在；表格模式 4 種日期格式下拉選擇器存在 | ✅ 合規（REGRESSION §14 已見多行 Feedback；範本 / Settings / 日期格式 需再補 3 行 TR 對應閱兵）|
| E14 | Task4 先抽 CustomExerciseForm 共用元件再復用 | CustomExerciseForm.tsx 已存在；ImportHistoryModal L492 復用 | ✅ 合規 |
| E15 | DATA_FLOW / DEV_RULES 明寫兩種 totalWorkouts 語義 | DEV_RULES.md L24、DATA_FLOW.md §兩種 totalWorkouts、ARCHITECTURE、REGRESSION §14 皆已對齊；partnerStore.getTotalWorkouts 已 `filter(!imported)`；settleAll quest.totalWorkouts 亦取 nonImported | ⚠️ **PartnerPage.tsx L39 `const totalWorkouts = sessions.length`**（未排除 imported）→ 形態顯示卡的「訓練次數」仍顯示含 imported 數字，**直接違反 I-4**（視覺層次與解鎖邏輯分離，但易誤導 + getFormForWorkouts 雙重標準）| 🔴 需修 PartnerPage |
| 附 T7 / T8 | Progress EE 附註補「匯入記錄不計入熱量估算」；onboarding_experience_selected 事件 | 🔴 Progress.tsx 總熱量卡免責聲明（L686-689）**缺 I-6 進口排除文字**；Onboarding 目前完全無 experience step，亦無此事件 | 🔴 缺口（同 E5/T8）|

### 缺口總結（按優先級）
1. **高優先級（功能邏輯錯）**：E5 + E7（Onboarding 雙 lane & chips 推薦 & 8 週平均 & experience step）
2. **高優先級（邏輯矛盾）**：PartnerPage totalWorkouts 未排除 imported（I-4 違反，E15 延伸）
3. **中優先級（文案缺漏）**：Progress EE 附註（T7/I-6）、onboarding_experience_selected 事件（T8/R-5）
4. **驗收級（E9）**：precache ≥16、themeStore 零 diff → 最後 build 驗證

## Files and Modules（修改範圍）

| 文件 | 變更類型 | 說明 |
|---|---|---|
| `src/pages/Onboarding.tsx` | 重構（E5/E7） | STEPS 前置 'experience'；分 Lane A（welcome→exp→partner→goal→recommend→tutorial 不變其後）、Lane B（exp 選「有經驗/匯入」→ partner → 可選 ImportHistoryModal 內嵌 → StepFrequency chips 或 8 週平均導向 recommend）|
| `src/features/partner/components/PartnerPage.tsx` | 修（E15/I-4） | L39 sessions.length → `sessions.filter(s => s.imported !== true).length`；L65-68 getFormForWorkouts 沿用同變數確保一致 |
| `src/pages/Progress.tsx` | 修（T7/I-6） | 總熱量卡免責段落補一句「匯入的歷史記錄不計入力量熱量推估（僅手動完成的訓練才參與）」 |
| `REGRESSION_CHECKLIST.md` | 註記（E13） | §14 補 3 條 TR 明細項：「範本 blob 下載 / Settings 匯入入口 / 表格模式日期格式選擇器」 |
| `vite.config.ts` / build 產物 | 驗證（E9） | 不代改；build 後 grep precacheEntries 數量 |
| `src/store/themeStore.ts` | 驗證（E9 NOREG） | 不代改；以 git diff 證零變動 |

## Implementation Steps

### Step 1. E15 PartnerPage 修正（最小 diff）
- `sessions = useWorkoutStore(s => s.sessions)` 後加一行：
  ```ts
  // E15 / I-4：Partner 顯示與形態解鎖僅計非 imported
  const nonImportedSessions = useMemo(
    () => sessions.filter(s => s.imported !== true),
    [sessions]
  );
  const totalWorkouts = nonImportedSessions.length;
  ```
- 同步將 `L74 recentWorkoutDates` 與 `L76 warmupCount` 的 sessions 改為 nonImportedSessions（quest/reward 邏輯亦屬 Partner 語義）。

### Step 2. E7 / E5 Onboarding 雙 Lane 改造
**原 STEPS 不變其順序，僅前置 'experience'**（E7 原文：Lane A 以現有序列為準，僅前置 experience）：
```
STEPS = ['welcome', 'experience', 'partner', 'goal', 'recommend', 'tutorial']
```
- 新增 state：`experienceLevel: 'beginner'|'experienced'|'excel'`（persist 時 'excel' normalize 為 'experienced'，僅 UI 分流）
- `StepExperience`：三選項卡片（第一次進健身房 / 有在練但沒記錄 / 用 Excel 或其他 App 記錄過）
  - 選 beginner → Lane A（後續 partner→goal→DEFAULT_BEGINNER_PLAN recommend→tutorial）
  - 選 experienced / excel → Lane B（partner 照常 → **跳到 StepFrequency**，goal 可選或跳過；excel 附「點此直接開啟匯入」inline 按鈕）
- `StepFrequency`（Lane B 用，替換原本單一 DEFAULT_BEGINNER_PLAN recommend）：
  - **Case A：已匯入（sessions.length > 0）** → 計算近 8 週每週訓練頻率 avg（= (8 週內訓練日數) / min(8, 自匯入首日起週數)）
    - avg < 1.5 → 5×5（推薦強化基礎）
    - 1.5 ≤ avg < 2.5 → 上下分裂
    - avg ≥ 2.5 → PPL
  - **Case B：未匯入** → 4 chips：「1 次/週」「2 次/週」「3-4 次/週」「5+ 次/週」；公式：1→5×5；2→上下；3-4→PPL；5+→PPL
  - 最終 plan = 選對應訓練計畫 id；首頁「啟動訓練」導向 active plan
- finish() 時 `updateProfile({ experienceLevel: 'beginner' | 'experienced' })`；tlog `onboarding_experience_selected({level})`（T8）

### Step 3. T7 Progress EE 附註
Progress.tsx L686 免責 `<p>` 補：
```
；匯入的歷史記錄不計入力量熱量推估。
```

### Step 4. E13 REGRESSION 補 3 項 TR
§14 清單末追加 3 勾：
```
- [ ] 範本 blob 可下載（點「下載 CSV 範本」即彈出 vivix-import-template.csv）
- [ ] Settings 匯入入口存在（按鈕「匯入歷史記錄」→ 開啟 ImportHistoryModal）
- [ ] 表格模式日期格式選擇器（4 選一，YYYY-MM-DD / YYYY/MM/DD / DD/MM/YYYY / MM/DD/YYYY）
```

### Step 5. E9 驗證（不改碼，純執行）
1. 執行 `npx vite build` → dist 生成
2. 打開 `dist/sw.js` 或 precache manifest → 計數 precache 檔案數 ≥ 16
3. `git diff src/store/themeStore.ts` → 空輸出（NOREG 確認）

## Dependencies and Considerations
- **persist key 不可變**：所有變更不得觸及 ironpulse-* / vivix-* 鍵名。
- **Lane A 零變動**：experience=beginner 選擇後後續流程（partner→goal→recommend=5×5→tutorial）完全等於舊 STEPS 序列（僅 welcome 後多一步，而 exp 選 beginner 的按鈕文案與流程零新增）。
- **Lane B goal**：E5/E7 規格未要求 Lane B 刪 goal；最小化變更下，把 goal 在 Lane B 中保留為可選頁（非強制），避免與現有 `completeOnboarding(goal)` 簽名衝突。
- **訓練計畫 id**：chips→計畫的映射需先確認 plans.ts 中 5×5、上下分裂、PPL 三個 id 存在；若 PPL 暫缺（目前僅 DEFAULT_BEGINNER_PLAN_ID），則 fallback 以 DEFAULT_BEGINNER_PLAN_ID 顯示並補 badge「頻率預設套用 5×5（PPL 計畫即將推出）」（標註 backlog）。**需先 grep trainingPlans 內容確認**。

## Validation
1. `npx tsc --noEmit` 0 錯誤
2. `npx vite build` 成功；precache 數 ≥ 16
3. `git diff src/store/themeStore.ts` 空
4. Onboarding 雙 lane：
   - Lane A（beginner）：experience 選第一項 → STEPS 序列正確；最終 plan=5×5；profile.experienceLevel='beginner'；telemetry `onboarding_experience_selected{level:beginner}`
   - Lane B（experienced 未匯入）：chips 2 次→上下分裂；chips 3-4/5+→PPL；chips 1→5×5
   - Lane B（excel 已匯入 >=1 session 且近 8 週 avg=3.2）→ PPL
5. PartnerPage：匯入 5 筆 imported session 後，顯示的「訓練次數」統計 **不增加**；形態解鎖進度條仍依非 imported 正確顯示
6. Progress 熱量卡：免責聲明新增一句可見
7. REGRESSION §14 人工勾選 10+3=13 項 E13 可核對
8. grep 守門矩陣（健身新手、as any、非空斷言、persist key）全綠

## Risks
- **Risk：trainingPlans 缺上下/PPL 計畫 id** → Handle：先 `grep plans`；若不存在則於 StepFrequency 顯示 fallback 文案（不 crash）；不新增 training plan 內容（不在 Errata 範圍）。
- **Risk：Lane B goal 缺失導致 completeOnboarding(undefined) 行為變** → Handle：Lane B 若 goal 未選仍以 `'health'` fallback（現 finish 已做）。
- **Risk：PartnerPage warmupCount 改 nonImported 後 quest 結算不一致** → Handle：settleAll 中 quest ctx 已取 nonImported 與 PartnerPage 同源（E15 已註）。兩者同步修改是 *對齊*，非新增行為。
