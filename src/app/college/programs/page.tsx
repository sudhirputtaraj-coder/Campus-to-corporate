import Link from 'next/link';
import { redirect } from 'next/navigation';
import { collegeDirectoryAccess } from '@/lib/college/student-directory';
import { structureRows } from '@/lib/college/structure-data';
import ProgrammeForm from './programme-form';

export default async function CollegePrograms({ searchParams }: { searchParams: Promise<{ college_id?: string }> }) {
  const access = await collegeDirectoryAccess(); if (!access) redirect('/login');
  const params = await searchParams;
  const colleges = (await structureRows(access, 'colleges')).filter(c => c.status === 'ACTIVE');
  const college = params.college_id ? colleges.find(c => c.id === params.college_id) : colleges[0];
  const skills: { id: string; name: string; description: string | null }[] = [];
  for (let from = 0; ; from += 500) {
    const result = await access.client.from('skills').select('id,name,description').eq('status','ACTIVE').order('display_order').order('name').order('id').range(from,from+499);
    if (result.error) throw Error('Unable to load programme skills. Refresh and try again.');
    skills.push(...result.data); if (result.data.length < 500) break;
  }
  const [settings, selected] = college ? await Promise.all([
    access.client.from('college_programmes').select('all_skills,updated_at').eq('college_id', college.id).maybeSingle(),
    access.client.from('college_programme_skills').select('skill_id').eq('college_id', college.id),
  ]) : [null, null];
  const setupError = settings?.error || selected?.error;
  return <main className="min-h-screen bg-slate-50 px-4 py-8"><div className="mx-auto max-w-4xl">
    <Link href="/college/dashboard" className="text-sm text-blue-800 underline">College dashboard</Link>
    <h1 className="mt-5 text-3xl font-bold">Programs</h1>
    <p className="mt-2 text-slate-600">Set up the Campus-to-Corporate programme once for your college. Students learn through Skills → Modules → Lessons → Assessments.</p>
    {colleges.length > 1 && <form className="my-5 flex flex-wrap gap-3"><label>College<select name="college_id" defaultValue={college?.id || ''} className="ml-2 rounded-lg border p-2">{colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button className="rounded-lg border px-4 py-2">Open college</button></form>}
    {!college ? <p className="mt-6">Choose an active college assigned to your account.</p> : <section className="mt-6 rounded-xl border bg-white p-5">
      <h2 className="text-xl font-semibold">Campus-to-Corporate</h2><p className="mt-1 text-slate-600">{college.name} · {skills.length} active skills</p>
      {setupError ? <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-4">Program setup is not available yet. Ask the platform administrator to apply migration 041, then refresh. Existing access is preserved.</p> : <ProgrammeForm key={college.id} collegeId={college.id} skills={skills} selected={(selected?.data || []).map(s => s.skill_id)} configured={!!settings?.data} />}
    </section>}
    <p className="mt-5 text-sm text-slate-600">The skill library may include skills for other programmes. Select only those you want in this college’s Campus-to-Corporate programme. Newly added skills are never selected automatically. Only published material under selected skills is shown to students.</p>
    <p className="mt-2 text-sm text-slate-600">Departments and batches organise students and reports; they do not require separate programme enrolment.</p>
    <Link href={`/college/students/access${college ? '?college_id='+college.id : ''}`} className="mt-5 inline-block text-blue-800 underline">Add students & manage access →</Link>
  </div></main>;
}
