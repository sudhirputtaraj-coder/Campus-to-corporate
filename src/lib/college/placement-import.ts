'use server';
import {z} from 'zod';
import {revalidatePath} from 'next/cache';
import {collegeDirectoryAccess} from './student-directory';
import {parsePlacementCsv} from './placement-csv';
const schema=z.object({collegeId:z.string().uuid(),departmentId:z.union([z.literal(''),z.string().uuid()]),batchId:z.string().uuid(),csv:z.string().max(50000)});
export type PlacementImportInput=z.infer<typeof schema>;
export type PlacementRow={register:string;ready:boolean;message:string};
async function prepare(value:unknown){
  const access=await collegeDirectoryAccess();if(!access)throw Error('Active college administrator access is required.');
  const parsed=schema.safeParse(value);if(!parsed.success)throw Error('Choose a college and batch, and upload a valid CSV.');const input=parsed.data;
  if(access.collegeIds!==null&&!access.collegeIds.includes(input.collegeId))throw Error('You cannot manage this college.');
  const registers=parsePlacementCsv(input.csv);
  const college=await access.client.from('colleges').select('id').eq('id',input.collegeId).eq('status','ACTIVE').maybeSingle();if(college.error||!college.data)throw Error('Choose an active college.');
  const batch=await access.client.from('batches').select('department_id').eq('id',input.batchId).eq('college_id',input.collegeId).eq('status','ACTIVE').maybeSingle();if(batch.error||!batch.data)throw Error('Choose an active batch in this college.');
  if(batch.data.department_id&&batch.data.department_id!==input.departmentId)throw Error('Batch and department do not match.');
  if(input.departmentId){const d=await access.client.from('departments').select('id').eq('id',input.departmentId).eq('college_id',input.collegeId).eq('status','ACTIVE').maybeSingle();if(d.error||!d.data)throw Error('Choose an active department in this college.');}
  const students=await access.client.from('students').select('id,user_id,register_number,status').eq('college_id',input.collegeId).eq('account_type','COLLEGE').in('register_number',registers);if(students.error)throw Error('Unable to match students.');
  const active=new Set<string>();
  if(students.data.length){const p=await access.client.from('profiles').select('user_id').in('user_id',students.data.map(s=>s.user_id)).eq('role','STUDENT').eq('status','ACTIVE');if(p.error)throw Error('Unable to check accounts.');for(const r of p.data)active.add(r.user_id);}
  const found=new Map(students.data.map(s=>[s.register_number,s]));
  const rows=registers.map(register=>{const s=found.get(register);const ready=!!s&&s.status==='ACTIVE'&&active.has(s.user_id);return {register,ready,message:ready?'Ready':s?'Student or account is inactive.':'No student matches in this college.'};});return {access,input,rows,found};
}
export async function previewPlacementImport(value:PlacementImportInput):Promise<{rows?:PlacementRow[];error?:string}>{
  try{return {rows:(await prepare(value)).rows};}catch(e){return {error:e instanceof Error?e.message:'Unable to preview CSV.'};}
}
export async function applyPlacementImport(value:PlacementImportInput,confirmed:boolean):Promise<{rows?:PlacementRow[];error?:string;applied?:boolean}>{
  if(confirmed!==true)return {error:'Review and confirm the changes first.'};
  try{
    const {access,input,rows,found}=await prepare(value);if(rows.some(r=>!r.ready))return {rows,error:'Resolve unmatched or inactive students first. No changes were made.'};
    const outcomes:PlacementRow[]=[];
    for(const row of rows){try{const {error}=await access.client.rpc('fn_manage_college_structure',{p_college_id:input.collegeId,p_kind:'placement',p_id:found.get(row.register)!.id,p_data:{department_id:input.departmentId,batch_id:input.batchId}});outcomes.push({...row,ready:!error,message:error?(error.code==='P0001'?error.message:'Not saved. Check migration 015 and try again.'):'Saved'});}catch{outcomes.push({...row,ready:false,message:'Save could not be confirmed. Check this student before retrying.'});}}
    revalidatePath('/college','layout');return {rows:outcomes,applied:true,error:outcomes.some(r=>!r.ready)?'Some rows were not saved. Successful rows remain saved; review the results.':undefined};
  }catch(e){return {error:e instanceof Error?e.message:'Unable to apply CSV.'};}
}
