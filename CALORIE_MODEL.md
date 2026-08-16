# Vivix 熱量模型說明（E 系列 v3.0）

> 對應「熱量估算＋有氧區執行規格 v3.0」。本文為 Vivix 所有熱量相關顯示的唯一公式來源；任何 UI 熱量數字必須能透過本文追溯到具體公式與常數。

## 0. 最高原則

> **熱量是「方向感」不是「診斷」；有氧是「事實」不是「推估」。**

所有熱量顯示：
- 一律附「≈」或「推估值」標籤（除非為用戶直接輸入的機器讀數）
- 一律附免責小字：「機器讀數與代謝估算皆約 ±15–20% 誤差，僅供參考」
- 永不 persist（見 L1 與 DEV_RULES.md）

---

## 1. 決策記錄（E-D1 ~ E-D6）

| ID | 決策 | 說明 |
|----|------|------|
| E-D1 | 力量熱量雙段 MET 模型 | 顯示 `≈ X kcal（約 L–H）`＋「推估值」標籤 |
| E-D2 | 體重未填 → 力量熱量鎖定 | `bodyWeight === null` 時顯示「輸入體重解鎖」提示（沿用 D3 門檻） |
| E-D3 | 有氧日計入 streak | `streak = 力量日 ∪ 有氧日`；D1 語義不變 |
| E-D4 | 有氧給 Partner XP（20/日，每日上限 1 次） | Partner 形態解鎖的 `totalWorkouts` 仍只算力量 session |
| E-D5 | 有氧 kcal 選填；缺則 MET fallback（標「推估值」） | 缺 kcal 且 `bodyWeight === null` → 顯示 `—`＋提示 |
| E-D6 | 總熱量＝力量推估＋有氧（輸入或 fallback） | 報告卡附免責小字 |

---

## 2. MET 常數表

來源：
- **2024 Adult Compendium of Physical Activities**（Herrmann et al. 2024, *J Sport Health Sci* 13(1):6–12. doi:10.1016/j.jshs.2023.10.010；PMC10818145）：resistance training 三級分級 3.5（輕）/ 5.0（中）/ 6.0（重）。
- **Older Adult Compendium**（Willis et al. 2024, *JSHS* 13(1):13–17；PMC10818108）：squats light = 5.3，heavy squat ≈ 6.0。
- **Mitchell et al. 2024 *Sports Med* 54(9):2357**（PMC11393209）：Compendium resistance exercise 3.5/5.0/6.0 與實測差約 ±10–25%。

**fetchedAt**: 2026-08-16（Phase B v3.0 實作時查證）

權威常數位置：`src/data/metTable.ts`

### 2.1 力量訓練（activeMET）

依完成組數按部位加權平均（多部位 session 按各部位完成組數加權）：

| 主部位 | activeMET | 對應 Compendium 級 |
|--------|-----------|-------------------|
| legs | 6.0 | heavy 級（與 squats heavy 一致） |
| chest | 5.0 | medium 級（bench / press 中等強度） |
| back | 5.0 | medium 級（row / pull 中等強度） |
| shoulders | 4.0 | light–medium（OHP / lateral） |
| arms | 4.0 | light–medium（curl / triceps） |
| core | 4.0 | medium（plank / dead-bug） |

### 2.2 休息段

`REST_MET = 1.8`（清醒安靜坐臥，通用文獻值）

### 2.3 有氧器材 fallback MET

用戶未輸入機器 kcal 讀數時使用：

| 器材 | MET | 對應強度 |
|------|-----|---------|
| treadmill | 7.0 | 快走 / 慢跑 ~8 km/h 混合 |
| stair | 9.0 | 台階登山中等 |
| elliptical | 5.0 | 中等阻力 |
| bike | 6.8 | 飛輪車 100–120W |
| rower | 7.0 | 划船中等節奏 |
| other | 5.0 | 通用保守中值 |

### 2.4 誤差帶

```
CALORIE_ERROR_BAND_LOW  = 0.85
CALORIE_ERROR_BAND_HIGH = 1.15
```

依 Mitchell 2024 review：Compendium 預測與間接量熱法差約 ±15–20%，取保守 15% 作為顯示區間。

---

## 3. E-1 力量熱量公式（雙段 MET 模型）

```
strengthKcal ≈ activeMET_weighted × kg × activeH ＋ REST_MET × kg × restH
```

### 3.1 輸入

| 變數 | 來源 | 可空 |
|------|------|------|
| `bodyWeight` | `profileStore.profile.bodyWeight`（kg） | ✅（null → 力量熱量鎖定 E-D2） |
| `session.startedAt` / `session.finishedAt` | `workoutStore.sessions`（ISO string） | ✅（null → fallback 時長） |
| 完成組數 × `restSeconds` | session sets 內 | `restSeconds` 缺 → 90s fallback |

### 3.2 時長計算

```
totalCompleted     = Σ 每動作完成組數
totalRestSeconds   = Σ（完成組數 × (該動作計劃 restSeconds ?? 90)）
restH              = totalRestSeconds / 3600

# session 真實時長（有 timestamp）
sessionH_timestamp = (finishedAt − startedAt) / 3_600_000

# session fallback 時長（舊 session 無 timestamp）
sessionH_fallback  = totalCompleted × 40s / 3600
（40s = FALLBACK_ACTIVE_SECONDS_PER_COMPLETED_SET，metTable.ts 內）

sessionH = has_timestamp ? sessionH_timestamp : sessionH_fallback
activeH  = max(0, sessionH − restH)
```

