'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GraduationCap, Loader2, UserRound, Building2, BriefcaseBusiness, ShieldCheck, Presentation } from 'lucide-react';
import { LOGIN_PORTALS, type LoginPortal } from '@/lib/auth/portals';
import { signInToPortal } from '@/lib/auth/portal-login';

const icons = {
  individual: UserRound,
  'college-student': GraduationCap,
  'college-admin': Building2,
  employer: BriefcaseBusiness,
  trainer: Presentation,
  'super-admin': ShieldCheck,
};

export default function LoginPage() {
  const [portal, setPortal] = useState<LoginPortal | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const selected = LOGIN_PORTALS.find(item => item.id === portal);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!portal || loading) return;
    setError(null);
    setLoading(true);
    const data = new FormData();
    data.set('portal', portal);
    data.set('email', email);
    data.set('password', password);
    try {
      const result = await signInToPortal(data);
      setError(result.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-2 font-semibold text-slate-900">
          <GraduationCap className="h-6 w-6" /> Campus-to-Corporate
        </Link>
        <div className="mb-8 mt-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Welcome back</h1>
          <p className="mt-3 text-slate-600">Choose your account type to sign in.</p>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <section aria-label="Account type" className="grid gap-3 sm:grid-cols-2">
            {LOGIN_PORTALS.map(item => {
              const Icon = icons[item.id];
              const active = portal === item.id;
              return <button key={item.id} type="button" aria-pressed={active} disabled={loading}
                onClick={() => { setPortal(item.id); setError(null); setPassword(''); }}
                className={`rounded-xl border p-5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60 ${active ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                <Icon className={`mb-3 h-6 w-6 ${active ? 'text-blue-700' : 'text-slate-600'}`} />
                <span className="block font-semibold text-slate-900">{item.title}</span>
                <span className="mt-2 block text-sm leading-5 text-slate-500">{item.description}</span>
                {item.id === 'employer' && <span className="mt-3 inline-block rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">Coming soon</span>}
              </button>;
            })}
          </section>
          <section aria-live="polite" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            {!selected ? <div className="py-10 text-center">
              <GraduationCap className="mx-auto mb-4 h-10 w-10 text-blue-700" />
              <h2 className="text-xl font-semibold text-slate-900">One platform. Your own workspace.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">Select an account type to see its sign-in form.</p>
            </div> : selected.id === 'employer' ? <div className="py-6">
              <h2 className="text-xl font-semibold text-slate-900">Employer access is coming soon</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">Employer registration and features are still being planned. Sign-in is not available for this account type yet.</p>
            </div> : <>
              <h2 className="text-xl font-semibold text-slate-900">{selected.title} sign-in</h2>
              <p className="mt-2 text-sm text-slate-500">Use the email and password associated with this account.</p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                <div>
                  <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-slate-700">Email</label>
                  <input id="login-email" type="email" autoComplete="username" required disabled={loading} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label htmlFor="login-password" className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                  <input id="login-password" type="password" autoComplete="current-password" required disabled={loading} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
                </div>
                <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />} {loading ? 'Signing in…' : `Sign in as ${selected.title}`}
                </button>
                <Link href="/forgot-password" className="block text-center text-sm text-blue-700 hover:underline">Forgot password?</Link>
              </form>
              <div className="mt-6 border-t border-slate-100 pt-5 text-sm leading-6 text-slate-600">
                {selected.id === 'individual' ? <p>New here? <Link href="/register" className="font-medium text-blue-700 underline">Create an individual account</Link>. Account creation is free; programme access is purchased separately when payments open.</p> :
                  selected.id === 'super-admin' ? <p>Use an existing Super Admin account. This option does not create an administrator or change your permissions.</p> :
                    <p>Use the account provided by your {selected.id === 'college-admin' ? 'platform administrator' : 'college administrator'}. Contact them if you need access.</p>}
              </div>
            </>}
          </section>
        </div>
      </div>
    </main>
  );
}
