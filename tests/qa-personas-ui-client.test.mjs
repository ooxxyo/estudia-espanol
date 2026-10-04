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
  const nodes = new Map(['qa-status', 'qa-target', 'qa-confirm', 'qa-login-password'].map(id => [`#${id}`, new Control()]));
  const form = new Control(); form.button = new Control(); nodes.set(`#qa-${mode}`, form);
  return { root: { querySelector: id => nodes.get(id) }, form, target: nodes.get('#qa-target'), confirm: nodes.get('#qa-confirm'), status: nodes.get('#qa-status'), password: nodes.get('#qa-login-password') };
}
function response(data, ok = true) { return { ok, json: async () => data }; }

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
