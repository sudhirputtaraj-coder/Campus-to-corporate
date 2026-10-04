'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/require-admin';

export async function changePublication(form: FormData) {
  const parsed = z.object({ kind: z.enum(['course', 'assessment']), id: z.string().uuid(), action: z.enum(['publish', 'hide', 'copy']), confirmed: z.literal('yes') }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Confirm the content action before continuing.' };
  const v = parsed.data;
  if (v.action === 'copy' && v.kind !== 'assessment') return { error: 'Only assessments can be copied here.' };
  try {
    const { client } = await requireAdmin();
    const { data, error } = v.action === 'copy' ? await client.rpc('fn_copy_assessment_draft', { p_id: v.id }) :
      await client.rpc('fn_set_content_visibility', { p_kind: v.kind, p_id: v.id, p_publish: v.action === 'publish' });
    if (error) return { error: error.code === 'P0001' ? error.message : 'Unable to save. Check migration 037 is applied and try again.' };
    revalidatePath('/admin', 'layout'); revalidatePath('/student', 'layout');
    return { success: true, id: v.action === 'copy' ? String(data) : undefined };
  } catch { return { error: 'Active Super Admin access is required. Your changes have not been saved.' }; }
}

export async function renameAssessmentDraft(form: FormData) {
  const parsed = z.object({ id: z.string().uuid(), title: z.string().trim().min(1).max(200) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Enter a title of up to 200 characters.' };
  try {
    const { client } = await requireAdmin();
    const { data, error } = await client.from('assessments').update({ title: parsed.data.title }).eq('id', parsed.data.id).eq('status', 'INACTIVE').select('id').maybeSingle();
    if (error || !data) return { error: 'Only a hidden assessment can be renamed here. Refresh and try again.' };
    revalidatePath('/admin/courses', 'layout'); return { success: true };
  } catch { return { error: 'Active Super Admin access is required.' }; }
}
