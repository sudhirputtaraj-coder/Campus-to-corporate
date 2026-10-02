import Link from 'next/link';
import { requireProfessional } from '@/lib/professional/access';

// Preserve old bookmarks without keeping the combined setup form.
export default async function AccessPage() {
  await requireProfessional(['SUPER_ADMIN']);
  return <main className="mx-auto max-w-2xl px-4 py-8">
    <Link href="/admin/dashboard">Back to dashboard</Link>
    <h1 className="mt-4 text-2xl font-bold">Choose an access area</h1>
    <p className="mt-3">Employer and trainer accounts now have separate pages.</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <Link href="/admin/employers" className="rounded-xl border p-5">Employer Access</Link>
      <Link href="/admin/trainers" className="rounded-xl border p-5">Trainer Access</Link>
    </div>
  </main>;
}
