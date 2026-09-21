'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from './require-admin';

export async function setupCollegeAccount(form: FormData) {
  try {
    const { client } = await requireAdmin();
    const parsed = z.object({ user_id: z.string().uuid(), college_id: z.string().uuid(),
      kind: z.enum(['COLLEGE_ADMIN', 'COLLEGE_STUDENT']), register_number: z.string().trim().max(80),
      confirmed: z.literal('yes'),
    }).safeParse(Object.fromEntries(form));
    if (!parsed.success || (parsed.data.kind === 'COLLEGE_STUDENT' && !parsed.data.register_number)) {
      return { error: 'Select a college and account type, enter the student register number if needed, and confirm the assignment.' };
    }
    const { user_id, college_id, kind, register_number } = parsed.data;
    const { error } = await client.rpc('fn_setup_college_account', { p_user_id: user_id, p_college_id: college_id, p_kind: kind, p_register_number: register_number });
    if (error) {
      if (error.code === '23505') return { error: 'That register number is already assigned at this college.' };
      if (error.code === 'P0001') return { error: error.message };
      return { error: 'College setup is unavailable. Check that migration 013 has been applied, then try again.' };
    }
    revalidatePath('/admin/users'); revalidatePath('/admin/dashboard');
    return { success: true };
  } catch { return { error: 'Please sign in as an active Super Admin and try again.' }; }
}
