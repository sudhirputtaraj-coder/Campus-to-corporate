import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ContentForm from '../../content-form';

export default async function ModuleEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await client.from('profiles').select('role, status').eq('user_id', user.id).single();
  if (profile?.role !== 'SUPER_ADMIN' || profile.status !== 'ACTIVE') redirect('/login');
  const [module, lessons, skills] = await Promise.all([
    client.from('modules').select('*').eq('id', id).maybeSingle(),
    client.from('lessons').select('id, title, content, video_url, resource_url, duration_minutes, sequence, status').eq('module_id', id).order('sequence').order('id'),
    client.from('skills').select('id, name').order('name'),
  ]);
  if (module.error || lessons.error || skills.error) throw new Error('Unable to load content. Check that migration 010 is applied.');
  if (!module.data) notFound();
  return <main className="min-h-screen bg-slate-50 px-4 py-8"><div className="mx-auto max-w-4xl">
    <Link href="/admin/skills" className="text-blue-700 underline">Back to skills and modules</Link>
    <h1 className="mt-6 text-3xl font-bold">{module.data.title}</h1>
    <section className="mt-6 rounded-xl border bg-white p-6"><h2 className="mb-4 text-xl font-semibold">Edit module</h2>
      <ContentForm kind="module" item={module.data} skills={skills.data || []} /></section>
    <h2 className="mt-8 text-2xl font-semibold">Videos, text and reading links</h2>
    <div className="mt-4 space-y-4">{lessons.data?.map(lesson => <details key={lesson.id} className="rounded-xl border bg-white p-5">
      <summary className="cursor-pointer font-medium">{lesson.sequence}. {lesson.title} · {lesson.status === 'ACTIVE' ? 'Published' : 'Hidden'}</summary>
      <div className="mt-4"><ContentForm kind="lesson" item={lesson} moduleId={id} /></div>
    </details>)}</div>
    <section className="mt-6 rounded-xl border bg-white p-6"><h2 className="mb-4 text-xl font-semibold">Add lesson or resource</h2>
      <ContentForm kind="lesson" moduleId={id} item={{ sequence: Math.max(0, ...(lessons.data || []).map(l => l.sequence)) + 1 }} /></section>
  </div></main>;
}
