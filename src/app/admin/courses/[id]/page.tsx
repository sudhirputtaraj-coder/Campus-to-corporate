import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, LogOut } from 'lucide-react';
import { logout } from '@/lib/auth/actions';
import { CourseStructureForms } from './structure-forms';

export default async function AdminCourseDetailPage({
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'SUPER_ADMIN') redirect('/login');

  const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).single();
  if (!course) notFound();

  const { data: modules } = await supabase
    .from('modules')
    .select('*, lessons(*)')
    .eq('course_id', courseId)
    .order('sequence', { ascending: true });

  const mods = (modules || []).map((m: any) => ({
    ...m,
    lessons: (m.lessons || []).sort((a: any, b: any) => a.sequence - b.sequence),
  }));

  const { data: assessments } = await supabase
    .from('assessments')
    .select('*, questions(id, question_text, question_type, marks, sequence, skill_category)')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  const assessmentsWithQs = (assessments || []).map((a: any) => ({
    ...a,
    questions: (a.questions || []).sort((x: any, y: any) => x.sequence - y.sequence),
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/admin/courses" className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <GraduationCap className="w-5 h-5 text-slate-900" />
            Courses
          </Link>
          <form action={logout}>
            <button type="submit" className="text-slate-500 hover:text-slate-900 flex items-center gap-1 text-sm">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-xs font-medium text-blue-600 uppercase">{course.category}</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">{course.title}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {course.level} · {course.duration_minutes} min · {course.status}
        </p>
        {course.description && <p className="text-slate-600 mt-2">{course.description}</p>}

        <CourseStructureForms
          courseId={courseId}
          modules={mods.map((m: any) => ({
            id: m.id,
            title: m.title,
            sequence: m.sequence,
            description: m.description,
            lessons: (m.lessons || []).map((l: any) => ({
              id: l.id,
              title: l.title,
              sequence: l.sequence,
              duration_minutes: l.duration_minutes,
            })),
          }))}
          assessments={assessmentsWithQs.map((a: any) => ({
            id: a.id,
            title: a.title,
            type: a.type,
            questions: a.questions || [],
          }))}
        />
      </main>
    </div>
  );
}
