import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function requireAdmin() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error('Please sign in again.');
  const { data: profile } = await client.from('profiles').select('role,status').eq('user_id', user.id).single();
  if (profile?.role !== 'SUPER_ADMIN' || profile.status !== 'ACTIVE') throw new Error('Active Super Admin access is required.');
  return { client, user };
}
