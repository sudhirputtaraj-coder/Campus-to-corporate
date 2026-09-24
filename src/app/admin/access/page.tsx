import Link from 'next/link';
import { requireProfessional } from '@/lib/professional/access';
import { ProfessionalForm } from '@/components/professional-form';
export default async function AccessPage(){
 const {client}=await requireProfessional(['SUPER_ADMIN']);
 const {data:colleges,error}=await client.from('colleges').select('id,name,code').eq('status','ACTIVE').order('name').limit(1000);
 return <main className="px-4 py-8"><div className="mx-auto max-w-2xl rounded-xl border bg-white p-6"><Link href="/admin/dashboard">Back to dashboard</Link><h1 className="mt-4 text-2xl font-bold">Employer and trainer access</h1>
 <p className="mt-3">The user first registers and confirms their email. Approve their employer company or trainer college here. They then sign out and use the matching login option with their existing password.</p>
 <p className="mt-3 text-sm">Accounts with existing student learning, purchases or college responsibilities need a separate transfer review. No learning history is deleted.</p>
 {error?<p role="alert">Colleges could not be loaded.</p>:<ProfessionalForm kind="setup">
 <label>Registered email<input name="email" type="email" required maxLength={254}/></label>
 <label>Account type<select name="role"><option value="TRAINER">Trainer</option><option value="EMPLOYER">Employer</option></select></label>
 <label>College (trainers only)<select name="college"><option value="">Choose college</option>{colleges?.map(c=><option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}</select></label>
 <label>Company name (employers only)<input name="company" maxLength={200}/></label>
 <label className="flex gap-2"><input type="checkbox" name="confirm" required/>I have verified this person and approve this access.</label>
 </ProfessionalForm>}
 <Link href="/college/trainers" className="mt-6 inline-block rounded-lg px-4 py-3">Manage trainer assignments</Link>
 </div></main>;
}
