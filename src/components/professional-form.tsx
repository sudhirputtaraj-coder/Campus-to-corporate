'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { professionalAction } from '@/lib/professional/actions';
export function ProfessionalForm({kind,children}:{kind:string;children:React.ReactNode}) {
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const router=useRouter();
  return <form className="professional-form mt-5 space-y-4" onSubmit={async event=>{
    event.preventDefault();const form=event.currentTarget;const data=new FormData(form);setBusy(true);setMessage('');
    try{const result=await professionalAction(kind,data);setMessage(result.error||'Saved successfully.');if(!result.error){router.refresh();}}
    catch{setMessage('Unable to save. Please try again.');}finally{setBusy(false);}
  }}><fieldset disabled={busy} className="space-y-4">{children}<button className="rounded-lg px-5 py-3" type="submit">{busy?'Saving…':'Save'}</button></fieldset>{message&&<p role="status">{message}</p>}</form>;
}
