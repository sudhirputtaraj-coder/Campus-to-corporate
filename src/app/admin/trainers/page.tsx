import Link from 'next/link';
import { requireProfessional } from '@/lib/professional/access';
import { ProfessionalForm } from '@/components/professional-form';

export default async function TrainerAccessPage() {
  const { client } = await requireProfessional(['SUPER_ADMIN']);
  const { data: colleges, error } = await client.from('colleges').select('id,name,code').eq('status', 'ACTIVE').order('name').limit(1000);
  return <main className="px-4 py-8"><div className="mx-auto max-w-2xl rounded-xl border bg-white p-6">
    <Link href="/admin/dashboard">Back to dashboard</Link>
    <h1 className="mt-4 text-2xl font-bold">Trainer Access</h1>
    <p className="mt-3">Approve a trainer for a college, then assign the batches they can support.</p>
    <p className="mt-3">The user must first register and confirm their email. After approval, they sign out and select Trainer on the login page using their existing password.</p>
    <p className="mt-3 text-sm">Accounts with existing student learning, purchases or college responsibilities need a separate transfer review. No learning history is deleted.</p>
    {error ? <p role="alert" className="mt-5">Colleges could not be loaded. Please try again.</p>
      : !colleges?.length ? <p className="mt-5">Add or activate a college in <Link href="/admin/colleges" className="underline">Manage Colleges</Link> before approving a trainer.</p>
        : <ProfessionalForm kind="setup">
          <input type="hidden" name="role" value="TRAINER" />
          <label>Registered trainer email<input name="email" type="email" required maxLength={254} /></label>
          <label>College<select name="college" required><option value="">Choose college</option>{colleges.map(college => <option key={college.id} value={college.id}>{college.name} ({college.code})</option>)}</select></label>
          <label className="flex gap-2"><input type="checkbox" name="confirm" required />I have verified this person and college and approve trainer access.</label>
        </ProfessionalForm>}
    {colleges?.length === 1000 && <p className="mt-3 text-sm">The first 1,000 active colleges are shown. Contact support if a college is missing.</p>}
    <Link href="/college/trainers" className="mt-6 inline-block rounded-lg px-4 py-3">Manage trainer assignments</Link>
  </div></main>;
}
