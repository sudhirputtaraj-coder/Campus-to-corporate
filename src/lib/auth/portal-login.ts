'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { LOGIN_PORTALS, resolveLoginPortal } from './portals';

export async function signInToPortal(formData: FormData): Promise<{ error: string }> {
  const portal = String(formData.get('portal') ?? '');
  const choice = LOGIN_PORTALS.find(item => item.id === portal);
  if (!choice?.role) return { error: 'Please choose an available sign-in option.' };
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'Enter your email and password.' };
  const supabase = await createClient();
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) return { error: authError.message };

  let destination: string;
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Authenticated user could not be loaded');
    const { data: profile, error: profileError } = await supabase.from('profiles')
      .select('role, status').eq('user_id', user.id).single();
    if (profileError) throw new Error('Account profile could not be loaded');
    let student: { account_type: string; status: string } | null = null;
    if (profile?.role === 'STUDENT') {
      const { data, error } = await supabase.from('students')
        .select('account_type, status').eq('user_id', user.id).maybeSingle();
      if (error) throw new Error('Student profile could not be loaded');
      student = data;
    }
    const result = resolveLoginPortal(portal, profile, student);
    if ('error' in result) {
      await supabase.auth.signOut({ scope: 'local' });
      return result;
    }
    destination = result.destination;
  } catch {
    await supabase.auth.signOut({ scope: 'local' });
    return { error: 'We could not verify your account access. Please try again or contact your administrator.' };
  }
  revalidatePath('/', 'layout');
  redirect(destination);
}
