'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { parseProgrammeSettings } from './settings';

export async function completeIndividualProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await supabase.rpc('fn_register_individual_student');
  if (error) {
    console.error('Individual profile setup', error);
    redirect('/student/setup?error=setup');
  }
  revalidatePath('/student/dashboard');
  redirect('/student/dashboard');
}

export async function saveProgrammeSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role, status').eq('user_id', user.id).single();
  if (profile?.role !== 'SUPER_ADMIN' || profile.status !== 'ACTIVE') redirect('/login');
  const values = parseProgrammeSettings(formData.get('price'), formData.get('months'));
  if (!values) redirect('/admin/programme?error=invalid');
  const { data, error } = await supabase.from('programme_settings').update(values)
    .eq('id', 'corporate-readiness').select('id').single();
  if (error || !data) redirect('/admin/programme?error=save');
  revalidatePath('/programme');
  revalidatePath('/admin/programme');
  redirect('/admin/programme?saved=1');
}

export async function activateFreeProgramme() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await supabase.rpc('fn_activate_free_programme');
  if (error) redirect('/programme?error=activation');
  revalidatePath('/student/dashboard');
  revalidatePath('/student/learning');
  redirect('/student/learning');
}
