import test from 'node:test';
import assert from 'node:assert/strict';
import { getStore, __resetAll } from '@netlify/blobs';
import { USERS, createSession, roleForUser, authenticateRequest, COOKIE } from '../netlify/functions/_shared/auth.mjs';
import account from '../netlify/functions/account.mjs';
import reset from '../netlify/functions/qa-reset.mjs';

let ui;
try { ({ default: ui } = await import('../netlify/functions/qa-personas-ui.mjs')); } catch {}
const names = ['qa-student-new', 'qa-student', 'qa-admin', 'qa-owner', 'qa-suspended'];
const progress = getStore('study-hub-progress-v1');
const audit = getStore('study-hub-admin-audit-v1');
const unrelated = getStore('study-hub-feedback-v1');
const fakePassword = 'Fictitious-only-7C-pass!';

function request(name, token, body, method = body ? 'POST' : 'GET') {
  return new Request(`https://qa.example.test/.netlify/functions/${name}`, {
    method, headers: { cookie: token ? `${COOKIE}=${token}` : '', 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function user(username) {
  const index = await USERS.get(`username/${username}`, { type: 'json' });
  return index ? USERS.get(`user/${index.userId}`, { type: 'json' }) : null;
}
async function register(username) {
  const response = await account(request('account', '', { action: 'register', username, email: '', password: fakePassword, remember: false }));
  assert.equal(response.status, 201);
  return user(username);
}
test.beforeEach(() => {
  __resetAll();
  Object.assign(process.env, { STUDY_HUB_ENV: 'qa', QA_TOOLS_ENABLED: 'true', OWNER_USERNAME: 'prior-owner,qa-owner', ADMIN_USERNAMES: 'prior-admin;qa-admin' });
});

test('UI is absent outside exact QA even with valid Owner session', async () => {
  assert.equal(typeof ui, 'function', 'QA persona interface is missing');
  const token = await createSession(await register('qa-owner'));
  for (const env of ['production', 'local-test', 'staging', 'QA', '', 'unknown']) {
    process.env.STUDY_HUB_ENV = env;
    const denied = await ui(request('qa-personas-ui', token));
    assert.equal(denied.status, 404);
    assert.doesNotMatch(await denied.text(), /qa-diagnostic|qa-personas-ui\.mjs/);
  }
  process.env.STUDY_HUB_ENV = 'qa';
  for (const flag of ['false', 'TRUE', '']) {
    process.env.QA_TOOLS_ENABLED = flag;
    const denied = await ui(request('qa-personas-ui', token));
    assert.equal(denied.status, 404);
    assert.doesNotMatch(await denied.text(), /qa-diagnostic|qa-personas-ui\.mjs/);
  }
});

test('UI requires backend capability and exposes only a login form before authorization', async () => {
  assert.equal(typeof ui, 'function');
  const anonymous = await ui(request('qa-personas-ui'));
  assert.equal(anonymous.status, 401);
  assert.match(await anonymous.text(), /id="qa-login"/);
  for (const name of ['qa-student', 'qa-admin']) {
    const denied = await ui(request('qa-personas-ui', await createSession(await register(name))));
    assert.equal(denied.status, 403);
    assert.doesNotMatch(await denied.text(), /id="qa-reset"/);
  }
  const suspended = await register('qa-owner');
  suspended.status = 'suspended';
  await USERS.setJSON(`user/${suspended.id}`, suspended);
  assert.equal((await ui(request('qa-personas-ui', await createSession(suspended)))).status, 401);
});

test('Owner page lists only canonical personas, requires confirmation and forbids caching/framing', async () => {
  assert.equal(typeof ui, 'function');
  const response = await ui(request('qa-personas-ui', await createSession(await register('qa-owner'))));
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const name of names) assert.match(html, new RegExp(`value="${name}"`));
  assert.match(html, /id="qa-reset"/);
  assert.match(html, /id="qa-confirm"/);
  assert.match(html, /id="qa-diagnostic"[^>]*hidden/);
  assert.doesNotMatch(html, /value="superdev"|value="testmem"|qa-seed|seed-token|reset-all|recoveryCode|passwordHash/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.match(response.headers.get('content-security-policy'), /connect-src 'self'/);
  assert.equal((await ui(request('qa-personas-ui', '', {}, 'POST'))).status, 405);
});

test('normal registration then resets produce canonical state while preserving other accounts and stores', async () => {
  assert.equal(typeof ui, 'function');
  await USERS.setJSON('user/superdev', { id: 'superdev', username: 'superdev', sentinel: 'retain' });
  await USERS.setJSON('username/superdev', { userId: 'superdev' });
  await USERS.setJSON('user/testmem', { id: 'testmem', username: 'testmem', sentinel: 'retain' });
  await unrelated.setJSON('reports/sentinel', { keep: true });
  for (const name of names) await register(name);
  const ids = Object.fromEntries(await Promise.all(names.map(async n => [n, (await user(n)).id])));
  assert.equal(new Set(Object.values(ids)).size, 5);
  const owner = await user('qa-owner');
  const password = owner.password;
  const recovery = owner.recovery;
  const token = await createSession(owner);
  for (const name of ['qa-student-new', 'qa-student', 'qa-admin', 'qa-suspended', 'qa-owner']) {
    const response = await reset(request('qa-reset', token, { runId: `test-reset-${name}`, username: name }));
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.reauthenticate, name === 'qa-owner');
    assert.equal((await user(name)).id, ids[name]);
  }
  assert.equal(roleForUser(await user('qa-owner')), 'owner');
  assert.equal(roleForUser(await user('qa-admin')), 'admin');
  assert.equal(roleForUser({ username: 'prior-owner' }), 'owner');
  assert.equal(roleForUser({ username: 'prior-admin' }), 'admin');
  assert.deepEqual((await user('qa-owner')).password, password);
  assert.deepEqual((await user('qa-owner')).recovery, recovery);
  assert.equal((await user('qa-suspended')).status, 'suspended');
  assert.equal((await authenticateRequest(request('account', token))).reason, 'revoked');
  assert.equal(await progress.get(`user/${ids['qa-owner']}`), null);
  assert.equal((await progress.get(`user/${ids['qa-student']}`)).state.totalAnswered, 4);
  assert.equal((await progress.get(`user/${ids['qa-student']}`)).state.totalCorrect, 3);
  assert.deepEqual(await unrelated.get('reports/sentinel'), { keep: true });
  assert.equal((await USERS.get('user/superdev')).sentinel, 'retain');
  assert.equal((await USERS.get('user/testmem')).sentinel, 'retain');
  const refreshed = await ui(request('qa-personas-ui?format=json', await createSession(await user('qa-owner'))));
  assert.equal(refreshed.status, 200);
  const status = await refreshed.json();
  assert.deepEqual(status.personas.map(p => p.username), names);
  assert.ok(status.personas.every(p => p.exists && p.canonical && p.baselineCorrect));
  const events = await audit.list({ prefix: 'events/' });
  assert.equal(events.blobs.length, 5);
  assert.doesNotMatch(JSON.stringify(status), /password|recovery|cookie|token|salt|hash/i);
});

test('reset rejects non-QA names, extra fields and malformed IDs without writes', async () => {
  const token = await createSession(await register('qa-owner'));
  for (const body of [
    { runId: 'test-outside', username: 'superdev' },
    { runId: 'test-outside', username: 'testmem' },
    { runId: 'test-extra', username: 'qa-owner', all: true },
    { runId: 'bad id', username: 'qa-owner' },
  ]) assert.equal((await reset(request('qa-reset', token, body))).status, 400);
  assert.equal((await audit.list({ prefix: 'events/' })).blobs.length, 0);
});

test('SuperDev access requires its existing authentication flag; inconsistent indexes abort read-only', async () => {
  const privileged = { id: 'superdev', username: 'superdev', status: 'active', sessionVersion: 1 };
  await USERS.setJSON('user/superdev', privileged);
  assert.equal((await ui(request('qa-personas-ui', await createSession(privileged)))).status, 403);
  assert.equal((await ui(request('qa-personas-ui', await createSession(privileged, false, { superdevAuthenticated: true })))).status, 200);
  await USERS.setJSON('username/qa-student', { userId: 'superdev' });
  const response = await ui(request('qa-personas-ui?format=json', await createSession(privileged, false, { superdevAuthenticated: true })));
  assert.equal(response.status, 409);
  assert.equal((await USERS.get('user/superdev')).username, 'superdev');
  assert.equal((await audit.list({ prefix: 'events/' })).blobs.length, 0);
});
