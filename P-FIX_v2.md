# Vivix 風格系統 v1 — 修復任務書（P-FIX，最新版）

> 檔名沿用 `P-FIX_v2.md` 以維持連續性；內容為合併後的**最新版**（9 款陣容 + hover 補完）。

> 本版依用戶裁決更新：**刪除 hello-kitty pack，保留可愛版（kawaii-pastel）**，陣容由 10 款改為 **9 款（8 core + 1 personal）**；
> 並補上先前遺漏的 **hover（動態人格層第三件套）**。
> 所有程式碼片段、selector、檔名、函式簽名、grep 指令均已對照現行 repo **實測核實**。
>
> **執行前必讀**：分 7 個階段，**必須依序執行**。P-FIX-0 是其他階段的前置依賴，跳過會導致後續全部返工。

---

## 0. 上位約束

### 0.1 繼承守門律

- L0–L5 守門律全繼承（見 `DEV_RULES.md`）；**不新增 npm 依賴**；不新增後端。
- **Hex 規則**：色碼只准出現在 `src/data/stylePacks*.ts`、`src/data/theme.ts`、`src/index.css`。
  `components/` `pages/` 內 hex = 0（grep 守門不變）。
  → **禁止在 `index.css` 新增 hex 色碼**；新樣式一律讀既有 CSS 變數（`var(--accent)` 等）。
- **Release 隔離硬約束**：personal 資產只能被 `src/data/stylePacksPersonal.ts` 引用；
  personal 裝飾元件**不得硬編碼進 core 元件**，呼叫端必須以 `isProduction` 條件渲染或動態 import。

### 0.2 既有機制不可破壞（**動手前務必確認，勿憑印象**）

| 事實 | 出處 |
|---|---|
| `applyPack()` 只設 `data-theme` / `data-pack` / `data-glass` | `themeStore.ts:120-122` |
| `applyFxMotion()` 設 `data-fx` / `data-motion`（**不是** `applyPack`） | `themeStore.ts:126-131` |
| `Button.tsx` **已有** `.btn` class | `Button.tsx:26` |
| `Button.tsx` **已呼叫** `spawnClickFxType` | `Button.tsx:46` |
| fx/motion 預設已是 `!reducedMotion`（**正確，勿改為 true**） | `themeStore.ts:140-141` |
| `buildVars()` 回傳的 key **不含 `--` 前綴** | `stylePacksShared.ts:55-67` |
| `PACK_MOTION` 的 key 是 `PackTransition`，**不是** packId | `packMotion.ts:22` |
| `getStylePack()` 回傳 `StylePack \| null` | `stylePacks.ts:141` |

### 0.3 動工前必讀檔案清單

```
src/types/theme.ts                    src/data/stylePacks.ts
src/store/themeStore.ts               src/data/stylePacksPersonal.ts
src/index.css                         src/data/stylePacksShared.ts
src/data/packMotion.ts                src/utils/clickFx.ts
src/components/ui/Button.tsx          src/components/ui/Card.tsx
src/components/layout/PageShell.tsx   src/components/settings/StyleGallery.tsx
src/pages/Settings.tsx                src/App.tsx
package.json                          .gitignore
"可愛版/"                              ← 含空格，需引號
```

### 0.4 現況基線（動工前請自行複驗，數字須一致）

| 項目 | 基線值 |
|---|---|
| `PACK_MOTION` 被 import 次數 | **0** |
| `PACK_HOVER_CSS` 被 import 次數 | **0** |
| `spawnClickFxType` 呼叫點 | **1**（`Button.tsx:46`） |
| 原生 `<button>` 總數 | **165** |
| 使用共用 `Button` 的檔案數 | **20** |
| 使用 `AnimatePresence` 的檔案數 | **20** |
| `index.css` 已實作的 clickFx | hearts / stars / confetti / ripple / sparkle / glitch（**6 種**） |
| 缺少的 clickFx | **shimmer / holo / stamp**（3 種） |
| 消費 `pack.deco` 的程式碼 | **0** |
| `--fx-dx` / `--fx-dy` 設定處 | **0** |
| `[data-motion]` CSS selector | **0** |
| `dist/` 內含 `kitty` 的檔案 | **3**（release gate 從未生效） |

### 0.5 病因總表（根因 → 修復階段對照）

| # | 根因 | 症狀 | 修復階段 |
|---|---|---|---|
| 1 | `packMotion` 的 key 是 transition 不是 packId，且**全專案 0 處 import** | 切換 pack 無過場動畫 | P-FIX-0-A / P-FIX-3 |
| 2 | `PACK_HOVER_CSS` **0 處 import**，且其 Tailwind class 方案需 JS 分支（違反規格「attribute-driven」） | 9 款 hover 效果全部無效 | P-FIX-0-E |
| 3 | `data-motion` 被寫入但**無任何 CSS selector 消費** | 過場 toggle 空轉 | P-FIX-0-E / P-FIX-3-C |
| 4 | `pack.deco` **無任何消費端** | 9 款視覺不可區分的核心原因 | P-FIX-0-D |
| 5 | `--fx-dx` / `--fx-dy` **從未被設定** | 粒子同向重疊，特效「看不見」 | P-FIX-0-C |
| 6 | `index.css` 缺 3 種 clickFx | 3 款 pack 特效退化成通用圓點 | P-FIX-0-B |
| 7 | 特效只綁在共用 `Button`，165 個原生 `<button>` 不觸發 | 大部分點擊無感 | P-FIX-2 |
| 8 | `build` script 未帶 `VITE_RELEASE_MODE` | release gate 從未生效，dist 洩漏 personal | P-FIX-4-B |
| 9 | `StylePack` 無 `assets` 欄位、`assets/` 只有 README | 用戶圖片完全未被使用 | P-FIX-1 |
| 10 | `StyleGallery` 的 `PackPreview` 只畫抽象色塊 | 畫廊看不到真實圖片 | P-FIX-5 |

---

## 1. 決策記錄（寫入 `DEV_RULES.md`）

```yaml
S-1: 陣容 9 款＝8 core（release-safe）＋1 personal-only（非商業、release 排除）
     core: elegant-beige, industrial-power, retro-card, aurora-glass,
           neobrutal-pop, muji-calm, y2k-chrome, wpa-trail
     personal: kawaii-pastel（可愛版）
     ※ hello-kitty pack 已由用戶裁決刪除（v3 變更）
S-2: 預設維持雙預設：light→elegant-beige、dark→industrial-power
S-3: kawaii-pastel 為 light-only（強制亮色）
S-4: aurora-glass 參考 Apple HIG 玻璃材質：backdrop-filter blur(20px) saturate(180%)、
     1px rgba(255,255,255,.15) 邊、分層深度陰影
S-5: 動態人格層＝每 pack 的 motion{transition, hover, clickFx} **三件套**；
     「點擊特效」與「過場動畫」皆用戶可手動關閉，persist 於 themeStore；
     prefers-reduced-motion 預設關閉兩者（**已實作，勿改**）
S-6: Release 閘門：import.meta.env.VITE_RELEASE_MODE==='production' 時
     STYLE_PACKS 只回 core；personal 模組獨立檔案利 tree-shake
S-7: 版權：personal 資產放 src/themes/personal/assets/（.gitignore），
     README 註明版權、僅自用、勿散布；release build 不含
     ※ 用戶已確認：可愛版素材為**個人自用、粉絲用途**，不進公開版
S-8: build 必須帶 VITE_RELEASE_MODE=production 才能啟用 release gate
     （實作方式：新增 .env.production，見 P-FIX-4-B）
S-9: hover 效果以 CSS attribute selector（[data-pack]）實作，
     不使用 JS 分支；PACK_HOVER_CSS 的 Tailwind class 方案廢除
```

