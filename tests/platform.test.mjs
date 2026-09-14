import test from 'node:test';
import assert from 'node:assert/strict';
import { getStore, __resetAll } from '@netlify/blobs';
import accountHandler from '../netlify/functions/account.mjs';
import adminHandler from '../netlify/functions/admin.mjs';
import feedbackHandler from '../netlify/functions/feedback.mjs';
import featuresHandler from '../netlify/functions/features.mjs';
import presenceHandler from '../netlify/functions/presence.mjs';
import { COOKIE, createSession, publicUser } from '../netlify/functions/_shared/auth.mjs';

const USERS = getStore('study-hub-users-v1');
const PRESENCE = getStore('study-hub-presence-v1');

function request(path, { method = 'GET', body, token, ip = '127.0.0.1' } = {}) {
  const headers = { 'content-type': 'application/json', 'x-forwarded-for': ip, 'user-agent': 'StudyHubTest/desktop' };
  if (token) headers.cookie = `${COOKIE}=${token}`;
  return new Request(`https://study-hub.test/.netlify/functions/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function payload(response) {
  return { status: response.status, data: await response.json() };
}

async function putUser(user) {
  const normalizedUsername = String(user.username).toLowerCase();
  const row = { sessionVersion: 1, status: 'active', createdAt: 1, updatedAt: 1, normalizedUsername, ...user };
  await USERS.setJSON(`user/${row.id}`, row);
  await USERS.setJSON(`username/${normalizedUsername}`, { userId: row.id });
  if (row.email) await USERS.setJSON(`email/${row.email.toLowerCase()}`, { userId: row.id });
  return row;
}

async function authToken(user, superdevAuthenticated = false) {
  return await createSession(user, true, { superdevAuthenticated });
}

test.beforeEach(() => {
  __resetAll();
  process.env.OWNER_USERNAME = 'owner';
  process.env.ADMIN_USERNAMES = '';
});

test('cuentas antiguas reciben defaults seguros sin duplicarse', async () => {
  const old = await putUser({ id: 'old-1', username: 'antigua', email: 'old@example.test' });
  const safe = publicUser(old);
  assert.equal(safe.displayName, 'antigua');
  assert.equal(safe.visibleRank, 'Estudiante');
  assert.equal(safe.veteran, false);
  assert.equal(safe.role, 'member');
});

test('cuentas nuevas reciben perfil compatible y aparecen junto a cuentas antiguas', async () => {
  const old = await putUser({ id: 'old-1', username: 'antigua' });
  const registered = await payload(await accountHandler(request('account', { method: 'POST', body: { action: 'register', username: 'nueva', password: 'Password123!', remember: true } })));
  assert.equal(registered.status, 201);
  assert.equal(registered.data.user.displayName, 'nueva');
  assert.equal(registered.data.user.veteran, false);
  const superdev = await putUser({ id: 'super-1', username: 'superdev' });
  const token = await authToken(superdev, true);
  const users = await payload(await adminHandler(request('admin?section=users', { token })));
  assert.equal(users.data.users.some(user => user.id === old.id), true);
  assert.equal(users.data.users.some(user => user.username === 'nueva'), true);
});

test('Super Dev administra Veterano y Admin por separado y permanece protegido', async () => {
  const superdev = await putUser({ id: 'super-1', username: 'superdev' });
  const member = await putUser({ id: 'member-1', username: 'amiga' });
  const token = await authToken(superdev, true);

  let result = await payload(await adminHandler(request('admin', { method: 'POST', token, body: { action: 'set-veteran', targetUserId: member.id } })));
  assert.equal(result.status, 200);
  assert.equal(result.data.target.veteran, true);
  assert.equal(result.data.target.role, 'member');

  result = await payload(await adminHandler(request('admin', { method: 'POST', token, body: { action: 'grant-admin', targetUserId: member.id } })));
  assert.equal(result.status, 200);
  assert.equal(result.data.target.role, 'admin');
  assert.equal(result.data.target.veteran, true);

  result = await payload(await adminHandler(request('admin', { method: 'POST', token, body: { action: 'revoke-admin', targetUserId: member.id } })));
  assert.equal(result.data.target.role, 'member');
  assert.equal(result.data.target.veteran, true);

  result = await payload(await adminHandler(request('admin', { method: 'POST', token, body: { action: 'remove-veteran', targetUserId: member.id } })));
  assert.equal(result.data.target.veteran, false);
  assert.equal(result.data.target.role, 'member');

  result = await payload(await adminHandler(request('admin', { method: 'POST', token, body: { action: 'suspend', targetUserId: member.id } })));
  assert.equal(result.data.target.status, 'suspended');
  result = await payload(await adminHandler(request('admin', { method: 'POST', token, body: { action: 'reactivate', targetUserId: member.id } })));
  assert.equal(result.data.target.status, 'active');

  result = await payload(await adminHandler(request('admin', { method: 'POST', token, body: { action: 'suspend', targetUserId: superdev.id } })));
  assert.equal(result.status, 403);
});

test('Admin no puede elevarse ni modificar Super Dev', async () => {
  const admin = await putUser({ id: 'admin-1', username: 'staff', securityRole: 'admin' });
  const superdev = await putUser({ id: 'super-1', username: 'superdev' });
  const member = await putUser({ id: 'member-1', username: 'member' });
  const token = await authToken(admin);
  let result = await payload(await adminHandler(request('admin', { method: 'POST', token, body: { action: 'grant-admin', targetUserId: member.id } })));
  assert.equal(result.status, 403);
  result = await payload(await adminHandler(request('admin', { method: 'POST', token, body: { action: 'revoke-sessions', targetUserId: superdev.id } })));
  assert.equal(result.status, 403);
});

test('presence identifica cuentas sin exponer sesión y respeta timeout', async () => {
  const user = await putUser({ id: 'user-1', username: 'online', displayName: 'Online User' });
  const superdev = await putUser({ id: 'super-1', username: 'superdev' });
  const userToken = await authToken(user);
  const devToken = await authToken(superdev, true);
  await PRESENCE.setJSON('heartbeat/stale_client_123', { at: Date.now() - 91_000, userId: user.id });
  const heartbeat = await payload(await presenceHandler(request('presence', { method: 'POST', token: userToken, body: { clientId: 'client_online_123', section: 'dashboard', subjectId: 'espanol', topicId: 'morfologia' } })));
  assert.equal(heartbeat.status, 200);
  const connected = await payload(await adminHandler(request('admin?section=connected', { token: devToken })));
  assert.equal(connected.status, 200);
  assert.equal(connected.data.users[0].username, 'online');
  assert.equal(connected.data.users[0].section, 'dashboard');
  assert.equal('token' in connected.data.users[0], false);
  assert.equal(connected.data.count, 1);
  const filtered = await payload(await adminHandler(request('admin?section=connected&q=nadie&filter=member', { token: devToken })));
  assert.equal(filtered.data.count, 1);
  assert.equal(filtered.data.users.length, 0);
});

test('feedback es privado por usuario y Admin puede cambiar su estado', async () => {
  const first = await putUser({ id: 'user-1', username: 'first' });
  const second = await putUser({ id: 'user-2', username: 'second' });
  const admin = await putUser({ id: 'admin-1', username: 'staff', securityRole: 'admin' });
  const firstToken = await authToken(first);
  const secondToken = await authToken(second);
  const adminToken = await authToken(admin);
  const created = await payload(await feedbackHandler(request('feedback', { method: 'POST', token: firstToken, body: { action: 'create', type: 'bug', title: 'Problema visible', message: 'La navegación mostró un problema reproducible.', subjectId: 'espanol' } })));
  assert.equal(created.status, 201);
  const privateList = await payload(await feedbackHandler(request('feedback', { token: secondToken })));
  assert.equal(privateList.data.reports.length, 0);
  const adminList = await payload(await feedbackHandler(request('feedback?scope=admin', { token: adminToken })));
  assert.equal(adminList.data.reports.length, 1);
  const filtered = await payload(await feedbackHandler(request('feedback?scope=admin&type=suggestion&subject=espanol', { token: adminToken })));
  assert.equal(filtered.data.reports.length, 0);
  const changed = await payload(await feedbackHandler(request('feedback', { method: 'POST', token: adminToken, body: { action: 'set-status', reportId: created.data.report.id, status: 'reviewing' } })));
  assert.equal(changed.data.report.status, 'reviewing');
});

test('feedback aplica rate limiting server-side', async () => {
  const user = await putUser({ id: 'user-1', username: 'spammer' });
  const token = await authToken(user);
  let last;
  for (let index = 0; index < 6; index++) {
    last = await payload(await feedbackHandler(request('feedback', { method: 'POST', token, ip: '10.0.0.5', body: { action: 'create', type: 'bug', title: `Reporte ${index}`, message: 'Mensaje válido para probar el límite.' } })));
    if (index < 5) assert.equal(last.status, 201);
  }
  assert.equal(last.status, 429);
});

test('Feature Flags hidden solo aparecen para Super Dev', async () => {
  const member = await putUser({ id: 'member-1', username: 'member' });
  const superdev = await putUser({ id: 'super-1', username: 'superdev' });
  const memberToken = await authToken(member);
  const devToken = await authToken(superdev, true);
  let result = await payload(await featuresHandler(request('features', { token: memberToken })));
  assert.equal(result.data.features.length, 0);
  result = await payload(await featuresHandler(request('features', { token: devToken })));
  assert.equal(result.data.features.length, 4);
  const updated = await payload(await featuresHandler(request('features', { method: 'POST', token: devToken, body: { id: 'ui-beta', state: 'preview', enabled: true, audience: 'superdev' } })));
  assert.equal(updated.status, 200);
  assert.equal(updated.data.feature.enabled, true);
});

test('sync mantiene progreso y una práctica recuperable', async () => {
  const user = await putUser({ id: 'user-1', username: 'syncuser' });
  const token = await authToken(user);
  const state = { version: '2.0', totalAnswered: 7, history: [{ total: 10 }], session: { mode: 'practica', queueIds: ['q1'], idx: 0, answers: [] } };
  const synced = await payload(await accountHandler(request('account', { method: 'POST', token, body: { action: 'sync', state, baseUpdatedAt: 0 } })));
  assert.equal(synced.status, 200);
  const restored = await payload(await accountHandler(request('account', { token })));
  assert.deepEqual(restored.data.cloudState.session.queueIds, ['q1']);
  assert.equal(restored.data.cloudState.totalAnswered, 7);
});
