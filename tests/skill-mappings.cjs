const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, require(id) { if (!(id in dependencies)) throw new Error(id); return dependencies[id]; } });
  return exports;
}
const validation = load('src/lib/skills/mapping-validation.ts');
const ids = [1,2,3].map(n => `00000000-0000-4000-8000-00000000000${n}`);
const row = (i, percent) => ({ skillId: ids[i], percent });
test('one skill and precise multi-skill percentages become weights totalling one', () => {
  assert.equal(validation.parseSkillMappings([row(0,'100')]).mappings[0].weight, 1);
  const split = validation.parseSkillMappings([row(0,'33.33'),row(1,'33.33'),row(2,'33.34')]);
  assert.equal(split.mappings.reduce((sum,m) => sum + m.weight,0), 1);
});
test('no mapping is allowed, duplicate skills and wrong totals are rejected', () => {
  assert.equal(validation.parseSkillMappings([]).mappings.length, 0);
  for (const input of [[row(0,'50'),row(0,'50')], [row(0,'99.99')], [row(0,'100'),row(1,'1')]]) assert.ok(validation.parseSkillMappings(input).error);
});
test('invalid payloads, identifiers and precision are rejected', () => {
  for (const value of [null, {}, [null], [{skillId:'bad',percent:'100'}], [row(0,'1e2')], [row(0,'100.001')], [row(0,'0')], [row(0,100)]]) {
    assert.ok(validation.parseSkillMappings(value).error);
  }
});
function fixture(options = {}) {
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: options.anonymous ? null : { id: 'admin' } }, error: null }) },
    from() { const q = { select: () => q, eq: () => q, single: async () => ({ data: { role: options.role || 'SUPER_ADMIN', status: options.status || 'ACTIVE' }, error: null }) }; return q; },
    rpc: async (name,args) => { calls.push([name,args]); return { error: options.rpcError ? {} : null }; },
  };
  return { calls, actions: load('src/lib/skills/mapping-actions.ts', {
    '@/lib/supabase/server': { createClient: async () => client }, './mapping-validation': validation, 'next/cache': { revalidatePath() {} },
  }) };
}
test('non-admin and inactive callers cannot invoke mapping writes', async () => {
  for (const options of [{anonymous:true}, {role:'STUDENT'}, {role:'COLLEGE_ADMIN'}, {status:'INACTIVE'}]) {
    const f=fixture(options); assert.ok((await f.actions.saveQuestionSkills(ids[0],[row(1,'100')])).error); assert.equal(f.calls.length,0);
  }
});
test('mapping save uses one atomic RPC and does not report failed writes as success', async () => {
  const f=fixture(); assert.ok((await f.actions.saveQuestionSkills(ids[0],[row(1,'100')])).success);
  assert.equal(f.calls.length,1); assert.equal(f.calls[0][0],'fn_set_question_skills');
  assert.equal(f.calls[0][1].p_mappings[0].weight,1);
  const bad=fixture({rpcError:true}); assert.ok((await bad.actions.saveQuestionSkills(ids[0],[row(1,'100')])).error);
});
