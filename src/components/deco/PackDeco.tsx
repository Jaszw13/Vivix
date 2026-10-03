/**
 * PackDeco — 依 pack.deco 渲染背景裝飾層（P-FIX-0-D）
 *
 * 所有顏色讀 CSS Variables（index.css 的 .deco-* 規則），不寫死色碼。
 * pointer-events: none，不阻擋點擊。
 * release 下透過 allowPersonal=false 隱藏 polka/rays（personal 專用）。
 */
import type { PackDeco as PackDecoKind } from '@/types/theme';

interface Props {
  deco: PackDecoKind[];
  /** personal 裝飾是否允許渲染；release 下必須傳 false */
  allowPersonal?: boolean;
}

export function PackDeco({ deco, allowPersonal = false }: Props) {
  const kinds = deco.filter(
    (d) => d !== 'none' && (allowPersonal || (d !== 'polka' && d !== 'rays')),
  );
  if (kinds.length === 0) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      {kinds.map((k) => (
        <div key={k} className={`deco-layer deco-${k} absolute inset-0`} />
      ))}
    </div>
  );
}