### 1-A. 資產清單（**已由用戶裁決，可動工**）

`可愛版/` 共 10 個檔案，**採用 6 個、排除 4 個**：

| 實際檔名 | 內容 | 採用 | 用途 |
|---|---|---|---|
| `WhatsApp ...22.42.36.jpeg` | My Melody 特寫（粉紅頭巾＋小花＋化妝鏡） | ✅ | **頭像**（需圓形裁切，見 §1-F） |
| `WhatsApp ...22.43.28.jpeg` | My Melody ＋鋼琴兔，粉紅**波點**背景 | ✅ | **背景** |
| `WhatsApp ...22.44.33.jpeg` | My Melody 全身，粉紅**放射線**背景 | ✅ | **背景 / 慶祝** |
| `WhatsApp ...22.46.02.jpeg` | Hangyodon 吃拉麵 | ✅ | 裝飾 / 空狀態 |
| `WhatsApp ...22.47.33.jpeg` | 蠟筆小新 | ✅ | 裝飾（低透明度） |
| `WhatsApp ...22.46.55.jpeg` | 蠟筆小新 | ✅ | 裝飾（低透明度） |
| `images copy.png` | **與 `Hello kitty image/images.png` md5 完全相同** | ❌ | 排除 |
| `images copy.jpeg` | 與 `images.jpeg` md5 相同 | ❌ | 排除 |
| `images (1) copy.jpeg` | 與 `images (1).jpeg` md5 相同 | ❌ | 排除 |
| `images (2) copy.jpeg` | 與 `images (2).jpeg` md5 相同 | ❌ | 排除 |

> **排除 4 張的理由（已 md5 驗證，非風格偏好）**：
> `440ade1f…` / `2fa16e8f…` / `a22241d6…` / `6a5b816d…` 四組雜湊逐一相同，
> 它們是 **Hello Kitty 的圖**。由於 hello-kitty pack 已刪除，若把這 4 張放進可愛版，
> 可愛版會顯示 Hello Kitty 的圖 → 兩個 pack 撞圖。故排除。

> **版權備註（S-7）**：可愛版素材含 Sanrio（My Melody、Hangyodon、鋼琴兔）與蠟筆小新等第三方 IP。
> 用戶已確認**僅供個人自用、不進公開版**。技術保障已存在：
> ① `src/themes/personal/assets/*` 在 `.gitignore`；② release build 經 tree-shake 完全不含。
> **請勿移除這兩道保障。**

> **`Hello kitty image/` 資料夾**：pack 刪除後不再被任何程式碼引用。
> 該資料夾已在 `.gitignore` 中，留在原地無害。**是否刪除由用戶自行決定，agent 不得代為刪除。**

---

## P-FIX-0：Registry 契約修正（**最優先，其他階段的前置**）

### 0-A. `src/data/packMotion.ts`：修正 packId → variant 的映射

**問題**：`PACK_MOTION` 是 `Record<PackTransition, MotionVariant>`，key 是 `'smooth' | 'snappy' | ...`，
**不是 packId**。寫 `PACK_MOTION[packId]` 會得到 `undefined`。

**任務**：新增以下 export（**不要改動既有 `PACK_MOTION` / `getMotion` 的簽名**）：

```ts
// 新增至 src/data/packMotion.ts
import { getStylePack } from './stylePacks';

/** packId → 該 pack 的 motion variant（含 null 保護與 motionEnabled 關閉邏輯） */
export function getMotionForPack(packId: string, motionEnabled: boolean): MotionVariant {
  const pack = getStylePack(packId);
  const transition: PackTransition = pack?.motion.transition ?? 'smooth';
  return getMotion(transition, motionEnabled);
}

/** MotionVariant → framer-motion variants
 *  注意：`enter` 是「進場後」的目標態、`exit` 是「離場／起始」態，
 *  所以 hidden 必須對應 exit，visible 對應 enter。寫反會導致完全沒有進場動畫。 */
export function toFramerVariants(v: MotionVariant) {
  return {
    hidden: { opacity: 0, ...v.exit },
    visible: { opacity: 1, ...v.enter },
  };
}

/** MotionVariant → framer-motion transition */
export function toFramerTransition(v: MotionVariant) {
  return { duration: v.duration, ease: v.ease };
}
```

**驗收**
- [ ] `PACK_MOTION` 的 `Record<PackTransition, MotionVariant>` 型別未被改動
- [ ] `getMotionForPack('aurora-glass', true)` 回傳 `PACK_MOTION.spring`（`duration 0.35`）
- [ ] `getMotionForPack('neobrutal-pop', true).duration === 0.01`
- [ ] `getMotionForPack('不存在的-id', true)` 回傳 `PACK_MOTION.smooth`（不拋錯）
- [ ] 無循環依賴（`packMotion.ts` → `stylePacks.ts` → `stylePacksShared.ts`，單向）

### 0-B. `src/index.css`：補齊缺的 3 種 clickFx

> ⚠️ **必須沿用既有慣例**：現有結構是「`.vivix-fx`（容器）+ `.vivix-fx-* span`（粒子）」，
> 動畫掛在 **span** 上。若改成直接樣式化容器，新的 3 種會與既有 6 種完全不同構，且與
> `clickFx.ts` 內既有的 inline `position: fixed` / `transform` 打架。

在既有 `.vivix-fx-glitch` 區塊之後追加：

```css
/* shimmer：金箔掃光條（elegant-beige） */
.vivix-fx-shimmer span {
  width: 3px;
  height: 14px;
  border-radius: 1px;
  background: var(--accent);
  box-shadow: 0 0 6px var(--accent);
}

/* holo：箔片旋轉（retro-card） */
.vivix-fx-holo span {
  border-radius: 1px;
  background: var(--auxiliary);
  box-shadow: 0 0 4px var(--accent);
  animation: vivix-fx-holo 0.7s ease-out forwards;
}
@keyframes vivix-fx-holo {
  0%   { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
  50%  { transform: translate(var(--fx-dx, 0), var(--fx-dy, 0)) rotate(120deg) scale(1.3); }
  100% { transform: translate(var(--fx-dx, 0), var(--fx-dy, 0)) rotate(240deg) scale(0); opacity: 0; }
}

/* stamp：方形印章壓印（wpa-trail） */
.vivix-fx-stamp span {
  width: 14px;
  height: 14px;
  border-radius: 0;
  border: 2px solid var(--auxiliary);
  background: transparent;
  animation: vivix-fx-stamp 0.25s ease-out forwards;
}
@keyframes vivix-fx-stamp {
  0%   { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
  60%  { transform: translate(-50%, -50%) scale(1);   opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1);   opacity: 0; }
}
```

**驗收**
- [ ] 新規則全部是 `.vivix-fx-* span` 形式（沿用既有慣例）
- [ ] 未新增任何 hex 色碼（只用 `var(--accent)` / `var(--auxiliary)`）
- [ ] `grep -c "\.vivix-fx-" src/index.css` ≥ 11（現有 8 + 新增 3）

### 0-C. `src/utils/clickFx.ts`：修粒子擴散與迴圈錯位

> ⚠️ **改寫此函式時務必保留粒子 `<span>` 的建立迴圈**。
> 若只建立一個空容器 div 而沒有 span，`.vivix-fx span` 不會命中任何元素 → **特效完全消失**。
> 同時必須保留 `vivix-fx` 基礎 class（完整寫法是 `` `vivix-fx vivix-fx-${type}` ``）。

