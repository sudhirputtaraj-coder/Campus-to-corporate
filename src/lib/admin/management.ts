'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from './require-admin';

const status = z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED']);
const text = (max: number) => z.string().trim().max(max);
const collegeSchema = z.object({
  name: text(200).min(1), code: text(40).min(1).regex(/^[A-Za-z0-9_-]+$/).transform(s => s.toUpperCase()),
  city: text(100), state: text(100), address: text(1000),
  contact_person: text(200), contact_email: z.union([z.literal(''), z.string().trim().email().max(254)]),
  contact_phone: text(40), status,
});

export async function saveCollege(form: FormData) {
  try {
    const { client } = await requireAdmin();
    const parsed = collegeSchema.safeParse(Object.fromEntries(form));
    const id = String(form.get('id') || '');
    if (!parsed.success || (id && !z.string().uuid().safeParse(id).success)) return { error: 'Check the college details. Name and code are required; use letters, numbers, hyphens or underscores for the code.' };
    const query = id ? client.from('colleges').update(parsed.data).eq('id', id) : client.from('colleges').insert(parsed.data);
    const { data, error } = await query.select('id').single();
    if (error || !data) return { error: error?.code === '23505' ? 'That college code is already in use.' : 'College could not be saved. Please try again.' };
    revalidatePath('/admin/colleges');
    revalidatePath('/admin/dashboard');
    return { success: true };
  } catch { return { error: 'Unable to save. Check that you are signed in as an active Super Admin.' }; }
}

export async function saveUser(form: FormData) {
  try {
    const { client } = await requireAdmin();
    const parsed = z.object({ user_id: z.string().uuid(), full_name: text(200).min(1), phone: text(40), status }).safeParse(Object.fromEntries(form));
    if (!parsed.success) return { error: 'Enter a name and a valid account status.' };
    const { user_id, ...details } = parsed.data;
    // Guard in the UPDATE so a concurrent promotion cannot disable an administrator.
    const { data, error } = await client.from('profiles').update(details)
      .eq('user_id', user_id).neq('role', 'SUPER_ADMIN').select('user_id').single();
    if (error || !data) return { error: 'User could not be updated. Super Admin accounts are protected; refresh and try again.' };
    revalidatePath('/admin/users');
    return { success: true };
  } catch { return { error: 'Unable to save. Check that you are signed in as an active Super Admin.' }; }
}
