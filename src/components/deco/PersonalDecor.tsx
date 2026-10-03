/**
 * Personal-only 可愛版圖片裝飾（P-FIX-1）
 *
 * 三個條件渲染組件：PackAvatar / PackEmpty / PackCheer。
 * 僅當目前 pack.assets 有對應圖片時顯示圖片，否則 render children（fallback UI）。
 *
 * 實作原則：
 * - 只讀 activePackId → getStylePack → assets，不引入 personal 模組本身，
 *   production build 下整個 personal 鏈路被 tree-shake，此檔案只剩 children render。
 * - core pack 的 assets 永遠為 undefined，等於 pass-through，零效能成本。
 */
import type { ReactNode } from 'react';
import { useThemeStore } from '@/store/themeStore';
import { getStylePack } from '@/data/stylePacks';
import type { PackAssets } from '@/types/theme';

function usePackAssets(): Partial<PackAssets> | undefined {
  const packId = useThemeStore((s) => s.activePackId);
  const pack = getStylePack(packId);
  return pack?.assets;
}

interface DecorProps {
  children: ReactNode;
  className?: string;
}

/** 頭像：有 assets.avatar 時顯示圖片，否則 render children（原本的文字／icon 頭像） */
export function PackAvatar({ children, className }: DecorProps) {
  const assets = usePackAssets();
  if (assets?.avatar) {
    return (
      <img
        src={assets.avatar}
        alt="avatar"
        className={className}
        draggable={false}
      />
    );
  }
  return <>{children}</>;
}

/** 空狀態插畫：有 assets.empty 時顯示圖片，否則 render children */
export function PackEmpty({ children, className }: DecorProps) {
  const assets = usePackAssets();
  if (assets?.empty) {
    return (
      <img
        src={assets.empty}
        alt="empty"
        className={className}
        draggable={false}
      />
    );
  }
  return <>{children}</>;
}

/** 慶祝插畫：有 assets.celebrate 時顯示圖片，否則 render children */
export function PackCheer({ children, className }: DecorProps) {
  const assets = usePackAssets();
  if (assets?.celebrate) {
    return (
      <img
        src={assets.celebrate}
        alt="celebrate"
        className={className}
        draggable={false}
      />
    );
  }
  return <>{children}</>;
}
