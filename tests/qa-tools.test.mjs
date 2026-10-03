import test from 'node:test';
import assert from 'node:assert/strict';
import { getStore, __resetAll } from '@netlify/blobs';
import { COOKIE, createSession } from '../netlify/functions/_shared/auth.mjs';
import qaToolsHandler from '../netlify/functions/qa-tools.mjs';
import { qaToolsEnabled, studyHubEnvironment } from '../netlify/functions/_shared/qa-access.mjs';

const USERS = getStore('study-hub-users-v1');

function request(token = '') {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.cookie = `${COOKIE}=${token}`;
  return new Request('https://study-hub.test/.netlify/functions/qa-tools', { headers });
}

async function payload(response) {
  assert.equal(typeof response?.status, 'number', 'qa-tools debe devolver un Response');
  return { status: response.status, data: await response.json() };
}

async function putUser(input) {
  const user = {
    sessionVersion: 1,
    status: 'active',
    createdAt: 1,
    updatedAt: 1,
    normalizedUsername: input.username.toLowerCase(),
    ...input,
  };
  await USERS.setJSON(`user/${user.id}`, user);
  await USERS.setJSON(`username/${user.normalizedUsername}`, { userId: user.id });
  return user;
}

test.beforeEach(() => {
  __resetAll();
  delete process.env.STUDY_HUB_ENV;
  delete process.env.QA_TOOLS_ENABLED;
  process.env.OWNER_USERNAME = 'owner';
  process.env.ADMIN_USERNAMES = '';
});

test('STUDY_HUB_ENV ausente o inválido cae de forma segura en production', () => {
  assert.equal(studyHubEnvironment({}), 'production');
  assert.equal(studyHubEnvironment({ STUDY_HUB_ENV: 'staging' }), 'production');
  assert.equal(studyHubEnvironment({ STUDY_HUB_ENV: 'QA' }), 'production');
  assert.equal(studyHubEnvironment({ STUDY_HUB_ENV: ' qa ' }), 'production');
  assert.equal(studyHubEnvironment({ STUDY_HUB_ENV: 'qa' }), 'qa');
  assert.equal(studyHubEnvironment({ STUDY_HUB_ENV: 'local-test' }), 'local-test');
});

test('QA_TOOLS_ENABLED requiere el valor explícito true', () => {
  assert.equal(qaToolsEnabled({}), false);
  assert.equal(qaToolsEnabled({ QA_TOOLS_ENABLED: 'false' }), false);
  assert.equal(qaToolsEnabled({ QA_TOOLS_ENABLED: 'TRUE' }), false);
  assert.equal(qaToolsEnabled({ QA_TOOLS_ENABLED: 'true' }), true);
});

test('production devuelve 404 incluso con una sesión Owner válida', async () => {
  process.env.STUDY_HUB_ENV = 'production';
  process.env.QA_TOOLS_ENABLED = 'true';
  const owner = await putUser({ id: 'owner-1', username: 'owner' });
  const token = await createSession(owner);
  const result = await payload(await qaToolsHandler(request(token)));
  assert.equal(result.status, 404);
});

test('QA sin sesión devuelve 401', async () => {
  process.env.STUDY_HUB_ENV = 'qa';
  process.env.QA_TOOLS_ENABLED = 'true';
  const result = await payload(await qaToolsHandler(request()));
  assert.equal(result.status, 401);
});

test('QA deniega qa:tools a Member', async () => {
  process.env.STUDY_HUB_ENV = 'qa';
  process.env.QA_TOOLS_ENABLED = 'true';
  const member = await putUser({ id: 'member-1', username: 'member' });
  const result = await payload(await qaToolsHandler(request(await createSession(member))));
  assert.equal(result.status, 403);
});

test('QA deniega qa:tools a Admin', async () => {
  process.env.STUDY_HUB_ENV = 'qa';
  process.env.QA_TOOLS_ENABLED = 'true';
  const admin = await putUser({ id: 'admin-1', username: 'admin', securityRole: 'admin' });
  const result = await payload(await qaToolsHandler(request(await createSession(admin))));
  assert.equal(result.status, 403);
});

test('QA deniega Owner cuando QA_TOOLS_ENABLED no está habilitado', async () => {
  process.env.STUDY_HUB_ENV = 'qa';
  const owner = await putUser({ id: 'owner-1', username: 'owner' });
  const result = await payload(await qaToolsHandler(request(await createSession(owner))));
  assert.equal(result.status, 403);
});

test('QA concede únicamente qa:tools a Owner autorizado', async () => {
  process.env.STUDY_HUB_ENV = 'qa';
  process.env.QA_TOOLS_ENABLED = 'true';
  const owner = await putUser({ id: 'owner-1', username: 'owner' });
  const result = await payload(await qaToolsHandler(request(await createSession(owner))));
  assert.equal(result.status, 200);
  assert.deepEqual(result.data, { capabilities: ['qa:tools'], environment: 'qa' });
});

test('local-test concede únicamente qa:tools a SuperDev autenticado', async () => {
  process.env.STUDY_HUB_ENV = 'local-test';
  process.env.QA_TOOLS_ENABLED = 'true';
  const superdev = await putUser({ id: 'superdev-1', username: 'superdev' });
  const token = await createSession(superdev, true, { superdevAuthenticated: true });
  const result = await payload(await qaToolsHandler(request(token)));
  assert.equal(result.status, 200);
  assert.deepEqual(result.data, { capabilities: ['qa:tools'], environment: 'local-test' });
});

test('QA deniega a un Owner suspendido aunque conserve una cookie', async () => {
  process.env.STUDY_HUB_ENV = 'qa';
  process.env.QA_TOOLS_ENABLED = 'true';
  const owner = await putUser({ id: 'owner-1', username: 'owner', status: 'suspended' });
  const result = await payload(await qaToolsHandler(request(await createSession(owner))));
  assert.equal(result.status, 401);
});
