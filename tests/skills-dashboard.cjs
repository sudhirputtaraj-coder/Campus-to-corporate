// Run with: node tests/skills-dashboard.cjs
// Uses the project's installed TypeScript and React; no test dependencies required.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');

function load(relativePath, dependencies = {}) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, console, require(id) {
    if (Object.hasOwn(dependencies, id)) return dependencies[id];
    if (id === 'react/jsx-runtime') return require(id);
    throw new Error(`Unexpected dependency: ${id}`);
  } });
  return exports;
}

const types = load('src/lib/skills/types.ts');
const model = load('src/lib/skills/dashboard.ts', { '@/lib/learning/path-order': load('src/lib/learning/path-order.ts') });
const skills = types.SKILL_CODES.map((code, i) => ({ id: `skill-${i}`, code, name: code === 'COMM' ? 'Communication' : code, description: null }));
const validAttempt = { id: 'valid-attempt', attempt_number: 1, completed_at: '2026-09-18T10:00:00Z', created_at: '2026-09-18T09:00:00Z', assessment: { title: 'Email Etiquette Quiz', is_practice: false } };
const invalidAttempt = { ...validAttempt, id: 'invalid-attempt', attempt_number: 2, completed_at: '2026-09-19T10:00:00Z' };
const snapshot = { id: 'valid-snapshot', skill_id: skills[0].id, attempt_id: validAttempt.id, proficiency: 66.67, applicable_question_count: 3, is_valid: true };
const invalidSnapshot = { ...snapshot, id: 'invalid-snapshot', attempt_id: invalidAttempt.id, proficiency: 50, applicable_question_count: 2, is_valid: false };
const summary = { skill_id: skills[0].id, current_proficiency: 66.67, last_valid_snapshot_id: snapshot.id, last_attempt_id: validAttempt.id };

test('seven unmeasured skills stay unscored', () => {
  const cards = model.buildSkillCards(skills, [], [], [], []);
  assert.equal(cards.length, 7);
  assert.ok(cards.every(card => card.score === null && !card.unavailable));
});

test('latest invalid evidence never replaces the persisted valid score', () => {
  const card = model.buildSkillCards(skills, [summary], [snapshot, invalidSnapshot], [validAttempt, invalidAttempt], [validAttempt.id, invalidAttempt.id]).find(card => card.code === 'COMM');
  assert.equal(card.score, 66.67);
  assert.equal(card.source.id, snapshot.id);
  assert.equal(card.history[0].id, invalidSnapshot.id);
  assert.equal(card.history[1].id, snapshot.id);
});

test('valid zero is a score, not a missing value', () => {
  const card = model.buildSkillCards(skills, [{ ...summary, current_proficiency: 0 }], [{ ...snapshot, proficiency: 0 }], [validAttempt], [validAttempt.id]).find(card => card.code === 'COMM');
  assert.equal(card.score, 0);
  assert.equal(card.unavailable, false);
});

test('practice evidence cannot provide a displayed score or history', () => {
  const practice = { ...validAttempt, assessment: { ...validAttempt.assessment, is_practice: true } };
  const card = model.buildSkillCards(skills, [summary], [snapshot], [practice], [practice.id]).find(card => card.code === 'COMM');
  assert.equal(card.score, null);
  assert.equal(card.unavailable, true);
  assert.equal(card.history.length, 0);
});

test('old current source remains visible outside the recent history window', () => {
  const card = model.buildSkillCards(skills, [summary], [snapshot], [validAttempt], []).find(card => card.code === 'COMM');
  assert.equal(card.score, 66.67);
  assert.equal(card.source.attempt.id, validAttempt.id);
  assert.equal(card.history.length, 0);
});

test('broken provenance is unavailable rather than unassessed', () => {
  const card = model.buildSkillCards(skills, [summary], [], [], []).find(card => card.code === 'COMM');
  assert.equal(card.score, null);
  assert.equal(card.unavailable, true);
});