**現存缺陷**
1. `--fx-dx` / `--fx-dy` **從未被設定** → 所有粒子朝同一方向上升、完全重疊（「特效看不見」的直接原因）
2. `document.body.appendChild(el)` 寫在 `for` 迴圈**內部**（`clickFx.ts:45`），邏輯錯位

**修正後的 `spawnParticle`**

```ts
function spawnParticle(x: number, y: number, type: PackClickFx): void {
  if (!isFxEnabled() || activeCount >= MAX_PARTICLES) return;

  const el = document.createElement('div');
  el.className = `vivix-fx vivix-fx-${type}`;   // ← 基礎 class 不可省略
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.position = 'fixed';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '9999';
  el.style.transform = 'translate(-50%, -50%)';

  const count = type === 'confetti' ? 8 : type === 'stars' || type === 'hearts' ? 5 : 4;

  // 容器先掛載（在迴圈外，只掛一次）
  document.body.appendChild(el);

  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.style.position = 'absolute';
    p.style.left = '0';
    p.style.top = '0';

    // 每顆粒子獨立擴散角度與距離（修正全部重疊）
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const dist = 22 + Math.random() * 18;
    p.style.setProperty('--fx-dx', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--fx-dy', `${Math.sin(angle) * dist - 12}px`);

    el.appendChild(p);
  }

  activeCount += 1;
  el.addEventListener('animationend', () => {
    el.remove();
    activeCount = Math.max(0, activeCount - 1);
  });
}
```

**同時**
- **刪除死碼 `spawnClickFx(x, y)`**（內部寫死 `'ripple'`，全專案 0 處呼叫）與其誤導性註解
- 保留 `MAX_PARTICLES = 6` 與 `activeCount`（規格要求同屏上限 6）
- 保留 `isFxEnabled()` 檢查（**不可移除**，否則 fx toggle 會失效）
- 型別請用 `@/types/theme` 的 `PackClickFx`（**沒有** `ClickFxType` 這個型別）
- 對外唯一入口為 `spawnClickFxType(x, y, type)`

**驗收**
- [ ] `grep -c "createElement('span')" src/utils/clickFx.ts` = 1（粒子迴圈存在）
- [ ] `grep -c "setProperty('--fx-d" src/utils/clickFx.ts` ≥ 2
- [ ] `grep -c "isFxEnabled" src/utils/clickFx.ts` ≥ 2
- [ ] `appendChild(el)` 位於 `for` 迴圈之外
- [ ] `grep -c "export function spawnClickFx" src/utils/clickFx.ts` = 0（死碼已刪）
- [ ] 手動測試：點擊 Button，粒子朝**不同方向**散開（非整齊同向）

### 0-D. 新增 deco 裝飾層（目前完全不存在）

**問題**：`pack.deco` 有值，但**沒有任何元件或 CSS 消費它**。這是「9 款視覺不可區分」的核心原因。

**任務 1**：調整 `src/types/theme.ts` 的 `PackDeco` union

```ts
export type PackDeco =
  | 'halftone'
  | 'starburst'
  | 'blob'
  | 'grid'
  | 'polka'      // 新增：對應 My Melody 波點背景
  | 'rays'       // 新增：對應 My Melody 放射線背景
  | 'clouds'
  | 'none';
// 移除：speedline（從未實作、無 pack 使用）、bow（原 hello-kitty 專用，pack 已刪）
```

**任務 2**：新建 `src/components/deco/PackDeco.tsx`

```tsx
// ⚠️ 型別與元件同名會衝突，import 時必須改別名
import type { PackDeco as PackDecoKind } from '@/types/theme';

interface Props {
  deco: PackDecoKind[];
  /** personal 裝飾是否允許渲染；release 下必須傳 false */
  allowPersonal?: boolean;
}

export function PackDeco({ deco, allowPersonal = false }: Props) {
  const kinds = deco.filter((d) => d !== 'none' && (allowPersonal || d !== 'polka' && d !== 'rays'));
  if (kinds.length === 0) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      {kinds.map((k) => (
        <div key={k} className={`deco-layer deco-${k} absolute inset-0`} />
      ))}
    </div>
  );
}
```

**任務 3**：`index.css` 新增 deco 樣式

> ⚠️ **顏色必須讀 CSS 變數，不可寫死 rgba**。
> 若寫死，`deco-grid` 的黑線掛在 `industrial-power`（`#0A0A0B` 近黑）上會**看不見**；
> 白色裝飾掛在近白主題上也會**看不見**。

```css
.deco-layer { opacity: 0.08; }

.deco-grid {
  background-image:
    linear-gradient(var(--text-primary) 1px, transparent 1px),
    linear-gradient(90deg, var(--text-primary) 1px, transparent 1px);
  background-size: 20px 20px;
}

.deco-halftone {
  background-image: radial-gradient(circle, var(--text-primary) 1px, transparent 1.5px);
  background-size: 8px 8px;
}

.deco-starburst {
  background-image: repeating-conic-gradient(
    from 0deg at 50% 0%,
    var(--text-primary) 0deg 6deg,
    transparent 6deg 18deg
  );
}

.deco-polka {
  background-image: radial-gradient(circle, var(--accent) 3px, transparent 4px);
  background-size: 22px 22px;
  opacity: 0.14;
}

.deco-rays {
  background-image: repeating-conic-gradient(
    from 0deg at 50% 100%,
    var(--accent) 0deg 4deg,
    transparent 4deg 16deg
  );
  opacity: 0.1;
}

.deco-clouds {
  background-image:
    radial-gradient(circle at 20% 30%, var(--accent) 0 18px, transparent 19px),
    radial-gradient(circle at 30% 36%, var(--accent) 0 22px, transparent 23px),
    radial-gradient(circle at 76% 64%, var(--accent) 0 20px, transparent 21px),
    radial-gradient(circle at 86% 58%, var(--accent) 0 16px, transparent 17px);
  background-repeat: no-repeat;
}

.deco-blob {
  background-image:
    radial-gradient(ellipse 40% 30% at 18% 78%, var(--accent) 0 60%, transparent 61%),
    radial-gradient(ellipse 34% 26% at 84% 24%, var(--auxiliary) 0 60%, transparent 61%);
}
```

**任務 4**：掛載於 `PageShell.tsx`（**含 null 保護與 release 隔離**）

```tsx
import { PackDeco } from '@/components/deco/PackDeco';
import { getStylePack } from '@/data/stylePacks';
import { useThemeStore } from '@/store/themeStore';

const isProduction = import.meta.env.VITE_RELEASE_MODE === 'production';

// PageShell 內：
const packId = useThemeStore((s) => s.activePackId);
const pack = getStylePack(packId);   // ← 回傳 StylePack | null，必須判空

{pack && <PackDeco deco={pack.deco} allowPersonal={!isProduction} />}
```

**各 pack 的 deco 對照（實作後應一致）**

| pack | deco |
|---|---|
| elegant-beige | `['none']` |
| industrial-power | `['grid']` |
| retro-card | `['halftone', 'starburst']` |
| aurora-glass | `['none']` |
| neobrutal-pop | `['none']` |
| muji-calm | `['none']` |
| y2k-chrome | `['starburst']` |
| wpa-trail | `['none']` |
| **kawaii-pastel** | **`['polka', 'rays']`**（本版由 `['clouds','blob']` 改為對應素材） |

**驗收**
- [ ] `grep -r "PackDeco" src/` ≥ 2（元件本身 + PageShell）
- [ ] `grep -c "\.deco-" src/index.css` ≥ 7（grid / halftone / starburst / polka / rays / clouds / blob）
- [ ] deco 樣式內**無 hex、無寫死 rgba**（全部 `var(...)`）
- [ ] `industrial-power` 可見 grid；`retro-card` 可見 halftone + starburst
- [ ] `kawaii-pastel` 在 **dev** 可見 polka + rays；在 **release build 完全不渲染**
- [ ] 所有 deco 為 `pointer-events: none`，不阻擋點擊
- [ ] `pack` 為 `null` 時不崩潰

