import Link from 'next/link';
import { requireProfessional,pageNumber } from '@/lib/professional/access';
import { ProfessionalForm } from '@/components/professional-form';
export default async function TrainersPage({searchParams}:{searchParams:Promise<{page?:string}>}){
 const {client,profile}=await requireProfessional(['SUPER_ADMIN','COLLEGE_ADMIN']);const page=pageNumber((await searchParams).page);
 const {data:trainers,count,error}=await client.from('trainers').select('id,user_id,college_id,status,college:colleges(name)',{count:'exact'}).order('id').range((page-1)*25,page*25-1);
 const ids=trainers?.map(t=>t.user_id)||[];
 const {data:names,error:nameError}=ids.length?await client.from('profiles').select('user_id,full_name,email').in('user_id',ids):{data:[],error:null};
 const {data:batches,error:batchError}=await client.from('batches').select('id,college_id,name,status').order('name').limit(1000);
 const trainerIds=trainers?.map(t=>t.id)||[];
 const {data:assignments,error:assignmentError}=trainerIds.length?await client.from('trainer_batch_assignments').select('trainer_id,batch_id,status').in('trainer_id',trainerIds).limit(1000):{data:[],error:null};
 return <main className="px-4 py-8"><div className="mx-auto max-w-4xl"><Link href={profile.role==='SUPER_ADMIN'?'/admin/dashboard':'/college/dashboard'}>Back to dashboard</Link><h1 className="mt-4 text-2xl font-bold">Trainer assignments</h1><p className="mt-2">Super Admin approves trainer accounts. College administrators assign their own college’s batches here. Set an assignment to Inactive to remove access.</p>
 {error||nameError||batchError||assignmentError?<p role="alert" className="mt-5">Trainer information could not be loaded.</p>:<>
 {!trainers?.length&&<p className="mt-5">No trainers found. Ask the Super Admin to approve a trainer account.</p>}
 {batches?.length===1000&&<p role="alert">Only the first 1,000 batches are shown. Contact support if a batch is missing.</p>}
 {trainers?.map(t=><section key={t.id} className="mt-5 rounded-xl border bg-white p-5"><h2 className="font-semibold">{names?.find(n=>n.user_id===t.user_id)?.full_name||'Trainer'} · {t.status}</h2><p>{names?.find(n=>n.user_id===t.user_id)?.email}</p>
 <ul className="mt-3">{assignments?.filter(a=>a.trainer_id===t.id).map(a=><li key={a.batch_id}>{batches?.find(b=>b.id===a.batch_id)?.name||'Batch'} · {a.status}</li>)}</ul>
 <ProfessionalForm kind="assignment"><input type="hidden" name="trainer" value={t.id}/><label>Batch<select name="batch" required><option value="">Choose batch</option>{batches?.filter(b=>b.college_id===t.college_id).map(b=><option key={b.id} value={b.id}>{b.name} · {b.status}</option>)}</select></label><label>Assignment<select name="status"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label></ProfessionalForm></section>)}
 <nav className="mt-5 flex gap-3">{page>1&&<Link href={`?page=${page-1}`}>Previous</Link>}<span>Page {page}</span>{page*25<(count||0)&&<Link href={`?page=${page+1}`}>Next</Link>}</nav>
 </> }</div></main>;
}
