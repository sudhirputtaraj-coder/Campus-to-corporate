import Link from 'next/link';
import {redirect} from 'next/navigation';
import {collegeDirectoryAccess,collegeStudents,directoryPage,relationName} from '@/lib/college/student-directory';

export default async function CollegeStudents({searchParams}:{searchParams:Promise<{q?:string;page?:string}>}) {
  const access=await collegeDirectoryAccess();if(!access) redirect('/login');
  const params=await searchParams;const page=directoryPage(params.page);
  const q=(typeof params.q==='string'?params.q:'').trim().slice(0,80);
  let query=collegeStudents(access).order('register_number').order('id');
  if(q)query=query.ilike('register_number','%'+q.replace(/[\\%_]/g,'\\$&')+'%');
  const {data:students,count,error}=await query.range((page-1)*25,page*25-1);
  if(error)throw new Error('Unable to load students.');
  const names=new Map<string,{full_name:string;email:string;status:string}>();
  if(students.length){
    const profiles=await access.client.from('profiles').select('user_id,full_name,email,status').in('user_id',students.map(s=>s.user_id));
    if(profiles.error)throw new Error('Unable to load student details.');
    for(const p of profiles.data)names.set(p.user_id,p);
  }
  const url=(n:number)=>'/college/students?'+new URLSearchParams({q,page:String(n)});
  return <main className="min-h-screen bg-slate-50 px-4 py-10"><div className="max-w-5xl mx-auto">
    <Link href="/college/dashboard" className="text-blue-700">Back to college dashboard</Link>
    <h1 className="mt-5 text-2xl font-bold">Students and course progress</h1>
    <p className="mt-2 text-slate-600">View students in your assigned colleges. Open a student to see their enrolled courses and progress.</p>
    <form className="my-6 flex gap-3" action="/college/students">
      <label className="flex-1"><span className="sr-only">Search register number</span><input name="q" defaultValue={q} maxLength={80} placeholder="Search by register number" className="w-full rounded-lg border p-3"/></label>
      <button className="rounded-lg bg-slate-900 px-4 text-white">Search</button>{q&&<Link href="/college/students" className="self-center text-blue-700">Clear</Link>}
    </form>
    <p className="mb-4 text-sm text-slate-600">{count || 0} matching students</p>
    {!students.length&&<p className="rounded-xl border bg-white p-5">{access.collegeIds?.length===0?'No active college membership is assigned to your account. Contact the platform administrator.':'No students found. Students must first be assigned to your college by the platform administrator.'}</p>}
    <div className="grid gap-4 sm:grid-cols-2">{students.map(s=>{const p=names.get(s.user_id);return <section key={s.id} className="rounded-xl border bg-white p-5">
      <h2 className="font-semibold">{p?.full_name||'Profile unavailable'}</h2><p className="mt-1 text-sm">Register number: {s.register_number}</p>
      <p className="mt-1 text-sm text-slate-600">{relationName(s.college)}</p>
      <p className="mt-1 text-sm">Student: {s.status} · Account: {p?.status||'Unavailable'}</p>
      <Link href={`/college/students/${s.id}`} className="mt-4 inline-block text-blue-700 underline">View course progress</Link>
    </section>;})}</div>
    <nav aria-label="Student pages" className="mt-6 flex gap-5">{page>1&&<Link href={url(page-1)} className="text-blue-700">Previous</Link>}<span>Page {page}</span>{page*25<(count||0)&&<Link href={url(page+1)} className="text-blue-700">Next</Link>}</nav>
  </div></main>;
}
