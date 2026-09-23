'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { emailCallback } from './email-redirect';

export async function changeAdminEmail(formData: FormData) {
  const parsed = z.string().trim().email().max(254).safeParse(formData.get('email'));
  const password = formData.get('password');
  if (!parsed.success || typeof password !== 'string' || !password) {
    return { error: 'Enter a valid new email address and your current password.' };
  }
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.email || !user.email_confirmed_at) return { error: 'Please sign in again.' };
  const { data: profile, error: profileError } = await supabase.from('profiles')
    .select('role,status').eq('user_id', user.id).single();
  if (profileError || profile?.role !== 'SUPER_ADMIN' || profile.status !== 'ACTIVE') {
    return { error: 'An active Super Admin account is required.' };
  }
  const email = parsed.data.toLowerCase();
  if (email === user.email.toLowerCase()) return { error: 'Enter a different email address.' };

  const { data: verified, error: passwordError } = await supabase.auth.signInWithPassword({
    email: user.email, password,
  });
  if (passwordError || verified.user?.id !== user.id) return { error: 'Your current password could not be verified.' };
  const { data: currentProfile, error: currentError } = await supabase.from('profiles')
    .select('role,status').eq('user_id', user.id).single();
  if (currentError || currentProfile?.role !== 'SUPER_ADMIN' || currentProfile.status !== 'ACTIVE') {
    return { error: 'An active Super Admin account is required.' };
  }
  // Supabase handles confirmation using the configured Site URL and secure email change.
  // Never grant a role by email or bypass confirmation with the service client.
  let emailRedirectTo: string;
  try { emailRedirectTo = await emailCallback('/admin/account'); }
  catch { return { error: 'Email links are not configured. Please contact the platform administrator.' }; }
  const { error: updateError } = await supabase.auth.updateUser({ email }, { emailRedirectTo });
  if (updateError) return { error: 'Unable to request this email change. Check the address or try again later.' };
  return { success: true, message: 'Email change requested. Follow the confirmation instructions sent to your email addresses. Your administrator permissions stay with this account.' };
}
