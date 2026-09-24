import Link from 'next/link';
import { requireProfessional,pageNumber } from '@/lib/professional/access';
export default async function BatchPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{page?:string}>}){
 const {client}=await requireProfessional(['TRAINER']);const {id}=await params;const page=pageNumber((await searchParams).page);
 const {data,error}=await client.rpc('fn_trainer_batch_progress',{p_batch_id:id,p_page:page});
 return <main className="px-4 py-8"><div className="mx-auto max-w-4xl"><Link href="/trainer/dashboard">Back to my batches</Link><h1 className="mt-4 text-2xl font-bold">Batch learning progress</h1>
 {error?<p role="alert" className="mt-5">This batch is unavailable. Check your active assignment with your college administrator.</p>:<><p className="mt-3">{data?.total||0} active students. Course progress is an average across each student’s active and completed course enrolments.</p><div className="mt-5 grid gap-4 sm:grid-cols-2">{data?.students?.map((s:any)=><section key={s.id} className="rounded-xl border bg-white p-5"><h2 className="font-semibold">{s.full_name}</h2><p>{s.register_number}</p><p className="mt-3">Courses: {s.course_count}</p><p>Average progress: {s.average_progress==null?'No enrolled courses':`${s.average_progress}%`}</p><p>Graded attempts: {s.graded_attempts}</p></section>)}</div><nav className="mt-5 flex gap-3">{page>1&&<Link href={`?page=${page-1}`}>Previous</Link>}<span>Page {page}</span>{page*25<(data?.total||0)&&<Link href={`?page=${page+1}`}>Next</Link>}</nav></>}
 </div></main>;
}
