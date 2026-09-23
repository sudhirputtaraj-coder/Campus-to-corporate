import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, LogOut, BarChart3 } from 'lucide-react';
import { logout } from '@/lib/auth/actions';
import { getCollegeAnalytics } from '@/lib/employability';

export default async function CollegeAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'COLLEGE_ADMIN' && profile?.role !== 'SUPER_ADMIN') {
    redirect('/login');
  }

  const analytics = await getCollegeAnalytics();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/college/dashboard" className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-slate-900" />
              <span className="font-semibold text-slate-900">College Admin</span>
            </Link>
            <nav className="hidden sm:flex gap-4 text-sm text-slate-600">
              <Link href="/college/dashboard" className="hover:text-slate-900">
                Dashboard
              </Link>
              <span className="text-slate-900 font-medium">Analytics</span>
              <Link href="/college/students" className="hover:text-slate-900">
                Students
              </Link>
            </nav>
          </div>
          <form action={logout}>
            <button type="submit" className="text-slate-500 hover:text-slate-900 flex items-center gap-1 text-sm">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-6 h-6 text-slate-700" />
          <h1 className="text-2xl font-bold text-slate-900">Employability Analytics</h1>
        </div>
        <p className="text-sm text-slate-500 mb-8 max-w-2xl">
          Aggregated from real student skill assessments and Phase 3 employability scores.
          Data is limited to your college by database security policies.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">Active students</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{analytics.total_students}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">With score &gt; 0</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{analytics.students_with_score}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">Average score</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {analytics.average_score != null ? analytics.average_score : '—'}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">Classifications tracked</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {Object.keys(analytics.classification_counts).length}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Placement readiness distribution</h2>
            {Object.keys(analytics.classification_counts).length === 0 ? (
              <p className="text-sm text-slate-500">
                No computed classifications yet. Students need formal assessments and score recalculation.
              </p>
            ) : (
              <ul className="space-y-2">
                {Object.entries(analytics.classification_counts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([label, count]) => (
                    <li key={label} className="flex justify-between text-sm">
                      <span className="text-slate-700">{label}</span>
                      <span className="font-medium text-slate-900">{count}</span>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Largest skill gaps (college)</h2>
            {analytics.top_skill_gaps.length === 0 ? (
              <p className="text-sm text-slate-500">No gap data available yet.</p>
            ) : (
              <ul className="space-y-2">
                {analytics.top_skill_gaps.map((g) => (
                  <li key={g.code} className="flex justify-between text-sm">
                    <span className="text-slate-700">
                      {g.name} <span className="text-slate-400">({g.n} students)</span>
                    </span>
                    <span className="font-medium text-red-600">{g.avg_gap} pts avg</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Average score by department</h2>
            {analytics.department_averages.length === 0 ? (
              <p className="text-sm text-slate-500">No department scores yet.</p>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-2 font-medium">Department</th>
                    <th className="py-2 font-medium">Avg</th>
                    <th className="py-2 font-medium">n</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {analytics.department_averages
                    .sort((a, b) => b.avg_score - a.avg_score)
                    .map((d) => (
                      <tr key={d.department_id || 'none'}>
                        <td className="py-2 text-slate-800">{d.department_name}</td>
                        <td className="py-2 font-medium">{d.avg_score}</td>
                        <td className="py-2 text-slate-500">{d.n}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Average score by batch</h2>
            {analytics.batch_averages.length === 0 ? (
              <p className="text-sm text-slate-500">No batch scores yet.</p>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-2 font-medium">Batch</th>
                    <th className="py-2 font-medium">Avg</th>
                    <th className="py-2 font-medium">n</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {analytics.batch_averages
                    .sort((a, b) => b.avg_score - a.avg_score)
                    .map((b) => (
                      <tr key={b.batch_id || 'none'}>
                        <td className="py-2 text-slate-800">{b.batch_name}</td>
                        <td className="py-2 font-medium">{b.avg_score}</td>
                        <td className="py-2 text-slate-500">{b.n}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
