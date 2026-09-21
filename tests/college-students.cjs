const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function load(file,deps){const exports={};const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;vm.runInNewContext(code,{exports,URL,process:{env:{}},require(id){if(!(id in deps))throw Error(id);return deps[id];}});return exports;}
function fixture(options={}) {
  const calls=[];
  const client={auth:{getUser:async()=>({data:{user:options.anonymous?null:{id:'actor'}}})},from(table){
    const call={table,filters:[]};calls.push(call);
    const response=()=>{
      if(table==='profiles')return {data:{role:options.role||'COLLEGE_ADMIN',status:options.status||'ACTIVE'},error:options.profileError};
      return {data:options.memberships||[{college_id:'own-college'}],error:options.membershipError};
    };
    const q={select(){return q;},eq(k,v){call.filters.push([k,v]);return q;},in(k,v){call.filters.push([k,v]);return q;},order(){return q;},range(){return Promise.resolve(response());},single(){return Promise.resolve(response());}};return q;
  }};
  const model=load('src/lib/college/student-directory.ts',{'server-only':{},'@/lib/supabase/server':{createClient:async()=>client}});
  return {model,calls,client};
}
for(const options of [{anonymous:true},{role:'STUDENT'},{role:'TRAINER'},{status:'SUSPENDED'}])test(`denies ${JSON.stringify(options)}`,async()=>{const f=fixture(options);assert.equal(await f.model.collegeDirectoryAccess(),null);assert.ok(!f.calls.some(c=>c.table==='students'));});
test('membership scopes directory to own colleges and excludes individual students',async()=>{
  const f=fixture();const a=await f.model.collegeDirectoryAccess();f.model.collegeStudents(a);
  const filters=f.calls.find(c=>c.table==='students').filters;
  assert.ok(filters.some(([k,v])=>k==='account_type'&&v==='COLLEGE'));
  assert.equal(JSON.stringify(filters.find(([k])=>k==='college_id')[1]),JSON.stringify(['own-college']));
});
test('no memberships produces deny-all scope rather than all students',async()=>{const f=fixture({memberships:[]});f.model.collegeStudents(await f.model.collegeDirectoryAccess());const filters=f.calls.find(c=>c.table==='students').filters;assert.equal(filters.find(([k])=>k==='college_id')[1][0],'00000000-0000-0000-0000-000000000000');});
test('superadmin can view all college students',async()=>{const f=fixture({role:'SUPER_ADMIN'});const a=await f.model.collegeDirectoryAccess();assert.equal(a.collegeIds,null);f.model.collegeStudents(a);assert.ok(!f.calls.find(c=>c.table==='students').filters.some(([k])=>k==='college_id'));});
test('membership read failure cannot become an empty or unrestricted directory',async()=>{const f=fixture({membershipError:{}});await assert.rejects(()=>f.model.collegeDirectoryAccess());});
test('pagination clamps invalid and excessive input',()=>{const {model}=fixture();assert.equal(model.directoryPage('-4'),1);assert.equal(model.directoryPage('foo'),1);assert.equal(model.directoryPage('9999999'),100000);});
test('student outside scope returns not found before querying private progress',async()=>{
  let progressRead=false;
  const access={client:{from(){progressRead=true;throw Error('Must not query progress');}}};
  const page=load('src/app/college/students/[studentId]/page.tsx',{
    'react/jsx-runtime':require('react/jsx-runtime'),'next/link':()=>null,zod:require('zod'),
    '@/lib/college/structure-data':{structureRows:async()=>[]},'../../structure-form':()=>null,
    'next/navigation':{redirect(){throw Error('redirect');},notFound(){throw Error('not found');}},
    '@/lib/college/student-directory':{collegeDirectoryAccess:async()=>access,collegeStudents:()=>({eq:()=>({maybeSingle:async()=>({data:null})})}),directoryPage:()=>1,relationName:()=>''},
  }).default;
  await assert.rejects(()=>page({params:Promise.resolve({studentId:'00000000-0000-4000-8000-000000000001'}),searchParams:Promise.resolve({})}),/not found/);
  assert.equal(progressRead,false);
});
test('inactive middleware session is signed out without a dashboard redirect loop',async()=>{
  let signedOut=false;
  const response=()=>({cookies:{getAll:()=>[{name:'session',value:''}],set(){}},location:null});
  const middleware=load('src/middleware.ts',{
    '@supabase/ssr':{createServerClient:()=>({
      auth:{getUser:async()=>({data:{user:{id:'actor'}}}),signOut:async()=>{signedOut=true;}},
      from:()=>({select:()=>({eq:()=>({single:async()=>({data:{role:'COLLEGE_ADMIN',status:'SUSPENDED'}})})})}),
    })},
    'next/server':{NextResponse:{next:response,redirect:url=>({...response(),location:url.pathname})}},
  });
  const result=await middleware.middleware({cookies:{getAll:()=>[]},nextUrl:{pathname:'/college/students'},url:'http://localhost:3002/college/students'});
  assert.equal(signedOut,true);
  assert.equal(result.location,'/login');
});

