'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {setCertificateSharing} from '@/lib/learning/certificate-actions';
export default function CertificateControls({id,enabled,token}:{id:string;enabled:boolean;token:string}){
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const router=useRouter();
  return <section className="print:hidden mt-6 rounded-xl border bg-white p-5">
    <button onClick={()=>window.print()} className="rounded-lg bg-slate-900 px-4 py-2 text-white">Print / Save as PDF</button>
    <p className="mt-4 text-sm text-slate-600">Public verification reveals your name, course, certificate number and issue date to anyone with the link. You can turn it off later.</p>
    <button disabled={busy} className="mt-3 rounded-lg border px-4 py-2 disabled:opacity-50" onClick={async()=>{setBusy(true);setError('');try{const r=await setCertificateSharing(id,!enabled);if(r.error)setError(r.error);else router.refresh();}catch{setError('Unable to update sharing.');}finally{setBusy(false);}}}>{busy?'Saving…':enabled?'Turn off public verification':'Enable public verification'}</button>
    {enabled&&<p className="mt-3"><a className="text-blue-700 underline" href={`/verify/certificate/${token}`} target="_blank" rel="noopener noreferrer">Open verification page to share its link</a></p>}
    {error&&<p role="alert" className="mt-3 text-red-700">{error}</p>}
  </section>;
}
