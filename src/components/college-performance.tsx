import Link from 'next/link';
import { redirect } from 'next/navigation';
import { collegeDirectoryAccess } from '@/lib/college/student-directory';
import { performanceFilters, reportUrl, percent, type PerformanceReport, type PerformanceFilters } from '@/lib/college/performance';
import { CollegePerformanceExport } from './college-performance-export';
import { CollegeReportFilters, type ReportOption } from './college-report-filters';

export async function CollegePerformance({params,mode='reports'}:{params:Record<string,string|undefined>;mode?:'reports'|'students'|'support'|'dashboard'}) {
  const access=await collegeDirectoryAccess();if(!access)redirect('/login');
  const parsed=performanceFilters.safeParse(Object.fromEntries(Object.entries(params).filter(([,v])=>v!==''&&v!==undefined)));
  if(!parsed.success)return <main className="mx-auto max-w-7xl p-6"><h1>Invalid report filters</h1><p>Check dates, identifiers and the benchmark (0–100).</p><Link href="/college/analytics">Reset report</Link></main>;
  const f:PerformanceFilters={...parsed.data,...(mode==='support'?{view:'support' as const}:{})};
  const base=mode==='students'?'/college/students':mode==='support'?'/college/support':mode==='dashboard'?'/college/dashboard':'/college/analytics';
  const result=await access.client.rpc('fn_college_performance',{p_college_id:f.college??null,p_department_id:f.department??null,p_batch_id:f.batch??null,p_course_id:f.course??null,p_from:f.from??null,p_to:f.to??null,p_minimum:f.minimum??null,p_view:f.view??'all',p_query:f.q??'',p_page:f.page??1});
  const data=result.data as PerformanceReport|null;
  // Options obey RLS and selected parent filters; page all results rather than truncating at 1,000.
  const options=await Promise.all(['colleges','departments','batches','courses'].map(async table=>{
    const rows:ReportOption[]=[];
    for(let start=0;;start+=500){
      let q=access.client.from(table).select(table==='courses'?'id,title':table==='departments'?'id,name,college_id':table==='batches'?'id,name,college_id,department_id':'id,name').eq('status','ACTIVE').order('id').range(start,start+499);
      if(table==='colleges'&&access.collegeIds!==null)q=q.in('id',access.collegeIds.length?access.collegeIds:['00000000-0000-0000-0000-000000000000']);
      const r=await q;if(r.error)return {rows:[],error:true};rows.push(...(r.data as unknown as ReportOption[]));if(r.data.length<500)break;
    }
    return {rows:rows.sort((a,b)=>(a.name??a.title??'').localeCompare(b.name??b.title??'')),error:false};
  }));
  const url=(path:string,changes:Partial<PerformanceFilters>={})=>reportUrl(path,f,{page:undefined,...changes});
  return <main className="mx-auto max-w-7xl px-4 py-8">
    <Link href="/college/students/access" className="mb-4 inline-block rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Add students & manage access</Link>
    <h1 className="text-3xl font-bold">{mode==='students'?'Student Performance':mode==='support'?'Students Needing Support':mode==='dashboard'?'College Dashboard':'College Employability Reports'}</h1>
    <p className="my-3">Active college students in your authorised colleges. Individual programme students are excluded.</p>
    <CollegeReportFilters key={JSON.stringify(f)} base={base} filters={f} options={options.map(o=>o.rows)} benchmark={data?.benchmark} support={mode==='support'}/>
    {options.some(o=>o.error)&&<p role="status">Some filter options could not be loaded. Refresh and try again.</p>}
    <p className="my-3 text-sm text-slate-600">Student membership and learning progress are current. Dates select score measurements and completed assessments; they do not reconstruct past enrolment or progress.</p>
    {result.error||!data?<p role="alert" className="rounded-xl border bg-white p-5">College performance is unavailable. Ask your platform administrator to check reporting setup and your college access. No missing data is shown as zero.</p>:<>
      <p className="my-3">Readiness means a final score of at least <strong>{data.benchmark}/100</strong> for this report. Changing this benchmark does not change stored scores or classifications. Course filters select enrolled students; their employability scores still cover all measured skills.</p>
      <div className="my-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
        ['Active students',data.total],['Final scores',data.measured],['Assessment coverage',percent(data.measured,data.total)],['Average final score / 100',data.average??'—'],
        ['Meeting benchmark',data.ready],['Ready / all students',percent(data.ready,data.total)],['Ready / assessed students',percent(data.ready,data.measured)],['Provisional scores',data.provisional],['No measurement in period',data.unmeasured],
      ].map(([label,value])=><section key={label} className="rounded-xl border bg-white p-5"><h2 className="text-sm">{label}</h2><p className="mt-2 text-2xl font-bold">{value}</p></section>)}</div>
      <p className="text-sm text-slate-600">Final-score averages include genuine zero scores. The latest measurement up to the end date is used; a newer provisional score never falls back to an older final score. Unmeasured students are not counted as zero. Scores indicate preparation, not a hiring guarantee.</p>
      <div className="my-5 flex flex-wrap gap-3"><Link className="rounded-lg p-3" href={url('/college/students')}>View students</Link><Link className="rounded-lg p-3" href={url('/college/support',{view:undefined})}>Needs support ({data.support})</Link><Link className="rounded-lg p-3" href="/college/students/import">Assign department / batch from CSV</Link></div>
      <CollegePerformanceExport data={data} filters={url(base)}/>
      {(mode==='reports'||mode==='dashboard')&&<>
        {(['college','department','batch'] as const).map(kind=><section key={kind} className="my-6 rounded-xl border bg-white p-5"><h2 className="text-xl font-semibold capitalize">{kind} performance</h2><div className="overflow-x-auto" role="region" aria-label={`${kind} performance`} tabIndex={0}><table className="mt-4 w-full min-w-[65rem] text-left text-sm"><thead><tr>{['Group','Students','Final','Provisional','Unmeasured','Average / 100','Coverage','Ready','Ready / all','Ready / assessed'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{data.groups.filter(g=>g.kind===kind).map((g,i)=><tr key={`${g.id}-${i}`} className="border-t"><td className="p-3">{g.id?<Link className="underline" href={url(kind==='batch'?'/college/students':'/college/analytics',{college:g.college_id,department:kind==='college'?undefined:g.department_id??undefined,batch:kind==='batch'?g.id:undefined,view:undefined,q:undefined})}>{g.name}</Link>:g.name}<small className="block">{data.groups.find(c=>c.kind==='college'&&c.id===g.college_id)?.name}</small></td>{[g.total,g.measured,g.provisional,g.unmeasured,g.average??'—',percent(g.measured,g.total),g.ready,percent(g.ready,g.total),percent(g.ready,g.measured)].map((v,j)=><td key={j} className="p-3">{v}</td>)}</tr>)}</tbody></table></div>{!data.groups.some(g=>g.kind===kind)&&<p>No active students match this grouping.</p>}</section>)}
        <section className="my-6 rounded-xl border bg-white p-5"><h2 className="text-xl font-semibold">Course performance</h2><p className="my-3 text-sm">Assessment figures use the latest graded formal attempt per student and assessment in the period, excluding practice. Pass rate uses results with a recorded pass/fail decision. Course completion and assessment marks are separate.</p><div className="overflow-x-auto" role="region" aria-label="Course performance" tabIndex={0}><table className="w-full min-w-[50rem] text-left text-sm"><thead><tr>{['Course','Enrolled','Completed','Average progress','Assessment results','Average mark','Pass rate'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{data.courses.map(c=><tr key={c.id} className="border-t"><td className="p-3"><Link className="underline" href={url('/college/students',{course:c.id,view:undefined,q:undefined})}>{c.title}</Link></td>{[c.enrolled,c.completed,c.progress==null?'—':`${c.progress}%`,c.assessed,c.average==null?'—':`${c.average}%`,c.pass_rate==null?'—':`${c.pass_rate}%`].map((v,i)=><td className="p-3" key={i}>{v}</td>)}</tr>)}</tbody></table></div>{!data.courses.length&&<p>No course activity in this cohort.</p>}</section>
      </>}
      <section className="my-6"><h2 className="text-xl font-semibold">Students ({data.matching} matching)</h2><p className="my-3 text-sm">Name and readiness filters affect this list only; summary totals describe the selected college, department, batch and course. Support includes missing/provisional scores, scores below the benchmark, skill gaps, no enrolment or less than 40% course progress.</p><div className="grid gap-4 md:grid-cols-2">{data.students.map(s=><section key={s.id} className="rounded-xl border bg-white p-5"><h3 className="font-semibold">{s.full_name} · {s.register_number}</h3><p>{s.college_name} · {s.department_name} · {s.batch_name}</p><p className="mt-3">{s.final?`Final score: ${s.score}/100 · ${s.ready?'Meets benchmark':'Below benchmark'}`:s.provisional?`Provisional: ${s.score}/100 — more evidence needed`:'No score measurement in the selected period'}</p><p>Course progress: {s.progress==null?'Not enrolled':`${s.progress}%`}</p><Link className="mt-3 inline-block underline" href={url(`/college/students/${s.id}`)}>View full performance</Link></section>)}</div>{!data.students.length&&<p>No matching students. Try clearing filters.</p>}<nav aria-label="Student results pages" className="mt-5 flex gap-4">{(f.page??1)>1&&<Link href={url(base,{page:(f.page??1)-1})}>Previous</Link>}<span>Page {f.page??1}</span>{(f.page??1)*25<data.matching&&<Link href={url(base,{page:(f.page??1)+1})}>Next</Link>}</nav></section>
      <p className="text-xs text-slate-500">Generated {new Date(data.generated_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST. Aggregates cover the whole selected cohort, not just the displayed page.</p>
    </>}
  </main>;
}

