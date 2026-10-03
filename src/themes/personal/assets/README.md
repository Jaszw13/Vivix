# Personal StylePack Assets

> **版權聲明**：Hello Kitty 為 Sanrio Co., Ltd. 註冊商標。
> 此資料夾僅供**個人使用**，不得散布、商用或納入 release build。
> `src/themes/personal/assets/` 已加入 `.gitignore`，不會進入版本控制。

## 用途

此資料夾存放 personal-only StylePack（hello-kitty、kawaii-pastel）所需的圖片資產：

| 檔案 | 用途 |
|------|------|
| `kitty-bg.png` | Hello Kitty 背景水印 |
| `kitty-bow.png` | 按鈕蝴蝶結裝飾 |
| `kawaii-clouds.png` | Kawaii Pastel 雲朵背景 |
| `kawaii-stars.png` | Kawaii Pastel 星星裝飾 |

## Release 保證

- `VITE_RELEASE_MODE=production` 時，`stylePacksPersonal.ts` 模組被 tree-shake。
- 此資料夾的圖片不會被 production build 引用。
- `grep -ri "hello-kitty\|kitty" dist/` 應為 0。

## 注意

若無提供圖片，hello-kitty / kawaii-pastel pack 會自動 fallback 至 CSS 裝飾（bow / clouds / hearts / stars 以 clip-path 渲染），不影響功能。
