const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { unstable_doesMiddlewareMatch } = require('next/experimental/testing/server');

const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/middleware.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const middleware = { exports: {}, require: () => ({}) };
vm.runInNewContext(output, middleware);
const matches = url => unstable_doesMiddlewareMatch({ config: middleware.exports.config, nextConfig: {}, url });

test('public homepage video files bypass authentication middleware', () => {
  for (const url of ['/media/corporate-office.mp4', '/media/corporate-office.webm', '/media/corporate-office.webm?v=2']) {
    assert.equal(matches(url), false, url);
  }
});

test('application routes and unrelated media remain covered by authentication middleware', () => {
  for (const url of ['/student/learning', '/college/dashboard', '/admin/dashboard', '/media/private.webm', '/media/corporate-office.webm/private']) {
    assert.equal(matches(url), true, url);
  }
});
