const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../lib/statistics/kpiFeedback.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const moduleUnderTest = new Module(filename, module);
moduleUnderTest.filename = filename;
moduleUnderTest.paths = Module._nodeModulePaths(path.dirname(filename));
moduleUnderTest._compile(compiled, filename);
const { kpiDeliverySchema, toKpiFeedbackRecords } = moduleUnderTest.exports;
const recipient = '11111111-1111-4111-8111-111111111111';
const item = { user_id: recipient, mc_et: 4.2, vl_value: 24, tma: 88 };

test('KPI-only delivery requires no generated message and starts unread', () => {
  const parsed = kpiDeliverySchema.parse({ deliveryMode: 'kpis-only', feedbackItems: [item] });
  assert.deepEqual(toKpiFeedbackRecords(parsed), [{ ...item, feedback_text: '', magic_touch: null, read: false }]);
});
test('sending without a message discards existing generated text and magic touch', () => {
  const parsed = kpiDeliverySchema.parse({ deliveryMode: 'kpis-only', feedbackItems: [{ ...item, feedback_text: 'Do not send this draft', magic_touch: 'Beeindruckt' }] });
  const [saved] = toKpiFeedbackRecords(parsed);
  assert.equal(saved.feedback_text, '');
  assert.equal(saved.magic_touch, null);
});
test('legacy message requests remain compatible and preserve the reviewed text', () => {
  const parsed = kpiDeliverySchema.parse({ feedbackItems: [{ ...item, feedback_text: '  Dein Feedback.  ', magic_touch: 'Zufrieden' }] });
  assert.equal(parsed.deliveryMode, 'feedback');
  const [saved] = toKpiFeedbackRecords(parsed);
  assert.equal(saved.feedback_text, 'Dein Feedback.');
  assert.equal(saved.magic_touch, 'Zufrieden');
});
test('message mode rejects missing, empty or whitespace-only text', () => {
  for (const text of [undefined, '', ' \n ']) {
    assert.equal(kpiDeliverySchema.safeParse({ deliveryMode: 'feedback', feedbackItems: [{ ...item, feedback_text: text }] }).success, false);
  }
});
test('decimal comma and percent inputs normalize without accepting malformed values', () => {
  const parsed = kpiDeliverySchema.parse({ deliveryMode: 'kpis-only', feedbackItems: [{ ...item, mc_et: '4,2', vl_value: '24,5 %', tma: '88%' }] });
  const [saved] = toKpiFeedbackRecords(parsed);
  assert.equal(saved.mc_et, 4.2); assert.equal(saved.vl_value, 24.5); assert.equal(saved.tma, 88);
  for (const value of ['', null, NaN, Infinity, -1, '12coffee', '1,2,3']) {
    assert.equal(kpiDeliverySchema.safeParse({ deliveryMode: 'kpis-only', feedbackItems: [{ ...item, mc_et: value }] }).success, false);
  }
});
test('recipients, percentage bounds, database precision and batch shape are validated', () => {
  for (const changed of [{ user_id: 'unknown' }, { vl_value: 101 }, { tma: -1 }, { mc_et: 1000 }]) {
    assert.equal(kpiDeliverySchema.safeParse({ deliveryMode: 'kpis-only', feedbackItems: [{ ...item, ...changed }] }).success, false);
  }
  for (const feedbackItems of [[], {}, Array(501).fill(item)]) {
    assert.equal(kpiDeliverySchema.safeParse({ deliveryMode: 'kpis-only', feedbackItems }).success, false);
  }
  assert.equal(kpiDeliverySchema.safeParse({ deliveryMode: 'unknown', feedbackItems: [item] }).success, false);
});
