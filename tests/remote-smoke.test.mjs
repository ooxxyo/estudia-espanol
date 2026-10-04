import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createCipheriv } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { readFile } from 'node:fs/promises';
import * as smoke from './remote-smoke.mjs';
import {
  QA_ORIGIN, OWNER_ID, assertTarget, requestDecision, readJsonOnce,
  validateOwnerAccount, validateVersionEvidence, decryptOwnerEnvelope, sanitizedReport,
} from './remote-smoke.mjs';

test('target guard rejects production, lookalikes, credentials, queries and non-HTTPS', () => {
  assert.equal(assertTarget(QA_ORIGIN), QA_ORIGIN);
  for (const target of ['https://estudia-espanol.netlify.app', 'http://rad-cajeta-60f537.netlify.app', `${QA_ORIGIN}.evil.test`, `${QA_ORIGIN}/?token=private`, 'https://user:secret@rad-cajeta-60f537.netlify.app', `${QA_ORIGIN}:444`, `${QA_ORIGIN}/other`]) {
    assert.throws(() => assertTarget(target), { code: 'TARGET_REJECTED' });
  }
});

class FictitiousTimeoutError extends Error {}

async function checkpointRig() {
  const input = new PassThrough();
  const browser = new EventEmitter();
  const context = new EventEmitter();
  const page = new EventEmitter();
  const signalSource = new EventEmitter();
  const events = [];
  const calls = { context: 0, page: 0, navigation: 0, authWait: 0 };
  browser.newContext = async () => { calls.context++; return context; };
  context.newPage = async () => { calls.page++; return page; };
  page.goto = async function (url, options) {
    assert.equal(this, page);
    assert.equal(url, QA_ORIGIN);
    assert.equal(options.timeout, 60_000);
    calls.navigation++; events.push('navigation');
  };
  page.getByRole = function () {
    assert.equal(this, page);
    return { waitFor: async options => { calls.authWait++; events.push('authWait'); assert.equal(options.timeout, smoke.AUTH_WAIT_TIMEOUT_MS); } };
  };
  page.url = () => QA_ORIGIN;
  assert.equal(await browser.newContext(), context);
  assert.equal(await context.newPage(), page);
  return { input, browser, context, page, signalSource, events, calls };
}

test('real checkpoint blocks navigation and auth until exact CONTINUE and preserves the same instances', async () => {
  const rig = await checkpointRig();
  let seen;
  const checkpointShown = new Promise(resolve => { seen = resolve; });
  const pending = smoke.authenticateWithCheckpoint(rig, {
    input: rig.input, signalSource: rig.signalSource, TimeoutError: FictitiousTimeoutError,
    onCheckpoint: message => { assert.match(message, /CHECKPOINT_HUMAN_BROWSER/); assert.match(message, /hacer clic y escribir/); rig.events.push('checkpoint'); seen(); },
    onContinue: () => rig.events.push('continue'),
    onWaiting: message => { assert.match(message, /WAITING_FOR_HUMAN_AUTH/); rig.events.push('authMessage'); },
  });
  await checkpointShown;
  assert.deepEqual(rig.calls, { context: 1, page: 1, navigation: 0, authWait: 0 });
  await Promise.resolve();
  assert.equal(rig.calls.navigation, 0);
  rig.input.write('CONTINUE\n');
  await pending;
  assert.deepEqual(rig.events, ['checkpoint','continue','navigation','authMessage','authWait']);
  assert.deepEqual(rig.calls, { context: 1, page: 1, navigation: 1, authWait: 1 });
  assert.equal(rig.input.listenerCount('data'), 0);
  rig.input.destroy();
});

test('explicit ABORT is HUMAN_BROWSER_UNUSABLE, with no navigation, auth wait or retry', async () => {
  const rig = await checkpointRig();
  let seen;
  const checkpointShown = new Promise(resolve => { seen = resolve; });
  const pending = smoke.authenticateWithCheckpoint(rig, { input: rig.input, signalSource: rig.signalSource, TimeoutError: FictitiousTimeoutError, onCheckpoint: () => seen(), onContinue: () => assert.fail('must not continue'), onWaiting: () => assert.fail('must not start auth') });
  await checkpointShown;
  rig.input.write('ABORT\n');
  let outcome;
  await assert.rejects(pending, error => { outcome = error; return error.code === 'HUMAN_BROWSER_UNUSABLE'; });
  assert.deepEqual(rig.calls, { context: 1, page: 1, navigation: 0, authWait: 0 });
  const report = sanitizedReport({ stage: 'human_browser_checkpoint', error: outcome });
  assert.equal(report.stage, 'human_browser_checkpoint');
  assert.equal(report.errorCode, 'HUMAN_BROWSER_UNUSABLE');
  rig.input.destroy();
});

