const {test}=require('node:test'),assert=require('node:assert/strict');const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/college/batch-enrolment.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const id='00000000-0000-4000-8000-000000000001';
function fixture(options={}){const exports={},calls=[];vm.runInNewContext(code,{exports,require(name){
  if(name==='zod')return require('zod');if(name==='next/cache')return {revalidatePath(){}};
  if(name==='./student-directory')return {collegeDirectoryAccess:async()=>options.denied?null:{client:{rpc:async(name,args)=>{calls.push({name,args});return {error:options.error,data:options.invalid?{}:{enrolled:1,existing:2}};}}}};throw Error(name);
}});return {run:exports.enrolBatch,calls};}
test('invalid input cannot invoke RPC',async()=>{const f=fixture();assert.ok((await f.run('bad',id)).error);assert.equal(f.calls.length,0);});
test('unauthorized account cannot invoke RPC',async()=>{const f=fixture({denied:true});assert.ok((await f.run(id,id)).error);assert.equal(f.calls.length,0);});
test('enrolment uses one atomic RPC and reports new and existing counts',async()=>{const f=fixture();const r=await f.run(id,id);assert.equal(r.enrolled,1);assert.equal(r.existing,2);assert.equal(f.calls.length,1);assert.equal(f.calls[0].name,'fn_enrol_batch_course');});
test('database scope rejection is shown',async()=>{const f=fixture({error:{code:'P0001',message:'Choose an active batch in your college.'}});assert.match((await f.run(id,id)).error,/your college/);});
test('missing migration and malformed results do not report success',async()=>{assert.ok((await fixture({invalid:true}).run(id,id)).error);assert.match((await fixture({error:{code:'PGRST202'}}).run(id,id)).error,/migration 016/);});
