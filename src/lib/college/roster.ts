import { z } from 'zod';
import { parse } from 'csv-parse/sync';

export const rosterSchema = z.array(z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  full_name: z.string().trim().min(1).max(200),
  register_number: z.string().trim().min(1).max(80),
})).min(1).max(500);
export type RosterRow = z.infer<typeof rosterSchema>[number];
export function validateRoster(rows: unknown): RosterRow[] {
  const result = rosterSchema.safeParse(rows);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw Error(`Check row ${Number(issue.path[0] ?? 0) + 1}: ${issue.path[1] || 'roster'} ${issue.message}.`);
  }
  const emails = new Set<string>(), registers = new Set<string>();
  result.data.forEach((r, i) => {
    if (emails.has(r.email) || registers.has(r.register_number)) throw Error(`Row ${i + 1}: duplicate email or register number. Remove the duplicate before sending.`);
    if (Object.values(r).some(v => /[\x00-\x1f\x7f]/.test(v))) throw Error(`Row ${i + 1}: remove control characters.`);
    emails.add(r.email); registers.add(r.register_number);
  });
  return result.data;
}

const header = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
export function rosterFromGrid(grid: string[][]): RosterRow[] {
  const rows = grid.filter(r => r.some(c => c.trim()));
  if (!rows.length) throw Error('The file is empty.');
  const h = rows[0].map(header);
  const email = h.findIndex(v => ['email','emailid','emailaddress','studentemail'].includes(v));
  const name = h.findIndex(v => ['name','fullname','studentname'].includes(v));
  const reg = h.findIndex(v => ['registernumber','registerno','registrationnumber','rollnumber','rollno','studentid'].includes(v));
  const data = email >= 0 ? rows.slice(1) : rows;
  if (!data.length || data.length > 500) throw Error('Include 1 to 500 students per import.');
  if (email < 0 && data.some(r => r.length !== 1)) throw Error('Use column headings: email, full_name, register_number. Or use one email per row.');
  return data.map(r => ({ email: (r[email >= 0 ? email : 0] || '').trim().toLowerCase(), full_name: name >= 0 ? (r[name] || '').trim() : '', register_number: reg >= 0 ? (r[reg] || '').trim() : '' }));
}
export function rosterFromText(text: string): RosterRow[] {
  if (text.length > 500000) throw Error('Use a list smaller than 500 KB.');
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  // Email-only lists may be copied from Excel or separated by commas/semicolons.
  const tokens = trimmed.split(/[\s,;]+/).filter(Boolean);
  if (tokens.every(t => t.includes('@'))) return rosterFromGrid(tokens.map(t => [t]));
  try { return rosterFromGrid(parse(trimmed, { bom: true, skip_empty_lines: true, delimiter: trimmed.split(/\r?\n/)[0].includes('\t') ? '\t' : ',', max_record_size: 10000 })); }
  catch (e) { throw Error(e instanceof Error ? e.message : 'Invalid CSV.'); }
}
