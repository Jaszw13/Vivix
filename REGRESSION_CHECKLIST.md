# Vivix 回歸檢查清單（Phase C）

> 對應 Phase B 修復指示 v2.1 第 10 節。每次發布前必跑；任何一項失敗立即停工。

## 1. 自動化回歸（必過）

### 1.1 TypeScript

```bash
npx tsc --noEmit
```

- 期望：exit code 0，零錯誤
- C8 驗收：`grep "as any" src` = 0

### 1.2 Vite build

```bash
npx vite build
```

- 期望：`✓ built` + PWA `precache` 生成
- 當前：16 precache entries

### 1.3 守門 grep（全部必為指定結果）

| 檢查 | 指令 | 期望 |
|------|------|------|
| 時間常數 | `grep "86400000" src` | 僅 `utils/time.ts:6` |
| 日期格式 | `grep toLocaleDateString src/pages src/components` | 0 |
| hex 散落 | `grep "#[0-9A-Fa-f]{3,8}" src/components src/pages` | 0（data/theme.ts 除外） |
| as any | `grep "as any" src` | 0 |
| 死 export | `grep "STANDARDS_META\|TIER_STYLES\|groupAchievementsByCategory\|getNextAchievement" src` | 0 |
| 無消費端 flag | `grep "partnerQuestsEnabled\|warmupEnabled\|telemetryEnabled\|debugPanelEnabled" src` | 0 |
| 非空斷言 | `grep -rnE "(\w\|\)\|\])!(\.\|\)\|,\|;\|$)" src`（扣除純文字 false positive 如 `LEVEL UP!`） | 0 |

## 2. 功能回歸（手動）

### 2.1 休息計時（不可破壞）

- [ ] 完成一組 → 直接跳休息計時（像素與行為不變）
- [ ] 計時器背景執行可靠（timestamp-based）
- [ ] 播放/暫停鈕顏色正確（讀 `REST_TIMER_THEME.buttonFg`）

### 2.2 雙主題

- [ ] Industrial Power（dark）逐頁截圖比對零差異
- [ ] Elegant Beige（light）逐頁截圖比對零差異
- [ ] 主題切換即時生效
- [ ] Settings 主題預覽讀 `THEME_DEFINITIONS`

### 2.3 PWA 離線

- [ ] 首次載入後斷網可正常使用
- [ ] Service Worker 快取 16 entries
- [ ] iPhone 安裝後離線可用（注意：舊版可能需刪除重裝）

### 2.4 試用鎖

- [ ] 5 階段漸進解鎖（2→4→8→15→31→永久）
- [ ] 數字碼驗證正確
- [ ] persist key `vivix-trial-*` 不變
- [ ] 清除瀏覽器資料可重置（已知限制）

### 2.5 Onboarding

- [ ] 首次啟動進入 Onboarding
- [ ] 完成後 `onboardingCompleted = true`，不再重現
- [ ] 不干擾預設新手體驗

### 2.6 圖表

- [ ] Progress 頁圓餅圖正確（按肌群）
- [ ] 8 週體積曲線正確
- [ ] 週色盤讀 `CHART_WEEK_COLORS`
- [ ] 自訂動作納入統計

### 2.7 成就慶祝

- [ ] 一次 finish 只一批慶祝
- [ ] 已 unlocked 成就不消失（D2）
- [ ] 進度條 live 反映真實數據
- [ ] BW 軌成就：未填體重時鎖定 + 提示
- [ ] 力量軌成就：自訂動作指定 liftFamily 後正確歸入

## 3. S-01 自訂動作 PR 三連閉環（v1.2 情境 1-9）

### 3.1 補分類

- [ ] 未分類舊自訂動作補分類 `legs`
- [ ] 圓餅圖包含
- [ ] 曲線包含
- [ ] 8 週體積包含
- [ ] PR 列表包含
- [ ] 部位成就包含
- [ ] 報告包含

### 3.2 改分類

- [ ] `legs → core` 即時遷移無殘留
- [ ] 所有派生視圖即時更新

### 3.3 部位 scope

- [ ] 部位 scope 視圖顯示自訂 PR
- [ ] badge 正確

### 3.4 刪除自訂動作

- [ ] 已刪自訂動作的 PR 保留 snapshot 分類，不消失

## 4. streak 一致性（D1）

- [ ] 「昨天有練、今天未練」：Dashboard 與成就頁 streak 相同且 >0
- [ ] 斷 2 天：兩處同為 0
- [ ] questStore recompute ctx 同源

## 5. 去快取化驗收（C4 / D2）

