'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: 'Not authenticated' };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('user_id', user.id)
    .single();
  if (profile?.role !== 'SUPER_ADMIN' || profile.status !== 'ACTIVE') {
    return { supabase, user, error: "You don't have permission to access this resource." };
  }
  return { supabase, user, error: null };
}

export async function assignCourseSkill(courseId: string, formData: FormData) {
  const { supabase, user, error } = await requireSuperAdmin();
  if (error || !user) return { error: error || 'Unauthorized' };
  const skillId = String(formData.get('skill_id') || '').trim();
  if (!skillId) return { error: 'Choose a skill.' };
  const { data: skill, error: skillError } = await supabase.from('skills').select('id, name').eq('id', skillId).maybeSingle();
  if (skillError || !skill) return { error: 'Choose a skill from Manage Skills.' };
  const { data, error: saveError } = await supabase.from('courses').update({ skill_id: skill.id, category: skill.name }).eq('id', courseId).select('id').maybeSingle();
  if (saveError || !data) return { error: 'Unable to save the course skill. Check migration 038 has been applied.' };
  revalidatePath('/admin/courses');
  revalidatePath('/admin/skills');
  revalidatePath('/student', 'layout');
  revalidatePath('/admin/courses/' + courseId);
  return { success: true };
}

export async function createModule(courseId: string, formData: FormData) {
  const { supabase, user, error } = await requireSuperAdmin();
  if (error || !user) return { error: error || 'Unauthorized' };

  const title = (formData.get('title') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const sequence = parseInt(String(formData.get('sequence') || '1'), 10) || 1;
  if (!title) return { error: 'Title is required.' };

  const { data: course, error: courseError } = await supabase.from('courses').select('id, skill_id').eq('id', courseId).maybeSingle();
  if (courseError || !course) return { error: 'Choose an existing course.' };
  const skillId = String(formData.get('skill_id') || course.skill_id || '').trim();
  if (skillId) {
    const { data: skill, error: skillError } = await supabase.from('skills').select('id').eq('id', skillId).maybeSingle();
    if (skillError || !skill) return { error: 'Choose a skill from Manage Skills.' };
  }

  const { error: err } = await supabase.from('modules').insert({
    course_id: courseId,
    skill_id: skillId || null,
    title,
    description,
    sequence,
    status: 'INACTIVE',
  });
  if (err) {
    console.error(err);
    return { error: err.code === 'P0001' ? err.message : 'Something went wrong. Please try again.' };
  }
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'MODULE_CREATED',
    entity_type: 'course',
    entity_id: courseId,
    metadata: { title },
  });
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath('/admin/skills', 'layout');
  revalidatePath('/admin/skills');
  revalidatePath('/student/skills', 'layout');
  return { success: true };
}

export async function assignModuleSkill(moduleId: string, courseId: string, formData: FormData) {
  const { supabase, user, error } = await requireSuperAdmin();
  if (error || !user) return { error: error || 'Unauthorized' };
  const skillId = String(formData.get('skill_id') || '').trim();
  if (skillId) {
    const { data: skill, error: skillError } = await supabase.from('skills').select('id').eq('id', skillId).maybeSingle();
    if (skillError || !skill) return { error: 'Choose a skill from Manage Skills.' };
  }
  const { data, error: updateError } = await supabase.from('modules').update({ skill_id: skillId || null })
    .eq('id', moduleId).eq('course_id', courseId).select('id').maybeSingle();
  if (updateError || !data) return { error: 'The module could not be updated.' };
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath('/admin/skills', 'layout');
  revalidatePath('/admin/skills');
  revalidatePath('/student/skills', 'layout');
  return { success: true };
}

export async function createLesson(moduleId: string, courseId: string, formData: FormData) {
  const { supabase, user, error } = await requireSuperAdmin();
  if (error || !user) return { error: error || 'Unauthorized' };

  const title = (formData.get('title') as string)?.trim();
  const content = (formData.get('content') as string)?.trim() || null;
  const video_url = (formData.get('video_url') as string)?.trim() || null;
  const sequence = parseInt(String(formData.get('sequence') || '1'), 10) || 1;
  const duration = parseInt(String(formData.get('duration_minutes') || '0'), 10) || 0;
  if (!title) return { error: 'Title is required.' };

  if (video_url) {
    try {
      const url = new URL(video_url);
      if (url.protocol !== 'https:' || url.username || url.password) return { error: 'Use an HTTPS video embed link.' };
    } catch { return { error: 'Use a valid HTTPS video embed link.' }; }
  }
  const { data: parent, error: parentError } = await supabase.from('modules').select('id')
    .eq('id', moduleId).eq('course_id', courseId).maybeSingle();
  if (parentError || !parent) return { error: 'Choose a module in this course.' };

  const { error: err } = await supabase.from('lessons').insert({
    module_id: moduleId,
    title,
    content,
    video_url,
    sequence,
    duration_minutes: duration,
    status: 'INACTIVE',
  });
  if (err) {
    console.error(err);
    return { error: err.code === 'P0001' ? err.message : 'Something went wrong. Please try again.' };
  }
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath('/admin/skills', 'layout');
  revalidatePath('/student/skills', 'layout');
  return { success: true };
}

