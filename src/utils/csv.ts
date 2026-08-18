// 表格模式（簡易 CSV 貼上）parse 工具
// 規則：
//   - 零新依賴（禁 xlsx/papaparse）；BOM(\uFEFF)、CRLF、引號 cell 全支援
//   - 四種日期格式選擇（YYYY-MM-DD / YYYY/MM/DD / DD/MM/YYYY / MM/DD/YYYY）
//   - 單位 kg/lb；lb 自動 ×0.4536 轉 kg
//   - 必要欄位缺 → skipped 記錄
import { splitQuoteAware } from '@/utils/textSplit';

export type DateFormatHint = 'YYYY-MM-DD' | 'YYYY/MM/DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY';
export type UnitHint = 'kg' | 'lb';

export interface ParsedRow {
  dateISO: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
  /** 若原 CSV 有 sets 欄位：可展開為 N 組同 weight/reps；預設 1 */
  sets: number;
  rawIndex: number;
}

export interface CsvPreview {
  rows: ParsedRow[];
  skipped: number;
  /** header 欄位順序（偵測或使用者選的） */
  header: string[];
}

export interface CsvOptions {
  unit: UnitHint;
  dateFormat: DateFormatHint;
  /** 欄位到 index 的對應；若未傳自動依 header 猜 */
  fieldMap?: Partial<Record<'date' | 'exercise' | 'weight' | 'reps' | 'sets', number>>;
}

export function parseCSV(text: string): string[][] {
  // strip BOM
  const cleaned = text.startsWith('\uFEFF') ? text.slice(1) : text;
  // strip bare \r 避免額外 row；splitQuoteAware 會處理 CRLF
  return splitQuoteAware(cleaned, ',', '\n');
}

export function parseDate(raw: string, fmt: DateFormatHint): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  const digits = s.match(/\d+/g);
  if (!digits || digits.length < 3) return null;
  let y = 0; let m = 0; let d = 0;
  switch (fmt) {
    case 'YYYY-MM-DD':
    case 'YYYY/MM/DD': {
      y = Number(digits[0]);
      m = Number(digits[1]);
      d = Number(digits[2]);
      break;
    }
    case 'DD/MM/YYYY': {
      d = Number(digits[0]);
      m = Number(digits[1]);
      y = Number(digits[2]);
      break;
    }
    case 'MM/DD/YYYY': {
      m = Number(digits[0]);
      d = Number(digits[1]);
      y = Number(digits[2]);
      break;
    }
  }
  if (!(y > 1970 && y < 2200 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
  const dt = new Date(y, m - 1, d);
  const iso = `${dt.getFullYear()}-${(dt.getMonth() + 1).toString().padStart(2, '0')}-${dt.getDate().toString().padStart(2, '0')}`;
  return iso;
}

/**
 * 解析重量字串：
 *   "20kg" / "20KG" / " 20 " / " 220 lb" → kg 數字
 *   "self weight" / "bw" / "自重" → 0，isBodyweight=true
 */
export function parseWeight(raw: string, unit: UnitHint): { kg: number; isBodyweight: boolean } | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower === 'self weight' || lower === 'bw' || lower === '自重') {
    return { kg: 0, isBodyweight: true };
  }
  // 單位 inline 覆蓋：若 cell 本身含 lb → 按 lb 算
  let u: UnitHint = unit;
  let numPart = s;
  if (lower.includes('lb')) {
    u = 'lb';
    numPart = lower.replace(/lb/gi, '').trim();
  } else if (lower.includes('kg')) {
    u = 'kg';
    numPart = lower.replace(/kg/gi, '').trim();
  }
  const n = Number(numPart);
  if (!Number.isFinite(n)) return null;
  const kg = u === 'lb' ? n * 0.4536 : n;
  return { kg, isBodyweight: false };
}

export function parseReps(raw: string): number | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

function guessFieldMap(header: string[]): Partial<Record<'date' | 'exercise' | 'weight' | 'reps' | 'sets', number>> {
  const map: Partial<Record<'date' | 'exercise' | 'weight' | 'reps' | 'sets', number>> = {};
  header.forEach((h, i) => {
    const low = h.trim().toLowerCase();
    if (!map.date && (low.includes('date') || low.includes('日期'))) map.date = i;
    else if (!map.exercise && (low.includes('exercise') || low.includes('動作') || low.includes('name') || low.includes('名稱'))) map.exercise = i;
    else if (!map.weight && (low.includes('weight') || low.includes('重量') || low.includes('kg') || low.includes('lb') || low.includes('wt'))) map.weight = i;
    else if (!map.reps && (low.includes('rep') || low.includes('次數') || low.includes('rm'))) map.reps = i;
    else if (!map.sets && (low.includes('set') || low.includes('組'))) map.sets = i;
  });
  return map;
}

export function csvToPreviewRows(text: string, opts: CsvOptions): CsvPreview {
  const grid = parseCSV(text);
  if (grid.length === 0) return { rows: [], skipped: 0, header: [] };
  const firstRow = grid[0].map((c) => c.trim());
  // 偵測是否有 header：若第一列包含 date/exercise/weight/reps 關鍵字則視為 header
  const hasHeader = firstRow.some((c) => {
    const l = c.toLowerCase();
    return l.includes('date') || l.includes('exercise') || l.includes('日期') || l.includes('動作') || l.includes('weight');
  });
  const dataRows = hasHeader ? grid.slice(1) : grid;
  const header = hasHeader ? firstRow : firstRow.map((_, i) => `col${i + 1}`);
  const fieldMap = opts.fieldMap ?? guessFieldMap(header);
  const di = fieldMap.date ?? 0;
  const ei = fieldMap.exercise ?? 1;
  const wi = fieldMap.weight ?? 2;
  const ri = fieldMap.reps ?? 3;
  const si = fieldMap.sets ?? -1;

  const rows: ParsedRow[] = [];
  let skipped = 0;
  for (let r = 0; r < dataRows.length; r++) {
    const cells = dataRows[r];
    const dateISO = parseDate(cells[di] ?? '', opts.dateFormat);
    const name = (cells[ei] ?? '').trim();
    const weightCell = (cells[wi] ?? '').trim();
    const repsCell = (cells[ri] ?? '').trim();
    const setsCell = si >= 0 ? (cells[si] ?? '1').trim() : '1';
    const setsN = Math.max(1, Number(setsCell) || 1);
    if (!dateISO || !name || !weightCell || !repsCell) {
      skipped++;
      continue;
    }
    const w = parseWeight(weightCell, opts.unit);
    const repsN = parseReps(repsCell);
    if (!w || repsN === null || repsN <= 0) {
      skipped++;
      continue;
    }
    rows.push({
      dateISO,
      exerciseName: name,
      weightKg: w.kg,
      reps: repsN,
      sets: setsN,
      rawIndex: hasHeader ? r + 2 : r + 1,
    });
  }
  return { rows, skipped, header };
}

/** 前端生成範本 CSV blob（E13）；<a download> 即可下載 */
export function buildTemplateBlob(): Blob {
  const lines = [
    ['date', 'exercise', 'weight_kg', 'reps'].join(','),
    ['2026-01-01', 'Back Squat', '60', '5'].join(','),
    ['2026-01-03', 'Bench Press', '40', '8'].join(','),
  ];
  return new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
}