- [ ] `grep persist partialize`：無衍生欄位被持久化
- [ ] 手造 sessions 刪除：PR / 成就進度 / 器械記憶即時一致下降
- [ ] 已 unlocked 成就不消失
- [ ] 慶祝流程由 settleAll 事件驅動，不依賴進度差

## 6. bodyWeight（D3）

- [ ] 未填體重：xBW 成就不觸發
- [ ] 未填體重：不顯示假數字
- [ ] 未填體重：AchievementsPage 顯示鎖定提示
- [ ] migrate：舊 `bodyWeight === 75` → `null`
- [ ] Settings 體重輸入空值設為 `null`

## 7. persist 衛生（C6）

- [ ] featureFlags migrate：舊 payload 缺欄位不 crash
- [ ] questStore migrate：舊 payload 不丟資料
- [ ] telemetryStore migrate：events 陣列型別安全
- [ ] 模擬 3 store 舊 payload：migrate 後不丟資料、不 crash

## 8. mobile-app（D4）

- [ ] 新裝見空狀態（非他人資料）
- [ ] `FROZEN.md` 存在
- [ ] 不再加功能

## 9. UI Token（C7）

- [ ] 雙主題逐頁截圖比對零差異
- [ ] RestTimer 行為與像素零變化
- [ ] grep hex 於 components/pages = 0

## 10. 整合矩陣

| 路徑 | 既有資料 | 新資料 | legacy 行 |
|------|---------|-------|----------|
| PR 列表（builtin + custom） | ✓ | ✓ | ✓（snapshot 兜底） |
| 成就進度 | ✓ live | ✓ live（+9 cardio_* 成就） | ✓ |
| 圓餅/曲線/體積 | ✓ | ✓ | ✓ |
| 部位成就 | ✓ | ✓ | ✓ |
| 報告 | ✓ | ✓（新增熱量卡＋有氧分鐘長條＋有氧vs力量圓餅） | ✓ |
| streak | ✓ | ✓（union：力量日 ∪ 有氧日） | ✓ |
| 器械記憶 | ✓ 派生 | ✓ 派生 | ✓ |
| 有氧列表 + 刪除 | — | ✓（cardioStore 事實） | —（新功能） |

## 11. 收斂驗收（scorecard 八維度全 ≥4）

| 維度 | 目標 | 當前 |
|------|------|------|
| 功能一致性 | ≥4 | ✓（S-01 三連閉環） |
| 數據一致性 | ≥4 | ✓（去快取化 + 派生） |
| 代碼衛生 | ≥4 | ✓（dead code / as any = 0） |
| 持久化衛生 | ≥4 | ✓（L1 partialize + migrate） |
| 編排可測 | ≥4 | ✓（L3 settleAll 固定順序） |
| UI 一致性 | ≥4 | ✓（theme.ts token 收編） |
| 型別安全 | ≥4 | ✓（tsc 0 錯誤） |
| 離線/PWA | ≥4 | ✓（16 precache） |

## 12. Phase C 交付物

- [x] ARCHITECTURE.md
- [x] DATA_FLOW.md
- [x] DEV_RULES.md（含 L1-L4 + D6 + E-D1~D6）
- [x] REGRESSION_CHECKLIST.md
- [x] CALORIE_MODEL.md（E 系列新增：公式、MET 表、誤差框架、E-D1~D6）

## 13. 熱量估算 + 有氧區 QA（E 系列 v3.0）

### 13.1 energy / E-1 力量熱量（雙段 MET）

- [ ] **Sanity 例**：70kg、腿日（legs MET=6.0）60 分 session、休息 20 分 → `≈ 322 kcal（約 274–370）`（±1 四捨五入可接受）
- [ ] **E-D2 鎖定**：bodyWeight null → WorkoutSummary 熱量卡顯示「輸入體重解鎖」提示、不顯示假數字、Progress 熱量圖不 crash
- [ ] **timestamp fallback**：舊 session（startedAt/finishedAt 皆 null）→ 用 `completedSets × 40s` 算 activeH，不 crash、有合理 kcal 區間
- [ ] **部位加權**：胸 10 組 + 腿 5 組 session → activeMET ≈ (5×10 + 6×5)/15 = 5.33（接近 chest 主導，非腿 6.0）
- [ ] **restSeconds 缺**：動作計劃 restSeconds 缺 → fallback 90s，正確計入 restH

### 13.2 cardio / E-2 有氧區

