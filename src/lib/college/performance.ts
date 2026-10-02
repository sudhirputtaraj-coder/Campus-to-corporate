import { z } from 'zod';
import { reportFilters } from '@/lib/employability/report-filters';

export const performanceFilters = reportFilters.and(z.object({
  minimum: z.coerce.number().min(0).max(100).optional(),
  view: z.enum(['all','ready','support','unmeasured','provisional']).optional(),
  q: z.string().max(80).optional(),
  page: z.coerce.number().int().min(1).max(100000).optional(),
}));
export type PerformanceFilters = z.infer<typeof performanceFilters>;
export function reportUrl(path: string, filters: PerformanceFilters, changes: Partial<PerformanceFilters> = {}) {
  const values = { ...filters, ...changes };
  const query = new URLSearchParams(Object.entries(values).filter(([,v])=>v!==undefined&&v!=='').map(([k,v])=>[k,String(v)]));
  return path + (query.size ? `?${query}` : '');
}
export function percent(n: number, total: number) { return total ? `${(100*n/total).toFixed(2)}%` : '—'; }
export interface PerformanceTotals { total:number; measured:number; provisional:number; unmeasured:number; ready:number; average:number|null }
export interface PerformanceGroup extends PerformanceTotals { kind:'college'|'department'|'batch'; id:string|null; name:string; college_id:string; department_id:string|null }
export interface PerformanceReport extends PerformanceTotals {
  benchmark:number; generated_at:string; support:number; matching:number;
  groups:PerformanceGroup[];
  courses:{id:string;title:string;enrolled:number;completed:number;progress:number|null;assessed:number;average:number|null;pass_rate:number|null}[];
  students:{id:string;full_name:string;register_number:string;college_name:string;department_name:string;batch_name:string;score:number|null;final:boolean;provisional:boolean;ready:boolean;computed_at:string|null;progress:number|null;enrolments:number;needs_support:boolean}[];
}
