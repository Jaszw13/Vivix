import { useThemeStore } from '@/store/themeStore';
import { getStylePack, packShadows } from '@/data/stylePacks';
import type { PersonalRecord } from '@/types';
import type { StylePack } from '@/types/theme';

interface PRCardProps {
  pr: PersonalRecord;
  pack?: StylePack;
}

/**
 * PR 球員卡（S4）
 * - retro-card：復古球員卡版面（粗黑邊、金箔、Slab Serif、偽 3D 傾斜）
 * - 其他風格：套用對應 shape 與 vars
 * 所有色碼來自 pack.vars，元件內不出現 hex。
 */
export function PRCard({ pr, pack }: PRCardProps) {
  const activePackId = useThemeStore((s) => s.activePackId);
  const effectivePack = pack ?? getStylePack(activePackId) ?? getStylePack('elegant-beige')!;
  const shadows = packShadows(effectivePack.shape.shadow);
  const is90s = effectivePack.id === 'retro-card';

  const value = pr.repPR !== undefined ? `BW × ${pr.repPR}` : `${pr.weight}kg × ${pr.reps}`;
  const sub = pr.repPR !== undefined ? 'REPS' : `1RM ${pr.estimated1RM}kg`;

  const cardStyle: React.CSSProperties = {
    background: effectivePack.vars['bg-card'],
    border: is90s ? '3px solid' : '2px solid',
    borderColor: effectivePack.vars['border-color'],
    borderRadius: effectivePack.shape.radiusCard,
    boxShadow: shadows.card,
    transform: is90s ? 'perspective(600px) rotateY(-4deg) rotateX(2deg)' : undefined,
    fontFamily: effectivePack.typo.display,
    color: effectivePack.vars['text-primary'],
  };

  return (
    <div className="w-full max-w-xs aspect-[3/4] p-4 flex flex-col" style={cardStyle}>
      {/* 頂部：動作名 */}
      <div
        className="text-center text-lg font-bold tracking-wide"
        style={{ color: effectivePack.vars['text-primary'] }}
      >
        {pr.exerciseName}
      </div>

      {/* 中部：主數值 */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div
          className="text-5xl font-black tracking-tight"
          style={{
            color: effectivePack.vars['accent'],
            fontFamily: effectivePack.typo.numbers,
            textShadow: is90s ? `2px 2px 0 ${effectivePack.vars['border-color']}` : undefined,
          }}
        >
          {value}
        </div>
        <div
          className="text-xs tracking-[0.3em] mt-2"
          style={{ color: effectivePack.vars['text-secondary'] }}
        >
          {sub}
        </div>
      </div>

      {/* 底部：日期 + 1RM */}
      <div
        className="flex justify-between items-center text-[10px] pt-3 border-t"
        style={{ borderColor: effectivePack.vars['border-color'], color: effectivePack.vars['text-muted'] }}
      >
        <span>{new Date(pr.date).toLocaleDateString('zh-TW')}</span>
        <span>VIVIX PR</span>
      </div>
    </div>
  );
}
