export type LessonBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

// A small text format for editable lessons. Never interprets HTML, scripts or URLs.
function cells(line: string): string[] {
  const values: string[] = [];
  let value = '';
  const inner = line.trim().slice(1, -1);
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '\\' && ['|', '\\'].includes(inner[i + 1])) value += inner[++i];
    else if (inner[i] === '|') { values.push(value.trim()); value = ''; }
    else value += inner[i];
  }
  values.push(value.trim());
  return values;
}

export function parseLessonText(content: string): LessonBlock[] {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const result: LessonBlock[] = [];
  const tableLine = (line: string) => /^\|.*\|$/.test(line.trim());
  const tableStart = (i: number) => tableLine(lines[i] || '') && tableLine(lines[i + 1] || '')
    && cells(lines[i + 1]).every(cell => /^:?-{3,}:?$/.test(cell))
    && cells(lines[i]).length === cells(lines[i + 1]).length;
  let i = 0;
  while (i < lines.length) {
    if (!lines[i].trim()) { i++; continue; }
    if (tableStart(i)) {
      const headers = cells(lines[i]);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && tableLine(lines[i]) && cells(lines[i]).length === headers.length) rows.push(cells(lines[i++]));
      result.push({ type: 'table', headers, rows });
    } else if (/^#{1,3} /.test(lines[i])) {
      result.push({ type: 'heading', text: lines[i++].replace(/^#{1,3} /, '') });
    } else if (/^- /.test(lines[i])) {
      const items: string[] = [];
      while (i < lines.length) {
        if (/^- /.test(lines[i])) items.push(lines[i++].slice(2));
        else if (!lines[i].trim() && /^- /.test(lines[i + 1] || '')) i++;
        else break;
      }
      result.push({ type: 'list', items });
    } else {
      const text = [lines[i++]];
      while (i < lines.length && lines[i].trim() && !/^#{1,3} |^- /.test(lines[i]) && !tableStart(i)) text.push(lines[i++]);
      result.push({ type: 'paragraph', text: text.join('\n') });
    }
  }
  return result;
}
