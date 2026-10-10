'use client';
import { useState } from 'react';
import { practiceChoice, practiceScore, type PracticeQuestion, type PracticeResponse } from '@/lib/learning/practice';

export function LessonPractice({ questions }: { questions: PracticeQuestion[] }) {
  const [responses, setResponses] = useState<PracticeResponse[]>([]);
  const [finished, setFinished] = useState(false);
  if (!questions.length) return null;
  const score = practiceScore(questions, responses);
  const update = (i: number, value: Partial<PracticeResponse>) => setResponses(old => {
    const next = [...old]; next[i] = { ...(old[i] || { value: '', checked: false }), ...value }; return next;
  });
  return <section id="lesson-practice" className="mt-6 scroll-mt-6 rounded-xl border bg-white p-5" aria-label="Lesson practice">
    <h2 className="text-lg font-semibold">Check your understanding</h2>
    <p className="mt-2 text-sm">Answer each question, then check the correct answer and explanation. Written responses use self-review. Your practice score is for this attempt only; it is not saved or added to your formal skill score.</p>
    <p className="mt-2 text-sm" aria-live="polite">{score.complete} of {questions.length} questions reviewed</p>
    {questions.map((question, i) => {
      const choice = practiceChoice(question), response = responses[i] || { value: '', checked: false };
      return <fieldset key={i} className="mt-5 border-t pt-4">
        <legend className="whitespace-pre-wrap pt-4 font-medium">{i + 1}. {choice?.prompt || question.question}</legend>
        {choice ? <div className="mt-3 space-y-2">{choice.options.map(option => <label key={option.key} className="flex items-start gap-3 rounded-lg border p-3">
          <input type="radio" name={`practice-${i}`} value={option.key} checked={response.value === option.key} disabled={response.checked} onChange={() => update(i, { value: option.key })} className="mt-1" />
          <span>{option.key}) {option.text}</span>
        </label>)}</div> : <label className="mt-3 block text-sm">Your answer<textarea rows={3} maxLength={5000} value={response.value} disabled={response.checked} onChange={e => update(i, { value: e.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label>}
        {!response.checked ? <button type="button" disabled={!response.value.trim()} onClick={() => update(i, { checked: true })} className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">Check answer</button> : <div role="status" className="mt-3 rounded-lg bg-slate-50 p-4">
          <p className="font-semibold">{choice ? response.value === choice.correct ? 'Correct' : 'Not quite — review the correct answer below.' : 'Compare your answer with the model answer'}</p>
          <p className="mt-2 whitespace-pre-wrap break-words">{question.answer}</p>
          {!choice && <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={finished} aria-pressed={response.selfCorrect === true} onClick={() => update(i, { selfCorrect: true })} className="rounded-lg border px-3 py-2 aria-pressed:bg-green-100">My answer was correct</button><button type="button" disabled={finished} aria-pressed={response.selfCorrect === false} onClick={() => update(i, { selfCorrect: false })} className="rounded-lg border px-3 py-2 aria-pressed:bg-amber-100">I need more practice</button></div>}
        </div>}
      </fieldset>;
    })}
    {!finished ? <div className="mt-6"><button type="button" disabled={score.complete !== questions.length} onClick={() => setFinished(true)} className="rounded-lg bg-slate-900 px-5 py-3 text-white disabled:opacity-50">Finish practice & see score</button><p className="mt-2 text-sm">Check every answer and review each written response to finish.</p></div> : <div role="status" className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
      <h3 className="text-lg font-semibold">Practice complete</h3>
      {score.automatic > 0 && <p className="mt-2">Multiple-choice score: <strong>{score.correct}/{score.automatic} ({Math.round(score.correct / score.automatic * 100)}%)</strong></p>}
      {score.reviewed > 0 && <p className="mt-2">Written self-review: <strong>{score.selfCorrect}/{score.reviewed}</strong> marked correct by you.</p>}
      <p className="mt-2 text-sm">Review the explanations above, or start a fresh attempt.</p>
      <button type="button" onClick={() => { setResponses([]); setFinished(false); }} className="mt-3 rounded-lg border px-4 py-2">Try again</button>
    </div>}
  </section>;
}
