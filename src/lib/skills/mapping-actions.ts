'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { parseSkillMappings } from './mapping-validation';

export async function saveQuestionSkills(questionId: string, input: unknown) {
  const client = await createClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return { error: 'Sign in as Super Admin.' };
  const { data: profile, error: profileError } = await client.from('profiles').select('role, status').eq('user_id', user.id).single();
  if (profileError || profile?.role !== 'SUPER_ADMIN' || profile.status !== 'ACTIVE') return { error: 'An active Super Admin account is required.' };
  const result = parseSkillMappings(input);
  if (result.error) return { error: result.error };
  const { error } = await client.rpc('fn_set_question_skills', { p_question_id: questionId, p_mappings: result.mappings });
  if (error) return { error: 'Could not save. Use active skills totalling 100%, on an assessment with no attempts.' };
  revalidatePath('/admin/courses', 'layout');
  return { success: true };
}
