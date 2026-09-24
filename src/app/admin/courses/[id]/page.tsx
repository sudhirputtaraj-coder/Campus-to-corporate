import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Home } from 'lucide-react';
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
  const { data: skills, error: skillsError } = await supabase.from('skills').select('id, name').eq('status', 'ACTIVE').order('name');
  if (skillsError) throw new Error('Unable to load skills. Please try again.');

  const { data: modules } = await supabase
    .from('modules')
    .select('*, lessons(*)')
    .eq('course_id', courseId)
    .order('sequence', { ascending: true });

  const mods = (modules || []).map((m: any) => ({
    ...m,
    lessons: (m.lessons || []).sort((a: any, b: any) => a.sequence - b.sequence),
  }));

  const { data: assessments, error: assessmentsError } = await supabase
    .from('assessments')
    .select('*, questions(id, question_text, question_type, marks, sequence, skill_category, question_skills(skill_id, weight))')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (assessmentsError) throw new Error('Unable to load assessment skill mappings.');
  const assessmentsWithQs = await Promise.all((assessments || []).map(async (a: any) => {
    const { count, error } = await supabase.from('assessment_attempts').select('id', { count: 'exact', head: true }).eq('assessment_id', a.id);
    if (error) throw new Error('Unable to check assessment usage.');
    return {
    ...a,
    mapping_locked: (count ?? 0) > 0,
    questions: (a.questions || []).sort((x: any, y: any) => x.sequence - y.sequence),
  }; }));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="page-navigation bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/admin/courses" className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <span className="text-sm font-semibold">Campus-to-Corporate</span>
            Courses
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-xs font-medium text-blue-600 uppercase">{course.category}</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">{course.title}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {course.level} · {course.duration_minutes} min · {course.status}
        </p>
        {course.description && <p className="text-slate-600 mt-2">{course.description}</p>}

        <CourseStructureForms
          skills={skills || []}
          courseId={courseId}
          modules={mods.map((m: any) => ({
            id: m.id,
            skill_id: m.skill_id,
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
            mapping_locked: a.mapping_locked,
            is_practice: a.is_practice,
            questions: a.questions || [],
          }))}
        />
      </main>
    </div>
  );
}