- [ ] **addCardio 事實持久化**：加 30 分跑步機、kcal 250 → cardioSessions 寫入、刷新頁面仍在（persist `vivix-cardio-v1`）
- [ ] **E-D3 streak union**：當日無力量、僅有上面這筆有氧 → Dashboard streak tile 不為 0、AchievementsPage streak 同源
- [ ] **總熱量合併**：報告 / Progress 總熱量 = 力量 kcal（推估）+ 250（機器），附免責小字
- [ ] **E-D5 MET fallback（有體重）**：加 30 分跑步機（不填 kcal）+ bodyWeight=70kg → `≈ 7.0 × 70 × 0.5 = 245 kcal（推估值）`
- [ ] **E-D5 雙 null（無 kcal + 無體重）**：加 30 分跑步機（不填 kcal）+ bodyWeight=null → 該筆有氧顯示 `—` + 提示
- [ ] **deleteCardio 即時反應**：刪除上述有氧 → cardioMinutesTotal / cardioSessionsTotal 下降、streak 可能下降（live）；已 unlocked 成就不消失（D2）
- [ ] **cardioStore migrate（舊 payload）**：空陣列 / 缺 createdAt / 缺 kcal → migrate 後不 crash、不丟有效資料、型別正確
- [ ] **E-D4 Partner XP**：同一天加兩筆有氧 → settleAll 只給 20 XP（每日上限 1 次）；Partner `totalWorkouts` 不計入這筆（仍只算力量 session）

### 13.3 成就 / E-05 +9

- [ ] **舊 58 不動**：`git diff` achievements.ts 中既有 58 個 threshold/copy/id 差異 = 0
- [ ] **cardio_first t1**：加 1 筆有氧（10 分）→ 解鎖「有氧初體驗」
- [ ] **cardio_min t1~t5**：累積 30/60/120/300/600 分 → 依序解鎖、進度條 live（刪除後進度可下降，仍 D2 永久 unlockedAt）
- [ ] **cardio_sess t2~t3**：累積 10/25 次 → 解鎖
- [ ] **cardio_weekly t2**：連續 4 週每週至少 1 次 → 解鎖；中斷 1 週 → 重置
- [ ] **一次一批慶祝**：一次加 200 分有氧（同時跨 min 多階梯）→ 單一批次彈出所有解鎖，不重複批次

### 13.4 回歸（regression matrix，零變化保證）

- [ ] 休息計時：完成一組 → 直接跳休息計時（像素與行為零變化）
- [ ] 雙主題：Industrial Power / Elegant Beige 兩主題切換正常，有氧卡片/熱量卡色 token 來自 theme.ts
- [ ] PWA 離線：首次載入後斷網，有氧列表、新增、刪除、熱量圖皆可用（service worker 快取）
- [ ] 試用鎖：5 階段解鎖（2→4→8→15→31→永久）未受有氧功能影響；未達標時「記錄有氧」入口按既有 trial 規則顯示

### 13.5 自動化守門（發布前必過，零容忍）

- [ ] `npx tsc --noEmit` → exit code 0，零錯誤
- [ ] `npx vite build` → ✓ built + PWA precache entries（≥ 16，E 系列不改 SW 設定）
- [ ] 既有 grep 守門矩陣（§1.3）全綠：
  - 時間常數 86400000 僅 utils/time.ts
  - toLocaleDateString 於 pages/components = 0
  - hex 散落於 components/pages = 0
  - `as any` = 0
  - 死 export / 無消費端 flag = 0
  - 非空斷言（扣除 LEVEL UP! 等純文字）= 0
- [ ] **熱量 persist 衛生（L1 新守門）**：
  - `grep -rn "kcal\|Kcal\|KCAL" src/store` → 僅 cardioStore 內出現（作為 CardioSession.kcal 事實欄位；不含 energy 推估值）
  - 搜尋 `partialize`：無 store partialize 包含 strengthKcal / cardioKcal（非輸入）/ low / high / activeMin / restMin / isFallback
  - achievements / partner / quest / workout / profile / theme / trial / telemetry store 中 grep：無任何 kcal/low/high activeMin/restMin 衍生欄位被 persist

### 13.6 Telemetry（E-06）

- [ ] addCardio 成功 → events 存在 `cardio_session_added`
- [ ] deleteCardio 成功 → events 存在 `cardio_session_deleted`
- [ ] 開啟 WorkoutSummary 熱量卡（有 bodyWeight）→ events 存在 `strength_ee_viewed`
- [ ] 開啟 WorkoutSummary 熱量卡（bodyWeight null，顯示 E-D2 提示）→ events 存在 `strength_ee_locked_prompt_shown`
- [ ] addCardio 未填 kcal 且 bodyWeight 有值（走 MET fallback）→ events 存在 `cardio_fallback_used`

## 14. 定位重定義 + 歷史匯入 v2.1（雙 lane + Import v1，Errata E1–E15 合併）

