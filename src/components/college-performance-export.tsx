'use client';
import { csvCell } from '@/lib/employability/report-filters';
import { percent, type PerformanceReport } from '@/lib/college/performance';
export function CollegePerformanceExport({data,filters}:{data:PerformanceReport;filters:string}) {
  return <button className="my-4 rounded-lg px-4 py-3" onClick={()=>{
    const rows:unknown[][]=[['Generated',data.generated_at],['Filters',filters],['Readiness benchmark',data.benchmark],
      ['Scope','Total active students','Final scores','Provisional','No measurement in period','Meeting benchmark','Coverage','Ready / all','Ready / assessed','Average score / 100'],
      ...[{name:'Selected college cohort',...data},...data.groups.map(g=>({...g,name:`${g.kind}: ${g.name} (${g.college_id})`}))].map(g=>[g.name,g.total,g.measured,g.provisional,g.unmeasured,g.ready,percent(g.measured,g.total),percent(g.ready,g.total),percent(g.ready,g.measured),g.average??'Unavailable']),
      [],['Course','Enrolments','Completed','Progress %','Latest formal student-assessment results','Average assessment %','Pass rate %'],
      ...data.courses.map(c=>[c.title,c.enrolled,c.completed,c.progress??'',c.assessed,c.average??'',c.pass_rate??''])];
    const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='college-performance.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }}>Download aggregate CSV</button>;
}
