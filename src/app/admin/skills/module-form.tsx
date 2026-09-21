'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createModule } from '@/lib/learning/admin-actions';

export default function SkillModuleForm({ skillId, courses }: { skillId: string; courses: { id: string; title: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  return <form className="mt-5 space-y-3 border-t pt-4" onSubmit={event => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setMessage('');
    startTransition(async () => {
      try {
        const result = await createModule(String(data.get('course_id')), data);
        if (result.error) setMessage(result.error);
        else { setMessage('Module added. Open the module to add videos, text and reading links.'); form.reset(); router.refresh(); }
      } catch { setMessage('Unable to save. Please try again.'); }
    });
  }}>
    <input type="hidden" name="skill_id" value={skillId} />
    <label className="block text-sm">Module name<input name="title" required maxLength={200} placeholder="e.g. Email Writing or Grammar" className="mt-1 w-full rounded-lg border p-2" /></label>
    <label className="block text-sm">Course<select name="course_id" required className="mt-1 w-full rounded-lg border p-2" defaultValue="">
      <option value="" disabled>Choose the course that includes this module</option>
      {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
    </select></label>
    <p className="text-xs text-slate-500">The course controls student enrolment and programme access.</p>
    <label className="block text-sm">Description<textarea name="description" rows={2} className="mt-1 w-full rounded-lg border p-2" /></label>
    <label className="block text-sm">Display order<input name="sequence" type="number" min={1} defaultValue={1} required className="ml-2 w-20 rounded-lg border p-2" /></label>
    <button disabled={pending || !courses.length} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">{pending ? 'Saving…' : 'Add module'}</button>
    {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
  </form>;
}
