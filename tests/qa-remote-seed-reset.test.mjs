import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { getStore, __resetAll, __inspectionSnapshot, __inspectionGuard, __inspectionAccess } from '@netlify/blobs';
import accountHandler from '../netlify/functions/account.mjs';
import {
  COOKIE,
  authenticateRequest,
  createSession,
  roleForUser,
} from '../netlify/functions/_shared/auth.mjs';

let seedHandler;
let resetHandler;
try { ({ default: seedHandler } = await import('../netlify/functions/qa-seed.mjs')); } catch {}
try { ({ default: resetHandler } = await import('../netlify/functions/qa-reset.mjs')); } catch {}

const USERS = getStore('study-hub-users-v1');
const PROGRESS = getStore('study-hub-progress-v1');
const AUDIT = getStore('study-hub-admin-audit-v1');
const FEEDBACK = getStore('study-hub-feedback-v1');
const USERNAMES = ['qa-student-new', 'qa-student', 'qa-admin', 'qa-owner', 'qa-suspended'];

function passwordFor(username, version = 'one') {
  return `${username}-${version}-A9!`;
}

function seedBody(runId = 'run-001', version = 'one') {
  return {
    runId,
    accounts: Object.fromEntries(USERNAMES.map(username => [username, { password: passwordFor(username, version) }])),
  };
}

