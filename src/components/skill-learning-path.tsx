import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { loadLearningPath } from '@/lib/learning/path-data';
import { cleanModuleTitle, nextUnfinished } from '@/lib/learning/path-order';
type Path = Awaited<ReturnType<typeof loadLearningPath>>;
type Assessment = { id: string; title: string; course_id: string; lesson_id: string | null; is_practice: boolean; duration_minutes: number };
export async function SkillLearningPath({ path, selectedSkill }: { path: Path; selectedSkill?: string }) {
  const next = nextUnfinished(path.lessons, path.completed);
  const choices = path.skills;
  const selected = choices.find(s => s.id === selectedSkill) || choices.find(s => s.id === next?.skill_id) || choices[0];
  if (!selected) return <p className="rounded-xl border bg-white p-6">Your skills will appear here when content is assigned.</p>;
  const modules = path.modules.filter(m => selected.id === 'additional' ? !m.skill_id : m.skill_id === selected.id).sort((a,b) => a.sequence-b.sequence || a.id.localeCompare(b.id));
  const moduleIds = new Set(modules.map(m => m.id));
  const lessons = path.lessons.filter(l => moduleIds.has(l.module_id));
  const done = lessons.filter(l => path.completed.has(l.id)).length;
  const nextLesson = nextUnfinished(lessons, path.completed);
  const courseIds = [...new Set(modules.map(m => m.course_id))];
  const assessments: Assessment[] = [];
  let assessmentError = false;
  const client = await createClient();
  for (const courseId of courseIds) {
    for (let from=0;;from+=500) {
      const result = await client.from('assessments').select('id,title,course_id,lesson_id,is_practice,duration_minutes').eq('course_id',courseId).eq('status','ACTIVE').order('id').range(from,from+499);
      if (result.error) { assessmentError = true; break; }
      assessments.push(...(result.data || []));
      if ((result.data || []).length < 500) break;
    }
  }
  return <section aria-label="Skill learning path" className="space-y-6">
    <nav aria-label="Choose a skill" className="flex flex-wrap gap-2">
      {choices.map(skill => <Link key={skill.id} scroll={false} href={'/student/learning?skill='+skill.id} aria-current={selected.id===skill.id ? 'page' : undefined}
        className={'rounded-full border px-4 py-3 text-sm font-medium '+(selected.id===skill.id?'border-slate-900 bg-slate-900 text-white ring-2 ring-slate-900 ring-offset-2 font-bold':'border-slate-300 bg-white text-slate-700 hover:bg-slate-100')}>{skill.name}</Link>)}
    </nav>
    <div className="rounded-xl border bg-white p-5">
      <h2 className="text-xl font-bold">{selected.name}</h2>
      <p className="mt-2 text-sm text-slate-600">{modules.length} modules · {lessons.length} lessons · {done} completed</p>
      {lessons.length > 0 && <progress className="mt-3 h-2 w-full" max={lessons.length} value={done} aria-label={selected.name+' lesson progress'} />}
      {nextLesson && <Link prefetch={false} className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white" href={'/student/lesson/'+nextLesson.id}>{done ? 'Continue' : 'Start'}: {nextLesson.title} →</Link>}
      {!modules.length && <p className="mt-3 text-sm text-slate-600">No published modules are available for you in this skill yet. Choose another skill to continue.</p>}
      {lessons.length>0 && !nextLesson && <p className="mt-3 text-sm font-medium text-green-700">All available lessons completed. You can revisit any lesson below.</p>}
    </div>
    <div className="space-y-3">{modules.map((module,index) => {
      const items = lessons.filter(l => l.module_id===module.id);
      const completed = items.filter(l => path.completed.has(l.id)).length;
      return <details key={module.id} id={'module-'+module.id} className="scroll-mt-6 rounded-xl border bg-white p-5">
        <summary className="cursor-pointer"><span className="font-semibold">{index+1}. {cleanModuleTitle(module.title)}</span><span className="mt-1 block text-sm text-slate-600">{items.length} lessons · {completed}/{items.length} completed</span></summary>
        {!items.length && <p className="mt-4 text-sm text-slate-600">Lessons will appear here when published.</p>}
        <ol className="mt-4 divide-y">{items.map((lesson,i) => <li key={lesson.id} className="py-3">
          <Link prefetch={false} href={'/student/lesson/'+lesson.id} className="font-medium text-blue-700 underline">{i+1}. {cleanModuleTitle(lesson.title)}</Link>
          <p className="mt-1 text-sm text-slate-600">{path.completed.has(lesson.id)?'Completed':'Not completed'}{lesson.duration_minutes ? ' · '+lesson.duration_minutes+' min' : ''} · {lesson.practice_count || 0} practice questions</p>
          {!!lesson.practice_count && <Link prefetch={false} className="mt-1 inline-block text-sm text-blue-700 underline" href={'/student/lesson/'+lesson.id+'#lesson-practice'}>Open lesson practice</Link>}
          <ul className="mt-2 space-y-2">{assessments.filter(a=>a.lesson_id===lesson.id).map(a=><li key={a.id}><Link className="text-sm font-medium text-blue-700 underline" href={'/student/assessment/'+a.id}>{a.is_practice?'Practice assessment':'Assessment'}: {a.title}</Link><span className="ml-2 text-xs text-slate-500">{a.duration_minutes} min</span></li>)}</ul>
          {!assessmentError && !assessments.some(a=>a.lesson_id===lesson.id) && <p className="mt-1 text-xs text-slate-500">No formal assessment for this lesson yet.</p>}
        </li>)}</ol>
      </details>;
    })}</div>
    {assessmentError && <p role="status" className="text-sm">Lesson assessments could not be loaded. Please refresh or contact your administrator.</p>}
  </section>;
}
