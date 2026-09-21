'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from './require-admin';

export async function enrolCollegeCourse(form: FormData) {
  try {
    const { client } = await requireAdmin();
    const parsed = z.object({college_id:z.string().uuid(),course_id:z.string().uuid(),confirmed:z.literal('yes')}).safeParse(Object.fromEntries(form));
    if(!parsed.success) return {error:'Choose a course and confirm enrolment for this college.'};
    const {data,error} = await client.rpc('fn_enrol_college_course',{p_college_id:parsed.data.college_id,p_course_id:parsed.data.course_id});
    if(error) return {error:error.code==='P0001'?error.message:'Unable to enrol students. Check that migration 014 is applied, then try again.'};
    const result=z.object({eligible:z.number().int().nonnegative(),added:z.number().int().nonnegative(),existing:z.number().int().nonnegative()}).safeParse(data);
    if(!result.success) return {error:'The result could not be verified. Refresh and check the assignment before retrying.'};
    revalidatePath(`/admin/colleges/${parsed.data.college_id}/courses`);
    revalidatePath('/student/learning');
    revalidatePath('/student/assessments');
    return {success:true,...result.data};
  } catch {return {error:'Please sign in as an active Super Admin and try again.'};}
}
