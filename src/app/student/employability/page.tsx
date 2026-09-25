import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Target, TrendingUp, Home } from 'lucide-react';
import { logout } from '@/lib/auth/actions';
import {
  getLatestEmployability,
  getSkillGaps,
  buildRecommendations,
  computeEmployabilityScore,
} from '@/lib/employability';
import { RefreshScoreButton } from './refresh-button';

export default async function StudentEmployabilityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('user_id', user.id)
    .single();

  const { data: student } = await supabase
    .from('students')
    .select('id, employability_score')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!student) redirect('/student/setup');

  let latest = await getLatestEmployability(student.id);
  // If no history but skills may exist, compute once
  if (!latest) {
    await computeEmployabilityScore(student.id);
    latest = await getLatestEmployability(student.id);
  }

  const gaps = await getSkillGaps(student.id);
  const recommendations = buildRecommendations(gaps);

  const score = latest && latest.skills_measured > 0 ? latest.score : null;
  const label = latest?.classification_label ?? 'Not classified yet';
  const provisional = latest?.is_provisional ?? true;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="page-navigation bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/student/dashboard" className="flex items-center gap-2">
              <span className="text-sm font-semibold">Campus-to-Corporate</span>
              <span className="font-semibold text-slate-900">Student</span>
            </Link>

          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600 hidden sm:inline">{profile?.full_name}</span>
            <Link href="/" className="text-slate-500 hover:text-slate-900" title="Home">
              <Home className="w-4 h-4" />
            </Link>
            <form action={logout}>
              <button type="submit" className="text-slate-500 hover:text-slate-900 flex items-center gap-1">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Employability Score</h1>
            <p className="text-sm text-slate-500 mt-1">
              Weighted from your formal skill assessments. Classifications and weights are configurable by the platform.
            </p>
          </div>
          <RefreshScoreButton />
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm sm:col-span-1">
            <p className="text-sm text-slate-500">Current score</p>
            <p className="mt-1 text-4xl font-bold text-slate-900">
              {score === null ? 'Not assessed' : Math.round(score)}
              <span className="text-lg text-slate-400 font-normal">{score === null ? '' : ' / 100'}</span>
            </p>
            {provisional && (
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 inline-block px-2 py-0.5 rounded">
                Provisional — not all weighted skills measured yet
              </p>
            )}
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm sm:col-span-2">
            <p className="text-sm text-slate-500">Classification</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{label}</p>
            <p className="mt-2 text-xs text-slate-500">
              Measured skills: {latest?.skills_measured ?? 0} / {latest?.skills_weighted ?? 0}
              {latest?.computed_at
                ? ` · Updated ${new Date(latest.computed_at).toLocaleString('en-IN')}`
                : ''}
            </p>
          </div>
        </div>

        {/* Skill contribution */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 mb-8">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Skill contribution
          </h2>
          {!latest?.breakdown?.length ? (
            <p className="text-sm text-slate-500">
              Complete formal assessments to build your skill profile and employability score.
            </p>
          ) : (
            <ul className="space-y-3">
              {latest.breakdown.map((b) => (
                <li key={b.skill_id} className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="sm:w-40 text-sm font-medium text-slate-800">{b.name}</div>
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${b.included ? 'bg-blue-600' : 'bg-slate-300'}`}
                        style={{ width: `${b.included ? Math.min(100, Number(b.proficiency) || 0) : 0}%` }}
                      />
                    </div>
                    <span className="text-sm tabular-nums text-slate-700 w-24 text-right">
                      {b.included ? `${Math.round(Number(b.proficiency))}%` : '—'}
                      <span className="text-xs text-slate-400"> · w{b.weight_percent}%</span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Gaps */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 mb-8">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4" /> Skill gaps
          </h2>
          {gaps.length === 0 ? (
            <p className="text-sm text-slate-500">
              No gaps against current targets, or skills not yet measured.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Skill</th>
                    <th className="py-2 pr-4 font-medium">Current</th>
                    <th className="py-2 pr-4 font-medium">Target</th>
                    <th className="py-2 font-medium">Gap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {gaps.map((g) => (
                    <tr key={g.skill_id}>
                      <td className="py-2.5 pr-4 font-medium text-slate-900">{g.name}</td>
                      <td className="py-2.5 pr-4">{Math.round(g.proficiency ?? 0)}%</td>
                      <td className="py-2.5 pr-4">{g.target}%</td>
                      <td className="py-2.5 text-red-600 font-medium">{Math.round(g.gap)} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recommendations */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Recommended next steps</h2>
          {recommendations.length === 0 ? (
            <p className="text-sm text-slate-500">
              Keep completing formal assessments. Recommendations appear when skill gaps are detected.
            </p>
          ) : (
            <ul className="space-y-3">
              {recommendations.map((r, i) => (
                <li
                  key={`${r.skill_code}-${i}`}
                  className="border border-slate-100 rounded-lg px-4 py-3 text-sm"
                >
                  <span
                    className={`text-xs font-medium uppercase tracking-wide ${
                      r.priority === 'high'
                        ? 'text-red-600'
                        : r.priority === 'medium'
                          ? 'text-amber-600'
                          : 'text-slate-500'
                    }`}
                  >
                    {r.priority} priority · {r.skill_name}
                  </span>
                  <p className="text-slate-700 mt-1">{r.message}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/student/learning"
              className="text-sm text-blue-600 hover:underline"
            >
              Go to My Learning →
            </Link>
            <Link href="/student/assessments" className="text-sm text-blue-600 hover:underline">
              Take assessments →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
