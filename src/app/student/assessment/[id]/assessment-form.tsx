'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { startAssessment, submitAssessment } from '@/lib/learning/actions';

type Q = {
  id: string;
  question_text: string;
  question_type: string;
  options: any[];
  marks: number;
  sequence: number;
};

export function AssessmentForm({
  assessmentId,
  questions,
}: {
  assessmentId: string;
  questions: Q[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setAnswer(qid: string, value: string) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  function handleStart() {
    setError(null);
    startTransition(async () => {
      const res = await startAssessment(assessmentId);
      if (res.error) {
        setError(res.error);
        return;
      }
      setAttemptId(res.attemptId!);
      setStarted(true);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!attemptId) return;
    setError(null);

    const payload = questions.map((q) => ({
      questionId: q.id,
      answerText: answers[q.id] ?? '',
    }));

    const unanswered = payload.filter((p) => !p.answerText.trim());
    if (unanswered.length > 0) {
      setError('Please answer all required questions before submitting.');
      return;
    }

    startTransition(async () => {
      const res = await submitAssessment(attemptId, payload);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push(`/student/results/${res.attemptId}`);
    });
  }

  if (!started) {
    return (
      <div className="mt-8 bg-white border border-slate-200 rounded-xl p-6">
        <p className="text-sm text-slate-600 mb-4">
          This assessment has {questions.length} question{questions.length === 1 ? '' : 's'}.
          Once you start, your attempt will be recorded. You can submit when all questions are answered.
        </p>
        {error && (
          <div className="mb-4 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
        )}
        <button
          type="button"
          onClick={handleStart}
          disabled={pending}
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-60"
        >
          {pending && <Loader2 className="w-4 h-4 animate-spin" />}
          Start Assessment
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
      )}
      {questions.map((q, i) => (
        <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <p className="text-sm font-medium text-slate-900">
              {i + 1}. {q.question_text}
            </p>
            <span className="text-xs text-slate-400 shrink-0">{q.marks} mark{q.marks === 1 ? '' : 's'}</span>
          </div>

          {['MCQ', 'MULTIPLE_CHOICE', 'TRUE_FALSE'].includes(q.question_type) ? (
            <div className="space-y-2">
              {(q.options.length > 0
                ? q.options
                : q.question_type === 'TRUE_FALSE'
                  ? ['True', 'False']
                  : []
              ).map((opt: any, oi: number) => {
                const value = typeof opt === 'string' ? opt : opt.value ?? opt.label ?? String(opt);
                const label = typeof opt === 'string' ? opt : opt.label ?? opt.value ?? String(opt);
                return (
                  <label
                    key={oi}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={value}
                      checked={answers[q.id] === value}
                      onChange={() => setAnswer(q.id, value)}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-slate-700">{label}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <textarea
              value={answers[q.id] || ''}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              rows={4}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Type your answer..."
            />
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={pending}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-60"
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        Submit Assessment
      </button>
    </form>
  );
}
