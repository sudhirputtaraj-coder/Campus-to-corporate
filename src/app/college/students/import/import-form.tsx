'use client';
import {useState} from 'react';
import {previewPlacementImport,applyPlacementImport,PlacementImportInput,PlacementRow} from '@/lib/college/placement-import';
type Choice={id:string;name:string;department_id?:string|null};
export default function ImportForm({collegeId,departments,batches}:{collegeId:string;departments:Choice[];batches:Choice[]}){
  const [dept,setDept]=useState('');const [busy,setBusy]=useState(false);const [rows,setRows]=useState<PlacementRow[]>([]);const [input,setInput]=useState<PlacementImportInput|null>(null);const [error,setError]=useState('');const [done,setDone]=useState(false);const [confirmed,setConfirmed]=useState(false);
  const clear=()=>{setInput(null);setRows([]);setError('');setDone(false);setConfirmed(false);};
  return <><form className="mt-6 space-y-4" onChange={clear} onSubmit={async e=>{
    e.preventDefault();const form=new FormData(e.currentTarget);const file=form.get('csv') as File;clear();if(!file||!file.size||file.size>50000){setError('Choose a CSV file smaller than 50 KB.');return;}setBusy(true);
    try{const value={collegeId,departmentId:String(form.get('department')||''),batchId:String(form.get('batch')||''),csv:await file.text()};const r=await previewPlacementImport(value);setError(r.error||'');setRows(r.rows||[]);if(r.rows)setInput(value);}catch{setError('Unable to read or preview this file.');}finally{setBusy(false);}
  }}><fieldset disabled={busy} className="space-y-4">
    <label className="block">Department<select name="department" value={dept} onChange={e=>setDept(e.target.value)} className="mt-1 w-full rounded-lg border p-3"><option value="">No department</option>{departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
    <label className="block">Batch<select key={dept} name="batch" required className="mt-1 w-full rounded-lg border p-3"><option value="">Choose a batch</option>{batches.filter(b=>!b.department_id||b.department_id===dept).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
    <label className="block">CSV file<input name="csv" type="file" accept=".csv,text/csv" required className="mt-2 block w-full"/></label>
    <button className="rounded-lg bg-slate-900 px-4 py-2 text-white" disabled={busy}>{busy?'Working…':'Preview matches'}</button>
  </fieldset></form>
  {error&&<p role="alert" className="mt-4 text-red-700">{error}</p>}
  {!!rows.length&&<section className="mt-6"><h2 className="font-semibold">{done?'Import results':'Review matches'} — {rows.length} students</h2><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Register number</th><th className="p-2">Result</th></tr></thead><tbody>{rows.map(r=><tr key={r.register} className="border-t"><td className="p-2">{r.register}</td><td className={'p-2 '+(r.ready?'text-green-800':'text-red-700')}>{r.message}</td></tr>)}</tbody></table></div>
    {!done&&input&&rows.every(r=>r.ready)&&<div className="mt-4 space-y-3"><label className="flex gap-2"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={busy}/>Assign these students to the selected department and batch, replacing their current placement.</label><button disabled={busy||!confirmed} className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50" onClick={async()=>{setBusy(true);setError('');try{const r=await applyPlacementImport(input,confirmed);setError(r.error||'');if(r.rows)setRows(r.rows);setDone(!!r.applied);}catch{setError('Request interrupted. Check student placements before retrying.');}finally{setBusy(false);}}}>Confirm and apply</button></div>}
  </section>}</>;
}