### 3.3 部位加權 activeMET

```
byGroup[muscleGroup] = 每部位完成組數
weightedActiveMet = Σ( STRENGTH_ACTIVE_MET[g] × byGroup[g] ) / totalCompleted
```

單部位 session → 直接用該部位 MET；多部位 → 按完成組數比例加權。

### 3.4 熱量與區間

```
kcal = round( weightedActiveMet × kg × activeH ＋ 1.8 × kg × restH )
low  = round( kcal × 0.85 )
high = round( kcal × 1.15 )
```

顯示：`≈ {kcal} kcal（約 {low}–{high}）`＋「推估值」標籤

### 3.5 Sanity 例（QA 必過）

> 70kg、腿日（activeMET=6.0）60 分 session，休息佔 20 分
>
> ```
> activeH = 40/60 = 0.667 h
> restH   = 20/60 = 0.333 h
> kcal    = 6.0 × 70 × 0.667 ＋ 1.8 × 70 × 0.333
>         = 280.14 ＋ 42.00 = 322.14 → round → 322
> low     = round(322 × 0.85) = 274
> high    = round(322 × 1.15) = 370
> ```
>
> 顯示：`≈ 322 kcal（約 274–370）`（合理範圍，QA 允許 ±1 來自四捨五入差異）

---

## 4. E-2 有氧熱量

### 4.1 優先級

1. **用戶輸入 kcal**（機器顯示值）→ 直接使用，標註「機器讀數」
2. **未輸入 kcal** → MET fallback（標「推估值」）
3. **未輸入 kcal 且 bodyWeight null** → 顯示 `—` ＋提示（E-D5）

### 4.2 MET fallback 公式

```
cardioKcal ≈ CARDIO_MET[machine] × kg × (durationMin / 60)
```

顯示：`≈ {kcal} kcal（推估值）`

### 4.3 區間

力量／有氧／總熱量皆套用同一誤差帶：

```
low  = kcal × 0.85
high = kcal × 1.15
```

（用戶直接輸入的機器讀數仍附區間說明，因為機器本身也有 ±10% 等級誤差）

---

## 5. 總熱量（E-D6）

```
totalKcal = Σ strengthKcal_sessions ＋ Σ cardioKcal_sessions
```

- `strengthKcal_sessions`：雙段 MET 推估（E-D1）
- `cardioKcal_sessions`：輸入值或 MET fallback（E-D5）
- 任一項缺資料（如力量 session 體重未填）→ 該項以 `—` 表示，總熱量亦標註「部分資料缺」

### 5.1 顯示規則

| 狀況 | 力量卡 | 有氧卡 | 總熱量卡 |
|------|--------|--------|----------|
| 體重已填、kcal 有輸入 | ≈A（約 L–H） | B kcal（機器） | ≈A+B kcal |
| 體重已填、kcal 未輸入 | ≈A（約 L–H） | ≈B kcal（推估） | ≈A+B kcal |
| 體重未填、kcal 有輸入 | —（輸入體重解鎖） | B kcal（機器） | ≈B kcal（標註部分缺） |
| 體重未填、kcal 未輸入 | — | — | —（提示輸入體重或 kcal） |

一律附免責小字：「機器讀數與代謝估算皆約 ±15–20% 誤差，僅供參考」

---

## 6. 代碼位置

| 職責 | 檔案 | 型別／函式 |
|------|------|-----------|
| MET 常數＋誤差帶＋fallback | `src/data/metTable.ts` | `STRENGTH_ACTIVE_MET` / `CARDIO_MET` / `REST_MET` / `CALORIE_ERROR_BAND_LOW|HIGH` / `FALLBACK_*_SECONDS` |
| 力量熱量估算（純函式） | `src/features/stats/energy.ts` | `estimateStrengthKcal(session, customExercises, bodyWeight) → { kcal, low, high, activeMin, restMin } \| null` |
| 有氧熱量估算（純函式） | `src/features/stats/energy.ts` | `estimateCardioKcal(session, bodyWeight) → { kcal, low, high, isFallback } \| null` |
| 選擇器（元件唯一消費端） | `src/features/stats/selectors.ts` | `getWeeklyEnergyBreakdown` / `getCardioTotalMinutes` / ... |
| 有氧事實 store | `src/store/cardioStore.ts` | `CardioSession[]`（persist `vivix-cardio-v1` v1） |
| 整合結算 | `src/features/stats/settleAll.ts` | streak union / cardio XP / cardio metrics |

---

## 7. 禁止事項

- 禁止 persist 任何 kcal / MET 計算結果（L1）
- 禁止元件 inline 寫公式；一律走 `selectors.ts` → `energy.ts`（L2）
- 禁止醫療級宣稱（「可減肥 X kg」「可降血壓」等）
- 禁止假設用戶有心率帶 / 手錶 / 穿戴裝置
- 禁止以熱量成就為獎勵門檻（熱量為方向感，非指標）
