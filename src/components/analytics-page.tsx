import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AnalyticsReport } from './analytics-report';
import { AnalyticsExport } from './analytics-export';
import { reportFilters } from '@/lib/employability/report-filters';
import type { CollegeAnalyticsSummary } from '@/lib/employability/types';
export async function AnalyticsPage({platform,params}:{platform:boolean;params:Record<string,string|undefined>}) {
 const client=await createClient();const {data:{user}}=await client.auth.getUser();if(!user)redirect('/login');
 const {data:profile}=await client.from('profiles').select('role,status').eq('user_id',user.id).single();
 if(!profile||profile.status!=='ACTIVE'||!(platform?['SUPER_ADMIN']:['SUPER_ADMIN','COLLEGE_ADMIN']).includes(profile.role))redirect('/login');
 const parsed=reportFilters.safeParse(Object.fromEntries(Object.entries(params).filter(([,v])=>v!=='')));
 const f=parsed.success?parsed.data:{};
 const options=await Promise.all(['colleges','departments','batches','courses'].map(t=>client.from(t).select(t==='courses'?'id,title':'id,name').eq('status','ACTIVE').order(t==='courses'?'title':'name').limit(1000)));
 const result=parsed.success?await client.rpc('fn_learning_analytics_filtered',{p_college_id:f.college||null,p_department_id:f.department||null,p_batch_id:f.batch||null,p_course_id:f.course||null,p_from:f.from||null,p_to:f.to||null}):{data:null,error:{message:'Invalid filters'}};
 const data=result.data as CollegeAnalyticsSummary|null;const base=platform?'/admin':'/college';
 return <main className="mx-auto max-w-7xl px-4 py-8"><Link href={`${base}/dashboard`}>Back to dashboard</Link><h1 className="mb-5 mt-5 text-3xl font-bold">{platform?'Platform':'College'} Analytics</h1>
 <form className="professional-form mb-6 grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">{(['college','department','batch','course'] as const).map((name,i)=><label key={name} className="capitalize">{name}<select name={name} defaultValue={f[name]||''}><option value="">All authorised {name}s</option>{(options[i].data||[]).map((o: { id: string; name?: string; title?: string })=><option key={o.id} value={o.id}>{o.name||o.title}</option>)}</select></label>)}<label>From date (IST)<input type="date" name="from" defaultValue={f.from}/></label><label>Through date (IST)<input type="date" name="to" defaultValue={f.to}/></label><button className="self-end rounded-lg p-3">Apply filters</button><Link className="self-end rounded-lg p-3" href={`${base}/analytics`}>Clear filters</Link></form>
 {options.some(o=>o.error)&&<p role="status">Some filter options could not be loaded.</p>}
 <p className="mb-4 text-sm text-slate-600">Student membership and progress are current. Dates filter enrolments by enrolment date, attempts by completion date, and the latest score up to the end date. Scores before the start date are excluded. This is not a historical enrolment/progress snapshot.</p>
 <Link href={`/college/support?${new URLSearchParams({...(f.college?{college:f.college}:{}),...(f.batch?{batch:f.batch}:{})})}`} className="mb-5 inline-block rounded-lg p-3">Students needing learning support</Link>
 {!parsed.success?<p role="alert">Choose valid filters and a start date no later than the end date.</p>:result.error||!data?<p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-5">Analytics unavailable. Check migration 030 and your access, then refresh.</p>:<><AnalyticsExport data={data} filters={new URLSearchParams(Object.entries(f)).toString()}/><AnalyticsReport data={data} platform={profile.role==='SUPER_ADMIN'}/></>}
 </main>;
}