### 0-E. 接線 hover（**動態人格層第三件套，先前完全未接**）

**問題**：`PACK_HOVER_CSS` 定義了 10 種 hover（lift / glow / emboss / scale / shadow-collapse /
opacity / inflation / stamp-press / wiggle / squish），但**全專案 0 處 import** → 9 款的 hover 效果全部無效。
且它的方案（回傳 Tailwind class 字串）需要 JS 分支，違反規格 §5「attribute-driven，不需 JS 分支」。

**任務 1**：**刪除 `PACK_HOVER_CSS`**（`packMotion.ts`）。
`PackHover` 型別**保留**（仍被 `StylePack.motion.hover` 使用，作為 CSS 的權威來源與文件）。

**任務 2**：在 `index.css` 以 attribute selector 實作（延續既有 `.btn` 區塊的做法）

```css
/* ============ 動態人格層：attribute-driven hover（S-9） ============ */

/* elegant-beige：lift */
[data-pack='elegant-beige'] .btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

/* industrial-power：glow */
[data-pack='industrial-power'] .btn:hover {
  box-shadow: 0 0 20px var(--accent-soft), 0 0 0 1px var(--accent);
}

/* retro-card：emboss */
[data-pack='retro-card'] .btn:hover {
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.25), 3px 3px 0 var(--text-primary);
}

/* aurora-glass：scale */
[data-pack='aurora-glass'] .btn:hover {
  transform: scale(1.03);
}

/* neobrutal-pop：shadow-collapse */
[data-pack='neobrutal-pop'] .btn:hover {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 var(--text-primary);
}

/* muji-calm：opacity */
[data-pack='muji-calm'] .btn:hover {
  opacity: 0.8;
}

/* y2k-chrome：inflation */
[data-pack='y2k-chrome'] .btn:hover {
  transform: scale(1.04);
  filter: brightness(1.06);
}

/* wpa-trail：stamp-press（hover 抬升，press 由既有 :active 處理） */
[data-pack='wpa-trail'] .btn:hover {
  box-shadow: 0 4px 0 var(--border-color), 0 6px 12px rgba(0, 0, 0, 0.14);
}

/* kawaii-pastel：squish */
[data-pack='kawaii-pastel'] .btn:hover {
  transform: scale(0.96);
}

/* motion 關閉時停用所有 hover 位移／縮放（保留顏色類回饋） */
[data-motion='off'] .btn:hover {
  transform: none !important;
  filter: none !important;
}
```

> 註：`:active` 的按壓回饋**不**受 `data-motion` 影響（屬即時回饋，非過場動畫）。

**任務 3**：確認 `data-motion` 的消費端（這是規格 S-5 要求的開關）——由上方最後一條規則承擔。

**驗收**
- [ ] `grep -c "PACK_HOVER_CSS" src/` = 0（已刪除）
- [ ] `grep -c "\[data-pack=.*\] .btn:hover" src/index.css` ≥ 9（9 款各一）
- [ ] `grep -c "\[data-motion='off'\]" src/index.css` ≥ 1（data-motion 終於有消費端）
- [ ] 逐款 hover 視覺可區分（見下表）
- [ ] 關閉「過場動畫」toggle → 所有 hover 位移／縮放停止

| pack | hover 類型 | 預期視覺 |
|---|---|---|
| elegant-beige | lift | 微微上浮 + 柔陰影 |
| industrial-power | glow | 螢光綠外發光 |
| retro-card | emboss | 內凹壓印 |
| aurora-glass | scale | 放大 1.03 |
| neobrutal-pop | shadow-collapse | 硬陰影收合、按鈕位移 |
| muji-calm | opacity | 淡出至 0.8 |
| y2k-chrome | inflation | 放大 1.04 + 提亮 |
| wpa-trail | stamp-press | 陰影抬升 |
| kawaii-pastel | squish | 內縮 0.96 |

---

## P-FIX-1：可愛版圖片資產整合

### 1-A. 素材準備

> ⚠️ **原 v1 的 `cp "可愛版/"*.png` 是錯的**：該資料夾只有 **1 個 .png**（還是重複檔），其餘 9 個是 `.jpeg`。
> ⚠️ 原始檔名含**空格**，直接 `import` 會踩 Vite 路徑編碼問題 → **必須同時改名**。
> ⚠️ **逐檔明確指定，不要用 `for` 迴圈**（迴圈會把 4 張重複檔一起複製進去）。

```bash
mkdir -p src/themes/personal/assets/kawaii-pastel

cp "可愛版/WhatsApp Image 2026-10-03 at 22.42.36.jpeg" src/themes/personal/assets/kawaii-pastel/avatar.jpg
cp "可愛版/WhatsApp Image 2026-10-03 at 22.43.28.jpeg" src/themes/personal/assets/kawaii-pastel/bg-dots.jpg
cp "可愛版/WhatsApp Image 2026-10-03 at 22.44.33.jpeg" src/themes/personal/assets/kawaii-pastel/bg-rays.jpg
cp "可愛版/WhatsApp Image 2026-10-03 at 22.46.02.jpeg" src/themes/personal/assets/kawaii-pastel/deco-hangyodon.jpg
cp "可愛版/WhatsApp Image 2026-10-03 at 22.47.33.jpeg" src/themes/personal/assets/kawaii-pastel/deco-shinchan-1.jpg
cp "可愛版/WhatsApp Image 2026-10-03 at 22.46.55.jpeg" src/themes/personal/assets/kawaii-pastel/deco-shinchan-2.jpg
```

**驗收**
- [ ] `ls src/themes/personal/assets/kawaii-pastel/` 顯示 **6 個**檔案
- [ ] **不含**任何 `* copy.*`
- [ ] `ls src/themes/personal/assets/hello-kitty/` 不存在（或為空）

### 1-B. 圖片壓縮（不新增依賴）

原圖 47–194KB，6 張約 +600KB。轉 WebP 可降至約 1/3。

- 使用 macOS 內建 `sips` 或 `cwebp`（若可用）；**不得新增 npm 依賴**
- 若無可用工具，**保留原檔即可**，但需在輸出中記錄實際總體積

**驗收**
- [ ] `src/themes/personal/assets/kawaii-pastel/` 總體積 < 400KB（或說明未壓縮的原因）
- [ ] 壓縮後仍可辨識（附截圖）

### 1-C. 型別擴充（**原 v1/v2 皆漏掉此步，沒有它全部 tsc 報錯**）

`src/types/theme.ts` 新增（必為 optional，不影響 core 8 款）：

```ts
export interface PackAssets {
  /** 背景水印圖 URL（Vite import 結果） */
  bg?: string;
  /** 第二張背景（用於慶祝／不同區塊） */
  bgAlt?: string;
  /** 頭像 / 問候列 */
  avatar?: string;
  /** 空狀態插圖 */
  empty?: string;
  /** 慶祝 overlay */
  cheer?: string;
  /** 裝飾用素材（低透明度疊加） */
  deco?: string[];
}

// StylePack 內新增
  /** personal-only packs 的圖片資產；core packs 不使用 */
  assets?: PackAssets;
```

### 1-D. `src/data/stylePacksPersonal.ts` 接入

> ⚠️ **路徑**：該檔在 `src/data/`，資產在 `src/themes/personal/assets/`，
> 所以相對路徑是 `../themes/personal/assets/...`。
> 原 v2 寫的 `'./assets/kawaii-pastel/main.png'` 會解析到 `src/data/assets/`（不存在）。

