# Vivix 資料流文件（Phase C）

> 對應 Phase B 修復指示 v2.1。描述一筆訓練 session 從輸入到衍生呈現的完整路徑，及分類變更、載入 migrate 的結算流程。

## 1. 持久化邊界（L1）

**只持久化**：原始事實（sessions、customExercises、plans、profile、**cardioSessions**）＋ 永久決定（achievements `unlockedAt`/`seen`/`pending`、quests `claimed`/`completedAt`、partner `unlockedFormIds`、theme、trial）。

**不持久化**：所有衍生欄位（personalRecords、lastMetrics、current progress、partner level/counters、equipment memories、**strengthKcal / cardio fallback kcal / 任何 MET 計算結果**）。由 `partialize` 排除、`migrate` 剝除舊欄位。

persist key 全部不變：`ironpulse-*` / `vivix-*`。

`CardioSession.kcal` 為唯一例外：若為用戶手動輸入的機器讀數，則定義為「事實」，可 persist（白名單 cardioStore v1）；否則一律為衍生，不 persist。見 CALORIE_MODEL.md §4.1。

## 2. 訓練完成流程（finishSession）

```
用戶按「完成訓練」
  │
  ▼
Workout.tsx handleFinish
  │  updateFromSession（器械記憶 T-06，寫 equipmentMemoryStore）
  │  clearActiveSession
  ▼
WorkoutSummary mount
  │  呼叫 settleAll(rewardCtx)
  ▼
settleAll（stats/settleAll.ts）固定順序：
  1. buildAchieveCtx()
       sessions = workoutStore.sessions
       cardioSessions = cardioStore.sessions   ← 有氧事實
       personalRecords = workoutStore.personalRecords  ← 讀取時派生
       bodyWeight = profileStore.profile.bodyWeight    ← number | null（D3 + E-D2/E-D5）
       groupStats = workoutStore.getGroupStats()
       cardio metrics: cardioMinutesTotal / cardioSessionsTotal / cardioWeeklyRhythmWeeks（來自 cardioSessions）
  2. achievementsStore.recompute(ctx)
       → computeMetrics（純函數，含 cardio_* 三 metric）
       → 達標且未 unlocked → unlockedAt = now + pending
       → 回傳新解鎖 id[]（含 +9 cardio 成就；舊 58 不動）
  3. partner
       a. handleWorkoutCompleted(rewardCtx) ← addXp + form unlock（僅力量 session + partnerEnabled）
       b. settleCardioDailyXp() ← 有氧 20 XP / 日，每日上限 1 次（E-D4）
  4. buildQuestCtx(streakDays)
       // Errata E15 / I-4：quest 與 partner 共用「僅非 imported」語義（避免 Lane B 匯入稀釋）
       totalWorkouts = sessions.filter(s => s.imported !== true).length
       // （成就/統計用 totalWorkouts 則是 sessions.length，含 imported；兩語義嚴格分開）
       totalPRs = personalRecords.length
       streakDays = getStreakDaysSelector(sessions, cardioSessions)  ← D1 + E-D3 union
  5. questStore.recompute(questCtx) → 達標 → completed
  6. telemetry.log('achievement_unlocked', {id}) 統一在此
  │
  ▼
回傳 SettleResult { partnerReward, achievementUnlocks }
  │
  ▼
WorkoutSummary 顯示慶祝批次（一次完成只一批）
```

**保證**：一次 finish 只產生一組慶祝批次；順序確定可測；不依賴進度差。

註：頁面進入（Dashboard／AchievementsPage mount）呼叫 `settleTaxonomyChange` 為冪等安全網 — `unlockedAt` 永久，不會重複慶祝／重複 telemetry。

---

### 兩種 totalWorkouts 語義（E15，I-3 vs I-4）

為避免混用造成成就 / Partner 解鎖的語義矛盾，系統明確劃分兩種 totalWorkouts：

| 語義 | 公式 | 使用場景 | 律 |
|---|---|---|---|
| **統計／成就／streak 用**（I-3） | `sessions.length`（全 sessions，含 imported） | computeMetrics、achievements metric、PR list、groupStats、selectors.getStreakDays、部位圓餅/曲線、器械記憶派生、週報總噸數 | L2 派生律，讀取時計算 |
| **Partner 形態解鎖／XP 用**（I-4） | `sessions.filter(s => s.imported !== true).length`（僅非 imported） | `partnerStore.getTotalWorkouts()`、settleAll Partner form unlock、handleWorkoutCompleted XP | I-4：避免 Lane B 匯入一次解鎖所有形態（保持「親自記錄」的 Partner 語義） |

