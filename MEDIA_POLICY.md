# Vivix 媒體合規政策（Media Compliance Policy）

文件版本：v1.0（對應《改善執行規格 v1.1》T-07）
最後更新：2026-08-13
適用範圍：所有納入 Vivix App build 的圖片、插圖、影片、GIF。

---

## 0. 核心原則

1. **合規優先於視覺豐富度**：寧願用扁平 SVG 占位，也不使用侵權圖片。
2. **無品牌 Logo / 無商標露出**：器材名稱使用通用名（「坐姿推胸機」而非「Hammer Strength 機」）。
3. **無可辨識人臉**：避免肖像權爭議。
4. **所有媒體必附 metadata**：`MediaRef` 結構缺一不可，缺項不進入 release build。

---

## 1. 風險分級（§6 T-07）

| 風險級別 | 內容 | 能否進 build | 備註 |
| --- | --- | --- | --- |
| 🚫 **高風險（禁止）** | 直接下載網路他人照片（官網 / 部落客 / 網友 / Pinterest / Google 圖片） | ❌ 禁止 | 即使註明出來源也不構成合理使用 |
| 🚫 **高風險（禁止）** | 未經授權品牌圖片（Hammer Strength / Technogym / Life Fitness 官網截圖） | ❌ 禁止 | 商標 + 著作權雙重侵權 |
| 🚫 **高風險（禁止）** | 清楚露出品牌 Logo 的器材照片（商業使用） | ❌ 禁止 | 含 Logo 的自拍也屬此類，除非 Logo 已完全移除/遮蓋 |
| ⚠️ **中風險（有條件放行）** | 自己於健身房拍攝的器材照片 | ✅ 須 4 項條件全滿足 | 見 §3 |
| ✅ **推薦（首選）** | 2D 扁平插圖 / Vector（SVG / data URI） | ✅ 直接放行 | 見 §4 |
| ✅ **推薦** | 可商業使用 Stock 圖（Unsplash / Pexels / Pixabay / Shutterstock License） | ✅ 須記錄 license/source/credit | 見 §5 |

---

## 2. MediaRef 資料合約（強制）

所有動作（Exercise）與器械（Equipment）的 `media` 欄位必須滿足：

```ts
interface MediaRef {
  type: 'illustration' | 'stock' | 'self_shot' | 'none';
  url?: string;
  license?: string;       // e.g. "Unsplash License"
  source?: string;        // e.g. "unsplash:photo-abc123" or "vivix-builtin"
  credit?: string;        // 作者署名
  logoRemoved?: boolean;  // self_shot 必填 true
  facesRemoved?: boolean; // self_shot 必填 true
  venueConsent?: boolean; // self_shot 必填 true
}
```

### 類型規則

| type | 必填欄位 | 預設 |
| --- | --- | --- |
| `illustration` | `license`, `source` | `DEFAULT_MEDIA`（專案內建 SVG placeholder） |
| `stock` | `url`, `license`, `source`, `credit` | — |
| `self_shot` | `url`, `logoRemoved:true`, `facesRemoved:true`, `venueConsent:true` | — |
| `none` | 無（fallback） | 只作 migrate 暫存，release 前需補齊 |

---

## 3. Self-shot（健身房自拍）放行條件

Self-shot 要進 build **4 項全為 true**：

1. ✅ `venueConsent: true` — 已取得健身房/場地管理員口頭或書面同意（建議保留截圖/對話紀錄）；
2. ✅ `logoRemoved: true` — 品牌 Logo 已完全塗黑/裁切/遮蓋（Hammer Strength 鋁牌、Technogym 飾條等需完全不可辨識）；
3. ✅ `facesRemoved: true` — 背景鏡子、其他會員人臉已裁切或馬賽克；
4. ✅ 器材名稱改寫為通用名（避免在 UI 描述中提及品牌）。

---

## 4. Illustration 插圖策略（首選）

### 4.1 預設做法

