'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createQuestion } from '@/lib/learning/admin-actions';
type Question = { id: string; question_text: string; question_type: string; correct_answer: string | null; options: string[]; marks: number; sequence: number; skill_category?: string | null };
export default function QuestionEditor({ question: q, assessmentId, courseId }: { question: Question; assessmentId: string; courseId: string }) {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const router = useRouter();
  const field = 'mt-1 w-full rounded border p-2';
  return <details className="my-2 rounded border p-3"><summary className="cursor-pointer">Edit question and answer key</summary><form className="mt-3 space-y-3" onSubmit={async e => {
    e.preventDefault(); if (busy) return; const data = new FormData(e.currentTarget); setBusy(true); setMessage('');
    try { const result = await createQuestion(assessmentId, courseId, data); setMessage(result.error || 'Question saved.'); if (!result.error) router.refresh(); } catch { setMessage('Unable to save. Your input is retained.'); } finally { setBusy(false); }
  }}><input type="hidden" name="question_id" value={q.id} /><input type="hidden" name="skill_category" value={q.skill_category || ''} /><fieldset disabled={busy} className="space-y-3">
    <label className="block">Question<textarea className={field} name="question_text" required maxLength={4000} defaultValue={q.question_text} /></label>
    <label className="block">Question type<select className={field} name="question_type" defaultValue={q.question_type}><option value="MCQ">MCQ</option><option value="MULTIPLE_CHOICE">Multiple choice (one answer)</option><option value="TRUE_FALSE">True/False</option></select></label>
    <label className="block">Choices separated by |<input className={field} name="options" required defaultValue={Array.isArray(q.options) ? q.options.join('|') : ''} /></label>
    <label className="block">Correct answer (exact choice text)<input className={field} name="correct_answer" required defaultValue={q.correct_answer || ''} /></label>
    <label className="block">Marks<input className={field} name="marks" type="number" min={0.01} max={9999} step={0.01} required defaultValue={q.marks} /></label>
    <label className="block">Order<input className={field} name="sequence" type="number" min={1} max={100000} required defaultValue={q.sequence} /></label>
    <button className="rounded border px-3 py-2">{busy ? 'Saving…' : 'Save question'}</button></fieldset>{message && <p role="status">{message}</p>}</form></details>;
}
