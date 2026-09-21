import Link from 'next/link';
import {redirect} from 'next/navigation';
import {collegeDirectoryAccess} from '@/lib/college/student-directory';
import {structureRows} from '@/lib/college/structure-data';
import ImportForm from './import-form';
export default async function PlacementImport({searchParams}:{searchParams:Promise<{college_id?:string}>}){
  const access=await collegeDirectoryAccess();if(!access)redirect('/login');const colleges=(await structureRows(access,'colleges')).filter(c=>c.status==='ACTIVE');
  const {college_id}=await searchParams;const college=colleges.find(c=>c.id===college_id)||(college_id?null:colleges[0]);
  const [departments,batches]=college?await Promise.all([structureRows(access,'departments',college.id),structureRows(access,'batches',college.id)]):[[],[]];
  return <main className="min-h-screen bg-slate-50 px-4 py-10"><div className="max-w-3xl mx-auto rounded-xl border bg-white p-6"><Link href="/college/dashboard" className="text-blue-700">Back to dashboard</Link><h1 className="mt-5 text-2xl font-bold">CSV student placement</h1>
    <p className="mt-3 text-slate-600">Assign existing college students to a department and batch. Students must already have registered accounts and belong to this college. This does not create accounts or send emails.</p><p className="mt-3 text-sm">Use one column named <code>register_number</code>, with up to 100 students. Keep leading zeros when editing in a spreadsheet. Existing course enrolments and progress are preserved.</p>
    <a href="/templates/student-placement.csv" download className="mt-3 inline-block text-blue-700 underline">Download CSV template</a>
    <form className="mt-5 flex gap-2"><label className="flex-1">College<select name="college_id" defaultValue={college?.id||''} className="ml-2 rounded-lg border p-2">{colleges.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button className="rounded-lg border px-3">Open</button></form>
    {college?<ImportForm key={college.id} collegeId={college.id} departments={departments.filter(d=>d.status==='ACTIVE') as any} batches={batches.filter(b=>b.status==='ACTIVE') as any}/>:<p className="mt-5">Select an active college assigned to your account.</p>}
  </div></main>;
}
