import Link from 'next/link';
export default function EmailLinkError(){return <main className="min-h-screen bg-slate-50 px-4 py-12"><div className="max-w-lg mx-auto rounded-xl border bg-white p-6">
  <h1 className="text-2xl font-bold">This email link could not be completed</h1>
  <p className="mt-4 text-slate-600">It may have expired, already been used, or been opened in a different browser. Open the latest email in the same browser where you requested it.</p>
  <div className="mt-6 flex flex-wrap gap-4"><Link href="/forgot-password" className="text-blue-700 underline">Request a new password reset</Link><Link href="/login" className="text-blue-700 underline">Back to sign in</Link></div>
  <p className="mt-5 text-sm text-slate-600">For account confirmation problems, contact the platform administrator.</p>
</div></main>;}