test('arbitrary text and closed stdin never count as human confirmation or explicit ABORT', async () => {
  for (const command of ['yes', 'continue', 'CONTINUE extra', ' CONTINUE', '', null]) {
    const rig = await checkpointRig();
    let seen;
    const checkpointShown = new Promise(resolve => { seen = resolve; });
    const pending = smoke.authenticateWithCheckpoint(rig, { input: rig.input, signalSource: rig.signalSource, TimeoutError: FictitiousTimeoutError, onCheckpoint: () => seen(), onWaiting: () => assert.fail('must not start auth') });
    await checkpointShown;
    if (command === null) rig.input.end(); else rig.input.write(`${command}\n`);
    await assert.rejects(pending, { code: 'AUTH_UNKNOWN_FAILURE' });
    assert.equal(rig.calls.navigation, 0);
    assert.equal(rig.calls.authWait, 0);
    rig.input.destroy();
  }
});

test('closing the page, context or browser while checkpoint waits retains its demonstrated code', async () => {
  for (const [target,event,code] of [['page','close','AUTH_PAGE_CLOSED'],['context','close','AUTH_CONTEXT_CLOSED'],['browser','disconnected','AUTH_BROWSER_CLOSED'],['signalSource','SIGINT','AUTH_INTERRUPTED']]) {
    const rig = await checkpointRig();
    let seen;
    const checkpointShown = new Promise(resolve => { seen = resolve; });
    const pending = smoke.authenticateWithCheckpoint(rig, { input: rig.input, signalSource: rig.signalSource, TimeoutError: FictitiousTimeoutError, onCheckpoint: () => seen() });
    await checkpointShown;
    rig[target].emit(event, 'PRIVATE_EVENT_SECRET');
    await assert.rejects(pending, error => error.code === code && error.message === code);
    assert.equal(rig.calls.navigation, 0);
    assert.equal(rig.calls.authWait, 0);
    assert.equal(rig.input.listenerCount('data'), 0);
    rig.input.destroy();
  }
});

test('checkpoint traffic barrier allows no requests and leaves the approved decision policy unchanged afterward', () => {
  for (const request of [{ url: QA_ORIGIN, navigation: true }, { url: 'https://app.netlify.com/login', navigation: true }, { url: `${QA_ORIGIN}/.netlify/functions/account`, method: 'POST', body: '{"action":"sync"}' }, { url: 'https://fonts.gstatic.com/font.woff', method: 'GET' }]) {
    assert.equal(smoke.guardedRequestDecision(request, 'human_browser_checkpoint'), 'deny');
    assert.equal(smoke.guardedRequestDecision(request, 'netlify_auth'), requestDecision(request, 'netlify_auth'));
  }
});

test('authentication codes require demonstrated timeout, closure, navigation or interruption signals', () => {
  const cases = [
    [new FictitiousTimeoutError('synthetic'), {}, 'AUTH_TIMEOUT'],
    [new Error('private exception'), { pageClosed: true }, 'AUTH_PAGE_CLOSED'],
    [new Error('private exception'), { contextClosed: true }, 'AUTH_CONTEXT_CLOSED'],
    [new Error('private exception'), { browserClosed: true }, 'AUTH_BROWSER_CLOSED'],
    [new Error('private exception'), { interrupted: true }, 'AUTH_INTERRUPTED'],
    [new Error('private exception'), { navigationFailed: true }, 'AUTH_NAVIGATION_FAILED'],
    [new Error('TimeoutError in an untrusted message'), {}, 'AUTH_UNKNOWN_FAILURE'],
  ];
  for (const [error, signals, expected] of cases) {
    assert.equal(smoke.classifyAuthFailure(error, signals, FictitiousTimeoutError), expected);
  }
  assert.equal(smoke.classifyAuthFailure(new FictitiousTimeoutError(), { pageClosed: true, contextClosed: true, browserClosed: true }, FictitiousTimeoutError), 'AUTH_BROWSER_CLOSED');
});

