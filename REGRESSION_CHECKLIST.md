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
| 成就進度 | ✓ live | ✓ live | ✓ |
| 圓餅/曲線/體積 | ✓ | ✓ | ✓ |
| 部位成就 | ✓ | ✓ | ✓ |
| 報告 | ✓ | ✓ | ✓ |
| streak | ✓ | ✓ | ✓ |
| 器械記憶 | ✓ 派生 | ✓ 派生 | ✓ |

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
- [x] DEV_RULES.md（含 L1-L4 + D6）
- [x] REGRESSION_CHECKLIST.md
