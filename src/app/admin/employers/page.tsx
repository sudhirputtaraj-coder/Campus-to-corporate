import Link from 'next/link';
import { requireProfessional } from '@/lib/professional/access';
import { ProfessionalForm } from '@/components/professional-form';

export default async function EmployerAccessPage() {
  await requireProfessional(['SUPER_ADMIN']);
  return <main className="px-4 py-8"><div className="mx-auto max-w-2xl rounded-xl border bg-white p-6">
    <Link href="/admin/dashboard">Back to dashboard</Link>
    <h1 className="mt-4 text-2xl font-bold">Employer Access</h1>
    <p className="mt-3">Approve an employer account to view college-level employability scores, readiness percentages and student counts.</p>
    <p className="mt-3">The user must first register and confirm their email. After approval, they sign out and select Employer on the login page using their existing password.</p>
    <p className="mt-3 text-sm">Accounts with existing student learning, purchases or college responsibilities need a separate transfer review. No learning history is deleted.</p>
    <ProfessionalForm kind="setup">
      <input type="hidden" name="role" value="EMPLOYER" />
      <label>Registered employer email<input name="email" type="email" required maxLength={254} /></label>
      <label>Company name<input name="company" required minLength={2} maxLength={200} /></label>
      <label className="flex gap-2"><input type="checkbox" name="confirm" required />I have verified this person and company and approve employer access.</label>
    </ProfessionalForm>
  </div></main>;
}
