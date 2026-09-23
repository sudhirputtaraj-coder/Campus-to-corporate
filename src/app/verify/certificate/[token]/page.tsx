import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};
export default async function VerifyCertificate({params}:{params:Promise<{token:string}>}){
  const {token}=await params;let certificate:null|{certificate_number:string;recipient_name:string;course_title:string;issue_date:string}=null;let failed=false;
  if(z.string().uuid().safeParse(token).success){const client=await createClient();const {data,error}=await client.rpc('fn_verify_certificate',{p_token:token});failed=!!error;certificate=data?.[0]||null;}
  return <main className="min-h-screen bg-slate-50 px-4 py-12"><article className="max-w-xl mx-auto rounded-xl border bg-white p-8">
    <p className="font-semibold">Campus-to-Corporate</p><h1 className="mt-5 text-2xl font-bold">Certificate verification</h1>
    {failed?<p role="alert" className="mt-5">Verification is temporarily unavailable. Please try again later.</p>:certificate?<>
      <p className="mt-5 font-semibold text-green-800">Certificate record verified</p><dl className="mt-5 space-y-3"><div><dt className="text-sm text-slate-500">Recipient</dt><dd>{certificate.recipient_name}</dd></div><div><dt className="text-sm text-slate-500">Course</dt><dd>{certificate.course_title}</dd></div><div><dt className="text-sm text-slate-500">Certificate number</dt><dd className="break-all">{certificate.certificate_number}</dd></div><div><dt className="text-sm text-slate-500">Issued</dt><dd>{new Date(certificate.issue_date).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'})}</dd></div></dl>
    </>:<p className="mt-5">This certificate is unavailable or public verification has been turned off. Ask the holder for an enabled verification link.</p>}
  </article></main>;
}
