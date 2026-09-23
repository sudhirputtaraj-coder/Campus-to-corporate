import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import CertificateControls from './controls';
export default async function CertificatePage({params}:{params:Promise<{id:string}>}){
  const client=await createClient();const {data:{user}}=await client.auth.getUser();if(!user)redirect('/login');
  const {id}=await params;if(!z.string().uuid().safeParse(id).success)notFound();
  const student=await client.from('students').select('id').eq('user_id',user.id).maybeSingle();if(student.error)throw Error('Unable to load account.');if(!student.data)notFound();
  const {data:cert,error}=await client.from('certificates').select('id,certificate_number,recipient_name,course_title,issue_date,public_verification,verification_token').eq('id',id).eq('student_id',student.data.id).maybeSingle();
  if(error)throw Error('Certificate could not be loaded. Check migration 017.');if(!cert)notFound();
  return <main className="min-h-screen bg-slate-50 px-4 py-10 print:bg-white print:p-0"><div className="max-w-4xl mx-auto">
    <Link href="/student/certificates" className="print:hidden text-blue-700">Back to certificates</Link>
    <article className="mt-6 border-4 border-slate-800 bg-white p-8 text-center sm:p-14 print:mt-0 print:break-inside-avoid">
      <p className="text-xl font-semibold">Campus-to-Corporate</p><h1 className="mt-8 text-3xl font-bold">Certificate of Completion</h1>
      <p className="mt-8 text-slate-600">Awarded to</p><p className="mt-3 text-3xl font-semibold break-words">{cert.recipient_name}</p>
      <p className="mt-6 text-slate-600">For completing</p><h2 className="mt-3 text-2xl font-semibold break-words">{cert.course_title}</h2>
      <p className="mt-8">Issued {new Date(cert.issue_date).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kolkata'})}</p>
      <p className="mt-5 break-all text-xs text-slate-600">Certificate number: {cert.certificate_number}</p>
    </article><CertificateControls id={cert.id} enabled={cert.public_verification} token={cert.verification_token}/>
  </div></main>;
}
