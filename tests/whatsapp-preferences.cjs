const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../src/lib/notifications/preferences.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exportsObject});
const parse = exportsObject.parseWhatsAppPreferences;
function form(values) { const f=new FormData();for(const [k,v] of Object.entries(values))f.set(k,v);return f; }
test('normalizes international numbers without assuming a country',()=>{
  assert.equal(parse(form({enabled:'on',phone:'+91 (98765) 43210',scores:'on'})).values.p_phone,'+919876543210');
});
test('rejects local numbers, letters and oversized international numbers',()=>{
  for(const phone of ['9876543210','+0 12345678','+91hello12345678','+1234567890123456'])assert.ok(parse(form({enabled:'on',phone,scores:'on'})).error);
});
test('opt out works even without a number and clears all update flags',()=>{
  const value=parse(form({phone:'invalid',scores:'on'})).values;
  assert.equal(value.p_phone,null);assert.equal(value.p_enabled,false);assert.equal(value.p_scores,false);
});
test('requires selected update types when opting in',()=>{
  assert.ok(parse(form({enabled:'on',phone:'+919876543210'})).error);
});
test('caller-supplied user id and verification state are never forwarded',()=>{
  const values=parse(form({enabled:'on',phone:'+919876543210',learning:'on',user_id:'another-user',verified:'true'})).values;
  assert.equal(Object.keys(values).length,5);assert.ok(!('user_id' in values));assert.ok(!('verified' in values));
});
