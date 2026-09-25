import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function SkillModules({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: student, error: studentError } = await supabase.from('students').select('id').eq('user_id', user.id).maybeSingle();
  if (studentError) throw new Error('Unable to load your student profile.');
  if (!student) redirect('/student/setup');
  const { data: skill, error: skillError } = await supabase.from('skills').select('id, name, description').eq('id', id).eq('status', 'ACTIVE').maybeSingle();
  if (skillError) throw new Error('Unable to load this skill.');
  if (!skill) notFound();
  const { data: allowed, error: accessError } = await supabase.rpc('fn_has_learning_access');
  if (accessError) throw new Error('Unable to verify learning access.');
  // RLS limits modules to accessible enrolled courses and applies programme expiry.
  const result = allowed === true ? await supabase.from('modules')
    .select('id, title, description, sequence, course:courses(title), lessons(id, title, sequence, status)')
    .eq('skill_id', id).eq('status', 'ACTIVE').order('sequence').order('id') : { data: [], error: null };
  if (result.error) throw new Error('Unable to load learning modules. Please try again.');
  return <main className="min-h-screen bg-slate-50 px-4 py-8">
    <div className="mx-auto max-w-4xl">
      <Link href="/student/skills" className="text-sm text-blue-700 underline">Back to My Skill Scores</Link>
      <h1 className="mt-6 text-3xl font-bold text-slate-900">{skill.name}</h1>
      <p className="mt-2 text-slate-600">{skill.description}</p>
      <h2 className="mt-8 text-xl font-semibold">Learning modules</h2>
      {allowed !== true ? <div className="mt-4 rounded-xl border bg-white p-6">
        <p>Active programme access is required to open learning modules.</p>
        <Link href="/student/learning" className="mt-3 inline-block text-blue-700 underline">Check my access</Link>
      </div> : !result.data?.length ? <p className="mt-4 rounded-xl border bg-white p-6">No modules are available for this skill in your enrolled courses yet.</p>
        : <div className="mt-4 space-y-5">{result.data.map((module: any) => <section key={module.id} className="rounded-xl border bg-white p-6">
          <h3 className="text-lg font-semibold">{module.title}</h3>
          <p className="mt-1 text-xs text-slate-500">{module.course?.title}</p>
          {module.description && <p className="mt-2 text-slate-600">{module.description}</p>}
          <ul className="mt-4 space-y-3">{(module.lessons || []).filter((l: any) => l.status === 'ACTIVE').sort((a: any, b: any) => a.sequence - b.sequence).map((lesson: any) =>
            <li key={lesson.id}><Link prefetch={false} href={`/student/lesson/${lesson.id}`} className="text-blue-700 underline">{lesson.title}</Link></li>)}</ul>
          {!module.lessons?.some((l: any) => l.status === 'ACTIVE') && <p className="mt-3 text-sm text-slate-500">Lessons will be added here.</p>}
        </section>)}</div>}
    </div>
  </main>;
}
