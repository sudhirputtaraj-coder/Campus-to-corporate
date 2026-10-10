const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),vm=require('node:vm');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const Link=({href,children,...props})=>React.createElement('a',{href,...props},children);
function load(file,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,{exports,URLSearchParams,require:id=>{if(id==='react')return React;if(id==='react/jsx-runtime')return require(id);if(id==='next/link')return {default:Link};if(id in deps)return deps[id];throw Error(id);}});return exports;}
const f=load('src/lib/employability/report-filters.ts',{zod:require('zod')});
const p=load('src/lib/college/performance.ts',{zod:require('zod'),'@/lib/employability/report-filters':f});
const filters=load('src/components/college-report-filters.tsx');
const exporter=load('src/components/college-performance-export.tsx',{'@/lib/employability/report-filters':f,'@/lib/college/performance':p});
const id='00000000-0000-4000-8000-000000000100';
const data={benchmark:85,generated_at:'2026-10-01T00:00:00Z',total:4,measured:2,provisional:1,unmeasured:1,ready:1,average:45,support:3,matching:1,
groups:[{kind:'batch',id,name:'Final year',college_id:id,department_id:id,total:4,measured:2,provisional:1,unmeasured:1,ready:1,average:45}],courses:[],
students:[{id,full_name:'Test Student',register_number:'001',college_name:'Test College',department_name:'Computing',batch_name:'Final year',score:0,final:true,provisional:false,ready:false,computed_at:'2026-10-01',progress:100,enrolments:1,needs_support:true}]};
async function render(mode='reports',params={},error=null){
 const calls=[];const client={rpc:async(name,args)=>{calls.push(args);return {data:error?null:data,error};},from:()=>{const q={select:()=>q,eq:()=>q,in:()=>q,order:()=>q,range:()=>q,then:resolve=>Promise.resolve(resolve({data:[],error:null}))};return q;}};
 const component=load('src/components/college-performance.tsx',{'next/navigation':{redirect:()=>{throw Error('redirect');}},'@/lib/college/student-directory':{collegeDirectoryAccess:async()=>({client,collegeIds:[id]})},'@/lib/college/performance':p,'./college-performance-export':exporter,'./college-report-filters':filters,'./college-programme-skills':load('src/components/college-programme-skills.tsx')});
 const html=renderToStaticMarkup(await component.CollegePerformance({mode,params}));return {html,calls};
}
test('report renders distinct readiness denominators and preserves final zero',async()=>{const {html}=await render();assert.match(html,/Ready \/ all students/);assert.match(html,/25\.00%/);assert.match(html,/Ready \/ assessed students/);assert.match(html,/50\.00%/);assert.match(html,/Final score: 0\/100/);assert.match(html,/Department performance/i);});
test('student links retain selected dates, course and benchmark',async()=>{const {html}=await render('students',{from:'2026-09-01',course:id,minimum:'0'});const href=html.match(new RegExp(`href="(/college/students/${id}[^\"]*)"`))[1].replaceAll('&amp;','&');const q=new URL(href,'http://localhost').searchParams;assert.equal(q.get('from'),'2026-09-01');assert.equal(q.get('course'),id);assert.equal(q.get('minimum'),'0');});
test('support mode cannot be changed to ready list by query parameter',async()=>{const {calls}=await render('support',{view:'ready',department:id});assert.equal(calls[0].p_view,'support');assert.equal(calls[0].p_department_id,id);});
test('missing migration displays unavailable instead of zero metrics',async()=>{const {html}=await render('reports',{},{});assert.match(html,/College performance is unavailable/);assert.doesNotMatch(html,/Ready \/ all students/);assert.doesNotMatch(html,/Final score: 0/);});
test('invalid filters cannot invoke reporting query',async()=>{const {html,calls}=await render('reports',{minimum:'101'});assert.match(html,/Invalid report filters/);assert.equal(calls.length,0);});