async function renderPage(options = {}) {
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: options.anonymous ? null : { id: 'owner' } } }) },
    from(table) {
      const call = { table, filters: {}, columns: '' };
      calls.push(call);
      const chain = {
        select(columns) { call.columns = columns; return chain; },
        eq(key, value) { call.filters[key] = value; return chain; },
        in(key, values) { call.filters[key] = values; return chain; },
        order() { return chain; }, limit(n) { call.limit = n; return chain; }, single() { return chain; },
        then(resolve, reject) {
          let data;
          if (table === 'students') {
            assert.equal(call.filters.user_id, 'owner');
            data = options.noStudent ? null : { id: 'student' };
          } else if (table === 'skills') {
            assert.equal(call.filters.status, 'ACTIVE');
            data = skills;
          } else {
            assert.equal(call.filters.student_id, 'student', `${table} must be scoped to the authenticated student`);
            if (table === 'student_skill_summaries') data = options.empty ? [] : [summary];
            else if (table === 'assessment_attempts') {
              assert.equal(call.filters.status, 'GRADED');
              assert.equal(call.filters['assessment.is_practice'], false);
              if (call.filters.id) {
                assert.ok(call.filters.id.includes(validAttempt.id));
                data = [validAttempt];
              } else {
                assert.equal(call.limit, 50);
                data = options.empty ? [] : options.oldSource ? [invalidAttempt] : [invalidAttempt, validAttempt];
              }
            } else if (table === 'student_skill_snapshots') {
              assert.ok(call.filters.attempt_id.includes(validAttempt.id));
              data = [snapshot, invalidSnapshot];
            } else throw new Error(`Unexpected table: ${table}`);
          }
          assert.ok(!call.columns.includes('correct_answer'));
          return Promise.resolve({ data, error: options.failTable === table ? { message: 'test failure' } : null }).then(resolve, reject);
        },
      };
      return chain;
    },
  };
  const page = load('src/app/student/skills/page.tsx', {
    '@/lib/supabase/server': { createClient: async () => client },
    '@/lib/auth/actions': { logout: async () => {} },
    '@/lib/skills/dashboard': model,
    'next/navigation': { redirect: destination => { throw new Error(`redirect:${destination}`); } },
    'next/link': { __esModule: true, default: props => React.createElement('a', props) },
    'lucide-react': { GraduationCap: () => null, LogOut: () => null, ArrowLeft: () => null, Home: () => null },
  });
  const html = renderToStaticMarkup(await page.default());
  return { html, calls };
}

test('page renders proficiency, source, history and six unassessed skills with scoped queries', async () => {
  const { html } = await renderPage();
  assert.ok(html.includes('66.67'));
  assert.ok(html.includes('1 of 7 skills assessed'));
  assert.equal((html.match(/Not yet assessed/g) || []).length, 6);
  assert.ok(html.includes('/student/results/valid-attempt'));
  assert.ok(html.includes('Insufficient evidence'));
});

test('page separately loads an older source assessment', async () => {
  const { html, calls } = await renderPage({ oldSource: true });
  assert.equal(calls.filter(call => call.table === 'assessment_attempts').length, 2);
  assert.ok(html.includes('66.67'));
});

test('empty student history shows seven unassessed skills without a zero proficiency', async () => {
  const { html } = await renderPage({ empty: true });
  assert.equal((html.match(/Not yet assessed/g) || []).length, 7);
  assert.ok(!html.includes('<meter'));
});

for (const failTable of ['skills', 'student_skill_summaries', 'assessment_attempts', 'student_skill_snapshots']) {
  test(`${failTable} failure is an error state, not absent evidence`, async () => {
    const { html } = await renderPage({ failTable });
    assert.ok(html.includes('Skills could not be loaded'));
    assert.ok(!html.includes('Not yet assessed'));
  });
}

test('anonymous visitors are redirected', async () => {
  await assert.rejects(() => renderPage({ anonymous: true }), /redirect:\/login/);
});

test('missing student profile is redirected', async () => {
  await assert.rejects(() => renderPage({ noStudent: true }), /redirect:\/student\/dashboard/);
});
