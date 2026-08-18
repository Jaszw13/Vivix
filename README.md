# Vivix — 把每一次訓練，變成看得見的進步。

> Vivix 服務「記錄新手」：雙 lane 初入健身房的訓練者（第一次系統記錄），或是從 Excel／其他 App 轉移的經驗記錄者（會練但沒系統記錄）。
> 完整記錄訓練、追蹤 PR 進度、熱量估算、有氧區、匯入歷史記錄、以及你的**個人訓練夥伴（Partner）陪伴系統**。

---

## ✨ 核心功能

- **新手 5×5 訓練計畫** — 每天內建 ≥3 組暖身項目，附完整動作教學與影片
- **力量訓練記錄** — 自動器械記憶、1RM 估算、PR 即時偵測
- **自訂動作** — 自由新增、編輯、分類；完整納入統計與成就
- **雙段 MET 熱量估算** — 依部位、完成組數、休息時長推估消耗熱量（±15% 區間）
- **有氧區** — 手動輸入機器數據（跑步機／階梯／橢圓機／腳踏車／划船），缺 kcal 自動 MET fallback
- **Partner 陪伴系統** — 解鎖你的訓練夥伴，每次完成訓練獲得 XP、解鎖外觀
- **成就系統** — 67 項成就（58 力量基礎 + 9 有氧）
- **統計報告** — 肌群圓餅、8 週體積曲線、有氧分鐘長條、力量 vs 有氧時間圓餅、總熱量卡
- **雙主題** — 工業電力（dark）· 高雅米白（light）
- **5 階段試用解鎖** — 2→4→8→15→31→永久天數，數字碼續用
- **PWA 離線可用** — 無需 App Store，iPhone Safari 加入主畫面即可
- **資料 100% 留在手機** — LocalStorage 持久化，不上傳任何伺服器

---

## 📦 技術堆疊

- **前端**：Vite + React 18 + TypeScript
- **狀態管理**：Zustand（persist + versioned migrate）
- **UI**：Tailwind CSS + lucide-react icons + Recharts
- **PWA**：vite-plugin-pwa（generateSW 模式）
- **圖表**：Recharts（肌群分佈、8 週體積、有氧分鐘、力量/有氧時間）
- **部署**：Vercel（免費）；Cloudflare Pages 替代（大陸備案）

---

## 🚀 快速開始

```bash
# 安裝
npm install

# 開發
npm run dev

# 建置（TypeScript + Vite build）
npm run build

# 預覽建置結果
npm run preview
```

---

## 📱 iPhone 安裝（PWA，免 App Store）

完整教學見 [INSTALL_IPHONE.md](./INSTALL_IPHONE.md)。

1. `git push` 到 GitHub → Import 到 Vercel
2. iPhone Safari 打開 Vercel 網址 → 分享 → 「加入主畫面」
3. 桌面出現 Vivix App 圖示，全螢幕啟動，離線可用

---

## 📁 專案結構（精簡）

```
src/
├─ data/
│  ├─ exercises.ts        內建動作資料庫
│  ├─ plans.ts            新手 5×5 計畫
│  ├─ achievements.ts     67 成就目錄（+9 cardio）
│  ├─ metTable.ts         MET 常數表（2024 Compendium）
│  └─ theme.ts            UI token（雙主題色盤、圖表色）
├─ features/
│  ├─ exercises/taxonomy.ts   分類權威
│  ├─ stats/
│  │  ├─ energy.ts        雙段 MET 熱量估算（純函式）
│  │  ├─ selectors.ts     統計權威（streak union、熱量分解）
│  │  └─ settleAll.ts     結算唯一入口（5 步固定順序）
│  ├─ achievements/       成就頁
│  └─ partner/            Partner 陪伴系統（engine + types + components）
├─ store/                 Zustand stores（persist + migrate）
│  ├─ workoutStore v8     力量 sessions + 自訂動作
│  ├─ cardioStore v1      有氧 sessions（原始事實）
│  ├─ achievementsStore v4
│  ├─ partnerStore / profileStore / themeStore / trialStore / ...
├─ pages/                 Dashboard／Workout／Progress／Achievements／Plans／Settings
├─ components/ui/Card.tsx Card、SectionHeader、StatTile、Badge
├─ utils/                 time.ts / format.ts 權威常數
└─ types/index.ts         Exercise／WorkoutSession／CardioSession／LiftFamily
```

---

## 🗂️ 文檔索引

| 文件 | 說明 |
|------|------|
| [CALORIE_MODEL.md](./CALORIE_MODEL.md) | 力量雙段 MET + 有氧 kcal 三態公式與誤差框架（E-D1~D6） |
| [DEV_RULES.md](./DEV_RULES.md) | 開發守則 L1~L4（持久化／派生／編排／遷移律）、決策 D1~D6 + E-D1~D6、Backlog |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 分層架構、權威模組、cardioStore、streak union、成就 +9 |
| [DATA_FLOW.md](./DATA_FLOW.md) | 訓練完成流程、熱量派生路徑、有氧 add/delete 結算流 |
| [REGRESSION_CHECKLIST.md](./REGRESSION_CHECKLIST.md) | 每次發布必跑的自動 + 手動回歸矩陣（含 §13 熱量/有氧 QA） |
| [INSTALL_IPHONE.md](./INSTALL_IPHONE.md) | iPhone PWA 安裝 + 部署到 Vercel 教學 |

---

## ⚠️ 絕對紅線（嚴禁違反）

**❌ 絕不修改任何 Zustand Store 的 `persist key`！**

底層 localStorage key 保持為舊品牌前綴 `ironpulse-*` 與 `vivix-*`，例如：

```
ironpulse-workouts    ironpulse-profile      ironpulse-theme
ironpulse-achievements ironpulse-trial
vivix-cardio-v1       vivix-equipment-memory vivix-* ...
```

- **目的**：舊用戶（安裝 Ironpulse PWA 的朋友）打開新 Vivix 網站時，本地數據能無縫讀取
- **原則**：只改「用戶與開發者看得見」的品牌名（UI、meta、文檔），絕不改底層數據存儲 key
- **參考**：[DEV_RULES.md §L1 持久化律](./DEV_RULES.md#l1持久化律persistence-law) 與 §L4 遷移律

---

## 🧪 Friend Beta 檢查清單

推送前必確認：
- [ ] `npm run build` 成功 + tsc 0 錯誤
- [ ] [REGRESSION_CHECKLIST §13](./REGRESSION_CHECKLIST.md) 所有 E-系列 QA 手動通過
- [ ] grep 守門矩陣全綠（86400000／toLocaleDateString／hex 散落／as any／非空斷言／熱量 persist 衛生）
- [ ] iPhone 舊資料（Ironpulse 時期）打開新 Vivix 網站後，訓練/設定/試用狀態全數保留

---

## 📮 反饋

App 內 → 「反饋」按鈕 → WhatsApp 預填訊息。
