'use client';
import { LessonContent } from '@/app/student/lesson/lesson-content';
export type LessonPreviewData = { title: string; content: string; video: string; resource: string; questions: { question: string; answer: string }[] };
const safe = (value: string) => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; } };
export function LessonPreview({ data }: { data: LessonPreviewData }) {
  return <section aria-label="Lesson preview" className="mt-5 space-y-4 rounded-xl border border-blue-200 bg-white p-5"><p className="text-sm text-blue-900">Preview of current input · not saved or published. Text uses the same renderer as the student lesson.</p><h2 className="text-2xl font-bold">{data.title || 'Untitled lesson'}</h2><LessonContent content={data.content} />
    {safe(data.video) && <p><a href={data.video} target="_blank" rel="noopener noreferrer" className="underline">Check video link in a new tab</a></p>}{safe(data.resource) && <p><a href={data.resource} target="_blank" rel="noopener noreferrer" className="underline">Check reading link in a new tab</a></p>}
    {data.questions.map((q, i) => <details key={i} className="rounded-lg border p-3"><summary>{i + 1}. {q.question}</summary><p className="mt-2 whitespace-pre-wrap">{q.answer}</p></details>)}
  </section>;
}
