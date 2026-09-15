import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, LogOut, CheckCircle2, XCircle } from 'lucide-react';
import { logout } from '@/lib/auth/actions';

export default async function ResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!student) redirect('/student/dashboard');

  const { data: attempt } = await supabase
    .from('assessment_attempts')
    .select('*, assessment:assessments(id, title, passing_score, course:courses(title))')
    .eq('id', attemptId)
    .eq('student_id', student.id)
    .single();

  if (!attempt) notFound();

  // Do not expose correct answers — only student's answers and whether correct
  const { data: answers } = await supabase
    .from('assessment_answers')
    .select('id, answer_text, is_correct, marks_awarded, question:questions(question_text, marks, question_type)')
    .eq('attempt_id', attemptId);

  const assessment = attempt.assessment as any;
  const pct = Number(attempt.percentage) || 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/student/assessments" className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <GraduationCap className="w-5 h-5 text-slate-900" />
            Assessments
          </Link>
          <form action={logout}>
            <button type="submit" className="text-slate-500 hover:text-slate-900 flex items-center gap-1 text-sm">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Assessment Result</h1>
        <p className="text-slate-600 mt-1">{assessment?.title}</p>
        <p className="text-sm text-slate-500">{assessment?.course?.title}</p>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Score</p>
            <p className="text-2xl font-bold text-slate-900">{pct}%</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Marks</p>
            <p className="text-2xl font-bold text-slate-900">
              {attempt.obtained_marks}/{attempt.total_marks}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Attempt</p>
            <p className="text-2xl font-bold text-slate-900">#{attempt.attempt_number}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500">Result</p>
            <p className="text-lg font-bold mt-1">
              {attempt.status === 'PENDING_EVALUATION' ? (
                <span className="text-amber-600">Pending evaluation</span>
              ) : attempt.passed ? (
                <span className="text-green-600">Passed</span>
              ) : (
                <span className="text-red-600">Not passed</span>
              )}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-3">
          Completed:{' '}
          {attempt.completed_at
            ? new Date(attempt.completed_at).toLocaleString('en-IN')
            : '—'}{' '}
          · Pass mark: {assessment?.passing_score ?? 60}%
        </p>

        {answers && answers.length > 0 && (
          <section className="mt-8 space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Your answers</h2>
            <p className="text-xs text-slate-500">
              Correct answer keys are not shown. Auto-graded items show correct/incorrect only.
            </p>
            {answers.map((ans: any, i: number) => (
              <div key={ans.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  {ans.is_correct === true ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  ) : ans.is_correct === false ? (
                    <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center shrink-0 mt-0.5">
                      ?
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {i + 1}. {ans.question?.question_text}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      Your answer: {ans.answer_text || '—'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Marks: {ans.marks_awarded}/{ans.question?.marks ?? 0}
                      {ans.is_correct == null ? ' · Awaiting evaluation' : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        <div className="mt-8 flex gap-3">
          <Link
            href="/student/assessments"
            className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to assessments
          </Link>
          <Link
            href="/student/learning"
            className="px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            My Learning
          </Link>
        </div>
      </main>
    </div>
  );
}
