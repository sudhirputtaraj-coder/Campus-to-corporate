'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { PerformanceFilters } from '@/lib/college/performance';
export interface ReportOption {id:string;name?:string;title?:string;college_id?:string;department_id?:string|null}
export function CollegeReportFilters({base,filters,options,benchmark,support}:{base:string;filters:PerformanceFilters;options:ReportOption[][];benchmark?:number;support:boolean}) {
  const [college,setCollege]=useState(filters.college??'');
  const [department,setDepartment]=useState(filters.department??'');
  const [batch,setBatch]=useState(filters.batch??'');
  return <form action={base} className="professional-form my-5 grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
    <label>College<select name="college" value={college} onChange={e=>{setCollege(e.target.value);setDepartment('');setBatch('');}}><option value="">All colleges</option>{options[0].map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
    <label>Department<select name="department" value={department} onChange={e=>{setDepartment(e.target.value);setBatch('');}}><option value="">All departments</option>{options[1].filter(o=>!college||o.college_id===college).map(o=><option key={o.id} value={o.id}>{o.name}{!college?` · ${options[0].find(c=>c.id===o.college_id)?.name??'College'}`:''}</option>)}</select></label>
    <label>Batch<select name="batch" value={batch} onChange={e=>setBatch(e.target.value)}><option value="">All batches</option>{options[2].filter(o=>(!college||o.college_id===college)&&(!department||o.department_id===department)).map(o=><option key={o.id} value={o.id}>{o.name}{!college?` · ${options[0].find(c=>c.id===o.college_id)?.name??'College'}`:''}</option>)}</select></label>
    <label>Course<select name="course" defaultValue={filters.course??''}><option value="">All courses</option>{options[3].map(o=><option key={o.id} value={o.id}>{o.title}</option>)}</select></label>
    <label>Score / assessment from (IST)<input type="date" name="from" defaultValue={filters.from}/></label>
    <label>Through (IST)<input type="date" name="to" defaultValue={filters.to}/></label>
    <label>Readiness benchmark / 100<input type="number" name="minimum" min={0} max={100} step="0.01" defaultValue={filters.minimum??benchmark}/></label>
    <label>Student name or register number<input name="q" maxLength={80} defaultValue={filters.q}/></label>
    {!support&&<label>Student list<select name="view" defaultValue={filters.view??'all'}><option value="all">All students</option><option value="ready">Meeting benchmark</option><option value="provisional">Provisional scores</option><option value="unmeasured">No measurement in period</option><option value="support">Needs support</option></select></label>}
    <button className="self-end rounded-lg p-3">Apply filters</button><Link className="self-end rounded-lg p-3" href={base}>Clear filters</Link>
  </form>;
}
