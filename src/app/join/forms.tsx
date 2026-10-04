'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import PasswordInput from '@/components/password-input';
import { collegeJoinAuth, acceptCollegeInvitation } from '@/lib/auth/college-join';

const field = 'mt-2 w-full rounded-lg border border-slate-300 px-3 py-3';
export function JoinAuthForm() {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const data = new FormData(event.currentTarget);
    const resend = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'resend';
    data.set('mode', resend ? 'resend' : mode);
    setBusy(true); setError(''); setMessage('');
    try { const result = await collegeJoinAuth(data); if (result?.error) setError(result.error); if (result?.message) setMessage(result.message); }
    finally { setBusy(false); }
  }
  return <section className="mt-7 rounded-2xl border bg-white p-6 sm:p-8">
    <div className="flex gap-2" aria-label="Create an account or sign in">{(['signup', 'signin'] as const).map(value => <button key={value} disabled={busy} type="button" aria-pressed={mode === value} onClick={() => { setMode(value); setError(''); setMessage(''); }} className={`flex-1 rounded-lg border px-3 py-3 text-sm font-semibold ${mode === value ? 'border-blue-700 bg-blue-50 text-blue-900' : ''}`}>{value === 'signup' ? 'Create my account' : 'I already have an account'}</button>)}</div>
    <h2 className="mt-6 text-xl font-semibold">{mode === 'signup' ? 'Choose your own login' : 'Sign in to accept your invitation'}</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">Use the exact email your college administrator added. Your password is private to you.</p>
    <form onSubmit={submit} className="mt-5 space-y-4">
      <fieldset disabled={busy} className="space-y-4">
        {mode === 'signup' && <label className="block text-sm font-medium">Full name<input required name="full_name" maxLength={200} autoComplete="name" className={field} /></label>}
        <label className="block text-sm font-medium">Email<input required name="email" type="email" maxLength={254} autoComplete="username" className={field} /></label>
        <div className="text-sm"><label htmlFor="college-join-password" className="font-medium">Password</label><PasswordInput key={mode} id="college-join-password" required name="password" minLength={mode === 'signup' ? 8 : 1} maxLength={128} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} className={field} />{mode === 'signup' && <p className="mt-1 text-slate-500">At least 8 characters.</p>}</div>
        <button className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white">{busy ? 'Please wait…' : mode === 'signup' ? 'Create account & verify email' : 'Sign in & find my college'}</button>
        <div className="flex flex-wrap justify-between gap-3 text-sm"><button type="submit" value="resend" formNoValidate className="text-blue-800 underline">Resend verification email</button><Link href="/forgot-password" className="text-blue-800 underline">Forgot password?</Link></div>
      </fieldset>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-blue-50 p-4 text-sm leading-6 text-blue-900">{message}</p>}
    </form>
  </section>;
}

export function AcceptInvitation({ id, college }: { id: string; college: string }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try { const result = await acceptCollegeInvitation(new FormData(event.currentTarget)); if (result?.error) setError(result.error); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-4"><input name="invitation_id" type="hidden" value={id} /><button disabled={busy} className="rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? 'Joining…' : `Join ${college}`}</button>{error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}</form>;
}
