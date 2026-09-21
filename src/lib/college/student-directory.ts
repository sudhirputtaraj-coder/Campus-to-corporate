import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function collegeDirectoryAccess() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  const profile = await client.from('profiles').select('role,status').eq('user_id',user.id).single();
  if (profile.error) throw new Error('Unable to verify account access.');
  if (profile.data?.status !== 'ACTIVE' || !['SUPER_ADMIN','COLLEGE_ADMIN'].includes(profile.data.role)) return null;
  if (profile.data.role === 'SUPER_ADMIN') return { client, collegeIds: null as string[] | null };
  const collegeIds: string[] = [];
  for(let start=0;;start+=500) {
    const result=await client.from('user_college_memberships').select('college_id')
      .eq('user_id',user.id).eq('role','COLLEGE_ADMIN').eq('status','ACTIVE').order('college_id').range(start,start+499);
    if(result.error) throw new Error('Unable to load college membership.');
    collegeIds.push(...result.data.map(row=>row.college_id));
    if(result.data.length<500) break;
  }
  return {client,collegeIds};
}

export type DirectoryAccess = NonNullable<Awaited<ReturnType<typeof collegeDirectoryAccess>>>;
export function collegeStudents(access: DirectoryAccess) {
  let query=access.client.from('students').select('id,user_id,register_number,status,college_id,college:colleges(name),department:departments(name),batch:batches(name)',{count:'exact'}).eq('account_type','COLLEGE');
  // Empty membership must never become an unfiltered query.
  if(access.collegeIds!==null) query=query.in('college_id',access.collegeIds.length?access.collegeIds:['00000000-0000-0000-0000-000000000000']);
  return query;
}

export function directoryPage(value: unknown) {
  return Math.max(1,Math.min(100000,Number.parseInt(typeof value==='string'?value:'1',10)||1));
}

export function relationName(value: unknown) {
  const record=Array.isArray(value)?value[0]:value;
  return (record as {name?:string}|null)?.name || 'Not assigned';
}
