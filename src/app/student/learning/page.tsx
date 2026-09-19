import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, LogOut, BookOpen, ArrowRight } from 'lucide-react';
import { logout } from '@/lib/auth/actions';
import ProgrammeStatus from '../programme-status';

export default async function StudentLearningPage() {
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

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, account_type')
    .eq('user_id', user.id)
    .maybeSingle();

  if (studentError) throw new Error('Unable to load your student profile. Please try again.');
  if (!student) {
    redirect('/student/setup');
  }

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('*, course:courses(*)')
    .eq('student_id', student.id)
    .in('status', ['ACTIVE', 'COMPLETED'])
    .order('enrollment_date', { ascending: false });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/student/dashboard" className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-slate-900" />
              <span className="font-semibold text-slate-900">Student</span>
            </Link>
            <nav className="hidden sm:flex gap-4 text-sm text-slate-600">
              <Link href="/student/dashboard" className="hover:text-slate-900">
                Dashboard
              </Link>
              <span className="text-slate-900 font-medium">My Learning</span>
              <Link href="/student/assessments" className="hover:text-slate-900">
                Assessments
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600 hidden sm:inline">{profile?.full_name}</span>
            <form action={logout}>
              <button type="submit" className="text-slate-500 hover:text-slate-900 flex items-center gap-1">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">My Learning</h1>
        {student.account_type === 'INDIVIDUAL' && <ProgrammeStatus />}

        {!enrollments || enrollments.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">You don&apos;t have any courses assigned yet.</p>
            <p className="text-sm text-slate-400 mt-1">
              {student.account_type === 'INDIVIDUAL'
                ? 'Programme courses will appear here after enrolment. Check your programme status above.'
                : 'Your college will enroll you in courses when they are assigned to your batch.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {enrollments.map((enr: any) => {
              const course = enr.course;
              const pct = Number(enr.completion_percentage) || 0;
              return (
                <div
                  key={enr.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                      {course?.category || 'Course'}
                    </p>
                    <h2 className="text-lg font-semibold text-slate-900 mt-0.5 truncate">
                      {course?.title || 'Untitled course'}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                      {course?.description || 'No description'}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 max-w-xs h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-700 tabular-nums">
                        {pct}%
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {enr.status}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/student/course/${course?.id}`}
                    className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 shrink-0"
                  >
                    {pct > 0 ? 'Continue Learning' : 'Start Course'}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
