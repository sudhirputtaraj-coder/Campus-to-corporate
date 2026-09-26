import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LogOut, ArrowRight, Home } from 'lucide-react';
import { logout } from '@/lib/auth/actions';
import { LearningPath } from '@/components/learning-path';
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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="page-navigation bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Campus-to-Corporate</span>
              <span className="font-semibold text-slate-900">Student</span>
            </div>

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

        <LearningPath studentId={student.id} compact />
        <Link className="mb-6 block rounded-xl border bg-white p-4" href="/student/communication-coach">Communication Coach — practise speaking in Kannada and English</Link>
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <Link className="rounded-xl border p-4" href="/student/assessments">Assessments — check what you have learned</Link>
          <Link className="rounded-xl border p-4" href="/student/skills">My Skill Scores — view assessment evidence</Link>
          <Link className="rounded-xl border p-4" href="/student/employability">Employability Summary — review your readiness</Link>
          <Link className="rounded-xl border p-4" href="/student/certificates">Certificates — view earned credentials</Link>
        </div>
        {student.account_type === 'INDIVIDUAL' && <details className="mb-6 rounded-xl border bg-white p-4"><summary className="cursor-pointer font-medium">Programme access and expiry</summary><ProgrammeStatus /></details>}
        <Link className="mb-6 inline-block text-sm underline" href="/student/notifications">WhatsApp preferences</Link>
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

      </main>
    </div>
  );
}