---

## §匯入流（Import v1 Full Flow）

```
用戶（Settings 入口 或 Onboarding Lane B experienced_has_log step）
  │
  ▼
ImportHistoryModal 三步 Wizard
  ├─ Step1：貼上 TSV/CSV → detectMode → quote-aware parse（src/utils/textSplit.ts 共用 E2）
  │         matrix：年月 ctx override + anchor header (weight→reps pair 緩衝, VBT 丟棄, Feedbck 入 notes, 同日同內容去重 E6)
  │         table ：欄位映射 chips + 日期格式選擇器(4選) + 單位 kg/lb + 範本下載按鈕 blob (vivix-template.csv, E13)
  ├─ Step2：unique 動作名映射（fuzzy token overlap≥1 或 Levenshtein≤2, E1；新建自訂 CustomExerciseForm 必填 MuscleGroup，E14）
  └─ Step3：預覽（N sessions/M exercises/日期區間/總噸數/skipped/Load warnings）→ Confirm CTA
        │
        ▼
workoutStore.importSessionsBatch（單次 set() 批次寫入，E12）
  for each session：
    id = generateId (src/utils/workout.ts, E3 禁 nanoid)
    imported = true
    startedAt/finishedAt = null
    sets.completed = true
    session.notes = feedback 合併（同日同內容去重 E6）
        │
        ▼
telemetry.log('import_completed', {mode, sessions:N, exercises:M, skipped})
        │
        ▼
settleAll(undefined, { silent: true, skipPartner: true })
  ├─ metrics recompute：imported session 會參與成就 metric、PR、streak、groupStats、volume、器械記憶（I-3，統計／成就 totalWorkouts 語義）
  ├─ silent=true：celebration queue 不 push、toast/慶祝 modal 不彈（只 return unlock ids）
  └─ skipPartner=true：Partner addXp、form unlock 整段短路（I-4，Partner 用 totalWorkouts 語義）
        │
        ▼
RecognitionModal 每匯入批次一次 show（E8，非 ever-once）
  「本批次認可：X sessions・Y training days・Z PR・W 成就・T 噸」
  CTA：useNavigate → 成就頁 / Dashboard（現有導航機制，E11 禁止字面 path）
```

**匯入流附加保證**：
- streak union（力量日 ∪ 有氧日）仍然有效：imported 力量日自動計入 D1 streak 計算。
- 熱量雙段 MET（src/features/stats/energy.ts）：estimateStrengthKcal 第一行 guard `session.imported === true` → 立即 return null（I-6）；Progress 熱量卡附註「匯入記錄不計入熱量估算」。
- D2 守則：刪除 imported session 後，進度（metric / achievement progress bar）live 下降，但已解鎖的 unlockedAt 永久存在。

---

## 3. PR 派生與分類回寫（P-01 / C2）

### 3.1 讀取時派生

```
workoutStore.personalRecords（getter）
  │
  ▼
computePRsFromSessions(sessions, customExercises)
  │  對每個 session 的每組 set：
  │    - resolveCurrentTaxonomy(exerciseId, customExercises, snapshot)
  │        1. 查 builtin exercises（權威）
  │        2. 查 customExercises（權威）
  │        3. snapshot 兜底（已刪自訂動作的 PR 不消失）
  │    - 計算 est1RM = weight * (1 + reps/30)
  │    - 取每 exerciseId 的 max
  │    - snapshot muscleGroup / equipmentType / liftFamily
  ▼
PersonalRecord[]（含分類，即時反映當前 customExercises）
```

### 3.2 分類變更閉環

```
用戶 editCustomExercise（改 muscleGroup: legs → core）
  │
  ▼
workoutStore.editCustomExercise
  │  更新 customExercises
  │  taxonomyVersion++（cache key 失效）
  │  觸發 PR 重算（computePRsFromSessions）
  ▼
settleTaxonomyChange()
  │  buildAchieveCtx（讀新 PR）
  │  achievementsStore.recompute → group_pr 類成就可能補解鎖
  │  questStore.recompute（totalPRs 可能變）
  ▼
所有派生視圖即時時遷移（圓餅/曲線/8週體積/PR列表/部位成就/報告）
```

### 3.3 migrate 閉環

```
app load
  │
  ▼
workoutStore.migrate（version < 7）
  │  raw = persistedState as unknown（L4 guard）
  │  處理 LegacyCustomExercise → v2
  │  return 前重跑 computePRsFromSessions（純函數，安全）
  ▼
settleOnLoad()
  │  settleAll(undefined, { silent: true })
  │  → 補解锁（不彈慶祝）
  ▼
UI 顯示
```

