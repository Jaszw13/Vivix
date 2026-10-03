# Personal StylePack Assets

> **版權聲明**：此資料夾素材含第三方 IP（Sanrio 等），
> 僅供**個人使用**，不得散布、商用或納入 release build。
> `src/themes/personal/assets/` 已加入 `.gitignore`，不會進入版本控制。

## 用途

此資料夾存放 personal-only StylePack（kawaii-pastel）所需的圖片資產。
將圖片放入 `kawaii-pastel/` 子目錄，檔名前綴對應 `PackAssets` 欄位：

| 檔名前綴 | 用途 |
|----------|------|
| `avatar.*`    | 夥伴頭像（Dashboard） |
| `bg.*`        | 背景裝飾（StyleGallery 預覽／PackDeco） |
| `empty.*`     | 空狀態插畫（Progress PR 清單） |
| `celebrate.*` | 慶祝插畫（成就解鎖彈窗） |
| `mascot.*`    | 吉祥物（選用） |
| `badge.*`     | 徽章（選用） |

副檔名支援 `.png`／`.jpg`／`.jpeg`／`.webp`／`.gif`。

## Release 保證

- `VITE_RELEASE_MODE=production` 時，`stylePacksPersonal.ts` 模組被 tree-shake。
- `vite.config.ts` 的 release 守衛（`release-gate-personal-assets`）會在 `generateBundle` 階段
  以 md5 比對剔除所有個人版資產（tree-shaking 管不到 `emitFile` 的實體檔，必須主動剔除）。
- 驗收（檔案系統，非字串搜尋——檔名為 content-hash，不含 `kawaii`）：
  `find dist -type f \( -name "*.jpeg" -o -name "*.jpg" -o -name "*.webp" \) | wc -l` 必須為 `0`。

## 注意

若無提供圖片，kawaii-pastel pack 會自動 fallback 至 CSS 裝飾（polka／rays 以 CSS 渲染），不影響功能。
