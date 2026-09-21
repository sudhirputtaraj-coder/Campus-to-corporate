'use server';
import {z} from 'zod';
import {revalidatePath} from 'next/cache';
import {collegeDirectoryAccess} from './student-directory';

export async function saveCollegeStructure(form:FormData) {
  try {
    const access=await collegeDirectoryAccess();if(!access)return {error:'Active college administrator access is required.'};
    const base=z.object({college_id:z.string().uuid(),kind:z.enum(['department','batch','placement']),id:z.union([z.literal(''),z.string().uuid()])}).safeParse(Object.fromEntries(form));
    if(!base.success)return {error:'Invalid college or record.'};
    const {college_id,kind,id}=base.data;
    if(access.collegeIds!==null&&!access.collegeIds.includes(college_id))return {error:'You cannot manage this college.'};
    const value=(name:string)=>String(form.get(name)||'').trim();
    const optionalId=z.union([z.literal(''),z.string().uuid()]);
    const input=kind==='placement'?z.object({department_id:optionalId,batch_id:optionalId}).safeParse({department_id:value('department_id'),batch_id:value('batch_id')}):
      z.object({name:z.string().min(1).max(200),status:z.enum(['ACTIVE','INACTIVE']),code:kind==='department'?z.string().regex(/^[A-Za-z0-9_-]{1,40}$/):z.string(),department_id:optionalId,academic_year:z.string().max(40)}).safeParse({name:value('name'),status:value('status'),code:value('code'),department_id:value('department_id'),academic_year:value('academic_year')});
    if(!input.success||(kind==='placement'&&!id))return {error:'Check the required fields and your department/batch selection.'};
    const {error}=await access.client.rpc('fn_manage_college_structure',{p_college_id:college_id,p_kind:kind,p_id:id||null,p_data:input.data});
    if(error)return {error:error.code==='23505'?'That department code already exists in this college.':error.code==='P0001'?error.message:'Unable to save. Check that migration 015 is applied, then try again.'};
    revalidatePath('/college','layout');return {success:true};
  }catch{return {error:'Unable to save. Please sign in again or try later.'};}
}
