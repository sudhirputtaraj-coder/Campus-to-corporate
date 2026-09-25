import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { loadLearningPath } from '@/lib/learning/path-data';
import { cleanModuleTitle, nextUnfinished } from '@/lib/learning/path-order';
export async function LearningPath({studentId,compact=false}:{studentId:string;compact?:boolean}) {
  const client=await createClient(); const access=await client.rpc('fn_has_learning_access');
  if(access.error)return <p role="alert">Learning access could not be verified. Please refresh.</p>;
  if(access.data!==true)return <section className="mb-6 rounded-xl border bg-white p-5"><h2 className="text-xl font-semibold">Your learning path</h2><p className="my-3">Active programme or college access is needed to continue.</p><Link href="/student/learning">Check my learning access</Link></section>;
  let path;try {path=await loadLearningPath(studentId);}catch {return <p role="alert">Your learning path could not be loaded. Please refresh.</p>;}
  const next=nextUnfinished(path.lessons,path.completed);
  const progress=path.lessons.filter(l=>path.completed.has(l.id)).length;
  return <section className="mb-8 space-y-4" aria-label="Your learning path">
    <div className="rounded-xl border bg-white p-5"><h2 className="text-xl font-semibold">{next?'Your next lesson':path.lessons.length?'Learning lessons completed':'Your learning path'}</h2>
      <p className="mt-2">{path.lessons.length ? `${progress} of ${path.lessons.length} available lessons completed`:'Your assigned content will appear here when published.'}</p>
      {next?<><p className="mt-3 font-medium">{next.title}</p><Link prefetch={false} className="mt-4 inline-block rounded-lg px-5 py-3" href={`/student/lesson/${next.id}`}>{progress?'Continue learning':'Start learning'} →</Link></>:path.lessons.length>0&&<Link className="mt-4 inline-block rounded-lg px-5 py-3" href="/student/assessments">Review available assessments</Link>}
      <p className="mt-3 text-sm text-slate-600">Learn → practise → take a formal assessment → review your skill scores. You can revisit any published lesson.</p>
    </div>
    {compact?<Link className="inline-block rounded-lg px-4 py-3" href="/student/learning">View my full learning path</Link>:<>
      <div className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Start here: programme orientation</h2><p className="mt-2 text-sm">Understand the programme, then work through the numbered skills below.</p>{path.lessons.filter(l=>/^Start here:/i.test(l.title)).map(l=><p key={l.id} className="mt-3"><Link prefetch={false} className="underline" href={`/student/lesson/${l.id}`}>{l.title}</Link> · {path.completed.has(l.id)?'Completed':'Start here'}</p>)}</div>
      <h2 className="text-xl font-semibold">Your skills, step by step</h2>
      {path.skills.map((skill,index)=>{
        const modules=path.modules.filter(m=>m.skill_id===skill.id).sort((a,b)=>a.sequence-b.sequence||a.id.localeCompare(b.id));
        const lessons=path.lessons.filter(l=>l.skill_id===skill.id&&!/^Start here:/i.test(l.title));const done=lessons.filter(l=>path.completed.has(l.id)).length;
        return <details key={skill.id} open={next?.skill_id===skill.id&&!/^Start here:/i.test(next?.title||'')} className="rounded-xl border bg-white p-5"><summary className="cursor-pointer font-semibold">{index+1}. {skill.name} · {lessons.length?`${done}/${lessons.length} lessons`:'Content coming soon'}</summary>
          {!modules.length&&<p className="mt-3 text-sm">No published modules in your enrolled courses yet. Continue with the next available skill.</p>}
          {modules.map((module,i)=><div key={module.id} className="mt-5 border-t pt-4"><h3 className="font-semibold">Module {i+1}: {cleanModuleTitle(module.title)}</h3><p className="text-xs text-slate-500">{path.courses.find(c=>c.id===module.course_id)?.title}</p><ol className="mt-3 space-y-3">{path.lessons.filter(l=>l.module_id===module.id&&!/^Start here:/i.test(l.title)).map(l=><li key={l.id}><Link prefetch={false} className="underline" href={`/student/lesson/${l.id}`}>{l.title}</Link><span className="ml-2 text-sm">{path.completed.has(l.id)?'Completed':next?.id===l.id?'Up next':''}</span></li>)}</ol></div>)}
          <Link href={`/student/skills#skill-${skill.code}`} className="mt-4 inline-block underline">View skill score</Link>
        </details>;
      })}
      {path.modules.some(m=>!m.skill_id)&&<details className="rounded-xl border bg-white p-5"><summary className="font-semibold">Additional learning</summary>{path.lessons.filter(l=>!l.skill_id).map(l=><p className="mt-3" key={l.id}><Link prefetch={false} href={`/student/lesson/${l.id}`}>{l.title}</Link></p>)}</details>}
    </>}
  </section>;
}
