'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { changePublication, renameAssessmentDraft } from '@/lib/learning/publishing-actions';

export function PublicationControls({ kind, id, status, title = '', locked = false }: { kind: 'course' | 'assessment'; id: string; status: string; title?: string; locked?: boolean }) {
  const [choice, setChoice] = useState<'publish' | 'hide' | 'copy' | null>(null);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const router = useRouter();
  async function save() {
    if (!choice || busy) return;
    setBusy(true); setMessage('');
    const form = new FormData(); Object.entries({ kind, id, action: choice, confirmed: 'yes' }).forEach(([k, v]) => form.set(k, v));
    try { const result = await changePublication(form); if (result.error) setMessage(result.error); else { setMessage(choice === 'copy' ? 'Draft copy created. Edit it below; original results remain unchanged.' : 'Visibility updated.'); setChoice(null); router.refresh(); if (result.id) router.replace(`${window.location.pathname}#assessment-${result.id}`); } }
    catch { setMessage('Unable to save. Please try again.'); } finally { setBusy(false); }
  }
  return <div className="my-4 rounded-lg border p-4 text-sm"><p><strong>{status === 'ACTIVE' ? 'Published' : 'Draft / hidden'}</strong>{locked ? ' · Attempted: questions and grading settings are locked.' : ''}</p>
    {kind === 'assessment' && status === 'INACTIVE' && <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={async e => {
      e.preventDefault(); if (busy) return; const form = new FormData(e.currentTarget); setBusy(true); setMessage('');
      try { const result = await renameAssessmentDraft(form); setMessage(result.error || 'Draft title saved.'); if (!result.error) router.refresh(); } catch { setMessage('Unable to save the title. Please try again.'); } finally { setBusy(false); }
    }}><input type="hidden" name="id" value={id} /><label className="flex-1">Draft title<input name="title" required maxLength={200} defaultValue={title} className="mt-1 w-full rounded border p-2" /></label><button disabled={busy} className="rounded border px-3 py-2">Save title</button></form>}
    <div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={() => setChoice(status === 'ACTIVE' ? 'hide' : 'publish')} className="rounded-lg border px-3 py-2">{status === 'ACTIVE' ? 'Hide from learners' : 'Review & publish'}</button>{kind === 'assessment' && <button type="button" disabled={busy} onClick={() => setChoice('copy')} className="rounded-lg border px-3 py-2">Create editable draft copy</button>}</div>
    {choice && <div className="mt-3 rounded-lg bg-amber-50 p-3"><p>{choice === 'copy' ? 'Copy the questions, answer keys and skill mappings into a new hidden assessment? Attempts, grades and certificates stay with the original.' : choice === 'publish' ? 'Make this content available when its course and parent content are published? Review the content first. Publishing a course does not enrol students automatically.' : 'Hide this content from learners? Existing progress and results are retained. Do not hide content learners currently need.'}</p><div className="mt-3 flex gap-3"><button disabled={busy} type="button" onClick={save} className="rounded-lg bg-slate-900 px-3 py-2 text-white">{busy ? 'Saving…' : 'Confirm'}</button><button disabled={busy} type="button" onClick={() => setChoice(null)}>Cancel</button></div></div>}
    {message && <p role="status" className="mt-3">{message}</p>}
  </div>;
}
