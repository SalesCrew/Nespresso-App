const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const cache = new Map();
function sourceModule(relative) {
  const filename = path.resolve(__dirname, '..', relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = name => name.startsWith('@/') ? sourceModule(name.slice(2) + '.ts') : original(name);
  cache.set(filename, loaded);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
  return loaded.exports;
}
const { premiumStatementUpdate, premiumAmount } = sourceModule('lib/statistics/premium.ts');
const rates = { vl: 6.19, vl_up: 6.19, tma: 6.19, gs: 1.65, aeroccino: 2.86 };
const statement = { vertuo: 14, vertuo_pop: 4, tma: 2, gutscheine: 76, aeroccino: 2, vorteilsbox: 7 };

test('an employee GS exception recalculates the existing quantities in cents', () => {
  assert.equal(premiumStatementUpdate(statement, rates).total_amount, 254.92);
  const updated = premiumStatementUpdate(statement, { ...rates, gs: 4.12 });
  assert.equal(updated.total_amount, 442.64);
  assert.equal(premiumAmount({ ...statement, ...updated }), 442.64);
});
test('correction preserves source quantities and returns a normalized snapshot', () => {
  const before = structuredClone(statement);
  const updated = premiumStatementUpdate(statement, { ...rates, gs: '4,12' });
  assert.deepEqual(statement, before);
  assert.deepEqual(updated.rate_snapshot, { ...rates, gs: 4.12 });
  assert.equal(updated.total_amount, 442.64);
});
test('decimal arithmetic rounds each category to cents without floating point drift', () => {
  const updated = premiumStatementUpdate({ ...statement, vertuo: 3, vertuo_pop: 0, tma: 0, gutscheine: 7, aeroccino: 0 },
    { vl: 0.1, vl_up: 0, tma: 0, gs: 0.2, aeroccino: 0 });
  assert.equal(updated.total_amount, 1.7);
});
test('invalid rates and persisted quantities cannot produce a corrected statement', () => {
  for (const values of [{ ...rates, gs: -1 }, { ...rates, gs: 1.234 }, { ...rates, gs: Infinity }, {}]) {
    assert.throws(() => premiumStatementUpdate(statement, values));
  }
  for (const count of [-1, 1.5, 'invalid']) {
    assert.throws(() => premiumStatementUpdate({ ...statement, gutscheine: count }, rates));
  }
});
test('amounts exceeding the database money precision are rejected', () => {
  assert.throws(() => premiumStatementUpdate({ ...statement, gutscheine: 2_147_483_647 }, { ...rates, gs: 99_999_999.99 }));
});
