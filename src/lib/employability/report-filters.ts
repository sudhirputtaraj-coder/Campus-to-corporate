import { z } from 'zod';
const optionalId = z.string().uuid().optional();
const optionalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s).optional();
export const reportFilters = z.object({college:optionalId,department:optionalId,batch:optionalId,course:optionalId,from:optionalDate,to:optionalDate}).refine(v=>!v.from||!v.to||v.from<=v.to);
export function csvCell(value: unknown) {
 const text=String(value??'');const safe=/^[=+@\-\t\r\n]/.test(text)?"'"+text:text;
 return '"'+safe.replace(/"/g,'""')+'"';
}