對應《Vivix 定位重定義＋歷史記錄匯入 一次性執行規格 v2（AI Agent 版）＋Errata v2.1》驗收矩陣。任何一項失敗 → 立即停工回報。

### 14.1 Lane 分流與文案（L0 定位律）

- [ ] **Lane A 零改動（E7）**：Onboarding 選擇 `第一次進健身房` 後續 steps 序列（welcome → partner → goal → recommend → tutorial）與改動前完全一致（陣列成員、render 內容比對零 diff）
- [ ] **Lane B 雙支線**：`有在練，但還沒系統記錄` → partner → plan-freq-chips → recommend → tutorial；`用 Excel／其他 App 記錄過` → partner → import-wizard（可跳過）→ plan-prompt（有匯入用 8 週平均、無匯入用 chips）→ recommend → tutorial
- [ ] **Chips 四選公式（E5）**：chips 1 次/週 → 5×5；2 次/週 → 上下分裂；3-4 次/週 → PPL；5+ 次/週 → PPL
- [ ] **8 週頻率公式（E5）**：匯入 session 在 56 天內的每週平均套同 chips 公式（≥5→PPL，3-4→PPL，2→上下，≤1→5×5）
- [ ] **中性措辭守門**：`grep -rn "健身新手" src` = 0；UI 文案使用「你 / 訓練者」；Lane A 用「帶你練」語氣；Lane B 用「幫你記得 / 承認你的過去」語氣

### 14.2 矩陣模式（matrixParser.ts，Excel TSV）

- [ ] 真實 2026-07-11 block 向量 → 1 session，日期 `2026-07-11`，notes 含「Deadlift腰弓嚴重…」
- [ ] Deadlift：8 sets（20×5, 30×5, 40×5, 50×4, 60×3, 60×3, 60×3, 60×2），Load 交叉驗證 Σ = 1310 ±1
- [ ] Overhead press：3 sets（20×5×3），Σ = 300 ±1
- [ ] Bulgarian Squat：`2*6` × 2 欄 → 4 sets × 6 × 25kg = 600 ±1
- [ ] Hip Abduction 3 sets Σ = 476 ±1；Hip Addcution 3 sets Σ = 266 ±1
- [ ] **多行 Feedback 向量（E2）**：含引號跨行 cell（`"Feedbck: 一行\n第二行"`）→ notes 同時保留兩行；同日重複 Feedback cell 被去重（E6）
- [ ] **規則守門（E6）**：Weight marker 存在但 Reps marker 缺失 → 丟棄（不產出 sets）；name 空白 → skip；VBT marker（MV/PV/DISP/PP/V-Loss）→ 丟棄、不入 notes
- [ ] **quote-aware 行分割（E2）**：共用 `splitQuoteAware`；引號欄位正確（欄數 / cell 內容無截斷）

### 14.3 表格模式（csv.ts，簡易 CSV）

- [ ] BOM（`\uFEFF`）/ CRLF / 引號 cell：全部正確 parse 且行/欄數正確
- [ ] 日期四格式（YYYY-MM-DD / YYYY/MM/DD / DD/MM/YYYY / MM/DD/YYYY）→ Step1 日期格式選擇器可切換，輸出 ISO 正確
- [ ] `220 lb` → weight ≈ 99.792 kg（lb × 0.4536）；單位切換 kg/lb 生效
- [ ] skipped 行統計正確（空行、缺必要欄位）
- [ ] **範本 CSV 下載（E13）**：Step1 提供「範本下載」按鈕；前端 `URL.createObjectURL(buildTemplateBlob())` 可下載，內容為 `date,exercise,weight_kg,reps` + 2 行範例

### 14.4 動作映射 Step2（fuzzy + 新建自訂）

- [ ] **Fuzzy token 級（E1）**：normalize = lower + 去 ASCII 標點 + 分詞；overlap ≥ 1 或 Levenshtein ≤ 2 → 推薦。例：`overhand press` → Overhead Press（pass=true）
- [ ] **新建自訂分類必填（E14）**：MuscleGroup 未選 → CTA disabled；選後才允許建立；成功即加入 dropdown mapping
- [ ] **預覽 Step3**：N sessions、M unique exercises、日期區間、總噸數、skipped 行數、Load warnings 列表正確；|Σ-Load| > 1 顯示 warning（不阻斷）

### 14.5 寫入與 imported 整合（I-3 / I-4 / I-6）

