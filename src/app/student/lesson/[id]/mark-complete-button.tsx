'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { markLessonComplete } from '@/lib/learning/actions';

export function MarkCompleteButton({
  lessonId,
  courseId,
  initiallyComplete,
}: {
  lessonId: string;
  courseId: string;
  initiallyComplete: boolean;
}) {
  const [complete, setComplete] = useState(initiallyComplete);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (complete || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await markLessonComplete(lessonId, courseId);
      if (res.error) {
        setError(res.error);
        return;
      }
      setComplete(true);
    });
  }

  if (complete) {
    return (
      <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
        <CheckCircle2 className="w-4 h-4" />
        Completed
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-60"
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        Mark Complete
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
