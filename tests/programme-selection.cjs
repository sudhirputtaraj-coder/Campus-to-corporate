const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),vm=require('node:vm');
function load(file,deps){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:id=>id in deps?deps[id]:require(id)});return exports;}
function nodes(element){return !element||typeof element!=='object'?[]:[element,...[element.props?.children].flat(Infinity).flatMap(nodes)];}
test('filter preserves choices; select all is editable and save sends explicit IDs',async()=>{
 const state=[],saved=[];let index=0;
 const Form=load('src/app/college/programs/programme-form.tsx',{'react':{useState:initial=>{const n=index++;if(!(n in state))state[n]=initial;return[state[n],value=>state[n]=typeof value==='function'?value(state[n]):value];}},'next/navigation':{useRouter:()=>({refresh(){}})},'@/lib/college/programmes':{saveCollegeProgramme:async(...args)=>{saved.push(args);return {success:true,skills:2};}}}).default;
 const props={collegeId:'college',configured:true,selected:['a'],skills:[{id:'a',name:'Communication'},{id:'b',name:'Finance'}]};
 const render=()=>{index=0;return Form(props);};
 let tree=render();nodes(tree).find(n=>n.type==='input'&&n.props.type==='search').props.onChange({target:{value:'Finance'}});
 tree=render();assert.equal(nodes(tree).filter(n=>n.type==='input'&&n.props.type==='checkbox').length,3);assert.deepEqual(state[0],['a']);
 nodes(tree).filter(n=>n.type==='input'&&n.props.type==='checkbox')[1].props.onChange({target:{checked:true}});
 tree=render();assert.deepEqual(Array.from(state[0]),['a','b']);
 await tree.props.onSubmit({preventDefault(){}});assert.equal(saved[0][1],false);assert.deepEqual(Array.from(saved[0][2]),['a','b']);
 props.skills.push({id:'c',name:'New skill'});tree=render();assert.equal(nodes(tree).filter(n=>n.type==='input'&&n.props.type==='checkbox')[1].props.checked,false);assert.deepEqual(Array.from(state[0]),['a','b']);
 nodes(tree).filter(n=>n.type==='input'&&n.props.type==='checkbox')[2].props.onChange({target:{checked:false}});assert.deepEqual(Array.from(state[0]),['a']);
});
test('programme action validates scope and refreshes college and learner views',async()=>{
 const college='00000000-0000-4000-8000-000000000100',skill='00000000-0000-4000-8000-000000000400',calls=[];
 const {saveCollegeProgramme}=load('src/lib/college/programmes.ts',{'next/cache':{revalidatePath:(...args)=>calls.push(args)},'./student-directory':{collegeDirectoryAccess:async()=>({collegeIds:[college],client:{rpc:async(name,args)=>{calls.push([name,args]);return {data:{skills:1}};}}})}});
 assert.ok((await saveCollegeProgramme(college,false,[])).error);assert.equal(calls.length,0);
 assert.ok((await saveCollegeProgramme(skill,false,[skill])).error);assert.equal(calls.length,0);
 assert.equal((await saveCollegeProgramme(college,false,[skill,skill])).success,true);
 assert.equal(calls[0][1].p_all_skills,false);assert.deepEqual(Array.from(calls[0][1].p_skills),[skill]);assert.deepEqual(calls.slice(1),[['/college','layout'],['/student','layout']]);
});
