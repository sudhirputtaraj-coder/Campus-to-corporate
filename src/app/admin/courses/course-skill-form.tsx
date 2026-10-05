'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { assignCourseSkill } from '@/lib/learning/admin-actions';
export function CourseSkillForm({ courseId, skillId, skills }: { courseId: string; skillId: string | null; skills: { id: string; name: string }[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const router = useRouter();
  return <form className="my-4 rounded-xl border bg-white p-4" onSubmit={event => {
    event.preventDefault(); const data = new FormData(event.currentTarget); setMessage('');
    startTransition(async () => {
      try { const result = await assignCourseSkill(courseId, data); setMessage(result.error || 'Course skill saved.'); if (!result.error) router.refresh(); }
      catch { setMessage('Unable to save. Please try again.'); }
    });
  }}>
    <label className="text-sm font-medium">Course skill <select key={skillId} name="skill_id" required defaultValue={skillId || ''} className="m-2 rounded-lg border p-2">
      <option value="" disabled>Choose a skill</option>{skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select></label>
    <button disabled={pending || !skills.length} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">{pending ? 'Saving…' : 'Save skill'}</button>
    <p className="mt-2 text-xs text-slate-600">New modules default to this skill. Existing module and assessment skill mappings stay as configured.</p>
    {message && <p role="status" className="mt-2 text-sm">{message}</p>}
  </form>;
}
