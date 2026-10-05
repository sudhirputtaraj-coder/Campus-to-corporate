'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { invitationQueue, previewStudentRoster, queueStudentInvitations, sendStudentInvitation, type ImportResult, type MailJob } from '@/lib/college/bulk-invitations';
import { type RosterRow, validateRoster } from '@/lib/college/roster';
import type { Placement } from './controls';

export default function BulkInvite({ collegeId, departments, batches }: { collegeId: string; departments: Placement[]; batches: Placement[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<RosterRow[]>([]), [generated, setGenerated] = useState(0);
  const [jobs, setJobs] = useState<MailJob[]>([]), [sent, setSent] = useState(0), [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [queueError, setQueueError] = useState('');
  const [results, setResults] = useState<ImportResult[]>([]), [department, setDepartment] = useState(''), [batch, setBatch] = useState('');
  const stop = useRef(false), mounted = useRef(true);
  async function load() {
    const result = await invitationQueue(collegeId);
    if (mounted.current) { setJobs(result.jobs); setSent(result.sent); setConfigured(result.configured); setQueueError(result.error); }
    return result;
  }
  useEffect(() => { mounted.current = true; void load().catch(() => setQueueError('Could not load invitations. Refresh this page.')); return () => { mounted.current = false; stop.current = true; }; }, [collegeId]); // eslint-disable-line react-hooks/exhaustive-deps
  async function send(jobsToSend: MailJob[]) {
    stop.current = false;
    let completed = 0;
    for (const job of jobsToSend) {
      if (stop.current || !mounted.current) break;
      const result = await sendStudentInvitation(collegeId, job.id);
      if (result.error) { setMessage(result.error); break; }
      completed++;
      setMessage(`Processed ${completed} of ${jobsToSend.length} emails. You may pause after the current email.`);
      if (['FAILED','UNCERTAIN'].includes(result.status)) { setMessage('Sending paused because an email failed or its result is unknown. Review the queue below.'); break; }
      await new Promise(resolve => setTimeout(resolve, 650));
    }
    await load(); router.refresh();
  }
  async function run(action: () => Promise<void>) {
    setBusy(true); setMessage('');
    try { await action(); } catch (e) { setMessage(e instanceof Error ? e.message : 'The connection was interrupted. Refresh to see saved progress.'); }
    finally { if (mounted.current) setBusy(false); }
  }
  const ready = jobs.filter(j => j.status === 'QUEUED');
  const failed = jobs.filter(j => j.status === 'FAILED' && j.attempts < 5);
  let validationError = '';
  if (rows.length) { try { validateRoster(rows); } catch (e) { validationError = e instanceof Error ? e.message : 'Check the student details.'; } }
  const template = 'email,full_name,register_number\r\nstudent@example.com,Student Name,REG001\r\n';
  return <section className="mb-6 rounded-xl border border-blue-200 bg-white p-5" aria-labelledby="bulk-title">
    <h2 id="bulk-title" className="text-xl font-semibold">Invite students in bulk</h2>
    <p className="mt-2 text-sm text-slate-600">Add up to 500 students at once. Upload Excel (.xlsx, first sheet), Word (.docx, one table or an email list), CSV or text; or paste email addresses below.</p>
    {queueError && <p role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">{queueError}</p>}
    {!configured && !queueError && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">You can prepare and review your list now. Sending requires a Gmail account with an App Password (or a verified Resend sender), and the public HTTPS platform address. Ask your platform administrator to configure these.</p>}
    <form className="mt-4 space-y-3" onSubmit={e => { e.preventDefault(); const form = new FormData(e.currentTarget); void run(async () => { const result = await previewStudentRoster(collegeId, form); setRows(result.rows); setGenerated(result.generated); setResults([]); setMessage(result.error || `Loaded ${result.rows.length} students. Review their details below.`); }); }}>
      <fieldset disabled={busy} className="space-y-3">
        <label className="block text-sm font-medium">Upload student list<input type="file" name="file" accept=".xlsx,.docx,.csv,.txt" className="mt-1 block w-full rounded-lg border p-2" /></label>
        <p className="text-xs text-slate-600">Maximum 2 MB. Use headings email, full_name and register_number. Email-only lists work too. Format register numbers as text in Excel to keep leading zeros. A selected file takes priority over pasted text.</p>
        <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(template)}`} download="student-invitation-template.csv" className="inline-block text-sm text-blue-800 underline">Download Excel-compatible CSV template</a>
        <label className="block text-sm font-medium">Or paste email addresses<textarea name="emails" rows={4} maxLength={500000} placeholder="One email per line, or separated by commas" className="mt-1 w-full rounded-lg border p-2" /></label>
        <button className="rounded-lg border border-blue-800 px-4 py-2 text-blue-900">Preview student list</button>
      </fieldset>
    </form>
    {!!rows.length && <div className="mt-5 space-y-3">
      <h3 className="font-semibold">Review {rows.length} students</h3>
      {generated > 0 && <p className="rounded-lg bg-amber-50 p-3 text-sm">For {generated} rows, missing names were filled from the email and missing register numbers received temporary EMAIL- IDs. Edit these below if you have official details. These IDs will become the students’ register numbers.</p>}
      <div className="max-h-80 overflow-auto rounded-lg border"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Email</th><th className="p-2">Name</th><th className="p-2">Register number</th><th className="p-2">Remove</th></tr></thead><tbody>{rows.map((r,i) => <tr key={i}>{(['email','full_name','register_number'] as const).map(key => <td key={key} className="p-1"><input aria-label={`Row ${i+1} ${key}`} value={r[key]} disabled={busy} maxLength={key === 'email' ? 254 : key === 'full_name' ? 200 : 80} onChange={e => setRows(old => old.map((v,n) => n === i ? {...v,[key]:e.target.value} : v))} className="w-full min-w-40 rounded border p-2" /></td>)}<td><button disabled={busy} aria-label={`Remove row ${i+1}`} onClick={() => setRows(old => old.filter((_,n) => n !== i))} className="p-2 text-red-800 underline">Remove</button></td></tr>)}</tbody></table></div>
      <fieldset disabled={busy} className="flex flex-wrap gap-3"><label className="text-sm">Department for this list<select value={department} onChange={e => { setDepartment(e.target.value); setBatch(''); }} className="ml-2 rounded border p-2"><option value="">Assign later</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label><label className="text-sm">Batch<select value={batch} onChange={e => setBatch(e.target.value)} className="ml-2 rounded border p-2"><option value="">Assign later</option>{batches.filter(b => (b.department_id || '') === department).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label></fieldset>
      <p className="text-sm text-slate-600">Each student receives a private email with the join link. They sign up or sign in with the invited email, verify it, and accept your college invitation. Existing pending invitations and college students are skipped.</p>
      {validationError && <p role="alert" className="text-sm text-red-800">{validationError}</p>}
      <button disabled={busy || !configured || !!queueError || !!validationError} onClick={() => void run(async () => {
        validateRoster(rows);
        const result = await queueStudentInvitations(collegeId, rows, department, batch);
        if (result.error) { setMessage(result.error); return; }
        setResults(result.results); setRows([]);
        const queue = await load();
        if (queue.error) { setMessage(queue.error); return; }
        await send(queue.jobs.filter(j => j.status === 'QUEUED'));
      })} className="rounded-lg bg-blue-800 px-4 py-2 text-white disabled:opacity-50">Invite {rows.length} students by email</button>
    </div>}
    <p role="status" aria-live="polite" className="mt-4 text-sm">{busy ? 'Working… ' : ''}{message}</p>
    {!!results.length && <details className="mt-3 text-sm" open={results.some(r => r.status !== 'QUEUED')}><summary>Import results: {results.filter(r => r.status === 'QUEUED').length} queued; {results.filter(r => r.status !== 'QUEUED').length} skipped or need correction</summary><ul className="mt-2 max-h-48 overflow-auto">{results.map(r => <li key={r.row} className="border-b py-2">Row {r.row}: {r.email} — {r.message}</li>)}</ul></details>}
    <div className="mt-5 border-t pt-4"><h3 className="font-semibold">Saved email progress</h3><p className="mt-1 text-sm">{sent} accepted by the email provider · {ready.length} waiting · {failed.length} retryable. Accepted does not guarantee inbox delivery.</p><p className="mt-1 text-xs text-slate-600">Keep this page open while sending. You can return here and resume queued invitations. Up to 500 outstanding emails are shown at a time.</p>
      <div className="my-3 flex flex-wrap gap-3">{busy ? <button onClick={() => { stop.current = true; setMessage('Pausing after the current email.'); }} className="rounded border px-3 py-2 text-sm">Pause sending</button> : <><button disabled={!configured || !ready.length} onClick={() => void run(() => send(ready))} className="rounded border px-3 py-2 text-sm disabled:opacity-50">Send waiting invitations ({ready.length})</button><button disabled={!configured || !failed.length} onClick={() => void run(() => send(failed))} className="rounded border px-3 py-2 text-sm disabled:opacity-50">Retry failed emails ({failed.length})</button><button onClick={() => void run(async () => { await load(); })} className="rounded border px-3 py-2 text-sm">Refresh progress</button></>}</div>
      {jobs.some(j => j.status !== 'QUEUED') && <ul className="max-h-56 overflow-auto text-sm">{jobs.filter(j => j.status !== 'QUEUED').map(j => <li key={j.id} className="border-b py-2"><strong>{j.college_student_invitations?.email}</strong> — {j.status === 'SENDING' ? 'Processing / awaiting confirmation' : j.status.toLowerCase()}. {j.detail || 'If this remains unchanged, ask the platform administrator to check the email provider. Do not resend blindly.'}{j.attempts >= 5 && ' Retry limit reached; contact the platform administrator.'}</li>)}</ul>}
    </div>
  </section>;
}