所有內建動作與器械 **預設** 使用 **generic 2D 扁平 SVG placeholder**（現行 DEFAULT_MEDIA）：

```ts
export const DEFAULT_MEDIA: MediaRef = {
  type: 'illustration',
  license: 'Project Internal — Generic 2D Vector Placeholder',
  source: 'vivix-builtin',
  credit: 'Vivix Team',
};
```

- 優點：無授權風險、體積小、PWA 快取省流量。
- 視覺呈現：由 `ExerciseMediaCard` 依 `muscleGroup + equipmentType` 組合產生對應插圖關鍵字渲染（未來補 SVG 資產可透明替換）。

### 4.2 未來自繪插圖（建議）

- 風格：扁平/線條，暖色系對應高雅米白主題，冷色系對應工業電力主題。
- 格式：inline SVG（可雙主題自動換色）。
- 不得出現任何品牌字樣或 Logo。

---

## 5. Stock 圖來源 Allowlist

只允許以下白名單來源，且必須記錄 `license / source / credit`：

| 來源 | License 字樣 | 備註 |
| --- | --- | --- |
| Unsplash | `Unsplash License` | source 格式：`unsplash:<photo-id>` |
| Pexels | `Pexels License` | source 格式：`pexels:<photo-id>` |
| Pixabay | `Pixabay Content License` | source 格式：`pixabay:<id>` |
| Shutterstock（付費） | `Shutterstock Standard License` | credit 寫下載者/訂閱者，保存授權收據 |

⚠️ **禁止名單**：Google 圖片搜尋（非 allowlist）、Pinterest、部落格截圖、品牌官網、Facebook/Instagram 網友照片。

---

## 6. Release 前合規 Checklist

⬜ 掃描 `src/data/exercises.ts` 與 `src/data/equipment.ts`：每個 `media` 欄位都存在且有 `type`；
⬜ 若 `type === 'self_shot'`：`logoRemoved + facesRemoved + venueConsent` 三個 boolean **全部為 true**，否則 PR 不 merge；
⬜ 若 `type === 'stock'`：`url + license + source + credit` 四項 **不為空**；
⬜ 檢查 `public/` 與 `src/assets/` 目錄：無未經授權的 PNG/JPG（可接受 allowlist 下載且有對應 MediaRef）；
⬜ 檢查 UI 文案：動作 / 器械 **名稱不得含品牌**（Hammer Strength / Technogym / Life Fitness 等）；
⬜ 以 iOS Safari 實機檢查：所有插圖/Stock 圖皆無品牌 Logo 露出（含縮圖、預覽圖）；
⬜ 無明顯可辨識人臉（含鏡中反射、背景會員）；
⬜ 保留 Self-shot 場地同意與 Stock 購買收據，存放在私有 `docs/compliance/` 資料夾（不入 git 公開倉庫）。

---

## 7. 邊界與 FAQ

**Q1. 我用朋友畫的圖可以嗎？**
A1. 需要明確書面授權（最簡單：對方用通訊軟件傳「此圖以 CC0 捐贈 Vivix 專案」，截圖存在 docs/compliance），並設定 MediaRef：`type:'stock' + license:'CC0 / Written permission from <作者名>'`。

**Q2. 動作教學影片/GIF 有品牌器材怎麼辦？**
A2. 優先使用自製 2D 動畫；若必須實拍，走 self_shot 四項條件（去 Logo/去人臉/場地同意）。外部 YouTube 連結可放 `ExerciseMedia` deprecated 欄位，但 build 不包影片本體。

**Q3. 未來要做動作 3D 模型？**
A3. 自建模或購買 allowlist 3D 資產（Sketchfab Standard/CC0），記錄 MediaRef license。仍不可導入品牌 Logo 模型。

---

## 8. 參考

- `src/types/index.ts` §5.7：`MediaRef` 介面、`DEFAULT_MEDIA` 常數
- `src/data/exercises.ts`：16 個內建動作 media 欄位
- `src/data/equipment.ts`：器械 library media 欄位
