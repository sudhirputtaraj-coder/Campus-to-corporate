import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SkillModuleForm from './module-form';
import ContentForm from './content-form';

export default async function AdminSkills() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role, status').eq('user_id', user.id).single();
  if (profile?.role !== 'SUPER_ADMIN' || profile.status !== 'ACTIVE') redirect('/login');
  const [skills, courses, modules] = await Promise.all([
    supabase.from('skills').select('*').order('display_order').order('name'),
    supabase.from('courses').select('id, title').eq('status', 'ACTIVE').order('title'),
    supabase.from('modules').select('id, title, course_id, skill_id, sequence, status').order('sequence').order('title'),
  ]);
  if (skills.error || courses.error || modules.error) throw new Error('Unable to load skill modules. Check that migration 009 has been applied.');
  return <main className="min-h-screen bg-slate-50 px-4 py-8"><div className="mx-auto max-w-6xl">
    <Link href="/admin/dashboard" className="text-sm text-blue-700 underline">Back to dashboard</Link>
    <h1 className="mt-6 text-3xl font-bold">Skill learning modules</h1>
    <p className="mt-3 text-slate-600">Set the student skill order below. Add modules under each skill, then add lessons containing text, videos, reading links and practice questions with answers.</p>
    <p className="mt-2 text-sm text-slate-600">Each skill can have 10 or more modules. There is no fixed module limit.</p>
    <details className="mt-5 rounded-xl border bg-white p-5"><summary className="cursor-pointer font-semibold">Add a new skill</summary>
      <div className="mt-4"><ContentForm kind="skill" /></div>
    </details>
    <Link href="/admin/courses" className="mt-3 inline-block text-blue-700 underline">Manage courses and assign existing modules</Link>
    {!courses.data?.length && <p className="mt-4 rounded-lg bg-amber-50 p-4">Create an active course first, then add its skill modules here.</p>}
    <div className="mt-6 grid gap-6 md:grid-cols-2">{skills.data?.map(skill => <section key={skill.id} className="min-w-0 rounded-xl border bg-white p-5">
      <h2 className="text-xl font-semibold">{skill.name}</h2>
      <p className="mt-1 text-xs text-slate-500">{skill.status === 'ACTIVE' ? 'Published' : 'Hidden'} · {modules.data?.filter(m => m.skill_id === skill.id).length || 0} modules</p>
      <p className="mt-2 text-sm text-slate-600">{skill.description}</p>
      <details className="mt-3"><summary className="cursor-pointer text-sm font-medium text-blue-700">Edit skill</summary>
        <div className="mt-3"><ContentForm kind="skill" item={skill} /></div>
      </details>
      <ul className="mt-4 space-y-2">{modules.data?.filter(m => m.skill_id === skill.id).map(m => <li key={m.id}>
        <Link className="text-blue-700 underline" href={`/admin/skills/modules/${m.id}`}>{m.title} — edit lessons, videos, links and Q&A</Link>
        {m.status !== 'ACTIVE' && <span className="ml-2 text-xs text-slate-500">{m.status}</span>}
      </li>)}</ul>
      {skill.status === 'ACTIVE' ? <SkillModuleForm skillId={skill.id} courses={courses.data || []} /> : <p className="mt-4 text-sm text-slate-500">Publish this skill to add new modules.</p>}
    </section>)}</div>
  </div></main>;
}
