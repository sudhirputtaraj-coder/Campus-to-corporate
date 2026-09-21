'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveCollege, saveUser } from '@/lib/admin/management';

type RecordData = Record<string, string | null>;
const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 p-2 text-slate-900';
const statuses = ['ACTIVE', 'PENDING', 'INACTIVE', 'SUSPENDED'];
export default function ManagementForm({ kind, record = {} }: { kind: 'college' | 'user'; record?: RecordData }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  const fields = kind === 'college' ? [
    ['name', 'College name', 'text', 200], ['code', 'Unique college code', 'text', 40],
    ['city', 'City', 'text', 100], ['state', 'State', 'text', 100], ['address', 'Address', 'text', 1000],
    ['contact_person', 'Contact person', 'text', 200], ['contact_email', 'Contact email', 'email', 254],
    ['contact_phone', 'Contact phone', 'tel', 40],
  ] as const : [['full_name', 'Full name', 'text', 200], ['phone', 'Phone', 'tel', 40]] as const;
  return <form className="mt-4 space-y-4" onSubmit={async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true); setMessage('');
    try {
      const result = await (kind === 'college' ? saveCollege(values) : saveUser(values));
      setFailed(!!result.error);
      setMessage(result.error || 'Saved successfully.');
      if (!result.error) {
        if (!record.id && !record.user_id) form.reset();
        router.refresh();
      }
    } catch { setFailed(true); setMessage('Unable to save. Please try again.'); }
    finally { setBusy(false); }
  }}>
    <input type="hidden" name={kind === 'college' ? 'id' : 'user_id'} value={record[kind === 'college' ? 'id' : 'user_id'] || ''} />
    <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
      {fields.map(([name, label, type, max]) => <label key={name} className="text-sm font-medium">{label}
        <input name={name} type={type} maxLength={max} required={['name', 'code', 'full_name'].includes(name)} defaultValue={record[name] || ''} className={inputClass} />
      </label>)}
      <label className="text-sm font-medium">Status<select name="status" defaultValue={record.status || 'PENDING'} className={inputClass}>
        {statuses.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
      </select></label>
    </fieldset>
    {kind === 'user' && <p className="text-sm text-slate-600">Only Active accounts can sign in. Inactive, Pending and Suspended accounts cannot sign in.</p>}
    {message && <p role={failed ? 'alert' : 'status'} className={failed ? 'text-red-700' : 'text-green-800'}>{message}</p>}
    <button disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save ' + kind}</button>
  </form>;
}