```ts
import avatar      from '../themes/personal/assets/kawaii-pastel/avatar.jpg';
import bgDots      from '../themes/personal/assets/kawaii-pastel/bg-dots.jpg';
import bgRays      from '../themes/personal/assets/kawaii-pastel/bg-rays.jpg';
import decoHangyo  from '../themes/personal/assets/kawaii-pastel/deco-hangyodon.jpg';
import decoShin1   from '../themes/personal/assets/kawaii-pastel/deco-shinchan-1.jpg';
import decoShin2   from '../themes/personal/assets/kawaii-pastel/deco-shinchan-2.jpg';
```

`kawaii-pastel` pack 內加：

```ts
    deco: ['polka', 'rays'],          // 由 ['clouds','blob'] 改為對應素材（§0-D）
    assets: {
      avatar,
      bg: bgDots,
      bgAlt: bgRays,
      cheer: bgRays,
      empty: avatar,
      deco: [decoHangyo, decoShin1, decoShin2],
    },
```

**同時**：從 `PERSONAL_PACKS` **移除整個 `hello-kitty` 物件**。

> ⚠️ `stylePacksPersonal.ts` 是**唯一**可引用 personal 資產的模組。

**驗收**
- [ ] `grep -c "hello-kitty" src/` = 0（pack 已完全移除）
- [ ] `grep "import.*from.*assets/kawaii-pastel" src/data/stylePacksPersonal.ts` = 6
- [ ] `PERSONAL_PACKS.length === 1`
- [ ] `STYLE_PACKS.length`：dev = 9、release = 8
- [ ] tsc 0 errors

### 1-E. 裝飾元件（**含 release 隔離與 Hooks 順序**）

新建 `src/components/deco/PersonalDecor.tsx`：

> ⚠️ **Hooks 規則**：所有 `useThemeStore` 必須寫在**任何 early return 之前**。
> 原 v2 把 `useThemeStore` 寫在兩個 `if (...) return null;` 之後 → 執行期會拋
> 「Rendered more hooks than during the previous render」而崩潰。

```tsx
import { motion } from 'framer-motion';
import { getStylePack } from '@/data/stylePacks';
import { useThemeStore } from '@/store/themeStore';

export function PackAvatar({ size = 32, className }: { size?: number; className?: string }) {
  const packId = useThemeStore((s) => s.activePackId);   // ← hook 一律在最前面
  const src = getStylePack(packId)?.assets?.avatar;
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={className ?? 'rounded-full object-cover object-top'}
    />
  );
}

export function PackEmpty({ className }: { className?: string }) {
  const packId = useThemeStore((s) => s.activePackId);
  const src = getStylePack(packId)?.assets?.empty;
  if (!src) return null;
  return <img src={src} alt="" className={className ?? 'w-32 h-32 mx-auto rounded-2xl object-cover'} />;
}

export function PackCheer({ size = 96 }: { size?: number }) {
  const packId = useThemeStore((s) => s.activePackId);
  const motionEnabled = useThemeStore((s) => s.motionEnabled);   // ← 也在 return 之前
  const src = getStylePack(packId)?.assets?.cheer;
  if (!src) return null;
  return (
    <motion.img
      src={src}
      alt=""
      width={size}
      height={size}
      className="rounded-2xl object-cover"
      animate={motionEnabled ? { y: [0, -10, 0] } : undefined}
      transition={motionEnabled ? { repeat: Infinity, duration: 1.5 } : undefined}
    />
  );
}
```

> ⚠️ **原 v1 的 `KittyCheer` 用 `repeat: Infinity` 但不受 `motionEnabled` 控制**——
> 本版已修正，關閉過場動畫時不再無限動畫（符合 S-5 與 `prefers-reduced-motion` 契約）。

> **頭像白底處理（B6）**：`avatar.jpg`（My Melody 特寫）為方形、構圖含手部。
> 以 `rounded-full object-cover object-top` 做圓形裁切並對齊上半部；
> 若仍不理想，改用 `bg-dots.jpg` 的中央裁切作為頭像。

### 1-F. 掛載點（**每處都必須條件渲染**）

| 位置 | 檔案（**已核實存在**） | 插入 |
|---|---|---|
| 問候列 | `src/pages/Dashboard.tsx` | `<PackAvatar size={32} />` |
| 空狀態 | 有實際空狀態的區塊（**`src/components/ui/EmptyState.tsx` 不存在**，請先 grep 實際位置） | `<PackEmpty />` |
| 慶祝 | `src/features/achievements/components/CelebrationModal.tsx`（**不是** `workout/CelebrationOverlay.tsx`，該檔不存在） | `<PackCheer />` |
| 背景 | `PageShell.tsx` 內，`pack.assets?.bg` 以低透明度鋪底 | `<img className="opacity-[0.06]" />` |
| 裝飾素材 | 同上，`pack.assets?.deco` 逐張低透明度疊加 | 見下 |

> ❌ **不得修改 `src/components/ui/Button.tsx` 去 import personal 資產**。
> 原 v2 把 `KittyAvatar` / `BowIcon` **靜態 import 進 `Dashboard.tsx`、`Button.tsx`、`PartnerCard.tsx`**，
> 這正是 §0.1 禁止的事——`isProduction` 的 early return 是**執行期**判斷，元件程式碼**照樣進 bundle**。
>
> 若一定要按鈕裝飾，正確做法是在**頁面層**包一層
> `{!isProduction && <PackAvatar size={16} />}`，而非改共用元件。

> **`deco` 素材（含兩張蠟筆小新）的使用方式**：
> 以 `opacity ≤ 0.08`、`pointer-events-none` 疊加於背景層，**不作為主視覺**。
> 理由：該兩張原圖解析度較低，放大後鋸齒明顯；低透明度可保留「彩蛋」趣味而不影響可讀性。

**release 隔離實作方式**（建議 A）

- **A（簡單）**：`assets` 為 `undefined` 時元件自動回傳 `null`。
  production 下 `PERSONAL_PACKS` 被 tree-shake → `getStylePack` 找不到 personal pack → `assets` 必為 undefined → 自動不渲染。
- **B（嚴格）**：`React.lazy(() => import('@/components/deco/PersonalDecor'))` + `Suspense`。

### 1-G. 驗收

- [ ] `src/themes/personal/assets/kawaii-pastel/` 有 6 張圖，檔名無空格
- [ ] `grep "useThemeStore" src/components/deco/PersonalDecor.tsx` 的位置**全部在任何 return 之前**
- [ ] dev：切到 `kawaii-pastel` → Dashboard 顯示頭像、空狀態顯示插圖、慶祝顯示 My Melody
- [ ] dev：背景可見波點／放射線水印，且**不影響文字可讀性**
- [ ] release build：`grep -ril "kawaii\|melody\|shinchan\|hangyodon" dist/` = **0**
- [ ] release build：`dist/assets/` 內**沒有** personal 圖片檔案
- [ ] release build：畫廊只剩 core 8 款

---

## P-FIX-2：點擊特效修復

### 2-A. 現況釐清（**請勿照前兩版執行**）

| 前版說法 | 實際情況 |
|---|---|
| 「若 Button 沒有 `.btn` class，加入它」 | **已有**（`Button.tsx:26`）。**不需修改** |
| 「Button 的 onClick 要呼叫 `spawnClickFx(x, y, pack)`」 | **已呼叫**，但正確函式名是 `spawnClickFxType(x, y, type)`（`Button.tsx:46`）。`spawnClickFx` 只吃 `(x, y)` 兩個參數 |

