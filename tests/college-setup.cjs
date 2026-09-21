const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/admin/college-setup.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
function fixture({denied=false,error=null}={}) {
  const calls=[]; const exports={};
  vm.runInNewContext(code,{exports,require(id){
    if(id==='zod') return require('zod');
    if(id==='next/cache') return {revalidatePath(){}};
    if(id==='./require-admin') return {async requireAdmin(){if(denied) throw Error('Denied');return {client:{async rpc(name,args){calls.push({name,args});return {error};}}};}};
    throw Error(id);
  }});
  return {calls,run:exports.setupCollegeAccount};
}
function form(changes={}) {
  const f=new FormData();
  const data={user_id:'00000000-0000-4000-8000-000000000001',college_id:'00000000-0000-4000-8000-000000000002',kind:'COLLEGE_STUDENT',register_number:' R-1 ',confirmed:'yes',...changes};
  for(const [k,v] of Object.entries(data)) f.set(k,v);
  return f;
}
test('unauthorized caller never reaches assignment RPC',async()=>{const f=fixture({denied:true});assert.ok((await f.run(form())).error);assert.equal(f.calls.length,0);});
test('valid assignment calls one atomic RPC with normalized input',async()=>{const f=fixture();assert.equal((await f.run(form())).success,true);assert.equal(f.calls.length,1);assert.equal(f.calls[0].name,'fn_setup_college_account');assert.equal(f.calls[0].args.p_register_number,'R-1');});
test('invalid choices and unconfirmed assignment never reach database',async()=>{
  for(const change of [{kind:'SUPER_ADMIN'},{confirmed:''},{register_number:''},{college_id:'bad'},{user_id:'bad'}]) {const f=fixture();assert.ok((await f.run(form(change))).error);assert.equal(f.calls.length,0);}
});
test('college administrator does not need register number',async()=>{const f=fixture();assert.equal((await f.run(form({kind:'COLLEGE_ADMIN',register_number:''}))).success,true);});
test('duplicate register number returns useful feedback',async()=>{const f=fixture({error:{code:'23505'}});assert.match((await f.run(form())).error,/already assigned/);});
test('database rejection is shown without claiming success',async()=>{const f=fixture({error:{code:'P0001',message:'The user must confirm their email first.'}});assert.match((await f.run(form())).error,/confirm their email/);});
test('missing migration shows setup instruction',async()=>{const f=fixture({error:{code:'PGRST202'}});assert.match((await f.run(form())).error,/migration 013/);});
