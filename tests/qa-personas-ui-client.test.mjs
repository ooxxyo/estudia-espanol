import test from 'node:test';
import assert from 'node:assert/strict';
import { mountQaPersonasUI } from '../public/js/qa-personas-ui.mjs';

class Control {
  constructor(value = '') { this.value = value; this.checked = false; this.disabled = false; this.hidden = false; this.textContent = ''; }
  addEventListener(name, fn) { this[name] = fn; }
  querySelector() { return this.button; }
  submitEvent() { return this.submit({ preventDefault() {} }); }
}
function fixture(mode = 'reset') {
  const nodes = new Map(['qa-status', 'qa-target', 'qa-confirm', 'qa-login-password', 'qa-diagnostic'].map(id => [`#${id}`, new Control()]));
  const form = new Control(); form.button = new Control(); nodes.set(`#qa-${mode}`, form);
  return { root: { querySelector: id => nodes.get(id) }, form, target: nodes.get('#qa-target'), confirm: nodes.get('#qa-confirm'), status: nodes.get('#qa-status'), password: nodes.get('#qa-login-password'), diagnostic: nodes.get('#qa-diagnostic') };
}
function response(data, ok = true) { return { ok, json: async () => data }; }

const validReset = { ok: true, username: 'qa-student', reauthenticate: false };
const validVerification = { environment: 'qa', personas: [{ username: 'qa-student', exists: true, canonical: true, baselineCorrect: true, role: 'member' }] };
const privateFixture = 'FICTITIOUS-COOKIE-PASSWORD-RECOVERY-SIGNED-URL';
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status });

test('reset diagnostics distinguish preparation, fetch, HTTP, JSON and server-result failures without leaking input', async t => {
  const cases = [
    { name: 'before fetch', run: () => { throw Error(privateFixture); }, send: async () => assert.fail('fetch must not start'), calls: 0,
      expected: { stage: 'prepare_request', errorCode: 'REQUEST_PREPARATION_FAILED', httpStatus: null, requestPrepared: false, fetchStarted: false, responseReceived: false, jsonParsed: false } },
    { name: 'fetch failure', send: async () => { throw Error(privateFixture); }, calls: 1,
      expected: { stage: 'fetch_started', errorCode: 'RESET_FETCH_FAILED', httpStatus: null, requestPrepared: true, fetchStarted: true, responseReceived: false, jsonParsed: false } },
    { name: 'HTTP failure', send: async () => reply({ error: privateFixture }, 403), calls: 1,
      expected: { stage: 'response_non_ok', errorCode: 'RESET_RESPONSE_NON_OK', httpStatus: 403, requestPrepared: true, fetchStarted: true, responseReceived: true, jsonParsed: false } },
    { name: 'invalid JSON', send: async () => new Response(privateFixture, { status: 200 }), calls: 1,
      expected: { stage: 'response_parse_failed', errorCode: 'RESET_RESPONSE_PARSE_FAILED', httpStatus: 200, requestPrepared: true, fetchStarted: true, responseReceived: true, jsonParsed: false } },
    { name: 'server reports failure', send: async () => reply({ ok: false, error: privateFixture, code: privateFixture }), calls: 1,
      expected: { stage: 'server_reported_failure', errorCode: 'SERVER_REPORTED_FAILURE', httpStatus: 200, requestPrepared: true, fetchStarted: true, responseReceived: true, jsonParsed: true } },
    { name: 'unexpected reset identity', send: async () => reply({ ok: true, username: privateFixture }), calls: 1,
      expected: { stage: 'server_reported_failure', errorCode: 'RESET_RESULT_INVALID', httpStatus: 200, requestPrepared: true, fetchStarted: true, responseReceived: true, jsonParsed: true } },
  ];
  for (const c of cases) await t.test(c.name, async () => {
    const f = fixture(); let calls = 0;
    mountQaPersonasUI(f.root, async (...args) => { calls++; return c.send(...args); }, () => assert.fail('no reload'), c.run ?? (() => 'qa-reset-fixture'));
    f.target.value = 'qa-student'; f.confirm.checked = true;
    await f.form.submitEvent();
    assert.deepEqual(JSON.parse(f.diagnostic.textContent), {
      username: 'qa-student', ...c.expected, verificationHttpStatus: null, postVerificationStarted: false, postVerificationFinished: false,
    });
    assert.equal(f.diagnostic.hidden, false);
    assert.doesNotMatch(f.diagnostic.textContent + f.status.textContent, new RegExp(privateFixture));
    assert.equal(f.form.hidden, true);
    assert.match(f.status.textContent, /Operación detenida/);
    assert.equal(calls, c.calls);
    // Even a second submit on the hidden form must not start another operation.
    f.target.value = 'qa-admin'; f.confirm.checked = true;
    await f.form.submitEvent();
    assert.equal(calls, c.calls);
  });
});

