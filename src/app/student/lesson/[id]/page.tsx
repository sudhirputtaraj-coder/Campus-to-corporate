import { loadLearningPath } from '@/lib/learning/path-data';
import { requireLearningAccess } from '@/lib/programme/require-access';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Home } from 'lucide-react';
import { logout } from '@/lib/auth/actions';
import { touchLesson } from '@/lib/learning/actions';
import { MarkCompleteButton } from './mark-complete-button';
import { LessonContent } from '../lesson-content';

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
  await requireLearningAccess();

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

  // Follow the same cross-module and cross-course sequence as My Learning Path.
  const path=await loadLearningPath(student.id);
  const idx=path.lessons.findIndex(l=>l.id===lessonId);
  const prev=idx>0?path.lessons[idx-1]:null;
  const next=idx>=0?path.lessons[idx+1]||null:null;

  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('status')
    .eq('student_id', student.id)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  const isComplete = progress?.status === 'COMPLETED';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="page-navigation bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href={`/student/course/${courseId}`}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <span className="text-sm font-semibold">Campus-to-Corporate</span>
            <span className="truncate max-w-[180px] sm:max-w-xs">
              {lesson.module?.course?.title || 'Course'}
            </span>
          </Link>
          <Link href="/" className="text-slate-500 hover:text-slate-900" title="Home">
            <Home className="w-4 h-4" />
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
            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
              <LessonContent content={lesson.content} />
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-slate-500 text-sm">
              No content available for this lesson yet.
            </div>
          )}
        </article>
        {typeof lesson.resource_url === 'string' && lesson.resource_url.startsWith('https://') && (
          <a href={lesson.resource_url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 underline">
            Open reading material (new tab)
          </a>
        )}

        {Array.isArray(lesson.practice_questions) && lesson.practice_questions.length>0 && <section className="mt-6 rounded-xl border bg-white p-5"><h2 className="text-lg font-semibold">Practise what you learned</h2><p className="mt-2 text-sm">Think through each question before revealing the answer. This practice does not change your skill score.</p>{lesson.practice_questions.map((q:{question:string;answer:string},i:number)=><details key={i} className="mt-4 border-t pt-3"><summary className="cursor-pointer font-medium">{i+1}. {q.question}</summary><p className="mt-3 whitespace-pre-wrap break-words">{q.answer}</p></details>)}</section>}
        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap gap-2">
            {prev ? (
              <Link
                prefetch={false} href={`/student/lesson/${prev.id}`}
                className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                ← Previous
              </Link>
            ) : (
              <span className="px-4 py-2.5 text-sm text-slate-300">← Previous</span>
            )}
            {next ? (
              <Link
                prefetch={false} href={`/student/lesson/${next.id}`}
                className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Next lesson →
              </Link>
            ) : (
              <Link
                href="/student/assessments"
                className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Review assessments
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
