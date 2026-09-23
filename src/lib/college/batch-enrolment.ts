'use server';
import {z} from 'zod';
import {revalidatePath} from 'next/cache';
import {collegeDirectoryAccess} from './student-directory';
export async function enrolBatch(batchId:string,courseId:string):Promise<{error:string;success?:never;enrolled?:never;existing?:never}|{success:true;enrolled:number;existing:number;error?:never}>{
  try{
    if(!z.string().uuid().safeParse(batchId).success||!z.string().uuid().safeParse(courseId).success)return {error:'Choose a valid batch and course.'};
    const access=await collegeDirectoryAccess();if(!access)return {error:'Active administrator access is required.'};
    const {data,error}=await access.client.rpc('fn_enrol_batch_course',{p_batch_id:batchId,p_course_id:courseId});
    if(error)return {error:error.code==='P0001'?error.message:'Enrolment could not be saved. Check migration 016 and try again.'};
    const result=z.object({enrolled:z.number().int().nonnegative(),existing:z.number().int().nonnegative()}).safeParse(data);
    if(!result.success)return {error:'The result could not be confirmed. Refresh the course list before retrying.'};
    revalidatePath('/college','layout');revalidatePath('/student/learning');revalidatePath('/student/assessments');
    return {success:true,...result.data};
  }catch{return {error:'Unable to enrol this batch. Please try again.'};}
}
