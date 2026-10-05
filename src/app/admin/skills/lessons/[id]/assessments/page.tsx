import AttachAssessment from './attach-assessment';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/require-admin';
import { CourseStructureForms } from '@/app/admin/courses/[id]/structure-forms';
export default async function LessonAssessments({params}:{params:Promise<{id:string}>}) {
 const {id}=await params; const {client}=await requireAdmin();
 const {data:lesson}=await client.from('lessons').select('id,title,module_id').eq('id',id).maybeSingle();if(!lesson)notFound();
 const {data:module}=await client.from('modules').select('id,title,course_id').eq('id',lesson.module_id).single();if(!module)notFound();
 const [skills,result]=await Promise.all([client.from('skills').select('id,name').eq('status','ACTIVE').order('display_order'),client.from('assessments').select('*,questions(id,question_text,question_type,correct_answer,options,marks,sequence,question_skills(skill_id,weight))').eq('lesson_id',id).order('created_at')]);
 if(result.error||skills.error)throw Error('Unable to load lesson assessments. Apply migration 039.');
 const {data:existing,error:existingError}=await client.from('assessments').select('id,title').eq('course_id',module.course_id).is('lesson_id',null).order('title');
 if(existingError)throw Error('Unable to load existing assessments.');
 const assessments=await Promise.all((result.data||[]).map(async a=>{const {count,error}=await client.from('assessment_attempts').select('id',{count:'exact',head:true}).eq('assessment_id',a.id);if(error)throw Error('Unable to check assessment history.');return {...a,mapping_locked:(count||0)>0,questions:(a.questions||[]).sort((x:{sequence:number},y:{sequence:number})=>x.sequence-y.sequence)};}));
 return <main className="mx-auto max-w-5xl p-6"><Link className="underline" href={'/admin/skills/modules/'+module.id}>← {module.title}</Link><h1 className="mt-5 text-2xl font-bold">{lesson.title}: Assessments</h1><p className="mt-3">Add and publish assessments for this lesson. Practice activities remain in the lesson editor.</p><AttachAssessment lessonId={id} items={existing||[]}/><CourseStructureForms courseId={module.course_id} lessonId={id} modules={[]} assessments={assessments} skills={skills.data||[]}/></main>;
}
