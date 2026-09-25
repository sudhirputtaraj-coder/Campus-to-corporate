import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogOut, ArrowLeft, Home } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/lib/auth/actions';
import {
  buildSkillCards,
  type DashboardAttempt,
  type DashboardSkill,
  type DashboardSnapshot,
  type DashboardSummary,
} from '@/lib/skills/dashboard';

const dateLabel = (date: string) => new Date(date).toLocaleDateString('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
});

export default async function StudentSkillsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: student, error: studentError } = await supabase
    .from('students').select('id').eq('user_id', user.id).single();
  if (studentError || !student) redirect('/student/dashboard');

  const [catalogResult, summaryResult, attemptResult] = await Promise.all([
    supabase.from('skills').select('*').eq('status', 'ACTIVE'),
    supabase.from('student_skill_summaries')
      .select('skill_id, current_proficiency, last_valid_snapshot_id, last_attempt_id')
      .eq('student_id', student.id),
    supabase.from('assessment_attempts')
      .select('id, attempt_number, completed_at, created_at, assessment:assessments!inner(title, is_practice)')
      .eq('student_id', student.id).eq('status', 'GRADED')
      .eq('assessment.is_practice', false)
      .order('completed_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(50),
  ]);

  const summaries = (summaryResult.data ?? []) as DashboardSummary[];
  const recentAttempts = (attemptResult.data ?? []) as unknown as DashboardAttempt[];
  const recentIds = recentAttempts.map(attempt => attempt.id);
  const sourceIds = [...new Set(summaries.flatMap(summary =>
    summary.last_attempt_id && !recentIds.includes(summary.last_attempt_id)
      ? [summary.last_attempt_id] : [],
  ))];
  let attempts = recentAttempts;
  let failed = Boolean(catalogResult.error || summaryResult.error || attemptResult.error);

  // Preserve provenance even when the current valid score is older than the history window.
  if (!failed && sourceIds.length > 0) {
    const sourceResult = await supabase.from('assessment_attempts')
      .select('id, attempt_number, completed_at, created_at, assessment:assessments!inner(title, is_practice)')
      .eq('student_id', student.id).eq('status', 'GRADED')
      .eq('assessment.is_practice', false).in('id', sourceIds);
    failed = Boolean(sourceResult.error);
    attempts = [...attempts, ...((sourceResult.data ?? []) as unknown as DashboardAttempt[])];
  }

  let snapshots: DashboardSnapshot[] = [];
  if (!failed && attempts.length > 0) {
    const snapshotResult = await supabase.from('student_skill_snapshots')
      .select('id, skill_id, attempt_id, proficiency, applicable_question_count, is_valid')
      .eq('student_id', student.id).in('attempt_id', attempts.map(attempt => attempt.id));
    failed = Boolean(snapshotResult.error);
    snapshots = (snapshotResult.data ?? []) as DashboardSnapshot[];
  }

  const cards = failed ? [] : buildSkillCards(
    (catalogResult.data ?? []) as DashboardSkill[], summaries, snapshots, attempts, recentIds,
  );
  const measuredCount = cards.filter(card => card.score !== null).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="page-navigation border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-14 max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/student/dashboard" className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="text-sm font-semibold">Campus-to-Corporate</span> Student
          </Link>
          <Link href="/" className="text-slate-500 hover:text-slate-900" title="Home">
            <Home className="w-4 h-4" />
          </Link>
          <form action={logout}>
            <button type="submit" className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/student/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Skill Scores</h1>
            <p className="mt-2 max-w-2xl text-slate-600">See what your formal assessments show about your workplace skills.</p>
          </div>
          <Link href="/student/assessments" className="inline-flex justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700">
            View assessments
          </Link>
        </div>

        {failed ? (
          <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <h2 className="font-semibold">Skills could not be loaded</h2>
            <p className="mt-2 text-sm">Your scores have not changed. Refresh this page to try again.</p>
          </div>
        ) : cards.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Skills are not available yet. Please check back later.</p>
        ) : (
          <>
            <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-5">
              <p className="font-semibold text-slate-900">{measuredCount} of {cards.length} skills assessed</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Each score comes from your latest valid formal assessment for that skill.
                At least three mapped questions and a positive marks total are required.
                Practice assessments do not change these scores. Unassessed skills are not zero scores.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {cards.map(card => (
                <section key={card.id} aria-labelledby={`skill-${card.code}`} className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <h2 id={`skill-${card.code}`} className="text-lg font-semibold text-slate-900">{card.name}</h2>
                  {card.description && <p className="mt-1 text-sm text-slate-500">{card.description}</p>}
                  <Link href={`/student/skills/${card.id}/modules`} className="mt-3 inline-block text-sm font-medium text-blue-700 underline">Learning modules →</Link>
                  {card.score !== null && card.source ? (
                    <>
                      <p className="mt-5 text-3xl font-bold text-slate-900">{card.score.toFixed(2)}<span className="text-lg font-normal text-slate-500">%</span></p>
                      <meter min={0} max={100} value={card.score} aria-label={`${card.name} proficiency`} className="mt-2 h-3 w-full">{card.score}%</meter>
                      <p className="mt-3 text-sm text-slate-600">Based on {card.source.applicable_question_count} mapped questions.</p>
                      <Link href={`/student/results/${card.source.attempt_id}`} className="mt-1 block text-sm font-medium text-blue-700 underline underline-offset-2">
                        {card.source.attempt.assessment.title} · Attempt #{card.source.attempt.attempt_number}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">Assessed {dateLabel(card.source.attempt.completed_at ?? card.source.attempt.created_at)}</p>
                    </>
                  ) : (
                    <div className="mt-5 rounded-lg bg-slate-50 p-4">
                      <p className="font-semibold text-slate-700">{card.unavailable ? 'Score unavailable' : 'Not yet assessed'}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {card.unavailable ? 'The assessment behind this score could not be verified.' : 'A formal assessment with enough evidence is needed to establish this skill.'}
                      </p>
                    </div>
                  )}
                  {card.history.length > 0 ? (
                    <details className="mt-5 border-t border-slate-100 pt-4">
                      <summary className="cursor-pointer text-sm font-medium text-slate-700">Assessment history ({card.history.length})</summary>
                      <ol className="mt-3 space-y-3">
                        {card.history.map(entry => (
                          <li key={entry.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <Link href={`/student/results/${entry.attempt_id}`} className="font-medium text-blue-700 underline underline-offset-2">{entry.attempt.assessment.title} · #{entry.attempt.attempt_number}</Link>
                              <span className="font-semibold text-slate-800">{entry.proficiency == null ? 'No score' : `${Number(entry.proficiency).toFixed(2)}%`}</span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">{dateLabel(entry.attempt.completed_at ?? entry.attempt.created_at)} · {entry.applicable_question_count} mapped questions</p>
                            <p className="mt-1 text-xs text-slate-600">{entry.is_valid ? (entry.id === card.source?.id ? 'Current proficiency' : 'Valid measurement') : 'Insufficient evidence · does not replace a valid score'}</p>
                          </li>
                        ))}
                      </ol>
                    </details>
                  ) : <p className="mt-5 text-xs text-slate-500">No measurements in your recent formal assessments.</p>}
                </section>
              ))}
            </div>
            <p className="mt-5 text-xs text-slate-500">History covers your 50 most recent graded formal attempts. Older assessments may still be the source of your current proficiency.</p>
          </>
        )}
      </main>
    </div>
  );
}