## 4. streak 計算（C3 / D1 + E-D3）

唯一來源：`stats/selectors.ts` 的 `getStreakDays(workoutSessions, cardioSessions)`。

```
trainingDayKeys =
    dayKey(workoutSessions[i].date)
  ∪ dayKey(cardioSessions[j].date)     ← E-D3 union：有氧日計入 streak

getStreakDays(sessions, cardioSessions)
  │
  ├─ 今天有訓練（力量 or 有氧）→ cursor = today
  ├─ 今天未練但昨天有練 → cursor = yesterday（仍延續，D1 不變）
  └─ 否則 → 0
  │
  ▼
  從 cursor 往回一天天比對（本地時區 toDateString 去重，力量+有氧聯集）
  │
  ▼
  streak = 連續天數
```

**同源保證**：Dashboard、AchievementsPage、questStore recompute ctx、report 頁面全部 import 同一個 `getStreakDays`（兩個參數版本）。有氧刪除 → streak 可能即時下降（但已 unlocked 成就不消失，D2）。

**驗收**：
- 「昨天有氧、今天未練」：Dashboard 與成就頁 streak 相同且 >0
- 「斷 2 天（不含有氧）」：兩處同為 0
- addCardio 當天補紀錄 → streak 即時 +1（可復原）

## 5. 熱量派生（E-1 / E-2；L1：永不 persist）

### 5.1 力量熱量（雙段 MET）

```
Dashboard / Progress / WorkoutSummary 熱量卡
  │
  ▼
selectors.getWeeklyEnergyBreakdown(sessions, cardioSessions, customExercises, bodyWeight)
  │
  ├─ 力量 sessions 逐筆
  │    ▼
  │    energy.estimateStrengthKcal(session, customExercises, bodyWeight)
  │      │ bodyWeight === null → 回 null（E-D2：鎖定，不落假數字）
  │      │ 部位加權：Σ(completedSetsByGroup[g] × STRENGTH_ACTIVE_MET[g]) / totalCompleted
  │      │ 時長：startedAt/finishedAt 存在 → 真實；否則 activeH = completedSets × 40s
  │      │ restH = Σ(completedSets × (restSeconds ?? 90)) / 3600
  │      ▼
  │      { kcal, low, high, activeMin, restMin } | null
  │
  └─ 有氧 sessions 逐筆
       ▼
       energy.estimateCardioKcal(cardioSession, bodyWeight)
         │ 用戶已輸入 kcal → 直接使用（isFallback=false）
         │ 未輸入 + bodyWeight 有值 → CARDIO_MET × kg × (min/60)（isFallback=true，標推估）
         │ 未輸入 + bodyWeight null → 回 null（E-D5：顯示 — + 提示）
         ▼
         { kcal, low, high, isFallback } | null
  │
  ▼
UI：
  力量 ≈A（約 L–H）推估值 ＋ 有氧 B kcal（機器）或 ≈B（推估） ＝ ≈Total
  一律附小字：「機器讀數與代謝估算皆約 ±15–20% 誤差，僅供參考」
```

**L1 保證**：上述任何 `kcal / low / high / activeMin / restMin / isFallback` 皆為純函式回傳值，無任何 store persist；`CardioSession.kcal` 只有在用戶手動輸入時才會寫入 cardioStore（事實定義）。

### 5.2 有氧新增／刪除流（addCardio / deleteCardio）

```
Dashboard 快速「記錄有氧」 / Progress 有氧區塊「新增」
  │
  ▼
cardioStore.addCardio({ date, machine, durationMin, kcal?, avgHr?, distanceKm? })
  │  1. 寫 CardioSession 事實（persist `vivix-cardio-v1` v1）
  │  2. telemetry.log('cardio_session_added', { machine })
  │  3. kcal 未輸入且 bodyWeight 有值 → telemetry.log('cardio_fallback_used')
  │  4. 觸發 settleTaxonomyChange()（L3 唯一結算入口）
  ▼
settleAll（見 §2 流程；無 rewardCtx → 略過力量 handleWorkoutCompleted，仍執行 cardio XP + metrics）
  │  buildAchieveCtx：cardioMinutesTotal / cardioSessionsTotal / cardioWeeklyRhythmWeeks 即時重算
  │  settleCardioDailyXp：20 XP / 日上限 1 次
  │  quests recompute：ctx.streakDays 取 union（可能今天補登而變 >0）
  ▼
成就 / streak / 熱量 / 圖表 全部即時更新

─────────────────────────────────────

Progress 有氧列表 → 刪除
  │
  ▼
cardioStore.deleteCardio(id)
  │  1. 從 cardioSessions 陣列移除
  │  2. telemetry.log('cardio_session_deleted', { machine })
  │  3. 觸發 settleTaxonomyChange()
  ▼
settleAll 重算
  │  cardio metrics 下降（live）
  │  streak 可能下降（但若已斷一天以上可能不變）
  │  已 unlocked 成就仍保留（D2：unlockedAt 永久）
```

