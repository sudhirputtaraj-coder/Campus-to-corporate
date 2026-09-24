'use client';
import type { CollegeAnalyticsSummary } from '@/lib/employability/types';
import { csvCell } from '@/lib/employability/report-filters';
export function AnalyticsExport({data,filters}:{data:CollegeAnalyticsSummary;filters:string}) {
 return <button type="button" className="mb-5 rounded-lg px-4 py-3" onClick={()=>{
 const rows:unknown[][]=[['Report generated',data.generated_at],['Filters',filters||'All authorised students'],['Active students',data.total_students],['Students with final scores',data.scores_available?data.students_with_score:'Unavailable'],['Average final score',data.average_score??'Unavailable'],['Enrolments',data.enrolments],['Completed enrolments',data.completed_enrolments],[],['Cohort','Active students','Final scores','Average score'],...data.college_averages.map(c=>[c.name,c.students,data.scores_available?c.measured:'Unavailable',c.average??'Unavailable']),[],['Department','Average score','Students'],...data.department_averages.map(d=>[d.department_name,d.avg_score,d.n]),[],['Batch','Average score','Students'],...data.batch_averages.map(b=>[b.batch_name,b.avg_score,b.n])];
 const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='campus-to-corporate-analytics.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }}>Download aggregate CSV</button>;
}
