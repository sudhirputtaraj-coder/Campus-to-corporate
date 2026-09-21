'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {enrolCollegeCourse} from '@/lib/admin/college-courses';

export default function EnrolForm({collegeId,courses}:{collegeId:string;courses:{id:string;title:string}[]}) {
  const [busy,setBusy]=useState(false);
  const [course,setCourse]=useState('');
  const [result,setResult]=useState<{error?:string;success?:boolean;eligible?:number;added?:number;existing?:number}>({});
  const router=useRouter();
  return <form className="mt-6 space-y-4" onSubmit={async event=>{
    event.preventDefault();const values=new FormData(event.currentTarget);setBusy(true);setResult({});
    try {const response=await enrolCollegeCourse(values);setResult(response);if('success' in response && response.success) router.refresh();}
    catch {setResult({error:'Unable to complete the request. Please try again.'});}finally{setBusy(false);}
  }}>
    <input type="hidden" name="college_id" value={collegeId}/>
    <fieldset disabled={busy} className="space-y-4">
      <label className="block font-medium">Course<select name="course_id" required value={course} onChange={e=>{setCourse(e.target.value);setResult({});}} className="mt-2 w-full rounded-lg border p-3">
        <option value="">Choose an active course</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
      </select></label>
      <p className="text-sm text-slate-600">Assigns this course to the college and enrols its currently active students. Existing enrolments, progress and completion records stay unchanged. Run this again after new students join.</p>
      <label className="flex gap-2"><input key={course} type="checkbox" name="confirmed" value="yes" required className="mt-1"/>Enrol all currently active students in this college in the selected course.</label>
      <button disabled={busy} className="rounded-lg bg-slate-900 px-5 py-3 text-white disabled:opacity-50">{busy?'Enrolling…':'Assign course and enrol students'}</button>
    </fieldset>
    {result.error&&<p role="alert" className="text-red-700">{result.error}</p>}
    {result.success&&<p role="status" className="text-green-800">Course assigned. {result.added} new enrolments; {result.existing} existing enrolments kept unchanged. {result.eligible} active students checked.</p>}
  </form>;
}
