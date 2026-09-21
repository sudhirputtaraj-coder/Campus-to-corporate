import Link from 'next/link';
import {redirect} from 'next/navigation';
import {collegeDirectoryAccess} from '@/lib/college/student-directory';
import {structureRows} from '@/lib/college/structure-data';
import StructureForm from './structure-form';

export default async function StructurePage({kind,collegeId}:{kind:'department'|'batch';collegeId?:string}) {
  const access=await collegeDirectoryAccess();if(!access)redirect('/login');
  const colleges=await structureRows(access,'colleges');const college=colleges.find(c=>c.id===collegeId)||(collegeId?null:colleges[0]);
  const [rows,depts]=college?await Promise.all([structureRows(access,kind==='department'?'departments':'batches',college.id),structureRows(access,'departments',college.id)]):[[],[]];
  const title=kind==='department'?'Departments':'Batches';
  return <main className="min-h-screen bg-slate-50 px-4 py-10"><div className="max-w-3xl mx-auto">
    <Link href="/college/dashboard" className="text-blue-700">Back to dashboard</Link><h1 className="mt-5 text-2xl font-bold">{title}</h1>
    <form className="my-5 flex gap-3"><label className="flex-1">College<select name="college_id" defaultValue={college?.id||''} className="ml-3 rounded-lg border p-2"><option value="">Select college</option>{colleges.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button className="rounded-lg border px-4">Open</button></form>
    {!college?<p>Select one of your assigned colleges.</p>:<>
      {college.status==='ACTIVE'?<details className="rounded-xl border bg-white p-5"><summary className="cursor-pointer font-semibold">Add {kind}</summary><StructureForm key={college.id} kind={kind} collegeId={college.id} departments={depts as any}/></details>:<p>This college is inactive. Contact the platform administrator to enable changes.</p>}
      <p className="my-4 text-sm text-slate-600">{rows.length} {title.toLowerCase()}. Open a record to edit it. Inactive records remain available for history.</p>
      <div className="space-y-4">{rows.map(row=><details key={row.id} className="rounded-xl border bg-white p-5"><summary className="cursor-pointer font-medium">{row.name} · {row.code||row.academic_year||''} · {row.status}</summary>{college.status==='ACTIVE'&&<StructureForm key={row.id} kind={kind} collegeId={college.id} record={row} departments={depts as any}/>}</details>)}</div>
      <p className="mt-5">Assign students through <Link href="/college/students" className="text-blue-700 underline">Students & Progress</Link>, then use <Link href="/college/courses" className="text-blue-700 underline">Courses / Enroll</Link> to enrol a batch.</p>
    </>}
  </div></main>;
}
