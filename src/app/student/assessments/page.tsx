import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LogOut, ClipboardList, Home } from 'lucide-react';
import { logout } from '@/lib/auth/actions';

export default async function StudentAssessmentsPage() {
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
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!student) redirect('/student/dashboard');

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', student.id)
    .in('status', ['ACTIVE', 'COMPLETED']);

  const courseIds = (enrollments || []).map((e) => e.course_id);

  let assessments: any[] = [];
  if (courseIds.length > 0) {
    const { data } = await supabase
      .from('assessments')
      .select('id, title, type, duration_minutes, passing_score, course_id, course:courses(title)')
      .in('course_id', courseIds)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false });
    assessments = data || [];
  }

  const { data: attempts } = await supabase
    .from('assessment_attempts')
    .select('id, assessment_id, attempt_number, status, percentage, passed, completed_at')
    .eq('student_id', student.id)
    .order('created_at', { ascending: false });

  const latestByAssessment = new Map<string, any>();
  (attempts || []).forEach((a) => {
    if (!latestByAssessment.has(a.assessment_id)) {
      latestByAssessment.set(a.assessment_id, a);
    }
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="page-navigation bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/student/dashboard" className="flex items-center gap-2">
              <span className="text-sm font-semibold">Campus-to-Corporate</span>
              <span className="font-semibold text-slate-900">Student</span>
            </Link>
            <nav className="hidden sm:flex gap-4 text-sm text-slate-600">
              <Link href="/student/dashboard" className="hover:text-slate-900">
                Dashboard
              </Link>
              <Link href="/student/learning" className="hover:text-slate-900">
                My Learning
              </Link>
              <span className="text-slate-900 font-medium">Assessments</span>
            </nav>
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
        <h1 className="text-2xl font-bold text-slate-900 mb-6">My Assessments</h1>

        {assessments.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No assessments are currently available.</p>
            <p className="text-sm text-slate-400 mt-1">
              Assessments appear here after you are enrolled in courses that include them.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {assessments.map((a) => {
              const latest = latestByAssessment.get(a.id);
              return (
                <div
                  key={a.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{a.title}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {(a.course as any)?.title || 'Course'} · {a.type} · {a.duration_minutes} min
                    </p>
                    {latest && (
                      <p className="text-xs text-slate-500 mt-1">
                        Attempt {latest.attempt_number}: {latest.status}
                        {latest.percentage != null ? ` · ${latest.percentage}%` : ''}
                        {latest.passed === true ? ' · Passed' : latest.passed === false ? ' · Not passed' : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {latest && ['GRADED', 'SUBMITTED', 'PENDING_EVALUATION'].includes(latest.status) && (
                      <Link
                        href={`/student/results/${latest.id}`}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        View Result
                      </Link>
                    )}
                    <Link
                      href={`/student/assessment/${a.id}`}
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
                    >
                      {latest?.status === 'IN_PROGRESS' ? 'Continue' : 'Start'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {attempts && attempts.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Assessment History</h2>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Attempt</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Score</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attempts.map((a) => (
                      <tr key={a.id}>
                        <td className="px-4 py-3">#{a.attempt_number}</td>
                        <td className="px-4 py-3">{a.status}</td>
                        <td className="px-4 py-3">
                          {a.percentage != null ? `${a.percentage}%` : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {a.completed_at
                            ? new Date(a.completed_at).toLocaleDateString('en-IN')
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {a.status !== 'IN_PROGRESS' && (
                            <Link
                              href={`/student/results/${a.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              View
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