test('auth request counters aggregate only fixed categories, resource types and decisions', () => {
  const counter = smoke.createAuthRequestCounter();
  const privateFields = { headers: { cookie: 'PRIVATE_COOKIE' }, body: 'PRIVATE_BODY', code: 'PRIVATE_CODE' };
  for (let i = 0; i < 2; i++) counter.record({ url: 'https://api.netlify.com/private/path?token=PRIVATE_TOKEN#PRIVATE_FRAGMENT', resourceType: 'fetch', decision: 'continue', ...privateFields });
  counter.record({ url: `${QA_ORIGIN}/private?code=PRIVATE_CODE`, resourceType: 'xhr', decision: 'deny', ...privateFields });
  counter.record({ url: 'https://sensitive-tenant.githubassets.com/private', resourceType: 'script', decision: 'deny' });
  counter.record({ url: 'https://sensitive-tenant.example.test/private', resourceType: 'PRIVATE_TYPE', decision: 'deny' });
  const rows = counter.snapshot();
  assert.equal(rows.reduce((sum, row) => sum + row.count, 0), 5);
  assert.equal(rows.find(row => row.hostCategory === 'netlify').count, 2);
  assert.equal(rows.find(row => row.hostCategory === 'github_auth').decision, 'deny');
  assert.equal(rows.find(row => row.hostCategory === 'unknown').resourceType, 'other');
  for (const row of rows) assert.deepEqual(Object.keys(row).sort(), ['count','decision','hostCategory','phase','resourceType']);
  assert.doesNotMatch(JSON.stringify(rows), /PRIVATE|https:|sensitive-tenant|private\/path|cookie|headers|body|query|fragment|token/);
  rows[0].count = 999;
  assert.notEqual(counter.snapshot()[0].count, 999);
});

test('report reprojects aggregated auth data and rejects raw or unknown diagnostic fields', () => {
  const valid = { phase: 'netlify_auth', hostCategory: 'netlify', resourceType: 'script', decision: 'deny', count: 2, url: 'PRIVATE_URL', headers: 'PRIVATE_HEADERS', body: 'PRIVATE_BODY' };
  const report = sanitizedReport({ stage: 'netlify_auth', authRequests: [valid, { ...valid, hostCategory: 'PRIVATE_HOST' }, { ...valid, count: -1 }] });
  assert.equal(report.authRequests.length, 1);
  assert.deepEqual(report.authRequests[0], { phase: 'netlify_auth', hostCategory: 'netlify', resourceType: 'script', decision: 'deny', count: 2 });
  assert.doesNotMatch(JSON.stringify(report), /PRIVATE|headers|body|url/);
});

test('human auth marker precedes one wait with a timeout separate from smoke timeouts', async () => {
  let calls = 0;
  const messages = [];
  const page = { getByRole: () => ({ waitFor: async options => {
    calls++;
    assert.equal(messages.length, 1);
    assert.equal(options.timeout, smoke.AUTH_WAIT_TIMEOUT_MS);
    assert.ok(options.timeout > smoke.SMOKE_NAVIGATION_TIMEOUT_MS);
  } }), url: () => QA_ORIGIN };
  await smoke.waitForHumanAuth(page, { signals: {}, TimeoutError: FictitiousTimeoutError, onWaiting: message => messages.push(message) });
  assert.equal(calls, 1);
  assert.match(messages[0], /WAITING_FOR_HUMAN_AUTH/);
  assert.match(messages[0], /Completa ahora el login normal de Netlify en ESTA ventana/);
  assert.match(messages[0], /Cuando termines, deja la ventana abierta/);
});

test('auth wait performs no retry and never exposes the original failure', async () => {
  for (const [signals, failure, code] of [
    [{}, new FictitiousTimeoutError('https://private.test/?token=PRIVATE'), 'AUTH_TIMEOUT'],
    [{pageClosed:true}, new Error('PRIVATE'), 'AUTH_PAGE_CLOSED'],
    [{contextClosed:true}, new Error('PRIVATE'), 'AUTH_CONTEXT_CLOSED'],
    [{browserClosed:true}, new Error('PRIVATE'), 'AUTH_BROWSER_CLOSED'],
    [{}, new Error('PRIVATE'), 'AUTH_UNKNOWN_FAILURE'],
  ]) {
    let calls = 0;
    const page = { getByRole: () => ({ waitFor: async () => { calls++; throw failure; } }), url: () => QA_ORIGIN };
    await assert.rejects(smoke.waitForHumanAuth(page, { signals, TimeoutError: FictitiousTimeoutError, onWaiting: () => {} }), error => error.code === code && error.message === code);
    assert.equal(calls, 1);
  }
});

