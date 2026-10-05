const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const college='00000000-0000-4000-8000-000000000100',job='00000000-0000-4000-8000-000000000200';
function scenario({denied=false,foreign=false,configured=true,claimed=true}={}){
 const calls=[];const exports={};const deps={
 'zod':require('zod'),'next/cache':{revalidatePath(){}},
 './student-directory':{collegeDirectoryAccess:async()=>denied?null:{collegeIds:foreign?[]:[college],client:{rpc:async(name,args)=>{calls.push(['user',name,args]);return {data:[],error:null};}}}},
 './roster':{validateRoster(rows){if(!rows.length)throw Error('Invalid rows');return rows;},rosterFromText(){calls.push(['parse']);return []; }},
 './roster-file':{fillRosterDefaults:rows=>({rows,generated:0}),parseRosterFile:async()=>[]},
 './invitation-email':{invitationEmailConfig:()=>configured?{}:null,deliverInvitation:async()=>{calls.push(['deliver']);return {status:'SENT',provider_id:'id'};}},
 '@/lib/supabase/server':{createServiceClient(){calls.push(['service']);return {rpc:async(name,args)=>{calls.push(['claim',name,args]);return {data:claimed?{id:job}:null,error:null};},from(){return {update(value){calls.push(['save',value]);const query={eq(){return query;},then(resolve){resolve({error:null});}};return query;}};}};}},
 };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/college/bulk-invitations.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,File,Buffer,Date,require:id=>deps[id]??(()=>{throw Error(id);})()});return {calls,...exports};
}
test('all bulk server actions check college authorization before parser or service client',async()=>{
 for(const flags of [{denied:true},{foreign:true}]){const a=scenario(flags);assert.ok((await a.previewStudentRoster(college,new FormData())).error);assert.ok((await a.queueStudentInvitations(college,[{}],'','')).error);assert.ok((await a.sendStudentInvitation(college,job)).error);assert.ok((await a.invitationQueue(college)).error);assert.equal(a.calls.length,0);}
});
test('missing sender blocks invitation creation and sending before writes',async()=>{const a=scenario({configured:false});assert.ok((await a.queueStudentInvitations(college,[{}],'','')).error);assert.ok((await a.sendStudentInvitation(college,job)).error);assert.equal(a.calls.length,0);});
test('unclaimed messages do not reach email provider; claimed results are saved',async()=>{const a=scenario({claimed:false});assert.equal((await a.sendStudentInvitation(college,job)).status,'SKIPPED');assert.equal(a.calls.some(c=>c[0]==='deliver'),false);const b=scenario();assert.equal((await b.sendStudentInvitation(college,job)).status,'SENT');assert.deepEqual(b.calls.map(c=>c[0]),['service','claim','deliver','save']);assert.equal(b.calls[1][2].p_college_id,college);});
