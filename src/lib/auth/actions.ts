'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  // Audit
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    if (user.user_metadata?.account_type === 'INDIVIDUAL') {
      const { data: accountProfile } = await supabase.from('profiles')
        .select('role').eq('user_id', user.id).single();
      // Signup metadata is not authoritative for role or college membership.
      if (accountProfile?.role === 'STUDENT') {
        const { error: setupError } = await supabase.rpc('fn_register_individual_student');
        if (setupError) {
          console.error('Individual student setup', setupError);
          redirect('/student/setup?error=setup');
        }
      }
    }
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'LOGIN',
      entity_type: 'user',
      entity_id: user.id,
    });
  }

  revalidatePath('/', 'layout');
  redirect('/login'); // middleware will redirect to role dashboard
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('full_name') as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, account_type: 'INDIVIDUAL' },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user && data.user.identities?.length !== 0) {
    // Never overwrite an existing account's role/status on repeated signup.
    const service = createServiceClient();
    const { error: profileError } = await service.from('profiles').upsert({
      user_id: data.user.id,
      full_name: fullName,
      email,
      role: 'STUDENT',
      status: 'ACTIVE',
    }, { onConflict: 'user_id', ignoreDuplicates: true });
    if (profileError) {
      console.error('Signup profile creation', profileError);
      return { error: 'Your account needs setup assistance. Please contact the platform administrator before trying again.' };
    }
    if (data.session) {
      const { error: setupError } = await supabase.rpc('fn_register_individual_student');
      if (setupError) redirect('/student/setup?error=setup');
      redirect('/student/dashboard');
    }
  }

  return { success: true, message: 'Check your email to confirm your account, then return here to sign in.' };
}

export async function logout() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'LOGOUT',
      entity_type: 'user',
      entity_id: user.id,
    });
  }

  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return profile;
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`,
  });

  if (error) return { error: error.message };
  return { success: true };
}
