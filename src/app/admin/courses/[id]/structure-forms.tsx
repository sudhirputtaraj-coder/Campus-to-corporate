'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import QuestionSkills from './question-skills';
import {
  createModule,
  assignModuleSkill,
  createLesson,
  createAssessment,
  createQuestion,
} from '@/lib/learning/admin-actions';

type Mod = {
  skill_id: string | null;
  id: string;
  title: string;
  sequence: number;
  description: string | null;
  lessons: { id: string; title: string; sequence: number; duration_minutes: number }[];
};

type Asmt = {
  mapping_locked: boolean;
  is_practice: boolean;
  id: string;
  title: string;
  type: string;
  questions: { id: string; question_text: string; question_type: string; marks: number; sequence: number; question_skills: { skill_id: string; weight: number }[] }[];
};

export function CourseStructureForms({
  courseId,
  modules,
  assessments,
  skills,
}: {
  courseId: string;
  modules: Mod[];
  assessments: Asmt[];
  skills: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function run(fn: () => Promise<{ error?: string; success?: boolean }>) {
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setErr(res.error);
      else {
        setMsg('Saved successfully.');
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-8 space-y-8">
      {err && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{err}</div>}
      {msg && <div className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded-lg">{msg}</div>}

      {/* Modules list */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Modules & Lessons</h2>
        {modules.length === 0 ? (
          <p className="text-sm text-slate-500 mb-4">No modules yet.</p>
        ) : (
          <div className="space-y-4 mb-6">
            {modules.map((m) => (
              <div key={m.id} id={`module-${m.id}`} className="border border-slate-100 rounded-lg p-4">
                <p className="font-medium text-slate-900">
                  {m.sequence}. {m.title}
                </p>
                <form className="mt-3 flex flex-wrap gap-2" onSubmit={e => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  run(() => assignModuleSkill(m.id, courseId, fd));
                }}>
                  <label className="text-sm text-slate-600">Parent skill
                    <select name="skill_id" defaultValue={m.skill_id || ''} className="ml-2 rounded-lg border border-slate-300 px-3 py-2">
                      <option value="">Not assigned</option>
                      {skills.map(skill => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
                    </select>
                  </label>
                  <button disabled={pending} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Save skill</button>
                </form>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {m.lessons.map((l) => (
                    <li key={l.id}>
                      — {l.sequence}. {l.title} ({l.duration_minutes} min)
                    </li>
                  ))}
                </ul>
                <form
                  className="mt-3 grid sm:grid-cols-2 gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    run(() => createLesson(m.id, courseId, fd));
                    e.currentTarget.reset();
                  }}
                >
                  <input name="title" required placeholder="Lesson title" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  <input name="sequence" type="number" defaultValue={m.lessons.length + 1} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  <input name="duration_minutes" type="number" defaultValue={15} placeholder="Duration min" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  <input name="video_url" placeholder="Video URL (optional)" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  <textarea name="content" placeholder="Lesson content" rows={2} className="sm:col-span-2 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  <button type="submit" disabled={pending} className="text-sm bg-slate-900 text-white px-3 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-60">
                    {pending ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Add lesson'}
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <form
          className="grid sm:grid-cols-2 gap-2 border-t border-slate-100 pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(() => createModule(courseId, fd));
            e.currentTarget.reset();
          }}
        >
          <input name="title" required placeholder="Module title" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <label className="text-sm text-slate-600">Parent skill
            <select name="skill_id" className="ml-2 rounded-lg border border-slate-300 px-3 py-2">
              <option value="">Not assigned</option>
              {skills.map(skill => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
            </select>
          </label>
          <input name="sequence" type="number" defaultValue={modules.length + 1} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input name="description" placeholder="Description" className="sm:col-span-2 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <button type="submit" disabled={pending} className="text-sm bg-slate-900 text-white px-3 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-60">
            Add module
          </button>
        </form>
      </section>

      {/* Assessments */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Assessments & Questions</h2>
        {assessments.length === 0 ? (
          <p className="text-sm text-slate-500 mb-4">No assessments yet.</p>
        ) : (
          <div className="space-y-4 mb-6">
            {assessments.map((a) => (
              <div key={a.id} className="border border-slate-100 rounded-lg p-4">
                <p className="font-medium text-slate-900">
                  {a.title} <span className="text-xs text-slate-400">({a.type})</span>
                </p>
                <p className="mt-2 text-xs text-slate-500">{a.is_practice ? 'Practice assessment: does not change skill scores.' : 'A skill needs at least three mapped questions with a positive marks total for a valid proficiency score.'}</p>
                <ul className="mt-2 text-xs text-slate-600">{skills.map(skill => {
                  const count = a.questions.filter(q => q.question_skills?.some(m => m.skill_id === skill.id)).length;
                  return count ? <li key={skill.id}>{skill.name}: {count} mapped questions{count < 3 ? ' — add more evidence' : ''}</li> : null;
                })}</ul>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {a.questions.map((q) => (
                    <li key={q.id}>
                      — Q{q.sequence}: {q.question_text.slice(0, 80)}
                      {q.question_text.length > 80 ? '…' : ''} ({q.question_type}, {q.marks}m)
                      <QuestionSkills questionId={q.id} skills={skills} mappings={q.question_skills || []} locked={a.mapping_locked} />
                    </li>
                  ))}
                </ul>
                <form
                  className="mt-3 grid sm:grid-cols-2 gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    run(() => createQuestion(a.id, courseId, fd));
                    e.currentTarget.reset();
                  }}
                >
                  <input name="question_text" required placeholder="Question text" className="sm:col-span-2 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  <select name="question_type" className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                    <option value="MCQ">MCQ</option>
                    <option value="TRUE_FALSE">True/False</option>
                    <option value="SHORT_ANSWER">Short answer</option>
                    <option value="WRITTEN">Written</option>
                    <option value="SCENARIO">Scenario</option>
                  </select>
                  <input name="correct_answer" placeholder="Correct answer (for auto-grade)" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  <input name="options" placeholder="Options separated by | (e.g. A|B|C|D)" className="sm:col-span-2 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  <input name="marks" type="number" step="0.5" defaultValue={1} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  <p className="sm:col-span-2 text-xs text-slate-500">After adding a question, open “Skills measured” above to assign its scoring skills.</p>
                  <input name="sequence" type="number" defaultValue={a.questions.length + 1} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  <button type="submit" disabled={pending} className="text-sm bg-slate-900 text-white px-3 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-60">
                    Add question
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <form
          className="grid sm:grid-cols-2 gap-2 border-t border-slate-100 pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(() => createAssessment(courseId, fd));
            e.currentTarget.reset();
          }}
        >
          <input name="title" required placeholder="Assessment title" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <select name="type" className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="MCQ">MCQ</option>
            <option value="MIXED">Mixed</option>
            <option value="TRUE_FALSE">True/False</option>
          </select>
          <input name="duration_minutes" type="number" defaultValue={30} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input name="passing_score" type="number" defaultValue={60} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input name="description" placeholder="Description" className="sm:col-span-2 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <button type="submit" disabled={pending} className="text-sm bg-slate-900 text-white px-3 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-60">
            Add assessment
          </button>
        </form>
      </section>
    </div>
  );
}
