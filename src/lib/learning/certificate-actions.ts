'use server';
import {z} from 'zod';
import {revalidatePath} from 'next/cache';
import {createClient} from '@/lib/supabase/server';
export async function setCertificateSharing(id:string,enabled:boolean){
  if(!z.string().uuid().safeParse(id).success||typeof enabled!=='boolean')return {error:'Invalid certificate request.'};
  const client=await createClient();const {data:{user}}=await client.auth.getUser();if(!user)return {error:'Please sign in again.'};
  const {error}=await client.rpc('fn_set_certificate_sharing',{p_certificate_id:id,p_enabled:enabled});
  if(error)return {error:'Sharing could not be updated. Check that migration 017 is applied and try again.'};
  revalidatePath(`/student/certificates/${id}`);return {success:true};
}
