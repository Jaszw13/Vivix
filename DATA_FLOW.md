# Vivix 資料流文件（Phase C）

> 對應 Phase B 修復指示 v2.1。描述一筆訓練 session 從輸入到衍生呈現的完整路徑，及分類變更、載入 migrate 的結算流程。

## 1. 持久化邊界（L1）

**只持久化**：原始事實（sessions、customExercises、plans、profile）＋ 永久決定（achievements `unlockedAt`/`seen`/`pending`、quests `claimed`/`completedAt`、partner `unlockedFormIds`、theme、trial）。

**不持久化**：所有衍生欄位（personalRecords、lastMetrics、current progress、partner level/counters、equipment memories）。由 `partialize` 排除、`migrate` 剝除舊欄位。

persist key 全部不變：`ironpulse-*` / `vivix-*`。

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
       personalRecords = workoutStore.personalRecords  ← 讀取時派生
       bodyWeight = profileStore.profile.bodyWeight    ← number | null（D3）
       groupStats = workoutStore.getGroupStats()
  2. achievementsStore.recompute(ctx)
       → computeMetrics（純函數）
       → 達標且未 unlocked → unlockedAt = now + pending
       → 回傳新解鎖 id[]
  3. partner handleWorkoutCompleted(rewardCtx)
       → addXp + form unlock（僅 partnerEnabled）
  4. buildQuestCtx(streakDays)
       totalWorkouts = sessions.length
       totalPRs = personalRecords.length
       streakDays = workoutStore.getStreakDays()  ← D1 語義
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

## 4. streak 計算（C3 / D1）

唯一來源：`stats/selectors.ts` 的 `getStreakDays`。

```
getStreakDays(sessions)
  │
  ├─ 今天有練 → cursor = today
  ├─ 今天未練但昨天有練 → cursor = yesterday（仍延續）
  └─ 否則 → 0
  │
  ▼
  從 cursor 往回一天天比對（本地時區 toDateString 去重）
  │
  ▼
  streak = 連續天數
```

**同源保證**：Dashboard、AchievementsPage、questStore recompute ctx 全部 import 同一個 `getStreakDays`。workoutStore.getStreakDays() 與 achievementsStore 內 streak 計算已刪除。

**驗收**：
- 「昨天有練、今天未練」：兩處 streak 相同且 >0
- 斷 2 天：兩處同為 0

## 5. 成就進度（D2 live）

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

## 6. 體重與 BW 軌（D3）

```
profileStore.profile.bodyWeight: number | null
  │
  ├─ null（未填）
  │    ├─ settleAll 傳 null（不 ?? 75）
  │    ├─ computeMetrics：bodyWeight !== null 檢查 → BW 軌指標留空
  │    ├─ BW 軌成就不觸發
  │    └─ AchievementsPage 顯示「輸入體重解鎖」鎖定提示
  │
  └─ number（已填）
       └─ 正常計算 est1RM / bodyWeight
```

migrate：舊 `bodyWeight === 75`（舊 default）→ `null`。真 75kg 用戶重填，UI 說明。

## 7. 器械記憶（A-014）

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

## 10. 禁止的資料流

- 直接在元件內 inline 計算統計（應走 selectors）
- 直接在元件內 inline 查分類（應走 taxonomy 權威）
- 跨 store 結算不走 settleAll（L3）
- 持久化衍生欄位（L1）
- 更換 persist key 造成資料丟失
- 改休息計時行為或成就目錄數值（58 個）
- 在 C1–C8 之外新增功能或重構
