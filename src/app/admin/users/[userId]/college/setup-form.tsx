'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setupCollegeAccount } from '@/lib/admin/college-setup';

export default function SetupForm({userId,colleges,currentRole,collegeId,registerNumber}:{userId:string;colleges:{id:string;name:string;code:string}[];currentRole:string;collegeId:string;registerNumber:string}) {
  const [kind,setKind]=useState(currentRole==='COLLEGE_ADMIN'?'COLLEGE_ADMIN':'COLLEGE_STUDENT');
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState<{error?:string;success?:boolean}>({});
  const router=useRouter();
  const style='mt-1 w-full rounded-lg border p-3';
  return <form className="mt-6 space-y-4" onSubmit={async event=>{
    event.preventDefault(); const form=event.currentTarget; const values=new FormData(form);
    setBusy(true);setResult({});
    try {const response=await setupCollegeAccount(values);setResult(response);if(response.success) router.refresh();}
    catch {setResult({error:'Unable to save. Please try again.'});} finally {setBusy(false);}
  }}>
    <input type="hidden" name="user_id" value={userId}/>
    <fieldset disabled={busy} className="space-y-4">
      <label className="block">Account type<select name="kind" value={kind} onChange={e=>setKind(e.target.value)} className={style}>
        {currentRole!=='COLLEGE_ADMIN' && <option value="COLLEGE_STUDENT">College student</option>}
        <option value="COLLEGE_ADMIN">College administrator</option>
      </select></label>
      <label className="block">College<select name="college_id" required defaultValue={collegeId} className={style}>
        <option value="">Choose a college</option>{colleges.map(c=><option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
      </select></label>
      {kind==='COLLEGE_STUDENT'?<label className="block">Student register number<input name="register_number" required maxLength={80} defaultValue={collegeId?registerNumber:''} className={style}/></label>:<input name="register_number" type="hidden" value=""/>}
      <p className="text-sm text-slate-600">{kind==='COLLEGE_ADMIN'?'This grants administrator access to the selected college.':'This places the student under the selected college. Course enrolment is managed separately.'} Existing learning or payment activity may require a separate transfer review.</p>
      <label className="flex items-start gap-2"><input key={kind} type="checkbox" name="confirmed" value="yes" required className="mt-1"/>I have checked this user, college and account type and want to grant this access.</label>
      <button className="rounded-lg bg-slate-900 px-5 py-3 text-white disabled:opacity-50" disabled={busy}>{busy?'Saving…':'Save college access'}</button>
    </fieldset>
    {result.error&&<p role="alert" className="text-red-700">{result.error}</p>}
    {result.success&&<p role="status" className="text-green-800">College access saved. The user can sign out and sign in through the matching college option.</p>}
  </form>;
}
