import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function requireLearningAccess() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('fn_has_learning_access');
  if (error) throw new Error('Unable to verify programme access. Please try again.');
  if (data !== true) redirect('/student/learning');
}