**真正的問題**：只有 20 個檔案用共用 Button，其餘 **165 個原生 `<button>` 完全不觸發特效**。

### 2-B. 新增全域點擊監聽（**三重過濾，不可簡化**）

> ⚠️ **若監聽器直接綁在 `document` 上而不做目標過濾，則點擊空白處、在輸入框打字、
> 拖曳 Slider、開始捲動頁面都會噴粒子，體驗會被徹底毀掉。**
> 以下以「事件類型 + 白名單 + 黑名單」三重過濾解決。

新建 `src/utils/clickFxListener.ts`：

```ts
import { spawnClickFxType } from './clickFx';
import { getStylePack } from '@/data/stylePacks';

/** 白名單：只有真正可點擊的元素才觸發 */
const FX_TRIGGER_SELECTOR = [
  'button',
  '[role="button"]',
  'a[href]',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  '[data-fx-trigger]',
].join(',');

/** 黑名單：輸入類一律排除；data-fx-off 為個別元素的退出開關 */
const FX_EXCLUDE_SELECTOR = [
  'input:not([type="button"]):not([type="submit"]):not([type="reset"])',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[data-fx-off]',
].join(',');

/**
 * 全域點擊特效監聽：讓所有可點擊元素都觸發 clickFx，不限共用 Button。
 *
 * 設計要點：
 * 1. 用 `click` 而非 `pointerdown`——行動裝置上 pointerdown 會在「手指按下開始捲動」時就觸發，
 *    使用者只是滑動頁面卻噴滿粒子。`click` 只在真正啟動時觸發。
 * 2. 白名單 + 黑名單雙重過濾：空白處、div、捲軸、輸入框、Slider、文字選取皆不觸發。
 * 3. 回傳卸載函式，供 React StrictMode 雙次掛載正確清理（否則會殘留 2 個 listener）。
 */
export function installClickFxListener(): () => void {
  const handler = (e: MouseEvent) => {
    if (document.documentElement.getAttribute('data-fx') === 'off') return;  // 全域開關
    if (e.button !== 0) return;                                              // 只回應主要按鍵

    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (!target.closest(FX_TRIGGER_SELECTOR)) return;   // 空白處 / 捲軸 / 一般 div → 不噴
    if (target.closest(FX_EXCLUDE_SELECTOR)) return;    // 輸入框 / Slider / 選取 → 不噴

    const packId = document.documentElement.getAttribute('data-pack');
    if (!packId) return;
    const pack = getStylePack(packId);
    if (!pack || pack.motion.clickFx === 'none') return;

    spawnClickFxType(e.clientX, e.clientY, pack.motion.clickFx);
  };

  document.addEventListener('click', handler);
  return () => document.removeEventListener('click', handler);
}
```

在 `src/App.tsx` 的 `useEffect` 內掛載一次（**必須回傳 cleanup**）：

```ts
useEffect(() => installClickFxListener(), []);
```

**觸發行為對照表**（驗收時逐項確認）

| 操作 | 是否噴粒子 |
|---|---|
| 點擊共用 `Button` / 原生 `<button>` | ✅ 噴 |
| 點擊帶 `[data-fx-trigger]` 的自訂元素 | ✅ 噴 |
| 點擊頁面空白處 / 一般 `div` | ❌ 不噴 |
| 點擊文字、選取文字 | ❌ 不噴 |
| 在 `<input>` / `<textarea>` 打字 | ❌ 不噴 |
| 拖曳 `<input type="range">` Slider | ❌ 不噴 |
| 拖曳捲軸 / 開始捲動頁面 | ❌ 不噴 |
| 右鍵、中鍵 | ❌ 不噴 |
| 元素帶 `data-fx-off` | ❌ 不噴 |
| `data-fx="off"`（全域關閉） | ❌ 不噴 |

> ⚠️ **避免重複觸發**：掛上全域監聽後，**必須移除 `Button.tsx:38-50` 內的 `handleClick` 特效邏輯**，
> 讓特效只有單一來源（全域監聽）。否則共用 Button 會一次噴兩倍粒子。

### 2-C. 驗證

**正面案例**
- [ ] 點擊**原生 `<button>`**（例如 Settings 的 toggle）也有粒子
- [ ] 點擊帶 `[data-fx-trigger]` 的自訂元素也有粒子
- [ ] 共用 Button 只噴一次粒子（不是兩次）

**負面案例（必須逐一實測）**
- [ ] 點擊頁面空白處 → **無粒子**
- [ ] 在輸入框連續打字 → **無粒子**
- [ ] 拖曳任一 Slider（體重／訓練量）→ **無粒子**
- [ ] 在頁面上滑動捲動 → **無粒子**
- [ ] 長按選取文字 → **無粒子**
- [ ] 右鍵點擊按鈕 → **無粒子**
- [ ] 對某元素加 `data-fx-off` 後點擊 → **無粒子**

**開關與類型**
- [ ] `data-fx="off"` 時完全不噴
- [ ] `muji-calm`（`clickFx: 'none'`）不噴粒子
- [ ] 九款的 clickFx 視覺**兩兩可區分**：

| pack | clickFx | 預期視覺 |
|---|---|---|
| elegant-beige | shimmer | 金色細條向上擴散 |
| industrial-power | glitch | 螢光綠抖動方塊 |
| retro-card | holo | 箔金旋轉碎片 |
| aurora-glass | ripple | 青色擴散圓環 |
| neobrutal-pop | confetti | 多色方形爆散 |
| muji-calm | none | 無 |
| y2k-chrome | sparkle | 發光圓點 |
| wpa-trail | stamp | 方形印章壓印 |
| kawaii-pastel | stars | 星星粒子 |

- [ ] Console 證據：`document.documentElement.getAttribute('data-pack')` 與 `data-fx` 的值正確

---

## P-FIX-3：過場動畫修復

### 3-A. `PageShell.tsx` 接線

> ⚠️ **前版的範例程式碼有 3 處錯誤**：
> `PACK_MOTION[packId]`（key 錯）、`motion.variants` / `motion.transition`（`MotionVariant` 沒有這兩個欄位）、
> `hidden: motion.enter`（**邏輯反了**——`enter` 是「進場後」的目標態 `opacity: 1`，
> 拿它當 hidden 起始態等於元素一開始就完全可見，**完全沒有進場動畫**）。

```tsx
import { motion } from 'framer-motion';
import { getStylePack } from '@/data/stylePacks';
import { getMotionForPack, toFramerVariants, toFramerTransition } from '@/data/packMotion';
import { useThemeStore } from '@/store/themeStore';
import { PackDeco } from '@/components/deco/PackDeco';

const isProduction = import.meta.env.VITE_RELEASE_MODE === 'production';

export function PageShell({ children, /* ...既有 props... */ }: PageShellProps) {
  const packId = useThemeStore((s) => s.activePackId);
  const motionEnabled = useThemeStore((s) => s.motionEnabled);

  const variant = getMotionForPack(packId, motionEnabled);
  const pack = getStylePack(packId);   // ← StylePack | null

  return (
    <div className="min-h-screen w-full max-w-[480px] mx-auto bg-bg-primary flex flex-col">
      {pack && <PackDeco deco={pack.deco} allowPersonal={!isProduction} />}
      <motion.div
        variants={toFramerVariants(variant)}
        initial="hidden"
        animate="visible"
        transition={toFramerTransition(variant)}
        className="flex flex-col flex-1"
      >
        {/* header + main 既有內容 */}
      </motion.div>
      {showNav && <BottomNav />}
    </div>
  );
}
```

> 注意：PageShell 沒有 `AnimatePresence`，所以**不要**加 `exit="exit"`（不會被觸發，是死碼）。

