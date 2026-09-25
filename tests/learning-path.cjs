const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict'),{test}=require('node:test');
function load(file,deps={}) {const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,URL,require:id=>{if(!(id in deps))throw Error(id);return deps[id];}});return exports;}
const order=load('src/lib/learning/path-order.ts');
const skills=[{id:'c',code:'COMM',name:'Communication'},{id:'p',code:'PROF',name:'Professionalism'},{id:'a',code:'CUSTOM_AI',name:'AI Knowledge'}];
const modules=[{id:'mc',skill_id:'c',course_id:'course',title:'Communication',sequence:1,status:'ACTIVE'},{id:'mp',skill_id:'p',course_id:'course2',title:'Professionalism',sequence:2,status:'ACTIVE'},{id:'hidden',skill_id:'p',course_id:'course2',title:'Hidden',sequence:0,status:'INACTIVE'}];
const lessons=[{id:'c1',module_id:'mc',title:'Writing',sequence:2,status:'ACTIVE'},{id:'start',module_id:'mc',title:'Start here: how to use this handbook',sequence:1,status:'ACTIVE'},{id:'p1',module_id:'mp',title:'First job',sequence:1,status:'ACTIVE'},{id:'invisible',module_id:'mp',title:'Hidden lesson',sequence:2,status:'INACTIVE'},{id:'hidden-module-lesson',module_id:'hidden',title:'Hidden module',sequence:1,status:'ACTIVE'}];
test('one curriculum order, including custom AI and administrator overrides',()=>{
 assert.equal(order.orderSkills(skills).map(s=>s.id).join(','),'p,c,a');
 assert.equal(order.orderSkills(skills.map(s=>({...s,display_order:s.id==='a'?1:10}))).map(s=>s.id).join(','),'a,c,p');
});
test('orientation first, then published lessons across modules and courses',()=>{
 const result=order.orderedLessons(modules,lessons,skills);
 assert.equal(result.map(l=>l.id).join(','),'start,p1,c1');
 assert.equal(result[1].course_id,'course2');
 assert.equal(order.nextUnfinished(result,new Set(['start','c1'])).id,'p1');
 assert.equal(order.nextUnfinished(result,new Set(['start','p1','c1'])),undefined);
 assert.equal(order.cleanModuleTitle('1.5: Basic Grammar'),'Basic Grammar');
});
const validation=load('src/lib/skills/content-validation.ts');
const form=extra=>({get:key=>({title:'Practice',status:'ACTIVE',sequence:'1',duration_minutes:'10',...extra})[key]??null});
test('practice questions validate size, required answers and plain text',()=>{
 const parsed=validation.parseContent(form({practice_questions:JSON.stringify([{question:' Why? ',answer:' Because. '}])}),'lesson');
 assert.equal(parsed.values.practice_questions[0].answer,'Because.');
 for(const bad of ['invalid','{}','[null]',JSON.stringify([{question:'',answer:'a'}]),JSON.stringify([{question:'Q',answer:10}]),JSON.stringify(Array(51).fill({question:'Q',answer:'A'})),JSON.stringify([{question:'Q',answer:'x'.repeat(5001)}])]) assert.ok(validation.parseContent(form({practice_questions:bad}),'lesson').error);
 assert.ok(validation.parseContent(form({display_order:'-1'}),'skill').error);
 assert.equal(validation.parseContent(form({display_order:'80'}),'skill').values.display_order,80);
});
test('large learning libraries are paged without losing lessons or student scope',async()=>{
 const calls=[];
 const data={skills, enrollments:[{course_id:'course',course:{id:'course',title:'Course',status:'ACTIVE'}}],modules:[modules[0]],lessons:Array.from({length:1001},(_,i)=>({id:`lesson-${i}`,module_id:'mc',title:`Lesson ${i}`,sequence:i,status:'ACTIVE'})),lesson_progress:Array.from({length:1000},(_,i)=>({lesson_id:`lesson-${i}`,status:'COMPLETED'}))};
 const client={from:table=>{const q={select(){return q;},eq(key,value){calls.push([table,key,value]);return q;},in(){return q;},order(){return q;},range:async(a,b)=>({data:data[table].slice(a,b+1),error:null})};return q;}};
 const service=load('src/lib/learning/path-data.ts',{'@/lib/supabase/server':{createClient:async()=>client},'./path-order':order});
 const result=await service.loadLearningPath('student-one');
 assert.equal(result.lessons.length,1001);
 assert.equal(order.nextUnfinished(result.lessons,result.completed).id,'lesson-1000');
 for(const table of ['enrollments','lesson_progress']) assert.ok(calls.some(([t,k,v])=>t===table&&k==='student_id'&&v==='student-one'));
});
test('database failure is reported instead of an empty completed path',async()=>{
 const client={from:()=>{const q={select(){return q;},eq(){return q;},in(){return q;},order(){return q;},range:async()=>({data:null,error:{message:'failure'}})};return q;}};
 const service=load('src/lib/learning/path-data.ts',{'@/lib/supabase/server':{createClient:async()=>client},'./path-order':order});
 await assert.rejects(service.loadLearningPath('student-one'),/could not be loaded/);
});
