'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { computeEmployabilityScore } from './service';

/** Student or admin triggers a recompute for the current student (self only for students). */
export async function refreshMyEmployabilityScore() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!student) return { error: 'Student profile not found.' };

  const result = await computeEmployabilityScore(student.id);
  if (result.error) return { error: result.error };

  revalidatePath('/student/dashboard');
  revalidatePath('/student/employability');
  revalidatePath('/student/skills');

  return { success: true, result };
}

/** Super Admin: update a skill weight */
export async function updateEmployabilityWeight(skillId: string, weightPercent: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'SUPER_ADMIN' || profile.status !== 'ACTIVE') {
    return { error: "You don't have permission to access this resource." };
  }

  if (!Number.isFinite(weightPercent) || weightPercent < 0 || weightPercent > 100) {
    return { error: 'Weight must be between 0 and 100.' };
  }

  const { error } = await supabase
    .from('employability_score_weights')
    .upsert(
      {
        skill_id: skillId,
        weight_percent: weightPercent,
        is_active: true,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'skill_id' }
    );

  if (error) {
    console.error(error);
    return { error: 'Something went wrong. Please try again.' };
  }

  revalidatePath('/admin/employability');
  return { success: true };
}