test('post-verification failures preserve reset evidence and stop without a second reset', async t => {
  const cases = [
    { name: 'network', verify: async () => { throw Error(privateFixture); }, status: null, code: 'VERIFY_FETCH_FAILED' },
    { name: 'HTTP', verify: async () => reply({ error: privateFixture }, 401), status: 401, code: 'VERIFY_RESPONSE_NON_OK' },
    { name: 'JSON', verify: async () => new Response(privateFixture, { status: 200 }), status: 200, code: 'VERIFY_RESPONSE_PARSE_FAILED' },
    { name: 'baseline', verify: async () => reply({ ...validVerification, personas: [] }), status: 200, code: 'VERIFY_RESULT_INVALID' },
    { name: 'malformed object', verify: async () => reply(null), status: 200, code: 'VERIFY_RESULT_INVALID' },
  ];
  for (const c of cases) await t.test(c.name, async () => {
    const f = fixture(); const sent = [];
    mountQaPersonasUI(f.root, async (url, options) => {
      sent.push({ url, options });
      return url.endsWith('qa-reset') ? reply(validReset) : c.verify();
    }, () => assert.fail('no reload'), () => 'qa-reset-fixture');
    f.target.value = 'qa-student'; f.confirm.checked = true;
    await f.form.submitEvent();
    assert.deepEqual(JSON.parse(f.diagnostic.textContent), {
      username: 'qa-student', stage: 'post_verify_failed', errorCode: c.code, httpStatus: 200, verificationHttpStatus: c.status,
      requestPrepared: true, fetchStarted: true, responseReceived: true, jsonParsed: true, postVerificationStarted: true, postVerificationFinished: false,
    });
    assert.equal(sent.length, 2);
    assert.equal(sent[0].options.method, 'POST');
    assert.equal(sent[1].url, '/.netlify/functions/qa-personas-ui?format=json');
    assert.equal(f.form.hidden, true);
    assert.doesNotMatch(f.diagnostic.textContent + f.status.textContent, new RegExp(privateFixture));
  });
});

test('success completes only after verified baseline and projects only safe fields', async () => {
  const f = fixture(); let calls = 0;
  mountQaPersonasUI(f.root, async () => reply(++calls === 1 ? { ...validReset, password: privateFixture, recovery: privateFixture, cookie: privateFixture, headers: privateFixture } : { ...validVerification, account: privateFixture }), () => assert.fail('no reload'), () => 'qa-reset-fixture');
  f.target.value = 'qa-student'; f.confirm.checked = true;
  await f.form.submitEvent();
  assert.deepEqual(JSON.parse(f.diagnostic.textContent), {
    username: 'qa-student', stage: 'complete', errorCode: null, httpStatus: 200, verificationHttpStatus: 200,
    requestPrepared: true, fetchStarted: true, responseReceived: true, jsonParsed: true, postVerificationStarted: true, postVerificationFinished: true,
  });
  assert.equal(f.form.hidden, false);
  assert.equal(calls, 2);
  assert.doesNotMatch(f.diagnostic.textContent, /FICTITIOUS|password|recovery|cookie|headers|account|runId/);
});

test('owner self-reset completes acknowledgement without claiming post-verification', async () => {
  const f = fixture(); let calls = 0;
  mountQaPersonasUI(f.root, async () => { calls++; return reply({ ok: true, username: 'qa-owner', reauthenticate: true }); }, () => {}, () => 'qa-reset-fixture');
  f.target.value = 'qa-owner'; f.confirm.checked = true;
  await f.form.submitEvent();
  const d = JSON.parse(f.diagnostic.textContent);
  assert.equal(d.stage, 'complete'); assert.equal(d.errorCode, null);
  assert.equal(d.postVerificationStarted, false); assert.equal(d.postVerificationFinished, false);
  f.confirm.checked = true;
  await f.form.submitEvent();
  assert.equal(calls, 1);
});

