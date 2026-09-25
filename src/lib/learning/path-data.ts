import { createClient } from '@/lib/supabase/server';
import { orderedLessons, orderSkills, type PathModule, type PathLesson, type PathSkill } from './path-order';
async function allRows<T>(fetchPage:(from:number,to:number)=>PromiseLike<{data:unknown;error:unknown}>):Promise<T[]> {
  const rows:T[]=[];
  for(let start=0;;start+=500) {
    const {data,error}=await fetchPage(start,start+499);
    if(error) throw new Error('Learning path could not be loaded. Please refresh or contact support.');
    const page=(data||[]) as T[]; rows.push(...page); if(page.length<500)return rows;
  }
}
export async function loadLearningPath(studentId:string) {
  const client=await createClient();
  const [skills, enrollments] = await Promise.all([
    allRows<PathSkill>( (a,b)=>client.from('skills').select('*').eq('status','ACTIVE').order('id').range(a,b)),
    allRows<{course_id:string;course:{id:string;title:string;status:string}|null}>( (a,b)=>client.from('enrollments').select('course_id,course:courses(id,title,status)').eq('student_id',studentId).in('status',['ACTIVE','COMPLETED']).order('id').range(a,b)),
  ]);
  const courses=enrollments.flatMap(e=>e.course?.status==='ACTIVE'?[e.course]:[]).sort((a,b)=>a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
  // Page each course separately so neither large libraries nor API row caps truncate lessons.
  const sets=await Promise.all(courses.map(async course=>{
    const [modules,progress]=await Promise.all([
      allRows<PathModule>((a,b)=>client.from('modules').select('id,skill_id,course_id,title,sequence,status').eq('course_id',course.id).eq('status','ACTIVE').order('id').range(a,b)),
      allRows<{lesson_id:string;status:string}>((a,b)=>client.from('lesson_progress').select('lesson_id,status').eq('student_id',studentId).eq('course_id',course.id).order('lesson_id').range(a,b)),
    ]);
    const lessons=(await Promise.all(modules.map(m=>allRows<PathLesson>((a,b)=>client.from('lessons').select('id,module_id,title,sequence,status').eq('module_id',m.id).eq('status','ACTIVE').order('id').range(a,b))))).flat();
    return {modules,lessons,progress};
  }));
  const modules=sets.flatMap(s=>s.modules);const lessons=orderedLessons(modules,sets.flatMap(s=>s.lessons),skills);
  return {skills:orderSkills(skills),courses,modules,lessons,completed:new Set(sets.flatMap(s=>s.progress.filter(p=>p.status==='COMPLETED').map(p=>p.lesson_id)))};
}
