# Vivix 成就系統設計文件 v1.4

## 概述

既有 **67 個成就（58 力量基礎 + 9 有氧）**，加上 1 個匯入行為成就 `import_first`，共四軌 × 五級，分部位計算，貼合雙主題設計語言。**既有 67 個成就的 id / threshold / copy 零變更**，只追加新 metric（`sessions_imported_total`）與 `import_first`。

## Lane B 認可哲學（R-0 定位律）

Vivix 的成就系統同時對雙 lane 成立：
- **Lane A（教練流）**：成就為「從零開始」的梯度 — 第一次進健身房、第一組、第一個 1RM。
- **Lane B（經驗記錄者）**：成就不強迫你從零 — 匯入 v1 將你的 Excel 過去視為合法歷史，**匯入的 session 計入 PR 清單、streak、部位成就、節奏成就**（I-3，統計／成就 totalWorkouts 語義）。匯入完成後顯示「認可儀式」（RecognitionModal，每批次一次），你的過去被系統承認，之後才是「現在起繼續推進」。

兩者共同點：**成就解鎖是永久的**（D2），刪除 imported session 只讓 live 進度條下降，已經解鎖的成就仍然在。

## 設計原則

1. **讀取時派生**：所有 progress / report / achievement 一律讀取時派生，不寫死在記錄時
2. **純函數引擎**：`computeMetrics(ctx)` 為 pure function，輸入 raw data 派生所有 metric
3. **分部位**：自訂動作分類後自動計入（P-01 回寫）
4. **首 session 保證 ≥2 解鎖**：第一步 (`sess_t1`) + 熱身先鋒 (`warm_t1`)

## 四軌設計

### 力量門檻軌 (strength) — 20 個
四大項（臥推/深蹲/硬舉/肩推）× 五級（T1-T5），門檻來自 `strengthStandards.ts`。
- T1-T3：絕對重量（plate 文化門檻：60/100/140/180kg）
- T4-T5：體重比（intermediate→advanced 區間）

### 堅持節奏軌 (consistency) — 17 個
累計訓練次數、連續天數、週節奏、部位覆蓋。

### 自我超越軌 (progress) — 13 個
分部位 PR、六線突破、1RM 進步幅度、訓練量上升曲線、單場三響。

### 行為掌握軌 (behavior) — 7 個
熱身完成、完整完成計畫、完美記錄、探索者。

## 力量標準引用

| 成就 ID | 門檻 | 來源 |
|---------|------|------|
| bench.t3 | 100kg | ExRx Intermediate 85kg@75kg BW；plate 文化門檻 100kg |
| bench.t4 | 1.25×BW | ExRx Intermediate 1.25×BW (male) |
| bench.t5 | 1.5×BW | ExRx Intermediate→Advanced 過渡區 |
| squat.t3 | 140kg | ExRx Intermediate 130kg@75kg → plate 門檻 140kg |
| squat.t4 | 1.5×BW | ExRx Intermediate 1.5×BW (male) |
| squat.t5 | 2×BW | ExRx Advanced 2×BW (male) |
| deadlift.t3 | 180kg | ExRx Intermediate 150kg@75kg → plate 門檻 180kg |
| deadlift.t4 | 2×BW | ExRx Intermediate 2×BW (male) |
| deadlift.t5 | 2.5×BW | ExRx Advanced 2.5×BW (male) |
| ohp.t4 | 0.75×BW | ExRx Intermediate 0.75×BW (male) |
| ohp.t5 | 1×BW | ExRx Advanced 1×BW (male) |

完整來源見 `src/data/strengthStandards.ts` 的 `STANDARDS_META`。

## Tier 視覺樣式

| Tier | 名稱 | 色值 | 語意 |
|------|------|------|------|
| T1 | 石 | #8A8F98 | 起步 |
| T2 | 銅 | #B0805A | 入門 |
| T3 | 銀 | #C0C6D1 | 進階 |
| T4 | 金 | #C9A24B | 高手 |
| T5 | 電 | 主題電光 | 畢業 |

T5 在深色主題用琥珀電光，淺色主題用深金。

## UX 法則

1. **永遠顯示「下一個最近成就」**＋進度%（目標梯度）
2. **慶祝帶數字＋時間軸**，≤3 秒可跳過
3. **未解鎖 = 「挑戰清單」**，不用灰階羞辱
4. **中斷零懲罰**；streak 一次性 shield
5. **文案資訊性、不控制**（不寫「你必須」）

## 檔案結構

```
src/data/
  achievements.ts          # 既有 67（58 力量 + 9 有氧）+ import_first 成就定義
  strengthStandards.ts    # 力量標準查證資料
src/store/
  achievementsStore.ts    # 成就引擎 (computeMetrics, currentOf switch sessions_imported_total 分支)
  plansStore.ts           # 計畫編輯器 store (T-05)
src/features/achievements/
  AchievementsPage.tsx    # 主頁面
  engine/
    nextAchievement.ts    # 進度% 最高者優先 selector
  components/
    NextAchievementCard.tsx    # Hero 進度卡
    TrackTabs.tsx              # 分段控制
    StrengthLadder.tsx          # 力量軌 5 節點里程碑橫軸
    AchievementGrid.tsx        # 徽章卡網格
    AchievementBadge.tsx       # 單一成就卡片
    AchievementDetailSheet.tsx # 詳情面板
    TimelineView.tsx           # 解鎖時間軸
    CelebrationModal.tsx       # 慶祝儀式
```

## 成就增量：匯入行為 v1

| ID | Track | Line | Tier | Metric | Threshold | 標題 | 文案 |
|----|-------|------|------|--------|-----------|------|------|
| `import_first` | behavior | import | t1 | `sessions_imported_total` | 1 | 你的過去，從今天起有了家 | 第一筆歷史匯入完成。承認你的過去，之後才是現在起繼續推進。 |

- **I-5 相容**：`sessions_imported_total` 來自 `sessions.filter(s => s.imported === true).length`；匯入時 settleAll 以 `{ silent:true, skipPartner:true }` 結算 — 即便 `import_first` 在匯入批次被解鎖，也不會重複彈出 CelebrationModal（只顯示 RecognitionModal 每批次一次的認可儀式）。
- **D2 相容**：一旦 `import_first` unlocked 永久；之後刪除所有 imported session，成就仍然在（live 進度會降到 0）。
- **I-4 相容**：`import_first` 的 metric 為行為統計，不參與 Partner XP 與形態解鎖的 totalWorkouts 計算。

## Telemetry 事件

- `achievement_unlocked { id, track, tier }`
- `achievement_wall_viewed`
- `next_card_tapped`
- `ladder_node_tapped`
- `celebration_skipped`
