import { useThemeStore } from '@/store/themeStore';
import { STYLE_PACKS, packShadows } from '@/data/stylePacks';
import type { StylePack, PackLicense } from '@/types/theme';
import { Check, Sparkles, Lock } from 'lucide-react';

interface StyleGalleryProps {
  onSelect?: () => void;
}

const LICENSE_LABEL: Record<PackLicense, string> = {
  core: 'Core',
  'personal-only': 'Personal',
};

/**
 * 迷你預覽卡：用 pack 的 CSS vars 局部覆蓋（不影響全局）
 */
function PackPreview({ pack }: { pack: StylePack }) {
  const shadows = packShadows(pack.shape.shadow);
  const borderWidth = parseInt(pack.shape.borderWidth, 10) || 1;
  const style: React.CSSProperties = {
    // 局部 CSS var 覆蓋（僅此卡）
    ['--bg-primary' as string]: pack.vars['bg-primary'],
    ['--bg-card' as string]: pack.vars['bg-card'],
    ['--text-primary' as string]: pack.vars['text-primary'],
    ['--text-secondary' as string]: pack.vars['text-secondary'],
    ['--accent' as string]: pack.vars['accent'],
    ['--border-color' as string]: pack.vars['border-color'],
    background: pack.vars['bg-primary'],
    borderRadius: pack.shape.radiusCard,
    border: `${borderWidth}px solid`,
    borderColor: pack.vars['border-color'],
    boxShadow: shadows.card,
    fontFamily: pack.typo.display,
  };

  return (
    <div
      className="h-24 w-full flex flex-col p-3 gap-2 overflow-hidden relative"
      style={
        pack.assets?.bg
          ? {
              ...style,
              backgroundImage: `url(${pack.assets.bg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : style
      }
    >
      {/* 若有 bg 圖片，加一層半透明遮罩確保文字可讀 */}
      {pack.assets?.bg && (
        <div
          className="absolute inset-0"
          style={{ background: `${pack.vars['bg-primary']}cc` }}
        />
      )}
      <div
        className="text-[10px] font-bold tracking-wider relative"
        style={{ color: pack.vars['text-primary'] }}
      >
        VIVIX
      </div>
      <div
        className="flex-1 flex flex-col gap-1 rounded p-2 relative"
        style={{
          background: pack.vars['bg-card'],
          borderRadius: pack.shape.radiusBtn,
        }}
      >
        <div
          className="h-1.5 w-8 rounded-sm"
          style={{ background: pack.vars['accent'] }}
        />
        <div
          className="h-1 w-6 rounded-sm"
          style={{ background: pack.vars['text-muted'] }}
        />
      </div>
      <div
        className="h-2.5 rounded-sm relative"
        style={{ background: pack.vars['accent'], borderRadius: pack.shape.radiusBtn }}
      />
    </div>
  );
}

export function StyleGallery({ onSelect }: StyleGalleryProps) {
  const activePackId = useThemeStore((s) => s.activePackId);
  const setPack = useThemeStore((s) => s.setPack);

  const groups: { license: PackLicense; packs: StylePack[] }[] = (
    [
      { license: 'core', packs: STYLE_PACKS.filter((p) => p.license === 'core') },
      { license: 'personal-only', packs: STYLE_PACKS.filter((p) => p.license === 'personal-only') },
    ] as { license: PackLicense; packs: StylePack[] }[]
  ).filter((g) => g.packs.length > 0);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.license}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-text-primary">
              {LICENSE_LABEL[group.license]}
            </h3>
            {group.license === 'personal-only' && (
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-accent/50 text-accent flex items-center gap-0.5">
                <Lock size={8} /> 自用
              </span>
            )}
            {group.license === 'core' && (
              <Sparkles size={12} className="text-accent" />
            )}
            <span className="text-xs text-text-muted">({group.packs.length})</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {group.packs.map((pack) => {
              const active = pack.id === activePackId;
              return (
                <button
                  key={pack.id}
                  onClick={() => {
                    setPack(pack.id);
                    onSelect?.();
                  }}
                  className={`relative text-left rounded-card overflow-hidden transition-transform ${
                    active ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-primary' : ''
                  }`}
                >
                  <PackPreview pack={pack} />
                  <div className="px-3 py-2 bg-bg-secondary">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text-primary">
                        {pack.label}
                      </span>
                      {active && (
                        <Check size={14} className="text-accent" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