### 3-B. Modal / Sheet 接線（**範圍收斂：只改核心 6 個**）

實際使用 `AnimatePresence` 的檔案共 **20 個**。本階段**只處理以下 6 個核心 Modal**：

```
src/components/WeeklyReportModal.tsx
src/components/FeedbackModal.tsx
src/components/ImportHistoryModal.tsx
src/components/RecognitionModal.tsx
src/components/TrialLock.tsx
src/components/workout/RecoveryModal.tsx
```

**做法**：把硬編碼的 `initial/animate/transition` 換成
`getMotionForPack(packId, motionEnabled)` + `toFramerVariants` / `toFramerTransition`。

> 其餘 14 個（頁面級 motion、sheet、toast 等）**本階段不動**，留待後續獨立任務。
> `TrialLockModal` **不存在**（實際是 `TrialLock.tsx`）。

### 3-C. CSS transition（**修正 selector**）

> ⚠️ 前版的 `[data-pack="aurora-glass"] .card` **命中 0 個元素**——
> 專案沒有 `.card` class，卡片用的是 Tailwind `bg-bg-card rounded-card`（見 `Card.tsx:13`）。

```css
[data-pack='aurora-glass'] .rounded-card {
  transition: transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
[data-pack='neobrutal-pop'] .rounded-card {
  transition: none;
}
[data-pack='muji-calm'] .rounded-card {
  transition: opacity 800ms ease-out;
}
```

> `[data-motion='off']` 的消費端已由 §0-E 承擔（同時覆蓋 `.btn` 與 `.rounded-card`）。

### 3-D. 頁面級 motion（**本階段不做**）

`Exercises.tsx` / `Workout.tsx` / `Plans.tsx` / `PlanDetail.tsx` / `Onboarding.tsx` 內
硬編碼的動畫**保持原狀**。

> **C2 裁決**：`Workout.tsx` 的組間切換動畫有特殊用途，**保留硬編碼**，只讓其 `duration`
> 受 `motionEnabled` 控制。其餘頁面留待後續任務，避免一次改動過大。

### 3-E. 驗證

- [ ] `aurora-glass` 開 WeeklyReportModal → spring scale 彈出（`exit.scale = 0.96` → 1）
- [ ] `neobrutal-pop` 開同一 Modal → 立即出現（`duration: 0.01`）
- [ ] `muji-calm` → 慢淡入（`0.45s`）
- [ ] 關閉「過場動畫」toggle → 所有頁面與 modal 無動畫
- [ ] `PACK_MOTION` 至少被 2 個檔案 import（不再是 0）
- [ ] `hidden` 對應的是 `exit`（起始態為 `opacity: 0`），進場動畫確實可見

> 註：`slow-fade` 的 registry 值是 **0.45s**，`aurora-glass` 的 `exit.scale` 是 **0.96**。
> 文件中任何 800ms / 0.9 的說法都是錯的，請以 `packMotion.ts` 實際值為準。

---

## P-FIX-4：Toggle 與 Release 閘門

### 4-A. Toggle（**前版此處是反向操作，切勿照做**）

| 前版說法 | 實際情況 |
|---|---|
| 「若預設為 false，改為 true（除非系統設定 prefers-reduced-motion）」 | **現況已經是**「未手動設定時 = `!reducedMotion`」，**預設就是 true** |

**結論：`themeStore.ts` 的 `getInitialFxMotion()` 不需要修改。**
照前版改成 true 會**刪掉 `prefers-reduced-motion` 的無障礙預設**，違反 S-5。

**本階段只做一件事**：確認 `data-motion` 真的有消費端（即 §0-E 與 §3-C 的 CSS）。

> 註：變數名是 `reducedMotion`（`themeStore.ts:138`），**不是** `prefersReducedMotion`。

### 4-B. Release 閘門

**現況**：`package.json` 的 build 是 `"tsc -b && vite build"`，**沒有帶 `VITE_RELEASE_MODE`**。
實測 `grep -ril kitty dist/` **命中 3 個檔案** → 規格 §8 的「grep = 0」**從未真正通過**。

**修法（不新增依賴、跨平台）**：新增 `.env.production`：

```
VITE_RELEASE_MODE=production
```

- `vite build` 預設 `mode=production` → 自動載入 `.env.production` → `isProduction === true` → personal packs 被 tree-shake。
- `vite` dev 預設 `mode=development` → 不載入 → personal pack 正常顯示。
- 不需改 `package.json`、不需 `cross-env`。

> ❌ **不要寫成** `"build": "VITE_RELEASE_MODE=production tsc -b && vite build"`——
> env 前綴**只作用於 `tsc -b`**，`vite build` 在 `&&` 之後**拿不到這個變數**，release gate 依然不生效。
> 且該寫法在 Windows 直接失效。
>
> ✅ 若堅持寫在 script 內，正確位置是 `"tsc -b && VITE_RELEASE_MODE=production vite build"`（前綴放在 `vite` 前）。

> ⚠️ 確認 `.gitignore` **沒有**排除 `.env.production`（目前只排除 `.env.production.local`，可提交）。
> ⚠️ `.gitignore` 已正確排除 `src/themes/personal/assets/*` 並保留 `README.md`（已確認，無需修改）。

### 4-C. 驗證

- [ ] `npm run build` 後 `grep -ril "kawaii\|melody\|shinchan\|hangyodon" dist/` = **0**
- [ ] build 後 `dist/assets/` 內**沒有** personal 圖片檔案
- [ ] dev 下 9 款全部可見
- [ ] 關閉 fx toggle → 全域點擊無粒子
- [ ] 關閉 motion toggle → 頁面與 modal 無過場、hover 無位移
- [ ] 兩者重新整理後仍保持設定

> **D2 已確認**：允許執行 `npm run build`（會覆蓋現有 `dist/`；`dist/` 已在 `.gitignore`）。

---

## P-FIX-5：StyleGallery 預覽卡

**問題**：`PackPreview` 只用 `pack.vars` 畫抽象色塊，**從來不顯示圖片** → 畫廊看不到真實素材。

> ⚠️ **`buildVars()` 回傳的 key 不含 `--` 前綴**。
> 前版寫 `pack.vars['--bg-primary']` → 取到 `undefined`，而且**現有程式碼本來就是對的**，
> 等於把能跑的程式碼改壞。正確是 `pack.vars['bg-primary']`。

```tsx
function PackPreview({ pack }: { pack: StylePack }) {
  const shadows = packShadows(pack.shape.shadow);
  const borderWidth = parseInt(pack.shape.borderWidth, 10) || 1;
  const cover = pack.assets?.bg ?? pack.assets?.avatar;   // personal 才會有

  const style: React.CSSProperties = {
    ['--bg-primary' as string]: pack.vars['bg-primary'],   // ← 無 -- 前綴
    ['--bg-card' as string]: pack.vars['bg-card'],
    ['--text-primary' as string]: pack.vars['text-primary'],
    ['--accent' as string]: pack.vars['accent'],
    ['--border-color' as string]: pack.vars['border-color'],
    background: pack.vars['bg-primary'],
    borderRadius: pack.shape.radiusCard,
    border: `${borderWidth}px solid ${pack.vars['border-color']}`,
    boxShadow: shadows.card,
    fontFamily: pack.typo.display,
  };

  if (cover) {
    return (
      <div className="relative h-24 w-full overflow-hidden" style={style}>
        <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
      </div>
    );
  }

  // 以下保留既有抽象預覽結構（勿改動，避免 core 8 款視覺回歸）
  return (
    <div className="h-24 w-full flex flex-col p-3 gap-2 overflow-hidden" style={style}>
      {/* ...既有內容不變... */}
    </div>
  );
}
```

