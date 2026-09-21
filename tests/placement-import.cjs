const {test}=require('node:test'),assert=require('node:assert/strict');const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function load(file,deps={}){const exports={};const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;vm.runInNewContext(code,{exports,require(id){if(!(id in deps))throw Error(id);return deps[id];}});return exports;}
const parser=load('src/lib/college/placement-csv.ts');
test('CSV handles BOM, CRLF, quotes, blanks and leading zeros',()=>{assert.equal(JSON.stringify(parser.parsePlacementCsv('\uFEFFregister_number\r\n"001"\r\n\r\n"REG,2"\r\n')),JSON.stringify(['001','REG,2']));});
test('CSV rejects malformed, duplicate, oversized and extra-column input',()=>{for(const s of ['name\nA','register_number\nA\nA','register_number\n"A','register_number\nA,B','register_number\n"A"x','register_number\n"A\nB"','register_number','x'.repeat(50001),'register_number\n'+Array.from({length:101},(_,i)=>String(i)).join('\n')])assert.throws(()=>parser.parsePlacementCsv(s));});
const college='00000000-0000-4000-8000-000000000001',batch='00000000-0000-4000-8000-000000000002';
const input={collegeId:college,batchId:batch,departmentId:'',csv:'register_number\n001\n002'};
function fixture(options={}){
 const calls=[],reads=[];
 const client={from(table){const filters=[];reads.push({table,filters});
   const result=()=>({data:table==='colleges'?{id:college}:table==='batches'?{department_id:options.mismatch?'foreign':null}:table==='students'?options.missing?[]:[{id:'s1',user_id:'u1',register_number:'001',status:'ACTIVE'},{id:'s2',user_id:'u2',register_number:'002',status:'ACTIVE'}]:table==='profiles'?options.inactive?[]:[{user_id:'u1'},{user_id:'u2'}]:{id:'dept'},error:null});
   const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},in(k,v){filters.push([k,v]);return q;},maybeSingle:async()=>result(),then(resolve,reject){return Promise.resolve(result()).then(resolve,reject);}};return q;
 },async rpc(name,args){calls.push({name,args});return {error:options.partial&&calls.length===2?{code:'P0001',message:'Student became inactive.'}:null};}};
 const actions=load('src/lib/college/placement-import.ts',{zod:require('zod'),'next/cache':{revalidatePath(){}},'./student-directory':{collegeDirectoryAccess:async()=>options.denied?null:{client,collegeIds:options.foreign?[]:[college]}},'./placement-csv':parser});return {...actions,calls,reads};
}
test('preview is read-only and queries selected college only',async()=>{const f=fixture();const r=await f.previewPlacementImport(input);assert.equal(r.rows.length,2);assert.ok(r.rows.every(r=>r.ready));assert.equal(f.calls.length,0);assert.ok(f.reads.find(r=>r.table==='students').filters.some(([k,v])=>k==='college_id'&&v===college));});
test('unauthorized and out-of-college requests cannot write',async()=>{for(const options of [{denied:true},{foreign:true}]){const f=fixture(options);assert.ok((await f.applyPlacementImport(input,true)).error);assert.equal(f.calls.length,0);}});
test('confirmation required before applying',async()=>{const f=fixture();assert.ok((await f.applyPlacementImport(input,false)).error);assert.equal(f.reads.length,0);});
test('unmatched, inactive and mismatched department block all writes',async()=>{for(const options of [{missing:true},{inactive:true},{mismatch:true}]){const f=fixture(options);assert.ok((await f.applyPlacementImport(input,true)).error);assert.equal(f.calls.length,0);}});
test('apply revalidates input and updates each matched student through restricted RPC',async()=>{const f=fixture();const r=await f.applyPlacementImport(input,true);assert.equal(r.applied,true);assert.ok(r.rows.every(r=>r.message==='Saved'));assert.equal(f.calls.length,2);assert.equal(f.calls[0].args.p_id,'s1');assert.equal(f.calls[0].args.p_data.batch_id,batch);});
test('partial failures distinguish saved and rejected rows',async()=>{const f=fixture({partial:true});const r=await f.applyPlacementImport(input,true);assert.ok(r.error);assert.equal(r.rows[0].message,'Saved');assert.equal(r.rows[1].ready,false);});
