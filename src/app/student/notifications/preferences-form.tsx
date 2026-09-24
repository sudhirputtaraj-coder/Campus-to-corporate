'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveWhatsAppPreferences } from '@/lib/notifications/actions';

type Preferences = { phone: string | null; enabled: boolean; learning: boolean; scores: boolean; employability: boolean };
export default function PreferencesForm({ initial }: { initial: Preferences | null }) {
  const [enabled, setEnabled] = useState(initial?.enabled || false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  return <form className="mt-6 space-y-5" onSubmit={async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setMessage('');
    try {
      const result = await saveWhatsAppPreferences(data);
      setMessage(result.error || (enabled ? 'Preferences saved. No messages will be sent until WhatsApp is connected and your number is verified.' : 'WhatsApp updates are off and your saved number has been removed.'));
      if (!result.error) router.refresh();
    } catch { setMessage('Unable to save. Please try again.'); }
    finally { setBusy(false); }
  }}>
    <fieldset disabled={busy} className="space-y-5">
      <label className="flex items-start gap-3 rounded-lg border p-4">
        <input type="checkbox" name="enabled" checked={enabled} onChange={event => setEnabled(event.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
        <span>I agree to receive a weekly WhatsApp summary from Campus-to-Corporate about the updates I select below, after I verify my number. I can turn this off at any time. No promotional messages are included.</span>
      </label>
      <fieldset disabled={!enabled} className="space-y-4 disabled:opacity-60">
        <legend className="mb-3 font-medium">Include in my weekly summary</legend>
        <label className="block font-medium">WhatsApp number (with country code)
          <input name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={24} required={enabled} defaultValue={initial?.phone || ''} placeholder="+91 9876543210" className="mt-2 block w-full rounded-lg border p-3 font-normal" />
        </label>
        {([['learning','Learning progress and completed lessons'],['scores','Assessment scores'],['employability','Employability progress']] as const).map(([name, label]) => <label key={name} className="flex items-center gap-3 py-2"><input type="checkbox" name={name} defaultChecked={initial?.[name] ?? true} className="h-5 w-5" />{label}</label>)}
      </fieldset>
      <button type="submit" disabled={busy} className="rounded-lg px-5 py-3 font-medium">{busy ? 'Saving…' : 'Save preferences'}</button>
    </fieldset>
    {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
  </form>;
}
