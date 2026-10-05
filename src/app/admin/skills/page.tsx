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
  const [skills, modules] = await Promise.all([
    supabase.from('skills').select('*').order('display_order').order('name'),
    supabase.from('modules').select('id, title, course_id, skill_id, sequence, status').order('sequence').order('title'),
  ]);
  if (skills.error || modules.error) throw new Error('Unable to load skill modules. Check that migration 038 has been applied.');
  return <main className="min-h-screen bg-slate-50 px-4 py-8"><div className="mx-auto max-w-6xl">
    <Link href="/admin/dashboard" className="text-sm text-blue-700 underline">Back to dashboard</Link>
    <h1 className="mt-6 text-3xl font-bold">Manage Skills</h1>
    <p className="mt-3 text-slate-600">Choose a skill, add its modules, then add lessons and assessments inside each module.</p>
    <p className="mt-2 text-sm text-slate-600">Add or hide skills as your programme changes. Hidden content stays available for editing and preserves existing results.</p>
    <details className="mt-5 rounded-xl border bg-white p-5"><summary className="cursor-pointer font-semibold">Add a new skill</summary>
      <div className="mt-4"><ContentForm kind="skill" /></div>
    </details>
    <div className="mt-6 grid gap-6 md:grid-cols-2">{skills.data?.map(skill => <section key={skill.id} className="min-w-0 rounded-xl border bg-white p-5">
      <h2 className="text-xl font-semibold">{skill.name}</h2>
      <p className="mt-1 text-xs text-slate-500">{skill.status === 'ACTIVE' ? 'Published' : 'Hidden'} · {modules.data?.filter(m => m.skill_id === skill.id).length || 0} modules</p>
      <p className="mt-2 text-sm text-slate-600">{skill.description}</p>
      <details className="mt-3"><summary className="cursor-pointer text-sm font-medium text-blue-700">Edit skill</summary>
        <div className="mt-3"><ContentForm kind="skill" item={skill} /></div>
      </details>
      <h3 className="mt-4 font-semibold">Skill modules</h3>
      <ul className="mt-2 space-y-2">{modules.data?.filter(m => m.skill_id === skill.id).map(m => <li key={m.id}>
        <Link className="text-blue-700 underline" href={`/admin/skills/modules/${m.id}`}>{m.title} — manage lessons and assessments</Link>
        {m.status !== 'ACTIVE' && <span className="ml-2 text-xs text-slate-500">{m.status}</span>}
      </li>)}</ul>
      <SkillModuleForm skillId={skill.id} />
    </section>)}</div>
    {!!modules.data?.some(m=>!m.skill_id) && <details className="mt-6 rounded-xl border bg-white p-5"><summary className="font-semibold">Modules needing a skill</summary><p className="mt-2 text-sm">Choose a parent skill in each module editor so it appears in the learning path.</p><ul className="mt-3 space-y-2">{modules.data.filter(m=>!m.skill_id).map(m=><li key={m.id}><Link className="underline" href={'/admin/skills/modules/'+m.id}>{m.title}</Link></li>)}</ul></details>}
  </div></main>;
}
