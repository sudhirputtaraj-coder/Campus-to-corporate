const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
test('skill module form renders with only skillId and no obsolete courses prop',()=>{
  const exports={};
  const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/app/admin/skills/module-form.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code,{exports,require(id){
    if(id==='next/navigation')return {useRouter:()=>({refresh(){}})};
    if(id==='@/lib/skills/content-actions')return {createSkillModule:async()=>({success:true})};
    return require(id);
  }});
  const html=renderToStaticMarkup(React.createElement(exports.default,{skillId:'communication'}));
  assert.match(html,/Module name/);
  assert.match(html,/Add module/);
  assert.match(html,/name="skill_id" value="communication"/);
  assert.doesNotMatch(html,/name="course_id"/);
});
