# mobile-app — FROZEN PROTOTYPE

## 狀態聲明

本資料夾為 **prototype**，不再投資新功能開發。

- ** 凍結日期**：2026-08-13（Phase B / C6）
- ** 凍結原因**：web PWA 已能滿足 iPhone 免 App Store / Expo Go 的硬性約束；mobile-app 的原生包裝未帶來額外價值，且維護成本高。
- ** schema 分叉聲明**：mobile-app 的 store schema（`mobile-app/store/*`）與 web（`src/store/*`）已分叉，**不再保持同步**。mobile-app 的 migrate / partialize / 派生邏輯不會跟隨 web 的 L1-L4 演進。

## 已執行的最小變更（C6）

1. `store/workoutStore.ts`：移除 `sampleSessions` seed，新裝見空狀態而非他人資料。
2. 加示範標記（本檔案）。

## 禁止事項

- 不得在 mobile-app 新增功能、修 bug、或同步 web 的 Phase B/C 變更。
- 若需原生 app，應另起專案，重用 web 的 `src/` 邏輯。

## 若需解凍

需先完成：
1. 評估 web PWA 是否仍不足以滿足需求。
2. 規劃 mobile-app 與 web 的 schema 統一策略（共用 types / store 邏輯）。
3. 取得用戶明確授權。