function request(path, { method = 'POST', body, seedToken, sessionToken } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (seedToken) headers['x-qa-seed-token'] = seedToken;
  if (sessionToken) headers.cookie = `${COOKIE}=${sessionToken}`;
  return new Request(`https://qa.study-hub.test/.netlify/functions/${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function responsePayload(response) {
  assert.equal(typeof response?.status, 'number');
  return { status: response.status, data: await response.json() };
}

async function callSeed(body = seedBody(), token = process.env.QA_SEED_TOKEN) {
  return responsePayload(await seedHandler(request('qa-seed', { body, seedToken: token })));
}

async function userFor(username) {
  const index = await USERS.get(`username/${username}`, { type: 'json', consistency: 'strong' });
  return index?.userId ? USERS.get(`user/${index.userId}`, { type: 'json', consistency: 'strong' }) : null;
}

async function login(username, password) {
  return responsePayload(await accountHandler(request('account', {
    body: { action: 'login', identifier: username, password, remember: false },
  })));
}

async function seedPersonas() {
  const result = await callSeed();
  assert.equal(result.status, 200, JSON.stringify(result.data));
  return Object.fromEntries(await Promise.all(USERNAMES.map(async username => [username, await userFor(username)])));
}

test.beforeEach(() => {
  __resetAll();
  process.env.STUDY_HUB_ENV = 'qa';
  process.env.QA_TOOLS_ENABLED = 'true';
  process.env.OWNER_USERNAME = 'qa-owner';
  process.env.ADMIN_USERNAMES = 'qa-admin';
  process.env.QA_SEED_TOKEN = `seed-${randomUUID()}`;
  delete process.env.DEV_LOGIN_CODE;
});

test('qa-seed permanece oculto fuera de qa exacto y cuando QA Tools está deshabilitado', async () => {
  assert.equal(typeof seedHandler, 'function', 'falta implementar qa-seed');
  for (const environment of ['production', 'staging', 'QA', '', undefined]) {
    if (environment === undefined) delete process.env.STUDY_HUB_ENV;
    else process.env.STUDY_HUB_ENV = environment;
    assert.equal((await callSeed()).status, 404);
  }
  process.env.STUDY_HUB_ENV = 'qa';
  for (const enabled of [undefined, 'false', 'TRUE']) {
    if (enabled === undefined) delete process.env.QA_TOOLS_ENABLED;
    else process.env.QA_TOOLS_ENABLED = enabled;
    assert.equal((await callSeed()).status, 404);
  }
});

test('qa-seed acepta solo POST y un token correcto enviado por header', async () => {
  assert.equal(typeof seedHandler, 'function', 'falta implementar qa-seed');
  assert.equal((await responsePayload(await seedHandler(request('qa-seed', { method: 'GET' })))).status, 405);
  assert.equal((await callSeed(seedBody(), '')).status, 401);
  assert.equal((await callSeed(seedBody(), 'incorrecto')).status, 401);
  assert.equal((await callSeed()).status, 200);
});

test('qa-seed rechaza body, runId, usernames o passwords fuera del contrato', async () => {
  assert.equal(typeof seedHandler, 'function', 'falta implementar qa-seed');
  assert.equal((await callSeed(null)).status, 400);
  assert.equal((await callSeed(seedBody('espacios no'))).status, 400);
  const arbitrary = seedBody();
  delete arbitrary.accounts['qa-student-new'];
  arbitrary.accounts['persona-arbitraria'] = { password: 'Password-123!' };
  assert.equal((await callSeed(arbitrary)).status, 400);
  const weak = seedBody();
  weak.accounts['qa-student'].password = 'corta';
  assert.equal((await callSeed(weak)).status, 400);
  const extra = seedBody();
  extra.accounts['qa-owner'].role = 'owner';
  assert.equal((await callSeed(extra)).status, 400);
});

test('qa-seed crea las cinco cuentas reales con roles, suspensión y progreso canónicos', async () => {
  const result = await callSeed();
  assert.equal(result.status, 200);
  assert.deepEqual(result.data.accounts.map(row => row.username).sort(), USERNAMES.slice().sort());
  assert.doesNotMatch(JSON.stringify(result.data), /password|hash|seed-|token/i);

  const personas = Object.fromEntries(await Promise.all(USERNAMES.map(async username => [username, await userFor(username)])));
  assert.equal(roleForUser(personas['qa-student-new']), 'member');
  assert.equal(roleForUser(personas['qa-student']), 'member');
  assert.equal(roleForUser(personas['qa-admin']), 'admin');
  assert.equal(roleForUser(personas['qa-owner']), 'owner');
  assert.equal(personas['qa-suspended'].status, 'suspended');
  assert.equal(await PROGRESS.get(`user/${personas['qa-student-new'].id}`, { type: 'json' }), null);
  const progress = await PROGRESS.get(`user/${personas['qa-student'].id}`, { type: 'json' });
  assert.equal(progress.state.totalAnswered, 4);
  assert.equal(progress.state.totalCorrect, 3);
  assert.equal(progress.state.session, null);
  assert.equal((await login('qa-suspended', passwordFor('qa-suspended'))).status, 401);
});

test('qa-seed repetido conserva identidades, reemplaza passwords e invalida sesiones', async () => {
  const first = await seedPersonas();
  const oldSession = await createSession(first['qa-student']);
  const firstIds = Object.fromEntries(USERNAMES.map(username => [username, first[username].id]));
  assert.equal((await login('qa-student', passwordFor('qa-student'))).status, 200);

  const secondSeed = await callSeed(seedBody('run-002', 'two'));
  assert.equal(secondSeed.status, 200);
  const second = Object.fromEntries(await Promise.all(USERNAMES.map(async username => [username, await userFor(username)])));
  assert.deepEqual(Object.fromEntries(USERNAMES.map(username => [username, second[username].id])), firstIds);
  assert.equal(second['qa-student'].sessionVersion, first['qa-student'].sessionVersion + 1);
  const rows = await USERS.list({ prefix: 'user/' });
  assert.equal(rows.blobs.length, 5);
  assert.equal((await login('qa-student', passwordFor('qa-student'))).status, 401);
  assert.equal((await login('qa-student', passwordFor('qa-student', 'two'))).status, 200);
  const stale = await authenticateRequest(request('account', { method: 'GET', sessionToken: oldSession }));
  assert.equal(stale.ok, false);
  assert.equal(stale.reason, 'revoked');
});

test('qa-reset permanece oculto fuera de qa y exige sesión Owner con qa:tools', async () => {
  assert.equal(typeof resetHandler, 'function', 'falta implementar qa-reset');
  const personas = await seedPersonas();
  const tokens = Object.fromEntries(await Promise.all(['qa-student', 'qa-admin', 'qa-owner'].map(async username => [username, await createSession(personas[username])])));

  for (const environment of ['production', 'staging', 'QA', '', undefined]) {
    if (environment === undefined) delete process.env.STUDY_HUB_ENV;
    else process.env.STUDY_HUB_ENV = environment;
    assert.equal((await responsePayload(await resetHandler(request('qa-reset', { body: { runId: 'run-003', username: 'qa-student' }, sessionToken: tokens['qa-owner'] })))).status, 404);
  }
  process.env.STUDY_HUB_ENV = 'qa';
  delete process.env.QA_TOOLS_ENABLED;
  assert.equal((await responsePayload(await resetHandler(request('qa-reset', { body: { runId: 'run-003', username: 'qa-student' }, sessionToken: tokens['qa-owner'] })))).status, 404);
  process.env.QA_TOOLS_ENABLED = 'true';
  assert.equal((await responsePayload(await resetHandler(request('qa-reset', { body: { runId: 'run-003', username: 'qa-student' }, seedToken: process.env.QA_SEED_TOKEN })))).status, 401);
  assert.equal((await responsePayload(await resetHandler(request('qa-reset', { body: { runId: 'run-003', username: 'qa-student' }, sessionToken: tokens['qa-student'] })))).status, 403);
  assert.equal((await responsePayload(await resetHandler(request('qa-reset', { body: { runId: 'run-003', username: 'qa-student' }, sessionToken: tokens['qa-admin'] })))).status, 403);
  assert.equal((await responsePayload(await resetHandler(request('qa-reset', { body: { runId: 'run-003', username: 'qa-student' }, sessionToken: tokens['qa-owner'] })))).status, 200);
});

test('qa-reset restaura una sola cuenta y no borra datos globales ni ajenos', async () => {
  const personas = await seedPersonas();
  const ownerToken = await createSession(personas['qa-owner']);
  await USERS.setJSON(`user/${personas['qa-student'].id}`, { ...personas['qa-student'], displayName: 'Mutado', status: 'suspended' });
  await PROGRESS.setJSON(`user/${personas['qa-student'].id}`, { updatedAt: 999, state: { totalAnswered: 999 } });
  await PROGRESS.setJSON(`user/${personas['qa-student-new'].id}`, { updatedAt: 999, state: { totalAnswered: 77 } });
  await FEEDBACK.setJSON('reports/sentinel', { id: 'sentinel', userId: personas['qa-student'].id });

  const result = await responsePayload(await resetHandler(request('qa-reset', {
    body: { runId: 'run-004', username: 'qa-student' },
    sessionToken: ownerToken,
  })));
  assert.equal(result.status, 200);
  assert.equal((await userFor('qa-student')).displayName, 'QA Student');
  assert.equal((await PROGRESS.get(`user/${personas['qa-student'].id}`, { type: 'json' })).state.totalAnswered, 4);
  assert.equal((await PROGRESS.get(`user/${personas['qa-student-new'].id}`, { type: 'json' })).state.totalAnswered, 77);
  assert.deepEqual(await FEEDBACK.get('reports/sentinel', { type: 'json' }), { id: 'sentinel', userId: personas['qa-student'].id });
});

test('qa-reset valida allowlist/runId y explicita la autoinvalidación del Owner', async () => {
  const personas = await seedPersonas();
  const ownerToken = await createSession(personas['qa-owner']);
  assert.equal((await responsePayload(await resetHandler(request('qa-reset', {
    body: { runId: 'run inválido', username: 'qa-student' }, sessionToken: ownerToken,
  })))).status, 400);
  assert.equal((await responsePayload(await resetHandler(request('qa-reset', {
    body: { runId: 'run-005', username: 'persona-arbitraria' }, sessionToken: ownerToken,
  })))).status, 400);

  const result = await responsePayload(await resetHandler(request('qa-reset', {
    body: { runId: 'run-005', username: 'qa-owner' }, sessionToken: ownerToken,
  })));
  assert.equal(result.status, 200);
  assert.equal(result.data.reauthenticate, true);
  const auth = await authenticateRequest(request('account', { method: 'GET', sessionToken: ownerToken }));
  assert.equal(auth.ok, false);
  assert.equal(auth.reason, 'revoked');
});

test('audit QA registra scope/run/target sin passwords, hashes, cookies ni seed token', async () => {
  const personas = await seedPersonas();
  const ownerToken = await createSession(personas['qa-owner']);
  await resetHandler(request('qa-reset', {
    body: { runId: 'run-audit-01', username: 'qa-student' },
    sessionToken: ownerToken,
  }));
  const { blobs } = await AUDIT.list({ prefix: 'events/' });
  assert.ok(blobs.length >= 6);
  const events = await Promise.all(blobs.map(row => AUDIT.get(row.key, { type: 'json' })));
  assert.ok(events.some(event => event.action === 'qa-seed' && event.targetUsername === 'qa-student'));
  assert.ok(events.some(event => event.action === 'qa-reset' && event.runId === 'run-audit-01'));
  const serialized = JSON.stringify(events);
  assert.doesNotMatch(serialized, /password|passwordHash|recovery|cookie|sessionToken|qa_seed_token/i);
  assert.doesNotMatch(serialized, new RegExp(process.env.QA_SEED_TOKEN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  for (const username of USERNAMES) assert.doesNotMatch(serialized, new RegExp(passwordFor(username)));
});

test('sin QA_SEED_TOKEN qa-seed permanece inerte: 401 y cero escrituras incluso ocultas', async () => {
  await USERS.setJSON('user/protected-superdev', { id: 'protected-superdev', username: 'superdev', sessionVersion: 1 });
  await USERS.setJSON('username/superdev', { userId: 'protected-superdev' });
  await PROGRESS.setJSON('user/protected-superdev', { state: { totalAnswered: 7 }, updatedAt: 1 });
  const before = __inspectionSnapshot();
  delete process.env.QA_SEED_TOKEN;
  __inspectionGuard(true);
  try {
    const response = await seedHandler(request('qa-seed', { body: seedBody(), seedToken: 'fictitious-disabled-token' }));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.deepEqual(__inspectionSnapshot(), before);
    assert.deepEqual(__inspectionAccess().writes, []);
  } finally { __inspectionGuard(false); }
});
