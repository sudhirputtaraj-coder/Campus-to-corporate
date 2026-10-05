import Link from 'next/link';
import BulkInvite from './bulk-invite';
import { redirect } from 'next/navigation';
import { collegeDirectoryAccess, directoryPage } from '@/lib/college/student-directory';
import { structureRows } from '@/lib/college/structure-data';
import { AddStudent, AccessChange, ShareJoinLink, type Placement } from './controls';

type Row = { id: string; kind: 'invitation' | 'student'; full_name: string; email: string; register_number: string; status: string; department: string | null; batch: string | null };

export default async function StudentAccess({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const access = await collegeDirectoryAccess(); if (!access) redirect('/login');
  const params = await searchParams;
  const colleges = (await structureRows(access, 'colleges')).filter(c => c.status === 'ACTIVE');
  const college = params.college_id ? colleges.find(c => c.id === params.college_id) : colleges[0];
  const query = (params.q || '').trim().slice(0, 100);
  const filter = ['all', 'pending', 'active', 'removed'].includes(params.status || '') ? params.status! : 'all';
  const page = directoryPage(params.page);
  const [departments, batches, result] = college ? await Promise.all([
    structureRows(access, 'departments', college.id), structureRows(access, 'batches', college.id),
    access.client.rpc('fn_college_student_access_list', { p_college_id: college.id, p_search: query, p_filter: filter, p_page: page }),
  ]) : [[], [], null];
  const data = result?.data as { rows: Row[]; total: number } | null;
  const pageUrl = (n: number) => `/college/students/access?${new URLSearchParams({ college_id: college!.id, q: query, status: filter, page: String(n) })}`;
  return <main className="min-h-screen bg-slate-50 px-4 py-8"><div className="mx-auto max-w-6xl">
    <Link href="/college/dashboard" className="text-sm text-blue-800 underline">College dashboard</Link>
    <div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold text-slate-900">Students & Access</h1><p className="mt-2 text-slate-600">Add students, help them join, and manage their access in one place.</p></div><ShareJoinLink /></div>
    <ol className="my-6 grid gap-3 text-sm sm:grid-cols-3"><li className="rounded-xl border bg-white p-4"><strong>1. Add student details</strong><p className="mt-2 text-slate-600">Upload a student list or paste emails. Review names, register numbers, department and batch before inviting.</p></li><li className="rounded-xl border bg-white p-4"><strong>2. Send invitations</strong><p className="mt-2 text-slate-600">Send the bulk email invitations, or share the join link manually. Students choose a password, verify their email and accept the invitation.</p></li><li className="rounded-xl border bg-white p-4"><strong>3. Start learning</strong><p className="mt-2 text-slate-600">Active courses assigned to this college are added when the student joins.</p></li></ol>
    {colleges.length > 1 && <form className="mb-6 flex flex-wrap gap-3"><label>College<select name="college_id" defaultValue={college?.id || ''} className="ml-3 rounded-lg border bg-white p-2">{colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button className="rounded-lg border bg-white px-4 py-2">Open college</button></form>}
    {!college ? <p role="alert" className="rounded-xl border bg-white p-5">No active assigned college selected. Ask the platform administrator to check your college membership.</p> : <>
      <h2 className="mb-4 text-lg font-semibold">{college.name}</h2>
      {result?.error || !data ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5">Student access could not be loaded. The platform administrator should apply migration 036, then refresh this page. If it is already applied, check your college access and try again.</p> : <>
        <BulkInvite key={`bulk-${college.id}`} collegeId={college.id} departments={departments.filter(d => d.status === 'ACTIVE') as Placement[]} batches={batches.filter(b => b.status === 'ACTIVE') as Placement[]} /><details className="rounded-xl border bg-white p-4"><summary className="cursor-pointer font-semibold">Add one student manually</summary><AddStudent key={college.id} collegeId={college.id} departments={departments.filter(d => d.status === 'ACTIVE') as Placement[]} batches={batches.filter(b => b.status === 'ACTIVE') as Placement[]} /></details>
        <section className="mt-8" aria-labelledby="student-list-title"><h2 id="student-list-title" className="text-xl font-semibold">Your students <span className="font-normal text-slate-500">({data.total} matching)</span></h2>
          <form className="my-4 flex flex-wrap items-end gap-3"><input type="hidden" name="college_id" value={college.id} /><label className="min-w-0 flex-1 text-sm font-medium">Find a student<input name="q" maxLength={100} defaultValue={query} placeholder="Name, email or register number" className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5" /></label><label className="text-sm font-medium">Status<select name="status" defaultValue={filter} className="mt-1 block rounded-lg border bg-white px-3 py-2.5"><option value="all">All students</option><option value="pending">Waiting to join</option><option value="active">Active</option><option value="removed">Access removed</option></select></label><button className="rounded-lg bg-slate-900 px-4 py-2.5 text-white">Search</button><Link className="px-2 py-2.5 text-sm text-blue-800 underline" href={`/college/students/access?college_id=${college.id}`}>Clear</Link></form>
          <div className="grid gap-4 lg:grid-cols-2">{data.rows.map(row => <article key={`${row.kind}-${row.id}`} className="rounded-xl border bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-semibold">{row.full_name}</h3><span className={`rounded-full px-3 py-1 text-xs font-medium ${row.status === 'ACTIVE' ? 'bg-green-100 text-green-900' : row.status === 'PENDING' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'}`}>{row.status === 'PENDING' ? 'Waiting to join' : row.status === 'INACTIVE' ? 'Access removed' : row.status === 'ACTIVE' ? 'Active' : 'Account restricted'}</span></div>
            <p className="mt-2 break-all text-sm">{row.email}</p><p className="mt-1 text-sm text-slate-600">Register: {row.register_number}</p><p className="mt-1 text-sm text-slate-600">{row.department || 'Department not assigned'} · {row.batch || 'Batch not assigned'}</p>
            {row.kind === 'invitation' ? <div className="mt-4"><ShareJoinLink email={row.email} /><AccessChange collegeId={college.id} id={row.id} name={row.full_name} action="cancel" /></div> : <><Link className="mt-4 inline-block text-sm text-blue-800 underline" href={`/college/students/${row.id}`}>View profile, progress & placement</Link>{['ACTIVE', 'INACTIVE'].includes(row.status) ? <AccessChange collegeId={college.id} id={row.id} name={row.full_name} action={row.status === 'ACTIVE' ? 'remove' : 'restore'} /> : <p className="mt-3 text-sm text-slate-600">Contact the platform administrator to review this restriction.</p>}</>}
          </article>)}</div>
          {!data.rows.length && <p className="rounded-xl border border-dashed p-8 text-center text-slate-600">{query || filter !== 'all' ? 'No students match these filters. Clear the search or choose All students.' : 'No students yet. Add your first student above and share their joining instructions.'}</p>}
          <nav aria-label="Student access pages" className="mt-5 flex items-center gap-4">{page > 1 && <Link className="text-blue-800 underline" href={pageUrl(page - 1)}>Previous</Link>}<span className="text-sm">Page {page} · 25 per page</span>{page * 25 < data.total && <Link className="text-blue-800 underline" href={pageUrl(page + 1)}>Next</Link>}</nav>
        </section>
      </>}
      <section className="mt-8 rounded-xl border bg-white p-5"><h2 className="font-semibold">Need to make a change?</h2><p className="mt-2 text-sm leading-6 text-slate-600">For an incorrect pending email or register number, cancel the invitation and add it again. After a student joins, open their profile to change department or batch. Removing access keeps their learning history. Students reset their own password from the sign-in page.</p><div className="mt-3 flex flex-wrap gap-4 text-sm text-blue-800 underline"><Link href="/college/departments">Manage departments</Link><Link href="/college/batches">Manage batches</Link><Link href="/college/courses">Check course enrolments</Link><Link href="/college/students">View student performance</Link></div></section>
    </>}
  </div></main>;
}
