const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),vm=require('node:vm');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function load(file,deps){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:id=>id in deps?deps[id]:require(id)});return exports;}
test('saving a department uses the selected college and invalidates all college screens',async()=>{
 const calls=[],college='00000000-0000-4000-8000-000000000100';
 const actions=load('src/lib/college/structure-actions.ts',{'next/cache':{revalidatePath:(...args)=>calls.push(['refresh',...args])},'./student-directory':{collegeDirectoryAccess:async()=>({collegeIds:[college],client:{rpc:async(...args)=>{calls.push(['save',...args]);return {error:null};}}})}});
 const form=new FormData();for(const [key,value]of Object.entries({college_id:college,kind:'department',id:'',name:'Commerce Department',code:'COMM',status:'ACTIVE'}))form.set(key,value);
 assert.equal((await actions.saveCollegeStructure(form)).success,true);
 assert.equal(calls[0][2].p_college_id,college);assert.equal(calls[0][2].p_data.name,'Commerce Department');assert.equal(calls[0][2].p_data.code,'COMM');assert.deepEqual(calls[1],['refresh','/college','layout']);
});
test('course enrollment shows departments and only batches from the selected department',()=>{
 function render(department){let index=0;const component=load('src/app/college/courses/enroll-batch-form.tsx',{'react':{...React,useState:initial=>[index++===2?department:initial,()=>{}]},'next/navigation':{useRouter:()=>({refresh(){}})},'@/lib/learning/actions':{enrollBatchInCourse(){throw Error('Render must not enrol');}}});return renderToStaticMarkup(React.createElement(component.EnrollBatchForm,{courses:[],departments:[{id:'commerce',name:'Commerce Department'},{id:'science',name:'Science Department'}],batches:[{id:'a',name:'Commerce 2026',academic_year:'2026',department_id:'commerce'},{id:'b',name:'Science 2026',academic_year:'2026',department_id:'science'},{id:'c',name:'Unassigned batch',academic_year:null,department_id:null}]}));}
 const html=render('commerce');assert.match(html,/Commerce Department/);assert.match(html,/Commerce 2026/);assert.doesNotMatch(html,/Science 2026|Unassigned batch/);
 const all=render('');assert.match(all,/Commerce 2026/);assert.match(all,/Science 2026/);
 const none=render('unassigned');assert.match(none,/Unassigned batch/);assert.doesNotMatch(none,/Commerce 2026|Science 2026/);
 const empty=render('empty');assert.match(empty,/No active batches in this department/);
});
