# Vivix 產品路線圖

> 最後更新：2026-09-15（T18 審計後）
> 對應 DEV_RULES.md G-1 / J-1 決策記錄

---

## Stage 0 — Beta（就緒 ✅）

**定位**：PWA 行動優先、離線可用、本地優先、無後端。

**已完成**：
- 5×5 力量基礎 + PPL + 上下分裂 + 全身 3 天 + 上下 4 天（5 preset plans）
- 訓練迴圈（dock 計時 / mini bar / 替換 ≤10s）
- 月曆補錄 / 編輯 / 刪除 + settleAll
- Progress 4 子分頁 IA（總覽 / 力量 / 有氧 / 身體）
- BW 動作 reps 曲線（auto/weight/reps）
- 雙段 MET 熱量估算（力量 + 有氧 fallback）
- 身體組成雙 Y 軸圖
- 成就系統（58+ 既有 + cardio 新增）
- Partner XP / 形態解鎖
- 試用 4 階段鎖 + 續用碼
- Google Calendar 單向 template-URL 匯出（G-1）
- session.date 本地正午 ISO 歸一化（D-10）
- 統計搬遷 stats/selectors（B-01）
- Excel 矩陣 + CSV 貼上匯入
- 雙主題（Industrial Power / Elegant Beige）
- VitePWA autoUpdate + skipWaiting + clientsClaim
- 強制更新按鈕（清 SW cache + reload）

**守門狀態**：tsc 0 / build 成功 / hex gate 0 / as any 0 / 非空斷言 0

---

## Stage 1 — 功能擴充（規劃中）

**定位**：在現有 PWA 架構上增加功能，仍無後端。

| 項目 | 說明 | 決策 |
|------|------|------|
| Hevy/Strong JSON 匯入 | 他牌 JSON 格式匯入（J-1 延後項） | v1 僅 CSV + 矩陣；JSON 為 Stage 1 優先項 |
| 分享圖 | 訓練成果截圖分享（含品牌浮水印） | 純前端 Canvas 渲染 → toBlob → share API |
| Web Push 評估 | 評估 Notification API + Push Manager 可行性 | 需 Service Worker push 事件；iOS 限制多 |
| 計畫庫內容擴充 | 更多 preset（力量專項 / 減量 / 耐力） | 僅用 builtin 動作；結構對齊 schema |
| 週報匯出 | 將週報匯出為圖片或 PDF | Canvas → toBlob；無後端 |
| 統計圖表互動 | Tooltip 長按詳情、雙指縮放 | Recharts 自訂 Tooltip |

---

## Stage 2 — 原生封裝（遠期）

**定位**：Capacitor 包裝為原生 App；新增後端能力。

| 項目 | 說明 | 依賴 |
|------|------|------|
| Capacitor wrap | 將 PWA 包裝為 iOS/Android App | 不改前端架構；加 Capacitor 配置 |
| IAP（In-App Purchase） | 試用鎖改為原生 IAP 驗證 | 需後端 receipt validation |
| Live Activities | 訓練中 / 休息計時即時動態 | iOS 16.2+ ActivityKit |
| HealthKit opt-in | 讀取體重 / 心率（用戶明確授權） | 需 Capacitor HealthKit plugin |
| 雲同步 | 跨裝置資料同步 | 需後端 + 帳號系統 |
| GCal 雙向同步 | OAuth 2.0 雙向日曆同步（G-1 Stage 2） | 需後端 token 交換 |
| 分享深鏈 | 朋友分享訓練計畫 deep link | 需後端短鏈服務 |

---

## 決策記錄索引

| ID | 決策 | 階段 |
|----|------|------|
| G-1 | Google Calendar 單向 template-URL 匯出（Stage 0）；雙向同步（Stage 2） | Stage 0 ✅ / Stage 2 |
| J-1 | Hevy/Strong JSON 匯入延後；v1 僅 CSV + 矩陣 | Stage 1 優先 |
| D-10 | session.date 一律存本地正午 ISO | Stage 0 ✅ |
| B-01 | 統計邏輯搬遷至 stats/selectors.ts | Stage 0 ✅ |
