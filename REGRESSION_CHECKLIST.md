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
