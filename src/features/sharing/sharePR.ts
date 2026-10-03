import { getStylePack, packShadows } from '@/data/stylePacks';
import type { PersonalRecord } from '@/types';
import type { StylePack } from '@/types/theme';

/**
 * 將 PR 球員卡渲染為 SVG，轉 PNG，再用 navigator.share 分享。
 * 不依賴 html2canvas（package 無此依賴）。
 *
 * @returns true 表示已觸發分享；false 表示瀏覽器不支援或用戶取消
 */
export async function sharePRCard(pr: PersonalRecord, packId?: string): Promise<boolean> {
  const pack: StylePack =
    (packId ? getStylePack(packId) : null) ??
    getStylePack('elegant-beige')!;

  const svg = buildCardSVG(pr, pack);
  const blob = await svgToPngBlob(svg, 2);
  if (!blob) return false;

  const file = new File([blob], `vivix-pr-${pr.exerciseId}.png`, { type: 'image/png' });

  // 優先使用 Web Share API（含檔案）
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
    try {
      await nav.share({
        files: [file],
        title: 'Vivix PR 球員卡',
        text: `${pr.exerciseName} — ${pr.repPR !== undefined ? `BW × ${pr.repPR}` : `${pr.weight}kg × ${pr.reps}`}`,
      });
      return true;
    } catch {
      // 用戶取消或失敗 → fallthrough 到下載
    }
  }

  // fallback：觸發檔案下載
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vivix-pr-${pr.exerciseId}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return false;
}

/**
 * 建構球員卡 SVG（self-contained，inline 樣式，無外部引用）
 */
function buildCardSVG(pr: PersonalRecord, pack: StylePack): string {
  const shadows = packShadows(pack.shape.shadow);
  const is90s = pack.id === '90s-retro-card';
  const W = 360;
  const H = 480;
  const value = pr.repPR !== undefined ? `BW × ${pr.repPR}` : `${pr.weight}kg × ${pr.reps}`;
  const sub = pr.repPR !== undefined ? 'REPS' : `1RM ${pr.estimated1RM}kg`;
  const date = new Date(pr.date).toLocaleDateString('zh-TW');
  const radiusNum = parseFloat(pack.shape.radiusCard) || 0;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="rgba(0,0,0,0.25)"/>
    </filter>
  </defs>
  <rect x="20" y="20" width="${W - 40}" height="${H - 40}" rx="${radiusNum}"
    fill="${pack.vars['bg-card']}" stroke="${pack.vars['border-color']}"
    stroke-width="${is90s ? 3 : 2}" filter="url(#cardShadow)"/>
  <text x="${W / 2}" y="70" text-anchor="middle"
    font-family="${pack.typo.display}" font-size="22" font-weight="700"
    fill="${pack.vars['text-primary']}">${escapeXml(pr.exerciseName)}</text>
  <text x="${W / 2}" y="250" text-anchor="middle"
    font-family="${pack.typo.numbers}" font-size="56" font-weight="900"
    fill="${pack.vars['accent']}"
    ${is90s ? `stroke="${pack.vars['border-color']}" stroke-width="1.5"` : ''}>${value}</text>
  <text x="${W / 2}" y="290" text-anchor="middle"
    font-family="${pack.typo.body}" font-size="12" letter-spacing="3"
    fill="${pack.vars['text-secondary']}">${sub}</text>
  <line x1="50" y1="${H - 70}" x2="${W - 50}" y2="${H - 70}"
    stroke="${pack.vars['border-color']}" stroke-width="1"/>
  <text x="55" y="${H - 48}" font-family="${pack.typo.body}" font-size="11"
    fill="${pack.vars['text-muted']}">${date}</text>
  <text x="${W - 55}" y="${H - 48}" text-anchor="end" font-family="${pack.typo.display}"
    font-size="11" font-weight="700" fill="${pack.vars['text-muted']}">VIVIX PR</text>
</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * SVG 字串 → PNG Blob（scale 控制輸出解析度）
 */
async function svgToPngBlob(svg: string, scale = 2): Promise<Blob | null> {
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('svg load fail'));
      img.src = url;
    });
    const w = img.width * scale;
    const h = img.height * scale;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    );
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
