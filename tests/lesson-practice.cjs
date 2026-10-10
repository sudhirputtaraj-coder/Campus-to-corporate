const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),vm=require('node:vm');
function load(file,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:id=>id in deps?deps[id]:require(id)});return exports;}
const logic=load('src/lib/learning/practice.ts');
const mcq={question:'Which noun?\na) chair      b) courage',answer:'b) courage\n\nWhy: It names an idea.'},written={question:'Explain a noun.',answer:'A noun names a person, place, thing or idea.'};
test('only unambiguous choices with a matching answer key are auto-scored',()=>{
 assert.equal(logic.practiceChoice(mcq).correct,'b');assert.equal(logic.practiceChoice(written),null);
 assert.equal(logic.practiceChoice({...mcq,answer:'b) different'}),null);
 assert.equal(logic.practiceChoice({...mcq,question:'Choose\na) one\nc) two'}),null);
 const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'../content-workspace/grammar/grammar-drafts.json')));
 const converted=catalog.lessons.flatMap(l=>l.practice_questions).filter(q=>logic.practiceChoice(q));assert.ok(converted.length>100,'existing grammar MCQs become interactive');
});
test('score excludes unchecked guesses and distinguishes written self-review',()=>{
 const result=logic.practiceScore([mcq,mcq,written],[{value:'b',checked:true},{value:'b',checked:false},{value:'Something',checked:true,selfCorrect:true}]);
 assert.equal(result.correct,1);assert.equal(result.automatic,2);assert.equal(result.complete,2);assert.equal(result.selfCorrect,1);
});
function nodes(element){return !element||typeof element!=='object'?[]:[element,...[element.props?.children].flat(Infinity).flatMap(nodes)];}
function words(element){if(typeof element==='string'||typeof element==='number')return String(element);if(!element||typeof element!=='object')return '';return [element.props?.children].flat(Infinity).map(words).join(' ');}
test('student can check, see explanation, finish, and retry without changing a checked answer',()=>{
 const state=[];let index=0;
 const Component=load('src/app/student/lesson/lesson-practice.tsx',{'react':{useState:initial=>{const n=index++;if(!(n in state))state[n]=initial;return [state[n],value=>state[n]=typeof value==='function'?value(state[n]):value];}},'@/lib/learning/practice':logic}).LessonPractice;
 const render=()=>{index=0;return Component({questions:[mcq,written]});};
 let tree=render();const button=(label)=>nodes(tree).find(n=>n.type==='button'&&words(n)===label);
 assert.equal(button('Check answer').props.disabled,true);assert.doesNotMatch(words(tree),/Why: It names/);
 nodes(tree).find(n=>n.type==='input'&&n.props.value==='a').props.onChange();tree=render();button('Check answer').props.onClick();tree=render();
 assert.match(words(tree),/Not quite/);assert.match(words(tree),/Why: It names an idea/);assert.equal(nodes(tree).find(n=>n.type==='input').props.disabled,true);
 nodes(tree).find(n=>n.type==='textarea').props.onChange({target:{value:'A naming word'}});tree=render();button('Check answer').props.onClick();tree=render();
 assert.equal(button('Finish practice & see score').props.disabled,true);button('My answer was correct').props.onClick();tree=render();assert.equal(button('Finish practice & see score').props.disabled,false);
 button('Finish practice & see score').props.onClick();tree=render();assert.match(words(tree),/Multiple-choice score:.*0.*1/);assert.match(words(tree),/Written self-review/);assert.match(words(tree),/Why: It names an idea/);
 button('Try again').props.onClick();tree=render();assert.doesNotMatch(words(tree),/Why: It names/);assert.equal(button('Check answer').props.disabled,true);
});
