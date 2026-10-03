import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as blobs from '@netlify/blobs';
import { COOKIE, createSession, roleForUser } from '../netlify/functions/_shared/auth.mjs';
import { hasQaToolsCapability } from '../netlify/functions/_shared/qa-access.mjs';

let harness = {};
try { harness = await import('./browser-harness.mjs'); } catch {}

const serverPath = new URL('./browser-server.mjs', import.meta.url);
const registerPath = new URL('./register-blobs.mjs', import.meta.url);
const USERS = blobs.getStore('study-hub-users-v1');
const PROGRESS = blobs.getStore('study-hub-progress-v1');

function spawnServer({ mock = true, environment = 'local-test', extraEnv = {} } = {}) {
  const args = mock
    ? ['--import', registerPath.href, fileURLToPath(serverPath)]
    : [fileURLToPath(serverPath)];
  return spawnSync(process.execPath, args, {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    encoding: 'utf8',
    timeout: 2_000,
    env: { ...process.env, STUDY_HUB_ENV: environment, ...extraEnv },
  });
}

async function seed() {
  assert.equal(typeof harness.configureLocalTestEnvironment, 'function');
  assert.equal(typeof harness.resetBrowserFixtures, 'function');
  harness.configureLocalTestEnvironment(process.env);
  return harness.resetBrowserFixtures(blobs);
}

test.beforeEach(() => {
  blobs.__resetAll();
  delete process.env.STUDY_HUB_ENV;
  delete process.env.QA_TOOLS_ENABLED;
  delete process.env.OWNER_USERNAME;
  delete process.env.ADMIN_USERNAMES;
  delete process.env.DEV_LOGIN_CODE;
});

test('browser server rechaza arrancar fuera de local-test', () => {
  const result = spawnServer({ environment: 'production' });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stderr}${result.stdout}`, /STUDY_HUB_ENV=local-test/);
});

test('browser server rechaza arrancar sin el mock de Blobs esperado', () => {
  const result = spawnServer({ mock: false });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stderr}${result.stdout}`, /mock.*Blobs|Blobs.*mock/i);
});

test('credenciales Netlify heredadas no desvían el harness fuera del mock en memoria', async () => {
  assert.equal(blobs.__STUDY_HUB_TEST_BLOBS__, true);
  process.env.NETLIFY_AUTH_TOKEN = 'real-looking-token';
  process.env.NETLIFY_SITE_ID = 'real-looking-site';
  process.env.NETLIFY_BLOBS_CONTEXT = 'real-looking-context';
  const fixtures = await seed();
  assert.equal(fixtures.personas['qa-owner'].username, 'qa-owner');
  assert.equal(await USERS.get('user/qa-owner', { type: 'json' }).then(Boolean), true);
  delete process.env.NETLIFY_AUTH_TOKEN;
  delete process.env.NETLIFY_SITE_ID;
  delete process.env.NETLIFY_BLOBS_CONTEXT;
});

test('crea las cinco personas locales con roles deterministas sin depender de SuperDev', async () => {
  const { personas } = await seed();
  assert.deepEqual(Object.keys(personas).sort(), [
    'qa-admin',
    'qa-owner',
    'qa-student',
    'qa-student-new',
    'qa-suspended',
  ]);
  assert.equal(roleForUser(personas['qa-student-new']), 'member');
  assert.equal(roleForUser(personas['qa-student']), 'member');
  assert.equal(roleForUser(personas['qa-admin']), 'admin');
  assert.equal(roleForUser(personas['qa-owner']), 'owner');
  assert.equal(personas['qa-suspended'].status, 'suspended');
  assert.equal(Object.values(personas).some(persona => persona.username === 'superdev'), false);
});

test('student-new queda limpio y student recibe progreso pequeño conocido', async () => {
  await seed();
  assert.equal(await PROGRESS.get('user/qa-student-new', { type: 'json' }), null);
  const progress = await PROGRESS.get('user/qa-student', { type: 'json' });
  assert.equal(progress.state.totalAnswered, 4);
  assert.equal(progress.state.totalCorrect, 3);
  assert.equal(progress.state.session, null);
});

test('qa-owner obtiene qa:tools y admin/member no', async () => {
  const { personas } = await seed();
  for (const [id, expected] of [['qa-owner', true], ['qa-admin', false], ['qa-student', false]]) {
    const user = personas[id];
    const token = await createSession(user);
    const req = new Request('http://127.0.0.1/.netlify/functions/qa-tools', {
      headers: { cookie: `${COOKIE}=${token}` },
    });
    const { authenticateRequest } = await import('../netlify/functions/_shared/auth.mjs');
    assert.equal(hasQaToolsCapability(await authenticateRequest(req)), expected);
  }
});

test('la persona suspendida conserva el rechazo de sesión existente', async () => {
  const { personas } = await seed();
  const token = await createSession(personas['qa-suspended']);
  const req = new Request('http://127.0.0.1/.netlify/functions/account', {
    headers: { cookie: `${COOKIE}=${token}` },
  });
  const { authenticateRequest } = await import('../netlify/functions/_shared/auth.mjs');
  const auth = await authenticateRequest(req);
  assert.equal(auth.ok, false);
  assert.equal(auth.reason, 'suspended');
});

test('resetear fixtures restaura exactamente el mismo estado', async () => {
  const first = await seed();
  await USERS.setJSON('user/qa-student', { ...first.personas['qa-student'], displayName: 'Mutado' });
  await PROGRESS.setJSON('user/qa-student-new', { updatedAt: 999, state: { totalAnswered: 99 } });
  const second = await harness.resetBrowserFixtures(blobs);
  assert.deepEqual(second, first);
  assert.equal((await USERS.get('user/qa-student', { type: 'json' })).displayName, 'QA Student');
  assert.equal(await PROGRESS.get('user/qa-student-new', { type: 'json' }), null);
});

test('el bootstrap de personas es una ruta exclusiva del browser server y preserva superdev', async () => {
  const source = await readFile(serverPath, 'utf8');
  assert.match(source, /\/__test\/persona\//);
  assert.match(source, /\/__test\/superdev/);
  assert.doesNotMatch(source, /DEV_LOGIN_CODE/);
});
