import 'server-only';
import { fromBuffer } from 'yauzl';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { createHash } from 'node:crypto';
import { rosterFromGrid, rosterFromText, type RosterRow } from './roster';

const LIMIT = 20 * 1024 * 1024;
// Never extract files to disk. Bound both reported sizes and actual streamed bytes.
export async function officeXml(buffer: Buffer): Promise<Map<string, string>> {
  return new Promise((resolve, reject) => {
    fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true, strictFileNames: true }, (error, zip) => {
      if (error || !zip) { reject(Error('Cannot open this Office file. Save a fresh .xlsx or .docx file.')); return; }
      const files = new Map<string, string>(); let total = 0, count = 0, actual = 0, stopped = false;
      const fail = () => { if (!stopped) { stopped = true; zip.close(); reject(Error('Invalid or oversized Office file. Use a simple roster under 2 MB (20 MB expanded).')); } };
      zip.on('error', fail);
      zip.on('end', () => { if (!stopped) resolve(files); });
      zip.on('entry', entry => {
        total += entry.uncompressedSize;
        if (++count > 2000 || total > LIMIT || entry.generalPurposeBitFlag & 1) { fail(); return; }
        if (!/^(word\/document\.xml|xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml))$/.test(entry.fileName)) { zip.readEntry(); return; }
        if (files.has(entry.fileName)) { fail(); return; }
        zip.openReadStream(entry, (err, stream) => {
          if (err || !stream) { fail(); return; }
          const chunks: Buffer[] = [];
          stream.on('error', fail);
          stream.on('data', (chunk: Buffer) => { actual += chunk.length; if (actual > LIMIT) { stream.destroy(); fail(); } else chunks.push(chunk); });
          stream.on('end', () => { if (!stopped) { files.set(entry.fileName, Buffer.concat(chunks).toString('utf8')); zip.readEntry(); } });
        });
      });
      zip.readEntry();
    });
  });
}
const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false, processEntities: true, trimValues: false });
function xml(text: string | undefined): any {
  if (!text || /<!DOCTYPE|<!ENTITY/i.test(text)) throw Error('Missing or unsupported Office XML.');
  let depth = 0;
  for (const tag of text.matchAll(/<[^>]*>/g)) {
    if (/^<\//.test(tag[0])) depth--;
    else if (!/^<[?!]/.test(tag[0]) && !/\/>$/.test(tag[0])) depth++;
    if (depth > 100) throw Error('Office XML is too deeply nested.');
  }
  if (XMLValidator.validate(text) !== true) throw Error('Invalid Office XML. Save a fresh copy of the file.');
  return parser.parse(text);
}
const array = (v: any): any[] => v == null ? [] : Array.isArray(v) ? v : [v];
function words(v: any): string {
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (!v || typeof v !== 'object') return '';
  return Object.entries(v).filter(([k]) => !k.startsWith('@_')).map(([,x]) => Array.isArray(x) ? x.map(words).join('') : words(x)).join('');
}
export async function parseRosterFile(name: string, buffer: Buffer): Promise<RosterRow[]> {
  if (buffer.length > 2 * 1024 * 1024) throw Error('Upload a file smaller than 2 MB.');
  const ext = name.toLowerCase().split('.').pop();
  if (ext === 'csv' || ext === 'txt') return rosterFromText(buffer.toString('utf8'));
  if (!['xlsx','docx'].includes(ext || '')) throw Error('Use .xlsx, .docx, .csv or .txt. Save older Excel/Word files in the newer format first.');
  const files = await officeXml(buffer);
  if (ext === 'docx') {
    const body = xml(files.get('word/document.xml')).document?.body;
    const tables = array(body?.tbl);
    if (tables.length) {
      if (tables.length > 1) throw Error('Use one student table per Word file.');
      return rosterFromGrid(array(tables[0].tr).map(tr => array(tr.tc).map(cell => array(cell.p).map(words).join(' ').trim())));
    }
    return rosterFromText(array(body?.p).map(words).join('\n'));
  }
  const workbook = xml(files.get('xl/workbook.xml'));
  const sheet = array(workbook.workbook?.sheets?.sheet)[0];
  const rels = array(xml(files.get('xl/_rels/workbook.xml.rels')).Relationships?.Relationship);
  const target = rels.find(r => r['@_Id'] === sheet?.['@_id'] && r['@_TargetMode'] !== 'External')?.['@_Target'];
  if (typeof target !== 'string') throw Error('Cannot find the first worksheet.');
  const path = target.startsWith('/xl/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  const strings = files.has('xl/sharedStrings.xml') ? array(xml(files.get('xl/sharedStrings.xml')).sst?.si).map(words) : [];
  const rows = array(xml(files.get(path)).worksheet?.sheetData?.row);
  if (rows.length > 501) throw Error('Include at most 500 students and one header row.');
  return rosterFromGrid(rows.map(row => {
    const out: string[] = [];
    for (const cell of array(row.c)) {
      if (cell.f !== undefined) throw Error('Replace spreadsheet formulas with values before importing.');
      const letters = String(cell['@_r'] || '').match(/^([A-Z]+)[1-9][0-9]*$/)?.[1];
      if (!letters) throw Error('Unsupported spreadsheet cell address.');
      const col = [...letters].reduce((n,c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
      if (col > 30) throw Error('Use a simple roster with at most 31 columns.');
      const value = cell['@_t'] === 's' ? strings[Number(cell.v)] : cell['@_t'] === 'inlineStr' ? words(cell.is) : words(cell.v);
      out[col] = value || '';
    }
    return Array.from({length:out.length}, (_,i) => out[i] || '');
  }));
}
export function fillRosterDefaults(rows: RosterRow[]): { rows: RosterRow[]; generated: number } {
  let generated = 0;
  const filled = rows.map(r => {
    if (!r.full_name || !r.register_number) generated++;
    return { ...r, full_name: r.full_name || r.email.split('@')[0].slice(0,200), register_number: r.register_number || `EMAIL-${createHash('sha256').update(r.email).digest('hex').slice(0,20)}` };
  });
  return { rows: filled, generated };
}
