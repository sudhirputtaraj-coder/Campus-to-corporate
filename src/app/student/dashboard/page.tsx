import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LogOut, BookOpen, ClipboardList, ArrowRight, Home } from 'lucide-react';
import { logout } from '@/lib/auth/actions';
import ProgrammeStatus from '../programme-status';

export default async function StudentDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('*, college:colleges(name), department:departments(name), batch:batches(name)')
    .eq('user_id', user.id)
    .maybeSingle();

  if (studentError) throw new Error('Unable to load your student profile. Please try again.');
  if (!student) redirect('/student/setup');

  let enrollments: any[] = [];
  let recentAttempts: any[] = [];

  if (student) {
    const { data: enr } = await supabase
      .from('enrollments')
      .select('*, course:courses(id, title, category)')
      .eq('student_id', student.id)
      .in('status', ['ACTIVE', 'COMPLETED'])
      .order('updated_at', { ascending: false })
      .limit(5);
    enrollments = enr || [];

    const { data: att } = await supabase
      .from('assessment_attempts')
      .select('id, percentage, status, completed_at, attempt_number, assessment:assessments(title)')
      .eq('student_id', student.id)
      .neq('status', 'IN_PROGRESS')
      .order('completed_at', { ascending: false })
      .limit(3);
    recentAttempts = att || [];
  }

  const continueCourse = enrollments.find(
    (e) => e.status === 'ACTIVE' && Number(e.completion_percentage) < 100
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="page-navigation bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Campus-to-Corporate</span>
              <span className="font-semibold text-slate-900">Student</span>
            </div>
            <nav className="hidden sm:flex gap-4 text-sm text-slate-600">
              <span className="text-slate-900 font-medium">Dashboard</span>
              <Link href="/student/skills" className="hover:text-slate-900">
                My Skills
              </Link>
              <Link href="/student/employability" className="hover:text-slate-900">
                Employability
              </Link>
              <Link href="/student/learning" className="hover:text-slate-900">
                My Learning
              </Link>
              <Link href="/student/assessments" className="hover:text-slate-900">
                Assessments
              </Link>
              <Link href="/student/certificates" className="hover:text-slate-900">
                Certificates
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600">{profile?.full_name}</span>
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
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Welcome, {profile?.full_name || 'Student'}
        </h1>
        <p className="text-slate-600 mb-8">
          {student.account_type === 'INDIVIDUAL' ? 'Individual student' : (student as any)?.college?.name || 'Your college'}
          {student.account_type !== 'INDIVIDUAL' && ` · ${student.register_number || '—'}`}
        </p>

        {student.account_type === 'INDIVIDUAL' && <ProgrammeStatus />}

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <Link href="/student/notifications" className="rounded-xl border p-4 font-medium">WhatsApp progress updates</Link>
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <p className="text-sm text-slate-500">Employability Score</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              Not yet available
            </p>
            <p className="mt-2 text-xs text-slate-500">
              View your individual skill measurements in My Skills.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <p className="text-sm text-slate-500">Profile completion</p>
            <p className="mt-1 text-4xl font-bold text-slate-900">
              {student?.profile_completion ?? 0}%
            </p>
          </div>
        </div>

        {continueCourse && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-blue-600 font-medium uppercase">Continue Learning</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {(continueCourse.course as any)?.title}
              </p>
              <p className="text-sm text-slate-500">
                {Number(continueCourse.completion_percentage) || 0}% complete
              </p>
            </div>
            <Link
              href={`/student/course/${(continueCourse.course as any)?.id}`}
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <Link
            href="/student/skills"
            className="p-4 rounded-xl border border-blue-200 bg-blue-50 hover:border-blue-400 transition-colors flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-slate-900">My Skills</p>
              <p className="text-sm text-slate-600 mt-0.5">Your proficiency, assessment evidence, and history</p>
            </div>
            <ArrowRight className="w-5 h-5 shrink-0 text-blue-700" />
          </Link>
          <Link
            href="/student/assessments"
            className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-slate-900">Assessments</p>
              <p className="text-sm text-slate-500 mt-0.5">
                Quizzes and tests
              </p>
            </div>
            <span className="text-slate-400 font-medium text-sm">→</span>
          </Link>

          <Link
            href="/student/certificates"
            className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-slate-900">Certificates</p>
              <p className="text-sm text-slate-500 mt-0.5">
                Earned course credentials
              </p>
            </div>
            <span className="text-slate-400 font-medium text-sm">→</span>
          </Link>
          <Link
            href="/student/assessments"
            className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition flex items-start gap-3"
          >
            <ClipboardList className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900">Assessments</p>
              <p className="text-sm text-slate-500 mt-0.5">
                {recentAttempts.length > 0
                  ? `Latest: ${recentAttempts[0].percentage ?? '—'}%`
                  : 'View and take assessments'}
              </p>
            </div>
          </Link>
        </div>

        {enrollments.length > 0 && (
          <section className="mb-8">
            <h2 className="font-semibold text-slate-900 mb-3">Enrolled courses</h2>
            <div className="space-y-2">
              {enrollments.map((e) => (
                <Link
                  key={e.id}
                  href={`/student/course/${(e.course as any)?.id}`}
                  className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3 hover:border-slate-300"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{(e.course as any)?.title}</p>
                    <p className="text-xs text-slate-500">{(e.course as any)?.category}</p>
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {Number(e.completion_percentage) || 0}%
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {recentAttempts.length > 0 && (
          <section className="mb-8">
            <h2 className="font-semibold text-slate-900 mb-3">Recent results</h2>
            <div className="space-y-2">
              {recentAttempts.map((a) => (
                <Link
                  key={a.id}
                  href={`/student/results/${a.id}`}
                  className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3 hover:border-slate-300"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {(a.assessment as any)?.title}
                    </p>
                    <p className="text-xs text-slate-500">Attempt #{a.attempt_number}</p>
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {a.percentage != null ? `${a.percentage}%` : a.status}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Coming in a future phase</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {['AI Career Mentor', 'Mock Interview', 'Resume'].map(
              (m) => (
                <div
                  key={m}
                  className="px-4 py-3 border border-dashed border-slate-300 rounded-lg text-slate-400"
                >
                  {m}
                </div>
              )
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
