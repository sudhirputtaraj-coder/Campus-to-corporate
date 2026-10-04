'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { emailCallback } from './email-redirect';

export async function collegeJoinAuth(form: FormData) {
  const mode = form.get('mode');
  const email = z.string().trim().email().max(254).safeParse(form.get('email'));
  if (!email.success || !['signup', 'signin', 'resend'].includes(String(mode))) return { error: 'Enter a valid email address.' };
  const client = await createClient();
  if (mode === 'signin') {
    const password = z.string().min(1).max(128).safeParse(form.get('password'));
    if (!password.success) return { error: 'Enter your password.' };
    const { error } = await client.auth.signInWithPassword({ email: email.data, password: password.data });
    if (error) return { error: 'Unable to sign in. Check your email and password, and verify your email first. You can resend verification or reset your password below.' };
  } else {
    let emailRedirectTo: string;
    try { emailRedirectTo = await emailCallback('/join'); }
    catch { return { error: 'Email verification links are not configured. Contact the platform administrator.' }; }
    if (mode === 'resend') {
      const { error } = await client.auth.resend({ type: 'signup', email: email.data, options: { emailRedirectTo } });
      return error ? { error: 'Unable to resend verification now. Wait a minute and try again.' } : { message: 'If this account needs verification, check your inbox and spam folder. Open the latest link, then return to Join your college.' };
    }
    const details = z.object({ name: z.string().trim().min(1).max(200), password: z.string().min(8).max(128) }).safeParse({ name: form.get('full_name'), password: form.get('password') });
    if (!details.success) return { error: 'Enter your name and a password of at least 8 characters.' };
    const { data, error } = await client.auth.signUp({ email: email.data, password: details.data.password, options: { emailRedirectTo, data: { full_name: details.data.name } } });
    if (error) return { error: error.message };
    // No affiliation/role comes from user-editable signup metadata. The join RPC
    // resolves confirmed Auth email and creates the student record atomically.
    if (!data.session) return { message: 'Check your inbox and spam folder for the verification link. After verification, return here and sign in to accept your college invitation. Already registered? Use Sign in instead.' };
  }
  revalidatePath('/', 'layout');
  redirect('/join');
}

export async function acceptCollegeInvitation(form: FormData) {
  const id = z.string().uuid().safeParse(form.get('invitation_id'));
  if (!id.success) return { error: 'Choose an available college invitation.' };
  const client = await createClient();
  const { error } = await client.rpc('fn_accept_college_invitation', { p_id: id.data });
  if (error) return { error: error.code === 'P0001' ? error.message : 'Unable to join right now. Contact your college administrator or try again.' };
  revalidatePath('/', 'layout');
  redirect('/student/dashboard');
}
