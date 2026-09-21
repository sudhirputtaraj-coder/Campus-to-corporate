'use server';
import { randomUUID } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { parseContent } from './content-validation';

async function admin() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  const { data: profile, error: profileError } = await client.from('profiles').select('role, status').eq('user_id', user.id).single();
  return !profileError && profile?.role === 'SUPER_ADMIN' && profile.status === 'ACTIVE' ? client : null;
}
function refresh() {
  revalidatePath('/admin/skills', 'layout');
  revalidatePath('/admin/courses', 'layout');
  revalidatePath('/student', 'layout');
}

export async function saveSkill(id: string | null, form: FormData) {
  const client = await admin();
  if (!client) return { error: 'An active Super Admin account is required.' };
  const parsed = parseContent(form, 'skill');
  if (parsed.error) return { error: parsed.error };
  // Keep the original skill ID/code and all assessment mappings when renaming.
  const query = id ? client.from('skills').update(parsed.values).eq('id', id)
    : client.from('skills').insert({ ...parsed.values, code: `CUSTOM_${randomUUID().replaceAll('-', '')}` });
  const { data, error } = await query.select('id').maybeSingle();
  if (error || !data) return { error: 'Skill could not be saved. Please try again.' };
  refresh(); return { success: true };
}

export async function saveModule(id: string, form: FormData) {
  const client = await admin();
  if (!client) return { error: 'An active Super Admin account is required.' };
  const parsed = parseContent(form, 'module');
  if (parsed.error) return { error: parsed.error };
  const skillId = String(form.get('skill_id') || '');
  if (skillId) {
    const { data, error } = await client.from('skills').select('id').eq('id', skillId).maybeSingle();
    if (error || !data) return { error: 'Choose an existing skill.' };
  }
  const { data, error } = await client.from('modules').update({ ...parsed.values, skill_id: skillId || null }).eq('id', id).select('id').maybeSingle();
  if (error || !data) return { error: 'Module could not be saved.' };
  refresh(); return { success: true };
}

export async function saveLesson(id: string | null, moduleId: string, form: FormData) {
  const client = await admin();
  if (!client) return { error: 'An active Super Admin account is required.' };
  const parsed = parseContent(form, 'lesson');
  if (parsed.error) return { error: parsed.error };
  const { data: parent, error: parentError } = await client.from('modules').select('id').eq('id', moduleId).maybeSingle();
  if (parentError || !parent) return { error: 'Module could not be found.' };
  const query = id ? client.from('lessons').update(parsed.values).eq('id', id).eq('module_id', moduleId)
    : client.from('lessons').insert({ ...parsed.values, module_id: moduleId });
  const { data, error } = await query.select('id').maybeSingle();
  if (error || !data) return { error: 'Lesson could not be saved.' };
  refresh(); return { success: true };
}
