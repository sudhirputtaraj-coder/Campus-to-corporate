'use client';
import {useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {attachLessonAssessment} from '@/lib/skills/content-actions';
export default function AttachAssessment({lessonId,items}:{lessonId:string;items:{id:string;title:string}[]}){
 const [busy,start]=useTransition();const [message,setMessage]=useState('');const router=useRouter();
 return items.length ? <details className="mt-5 rounded-xl border p-4"><summary>Use an existing assessment</summary><p className="my-3 text-sm">A draft copy is attached to this lesson. Existing attempts and results remain with the original.</p><form onSubmit={e=>{e.preventDefault();const id=String(new FormData(e.currentTarget).get('assessment'));start(async()=>{try{const result=await attachLessonAssessment(id,lessonId);setMessage(result.error||'Draft copy added to this lesson.');if(!result.error)router.refresh();}catch{setMessage('Unable to attach assessment. Try again.');}});}}><label>Assessment<select name="assessment" className="m-2 rounded border p-2">{items.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></label><button disabled={busy} className="rounded border p-2">Add draft copy</button></form><p role="status">{message}</p></details>:null;
}