test('lifecycle events distinguish page/context/browser closure and explicit interruption without retaining event payloads', async () => {
  for (const [target, event, flag, code] of [
    ['page','close','pageClosed','AUTH_PAGE_CLOSED'],
    ['context','close','contextClosed','AUTH_CONTEXT_CLOSED'],
    ['browser','disconnected','browserClosed','AUTH_BROWSER_CLOSED'],
    ['signals','SIGINT','interrupted','AUTH_INTERRUPTED'],
    ['signals','SIGTERM','interrupted','AUTH_INTERRUPTED'],
  ]) {
    const objects = { browser: new EventEmitter(), context: new EventEmitter(), page: new EventEmitter(), signals: new EventEmitter() };
    const watch = smoke.observeAuthLifecycle(objects.browser, objects.context, objects.page, objects.signals);
    const outcome = assert.rejects(watch.stop, { code });
    objects[target].emit(event, 'PRIVATE_EVENT_BODY');
    await outcome;
    assert.equal(watch.signals[flag], true);
    assert.doesNotMatch(JSON.stringify(watch.signals), /PRIVATE/);
    watch.dispose();
    assert.equal(Object.values(objects).reduce((sum, object) => sum + object.eventNames().reduce((n, name) => n + object.listenerCount(name), 0), 0), 0);
  }
});

test('auth interruption stops a pending wait; a foreign final origin never starts QA smoke', async () => {
  const pendingPage = { getByRole: () => ({ waitFor: () => new Promise(() => {}) }), url: () => QA_ORIGIN };
  await assert.rejects(smoke.waitForHumanAuth(pendingPage, { signals: { interrupted: true }, TimeoutError: FictitiousTimeoutError, stop: Promise.reject(new Error('PRIVATE')), onWaiting: () => {} }), { code: 'AUTH_INTERRUPTED' });
  const foreignPage = { getByRole: () => ({ waitFor: async () => {} }), url: () => 'https://other-project.netlify.app/' };
  await assert.rejects(smoke.waitForHumanAuth(foreignPage, { signals: {}, TimeoutError: FictitiousTimeoutError, onWaiting: () => {} }), { code: 'UNEXPECTED_REDIRECT' });
});

