'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { collegeDirectoryAccess } from './student-directory';

const optionalId = z.union([z.literal(''), z.string().uuid()]);
const input = z.object({
  college_id: z.string().uuid(), action: z.enum(['add', 'cancel', 'remove', 'restore']),
  id: optionalId.default(''), full_name: z.string().trim().max(200).default(''),
  email: z.string().trim().toLowerCase().max(254).default(''),
  register_number: z.string().trim().max(80).default(''),
  department_id: optionalId.default(''), batch_id: optionalId.default(''),
});

export async function manageCollegeStudent(form: FormData) {
  const parsed = input.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Check the student details and try again.' };
  const v = parsed.data;
  if (v.action === 'add' && (!v.full_name || !v.register_number || !z.string().email().safeParse(v.email).success))
    return { error: 'Enter the student’s name, email and register number.' };
  if (v.action !== 'add' && (!v.id || form.get('confirmed') !== 'yes'))
    return { error: 'Confirm the access change before continuing.' };
  try {
    const access = await collegeDirectoryAccess();
    if (!access || (access.collegeIds !== null && !access.collegeIds.includes(v.college_id)))
      return { error: 'You do not have access to manage this college.' };
    const { error } = await access.client.rpc('fn_manage_college_student', {
      p_college_id: v.college_id, p_action: v.action, p_id: v.id || null,
      p_data: { full_name: v.full_name, email: v.email, register_number: v.register_number, department_id: v.department_id, batch_id: v.batch_id },
    });
    if (error) return { error: error.code === '23505' ? 'A pending student already uses this email or register number. Search the list below. Cancel an incorrect invitation before adding it again.' : error.code === 'P0001' ? error.message : 'Unable to save student access. Check that migration 036 has been applied, then try again.' };
    revalidatePath('/college', 'layout');
    revalidatePath('/join');
    return { success: true };
  } catch { return { error: 'Unable to save. Please try again.' }; }
}
