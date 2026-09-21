'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveQuestionSkills } from '@/lib/skills/mapping-actions';

export default function QuestionSkills({ questionId, mappings, skills, locked }: {
  questionId: string; mappings: { skill_id: string; weight: number }[];
  skills: { id: string; name: string }[]; locked: boolean;
}) {
  const [rows, setRows] = useState(mappings.map(m => ({ skillId: m.skill_id, percent: (Number(m.weight) * 100).toFixed(2) })));
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const router = useRouter();
  return <details className="mt-2 rounded-lg border border-slate-200 p-3">
    <summary className="cursor-pointer font-medium">Skills measured: {mappings.length ? mappings.map(m => `${skills.find(s => s.id === m.skill_id)?.name || 'Unavailable skill'} (${(Number(m.weight) * 100).toFixed(2)}%)`).join(', ') : 'Not mapped'}</summary>
    {locked ? <p className="mt-2 text-xs text-slate-500">This assessment has attempts. Create a new assessment to change skill mappings without affecting historical evidence.</p> : <form className="mt-3 space-y-2" onSubmit={event => {
      event.preventDefault(); setMessage(''); startTransition(async () => {
        try { const result = await saveQuestionSkills(questionId, rows); setMessage(result.error || 'Skill mapping saved.'); if (!result.error) router.refresh(); }
        catch { setMessage('Unable to save. Please try again.'); }
      });
    }}>
      {rows.map((row, index) => <div key={index} className="flex flex-wrap items-end gap-2">
        <label className="text-xs">Skill<select value={row.skillId} required disabled={pending} className="mt-1 block rounded border p-2" onChange={e => setRows(rows.map((r,i) => i === index ? { ...r, skillId: e.target.value } : r))}>
          <option value="">Choose skill</option>
          {row.skillId && !skills.some(s => s.id === row.skillId) && <option value={row.skillId}>Unavailable skill — replace or remove</option>}
          {skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select></label>
        <label className="text-xs">Percentage<input type="number" min="0.01" max="100" step="0.01" required disabled={pending} value={row.percent} className="mt-1 block w-24 rounded border p-2" onChange={e => setRows(rows.map((r,i) => i === index ? { ...r, percent: e.target.value } : r))} /></label>
        <button type="button" disabled={pending} onClick={() => setRows(rows.filter((_,i) => i !== index))} className="p-2 text-xs underline">Remove</button>
      </div>)}
      <p className="text-xs text-slate-500">Use 100% for one skill, or divide 100% across several. An unmapped question does not contribute to skill scores.</p>
      <button type="button" disabled={pending || rows.length >= 100} onClick={() => setRows([...rows, { skillId: '', percent: rows.length ? '' : '100' }])} className="mr-3 rounded border px-3 py-2 text-xs">Add skill</button>
      <button disabled={pending} className="rounded bg-slate-900 px-3 py-2 text-xs text-white">{pending ? 'Saving…' : 'Save skill mapping'}</button>
      {message && <p role="status" className="text-xs">{message}</p>}
    </form>}
  </details>;
}
