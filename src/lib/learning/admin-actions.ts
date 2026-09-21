'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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

export async function createModule(courseId: string, formData: FormData) {
  const { supabase, user, error } = await requireSuperAdmin();
  if (error || !user) return { error: error || 'Unauthorized' };

  const title = (formData.get('title') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const sequence = parseInt(String(formData.get('sequence') || '1'), 10) || 1;
  if (!title) return { error: 'Title is required.' };

  const skillId = String(formData.get('skill_id') || '').trim();
  if (skillId) {
    const { data: skill, error: skillError } = await supabase.from('skills').select('id').eq('id', skillId).eq('status', 'ACTIVE').maybeSingle();
    if (skillError || !skill) return { error: 'Choose an active skill.' };
  }

  const { error: err } = await supabase.from('modules').insert({
    course_id: courseId,
    skill_id: skillId || null,
    title,
    description,
    sequence,
    status: 'ACTIVE',
  });
  if (err) {
    console.error(err);
    return { error: 'Something went wrong. Please try again.' };
  }
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'MODULE_CREATED',
    entity_type: 'course',
    entity_id: courseId,
    metadata: { title },
  });
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath('/admin/skills');
  revalidatePath('/student/skills', 'layout');
  return { success: true };
}

export async function assignModuleSkill(moduleId: string, courseId: string, formData: FormData) {
  const { supabase, user, error } = await requireSuperAdmin();
  if (error || !user) return { error: error || 'Unauthorized' };
  const skillId = String(formData.get('skill_id') || '').trim();
  if (skillId) {
    const { data: skill, error: skillError } = await supabase.from('skills').select('id').eq('id', skillId).eq('status', 'ACTIVE').maybeSingle();
    if (skillError || !skill) return { error: 'Choose an active skill.' };
  }
  const { data, error: updateError } = await supabase.from('modules').update({ skill_id: skillId || null })
    .eq('id', moduleId).eq('course_id', courseId).select('id').maybeSingle();
  if (updateError || !data) return { error: 'The module could not be updated.' };
  revalidatePath(`/admin/courses/${courseId}`);
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
    status: 'ACTIVE',
  });
  if (err) {
    console.error(err);
    return { error: 'Something went wrong. Please try again.' };
  }
  revalidatePath(`/admin/courses/${courseId}`);
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
  const passing = parseFloat(String(formData.get('passing_score') || '60')) || 60;
  if (!title) return { error: 'Title is required.' };

  const { data, error: err } = await supabase
    .from('assessments')
    .insert({
      course_id: courseId,
      title,
      description,
      type,
      duration_minutes: duration,
      passing_score: passing,
      status: 'ACTIVE',
      created_by: user.id,
    })
    .select('id')
    .single();

  if (err) {
    console.error(err);
    return { error: 'Something went wrong. Please try again.' };
  }
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'ASSESSMENT_CREATED',
    entity_type: 'assessment',
    entity_id: data.id,
    metadata: { course_id: courseId, title },
  });
  revalidatePath(`/admin/courses/${courseId}`);
  return { success: true, id: data.id };
}

export async function createQuestion(assessmentId: string, courseId: string, formData: FormData) {
  const { supabase, user, error } = await requireSuperAdmin();
  if (error || !user) return { error: error || 'Unauthorized' };

  const question_text = (formData.get('question_text') as string)?.trim();
  const question_type = (formData.get('question_type') as string) || 'MCQ';
  const correct_answer = (formData.get('correct_answer') as string)?.trim() || null;
  const marks = parseFloat(String(formData.get('marks') || '1')) || 1;
  const skill_category = (formData.get('skill_category') as string)?.trim() || null;
  const sequence = parseInt(String(formData.get('sequence') || '1'), 10) || 1;
  const optionsRaw = (formData.get('options') as string)?.trim() || '';
  const options = optionsRaw
    ? optionsRaw.split('|').map((s) => s.trim()).filter(Boolean)
    : question_type === 'TRUE_FALSE'
      ? ['True', 'False']
      : [];

  if (!question_text) return { error: 'Question text is required.' };

  const { error: err } = await supabase.from('questions').insert({
    assessment_id: assessmentId,
    question_text,
    question_type,
    options,
    correct_answer,
    marks,
    skill_category,
    sequence,
  });

  if (err) {
    console.error(err);
    return { error: 'Something went wrong. Please try again.' };
  }
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'QUESTION_CREATED',
    entity_type: 'assessment',
    entity_id: assessmentId,
  });
  revalidatePath(`/admin/courses/${courseId}`);
  return { success: true };
}
