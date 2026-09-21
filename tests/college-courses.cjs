const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/admin/college-courses.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
function fixture(options={}) {
  const calls=[],exports={};
  vm.runInNewContext(code,{exports,require(id){
    if(id==='zod')return require('zod');if(id==='next/cache')return {revalidatePath(){}};
    if(id==='./require-admin')return {async requireAdmin(){if(options.denied)throw Error('Denied');return {client:{async rpc(name,args){calls.push({name,args});return {error:options.error,data:options.invalid?{}:{eligible:4,added:3,existing:1}};}}};}};
    throw Error(id);
  }});return {calls,run:exports.enrolCollegeCourse};
}
function form(changes={}){const f=new FormData();for(const [k,v]of Object.entries({college_id:'00000000-0000-4000-8000-000000000001',course_id:'00000000-0000-4000-8000-000000000002',confirmed:'yes',...changes}))f.set(k,v);return f;}
test('nonadmin cannot invoke enrolment',async()=>{const f=fixture({denied:true});assert.ok((await f.run(form())).error);assert.equal(f.calls.length,0);});
test('explicit confirmation and valid identifiers required',async()=>{for(const c of [{confirmed:''},{college_id:'invalid'},{course_id:'invalid'}]){const f=fixture();assert.ok((await f.run(form(c))).error);assert.equal(f.calls.length,0);}});
test('one RPC performs enrolment and reports counts',async()=>{const f=fixture();const r=await f.run(form());assert.equal(r.added,3);assert.equal(r.existing,1);assert.equal(f.calls.length,1);assert.equal(f.calls[0].name,'fn_enrol_college_course');});
test('database validation error is shown',async()=>{const f=fixture({error:{code:'P0001',message:'Choose an active college.'}});assert.match((await f.run(form())).error,/active college/);});
test('missing migration gives actionable message',async()=>{const f=fixture({error:{code:'PGRST202'}});assert.match((await f.run(form())).error,/migration 014/);});
test('malformed result never reports success',async()=>{const f=fixture({invalid:true});assert.ok((await f.run(form())).error);});
