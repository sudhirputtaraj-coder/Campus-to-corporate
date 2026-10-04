'use server';
import { enrolBatch } from '@/lib/college/batch-enrolment';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/** Server-side action to sync/issue missing certificates for all 100% completed courses of the authenticated student */
export async function syncStudentCertificates() {
  const { supabase, student, error } = await getAuthStudent();
  if (error || !student) return { error: error || 'Unauthorized' };

  // Find all enrollments with completion_percentage >= 100
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id, completion_percentage')
    .eq('student_id', student.id)
    .gte('completion_percentage', 100);

  if (!enrollments || enrollments.length === 0) {
    return { success: true, count: 0 };
  }

  let issuedCount = 0;
  for (const enr of enrollments) {
    const cert = await checkAndIssueCertificate(student.id, enr.course_id);
    if (cert) issuedCount++;
  }

  revalidatePath('/student/certificates');
  revalidatePath('/student/dashboard');

  return { success: true, count: issuedCount };
}

/** Server-side helper to verify 100% completion and issue certificate if eligible */
export async function checkAndIssueCertificate(studentId: string, courseId: string) {
  const auth = await getAuthStudent();
  if (auth.error || auth.student?.id !== studentId) return null;
  const { data: id, error } = await auth.supabase.rpc('fn_issue_course_certificate', { p_course_id: courseId });
  if (error || !id) return null;
  const { data, error: readError } = await auth.supabase.from('certificates').select('*').eq('id', id).eq('student_id', studentId).maybeSingle();
  return readError ? null : data;
}

async function getAuthStudent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, student: null, error: 'Not authenticated' };

  const { data: student } = await supabase
    .from('students')
    .select('id, college_id, batch_id, user_id')
    .eq('user_id', user.id)
    .single();

  if (!student) return { supabase, user, student: null, error: 'Student profile not found' };
  const { data: allowed, error: accessError } = await supabase.rpc('fn_has_learning_access');
  if (accessError || allowed !== true) return { supabase, user, student: null, error: 'Active programme access is required. Check My Learning.' };
  return { supabase, user, student, error: null };
}

/** Mark a lesson complete — real DB update + recalc enrollment progress */
export async function markLessonComplete(lessonId: string, courseId: string) {
  const { supabase, student, error } = await getAuthStudent();
  if (error || !student) return { error: error || 'Unauthorized' };

  // Verify enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', student.id)
    .eq('course_id', courseId)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (!enrollment) {
    return { error: "You don't have permission to access this resource." };
  }

  const now = new Date().toISOString();
  const { error: upsertError } = await supabase.from('lesson_progress').upsert(
    {
      student_id: student.id,
      lesson_id: lessonId,
      course_id: courseId,
      status: 'COMPLETED',
      completed_at: now,
      last_accessed_at: now,
    },
    { onConflict: 'student_id,lesson_id' }
  );

  if (upsertError) {
    console.error('markLessonComplete', upsertError);
    return { error: 'Something went wrong. Please try again.' };
  }

  // Recalculate progress via RPC
  const { data: pct, error: rpcError } = await supabase.rpc('recalc_enrollment_progress', {
    p_student_id: student.id,
    p_course_id: courseId,
  });

  if (rpcError) {
    console.error('recalc_enrollment_progress', rpcError);
  }

  // Check and issue certificate if course is completed
  await checkAndIssueCertificate(student.id, courseId);

  await supabase.from('audit_logs').insert({
    user_id: student.user_id,
    action: 'LESSON_COMPLETED',
    entity_type: 'lesson',
    entity_id: lessonId,
    metadata: { course_id: courseId, completion_percentage: pct ?? null },
  });

  revalidatePath('/student/learning');
  revalidatePath(`/student/course/${courseId}`);
  revalidatePath('/student/dashboard');
  revalidatePath('/student/certificates');

  return { success: true, completion_percentage: pct ?? 0 };
}

