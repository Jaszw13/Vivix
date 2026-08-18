// 矩陣模式（Excel TSV 貼上）parse
// 演算法：Errata v2.1 §5.2 步驟 1-10
// - 共用 splitQuoteAware('\t')，E2 支援多行引號 Feedback cell
// - 年月上下文 regex 偵測；可用 overrides 強制覆蓋
// - header day anchor：name=d-1、marker=d、sets=d+1..10、Load=d+11
// - Weight/Reps marker 成對产出 sets；Weight 無 Reps → 丟棄（E6）；name 空 → skip（E6）
// - 值解析：20kg、純數字、/（空）、self weight/bw/自重、a*b 展開
// - Load 交叉驗證 warning；VBT marker 丟棄；Feedback 同日去重（E6）

import { splitQuoteAware } from '@/utils/textSplit';

export interface MatrixLoadWarning {
  dateISO: string;
  exerciseName: string;
  expected: number;
  actual: number;
  diff: number;
}

export interface ParsedSet {
  weight: number;
  reps: number;
  isBodyweight?: boolean;
}

export interface ParsedExercise {
  name: string;
  sets: ParsedSet[];
}

export interface ParsedSession {
  dateISO: string;
  exercises: ParsedExercise[];
  notes?: string;
}

export interface MatrixContextOverride {
  year?: number;
  month?: number; // 1-12
}

export interface MatrixParseResult {
  sessions: ParsedSession[];
  skipped: number;
  warnings: MatrixLoadWarning[];
  ctx?: { year: number; month: number } | null;
  detectedDays: number;
}

const MONTH_NAMES = [
  'january','february','march','april','may','june','july','august','september','october','november','december',
];
const YEAR_MONTH_RE = /^(\d{4})\s+(January|February|March|April|May|June|July|August|September|October|November|December)$/i;
// 月日 token：兼容 "7月11日" / "7\"月\"11\"日" / "7 月 11 日"
const DATE_TOKEN_RE = /(\d{1,2})\s*["＂]?\s*月\s*["＂]?\s*(\d{1,2})\s*["＂]?\s*日\s*["＂]?/;

// 忽略行（marker 或整列白名單）
const IGNORED_MARKERS = new Set([
  'load','intensity','total load','tonne','average intensity',
  'weekly toone','monthly toone','yearly toone','weekly/monthly/yearly toone',
  'monday','tuesday','wednesday','thursday','friday','saturday','sunday',
  'set1','set2','set3','set4','set5','set6','set7','set8','set9','set10',
  'exercises',
]);
const VBT_MARKERS = new Set(['mv','pv','disp','pp','v-loss']);

type Marker = 'Weight' | 'Reps' | 'VBT' | 'Ignore' | 'Feedback' | 'None';

function identifyMarker(s: string): Marker {
  const raw = (s ?? '').trim();
  if (!raw) return 'None';
  const low = raw.toLowerCase();
  if (low.startsWith('feedbck:') || low.startsWith('feedback') || low.startsWith('feedback:')) {
    // 含 Feedback 且長度 >10 才當 Feedback cell（marker 行本身可能只有 Feedback）
    if (raw.length > 10 || low.startsWith('feedbck:') || low.startsWith('feedback:')) {
      return 'Feedback';
    }
  }
  // 比對前先 normalize 去掉多空格
  const key = low.replace(/\s+/g, ' ').trim();
  if (IGNORED_MARKERS.has(key)) return 'Ignore';
  if (VBT_MARKERS.has(key)) return 'VBT';
  if (key === 'weight' || key === 'weights') return 'Weight';
  if (key === 'reps' || key === 'rep') return 'Reps';
  // 若 cell 本身就是 Feedback 開頭（ex: "Feedback: 感覺不錯..."）
  if (low.startsWith('feedbck') || low.startsWith('feedback')) return 'Feedback';
  return 'None';
}

