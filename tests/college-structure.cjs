const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/college/structure-actions.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const id='00000000-0000-4000-8000-000000000001';
function fixture(options={}){const exports={},calls=[];vm.runInNewContext(code,{exports,require(name){
  if(name==='zod')return require('zod');if(name==='next/cache')return {revalidatePath(){}};
  if(name==='./student-directory')return {collegeDirectoryAccess:async()=>options.denied?null:{collegeIds:options.other?[]:[id],client:{rpc:async(name,args)=>{calls.push({name,args});return {error:options.error};}}}};
  throw Error(name);
}});return {run:exports.saveCollegeStructure,calls};}
function form(changes={}){const f=new FormData();for(const [k,v]of Object.entries({college_id:id,kind:'department',id:'',name:'Computing',code:'CSE',status:'ACTIVE',...changes}))f.set(k,v);return f;}
test('unauthorized or out-of-college caller cannot write',async()=>{for(const options of [{denied:true},{other:true}]){const f=fixture(options);assert.ok((await f.run(form())).error);assert.equal(f.calls.length,0);}});
test('valid department uses restricted RPC',async()=>{const f=fixture();assert.equal((await f.run(form())).success,true);assert.equal(f.calls.length,1);assert.equal(f.calls[0].args.p_id,null);});
test('invalid fields are rejected before RPC',async()=>{for(const change of [{name:''},{code:'bad code'},{college_id:'bad'},{status:'unknown'},{kind:'placement'}]){const f=fixture();assert.ok((await f.run(form(change))).error);assert.equal(f.calls.length,0);}});
test('placement can explicitly clear both associations',async()=>{const f=fixture();assert.equal((await f.run(form({kind:'placement',id,department_id:'',batch_id:''}))).success,true);assert.equal(f.calls[0].args.p_data.batch_id,'');});
test('duplicate department gives useful feedback',async()=>{const f=fixture({error:{code:'23505'}});assert.match((await f.run(form())).error,/already exists/);});
test('database scope validation is shown',async()=>{const f=fixture({error:{code:'P0001',message:'Choose an active department in this college.'}});assert.match((await f.run(form())).error,/this college/);});
