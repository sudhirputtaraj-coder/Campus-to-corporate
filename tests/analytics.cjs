const fs=require('fs'),path=require('path'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict'),{test}=require('node:test');
function load(file,deps){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,console,require:id=>{if(!(id in deps))throw Error(id);return deps[id];}});return exports;}
test('analytics errors are not presented as zero students',async()=>{const m=load('src/lib/employability/service.ts',{'@/lib/supabase/server':{createClient:async()=>({rpc:async()=>({data:null,error:{message:'missing RPC'}})})}});await assert.rejects(()=>m.getCollegeAnalytics(),/unavailable/);});
test('zero scores survive the analytics service',async()=>{const data={average_score:0,students_with_score:1};const m=load('src/lib/employability/service.ts',{'@/lib/supabase/server':{createClient:async()=>({rpc:async()=>({data,error:null})})}});assert.equal((await m.getCollegeAnalytics()).average_score,0);});
for(const scenario of [{status:'SUSPENDED',weight:50},{status:'ACTIVE',weight:NaN},{status:'ACTIVE',weight:Infinity}])test(`weight update denied for ${scenario.status}/${scenario.weight}`,async()=>{
 let writes=0;const client={auth:{getUser:async()=>({data:{user:{id:'admin'}}})},from:()=>({select(){return this;},eq(){return this;},single:async()=>({data:{role:'SUPER_ADMIN',status:scenario.status}}),upsert:async()=>{writes++;return {error:null};}})};
 const actions=load('src/lib/employability/actions.ts',{'@/lib/supabase/server':{createClient:async()=>client},'next/cache':{revalidatePath(){}},'./service':{}});
 assert.ok((await actions.updateEmployabilityWeight('skill',scenario.weight)).error);assert.equal(writes,0);
});

const filters=load('src/lib/employability/report-filters.ts',{zod:require('zod')});
test('analytics filters reject impossible dates, reversed ranges and malformed IDs',()=>{
 for(const input of [{from:'2026-02-30'},{from:'2026-09-25',to:'2026-09-24'},{college:'wrong'},{batch:['one','two']}]) assert.equal(filters.reportFilters.safeParse(input).success,false);
 assert.equal(filters.reportFilters.safeParse({from:'2024-02-29',to:'2026-09-24'}).success,true);
});
test('CSV cells escape quotes and neutralise spreadsheet formulas',()=>{
 assert.equal(filters.csvCell('A,"B"'),'"A,""B"""');
 for(const prefix of ['=','+','-','@','\t','\r','\n']) assert.equal(filters.csvCell(prefix+'formula'),'"\''+prefix+'formula"');
 assert.equal(filters.csvCell(0),'"0"');
});
