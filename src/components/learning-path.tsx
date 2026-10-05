import { SkillLearningPath } from './skill-learning-path';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { loadLearningPath } from '@/lib/learning/path-data';
import { nextUnfinished } from '@/lib/learning/path-order';
export async function LearningPath({studentId,compact=false,selectedSkill}:{studentId:string;compact?:boolean;selectedSkill?:string}) {
  const client=await createClient(); const access=await client.rpc('fn_has_learning_access');
  if(access.error)return <p role="alert">Learning access could not be verified. Please refresh.</p>;
  if(access.data!==true)return <section className="mb-6 rounded-xl border bg-white p-5"><h2 className="text-xl font-semibold">Your learning path</h2><p className="my-3">Active programme or college access is needed to continue.</p><Link href="/student/learning">Check my learning access</Link></section>;
  let path;try {path=await loadLearningPath(studentId);}catch {return <p role="alert">Your learning path could not be loaded. Please refresh.</p>;}
  if (!compact) return <SkillLearningPath path={path} selectedSkill={selectedSkill} />;
  const next=nextUnfinished(path.lessons,path.completed);
  const progress=path.lessons.filter(l=>path.completed.has(l.id)).length;
  return <section className="mb-8 space-y-4" aria-label="Your learning path">
    <div className="rounded-xl border bg-white p-5"><h2 className="text-xl font-semibold">{next?'Your next lesson':path.lessons.length?'Learning lessons completed':'Your learning path'}</h2>
      <p className="mt-2">{path.lessons.length ? `${progress} of ${path.lessons.length} available lessons completed`:'Your assigned content will appear here when published.'}</p>
      {next?<><p className="mt-3 font-medium">{next.title}</p><Link prefetch={false} className="mt-4 inline-block rounded-lg px-5 py-3" href={`/student/lesson/${next.id}`}>{progress?'Continue learning':'Start learning'} →</Link></>:path.lessons.length>0&&<Link className="mt-4 inline-block rounded-lg px-5 py-3" href="/student/learning">Review lessons and assessments</Link>}
      <p className="mt-3 text-sm text-slate-600">Learn → practise → take a formal assessment → review your skill scores. You can revisit any published lesson.</p>
    </div>
    <Link className="inline-block rounded-lg px-4 py-3" href="/student/learning">View my full learning path</Link>
  </section>;
}