- [ ] imported session：`imported === true`、`startedAt === null`、`finishedAt === null`、所有 sets `completed === true`、notes=feedback 合併
- [ ] **單次批次 set()（E12）**：workoutStore `importSessionsBatch` 或 `set({sessions: [...old, ...new]})` 僅 call 一次；禁止逐 session push
- [ ] **ID 統一 generateId（E3）**：`grep -rn "nanoid" src` = 0；所有 session/exercise/set ID 來自 `src/utils/workout.ts generateId`
- [ ] **PR 列表 / 圓餅 / 8 週體積 / 器械記憶**：匯入 session 被正確包含（I-3）
- [ ] **streak union**：匯入的訓練日與 cardio 日仍計入 streak（I-3，D1 語義不變）
- [ ] **刪 imported session**：live 進度（PR 數 / streak / weekMap 進度）即時下降；已解鎖成就仍在（D2）

### 14.6 RecognitionModal 與結算（I-5，E8/E11/E13）

- [ ] **Settings 匯入入口存在（E13）**：Settings 頁「資料」區塊有按鈕 `匯入歷史記錄`；點擊即開啟 ImportHistoryModal（對齊 onboarding 匯入 wizard 共用元件）
- [ ] **每批次一次儀式（E8）**：連續匯入兩批 → RecognitionModal 各彈一次（非 ever-once）
- [ ] `settleAll` opts：`{ silent: true, skipPartner: true }`；silent 不 push 慶祝 queue / toast；skipPartner 不 addXp / form unlock
- [ ] **CTA 使用現有導航（E11）**：RecognitionModal「查看成就牆 / 開始今天訓練」CTA 使用應用既有導航機制（非字面 '/achievements' 字串硬接）
- [ ] 批次卡片數字正確：X sessions / Y unique days / Z PR diff / W newly unlocked achievements / T total tonne
- [ ] `import_first`：匯入後永久解鎖；刪除所有 imported 後成就仍在

### 14.7 Partner 與熱量分離規則（I-4 / I-6，E10/E15）

- [ ] `partnerStore.getTotalWorkouts()` = `sessions.filter(s => s.imported !== true).length`；加入 5 imported session → getTotalWorkouts 回傳值未增加（I-4）
- [ ] settleAll skipPartner=true 前後：Partner XP、unlockedFormIds 零變化
- [ ] **energy.ts 首行 guard（E10）**：`if (session.imported === true) return null`；非 imported session 仍走原雙段 MET + timestamp fallback
- [ ] Progress 熱量區附註「匯入記錄不計入熱量估算」chip 存在（I-6 註記）
- [ ] **兩種 totalWorkouts 語義對應（E15）**：DEV_RULES / DATA_FLOW 文字完全一致；成就用=sessions.length；Partner 用=`sessions.filter(s => s.imported !== true).length`

### 14.8 Telemetry（R-5 四事件）

- [ ] ImportHistoryModal 首次 open → `import_started` 出現在 telemetryStore.events
- [ ] Confirm CTA → `import_completed{mode, sessions, exercises, skipped}` 記錄
- [ ] 未 Confirm 就關閉（step<3 或 text 空）→ `import_cancelled` 記錄
- [ ] Onboarding StepExperience 三選項 → 各有 `onboarding_experience_selected{level: 'beginner'|'experienced'}` call path

### 14.9 零變化保證（NOREG）

- [ ] `src/components/workout/RestTimer.tsx` git diff = 0
- [ ] `src/store/themeStore.ts` git diff = 0（E9 AC-NOREG）
- [ ] `src/store/trialStore.ts` git diff = 0
- [ ] 現有 67 成就（58 力量 + 9 cardio）id / threshold / copy：**git diff src/data/achievements.ts 僅新增 metric union 擴充 + import_first**，其餘 67 定義零變更

### 14.10 構建守門（AC-BUILD / E9）

- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npx vite build` → ✓ built 成功，**PWA precache entries ≥ 16**（E9 刪括號，改 ≥ 16）
- [ ] 無新 dependencies（package.json dependencies/devDependencies 長度未擴增；禁 xlsx / papaparse / nanoid）
- [ ] `mobile-app/`：完全未修改（FROZEN.md 合規）

## 15. 用戶回饋 v1 回歸（T1–T6）

對應《Vivix 用戶回饋整合 v1.docx》驗收矩陣。

### 15.1 T1 試用 4 階段

- [ ] `trialStore` version === 6；STAGES 長度 = 4（1/7/30/永久）
- [ ] stage 0 免碼直接升級；redeemCode 正確推進階段
- [ ] 舊用戶（v5 5階段）migrate 後正確對應新 4 階段

### 15.2 T2 0kg + 次數 PR + planSnapshot

- [ ] 重量輸入可為 0（ExerciseSetList / AddExerciseSheet `min=0`）
- [ ] 引體上升 weight=0 × 12 reps → PR 顯示「BW × 12」
- [ ] 同動作下次做 15 reps → PR 更新為 15
- [ ] weighted 與 bodyweight PR 獨立計算（key 加 `-bw` 後綴）
- [ ] Dashboard top 5 PR 排除 weight=0（避免混淆 1RM 排行）
- [ ] 既有 weighted PR 不消失（migrate 保留）
- [ ] `WorkoutSession.planSnapshot` 欄位存在；startSession 寫入 `{ planId, dayId, dayName }`

### 15.3 T3 計時器架構

- [ ] 完成一組 → 底部 sticky card 自動開始計時
- [ ] ±15s / 暫停 / 繼續正常
- [ ] 離開 Workout 頁 → 底部顯示 mini bar
- [ ] 點擊 mini bar「返回訓練」→ 回到 Workout 頁
- [ ] 音效 / 震動保留（timerFeedback.ts）
- [ ] 最後 3 秒預熱保留
- [ ] `restTimerStore` 不 persist；timestamp-based

### 15.4 T4 破 PR 兩層慶祝

- [ ] 破 PR 時 set 行顯示 🎉 + confetti 動畫 1.5s
- [ ] 動畫結束後消失，不影響後續操作
- [ ] WorkoutSummary 顯示新紀錄卡（old → new）
- [ ] telemetry 記錄 `pr_celebrated` 事件（settleAll 第 5 節）
- [ ] 一次 finish 仍只一批成就慶祝（L3 不破）
- [ ] `silent: true` 時不觸發 pr_celebrated

### 15.5 T5 週報

- [ ] 新週首次打開 → 自動彈出上週報告（僅當上週 ≥1 session）
- [ ] 報告內容：次數／天數／噸數／vs 上週 %／PR／成就／streak／Partner 一句話
- [ ] Partner 文案規則正確（休息週不羞辱）
- [ ] 關閉後本週不再彈（weeklyReportSeenWeek persist）
- [ ] Progress 可回看歷週（‹ › 導覽）
- [ ] `computeWeeklyReport` 純函數；不 persist 衍生數據

### 15.6 T6 月曆

- [ ] 月曆正確顯示（含閏年／月份切換）
- [ ] 已練日期顯示 accent 點
- [ ] 今天顯示 ring
- [ ] 點擊某天 → sheet 顯示：計畫日名 or「自由訓練」or「歷史記錄」+ 動作 chips + 總噸數 + PR 數
- [ ] imported session 顯示「歷史記錄」
- [ ] 舊 session（無 planSnapshot）顯示「自由訓練」

### 15.7 全局守門（AC）

- [ ] AC-T1: trialStore version === 6；STAGES = 4
- [ ] AC-T2: PersonalRecord 有 repPR?；getSessionPRs 分兩路
- [ ] AC-T3: restTimerStore 存在；不 persist；timestamp-based
- [ ] AC-T4: ExerciseSetList 有 confetti；WorkoutSummary 有新紀錄卡
- [ ] AC-T5: profileStore.weeklyReportSeenWeek 存在；computeWeeklyReport 純函數
- [ ] AC-T6: WorkoutSession.planSnapshot 可選；TrainingCalendar 元件存在
- [ ] AC-BUILD: tsc 0 errors；vite build 成功；precache ≥ 16
- [ ] AC-NOREG: 休息計時行為（auto-start/±15s/暫停/音效）零變化
- [ ] AC-GREP: `grep "as any" src` = 0；`grep "#[0-9a-f]{6}" src/components` = 0；非空斷言 = 0

## 16. 訓練最小化/放棄分流＋日曆計畫日顯示（T7）

### 16.1 交通燈（Workout 頁右上角）

- [ ] 右上角有兩個圓形小按鈕：amber「–」最小化 + red「×」關閉
- [ ] 按「–」→ 回主控台，**無 dialog**；activeSession 保留；計時繼續
- [ ] 按「–」後 mini bar 顯示「訓練進行中」
- [ ] 按「×」→ 彈放棄確認「放棄這次訓練？記錄將不會儲存。」
- [ ] 確認放棄 → session 清空 + restTimerStore.cancel() + 回主控台
- [ ] 取消防棄 → 不動
- [ ] hex 色在 `data/theme.ts` `TRAFFIC_LIGHTS`（兩主題共用）

### 16.2 MiniTimerBar 放棄入口

- [ ] bar 右上角有小 X 按鈕（auxiliary 色）
- [ ] 按 bar 本體 → 回訓練頁（行為不變）
- [ ] 按小 X → 彈同一放棄確認；確認 → clearActiveSession + cancelTimer + bar 消失

### 16.3 日曆 date key 修復

- [ ] 今天完成訓練 → 今天格子立即亮起（root cause: session.date 為 ISO timestamp，格子 key 為純日期；改用 dayKey 歸一化）
- [ ] sessionMap key = `dayKey(new Date(s.date))`
- [ ] 格子 key = `dayKey(new Date(year, month, day))`
- [ ] 同天多 session → 取最後一筆

### 16.4 日曆計畫日縮寫

- [ ] 訓練日格子在日期數字下方顯示 9px 縮寫
- [ ] planSnapshot dayName 首字為「推/拉/腿」→ 顯示該單字
- [ ] 其他 dayName → 前兩字
- [ ] 無 planSnapshot 且非 imported → 「自由」
- [ ] imported → 「歷史」
- [ ] 保留 accent 底色 + 今天外框

### 16.5 日曆 tap sheet

- [ ] 點訓練日 → sheet 顯示 plan day 全名（或自由訓練/歷史記錄）
- [ ] sheet 含動作 chips + 總噸數 + PR 數

### 16.6 全局守門

- [ ] AC-T7: TRAFFIC_LIGHTS 在 theme.ts；Workout 有兩按鈕；MiniTimerBar 有 X
- [ ] AC-T7-CALENDAR: sessionMap 用 dayKey；格子用 dayKey；有縮寫
- [ ] AC-BUILD: tsc 0；vite build 成功
- [ ] AC-GREP: `grep "#[0-9a-f]{6}" src/components` = 0
- [ ] AC-NOREG: auto-start 休息計時不破壞

## 17. 回饋整合 v2（T7–T9）

### 17.1 計畫編輯器重構＋器械檔案（T7）

- [ ] PlanDetail 連續打 20 字不閃爍不刷新（local draft state）
- [ ] blur 後重載顯示已存值
- [ ] 打字期間 localStorage 寫入次數不增加
- [ ] data/equipment.ts ≥24 項，每項含 category + muscleGroups
- [ ] getEquipmentByCategory / getEquipmentTypesForIds 有消費端（dead-export grep = 0）
- [ ] Settings「我的健身房器材」多選 chips 按category 分組
- [ ] 選擇後重載仍在；空狀態有引導文案
- [ ] profileStore v5 migrate v4→v5 補 gymEquipmentIds=[]
- [ ] PlanDetail「新增動作」sheet 預設只顯示我的器材
- [ ] toggle 可顯示全部
- [ ] 替換 sheet 排序：同肌群＋我的器材優先
- [ ] 「我的健身房」badge 正確顯示
- [ ] 依我的器材一鍵產生計畫：產出只含我的器材或 ⚠ 標記
- [ ] ⚠ 標記的動作可手動替換
- [ ] 不影響 planSnapshot 機制

### 17.2 身體組成追蹤（T8）

- [ ] bodyMetricsStore persist key = vivix-body-metrics-v1
- [ ] migrate unknown + guard（壞 localStorage fallback 預設）
- [ ] addMetric / updateMetric / deleteMetric / getLatest / getSorted
- [ ] Progress 身體組成 section：表單 modal 日期預設今天、4 欄選填 ≥1
- [ ] Recharts LineChart 雙 Y 軸（左 kg：體重/肌肉/脂肪量；右 %：體脂）
- [ ] delta tile（最新 vs 最早，↑↓ 用 accent/secondary，無羞辱文案）
- [ ] 新增 → 圖表與 delta 即時更新
- [ ] 重載仍在；刪除同步
- [ ] 空狀態友好
- [ ] T8-3 Dashboard chip SKIP（已註明）

### 17.3 歷史追蹤直接補錄（T9）

- [ ] TrainingCalendar 空過去日格子可點擊 → 開 DaySessionEditor（補錄模式）
- [ ] 空過去日建立 → 月曆該格亮起（accent bg + 「自由」縮寫）
- [ ] 日 sheet「編輯這天訓練」按鈕 → 開 DaySessionEditor（跨輯模式）
- [ ] 跨輯模式預填正確（existingSession.exercises 深拷貝）
- [ ] 動作選擇 allExercises 含自訂、預設我的器材過濾
- [ ] 每動作組數行 weight/reps 增減 + 增減組 + 刪除動作
- [ ] 取消零寫入（不呼叫 store action）
- [ ] 儲存時所有組 completed=true
- [ ] addPastSession / updatePastSession / deletePastSession 存在
- [ ] sessions 保持日期排序
- [ ] planSnapshot = null（月曆顯示「自由訓練」）
- [ ] imported = false（手動補錄非匯入）
- [ ] store 內不 settle（L3：settleAll 僅出現在註解）
- [ ] personalRecords 由 subscribe 自動重算
- [ ] 刪除帶 confirm（window.confirm）
- [ ] 儲存後 settleAll(undefined, { silent: true })
- [ ] toast「已同步：連續 X 天」
- [ ] 補錄填補斷層日 → streak 正確 +N
- [ ] 補錄破 PR 級組數 → PR 列表包含
- [ ] 刪除 → 派生視圖回退但已 unlocked 成就仍在（D2）
- [ ] T9-4 ImportHistoryModal 統一寫入路徑 SKIP（已註明）

### 17.4 全局守門（T10）

- [ ] AC-T10-TSC: tsc 0
- [ ] AC-T10-BUILD: vite build precache ≥16
- [ ] AC-T10-ASANY: grep "as any" src = 0
- [ ] AC-T10-HEX: grep "#[0-9a-f]{6}" src/components src/pages = 0
- [ ] AC-T10-NONNULL: grep "!\." src（非空斷言） = 0
- [ ] AC-T10-DEADEXPORT: dead-export grep = 0
- [ ] AC-T10-DOCS: DEV_RULES / ARCHITECTURE / DATA_FLOW / REGRESSION_CHECKLIST 四文件已更新
- [ ] AC-T10-COMMIT: commit + push（排除 .docx）

## 18. 排版矩陣（v3.0，Shell + Progress IA + Charts）

### 18.1 Global Shell

- [ ] PageShell header：`bg-bg-primary` 不透明、`z-30`、`border-b border-border/40`、無 backdrop-blur
- [ ] 內容滾動至 header 下方：header 純色無糊影
- [ ] 所有頁面 main：`pb-32`（showNav=true 時）
- [ ] Progress / Dashboard 滾到底：最後一張卡完整可見於浮動 BottomNav 之上
- [ ] 無頂部 gradient/glow 滲入 header 區域

### 18.2 Progress IA（子分頁）

- [ ] segmented control：總覽／力量／有氧／身體，預設總覽
- [ ] 切換分頁時 scroll 回頂
- [ ] 總覽：月曆 → 歷週報告入口 → 累積數據 StatTile → 總熱量卡 → 有氧 vs 力量 donut
- [ ] 力量：檢視範圍 chips → 部位摘要 → PR 列表 → 重量曲線 → 訓練量 bar + 部位體積比較
- [ ] 有氧：每週有氧分鐘 bar → 有氧紀錄 list + 新增按鈕
- [ ] 身體：身體組成（entry + 雙 Y 軸圖 + delta tiles + 紀錄 list）
- [ ] donut 只出現在總覽；有氧紀錄 list 只在有氧頁；累積總熱量只一次（總覽）
- [ ] 檢視範圍 chips 只影響力量頁 PR/曲線/訓練量

### 18.3 Chart 裁切（全部 Recharts 實例）

- [ ] 所有 `<YAxis>`：`width={36}`、`tick fontSize 10`、`tickMargin={4}`
- [ ] 所有 chart margin：`{ left: 4, right: 8, top: 8, bottom: 0 }`
- [ ] ResponsiveContainer 高度：bar 220 / line 220 / donut 200
- [ ] donut outerRadius ≤ 短邊/2 − 8，環不被 card 邊界切
- [ ] 每週有氧分鐘 bar：過去週 = accent、本週 = auxiliary
- [ ] 有氧 bar 右上 badge 含「本週」文字（「本週累計 X 分」）
- [ ] X 軸 label fontSize 10；bar 圖 `interval={0}` 僅當 ≤8 label

### 18.4 Dashboard

- [ ] 同 shell 修復（header 不透明 / pb-32）
- [ ] 累積數據 StatTile：3 欄 grid + divider、數字 font-mono text-2xl
- [ ] 滾到底無 BottomNav 遮蔽

### 18.5 雙主題 + 守門

- [ ] Industrial Power / Elegant Beige 逐頁零差異
- [ ] `tsc --noEmit` → 0 errors
- [ ] `vite build` → 成功，precache ≥ 16
- [ ] hex gate：`grep "#[0-9A-Fa-f]{3,8}" src/components src/pages` = 0
- [ ] `as any` = 0；非空斷言 = 0

### 18.6 既有功能零回歸

- [ ] 月曆補錄（DaySessionEditor）正常
- [ ] 歷週報告彈窗正常
- [ ] 身體組成新增/刪除/圖表正常
- [ ] PR 計算正確
- [ ] 訓練中替換動作 ≤ 10 秒
