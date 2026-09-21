import Link from 'next/link';
import {redirect,notFound} from 'next/navigation';
import {z} from 'zod';
import {collegeDirectoryAccess,collegeStudents,directoryPage,relationName} from '@/lib/college/student-directory';
import {structureRows} from '@/lib/college/structure-data';
import StructureForm from '../../structure-form';

export default async function StudentProgress({params,searchParams}:{params:Promise<{studentId:string}>;searchParams:Promise<{page?:string}>}) {
  const access=await collegeDirectoryAccess();if(!access)redirect('/login');
  const {studentId}=await params;if(!z.string().uuid().safeParse(studentId).success)notFound();
  const page=directoryPage((await searchParams).page);
  const result=await collegeStudents(access).eq('id',studentId).maybeSingle();
  if(result.error)throw new Error('Unable to load student.');
  const student=result.data;if(!student)notFound();
  // Read progress only after proving this student belongs to the administrator's scope.
  const [profileResult,enrolments]=await Promise.all([
    access.client.from('profiles').select('full_name,email,status').eq('user_id',student.user_id).maybeSingle(),
    access.client.from('enrollments').select('id,status,completion_percentage,enrollment_date,course:courses(title,status)',{count:'exact'})
      .eq('student_id',student.id).order('enrollment_date',{ascending:false}).order('id').range((page-1)*25,page*25-1),
  ]);
  if(profileResult.error||enrolments.error)throw new Error('Unable to load student progress.');
  const profile=profileResult.data;
  const [departments,batches]=await Promise.all([structureRows(access,'departments',student.college_id),structureRows(access,'batches',student.college_id)]);
  const placement=await access.client.from('students').select('department_id,batch_id').eq('id',student.id).single();
  if(placement.error)throw new Error('Unable to load placement.');
  return <main className="min-h-screen bg-slate-50 px-4 py-10"><div className="max-w-4xl mx-auto">
    <Link href="/college/students" className="text-blue-700">Back to students</Link>
    <h1 className="mt-5 text-2xl font-bold">{profile?.full_name||'Student progress'}</h1>
    <p className="mt-2 break-all text-slate-600">{profile?.email}</p>
    <section className="mt-5 rounded-xl border bg-white p-5 space-y-2">
      <p>Register number: {student.register_number}</p><p>College: {relationName(student.college)}</p>
      <p>Department: {relationName(student.department)} · Batch: {relationName(student.batch)}</p>
      <p>Student status: {student.status} · Account status: {profile?.status||'Unavailable'}</p>
    </section>
    {student.status==='ACTIVE'&&profile?.status==='ACTIVE'&&<details className="mt-5 rounded-xl border bg-white p-5"><summary className="cursor-pointer font-semibold">Assign department and batch</summary><StructureForm kind="placement" collegeId={student.college_id} record={{id:student.id,...placement.data}} departments={departments as any} batches={batches as any}/></details>}
    <h2 className="mt-7 text-xl font-semibold">Course progress</h2>
    <p className="mt-2 text-sm text-slate-600">{enrolments.count||0} enrolments. Percentages show recorded course completion, not assessment marks.</p>
    {!enrolments.data.length&&<p className="mt-4 rounded-xl border bg-white p-5">No courses enrolled yet. Ask the platform administrator to assign a college course.</p>}
    <div className="mt-4 space-y-4">{enrolments.data.map(e=>{const c=e.course as unknown as {title?:string;status?:string}|null;const percent=Number(e.completion_percentage);return <section key={e.id} className="rounded-xl border bg-white p-5">
      <h3 className="font-semibold">{c?.title||'Course unavailable'}</h3><p className="mt-2 text-sm">Enrolment: {e.status} · Course: {c?.status||'Unavailable'}</p>
      <p className="mt-3">{Number.isFinite(percent)?percent.toFixed(0)+'% completed':'Progress unavailable'}</p>
      {Number.isFinite(percent)&&<progress aria-label={`${c?.title||'Course'} completion`} max={100} value={Math.min(100,Math.max(0,percent))} className="mt-2 h-3 w-full"/>}
    </section>;})}</div>
    <nav aria-label="Course progress pages" className="mt-6 flex gap-5">{page>1&&<Link className="text-blue-700" href={`?page=${page-1}`}>Previous</Link>}<span>Page {page}</span>{page*25<(enrolments.count||0)&&<Link className="text-blue-700" href={`?page=${page+1}`}>Next</Link>}</nav>
  </div></main>;
}
