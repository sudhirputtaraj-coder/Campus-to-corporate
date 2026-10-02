import Link from 'next/link';
import type { DirectoryAccess } from '@/lib/college/student-directory';
import { directoryPage } from '@/lib/college/student-directory';
import { reportUrl, type PerformanceFilters } from '@/lib/college/performance';
import type { BreakdownItem } from '@/lib/employability/types';

// The parent page verifies the student's college scope before rendering this component.
export async function CollegeStudentPerformance({access,studentId,filters,params}:{access:DirectoryAccess;studentId:string;filters:PerformanceFilters;params:Record<string,string|undefined>}) {
  const historyPage=directoryPage(params.historyPage),attemptPage=directoryPage(params.attemptPage);
  const scores=()=>{
    let q=access.client.from('student_employability_scores').select('id,score,is_provisional,classification_label,skills_measured,skills_weighted,breakdown,computed_at',{count:'exact'}).eq('student_id',studentId);
    if(filters.to)q=q.lt('computed_at',`${nextDate(filters.to)}T00:00:00+05:30`);
    return q.order('computed_at',{ascending:false}).order('id',{ascending:false});
  };
  let history=scores();if(filters.from)history=history.gte('computed_at',`${filters.from}T00:00:00+05:30`);
  let attempts=access.client.from('assessment_attempts').select('id,attempt_number,percentage,obtained_marks,total_marks,passed,completed_at,assessment:assessments!inner(title,course_id,is_practice)',{count:'exact'})
    .eq('student_id',studentId).eq('status','GRADED').eq('assessment.is_practice',false);
  if(filters.course)attempts=attempts.eq('assessment.course_id',filters.course);
  if(filters.from)attempts=attempts.gte('completed_at',`${filters.from}T00:00:00+05:30`);
  if(filters.to)attempts=attempts.lt('completed_at',`${nextDate(filters.to)}T00:00:00+05:30`);
  const [latestResult,historyResult,attemptResult]=await Promise.all([
    scores().limit(1),history.range((historyPage-1)*10,historyPage*10-1),
    attempts.order('completed_at',{ascending:false}).order('id',{ascending:false}).range((attemptPage-1)*25,attemptPage*25-1),
  ]);
  if(latestResult.error||historyResult.error||attemptResult.error)return <section role="alert" className="my-6 rounded-xl border bg-white p-5">Performance records could not be loaded. Please refresh or ask your platform administrator to check access.</section>;
  const latest=latestResult.data[0];
  const inPeriod=latest&&(!filters.from||new Date(latest.computed_at)>=new Date(`${filters.from}T00:00:00+05:30`));
  const breakdown:BreakdownItem[]=inPeriod&&Array.isArray(latest.breakdown)?latest.breakdown:[];
  const path=reportUrl(`/college/students/${studentId}`,filters);
  const pageUrl=(field:string,n:number)=>{
    const query=new URLSearchParams(path.split('?')[1]??'');
    if(params.historyPage)query.set('historyPage',params.historyPage);
    if(params.attemptPage)query.set('attemptPage',params.attemptPage);
    query.set(field,String(n));return `/college/students/${studentId}?${query}`;
  };
  return <>
    <section className="mt-6 rounded-xl border bg-white p-5"><h2 className="text-xl font-semibold">Employability performance</h2>
      <p className="my-3 text-sm">Overall skill evidence as of {filters.to??'the latest measurement'}{filters.from?`, with measurements from ${filters.from}`:''}. A course filter does not turn this into a course-specific employability score.</p>
      {inPeriod?<><p className="text-3xl font-bold">{latest.score}/100 <span className="text-base">{latest.is_provisional?'Provisional':'Final score'}</span></p><p>{latest.is_provisional?'More evidence or a scoring configuration review is needed. This score does not count towards readiness.':latest.classification_label??'No stored classification'}</p><p>{latest.skills_measured} of {latest.skills_weighted} weighted skills measured · {formatDate(latest.computed_at)}</p></>:<p>No score measurement in the selected period. Missing evidence is not a zero score.</p>}
      {breakdown.length>0&&<div className="mt-4 overflow-x-auto" role="region" aria-label="Skill evidence" tabIndex={0}><table className="w-full min-w-[38rem] text-left text-sm"><thead><tr>{['Skill','Proficiency','Target','Gap','Weight','Next step'].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{breakdown.map(b=><tr key={b.skill_id} className="border-t"><td className="p-2">{b.name}</td><td className="p-2">{b.proficiency==null?'Not measured':`${b.proficiency}%`}</td><td className="p-2">{b.target}%</td><td className="p-2">{b.gap==null?'—':`${b.gap} points`}</td><td className="p-2">{b.weight_percent}%</td><td className="p-2">{!b.included?'Complete a formal assessment with sufficient evidence':(b.gap??0)>0?'Practise this skill, then reassess':'Target met; continue practising'}</td></tr>)}</tbody></table></div>}
    </section>
    <section className="mt-6 rounded-xl border bg-white p-5"><h2 className="text-xl font-semibold">Score history</h2><p className="my-2 text-sm">{historyResult.count??0} measurements in the selected period. Compare final results with their skill evidence; a change in scoring configuration can also change the score.</p><ul className="space-y-3">{historyResult.data.map(h=><li key={h.id} className="border-b pb-3">{formatDate(h.computed_at)} · <strong>{h.score}/100</strong> · {h.is_provisional?'Provisional':h.classification_label??'Final'} · {h.skills_measured}/{h.skills_weighted} skills</li>)}</ul><nav aria-label="Score history pages" className="mt-4 flex gap-4">{historyPage>1&&<Link href={pageUrl('historyPage',historyPage-1)}>Previous scores</Link>}<span>Page {historyPage}</span>{historyPage*10<(historyResult.count??0)&&<Link href={pageUrl('historyPage',historyPage+1)}>Older scores</Link>}</nav></section>
    <section className="mt-6 rounded-xl border bg-white p-5"><h2 className="text-xl font-semibold">Formal assessment results</h2><p className="my-2 text-sm">{attemptResult.count??0} graded attempts matching the course/date filters. Practice is excluded; all formal attempts are listed here.</p><ul className="space-y-4">{attemptResult.data.map(a=>{
      const assessment=(Array.isArray(a.assessment)?a.assessment[0]:a.assessment) as {title:string}|null;
      return <li key={a.id} className="border-b pb-3"><h3 className="font-semibold">{assessment?.title??'Assessment'} · Attempt #{a.attempt_number}</h3><p>{a.percentage}% · {a.obtained_marks}/{a.total_marks} marks · {a.passed===null?'Decision not recorded':a.passed?'Passed':'Not passed'}</p><p className="text-sm">{formatDate(a.completed_at)}</p></li>;
    })}</ul><nav aria-label="Assessment result pages" className="mt-4 flex gap-4">{attemptPage>1&&<Link href={pageUrl('attemptPage',attemptPage-1)}>Previous assessments</Link>}<span>Page {attemptPage}</span>{attemptPage*25<(attemptResult.count??0)&&<Link href={pageUrl('attemptPage',attemptPage+1)}>Older assessments</Link>}</nav></section>
  </>;
}
function nextDate(value:string) {const date=new Date(`${value}T00:00:00Z`);date.setUTCDate(date.getUTCDate()+1);return date.toISOString().slice(0,10);}
function formatDate(value:string|null) {return value?new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST':'Date unavailable';}
