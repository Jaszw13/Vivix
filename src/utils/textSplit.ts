// 共用 quote-aware 行/欄 splitter（Errata E2）
// 目的：CSV 與 Matrix 兩模式都要處理引號欄位（含多行 cell，例如 Feedback 大段文字）。
// 規則：
//   - 以 lineSep 切行；遇到開啟的引號未結束時，下一行視為目前 cell 的續行（保留 \n）
//   - 以 fieldSep 切欄；僅在引號外的 fieldSep 視為切點
//   - 連續 "" 視為引號本身的跳脫（標準 CSV 規則）

export function splitQuoteAware(
  raw: string,
  fieldSep: string,
  lineSep: string = '\n',
): string[][] {
  if (!raw) return [];

  const fieldCh = fieldSep.length > 0 ? fieldSep.charAt(0) : ',';
  const lineCh = lineSep.length > 0 ? lineSep.charAt(0) : '\n';
  let i = 0;
  let inQuotes = false;
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let field = '';

  const flushField = () => {
    currentRow.push(field);
    field = '';
  };
  const flushRow = () => {
    flushField();
    rows.push(currentRow);
    currentRow = [];
  };

  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '"') {
      if (inQuotes && raw[i + 1] === '"') {
        // 跳脫的雙引號
        field += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
      continue;
    }
    if (ch === '\r') {
      // CRLF / CR 全吃，並在引號外才當行結束
      if (!inQuotes) {
        flushRow();
        // 吃掉 LF（若為 CRLF）
        if (raw[i + 1] === '\n') i++;
        i++;
        // 連續行分隔跳過空白行
        continue;
      }
      // 引號內的 CR：當一般字元（通常 Excel 複製出來 Feedback cell 內可能含）
      field += ch;
      i++;
      continue;
    }
    if (ch === lineCh) {
      if (!inQuotes) {
        flushRow();
        i++;
        continue;
      }
      // 引號內行斷 → 保留為 \n（多行 Feedback）
      field += '\n';
      i++;
      continue;
    }
    if (ch === fieldCh && !inQuotes) {
      flushField();
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  // 尾端 flush（避免最後一行沒換行、或引號未結束）
  if (field.length > 0 || currentRow.length > 0) {
    flushRow();
  }
  // 去除全空白行
  return rows.filter((r) => r.some((c) => c && c.trim().length > 0));
}
