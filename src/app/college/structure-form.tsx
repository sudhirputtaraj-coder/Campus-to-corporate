'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {saveCollegeStructure} from '@/lib/college/structure-actions';
type Option={id:string;name:string;status:string;department_id?:string|null};
export default function StructureForm({kind,collegeId,record={},departments=[],batches=[]}:{kind:'department'|'batch'|'placement';collegeId:string;record?:Record<string,string|null>;departments?:Option[];batches?:Option[]}) {
  const [dept,setDept]=useState(record.department_id||'');const [busy,setBusy]=useState(false);const [result,setResult]=useState<{error?:string;success?:boolean}>({});const router=useRouter();
  const css='mt-1 w-full rounded-lg border p-2';
  return <form className="mt-4 space-y-3" onSubmit={async event=>{event.preventDefault();const form=event.currentTarget;const values=new FormData(form);setBusy(true);setResult({});try{const r=await saveCollegeStructure(values);setResult(r);if(r.success){if(!record.id){form.reset();setDept('');}router.refresh();}}catch{setResult({error:'Unable to save. Please try again.'});}finally{setBusy(false);}}}>
    <input type="hidden" name="college_id" value={collegeId}/><input type="hidden" name="kind" value={kind}/><input type="hidden" name="id" value={record.id||''}/>
    <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
      {kind!=='placement'&&<><label>Name<input name="name" required maxLength={200} defaultValue={record.name||''} className={css}/></label><label>Status<select name="status" defaultValue={record.status||'ACTIVE'} className={css}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label></>}
      {kind==='department'&&<label>Department code<input name="code" required pattern="[A-Za-z0-9_-]+" maxLength={40} defaultValue={record.code||''} className={css}/></label>}
      {kind!=='department'&&<label>Department<select name="department_id" value={dept} onChange={e=>setDept(e.target.value)} className={css} disabled={kind==='batch'&&!!record.id}><option value="">No department</option>{departments.filter(d=>d.status==='ACTIVE'||d.id===dept).map(d=><option key={d.id} value={d.id}>{d.name}{d.status!=='ACTIVE'?' (Inactive)':''}</option>)}</select>{kind==='batch'&&record.id&&<input type="hidden" name="department_id" value={dept}/>}</label>}
      {kind==='batch'&&<label>Academic year<input name="academic_year" maxLength={40} placeholder="2026–2027" defaultValue={record.academic_year||''} className={css}/></label>}
      {kind==='placement'&&<label>Batch<select key={dept} name="batch_id" defaultValue={dept===(record.department_id||'')?record.batch_id||'':''} className={css}><option value="">No batch</option>{batches.filter(b=>b.status==='ACTIVE'&&(!b.department_id||b.department_id===dept)).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
    </fieldset>
    {kind==='placement'&&<p className="text-sm text-slate-600">Changes apply to future batch enrolment. Existing course enrolments and progress are retained.</p>}
    {result.error&&<p role="alert" className="text-red-700">{result.error}</p>}{result.success&&<p role="status" className="text-green-800">Saved successfully.</p>}
    <button disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50">{busy?'Saving…':'Save'}</button>
  </form>;
}
