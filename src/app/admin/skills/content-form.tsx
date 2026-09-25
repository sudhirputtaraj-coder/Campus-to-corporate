'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveSkill, saveModule, saveLesson } from '@/lib/skills/content-actions';

type PracticeQuestion = {question:string;answer:string};
type Item = { practice_questions?: PracticeQuestion[]; display_order?: number; id?: string; name?: string; title?: string; description?: string | null; status?: string;
  sequence?: number; skill_id?: string | null; content?: string | null; video_url?: string | null;
  resource_url?: string | null; duration_minutes?: number };
export default function ContentForm({ kind, item = {}, moduleId = '', skills = [] }:
  { kind: 'skill' | 'module' | 'lesson'; item?: Item; moduleId?: string; skills?: { id: string; name: string }[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const router = useRouter();
  const [questions,setQuestions]=useState<PracticeQuestion[]>(item.practice_questions||[]);
  const field = 'mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm';
  return <form className="space-y-3" onSubmit={event => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setMessage('');
    startTransition(async () => {
      try {
        const result = kind === 'skill' ? await saveSkill(item.id || null, data)
          : kind === 'module' ? await saveModule(item.id!, data) : await saveLesson(item.id || null, moduleId, data);
        if (result.error) setMessage(result.error);
        else { setMessage('Saved successfully.'); if (!item.id) {form.reset();setQuestions([]);} router.refresh(); }
      } catch { setMessage('Unable to save. Your input has been kept; please try again.'); }
    });
  }}>
    <label className="block text-sm">{kind === 'lesson' ? 'Lesson title' : 'Name'}<input className={field} name="title" maxLength={200} required defaultValue={item.name || item.title || ''} /></label>
    {kind === 'skill' && <label className="block text-sm">Skill order in student learning path<input className={field} name="display_order" type="number" min={1} max={100000} required defaultValue={item.display_order??999}/></label>}
    {kind !== 'lesson' && <label className="block text-sm">Description<textarea className={field} name="description" maxLength={5000} defaultValue={item.description || ''} /></label>}
    {kind === 'module' && <label className="block text-sm">Parent skill<select className={field} name="skill_id" defaultValue={item.skill_id || ''}>
      <option value="">Not assigned</option>{skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select></label>}
    {kind !== 'skill' && <label className="block text-sm">Display order<input className={field} type="number" name="sequence" min={1} max={100000} required defaultValue={item.sequence || 1} /></label>}
    {kind === 'lesson' && <>
      <label className="block text-sm">Written content<textarea className={field} name="content" rows={6} maxLength={100000} defaultValue={item.content || ''} /></label>
      <p className="text-xs text-slate-500">Use ## before a heading and - before a bullet. Handbook tables can be edited here; keep their vertical bars and separator row.</p>
      <label className="block text-sm">Video embed link (optional)<input className={field} name="video_url" type="url" placeholder="https://…" defaultValue={item.video_url || ''} /></label>
      <label className="block text-sm">Reading / text link (optional)<input className={field} name="resource_url" type="url" placeholder="https://…" defaultValue={item.resource_url || ''} /></label>
      <p className="text-xs text-slate-500">Add another lesson for each additional video or reading link. Use HTTPS links; videos must support embedding.</p>
      <fieldset className="rounded-lg border p-3"><legend className="text-sm font-semibold">Practice questions and answers</legend>
        <p className="text-xs text-slate-600">Students can reveal each answer. These are self-study activities, not graded assessments, and do not change skill scores. Add more lessons for additional question sets.</p>
        <input type="hidden" name="practice_questions" value={JSON.stringify(questions)}/>
        {questions.map((q,i)=><div key={i} className="mt-3 border-t pt-3">
          <label className="block text-sm">Question {i+1}<textarea className={field} required maxLength={1000} value={q.question} onChange={e=>setQuestions(questions.map((v,j)=>j===i?{...v,question:e.target.value}:v))}/></label>
          <label className="block text-sm">Answer / explanation<textarea className={field} required maxLength={5000} value={q.answer} onChange={e=>setQuestions(questions.map((v,j)=>j===i?{...v,answer:e.target.value}:v))}/></label>
          <button type="button" className="mt-2 rounded px-3 py-1" onClick={()=>setQuestions(questions.filter((_,j)=>j!==i))}>Remove question {i+1}</button>
        </div>)}
        <button type="button" disabled={questions.length>=50} className="mt-3 rounded px-3 py-2" onClick={()=>setQuestions([...questions,{question:'',answer:''}])}>Add question and answer</button>
      </fieldset>
      <label className="block text-sm">Duration in minutes<input className={field} name="duration_minutes" type="number" min={0} max={100000} required defaultValue={item.duration_minutes ?? 0} /></label>
    </>}
    <label className="block text-sm">Visibility<select className={field} name="status" defaultValue={item.status || 'ACTIVE'}>
      <option value="ACTIVE">Published</option><option value="INACTIVE">Hidden</option>
      {item.status && !['ACTIVE', 'INACTIVE'].includes(item.status) && <option value={item.status} disabled>{item.status} — choose a visibility</option>}
    </select></label>
    <button disabled={pending} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">{pending ? 'Saving…' : item.id ? 'Save changes' : `Add ${kind}`}</button>
    {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
  </form>;
}
