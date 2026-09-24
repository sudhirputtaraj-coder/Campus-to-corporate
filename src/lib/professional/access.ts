import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
export async function requireProfessional(roles: string[]) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile, error } = await client.from('profiles').select('role,status,full_name').eq('user_id',user.id).single();
  if (error || !profile || profile.status !== 'ACTIVE' || !roles.includes(profile.role)) redirect('/login');
  return { client, user, profile };
}
export function pageNumber(value?: string) { return Math.max(1,Math.min(100000,Number.parseInt(value || '1',10)||1)); }