test('in-flight diagnostics reflect fetch started and prevent overlapping submissions', async () => {
  const f = fixture(); let resolveFetch; let calls = 0;
  const pending = new Promise(resolve => { resolveFetch = resolve; });
  mountQaPersonasUI(f.root, async () => { calls++; return calls === 1 ? pending : reply(validVerification); }, () => {}, () => 'qa-reset-fixture');
  f.target.value = 'qa-student'; f.confirm.checked = true;
  const operation = f.form.submitEvent();
  const d = JSON.parse(f.diagnostic.textContent);
  assert.equal(d.stage, 'fetch_started'); assert.equal(d.fetchStarted, true); assert.equal(d.responseReceived, false);
  await f.form.submitEvent(); assert.equal(calls, 1);
  resolveFetch(reply(validReset)); await operation;
  assert.equal(calls, 2);
});

test('reset requires selection and confirmation, sends only one target and verifies canonical state', async () => {
  const f = fixture(); const sent = [];
  mountQaPersonasUI(f.root, async (url, options) => {
    sent.push({ url, options });
    return url.endsWith('qa-reset') ? response({ ok: true, username: 'qa-student', reauthenticate: false })
      : response({ environment: 'qa', personas: [{ username: 'qa-student', exists: true, canonical: true, baselineCorrect: true, role: 'member' }] });
  }, () => assert.fail('must not reload'), () => 'qa-reset-fixed-run');
  await f.form.submitEvent(); assert.equal(sent.length, 0);
  f.target.value = 'superdev'; f.confirm.checked = true;
  await f.form.submitEvent(); assert.equal(sent.length, 0);
  f.target.value = 'qa-student';
  await f.form.submitEvent();
  assert.equal(sent.length, 2);
  assert.equal(sent[0].url, '/.netlify/functions/qa-reset');
  assert.deepEqual(JSON.parse(sent[0].options.body), { runId: 'qa-reset-fixed-run', username: 'qa-student' });
  assert.equal(sent[0].options.credentials, 'same-origin');
  assert.equal(sent[1].url, '/.netlify/functions/qa-personas-ui?format=json');
  assert.equal(f.status.textContent, 'qa-student: baseline y rol verificados.');
  assert.equal(f.confirm.checked, false);
});
test('self-reset stops controls and requires reauthentication instead of writing more data', async () => {
  const f = fixture(); let calls = 0;
  mountQaPersonasUI(f.root, async () => { calls++; return response({ ok: true, username: 'qa-owner', reauthenticate: true }); });
  f.target.value = 'qa-owner'; f.confirm.checked = true;
  await f.form.submitEvent();
  assert.equal(calls, 1); assert.equal(f.form.hidden, true);
  assert.match(f.status.textContent, /Sesión invalidada/);
});
test('failed reset or failed verification stops without automatic retries', async () => {
  for (const failedAt of ['post', 'verify']) {
    const f = fixture(); let calls = 0;
    mountQaPersonasUI(f.root, async () => {
      calls++;
      return failedAt === 'post' ? response({}, false) : calls === 1 ? response({ ok: true, username: 'qa-admin' })
        : response({ environment: 'qa', personas: [{ username: 'qa-admin', exists: true, canonical: true, baselineCorrect: true, role: 'member' }] });
    });
    f.target.value = 'qa-admin'; f.confirm.checked = true;
    await f.form.submitEvent();
    assert.equal(calls, failedAt === 'post' ? 1 : 2);
    assert.equal(f.form.hidden, true); assert.match(f.status.textContent, /Operación detenida/);
  }
});
test('login uses normal account authentication without syncing progress and clears the password', async () => {
  for (const authorized of [true, false]) {
    const f = fixture('login'); const sent = []; let reloads = 0;
    f.password.value = 'Fictitious-client-only!';
    mountQaPersonasUI(f.root, async (url, options) => { sent.push({ url, options }); return response({ ok: true, user: { role: authorized ? 'owner' : 'member' } }); }, () => reloads++);
    await f.form.submitEvent();
    assert.equal(sent.length, 1); assert.equal(sent[0].url, '/.netlify/functions/account');
    assert.deepEqual(JSON.parse(sent[0].options.body), { action: 'login', identifier: 'qa-owner', password: 'Fictitious-client-only!', remember: false });
    assert.equal(f.password.value, ''); assert.equal(reloads, authorized ? 1 : 0);
  }
});
