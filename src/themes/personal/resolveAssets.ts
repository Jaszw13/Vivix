/**
 * Personal asset resolver（P-FIX-1）
 *
 * 個人版圖片放在 src/themes/personal/assets/{packId}/ ，整個資料夾被 .gitignore。
 * 由於圖片可能不存在（用戶未提供），不能用靜態 import（會令 build 失敗）。
 * 改用 import.meta.glob 動態載入「實際存在」的檔案，並以檔名前綴對應 PackAssets 欄位。
 *
 * 支援的檔名前綴（副檔名可為 .png/.jpg/.jpeg/.webp/.gif）：
 *   avatar.*        → assets.avatar
 *   bg.*            → assets.bg
 *   empty.*         → assets.empty
 *   celebrate.*     → assets.celebrate
 *   mascot.*        → assets.mascot
 *   badge.*         → assets.badge
 */
import type { PackAssets } from '@/types/theme';

const KAWAII_FILES = import.meta.glob<string>(
  '/src/themes/personal/assets/kawaii-pastel/*',
  { eager: true, query: '?url', import: 'default' },
);

const ASSET_KEYS: Array<keyof PackAssets> = [
  'avatar',
  'bg',
  'empty',
  'celebrate',
  'mascot',
  'badge',
];

function pickAsset(files: Record<string, string>, key: keyof PackAssets): string | undefined {
  const prefix = `/src/themes/personal/assets/kawaii-pastel/${key}.`;
  for (const path of Object.keys(files)) {
    if (path.startsWith(prefix)) return files[path];
  }
  return undefined;
}

export function getKawaiiAssets(): Partial<PackAssets> | null {
  const hasAny = Object.keys(KAWAII_FILES).length > 0;
  if (!hasAny) return null;

  const assets: Partial<PackAssets> = {};
  for (const key of ASSET_KEYS) {
    const url = pickAsset(KAWAII_FILES, key);
    if (url) assets[key] = url;
  }
  return Object.keys(assets).length > 0 ? assets : null;
}
