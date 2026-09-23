const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, deps = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, { exports, require: id => deps[id] || require(id) });
  return exports;
}
const parser = load('src/lib/learning/lesson-text.ts');
const { LessonContent } = load('src/app/student/lesson/lesson-content.tsx', { '@/lib/learning/lesson-text': parser });
const data = require('../content/corporate-readiness-handbook.json');
const lessons = data.modules.flatMap(m => m.lessons);
test('complete source structure: 25 modules, 39 lessons, all seven skill mappings', () => {
  assert.equal(data.modules.length, 25);
  assert.equal(lessons.length, 39);
  assert.equal(new Set([data.id, ...data.modules.map(m => m.id), ...lessons.map(l => l.id)]).size, 65);
  assert.deepEqual([...new Set(data.modules.map(m => m.skill_code))].sort(), ['ADAPT','COMM','CRT','PROB','PROF','TEAM','TIME']);
  assert.equal(data.modules.find(m => m.number === '1.5').lessons.length, 5);
  assert.equal(data.modules.find(m => m.number === '2.2').lessons.length, 9);
});
test('all 22 handbook tables render as tables without dropped cells', () => {
  const blocks = lessons.flatMap(l => parser.parseLessonText(l.content));
  assert.equal(blocks.filter(b => b.type === 'table').length, 22);
  assert.equal(blocks.filter(b => b.type === 'table').every(b => b.rows.every(r => r.length === b.headers.length)), true);
  for (const l of lessons) {
    assert.ok(l.content.length < 100000);
    assert.ok(l.title.length <= 200);
    const html = renderToStaticMarkup(React.createElement(LessonContent, { content: l.content }));
    assert.ok(html.length > 50);
  }
});
test('HTML and unsafe links remain inert text', () => {
  const html = renderToStaticMarkup(React.createElement(LessonContent, { content: '## <script>alert(1)</script>\n\n[click](javascript:alert(1))\n\n| Name | Value |\n| --- | --- |\n| <img src=x onerror=alert(1)> | test |' }));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('<a '));
  assert.ok(html.includes('&lt;script&gt;'));
});
test('escaped separators, multiline text and malformed tables preserve text', () => {
  const parsed = JSON.parse(JSON.stringify(parser.parseLessonText('Line one\r\nLine two\r\n\r\n| A | B |\n| --- | --- |\n| left \\| right | C:\\\\Temp |')));
  assert.equal(parsed[0].text, 'Line one\nLine two');
  assert.deepEqual(parsed[1].rows, [['left | right', 'C:\\Temp']]);
  assert.equal(parser.parseLessonText('| A | B |\n| broken |')[0].type, 'paragraph');
});
test('handbook import creates no graded assessments, videos, purchases or skill scores', () => {
  const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/018_readiness_handbook.sql'), 'utf8');
  assert.ok(!/INSERT INTO public\.(assessments|questions|programme_purchases|student_skill_snapshots|student_skill_summaries)/i.test(sql));
  assert.ok(lessons.every(l => !l.video_url));
});
