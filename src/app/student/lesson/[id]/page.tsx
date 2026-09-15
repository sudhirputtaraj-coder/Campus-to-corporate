import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, LogOut } from 'lucide-react';
import { logout } from '@/lib/auth/actions';
import { touchLesson } from '@/lib/learning/actions';
import { MarkCompleteButton } from './mark-complete-button';

export default async function StudentLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: lessonId } = await params;
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

  const { data: lesson } = await supabase
    .from('lessons')
    .select('*, module:modules(id, title, course_id, sequence, course:courses(id, title))')
    .eq('id', lessonId)
    .single();

  if (!lesson) notFound();

  const courseId = lesson.module?.course_id || lesson.module?.course?.id;
  if (!courseId) notFound();

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', student.id)
    .eq('course_id', courseId)
    .in('status', ['ACTIVE', 'COMPLETED'])
    .maybeSingle();

  if (!enrollment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <p className="text-slate-700">You don&apos;t have permission to access this resource.</p>
      </div>
    );
  }

  // Touch progress (non-blocking best-effort)
  await touchLesson(lessonId, courseId);

  // Sibling lessons for prev/next
  const { data: siblings } = await supabase
    .from('lessons')
    .select('id, title, sequence')
    .eq('module_id', lesson.module_id)
    .eq('status', 'ACTIVE')
    .order('sequence', { ascending: true });

  const idx = (siblings || []).findIndex((l) => l.id === lessonId);
  const prev = idx > 0 ? siblings![idx - 1] : null;
  const next = idx >= 0 && idx < (siblings?.length ?? 0) - 1 ? siblings![idx + 1] : null;

  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('status')
    .eq('student_id', student.id)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  const isComplete = progress?.status === 'COMPLETED';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href={`/student/course/${courseId}`}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <GraduationCap className="w-5 h-5 text-slate-900" />
            <span className="truncate max-w-[180px] sm:max-w-xs">
              {lesson.module?.course?.title || 'Course'}
            </span>
          </Link>
          <form action={logout}>
            <button type="submit" className="text-slate-500 hover:text-slate-900 flex items-center gap-1 text-sm">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-xs text-slate-500">
          Module {lesson.module?.sequence}: {lesson.module?.title}
        </p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">{lesson.title}</h1>
        <p className="text-sm text-slate-500 mt-1">{lesson.duration_minutes || 0} min</p>

        {lesson.video_url && (
          <div className="mt-6 aspect-video bg-slate-900 rounded-xl overflow-hidden">
            <iframe
              src={lesson.video_url}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={lesson.title}
            />
          </div>
        )}

        <article className="mt-6 prose prose-slate max-w-none">
          {lesson.content ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-slate-700 whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
              {lesson.content}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-slate-500 text-sm">
              No content available for this lesson yet.
            </div>
          )}
        </article>

        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex gap-2">
            {prev ? (
              <Link
                href={`/student/lesson/${prev.id}`}
                className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                ← Previous
              </Link>
            ) : (
              <span className="px-4 py-2.5 text-sm text-slate-300">← Previous</span>
            )}
            {next ? (
              <Link
                href={`/student/lesson/${next.id}`}
                className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Next →
              </Link>
            ) : (
              <Link
                href={`/student/course/${courseId}`}
                className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Back to course
              </Link>
            )}
          </div>
          <MarkCompleteButton
            lessonId={lessonId}
            courseId={courseId}
            initiallyComplete={isComplete}
          />
        </div>
      </main>
    </div>
  );
}
