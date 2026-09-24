'use server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function professionalAction(kind: string, form: FormData) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { error: 'Please sign in again.' };
  const { data: profile } = await client.from('profiles').select('role,status').eq('user_id',user.id).single();
  const allowed: Record<string,string[]> = { setup:['SUPER_ADMIN'], assignment:['SUPER_ADMIN','COLLEGE_ADMIN'],company:['EMPLOYER'],job:['EMPLOYER'] };
  if (profile?.status !== 'ACTIVE' || !allowed[kind]?.includes(profile.role)) return { error:'You do not have permission to make this change.' };
  const value=(key:string)=>String(form.get(key)||'').trim();
  let rpc:string; let args:Record<string,unknown>;
  if (kind==='setup') {
    const data=z.object({email:z.string().email(),role:z.enum(['TRAINER','EMPLOYER']),college:z.string(),company:z.string().max(200),confirm:z.literal('on')}).safeParse({email:value('email'),role:value('role'),college:value('college'),company:value('company'),confirm:value('confirm')});
    if (!data.success || (data.data.role==='TRAINER' && !z.string().uuid().safeParse(data.data.college).success) || (data.data.role==='EMPLOYER' && data.data.company.length<2)) return {error:'Enter the registered email, college or company details, and confirm the access grant.'};
    rpc='fn_setup_professional_account'; args={p_email:data.data.email,p_kind:data.data.role,p_college_id:data.data.role==='TRAINER'?data.data.college:null,p_company_name:data.data.company||null};
  } else if(kind==='assignment') {
    if(!z.string().uuid().safeParse(value('trainer')).success||!z.string().uuid().safeParse(value('batch')).success||!['ACTIVE','INACTIVE'].includes(value('status'))) return {error:'Choose a trainer, batch and assignment status.'};
    rpc='fn_assign_trainer_batch';args={p_trainer_id:value('trainer'),p_batch_id:value('batch'),p_active:value('status')==='ACTIVE'};
  } else if(kind==='company') {
    const website=value('website');
    if(value('name').length<2||value('name').length>200||value('description').length>5000||(website && (!z.string().url().safeParse(website).success||!website.startsWith('https://')||website.length>2048))) return {error:'Enter a company name and a valid HTTPS website, if provided.'};
    rpc='fn_update_employer_company';args={p_name:value('name'),p_website:website||null,p_description:value('description')};
  } else {
    const score=Number(value('score'));
    if(!value('score')||!Number.isFinite(score)||score<0||score>100||value('title').length<2||value('title').length>200||value('location').length<2||value('location').length>200||value('requirements').length<20||value('requirements').length>10000||!['DRAFT','PUBLISHED','CLOSED'].includes(value('status'))||(value('id')&&!z.string().uuid().safeParse(value('id')).success)) return {error:'Check the job details, requirements (at least 20 characters) and score threshold (0–100).'};
    rpc='fn_save_employer_job';args={p_id:value('id')||null,p_title:value('title'),p_location:value('location'),p_requirements:value('requirements'),p_minimum_score:score,p_status:value('status')};
  }
  const { error }=await client.rpc(rpc,args);
  if(error) return {error:error.code==='P0001'?error.message:'Unable to save. Check that the professional-access migrations have been applied.'};
  revalidatePath('/admin','layout');revalidatePath('/college','layout');revalidatePath('/trainer','layout');revalidatePath('/employer','layout');revalidatePath('/student/jobs');
  return {success:true};
}