/** Record lesson access (IN_PROGRESS) */
export async function touchLesson(lessonId: string, courseId: string) {
  const { supabase, student, error } = await getAuthStudent();
  if (error || !student) return { error: error || 'Unauthorized' };

  const { data: existing } = await supabase
    .from('lesson_progress')
    .select('id, status')
    .eq('student_id', student.id)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (existing?.status === 'COMPLETED') {
    await supabase
      .from('lesson_progress')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', existing.id);
    return { success: true };
  }

  await supabase.from('lesson_progress').upsert(
    {
      student_id: student.id,
      lesson_id: lessonId,
      course_id: courseId,
      status: 'IN_PROGRESS',
      last_accessed_at: new Date().toISOString(),
    },
    { onConflict: 'student_id,lesson_id' }
  );

  return { success: true };
}

/** Database-owned assessment lifecycle; no browser-accessible grading writes. */
export async function startAssessment(assessmentId: string): Promise<{ success?: boolean; error?: string; attemptId?: string; attemptNumber?: number }> {
  const { supabase, student, error } = await getAuthStudent();
  if (error || !student) return { error: error || 'Unauthorized' };
  if (!/^[0-9a-f-]{36}$/i.test(assessmentId)) return { error: 'Invalid assessment.' };
  const result = await supabase.rpc('fn_start_assessment', { p_assessment_id: assessmentId });
  if (result.error) return { error: result.error.code === 'P0001' ? result.error.message : 'Unable to start assessment. Check your connection or contact support (migration 035).' };
  if (!result.data || result.data.success !== true || typeof result.data.attemptId !== 'string') return { error: 'Assessment could not be started. Please contact support.' };
  return result.data as { success: boolean; attemptId: string; attemptNumber: number; error?: string };
}

export async function submitAssessment(attemptId: string, answers: { questionId: string; answerText: string }[]) {
  const { supabase, student, error } = await getAuthStudent();
  if (error || !student) return { error: error || 'Unauthorized' };
  if (!/^[0-9a-f-]{36}$/i.test(attemptId) || !Array.isArray(answers) || answers.length < 1 || answers.length > 200
    || answers.some(a => !a || typeof a.questionId !== 'string' || typeof a.answerText !== 'string'
      || !a.answerText.trim() || a.answerText.length > 4000)) return { error: 'Provide valid answers of up to 4,000 characters for every question.' };
  const result = await supabase.rpc('fn_submit_assessment', { p_attempt_id: attemptId, p_answers: answers });
  if (result.error) return { error: result.error.code === 'P0001' ? result.error.message : 'Submission could not be confirmed. Retry this attempt; if the problem continues, contact support.' };
  revalidatePath('/student', 'layout');
  revalidatePath('/college', 'layout');
  return result.data as { success?: boolean; error?: string; attemptId?: string; percentage?: number; obtainedMarks?: number; totalMarks?: number; passed?: boolean; status?: string };
}

/** Super Admin: create course */
export async function createCourse(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'SUPER_ADMIN') {
    return { error: "You don't have permission to access this resource." };
  }

  const title = (formData.get('title') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const category = (formData.get('category') as string)?.trim();
  const level = (formData.get('level') as string) || 'BEGINNER';
  const duration = parseInt(String(formData.get('duration_minutes') || '0'), 10) || 0;

  if (!title || !category) return { error: 'Title and category are required.' };

  const { data, error: insertError } = await supabase
    .from('courses')
    .insert({
      title,
      description,
      category,
      level,
      duration_minutes: duration,
      status: 'INACTIVE',
      created_by: user.id,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('createCourse', insertError);
    return { error: 'Something went wrong. Please try again.' };
  }

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'COURSE_CREATED',
    entity_type: 'course',
    entity_id: data.id,
    metadata: { title, category },
  });

  revalidatePath('/admin/courses');
  return { success: true, id: data.id };
}

/** College Admin: enroll students in a batch into a course */
export async function enrollBatchInCourse(batchId: string, courseId: string) {
  return enrolBatch(batchId, courseId);
}