/** 解析 weight/reps 單一 cell 成 1 或多組（a*b 展開） */
function parseValueCell(
  cell: string,
  mode: 'weight' | 'reps',
): Array<{ value: number; isBodyweight?: boolean }> {
  const raw = (cell ?? '').trim();
  if (!raw || raw === '/') return [];
  const low = raw.toLowerCase();
  // weight 的自重/數字帶單位
  if (mode === 'weight') {
    if (low === 'self weight' || low === 'bw' || low === '自重') {
      return [{ value: 0, isBodyweight: true }];
    }
    const num = parseWeightNumber(raw);
    if (num === null) return [];
    return [{ value: num }];
  }
  // reps：a*b 展開為 a 組 b 次（Errata E6：reps 展開）
  const star = raw.match(/^(\d+)\s*\*\s*(\d+)$/);
  if (star) {
    const a = Number(star[1]);
    const b = Number(star[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return [];
    const out: Array<{ value: number }> = [];
    for (let i = 0; i < a; i++) out.push({ value: b });
    return out;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return [];
  return [{ value: Math.floor(n) }];
}

function parseWeightNumber(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  let numPart = s;
  if (s.includes('kg')) {
    numPart = s.replace(/kg/gi, '').trim();
  } else if (s.includes('lb')) {
    numPart = s.replace(/lb/gi, '').trim();
    const n = Number(numPart);
    if (!Number.isFinite(n)) return null;
    return n * 0.4536;
  }
  const n = Number(numPart);
  if (!Number.isFinite(n)) return null;
  return n;
}

/** cell 是否為日期 anchor token；若是回傳 [month, day] */
function detectDateToken(cell: string): [number, number] | null {
  const cleaned = (cell ?? '').replace(/["＂\s]/g, '');
  const m = cleaned.match(DATE_TOKEN_RE);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return [month, day];
}

interface DayAnchor {
  columnD: number; // marker 所在欄位
  month: number; // 1-12
  day: number;
  dateISO: string;
  /** buffer：名稱 → weights cells（待 Reps 出現時配對，cell 內展開後為 flat list） */
  weightBuffer: Map<string, Array<{ value: number; isBodyweight?: boolean }>>;
  /** buffer：名稱 → exercise notes（BW 等） */
  bwFlags: Set<string>;
  /** feedback 集合（同日去重 E6） */
  feedbacks: string[];
}

export function parseMatrixTSV(text: string, overrides?: MatrixContextOverride): MatrixParseResult {
  const grid = splitQuoteAware(text, '\t', '\n');
  if (grid.length === 0) {
    return { sessions: [], skipped: 0, warnings: [], ctx: null, detectedDays: 0 };
  }
  let year: number | null = overrides?.year ?? null;
  let month: number | null = overrides?.month ?? null;
  const anchors: DayAnchor[] = [];
  const warnings: MatrixLoadWarning[] = [];
  let skipped = 0;

  // 先看是否任何列含年月
  for (const row of grid) {
    for (const cell of row) {
      const ym = YEAR_MONTH_RE.exec(cell.trim());
      if (ym) {
        const y = Number(ym[1]);
        const mIdx = MONTH_NAMES.indexOf(ym[2].toLowerCase());
        if (year === null) year = y;
        if (month === null && mIdx >= 0) month = mIdx + 1;
      }
    }
  }

  const mkISO = (mo: number, d: number): string => {
    const y = year ?? new Date().getFullYear();
    const dt = new Date(y, mo - 1, d);
    return `${dt.getFullYear()}-${(dt.getMonth() + 1).toString().padStart(2, '0')}-${dt.getDate().toString().padStart(2, '0')}`;
  };

  // 儲存已解析 session（按日期），避免 anchor 更新後覆蓋
  const byDate = new Map<string, { exercisesByExerciseName: Map<string, ParsedSet[]>; feedbacks: string[]; }>();

  for (let r = 0; r < grid.length; r++) {
    const row = grid[r].map((c) => c.trim());

    // Step 2: 更新年月 ctx
    for (const cell of row) {
      const ym = YEAR_MONTH_RE.exec(cell);
      if (ym) {
        const y = Number(ym[1]);
        const mIdx = MONTH_NAMES.indexOf(ym[2].toLowerCase());
        year = y;
        if (mIdx >= 0) month = mIdx + 1;
      }
    }

    // Step 3：header 行掃描日期 token → 建立 anchor
    // 定義：該 row 至少有 1 個日期 token，且同時出現 Weight/Reps marker 即視為 header 行（支援多日並排）
    let headerAnchors: DayAnchor[] = [];
    for (let c = 0; c < row.length; c++) {
      const dt = detectDateToken(row[c]);
      if (dt) {
        const [m, d] = dt;
        if (month === null) month = m;
        const iso = mkISO(m, d);
        headerAnchors.push({
          columnD: c, // marker 欄 = 日期欄
          month: m,
          day: d,
          dateISO: iso,
          weightBuffer: new Map(),
          bwFlags: new Set(),
          feedbacks: [],
        });
      }
    }
    // 確認 header：下一個非 header 列是否有 Weight/Reps 標記；是則 headerAnchors 替換全域 anchors
    if (headerAnchors.length > 0) {
      // 檢查 marker 位置是否合理（若欄位 d+1 等有 cells 且下一列 marker 正確）
      anchors.splice(0, anchors.length, ...headerAnchors);
      // 將 anchors 當日的 feedback buffer 初始化（若日期尚無）
      for (const a of anchors) {
        if (!byDate.has(a.dateISO)) {
          byDate.set(a.dateISO, { exercisesByExerciseName: new Map(), feedbacks: [] });
        }
      }
      continue;
    }

    if (anchors.length === 0) {
      skipped++;
      continue;
    }

    // Step 4 & 9：對每個 anchor 進行資料解析
    for (const a of anchors) {
      const d = a.columnD;
      const nameCell = (row[d - 1] ?? '').trim();
      const markerCell = (row[d] ?? '').trim();
      const vals = row.slice(d + 1, d + 11);
      const loadCell = (row[d + 11] ?? '').trim();
      const markerKind = identifyMarker(markerCell);

      // Feedback：可能是 marker 欄位；也可能 name 欄位自己是 Feedback 長文
      let feedbackText = '';
      if (markerKind === 'Feedback') {
        feedbackText = markerCell;
      } else if (identifyMarker(nameCell) === 'Feedback') {
        feedbackText = nameCell;
      }
      // 也檢查 values / load cell 是否有 Feedback（Excel 中可能只有 Feedback 長文，其他空白）
      if (!feedbackText) {
        for (const cc of vals) {
          if (identifyMarker(cc) === 'Feedback') { feedbackText = cc; break; }
        }
        if (!feedbackText && identifyMarker(loadCell) === 'Feedback') feedbackText = loadCell;
      }
      if (feedbackText && feedbackText.length > 10) {
        // 同日 Feedback 去重（E6）
        const existing = byDate.get(a.dateISO);
        if (existing) {
          if (!existing.feedbacks.includes(feedbackText)) {
            existing.feedbacks.push(feedbackText);
          }
        } else {
          byDate.set(a.dateISO, { exercisesByExerciseName: new Map(), feedbacks: [feedbackText] });
        }
        continue;
      }

      if (markerKind === 'None' && !nameCell) {
        skipped++;
        continue;
      }
      if (markerKind === 'Ignore' || markerKind === 'VBT') {
        if (markerKind === 'VBT') continue;
        // ignore 行但可能 nameCell 也為空；直接跳
        continue;
      }

      // 這裡開始是 Weight / Reps marker
      if (markerKind !== 'Weight' && markerKind !== 'Reps') continue;
      if (!nameCell) {
        // E6：name 空 → skip
        skipped++;
        continue;
      }

      if (markerKind === 'Weight') {
        const parsedVals = vals.flatMap((v) => parseValueCell(v, 'weight'));
        if (parsedVals.length === 0) continue;
        a.weightBuffer.set(nameCell, parsedVals);
        if (parsedVals.some((p) => p.isBodyweight)) {
          a.bwFlags.add(nameCell);
        }
      } else {
        // Reps：與 weightBuffer 配對产出 sets
        const weights = a.weightBuffer.get(nameCell);
        if (!weights || weights.length === 0) {
          // E6：Weight 無 Reps → 丟棄（這裡反過來：Reps 有但 Weight 未見 → 丟棄，避免半套資料）
          skipped++;
          continue;
        }
        const repsVals = vals.flatMap((v) => parseValueCell(v, 'reps'));
        if (repsVals.length === 0) continue;
        // 配對：逐格對齊；若 weights 與 reps 個數不同，取較短或較長視可用 cell（Reps cell 展開可能多於 weight；weight 以最後一個重複使用）
        const minLen = Math.max(weights.length, repsVals.length);
        const sets: ParsedSet[] = [];
        for (let i = 0; i < minLen; i++) {
          const w = weights[Math.min(i, weights.length - 1)];
          const rv = repsVals[Math.min(i, repsVals.length - 1)];
          if (!w || !rv) continue;
          if (w.value <= 0 && !w.isBodyweight) continue;
          if (rv.value <= 0) continue;
          sets.push({
            weight: w.value,
            reps: rv.value,
            isBodyweight: w.isBodyweight,
          });
        }
        if (sets.length === 0) continue;

        // Load 交叉驗證
        const total = sets.reduce((s, x) => s + x.weight * x.reps, 0);
        const loadNum = Number(loadCell.replace(/,/g, ''));
        if (Number.isFinite(loadNum) && loadNum > 0) {
          const diff = Math.abs(total - loadNum);
          if (diff > 1) {
            warnings.push({
              dateISO: a.dateISO,
              exerciseName: nameCell,
              actual: total,
              expected: loadNum,
              diff,
            });
          }
        }

        // 寫入 byDate
        const entry = byDate.get(a.dateISO);
        if (!entry) {
          byDate.set(a.dateISO, { exercisesByExerciseName: new Map([[nameCell, sets]]), feedbacks: [] });
        } else {
          const prev = entry.exercisesByExerciseName.get(nameCell);
          if (prev) entry.exercisesByExerciseName.set(nameCell, [...prev, ...sets]);
          else entry.exercisesByExerciseName.set(nameCell, sets);
        }
      }
    }
  }

  // 組裝 sessions
  const sessions: ParsedSession[] = [];
  const dateKeys = Array.from(byDate.keys()).sort();
  for (const iso of dateKeys) {
    const e = byDate.get(iso);
    if (!e) continue;
    const exercises: ParsedExercise[] = [];
    for (const [name, sets] of e.exercisesByExerciseName.entries()) {
      if (sets.length === 0) continue;
      exercises.push({ name, sets });
    }
    if (exercises.length === 0 && e.feedbacks.length === 0) continue;
    sessions.push({
      dateISO: iso,
      exercises,
      notes: e.feedbacks.length > 0 ? e.feedbacks.join('\n') : undefined,
    });
  }

  const ctx = year !== null && month !== null ? { year, month } : null;
  return {
    sessions,
    skipped,
    warnings,
    ctx,
    detectedDays: new Set(sessions.map((s) => s.dateISO)).size,
  };
}

/** 偵測是否為矩陣模式：text 含 date token 且同時含 Weight / Reps marker */
export function detectMatrixMode(text: string): boolean {
  if (!text) return false;
  let hasDate = false;
  let hasWeight = false;
  let hasReps = false;
  const rows = text.replace(/\r/g, '').split('\n');
  for (const raw of rows) {
    const cells = raw.split('\t').map((c) => c.trim().toLowerCase());
    for (const c of cells) {
      if (!hasDate && DATE_TOKEN_RE.test(c.replace(/["＂\s]/g, ''))) hasDate = true;
      if (!hasWeight && (c === 'weight' || c === 'weights')) hasWeight = true;
      if (!hasReps && (c === 'reps' || c === 'rep')) hasReps = true;
    }
    if (hasDate && hasWeight && hasReps) return true;
  }
  return false;
}

/** 偵測是否為表格模式：首行似 header (date/exercise/weight/reps) */
export function detectTableMode(text: string): boolean {
  if (!text) return false;
  const cleaned = text.startsWith('\uFEFF') ? text.slice(1) : text;
  const firstRow = cleaned.split(/\r?\n/)[0] ?? '';
  const low = firstRow.toLowerCase();
  // 逗號或 tab 分隔
  const cells = firstRow.split(/[,\t]/);
  let hasDate = false, hasEx = false, hasW = false, hasR = false;
  for (const c of cells) {
    const t = c.trim();
    if (t.includes('date') || t.includes('日期')) hasDate = true;
    if (t.includes('exercise') || t.includes('動作') || t.includes('name') || t.includes('名稱')) hasEx = true;
    if (t.includes('weight') || t.includes('重量') || t.includes('kg') || t.includes('lb')) hasW = true;
    if (t.includes('rep') || t.includes('次數')) hasR = true;
  }
  return Number(hasDate) + Number(hasEx) + Number(hasW) + Number(hasR) >= 3;
}