test('instrumentation preserves auth guard decisions and never introduces persisted authentication', async () => {
  assert.equal(requestDecision({ url: 'https://api.netlify.com/example', method: 'POST' }, 'netlify_auth'), 'continue');
  assert.equal(requestDecision({ url: 'https://unknown.example.test/script.js', method: 'GET' }, 'netlify_auth'), 'deny');
  assert.equal(requestDecision({ url: `${QA_ORIGIN}/.netlify/functions/account`, method: 'POST', body: '{"action":"sync"}' }, 'netlify_auth'), 'deny');
  assert.equal(requestDecision({ url: `${QA_ORIGIN}/.netlify/functions/presence`, method: 'POST' }, 'netlify_auth'), 'exclude_presence');
  const source = await readFile(new URL('./remote-smoke.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /launchPersistentContext|storageState\s*[:(]|recordHar\s*:|recordVideo\s*:|tracing\.start/);
  assert.match(source, /headless:\s*false/);
});

test('real request guard permits only normal owner login and QA-session logout writes', () => {
  assert.equal(requestDecision({ url: `${QA_ORIGIN}/.netlify/functions/account`, method: 'POST', body: JSON.stringify({ action: 'login', identifier: 'qa-owner', password: 'fictitious', remember: false }) }, 'owner_login'), 'continue');
  assert.equal(requestDecision({ url: `${QA_ORIGIN}/.netlify/functions/qa-session-ui`, method: 'POST', body: '{"action":"logout"}' }, 'logout'), 'continue');
  for (const action of ['register', 'sync', 'reset-password', 'dev-login', 'logout']) {
    assert.equal(requestDecision({ url: `${QA_ORIGIN}/.netlify/functions/account`, method: 'POST', body: JSON.stringify({ action }) }, 'owner_login'), 'deny');
  }
  assert.equal(requestDecision({ url: `${QA_ORIGIN}/.netlify/functions/account`, method: 'POST', body: '{"action":"login","identifier":"superdev"}' }, 'owner_login'), 'deny');
  assert.equal(requestDecision({ url: `${QA_ORIGIN}/.netlify/functions/qa-session-ui`, method: 'POST', body: '{"action":"logout","username":"testmem"}' }, 'logout'), 'deny');
});

test('presence is excluded, seed/reset/unknown Functions and foreign navigation are denied', () => {
  assert.equal(requestDecision({ url: `${QA_ORIGIN}/.netlify/functions/presence`, method: 'POST' }, 'desktop'), 'exclude_presence');
  for (const endpoint of ['qa-reset', 'qa-seed', 'qa-inspect', 'admin']) {
    assert.equal(requestDecision({ url: `${QA_ORIGIN}/.netlify/functions/${endpoint}`, method: 'GET' }, 'desktop'), 'deny');
  }
  assert.equal(requestDecision({ url: 'https://estudia-espanol.netlify.app/', method: 'GET', navigation: true }, 'netlify_auth'), 'deny');
  assert.equal(requestDecision({ url: 'https://app.netlify.com/login?transient=private', method: 'GET', navigation: true }, 'netlify_auth'), 'continue');
  assert.equal(requestDecision({ url: 'https://app.netlify.com/login', method: 'GET', navigation: true }, 'desktop'), 'deny');
  assert.equal(requestDecision({ url: `${QA_ORIGIN}/?auth=private`, method: 'GET', navigation: true }, 'desktop'), 'deny');
});

test('read failures stop after one attempt and request no redirects or retries', async () => {
  let calls = 0;
  await assert.rejects(readJsonOnce({ get: async (_url, options) => {
    calls++;
    assert.equal(options.maxRedirects, 0);
    assert.equal(options.maxRetries, 0);
    throw new Error('PRIVATE password cookie token signed-url');
  } }, '/.netlify/functions/account'), { code: 'READ_FAILED' });
  assert.equal(calls, 1);
  await assert.rejects(readJsonOnce({ get: async () => { throw new Error('must not call'); } }, '/.netlify/functions/qa-seed'), { code: 'READ_TARGET_REJECTED' });
});

test('HTTP errors and invalid JSON fail safely without exposing response details', async () => {
  await assert.rejects(readJsonOnce({ get: async () => ({ status: () => 503, dispose: async () => {} }) }, '/.netlify/functions/account'), { code: 'READ_HTTP_FAILED' });
  await assert.rejects(readJsonOnce({ get: async () => ({ status: () => 200, json: async () => { throw new Error('private body'); }, dispose: async () => {} }) }, '/.netlify/functions/account'), { code: 'READ_JSON_FAILED' });
});

test('owner account validates real identity, active owner and absent cloud baseline', () => {
  const account = { authenticated: true, user: { id: OWNER_ID, username: 'qa-owner', status: 'active', role: 'owner' }, cloudState: null, cloudUpdatedAt: 0 };
  assert.doesNotThrow(() => validateOwnerAccount(account));
  for (const user of [{ ...account.user, id: 'other' }, { ...account.user, role: 'admin' }, { ...account.user, status: 'suspended' }]) {
    assert.throws(() => validateOwnerAccount({ ...account, user }), { code: 'OWNER_ACCOUNT_INVALID' });
  }
  assert.throws(() => validateOwnerAccount({ ...account, cloudState: {} }), { code: 'OWNER_BASELINE_CHANGED' });
});

test('dashboard evidence accepts only exact owner ID, username and sessionVersion two', () => {
  assert.doesNotThrow(() => validateVersionEvidence({ id: OWNER_ID, username: 'qa-owner', sessionVersion: 2 }));
  for (const row of [{ id: OWNER_ID, username: 'qa-owner', sessionVersion: 1 }, { id: 'other', username: 'qa-owner', sessionVersion: 2 }, { id: OWNER_ID, username: 'qa-owner', sessionVersion: 2, password: 'private' }]) {
    assert.throws(() => validateVersionEvidence(row), { code: 'OWNER_VERSION_INVALID' });
  }
});

test('vault encryption is authenticated to the specific QA owner and secrets never enter reports', () => {
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('rad-cajeta-60f537:qa-owner'));
  const password = 'A'.repeat(43);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify({ username: 'qa-owner', password, recoveryCode: 'PRIVATE-RECOVERY' })), cipher.final()]);
  const envelope = { version: 1, project: 'rad-cajeta-60f537', username: 'qa-owner', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
  assert.equal(decryptOwnerEnvelope(envelope, key), password);
  assert.throws(() => decryptOwnerEnvelope({ ...envelope, username: 'testmem' }, key), { code: 'VAULT_INVALID' });
  const report = sanitizedReport({ stage: 'owner_login', error: new Error(password), checks: { owner: true }, password, cookies: 'PRIVATE', loginCount: password, logoutCount: 'PRIVATE', url: 'https://auth.test/?token=PRIVATE' });
  assert.doesNotMatch(JSON.stringify(report), /AAAA|PRIVATE|password|cookie|https:/);
  assert.equal(report.result, 'FAIL');
  key.fill(0);
});
