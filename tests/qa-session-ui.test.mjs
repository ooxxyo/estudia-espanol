import test from 'node:test';
import assert from 'node:assert/strict';
import { getStore, __resetAll, __inspectionSnapshot, __inspectionGuard, __inspectionAccess, __inspectionFault } from '@netlify/blobs';
import { USERS, COOKIE, createSession, tokenHash, authenticateRequest } from '../netlify/functions/_shared/auth.mjs';
import account from '../netlify/functions/account.mjs';
let ui;
try { ({ default: ui } = await import('../netlify/functions/qa-session-ui.mjs')); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; }
const origin = 'https://qa.example.test';
function req(token = '', body, options = {}) {
  return new Request(`${origin}/.netlify/functions/qa-session-ui${options.query || ''}`, {
    method: options.method || (body === undefined ? 'GET' : 'POST'),
    headers: { cookie: `${COOKIE}=${token}; netlify_fixture=unrelated`, origin, 'content-type': 'application/json', ...options.headers },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
}
async function fixture() {
  assert.equal(typeof ui, 'function', 'QA current-session control missing');
  const member = { id: 'member-id', username: 'qa-student-new', status: 'active', sessionVersion: 1, password: { hash: 'fictitious-hash', salt: 'fictitious-salt' }, recovery: { hash: 'fictitious-recovery' } };
  await USERS.setJSON('user/member-id', member);
  await USERS.setJSON('username/qa-student-new', { userId: 'member-id' });
  await USERS.setJSON('user/protected-id', { id: 'protected-id', username: 'testmem', status: 'active', sessionVersion: 2 });
  await getStore('study-hub-progress-v1').setJSON('user/member-id', { state: { totalAnswered: 9, theme: 'dark', session: { mode: 'practica' } }, updatedAt: 20 });
  await getStore('study-hub-progress-v1').setJSON('user/protected-id', { state: { totalAnswered: 3 }, updatedAt: 10 });
  await getStore('study-hub-feedback-v1').setJSON('protected', { keep: true });
  const token = await createSession(member, false);
  const sameUserOtherSession = await createSession(member, false);
  const otherSession = await createSession(await USERS.get('user/protected-id'), false);
  return { token, sameUserOtherSession, otherSession };
}
test.beforeEach(() => { __resetAll(); Object.assign(process.env, { STUDY_HUB_ENV: 'qa', QA_TOOLS_ENABLED: 'true' }); });

test('Member closes only the current session through real logout; full other-store snapshot is unchanged', async () => {
  const { token, sameUserOtherSession, otherSession } = await fixture();
  const before = __inspectionSnapshot();
  assert.equal((await authenticateRequest(req(token))).role, 'member');
  const result = await ui(req(token, { action: 'logout' }));
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { ok: true });
  assert.equal(result.headers.get('set-cookie'), 'studyhub_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
  assert.doesNotMatch(result.headers.get('set-cookie'), /netlify|Domain=/i);
  const expected = structuredClone(before);
  const sessions = expected.find(([name]) => name === 'study-hub-sessions-v1');
  sessions[1] = sessions[1].filter(([key]) => key !== `session/${tokenHash(token)}`);
  assert.deepEqual(__inspectionSnapshot(), expected);
  assert.equal((await authenticateRequest(req(token))).ok, false);
  assert.equal((await authenticateRequest(req(sameUserOtherSession))).ok, true);
  assert.equal((await authenticateRequest(req(otherSession))).ok, true);
  const afterAccount = await account(new Request(`${origin}/.netlify/functions/account`, { headers: { cookie: `${COOKIE}=${token}` } }));
  assert.equal(afterAccount.status, 200);
  assert.equal((await afterAccount.json()).authenticated, false);
});

test('all non-QA environments and disabled flags return 404 before any mutation', async () => {
  const { token } = await fixture();
  const before = __inspectionSnapshot();
  __inspectionGuard();
  for (const env of ['production', 'local-test', 'staging', 'QA', 'unknown', '', undefined]) {
    if (env === undefined) delete process.env.STUDY_HUB_ENV; else process.env.STUDY_HUB_ENV = env;
    for (const body of [undefined, { action: 'logout' }]) assert.equal((await ui(req(token, body))).status, 404);
  }
  process.env.STUDY_HUB_ENV = 'qa';
  for (const flag of ['false', 'TRUE', '', undefined]) {
    if (flag === undefined) delete process.env.QA_TOOLS_ENABLED; else process.env.QA_TOOLS_ENABLED = flag;
    assert.equal((await ui(req(token))).status, 404);
    assert.equal((await ui(req(token, { action: 'logout' }))).status, 404);
  }
  assert.deepEqual(__inspectionSnapshot(), before);
  assert.deepEqual(__inspectionAccess().writes, []);
});

test('GET is read-only and exposes the automated control without secrets', async () => {
  const { token } = await fixture(); const before = __inspectionSnapshot(); __inspectionGuard();
  const result = await ui(req(token)); const body = await result.text();
  assert.equal(result.status, 200);
  assert.match(body, /Cerrar sesión QA/);
  assert.match(body, /id="qa-session-logout"/);
  assert.doesNotMatch(body, new RegExp(`${token}|fictitious-hash|fictitious-salt|fictitious-recovery`));
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.match(result.headers.get('content-security-policy'), /connect-src 'self'/);
  assert.match(result.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.deepEqual(__inspectionSnapshot(), before); assert.deepEqual(__inspectionAccess().writes, []);
});

test('targets, tokens, extra fields, queries and other actions cannot affect a different session', async () => {
  const { token, otherSession } = await fixture(); const before = __inspectionSnapshot(); __inspectionGuard();
  for (const body of [
    { action: 'logout', username: 'testmem' }, { action: 'logout', userId: 'protected-id' },
    { action: 'logout', token: otherSession }, { action: 'logout', all: true }, { action: 'sync' },
    {}, [], null, '{broken',
  ]) assert.equal((await ui(req(token, body))).status, 400);
  assert.equal((await ui(req(token, { action: 'logout' }, { query: '?username=testmem' }))).status, 400);
  assert.equal((await ui(req(token, { action: 'logout' }, { headers: { 'content-length': '129' } }))).status, 413);
  assert.equal((await ui(req(token, ' '.repeat(129)))).status, 413);
  assert.deepEqual(__inspectionSnapshot(), before); assert.deepEqual(__inspectionAccess().writes, []);
});

test('cross-origin and missing-origin posts are denied without touching sessions', async () => {
  const { token } = await fixture(); const before = __inspectionSnapshot(); __inspectionGuard();
  for (const originHeader of ['https://other.example.test', '', 'null']) {
    assert.equal((await ui(req(token, { action: 'logout' }, { headers: { origin: originHeader } }))).status, 403);
  }
  assert.deepEqual(__inspectionSnapshot(), before); assert.deepEqual(__inspectionAccess().writes, []);
});

test('unsupported methods do not log out or write', async () => {
  const { token } = await fixture(); const before = __inspectionSnapshot(); __inspectionGuard();
  for (const method of ['PUT', 'DELETE', 'OPTIONS']) assert.equal((await ui(req(token, undefined, { method }))).status, 405);
  assert.deepEqual(__inspectionSnapshot(), before); assert.deepEqual(__inspectionAccess().writes, []);
});

test('already-anonymous cleanup expires only the Study Hub cookie and preserves stores', async () => {
  await fixture(); const before = __inspectionSnapshot();
  const result = await ui(req('', { action: 'logout' }));
  assert.equal(result.status, 200); assert.match(result.headers.get('set-cookie'), /^studyhub_session=;/);
  assert.deepEqual(__inspectionSnapshot(), before);
});

test('a suspended current member can terminate only their own normal session', async () => {
  const { token, otherSession } = await fixture();
  const member = await USERS.get('user/member-id'); member.status = 'suspended'; await USERS.setJSON('user/member-id', member);
  const result = await ui(req(token, { action: 'logout' }));
  assert.equal(result.status, 200);
  assert.equal((await authenticateRequest(req(token), { allowSuspended: true })).ok, false);
  assert.equal((await authenticateRequest(req(otherSession))).ok, true);
  assert.equal((await USERS.get('user/member-id')).status, 'suspended');
});

test('a final real-auth read failure produces a safe failure without a retry or success cookie', async () => {
  const { token } = await fixture(); const before = __inspectionSnapshot(); let reads = 0;
  __inspectionFault(event => { if (event.name === 'study-hub-sessions-v1' && event.method === 'get') { reads++; throw new Error('Fictitious secret details'); } return event.result; });
  const response = await ui(req(token, { action: 'logout' }));
  assert.equal(response.status, 500); assert.equal(reads, 1);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.doesNotMatch(await response.text(), /Fictitious secret|token|password|recovery|salt/i);
  assert.deepEqual(__inspectionSnapshot(), before);
});
