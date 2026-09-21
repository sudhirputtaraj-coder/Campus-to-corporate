import Link from 'next/link';
import {redirect,notFound} from 'next/navigation';
import {z} from 'zod';
import {requireAdmin} from '@/lib/admin/require-admin';
import EnrolForm from './enrol-form';

export default async function CollegeCourses({params}:{params:Promise<{collegeId:string}>}) {
  const auth=await requireAdmin().catch(()=>null);if(!auth) redirect('/login');
  const {collegeId}=await params;if(!z.string().uuid().safeParse(collegeId).success) notFound();
  const {data:college,error}=await auth.client.from('colleges').select('id,name,code,status').eq('id',collegeId).maybeSingle();
  if(error) throw Error('Unable to load college. Please try again.');if(!college) notFound();
  const courses:{id:string;title:string}[]=[];
  for(let start=0;;start+=500){
    const r=await auth.client.from('courses').select('id,title').eq('status','ACTIVE').order('title').order('id').range(start,start+499);
    if(r.error) throw Error('Unable to load courses.');courses.push(...r.data);if(r.data.length<500) break;
  }
  const assignments:{course_id:string;course:unknown}[]=[];let assignmentError=false;
  for(let start=0;;start+=500){
    const r=await auth.client.from('college_courses').select('course_id,course:courses(title,status)').eq('college_id',collegeId).order('assigned_at').order('course_id').range(start,start+499);
    if(r.error){assignmentError=true;break;}assignments.push(...r.data);if(r.data.length<500) break;
  }
  return <main className="min-h-screen bg-slate-50 px-4 py-10"><div className="max-w-2xl mx-auto rounded-xl border bg-white p-6">
    <Link href="/admin/colleges" className="text-blue-700">Back to colleges</Link>
    <h1 className="mt-5 text-2xl font-bold">College courses</h1>
    <p className="mt-3 font-medium">{college.name} ({college.code})</p>
    {assignmentError?<p role="alert" className="mt-5 text-red-700">Course assignments could not be loaded. Apply migration 014 if not yet installed, then reload.</p>:<>
      {college.status!=='ACTIVE'?<p className="mt-5">Activate this college in Manage Colleges before assigning courses.</p>:courses.length?<EnrolForm collegeId={collegeId} courses={courses}/>:<p className="mt-5">First create an active course in <Link href="/admin/courses" className="text-blue-700 underline">Manage Courses</Link>.</p>}
      <h2 className="mt-8 text-lg font-semibold">Assigned courses</h2>
      {!assignments.length?<p className="mt-3 text-slate-600">No courses assigned through college enrolment yet.</p>:<ul className="mt-3 divide-y">{assignments.map(a=>{const c=a.course as {title?:string;status?:string}|null;return <li key={a.course_id} className="py-3">{c?.title||'Course unavailable'} <span className="text-sm text-slate-500">{c?.status}</span></li>;})}</ul>}
      <p className="mt-4 text-sm text-slate-600">Students will find enrolled courses under My Learning. Existing individual enrolments made outside this page are retained.</p>
    </>}
  </div></main>;
}
