'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveCollegeProgramme } from '@/lib/college/programmes';

type Skill = { id: string; name: string; description: string | null };
export default function ProgrammeForm({ collegeId, skills, selected, configured }: { collegeId: string; skills: Skill[]; selected: string[]; configured: boolean }) {
  const [ids, setIds] = useState(selected.filter(id => skills.some(s => s.id === id)));
  const [query, setQuery] = useState(''), [selectedOnly, setSelectedOnly] = useState(false);
  const all = skills.length > 0 && skills.every(s => ids.includes(s.id));
  const visibleSkills = skills.filter(s => (!selectedOnly || ids.includes(s.id)) && (s.name+' '+(s.description || '')).toLowerCase().includes(query.trim().toLowerCase()));
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const router = useRouter();
  return <form className="mt-5 space-y-5" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setMessage(''); setError('');
    try {
      const result = await saveCollegeProgramme(collegeId, false, ids);
      if (result.error) setError(result.error);
      else { setMessage(`Programme saved: ${result.skills} skills available to current and future college students. Published learning material is assigned automatically.`); router.refresh(); }
    } catch { setError('Could not confirm the save. Refresh before trying again.'); }
    finally { setBusy(false); }
  }}>
    {!configured && <p className="rounded-lg bg-amber-50 p-3 text-sm">Save your programme selection once to enable automatic access. Existing student access stays unchanged until you save.</p>}
    <fieldset disabled={busy} className="space-y-4">
      <label className="block text-sm font-medium">Filter skills<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by skill name or description" className="mt-1 w-full rounded-lg border p-3" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedOnly} onChange={event => setSelectedOnly(event.target.checked)} />Show selected skills only</label>
      <label className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4"><input type="checkbox" checked={all} onChange={event => setIds(event.target.checked ? skills.map(s => s.id) : [])} className="mt-1 h-4 w-4" /><span><strong>Select all currently available skills</strong><span className="mt-1 block text-sm text-slate-600">Selects all {skills.length} skills, including those hidden by your filter. You can uncheck individual skills. New skills added later stay unselected.</span></span></label>
      <p className="text-sm text-slate-600">{ids.length} skills selected for this programme · {visibleSkills.length} shown. Filtering does not change your selection.</p>
      <div className="grid gap-3 sm:grid-cols-2">{visibleSkills.map(skill => <label key={skill.id} className="flex items-start gap-3 rounded-lg border p-4"><input type="checkbox" checked={ids.includes(skill.id)} onChange={event => setIds(old => event.target.checked ? [...old, skill.id] : old.filter(id => id !== skill.id))} className="mt-1 h-4 w-4" /><span><strong>{skill.name}</strong>{skill.description && <span className="mt-1 block text-sm text-slate-600">{skill.description}</span>}</span></label>)}</div>
      {skills.length > 0 && !visibleSkills.length && <p>No skills match this filter. Clear the search or turn off “Show selected skills only”.</p>}
      {!skills.length && <p>No active skills are available. Ask Super Admin to publish the programme skills.</p>}
      <p className="text-sm text-slate-600">Applies to every active student in this college, across all departments and batches. New students receive access when they accept their college invitation. New published modules and lessons are included automatically for the selected skills.</p>
      <p className="text-sm text-slate-600">Removing a skill hides its learning material from students; saved progress and results are retained. Programme changes are blocked while a student assessment is in progress.</p>
      <button disabled={busy || !skills.length || !ids.length} className="rounded-lg bg-slate-900 px-5 py-3 font-medium text-white disabled:opacity-50">{busy ? 'Saving…' : configured ? 'Save programme access' : 'Enable programme access'}</button>
    </fieldset>
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    {message && <p role="status" className="text-sm text-green-800">{message}</p>}
  </form>;
}
