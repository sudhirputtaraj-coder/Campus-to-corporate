'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { processAttemptSkills } from '@/lib/skills';

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
  const serviceClient = createServiceClient();

  // 1. Verify enrollment exists
  const { data: enrollment } = await serviceClient
    .from('enrollments')
    .select('id, completion_percentage, status')
    .eq('student_id', studentId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (!enrollment) return null;

  // 2. Check if completion >= 100%
  const pct = Number(enrollment.completion_percentage ?? 0);
  if (pct < 100) return null;

  // 3. Check if certificate already exists (idempotent)
  const { data: existingCert } = await serviceClient
    .from('certificates')
    .select('*')
    .eq('student_id', studentId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (existingCert) return existingCert;

  // 4. Generate unique certificate number & insert record
  const certNumber = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const { data: newCert, error } = await serviceClient
    .from('certificates')
    .insert({
      student_id: studentId,
      course_id: courseId,
      certificate_number: certNumber,
      issue_date: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    console.error('checkAndIssueCertificate error:', error);
    return null;
  }

  return newCert;
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

/** Start or resume an assessment attempt */
export async function startAssessment(assessmentId: string) {
  const { supabase, student, error } = await getAuthStudent();
  if (error || !student) return { error: error || 'Unauthorized' };

  const { data: assessment } = await supabase
    .from('assessments')
    .select('id, course_id, max_attempts, status')
    .eq('id', assessmentId)
    .eq('status', 'ACTIVE')
    .single();

  if (!assessment) return { error: 'Assessment not found or inactive.' };

  // Must be enrolled in the course
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', student.id)
    .eq('course_id', assessment.course_id)
    .in('status', ['ACTIVE', 'COMPLETED'])
    .maybeSingle();

  if (!enrollment) {
    return { error: "You don't have permission to access this resource." };
  }

  // Existing in-progress attempt?
  const { data: inProgress } = await supabase
    .from('assessment_attempts')
    .select('id, attempt_number')
    .eq('student_id', student.id)
    .eq('assessment_id', assessmentId)
    .eq('status', 'IN_PROGRESS')
    .maybeSingle();

  if (inProgress) {
    return { success: true, attemptId: inProgress.id, attemptNumber: inProgress.attempt_number };
  }

  // Count completed attempts
  const { count } = await supabase
    .from('assessment_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', student.id)
    .eq('assessment_id', assessmentId);

  const nextAttempt = (count ?? 0) + 1;
  if (nextAttempt > assessment.max_attempts) {
    return { error: `Maximum attempts (${assessment.max_attempts}) reached.` };
  }

  const { data: attempt, error: insertError } = await supabase
    .from('assessment_attempts')
    .insert({
      student_id: student.id,
      assessment_id: assessmentId,
      attempt_number: nextAttempt,
      status: 'IN_PROGRESS',
    })
    .select('id, attempt_number')
    .single();

  if (insertError || !attempt) {
    console.error('startAssessment', insertError);
    return { error: 'Something went wrong. Please try again.' };
  }

  return { success: true, attemptId: attempt.id, attemptNumber: attempt.attempt_number };
}

/**
 * Submit assessment answers and grade auto-gradable questions server-side.
 * correct_answer is never sent to the client.
 */
export async function submitAssessment(
  attemptId: string,
  answers: { questionId: string; answerText: string }[]
) {
  const { supabase, student, user, error } = await getAuthStudent();
  if (error || !student || !user) return { error: error || 'Unauthorized' };

  const { data: attempt } = await supabase
    .from('assessment_attempts')
    .select('id, student_id, assessment_id, status, attempt_number, created_at')
    .eq('id', attemptId)
    .eq('student_id', student.id)
    .single();

  if (!attempt) return { error: "You don't have permission to access this resource." };
  if (attempt.status !== 'IN_PROGRESS') {
    return { error: 'This attempt has already been submitted.' };
  }

  const { data: assessment } = await supabase
    .from('assessments')
    .select('course_id, passing_score, duration_minutes')
    .eq('id', attempt.assessment_id)
    .single();

  // Server-side timer enforcement
  const durationMinutes = Number(assessment?.duration_minutes ?? 0);
  if (durationMinutes > 0 && attempt.created_at) {
    const elapsedMs = Date.now() - new Date(attempt.created_at).getTime();
    const elapsedMinutes = elapsedMs / (1000 * 60);
    const graceBufferMinutes = 2; // 2 minute buffer for network latency
    if (elapsedMinutes > durationMinutes + graceBufferMinutes) {
      await supabase
        .from('assessment_attempts')
        .update({
          status: 'SUBMITTED',
          score: 0,
          percentage: 0,
          obtained_marks: 0,
          passed: false,
          completed_at: new Date().toISOString(),
        })
        .eq('id', attemptId);

      return { error: 'Assessment time limit exceeded. Attempt marked as timed out.' };
    }
  }

  // Load questions WITH correct answers (server-side only, via service client after verifying auth & attempt ownership)
  const serviceClient = createServiceClient();
  const { data: questions } = await serviceClient
    .from('questions')
    .select('id, question_type, correct_answer, marks')
    .eq('assessment_id', attempt.assessment_id);

  if (!questions || questions.length === 0) {
    return { error: 'No questions found for this assessment.' };
  }

  if (!answers || answers.length === 0) {
    return { error: 'Please answer all required questions before submitting.' };
  }

  const autoTypes = new Set(['MCQ', 'MULTIPLE_CHOICE', 'TRUE_FALSE']);
  let totalMarks = 0;
  let obtainedMarks = 0;
  let needsManual = false;

  const answerRows = questions.map((q: any) => {
    totalMarks += Number(q.marks) || 0;
    const submitted = answers.find((a) => a.questionId === q.id);
    const answerText = submitted?.answerText?.trim() ?? '';

    if (autoTypes.has(q.question_type) && q.correct_answer != null) {
      const isCorrect =
        answerText.toLowerCase() === String(q.correct_answer).trim().toLowerCase();
      const marks = isCorrect ? Number(q.marks) || 0 : 0;
      obtainedMarks += marks;
      return {
        attempt_id: attemptId,
        question_id: q.id,
        answer_text: answerText,
        is_correct: isCorrect,
        marks_awarded: marks,
      };
    }

    needsManual = true;
    return {
      attempt_id: attemptId,
      question_id: q.id,
      answer_text: answerText,
      is_correct: null,
      marks_awarded: 0,
    };
  });

  // Upsert answers
  const { error: ansError } = await supabase.from('assessment_answers').upsert(answerRows, {
    onConflict: 'attempt_id,question_id',
  });

  if (ansError) {
    console.error('submitAssessment answers', ansError);
    return { error: 'Something went wrong. Please try again.' };
  }

  const percentage =
    totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 10000) / 100 : 0;

  const passingScore = Number(assessment?.passing_score ?? 60);
  const status = needsManual ? 'PENDING_EVALUATION' : 'GRADED';
  const passed = needsManual ? null : percentage >= passingScore;

  const { error: updError } = await supabase
    .from('assessment_attempts')
    .update({
      status,
      score: obtainedMarks,
      percentage,
      total_marks: totalMarks,
      obtained_marks: obtainedMarks,
      passed,
      completed_at: new Date().toISOString(),
    })
    .eq('id', attemptId)
    .eq('student_id', student.id);

  if (updError) {
    console.error('submitAssessment attempt', updError);
    return { error: 'Something went wrong. Please try again.' };
  }

  // Phase 2A: non-fatal skill processing for formal GRADED attempts.
  // fn_process_attempt_skills() itself guards against practice/non-GRADED
  // attempts; this call must never block the student's submission.
  if (status === 'GRADED') {
    try {
      const skillResult = await processAttemptSkills(attemptId);
      if (!skillResult.success) {
        console.error('Skill calculation error (non-fatal):', skillResult.error);
      }
    } catch (err) {
      console.error('Skill calculation error (non-fatal):', err);
    }
  }

  // Course Progress & Certificate Connection
  if (passed && assessment?.course_id) {
    const courseId = assessment.course_id;

    // Recalculate completion percentage
    await supabase.rpc('recalc_enrollment_progress', {
      p_student_id: student.id,
      p_course_id: courseId,
    });

    // Check and issue certificate if course is completed
    await checkAndIssueCertificate(student.id, courseId);
  }

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'ASSESSMENT_SUBMITTED',
    entity_type: 'assessment_attempt',
    entity_id: attemptId,
    metadata: {
      assessment_id: attempt.assessment_id,
      percentage,
      status,
      attempt_number: attempt.attempt_number,
    },
  });

  revalidatePath('/student/assessments');
  revalidatePath('/student/dashboard');

  return {
    success: true,
    attemptId,
    percentage,
    obtainedMarks,
    totalMarks,
    passed,
    status,
  };
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
      status: 'ACTIVE',
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // RLS will enforce college scope on students/batches
  const { data: students, error: stErr } = await supabase
    .from('students')
    .select('id')
    .eq('batch_id', batchId)
    .eq('status', 'ACTIVE');

  if (stErr) {
    console.error('enrollBatchInCourse students', stErr);
    return { error: 'Something went wrong. Please try again.' };
  }

  if (!students || students.length === 0) {
    return { error: 'No active students found in this batch.' };
  }

  // Record batch-course assignment
  await supabase.from('batch_course_assignments').upsert(
    {
      batch_id: batchId,
      course_id: courseId,
      assigned_by: user.id,
      status: 'ACTIVE',
    },
    { onConflict: 'batch_id,course_id' }
  );

  const rows = students.map((s) => ({
    student_id: s.id,
    course_id: courseId,
    batch_id: batchId,
    status: 'ACTIVE' as const,
  }));

  const { error: enrErr } = await supabase.from('enrollments').upsert(rows, {
    onConflict: 'student_id,course_id',
    ignoreDuplicates: true,
  });

  if (enrErr) {
    console.error('enrollBatchInCourse enrollments', enrErr);
    return { error: 'Something went wrong. Please try again.' };
  }

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'BATCH_COURSE_ENROLLED',
    entity_type: 'batch',
    entity_id: batchId,
    metadata: { course_id: courseId, student_count: students.length },
  });

  revalidatePath('/college/dashboard');
  revalidatePath('/college/courses');
  return { success: true, enrolled: students.length };
}