## 6. 成就進度（D2 live）

```
AchievementsPage / Progress / Dashboard
  │
  ▼
achievementsStore.progress[id]
  │  unlockedAt（持久化，永久）
  │  seen / pending（持久化）
  │  current（不持久化，每次讀取 live 計算）
  ▼
current = computeMetrics(ctx)[id].current
  │
  ▼
進度條 live 反映真實數據
```

**D2 語義**：
- 已 unlocked 成就 `unlockedAt` 永久保存（手造刪 sessions 不消失）
- 進度條 live（手造刪 sessions 後進度即時下降）
- 禁止 `Math.max` 單調遞增（A-005 已修）

## 7. 體重與 BW 軌（D3 + E-D2 + E-D5）

```
profileStore.profile.bodyWeight: number | null
  │
  ├─ null（未填）
  │    ├─ settleAll 傳 null（不 ?? 75）
  │    ├─ computeMetrics：bodyWeight !== null 檢查 → BW 軌指標留空
  │    ├─ BW 軌成就不觸發
  │    ├─ AchievementsPage 顯示「輸入體重解鎖」鎖定提示
  │    ├─ E-D2：力量熱量估算鎖定（estimateStrengthKcal → null）
  │    └─ E-D5：有氧 fallback kcal 鎖定（未輸入 kcal 時 estimateCardioKcal → null，顯示 —）
  │
  └─ number（已填）
       ├─ 正常計算 est1RM / bodyWeight
       ├─ 力量熱量、有氧 fallback kcal 正常派生
       └─ WorkoutSummary 熱量卡顯示 ≈ 值
```

migrate：舊 `bodyWeight === 75`（舊 default）→ `null`。真 75kg 用戶重填，UI 說明。

## 8. 器械記憶（A-014）

```
equipmentMemoryStore
  │  C4：memories 改讀取時派生（不 persist）
  │
  ▼
getEquipmentMemories(sessions)（selectors）
  │  從 sessions 派生每個 equipmentId:exerciseId 的最近重量
  ▼
UI 顯示
```

**A-014 自動消失**：無快取即無 stale。

## 8. UI Token 流（C7）

```
元件需要顏色/樣式
  │
  ▼
import from data/theme.ts
  │  REST_TIMER_THEME（light/dark 全 hex）
  │  THEME_DEFINITIONS（兩主題色盤）
  │  CHART_WEEK_COLORS
  │  OVERLAY_SCRIM
  ▼
style={{ color: colors.buttonFg }} 等
```

**保證**：grep hex 於 components/pages = 0（data/theme.ts 除外）。RestTimer 行為與像素零變化。

## 9. 試用鎖與 Onboarding 流

```
app start
  │
  ├─ trialStore（v5）→ 計算試用階段
  │    Stage 0-4：2→4→8→15→31→永久天數
  │    數字碼驗證（usedCodes persist）
  │
  └─ profileStore.onboardingCompleted
       ├─ false → Onboarding 流程
       └─ true → 進入主畫面
```

## 11. 禁止的資料流

- 直接在元件內 inline 計算統計（應走 selectors）
- 直接在元件內 inline 查分類（應走 taxonomy 權威）
- **直接在元件內 inline 計算熱量**（應走 selectors → energy.ts，L2）
- 跨 store 結算不走 settleAll（L3）；addCardio / deleteCardio 例外是必須呼叫 settleTaxonomyChange（也是走 settleAll）
- 持久化衍生欄位（L1）
- **persist 熱量／MET 計算結果**（strengthKcal / cardio fallback kcal / low/high/activeMin/restMin/isFallback）；`CardioSession.kcal` 只有用戶手動輸入的機器讀數可 persist（事實定義，詳 §1 與 CALORIE_MODEL.md §4.1）
- 更換 persist key 造成資料丟失
- 改休息計時行為或成就目錄數值（58 個；新 +9 cardio 成就不碰 58 舊）
- 在 C1–C8 之外新增功能或重構
- 醫療級宣稱；穿戴裝置整合（心率帶、手錶、功率計皆不做）
