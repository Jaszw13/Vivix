import { getStylePack } from '@/data/stylePacks';
import type { StylePack } from '@/types/theme';
import type { SessionHighlight } from '@/features/retention/highlight';
import { escapeXml, svgToPngBlob } from './sharePR';

interface ShareHighlightOptions {
  /** 選填照片（data URL）；只在這次分享使用，不寫入本機 */
  photoDataUrl?: string | null;
  packId?: string;
}

/**
 * P1-3：把訓練高光卡渲染成直式 PNG（540×960），再用 Web Share API 分享。
 * 不含體重、姓名、體脂；照片需用戶當次明確加入。
 *
 * @returns 'shared' | 'downloaded' | 'failed'
 */
export async function shareHighlightCard(
  highlight: SessionHighlight,
  options: ShareHighlightOptions = {},
): Promise<'shared' | 'downloaded' | 'failed'> {
  const pack: StylePack =
    (options.packId ? getStylePack(options.packId) : null) ??
    getStylePack('elegant-beige')!;

  const svg = buildHighlightSVG(highlight, pack, options.photoDataUrl ?? null);
  const blob = await svgToPngBlob(svg, 2);
  if (!blob) return 'failed';

  const fileName = `vivix-highlight-${highlight.dateLabel.replace('/', '-')}.png`;
  const file = new File([blob], fileName, { type: 'image/png' });

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
    try {
      await nav.share({
        files: [file],
        title: 'Vivix 訓練高光',
        text: `${highlight.dayName} · ${highlight.totalVolume}kg 總量`,
      });
      return 'shared';
    } catch {
      // 用戶取消 → fallthrough 到下載
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return 'downloaded';
}

function buildHighlightSVG(
  h: SessionHighlight,
  pack: StylePack,
  photoDataUrl: string | null,
): string {
  const W = 540;
  const H = 960;
  const is90s = pack.id === 'retro-card';
  const radius = parseFloat(pack.shape.radiusCard) || 0;
  const hasPhoto = !!photoDataUrl;
  const photoH = 300;
  const top = hasPhoto ? 20 + photoH + 32 : 60;

  const bestValue = h.bestSet
    ? h.bestSet.weight === 0
      ? `BW × ${h.bestSet.reps}`
      : `${h.bestSet.weight}kg × ${h.bestSet.reps}`
    : '—';

  const volumeLine =
    h.volumeDeltaPct === null
      ? `${(h.totalVolume / 1000).toFixed(1)}t 總量`
      : `${(h.totalVolume / 1000).toFixed(1)}t 總量 · ${h.volumeDeltaPct > 0 ? '+' : ''}${h.volumeDeltaPct}% 對上次`;

  const recordsLine =
    h.newRecordCount > 0 ? `${h.newRecordCount} 個新紀錄` : `${h.totalSets} 組完成`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="rgba(0,0,0,0.28)"/>
    </filter>
    <clipPath id="photoClip">
      <rect x="40" y="20" width="${W - 80}" height="${photoH}" rx="${radius}"/>
    </clipPath>
  </defs>
  <rect x="0" y="0" width="${W}" height="${H}" fill="${pack.vars['bg-primary']}"/>
  <rect x="20" y="20" width="${W - 40}" height="${H - 40}" rx="${radius}"
    fill="${pack.vars['bg-card']}" stroke="${pack.vars['border-color']}"
    stroke-width="${is90s ? 4 : 2}" filter="url(#cardShadow)"/>
  ${
    hasPhoto
      ? `<image href="${photoDataUrl}" x="40" y="20" width="${W - 80}" height="${photoH}"
          preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)"/>`
      : ''
  }
  <text x="${W / 2}" y="${top}" text-anchor="middle"
    font-family="${pack.typo.body}" font-size="13" letter-spacing="6"
    fill="${pack.vars['text-secondary']}">VIVIX · 訓練高光</text>
  <text x="${W / 2}" y="${top + 64}" text-anchor="middle"
    font-family="${pack.typo.display}" font-size="44" font-weight="700"
    fill="${pack.vars['text-primary']}">${escapeXml(h.dayName)}</text>
  <text x="${W / 2}" y="${top + 96}" text-anchor="middle"
    font-family="${pack.typo.body}" font-size="14"
    fill="${pack.vars['text-muted']}">${escapeXml(h.dateLabel)}</text>

  <text x="${W / 2}" y="${top + 200}" text-anchor="middle"
    font-family="${pack.typo.numbers}" font-size="64" font-weight="900"
    fill="${pack.vars['accent']}"
    ${is90s ? `stroke="${pack.vars['border-color']}" stroke-width="1.5"` : ''}>${escapeXml(bestValue)}</text>
  <text x="${W / 2}" y="${top + 234}" text-anchor="middle"
    font-family="${pack.typo.body}" font-size="14" letter-spacing="2"
    fill="${pack.vars['text-secondary']}">${escapeXml(h.bestSet?.exerciseName ?? '今日最佳組')}</text>

  <line x1="70" y1="${top + 290}" x2="${W - 70}" y2="${top + 290}"
    stroke="${pack.vars['border-color']}" stroke-width="1"/>

  <text x="${W / 2}" y="${top + 340}" text-anchor="middle"
    font-family="${pack.typo.body}" font-size="16"
    fill="${pack.vars['text-primary']}">${escapeXml(recordsLine)}</text>
  <text x="${W / 2}" y="${top + 374}" text-anchor="middle"
    font-family="${pack.typo.body}" font-size="14"
    fill="${pack.vars['text-secondary']}">${escapeXml(volumeLine)}</text>

  <text x="${W / 2}" y="${top + 440}" text-anchor="middle"
    font-family="${pack.typo.display}" font-size="18" font-weight="700"
    fill="${pack.vars['accent']}">本週 ${h.weekly.days} / ${h.weekly.goal} 天</text>

  <line x1="70" y1="${H - 96}" x2="${W - 70}" y2="${H - 96}"
    stroke="${pack.vars['border-color']}" stroke-width="1"/>
  <text x="${W / 2}" y="${H - 62}" text-anchor="middle"
    font-family="${pack.typo.body}" font-size="12"
    fill="${pack.vars['text-muted']}">把每一次訓練，變成看得見的進步</text>
</svg>`;
}