export async function createAssessment(courseId: string, formData: FormData) {
  const { supabase, user, error } = await requireSuperAdmin();
  if (error || !user) return { error: error || 'Unauthorized' };

  const title = (formData.get('title') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const type = (formData.get('type') as string) || 'MCQ';
  const duration = parseInt(String(formData.get('duration_minutes') || '30'), 10) || 30;
  const passing = Number(formData.get('passing_score') ?? 60);
  if (!title) return { error: 'Title is required.' };

  if (!['MCQ', 'MIXED', 'TRUE_FALSE'].includes(type) || !Number.isInteger(duration) || duration < 1 || duration > 240 || !Number.isFinite(passing) || passing < 0 || passing > 100) return { error: 'Choose an automatic assessment, 1–240 minutes, and a pass mark from 0 to 100.' };
  const lessonId = String(formData.get('lesson_id') || '').trim();
  if (lessonId) {
    const { data: lesson } = await supabase.from('lessons').select('id,module:modules!inner(course_id)').eq('id',lessonId).eq('module.course_id',courseId).maybeSingle();
    if (!lesson) return {error:'Choose a lesson in this module.'};
  }
  const { data, error: err } = await supabase
    .from('assessments')
    .insert({
      lesson_id: lessonId || null,
      course_id: courseId,
      title,
      description,
      type,
      duration_minutes: duration,
      passing_score: passing,
      status: 'INACTIVE',
      created_by: user.id,
      is_practice: formData.get('is_practice') === 'yes',
    })
    .select('id')
    .single();

  if (err) {
    console.error(err);
    return { error: err.code === 'P0001' ? err.message : 'Something went wrong. Please try again.' };
  }
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'ASSESSMENT_CREATED',
    entity_type: 'assessment',
    entity_id: data.id,
    metadata: { course_id: courseId, title },
  });
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath('/admin/skills', 'layout');
  return { success: true, id: data.id };
}

export async function createQuestion(assessmentId: string, courseId: string, formData: FormData) {
  const { supabase, user, error } = await requireSuperAdmin();
  if (error || !user) return { error: error || 'Unauthorized' };

  const question_text = (formData.get('question_text') as string)?.trim();
  const question_type = (formData.get('question_type') as string) || 'MCQ';
  const correct_answer = (formData.get('correct_answer') as string)?.trim() || null;
  const marks = Number(formData.get('marks') ?? 1);
  const skill_category = (formData.get('skill_category') as string)?.trim() || null;
  const sequence = parseInt(String(formData.get('sequence') || '1'), 10) || 1;
  const optionsRaw = (formData.get('options') as string)?.trim() || '';
  const options = optionsRaw
    ? optionsRaw.split('|').map((s) => s.trim()).filter(Boolean)
    : question_type === 'TRUE_FALSE'
      ? ['True', 'False']
      : [];

  if (!question_text) return { error: 'Question text is required.' };
  if (!['MCQ', 'MULTIPLE_CHOICE', 'TRUE_FALSE'].includes(question_type) || !correct_answer || !Number.isFinite(marks) || marks <= 0) return { error: 'Pilot assessments require an automatically graded question, a correct answer and positive marks.' };

  if (options.length < 2 || options.length > 10 || new Set(options.map(v => v.toLowerCase())).size !== options.length || !options.some(v => v.toLowerCase() === correct_answer.toLowerCase())) return { error: 'Use 2–10 distinct choices and a correct answer matching one choice.' };
  const questionId = String(formData.get('question_id') || '');
  if (questionId && !z.string().uuid().safeParse(questionId).success) return { error: 'Invalid question.' };
  const { data: parent, error: parentError } = await supabase.from('assessments').select('id,status').eq('id', assessmentId).eq('course_id', courseId).maybeSingle();
  if (parentError || !parent || parent.status === 'ACTIVE') return { error: 'Edit questions in a draft assessment. Hide an unused assessment, or create a draft copy of an attempted one.' };
  const values = {
    assessment_id: assessmentId,
    question_text,
    question_type,
    options,
    correct_answer,
    marks,
    skill_category,
    sequence,
  };
  const query = questionId ? supabase.from('questions').update(values).eq('id', questionId).eq('assessment_id', assessmentId) : supabase.from('questions').insert(values);
  const { data: saved, error: err } = await query.select('id').maybeSingle();
  if (!err && !saved) return { error: 'Question not found. Refresh and try again.' };

  if (err) {
    console.error(err);
    return { error: err.code === 'P0001' ? err.message : 'Something went wrong. Please try again.' };
  }
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: questionId ? 'QUESTION_UPDATED' : 'QUESTION_CREATED',
    entity_type: 'assessment',
    entity_id: assessmentId,
  });
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath('/admin/skills', 'layout');
  return { success: true };
}
