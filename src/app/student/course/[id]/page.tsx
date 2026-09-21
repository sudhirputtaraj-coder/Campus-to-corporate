import { requireLearningAccess } from '@/lib/programme/require-access';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, LogOut, CheckCircle2, Circle, PlayCircle } from 'lucide-react';
import { logout } from '@/lib/auth/actions';

export default async function StudentCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = await params;
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
  await requireLearningAccess();

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('*')
    .eq('student_id', student.id)
    .eq('course_id', courseId)
    .in('status', ['ACTIVE', 'COMPLETED'])
    .maybeSingle();

  if (!enrollment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-700 font-medium">You don&apos;t have permission to access this resource.</p>
          <Link href="/student/learning" className="text-blue-600 text-sm mt-2 inline-block">
            ← Back to My Learning
          </Link>
        </div>
      </div>
    );
  }

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (!course) notFound();

  const { data: modules } = await supabase
    .from('modules')
    .select('*, lessons(*)')
    .eq('course_id', courseId)
    .eq('status', 'ACTIVE')
    .order('sequence', { ascending: true });

  // Sort lessons by sequence
  const mods = (modules || []).map((m: any) => ({
    ...m,
    lessons: (m.lessons || [])
      .filter((l: any) => l.status === 'ACTIVE')
      .sort((a: any, b: any) => a.sequence - b.sequence),
  }));

  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('lesson_id, status')
    .eq('student_id', student.id)
    .eq('course_id', courseId);

  const progressMap = new Map((progress || []).map((p) => [p.lesson_id, p.status]));
  const pct = Number(enrollment.completion_percentage) || 0;

  const { data: assessments } = await supabase
    .from('assessments')
    .select('id, title, type, duration_minutes, passing_score')
    .eq('course_id', courseId)
    .eq('status', 'ACTIVE');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/student/learning" className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <GraduationCap className="w-5 h-5 text-slate-900" />
            <span className="hidden sm:inline">My Learning</span>
          </Link>
          <form action={logout}>
            <button type="submit" className="text-slate-500 hover:text-slate-900 flex items-center gap-1 text-sm">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">{course.category}</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">{course.title}</h1>
        {course.description && (
          <p className="text-slate-600 mt-2 max-w-2xl">{course.description}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <span>Level: {course.level}</span>
          <span>Duration: {course.duration_minutes || 0} min</span>
          <span className="font-medium text-slate-800">Progress: {pct}%</span>
        </div>
        <div className="mt-3 h-2 max-w-md bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
        </div>

        <section className="mt-10 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900">Modules & Lessons</h2>
          {mods.length === 0 ? (
            <p className="text-slate-500 text-sm">No modules published yet.</p>
          ) : (
            mods.map((mod: any) => (
              <div key={mod.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-medium text-slate-900">
                    {mod.sequence}. {mod.title}
                  </h3>
                  {mod.description && (
                    <p className="text-sm text-slate-500 mt-0.5">{mod.description}</p>
                  )}
                </div>
                <ul className="divide-y divide-slate-100">
                  {(mod.lessons || []).map((lesson: any) => {
                    const st = progressMap.get(lesson.id);
                    return (
                      <li key={lesson.id}>
                        <Link
                          href={`/student/lesson/${lesson.id}`}
                          className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition"
                        >
                          {st === 'COMPLETED' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                          ) : st === 'IN_PROGRESS' ? (
                            <PlayCircle className="w-5 h-5 text-blue-600 shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-300 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900">{lesson.title}</p>
                            <p className="text-xs text-slate-500">
                              {lesson.duration_minutes || 0} min
                              {st === 'COMPLETED' ? ' · Completed' : st === 'IN_PROGRESS' ? ' · In progress' : ''}
                            </p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </section>

        {assessments && assessments.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Assessments</h2>
            <div className="grid gap-3">
              {assessments.map((a) => (
                <Link
                  key={a.id}
                  href={`/student/assessment/${a.id}`}
                  className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between hover:border-slate-300 transition"
                >
                  <div>
                    <p className="font-medium text-slate-900">{a.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {a.type} · {a.duration_minutes} min · Pass: {a.passing_score}%
                    </p>
                  </div>
                  <span className="text-sm text-blue-600 font-medium">Start →</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
