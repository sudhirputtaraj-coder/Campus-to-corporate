'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { manageCollegeStudent } from '@/lib/college/student-access';

export type Placement = { id: string; name: string; department_id?: string | null };
const field = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5';
const button = 'rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50';

export function ShareJoinLink({ email }: { email?: string }) {
  const [message, setMessage] = useState('');
  const [fallback, setFallback] = useState('');
  async function copy() {
    const url = `${window.location.origin}/join`;
    const text = email ? `Your college has added you to Campus-to-Corporate. Open ${url}, create an account using ${email} (or sign in if you already have one), verify your email, then choose Join college. Your login is your email and the password you choose.` : url;
    try { await navigator.clipboard.writeText(text); setMessage(email ? 'Joining instructions copied. Share them with the student.' : 'Join link copied. Share it with the students you have added.'); }
    catch { setFallback(text); setMessage('Select and copy the text below.'); }
  }
  return <div><button type="button" onClick={copy} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-900">{email ? 'Copy joining instructions' : 'Copy student join link'}</button>
    {message && <p role="status" className="mt-2 text-sm text-blue-900">{message}</p>}
    {fallback && <textarea aria-label="Joining instructions to copy" readOnly value={fallback} onFocus={e => e.currentTarget.select()} className={field} rows={4} />}</div>;
}

export function AddStudent({ collegeId, departments, batches }: { collegeId: string; departments: Placement[]; batches: Placement[] }) {
  const router = useRouter();
  const [department, setDepartment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget; const data = new FormData(form);
    setBusy(true); setError(''); setAdded('');
    try {
      const result = await manageCollegeStudent(data);
      if (result.error) setError(result.error);
      else { setAdded(String(data.get('email')).trim().toLowerCase()); form.reset(); setDepartment(''); router.refresh(); }
    } catch { setError('Unable to add the student. Please try again.'); }
    finally { setBusy(false); }
  }
  return <section aria-labelledby="add-student-title" className="rounded-2xl border bg-white p-5 sm:p-6">
    <h2 id="add-student-title" className="text-xl font-semibold">Add a student</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">Use the email the student can verify. Their register number is a college identifier; they will sign in with their email.</p>
    <form onSubmit={submit} className="mt-5">
      <input type="hidden" name="college_id" value={collegeId} /><input type="hidden" name="action" value="add" />
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Student name<input name="full_name" autoComplete="off" required maxLength={200} className={field} placeholder="Full name" /></label>
        <label className="text-sm font-medium">Student email<input name="email" type="email" autoComplete="off" required maxLength={254} className={field} placeholder="student@example.com" /></label>
        <label className="text-sm font-medium">Register number<input name="register_number" autoComplete="off" required maxLength={80} className={field} placeholder="e.g. CSE2026001" /></label>
        <label className="text-sm font-medium">Department <span className="font-normal text-slate-500">(optional)</span><select name="department_id" value={department} onChange={e => setDepartment(e.target.value)} className={field}><option value="">Assign later</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <label className="text-sm font-medium">Batch <span className="font-normal text-slate-500">(optional)</span><select key={department} name="batch_id" className={field}><option value="">Assign later</option>{batches.filter(b => (b.department_id || '') === department).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      </fieldset>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button disabled={busy} className={`${button} mt-5`}>{busy ? 'Adding student…' : 'Add student & prepare access'}</button>
    </form>
    {added && <div role="status" className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4"><p className="mb-3 font-medium">Access is ready for {added}.</p><p className="mb-3 text-sm">Share the instructions below. No invitation email has been sent by this app.</p><ShareJoinLink email={added} /></div>}
  </section>;
}

export function AccessChange({ collegeId, id, name, action }: { collegeId: string; id: string; name: string; action: 'cancel' | 'remove' | 'restore' }) {
  const router = useRouter(); const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const label = action === 'cancel' ? 'Cancel invitation' : action === 'remove' ? 'Remove access' : 'Restore access';
  async function submit() {
    if (busy) return;
    const data = new FormData(); Object.entries({ college_id: collegeId, id, action, confirmed: 'yes' }).forEach(([k, v]) => data.set(k, v));
    setBusy(true); setError('');
    try { const result = await manageCollegeStudent(data); if (result.error) setError(result.error); else { setConfirm(false); router.refresh(); } }
    catch { setError('Unable to change access. Please try again.'); } finally { setBusy(false); }
  }
  return <div className="mt-3">{!confirm ? <button onClick={() => setConfirm(true)} className={`rounded-lg border px-3 py-2 text-sm font-medium ${action === 'restore' ? 'text-blue-800' : 'text-red-800'}`}>{label}</button> :
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-medium">{label} for {name}?</p><p className="mt-2 text-sm">{action === 'remove' ? 'The student will lose learning access, including from an existing session. Their enrolments, results and certificates are preserved. You can restore access later.' : action === 'cancel' ? 'This email will no longer be able to join using this invitation. You can add a corrected invitation later.' : 'The student can sign in and resume learning with their existing email and password. Their previous progress is retained.'}</p>
      <div className="mt-3 flex flex-wrap gap-3"><button disabled={busy} onClick={submit} className={button}>{busy ? 'Saving…' : `Confirm: ${label.toLowerCase()}`}</button><button disabled={busy} onClick={() => { setConfirm(false); setError(''); }} className="rounded-lg border bg-white px-3 py-2 text-sm">Keep current access</button></div></div>}
    {error && <p role="alert" className="mt-2 text-sm text-red-800">{error}</p>}</div>;
}
