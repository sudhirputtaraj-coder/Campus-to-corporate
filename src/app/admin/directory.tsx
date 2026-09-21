import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/require-admin';
import ManagementForm from './management-forms';

export default async function Directory({ kind, params }: { kind: 'college' | 'user'; params: { q?: string; page?: string } }) {
  const auth = await requireAdmin().catch(() => null);
  if (!auth) redirect('/login');
  const title = kind === 'college' ? 'Colleges' : 'Users';
  const base = kind === 'college' ? '/admin/colleges' : '/admin/users';
  const q = (typeof params.q === 'string' ? params.q : '').trim().slice(0, 100);
  const page = Math.max(1, Math.min(100000, Number.parseInt(params.page || '1', 10) || 1));
  let query = kind === 'college'
    ? auth.client.from('colleges').select('id,name,code,city,state,address,contact_person,contact_email,contact_phone,status', { count: 'exact' }).order('name').order('id')
    : auth.client.from('profiles').select('user_id,full_name,email,phone,role,status', { count: 'exact' }).order('full_name').order('user_id');
  // Single filter keeps user punctuation out of PostgREST OR expressions.
  if (q) query = query.ilike(kind === 'college' ? 'name' : q.includes('@') ? 'email' : 'full_name', '%' + q.replace(/[\\%_]/g, '\\$&') + '%');
  const { data, count, error } = await query.range((page - 1) * 25, page * 25 - 1);
  const link = (n: number) => `${base}?${new URLSearchParams({ q, page: String(n) })}`;
  return <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900"><div className="max-w-4xl mx-auto">
    <Link href="/admin/dashboard" className="text-blue-700">Back to dashboard</Link>
    <h1 className="mt-5 text-2xl font-bold">Manage {title}</h1>
    <p className="mt-2 text-slate-600">{kind === 'college' ? 'Add participating colleges and maintain their contact details and status.' : 'Find registered accounts, update contact details and manage sign-in status.'}</p>
    {kind === 'college' ? <details className="mt-6 rounded-xl border bg-white p-5"><summary className="cursor-pointer font-semibold">Add college</summary><ManagementForm kind="college" /></details>
      : <p className="mt-3 text-sm text-slate-600">New users register through the platform. Open a user to edit their details or set up college access.</p>}
    <form action={base} className="my-6 flex gap-3">
      <label className="flex-1"><span className="sr-only">Search {title}</span><input name="q" defaultValue={q} maxLength={100} placeholder={kind === 'college' ? 'Search by college name' : 'Search by name or full email address'} className="w-full rounded-lg border p-3" /></label>
      <button className="rounded-lg bg-slate-900 px-4 text-white">Search</button>
      {q && <Link href={base} className="self-center text-blue-700">Clear</Link>}
    </form>
    {error ? <p role="alert" className="text-red-700">Unable to load {title.toLowerCase()}. Please reload the page.</p> : <>
      <p className="mb-4 text-sm text-slate-600">{count || 0} matching {title.toLowerCase()}</p>
      {!data?.length && <p className="rounded-xl border bg-white p-5">No {title.toLowerCase()} found{q ? ' for this search' : ''}.</p>}
      <div className="space-y-4">{data?.map(row => {
        const record = row as unknown as Record<string, string | null>;
        return <details key={record.id || record.user_id} className="rounded-xl border bg-white p-5">
          <summary className="cursor-pointer"><span className="font-semibold">{record.name || record.full_name}</span><span className="ml-3 text-sm text-slate-600">{record.status}</span>
            <span className="mt-1 block break-all text-sm text-slate-600">{kind === 'college' ? record.code : `${record.email} · ${record.role?.replaceAll('_', ' ')}`}</span>
          </summary>
          {record.role === 'SUPER_ADMIN' ? <p className="mt-4 text-sm">Super Admin accounts are protected here. To change your own sign-in email, use <Link href="/admin/account" className="text-blue-700 underline">Account Settings</Link>.</p> : <ManagementForm kind={kind} record={record} />}
          {kind==='user' && ['STUDENT','COLLEGE_ADMIN'].includes(record.role || '') && <Link href={`/admin/users/${record.user_id}/college`} className="mt-5 inline-block text-blue-700 underline">Set up college access</Link>}
          {kind==='college' && <Link href={`/admin/colleges/${record.id}/courses`} className="mt-5 inline-block text-blue-700 underline">Manage course enrolment</Link>}
        </details>;
      })}</div>
      <nav aria-label="Directory pages" className="mt-6 flex gap-5">
        {page > 1 && <Link href={link(page - 1)} className="text-blue-700">Previous</Link>}
        <span>Page {page}</span>
        {page * 25 < (count || 0) && <Link href={link(page + 1)} className="text-blue-700">Next</Link>}
      </nav>
    </>}
  </div></main>;
}
