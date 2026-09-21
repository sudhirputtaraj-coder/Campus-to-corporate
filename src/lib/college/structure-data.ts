import 'server-only';
import {DirectoryAccess} from './student-directory';
export async function structureRows(access:DirectoryAccess,table:'colleges'|'departments'|'batches',collegeId?:string) {
  const rows:Record<string,any>[]=[];
  for(let start=0;;start+=500){
    let q=access.client.from(table).select(table==='colleges'?'id,name,status':table==='departments'?'id,college_id,name,code,status':'id,college_id,name,department_id,academic_year,status').order('name').order('id');
    if(table!=='colleges')q=q.eq('college_id',collegeId!);
    if(access.collegeIds!==null)q=q.in(table==='colleges'?'id':'college_id',access.collegeIds.length?access.collegeIds:['00000000-0000-0000-0000-000000000000']);
    const r=await q.range(start,start+499);if(r.error)throw new Error('Unable to load college structure.');rows.push(...r.data);if(r.data.length<500)break;
  }return rows;
}
