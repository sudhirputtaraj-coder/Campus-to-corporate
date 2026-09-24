import Link from 'next/link';
import { requireProfessional } from '@/lib/professional/access';
import { ProfessionalForm } from '@/components/professional-form';
import { logout } from '@/lib/auth/actions';

export default async function EmployerDashboard() {
  const { client, user } = await requireProfessional(['EMPLOYER']);
  const { data: company, error } = await client.from('employer_companies').select('*').eq('user_id', user.id).single();
  if (error || !company || company.status !== 'ACTIVE') return <main className="p-6"><h1 className="text-2xl font-bold">Employer access</h1><p className="mt-4">Company access is not available. Contact the platform administrator.</p><form action={logout}><button className="mt-4 rounded-lg p-3">Sign out</button></form></main>;
  return <main className="px-4 py-8"><div className="mx-auto max-w-5xl">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{company.name}</h1><form action={logout}><button className="rounded-lg p-3">Sign out</button></form></div>
    <section className="my-5 rounded-xl border bg-white p-5"><h2 className="text-xl font-semibold">College employability overview</h2><p className="mt-3">Compare the number and percentage of active students in each college who meet your chosen employability-score threshold. Only final measurements count towards readiness.</p><Link href="/employer/readiness" className="mt-5 inline-block rounded-lg px-4 py-3">Compare college readiness</Link></section>
    <details className="rounded-xl border bg-white p-5"><summary className="cursor-pointer font-semibold">Company profile</summary><ProfessionalForm kind="company"><label>Company name<input name="name" required maxLength={200} defaultValue={company.name}/></label><label>Website (optional, HTTPS)<input type="url" name="website" maxLength={2048} defaultValue={company.website || ''}/></label><label>About the company<textarea name="description" rows={4} maxLength={5000} defaultValue={company.description}/></label></ProfessionalForm></details>
  </div></main>;
}