**驗收**
- [ ] core 8 款的預覽卡外觀**與修改前一致**（無視覺回歸）
- [ ] dev 下 `kawaii-pastel` 預覽卡顯示真實圖片（非抽象色塊）
- [ ] release build 下畫廊只剩 8 款，且**不渲染任何 personal 圖片**

---

## P-FIX-6：文件更新與守門

### 6-A. 文件同步

- `DEV_RULES.md`：新增 L2.5「動態人格層律」（transition / hover / clickFx 三件套、deco 消費、
  clickFx 單一來源且需目標過濾、release 隔離）；寫入 S-1~S-9；**移除 hello-kitty 相關敘述**
- `ARCHITECTURE.md` §20：補 `PackDeco`、`clickFxListener`、`getMotionForPack`、hover attribute selector 章節；陣容改 9 款
- `DATA_FLOW.md`：補「pack 切換 → CSS vars → deco → motion → hover → clickFx」完整流
- `REGRESSION_CHECKLIST.md` §21：補 §21.6「deco 渲染矩陣」、§21.7「hover 矩陣」；修正 §21.4；陣容改 9 款

### 6-B. 守門矩陣

| 項目 | 通過條件 | 指令 |
|---|---|---|
| TypeScript | 0 errors | `npm run check` |
| Build | 成功 | `npm run build` |
| Hex Gate | components/pages = 0 | `grep -rn "#[0-9a-fA-F]\{3,8\}" src/components src/pages` |
| `as any` | 0 | `grep -rn "as any" src` |
| 非空斷言 | 0 | `grep -rn "[a-zA-Z0-9_)]!\." src --include=*.ts --include=*.tsx` |
| Release Gate | 0 | `grep -ril "kawaii\|melody\|shinchan\|hangyodon" dist/` |

---

## 輸出要求

1. **每階段 diff 摘要 + 驗收勾選**（不得只寫「已完成」）
2. **`PACK_MOTION` / deco / hover / clickFx 對照表**（實際寫入值）
3. **守門矩陣結果 + release grep 證據**（貼原始指令與輸出）
4. **視覺證據**：
   - Settings 風格畫廊（Core 8 + Personal 1，personal 卡有「自用」badge）
   - `kawaii-pastel` 下的 Dashboard（顯示真實圖片，非 CSS 形狀）
   - 3 個不同 pack 的點擊特效
   - 3 個不同 pack 的 hover 效果
   - `aurora-glass` vs `neobrutal-pop` 的 Modal 開啟動畫差異
5. **commit**（**不 push**）：訊息格式 `P-FIX: 風格系統動態層接線與可愛版資產整合`

### 工具指定

- **截圖 / Console 取值**：使用 `agent-browser` skill
- **錄影**：⚠️ **動手前先驗證 `agent-browser` 是否真有錄影／GIF 匯出能力**（**D3，尚未驗證**）。
  若沒有，改用「多幀截圖拼接」或 `playwright-cli` 的 video 功能。
  **不得因為工具不支援就改寫成「文字描述」充當證據。**
- **不接受**用文字描述代替截圖／錄影

---

## 禁止事項

- ❌ 不要說「已實作」但沒有證據
- ❌ 不要用 CSS fallback 代替真實圖片
- ❌ 不要假設 attribute selector 有效，必須在瀏覽器實際驗證
- ❌ **不要把 clickFx 監聽器寫成裸的 `document.addEventListener`**
  （必須做目標白名單／黑名單過濾，否則空白處、輸入框、Slider、捲動都會噴粒子）
- ❌ **不要在改寫 `spawnParticle` 時刪掉粒子 `<span>` 迴圈或 `vivix-fx` 基礎 class**
- ❌ **不要在 `index.css` 新增 hex 色碼或寫死 rgba**（deco / hover 顏色一律讀 CSS 變數）
- ❌ **不要修改 `src/components/ui/Button.tsx` 去 import personal 資產**（破壞 release 隔離）
- ❌ 不要改壞既有的 `applyPack()` / `applyFxMotion()` 簽名
- ❌ 不要刪除 `prefers-reduced-motion` 檢查，也不要把它改成 `true`
- ❌ 不要把 Hook 寫在任何 early return 之後
- ❌ 不要用「描述」代替截圖／錄影
- ❌ 不要新增 npm 依賴
- ❌ **不要刪除 `src/themes/personal/assets/*` 的 .gitignore 規則**
- ❌ **不要代為刪除 `Hello kitty image/` 資料夾**（屬用戶個人檔案，由用戶自行決定）
- ❌ **在 P-FIX-0 完成前，不要開始 P-FIX-1 的任何圖片複製動作**
- ❌ 不要照抄前兩版草稿的任何程式碼片段（已知各有 5～10 處會直接失敗）

---

## 驗收標準（與任務逐條對應）

| # | 項目 | 通過條件 | 階段 |
|---|---|---|---|
| 1 | Registry 契約 | `PACK_MOTION` 被 import ≥2 處；11 種 clickFx CSS 齊備 | P-FIX-0 |
| 2 | 粒子擴散 | `--fx-dx/--fx-dy` 已設定；粒子朝不同方向散開；上限 6 生效；死碼已刪 | P-FIX-0-C |
| 3 | deco 層 | 每款 pack 的 deco 實際渲染且可區分；顏色讀 CSS 變數 | P-FIX-0-D |
| 4 | **hover 層** | **9 款 hover 視覺可區分；`PACK_HOVER_CSS` 已刪；`data-motion` 有消費端** | P-FIX-0-E |
| 5 | 可愛版圖片 | Dashboard / 空狀態 / 慶祝 / 背景 顯示真實圖片；**6 張、無重複檔** | P-FIX-1 |
| 6 | hello-kitty | **pack 完全移除**（`grep -c "hello-kitty" src/` = 0） | P-FIX-1-D |
| 7 | 點擊特效 | 原生 button 也觸發；9 款視覺可區分；**空白處／輸入框／Slider／捲動／選取皆不觸發** | P-FIX-2 |
| 8 | 過場動畫 | aurora-glass 有 spring、neobrutal 無動畫、muji 慢淡入；進場動畫確實可見 | P-FIX-3 |
| 9 | Toggle | 關閉 fx/motion 後效果確實消失（含 hover 位移） | P-FIX-4-A |
| 10 | Release 閘門 | `.env.production` 生效；`grep dist/` = 0；dist 無 personal 圖片 | P-FIX-4-B |
| 11 | StyleGallery | personal 預覽卡顯示真實圖片；core 8 款無視覺回歸 | P-FIX-5 |
| 12 | 守門矩陣 | tsc 0 / build 成功 / hex 0 / as any 0 | P-FIX-6 |
| 13 | 視覺證據 | 5 組截圖／錄影齊備 | 輸出要求 4 |

---

## 執行順序（不可調換）

```
P-FIX-0   Registry 契約修正（packMotion / clickFx CSS / 粒子 / deco / hover）
   ↓
P-FIX-4-B .env.production（提早建立，讓後續每步都能驗 release）
   ↓
P-FIX-2   點擊特效（依賴 0-A / 0-C）
   ↓
P-FIX-3   過場動畫（依賴 0-A / 0-D）
   ↓
P-FIX-1   可愛版圖片資產（依賴 §1-A，已裁決可直接動工）
   ↓
P-FIX-5   StyleGallery 預覽卡（依賴 P-FIX-1 的 assets 欄位）
   ↓
P-FIX-4-A / P-FIX-6  文件與守門
```

> **D4 裁決**：不需再等任何裁決，可從 P-FIX-0 直接開始。
