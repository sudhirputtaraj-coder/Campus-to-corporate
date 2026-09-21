'use client';

import { useState } from 'react';
import { changeAdminEmail } from '@/lib/auth/account-actions';

export default function EmailForm() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ error?: string; message?: string }>({});
  return <form className="mt-6 space-y-4" onSubmit={async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setPending(true);
    setResult({});
    try {
      const response = await changeAdminEmail(values);
      setResult(response);
      if ('success' in response) form.reset();
    } catch {
      setResult({ error: 'The request could not be completed. Please try again.' });
    } finally {
      const password = form.elements.namedItem('password') as HTMLInputElement;
      password.value = '';
      setPending(false);
    }
  }}>
    <div>
      <label htmlFor="new-email" className="block font-medium mb-2">New email address</label>
      <input id="new-email" name="email" type="email" autoComplete="email" maxLength={254} required disabled={pending}
        className="w-full border border-slate-300 rounded-lg p-3" />
    </div>
    <div>
      <label htmlFor="current-password" className="block font-medium mb-2">Current password</label>
      <input id="current-password" name="password" type="password" autoComplete="current-password" required disabled={pending}
        className="w-full border border-slate-300 rounded-lg p-3" />
    </div>
    {result.error && <p role="alert" className="text-red-700">{result.error}</p>}
    {result.message && <p role="status" className="text-green-800">{result.message}</p>}
    <button disabled={pending} type="submit" className="bg-slate-900 text-white rounded-lg px-5 py-3 disabled:opacity-50">
      {pending ? 'Requesting change…' : 'Request email change'}
    </button>
  </form>;
}
