// Errata E1：token 級 fuzzy match（lower+去標點+分詞；overlap≥1 或 Levenshtein≤2）
// ASCII 標點剝除；中文 char 當 token（保留繁體；不 break 成 1 byte）。
// 對非 ASCII（含中文）char level Levenshtein 作 fallback。

const PUNCT_RE = /[\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E]+/g;

export function normalize(s: string): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(PUNCT_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(norm: string): string[] {
  if (!norm) return [];
  // 英文空白分詞；中文字元各自獨立（避免需要字典分詞）
  const out: string[] = [];
  let run = '';
  for (const ch of norm) {
    const code = ch.codePointAt(0);
    const isCjk = code !== undefined && code >= 0x4e00 && code <= 0x9fff;
    const isSep = ch === ' ' || ch === '\t' || ch === '\n';
    if (isCjk) {
      if (run) { out.push(run); run = ''; }
      out.push(ch);
    } else if (isSep) {
      if (run) { out.push(run); run = ''; }
    } else {
      run += ch;
    }
  }
  if (run) out.push(run);
  return out.filter(Boolean);
}

function lev(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const al = [...a];
  const bl = [...b];
  if (al.length > bl.length) {
    const tmp = al;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = bl;
    const tmp2 = bl;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const __ = tmp;
    // simple swap to make shorter the column
    const shorter = tmp2;
    const longer = tmp;
    return dyn(shorter, longer);
  }
  return dyn(al, bl);
}
function dyn(a: string[], b: string[]): number {
  const prev = new Array<number>(a.length + 1);
  for (let i = 0; i <= a.length; i++) prev[i] = i;
  for (let j = 1; j <= b.length; j++) {
    const cur = new Array<number>(a.length + 1);
    cur[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[i] = Math.min(
        prev[i] + 1,        // delete
        cur[i - 1] + 1,     // insert
        prev[i - 1] + cost, // substitute
      );
    }
    for (let i = 0; i <= a.length; i++) prev[i] = cur[i];
  }
  return prev[a.length];
}

export interface FuzzyResult {
  overlap: number;
  lev: number;
  pass: boolean;
}

export function fuzzyMatch(rawA: string, rawB: string): FuzzyResult {
  const na = normalize(rawA);
  const nb = normalize(rawB);
  const ta = tokenize(na);
  const tb = tokenize(nb);
  const setA = new Set(ta);
  const setB = new Set(tb);
  let overlap = 0;
  for (const tk of setA) {
    if (setB.has(tk)) overlap++;
  }
  const wholeA = na.replace(/\s+/g, '');
  const wholeB = nb.replace(/\s+/g, '');
  const lv = lev(wholeA, wholeB);
  const pass = overlap >= 1 || lv <= 2;
  return { overlap, lev: lv, pass };
}

// helper: 從 targetList 找最多 topN 建議（依 overlap desc / lev asc）
export function fuzzySuggest(
  raw: string,
  candidates: string[],
  topN = 3,
): string[] {
  const withScore = candidates
    .map((c) => ({ c, r: fuzzyMatch(raw, c) }))
    .filter((x) => x.r.pass)
    .sort((a, b) => {
      const byOverlap = b.r.overlap - a.r.overlap;
      if (byOverlap !== 0) return byOverlap;
      return a.r.lev - b.r.lev;
    });
  return withScore.slice(0, topN).map((x) => x.c);
}
