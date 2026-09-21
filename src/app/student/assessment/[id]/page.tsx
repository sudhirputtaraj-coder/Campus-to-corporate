import { requireLearningAccess } from '@/lib/programme/require-access';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, LogOut } from 'lucide-react';
import { logout } from '@/lib/auth/actions';
import { AssessmentForm } from './assessment-form';

export default async function TakeAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: assessmentId } = await params;
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

  const { data: assessment } = await supabase
    .from('assessments')
    .select('*, course:courses(id, title)')
    .eq('id', assessmentId)
    .eq('status', 'ACTIVE')
    .single();

  if (!assessment) notFound();

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', student.id)
    .eq('course_id', assessment.course_id)
    .in('status', ['ACTIVE', 'COMPLETED'])
    .maybeSingle();

  if (!enrollment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <p className="text-slate-700">You don&apos;t have permission to access this resource.</p>
      </div>
    );
  }

  // Safe columns only — using questions_public view (no correct_answer column exposed)
  const { data: questions } = await supabase
    .from('questions_public')
    .select('id, assessment_id, question_text, question_type, options, marks, skill_category, sequence')
    .eq('assessment_id', assessmentId)
    .order('sequence', { ascending: true });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/student/assessments" className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <GraduationCap className="w-5 h-5 text-slate-900" />
            Assessments
          </Link>
          <form action={logout}>
            <button type="submit" className="text-slate-500 hover:text-slate-900 flex items-center gap-1 text-sm">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900">{assessment.title}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {(assessment.course as any)?.title} · {assessment.type} · {assessment.duration_minutes} min ·
          Pass mark: {assessment.passing_score}% · Max attempts: {assessment.max_attempts}
        </p>
        {assessment.description && (
          <p className="text-slate-600 mt-3 text-sm">{assessment.description}</p>
        )}

        {!questions || questions.length === 0 ? (
          <div className="mt-8 bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
            No questions available for this assessment yet.
          </div>
        ) : (
          <AssessmentForm
            assessmentId={assessmentId}
            questions={questions.map((q) => ({
              id: q.id,
              question_text: q.question_text,
              question_type: q.question_type,
              options: Array.isArray(q.options) ? q.options : [],
              marks: Number(q.marks) || 1,
              sequence: q.sequence,
            }))}
          />
        )}
      </main>
    </div>
  );
}
