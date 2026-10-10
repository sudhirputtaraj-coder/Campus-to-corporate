const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),vm=require('node:vm');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function load(file,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:id=>id in deps?deps[id]:require(id)});return exports;}
const Link=({children,href,...rest})=>React.createElement('a',{href,...rest},children);
const {CollegeProgrammeSkills}=load('src/components/college-programme-skills.tsx',{'next/link':{default:Link}});
function access(configured=true,fail=false){const queries=[];return {queries,collegeIds:['a'],client:{from(table){let college;const q={select(){return q;},eq(k,v){college=v;return q;},order(){return q;},range(){return q;},maybeSingle(){return q;},then(resolve){queries.push({table,college});return Promise.resolve({error:fail?{}:null,data:table==='college_programmes'?(configured?{college_id:college}:null):[{skill:{id:'1',name:'Business Communication',status:'ACTIVE',display_order:2}},{skill:{id:'2',name:'Professionalism',status:'ACTIVE',display_order:1}},{skill:{id:'3',name:'Hidden skill',status:'INACTIVE',display_order:3}}]}).then(resolve);}};return q;}}};}
test('dashboard skills use college selections, exclude hidden skills and preserve display order',async()=>{
 const a=access();const html=renderToStaticMarkup(await CollegeProgrammeSkills({access:a,colleges:[{id:'a',name:'College A'},{id:'b',name:'Foreign college'}]}));
 assert.match(html,/2 published skills selected/);assert.match(html,/Business Communication/);assert.doesNotMatch(html,/Hidden skill|Foreign college/);assert.ok(html.indexOf('Professionalism')<html.indexOf('Business Communication'));assert.ok(a.queries.every(q=>q.college==='a'));
});
test('missing setup, unavailable data and foreign college never imply all skills are granted',async()=>{
 for(const [a,pattern]of [[access(false),/not been selected/],[access(true,true),/could not be loaded/]])assert.match(renderToStaticMarkup(await CollegeProgrammeSkills({access:a,colleges:[{id:'a'}]})),pattern);
 const a=access();await CollegeProgrammeSkills({access:a,colleges:[{id:'a'}],selectedCollege:'b'});assert.equal(a.queries.length,0);
});
test('dashboard hides course filter while detailed reports retain it',()=>{
 const {CollegeReportFilters}=load('src/components/college-report-filters.tsx',{'next/link':{default:Link}});
 const props={base:'/college/dashboard',filters:{},options:[[],[],[],[{id:'x',title:'Legacy course'}]],support:false};
 assert.doesNotMatch(renderToStaticMarkup(React.createElement(CollegeReportFilters,{...props,showCourse:false})),/Legacy course|All courses/);
 assert.match(renderToStaticMarkup(React.createElement(CollegeReportFilters,props)),/Legacy course/);
});
