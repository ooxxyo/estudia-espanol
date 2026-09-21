import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { getStore, __resetAll } from '@netlify/blobs';
import accountHandler from '../netlify/functions/account.mjs';
import adminHandler from '../netlify/functions/admin.mjs';
import feedbackHandler from '../netlify/functions/feedback.mjs';
import featuresHandler from '../netlify/functions/features.mjs';
import leaderboardHandler from '../netlify/functions/leaderboard.mjs';
import presenceHandler from '../netlify/functions/presence.mjs';
import { COOKIE, createSession, publicUser, setSessionCookie } from '../netlify/functions/_shared/auth.mjs';
import { authorizeAssistantSubject, normalizeAssistantContext, OTHER_SUBJECT_MESSAGE } from '../netlify/functions/_shared/study-context.mjs';

const USERS = getStore('study-hub-users-v1');
const PRESENCE = getStore('study-hub-presence-v1');
const FEATURES = getStore('study-hub-feature-flags-v1');
const LEADERBOARD = getStore('study-hub-leaderboard-v2');
const historyContext = { window: {} };
vm.runInNewContext(await readFile(new URL('../public/history-data.js', import.meta.url), 'utf8'), historyContext);
const HISTORY = historyContext.window.HISTORY_CONTENT;

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

async function configureFeature(token, overrides = {}) {
  return await payload(await featuresHandler(request('features', {
    method: 'POST',
    token,
    body: { id: 'ui-beta', status: 'development', audience: 'superdev', enabled: false, selectedUsers: [], ...overrides },
  })));
}

async function featureList(token) {
  return await payload(await featuresHandler(request('features', { token })));
}

test.beforeEach(() => {
  __resetAll();
  process.env.OWNER_USERNAME = 'owner';
  process.env.ADMIN_USERNAMES = '';
  process.env.DEV_LOGIN_CODE = crypto.randomUUID();
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
  const heartbeat = await payload(await presenceHandler(request('presence', { method: 'POST', token: userToken, body: { clientId: 'client_online_123', section: 'dashboard', subjectId: 'espanol', unitId: 'espanol-unidad-actual', topicId: 'morfologia' } })));
  assert.equal(heartbeat.status, 200);
  const connected = await payload(await adminHandler(request('admin?section=connected', { token: devToken })));
  assert.equal(connected.status, 200);
  assert.equal(connected.data.users[0].username, 'online');
  assert.equal(connected.data.users[0].section, 'dashboard');
  assert.equal(connected.data.users[0].unitId, 'espanol-unidad-actual');
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

test('Super Dev ve solo features reales y controla status sin publicarlas', async () => {
  const superdev = await putUser({ id: 'super-1', username: 'superdev' });
  const devToken = await authToken(superdev, true);
  const listed = await featureList(devToken);
  assert.deepEqual(listed.data.features.map(feature => feature.id), ['ui-beta', 'ai-assistant']);
  assert.equal(listed.data.features.every(feature => feature.availability === 'unavailable' && feature.canLaunch === false), true);
  for (const status of ['development', 'experimental', 'preview', 'ready']) {
    const updated = await configureFeature(devToken, { status });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.feature.status, status);
    assert.equal(updated.data.feature.enabled, false);
  }
  const direct = await payload(await featuresHandler(request('features?id=ui-beta', { token: devToken })));
  assert.equal(direct.status, 409);
  assert.equal(direct.data.feature.authorized, true);
});

test('audience admins autoriza Admin pero no Member ni Veterano', async () => {
  const superdev = await putUser({ id: 'super-1', username: 'superdev' });
  const admin = await putUser({ id: 'admin-1', username: 'admin', securityRole: 'admin' });
  const member = await putUser({ id: 'member-1', username: 'member' });
  const veteran = await putUser({ id: 'veteran-1', username: 'veteran', veteran: true, entitlement: 'veteran' });
  const devToken = await authToken(superdev, true), adminToken = await authToken(admin), memberToken = await authToken(member), veteranToken = await authToken(veteran);
  await configureFeature(devToken, { status: 'experimental', audience: 'admins', enabled: true });
  assert.equal((await featureList(adminToken)).data.features.length, 1);
  assert.equal((await featureList(memberToken)).data.features.length, 0);
  assert.equal((await featureList(veteranToken)).data.features.length, 0);
  assert.equal((await payload(await featuresHandler(request('features?id=ui-beta', { token: adminToken })))).status, 409);
  assert.equal((await payload(await featuresHandler(request('features?id=ui-beta', { token: memberToken })))).status, 403);
});

test('audience veterans y members se evalúan por separado', async () => {
  const superdev = await putUser({ id: 'super-1', username: 'superdev' });
  const member = await putUser({ id: 'member-1', username: 'member' });
  const veteran = await putUser({ id: 'veteran-1', username: 'veteran', veteran: true, entitlement: 'veteran' });
  const devToken = await authToken(superdev, true), memberToken = await authToken(member), veteranToken = await authToken(veteran);
  await configureFeature(devToken, { audience: 'veterans', enabled: true });
  assert.equal((await featureList(veteranToken)).data.features.length, 1);
  assert.equal((await featureList(memberToken)).data.features.length, 0);
  assert.equal((await payload(await featuresHandler(request('features?id=ui-beta', { token: veteranToken })))).status, 409);
  assert.equal((await payload(await featuresHandler(request('features?id=ui-beta', { token: memberToken })))).status, 403);
  await configureFeature(devToken, { audience: 'members', enabled: true });
  assert.equal((await featureList(memberToken)).data.features.length, 1);
  assert.equal((await featureList(veteranToken)).data.features.length, 0);
  assert.equal((await payload(await featuresHandler(request('features?id=ui-beta', { token: memberToken })))).status, 409);
  assert.equal((await payload(await featuresHandler(request('features?id=ui-beta', { token: veteranToken })))).status, 403);
});

test('selectedUsers autoriza solo usernames seleccionados', async () => {
  const superdev = await putUser({ id: 'super-1', username: 'superdev' });
  const selected = await putUser({ id: 'selected-1', username: 'seleccionada' });
  const other = await putUser({ id: 'other-1', username: 'otra' });
  const devToken = await authToken(superdev, true), selectedToken = await authToken(selected), otherToken = await authToken(other);
  const configured = await configureFeature(devToken, { status: 'preview', audience: 'selectedUsers', enabled: true, selectedUsers: ['Seleccionada'] });
  assert.deepEqual(configured.data.feature.selectedUsers, ['seleccionada']);
  assert.equal((await featureList(selectedToken)).data.features.length, 1);
  assert.equal((await featureList(otherToken)).data.features.length, 0);
  assert.equal((await payload(await featuresHandler(request('features?id=ui-beta', { token: selectedToken })))).status, 409);
  assert.equal((await payload(await featuresHandler(request('features?id=ui-beta', { token: otherToken })))).status, 403);
});

test('ready disabled y feature superdev bloquean acceso directo normal', async () => {
  const superdev = await putUser({ id: 'super-1', username: 'superdev' });
  const member = await putUser({ id: 'member-1', username: 'member' });
  const admin = await putUser({ id: 'admin-1', username: 'admin', securityRole: 'admin' });
  const devToken = await authToken(superdev, true), memberToken = await authToken(member), adminToken = await authToken(admin);
  await configureFeature(devToken, { status: 'ready', audience: 'members', enabled: false });
  assert.equal((await featureList(memberToken)).data.features.length, 0);
  assert.equal((await payload(await featuresHandler(request('features?id=ui-beta', { token: memberToken })))).status, 403);
  await configureFeature(devToken, { status: 'ready', audience: 'superdev', enabled: true });
  assert.equal((await featureList(adminToken)).data.features.length, 0);
  assert.equal((await payload(await featuresHandler(request('features?id=ui-beta', { token: adminToken })))).status, 403);
});

test('flags legacy conservan status y traducen audiencias antiguas', async () => {
  const superdev = await putUser({ id: 'super-1', username: 'superdev' });
  const admin = await putUser({ id: 'admin-1', username: 'admin', securityRole: 'admin' });
  const devToken = await authToken(superdev, true);
  const adminToken = await authToken(admin);
  await FEATURES.setJSON('flags/ui-beta', { state: 'preview', audience: 'staff', enabled: true, updatedAt: 123 });
  const listed = await featureList(devToken);
  assert.equal(listed.data.features[0].status, 'preview');
  assert.equal(listed.data.features[0].audience, 'admins');
  assert.equal((await featureList(adminToken)).data.features.length, 1);
});

test('una cuenta suspendida no puede publicar en leaderboard', async () => {
  const user = await putUser({ id: 'suspended-1', username: 'suspendida' });
  const token = await authToken(user);
  await USERS.setJSON(`user/${user.id}`, { ...user, status: 'suspended', updatedAt: 2 });
  const result = await payload(await leaderboardHandler(request('leaderboard', {
    method: 'POST', token, body: { score: 8, total: 10, pct: 80, topics: ['morfologia'], fullExam: false },
  })));
  assert.equal(result.status, 401);
  assert.equal(await LEADERBOARD.get(`players/${user.id}`, { type: 'json', consistency: 'strong' }), null);
});

test('contexto de IA conserva materia, unidad, tema y contenido aprobado', () => {
  const context = normalizeAssistantContext({
    subjectId: 'espanol', subjectName: 'Español', unitId: 'espanol-unidad-actual', unitName: 'Unidad actual',
    topicId: 'morfologia', topicName: 'Morfología', approvedContent: [{ title: 'Interfijo' }],
  });
  assert.equal(context.source, 'approved');
  assert.equal(context.approvedContent.length, 1);
  assert.equal(authorizeAssistantSubject(context, 'espanol').allowed, true);
  const blocked = authorizeAssistantSubject(context, 'historia');
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.message, OTHER_SUBJECT_MESSAGE);
});

test('Historia está disponible en Día 1 con su unidad Prueba actual', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /id:'historia'.*day:1.*status:'Disponible'.*available:true/);
  assert.equal(HISTORY.subjectId, 'historia');
  assert.equal(HISTORY.unit.name, 'Geografía y grandes civilizaciones');
  assert.equal(HISTORY.unit.type, 'Prueba');
  assert.equal(HISTORY.unit.status, 'current');
});

test('Historia contiene ocho topics estables y tarjetas para cada tema', () => {
  assert.deepEqual(Array.from(HISTORY.topics, topic => topic.id), [
    'geografia', 'civilizaciones', 'mayas', 'aztecas', 'incas', 'religion-inca', 'mapas-localizacion', 'ciclo-naturaleza',
  ]);
  assert.equal(HISTORY.reviewCards.length, 27);
  assert.equal(HISTORY.reviewCards.every(card => HISTORY.topics.some(topic => topic.id === card.topic)), true);
  assert.equal(HISTORY.topics.every(topic => HISTORY.reviewCards.some(card => card.topic === topic.id)), true);
});

test('banco de Historia está aislado y balancea respuestas A/B/C/D', () => {
  assert.equal(HISTORY.questions.length, 82);
  assert.equal(HISTORY.questions.every(question => question.id.startsWith('hist-') && question.subjectId === 'historia' && question.unitId === HISTORY.unit.id), true);
  const multipleChoice = HISTORY.questions.filter(question => question.type === 'mc');
  const trueFalse = HISTORY.questions.filter(question => question.type === 'tf');
  assert.equal(multipleChoice.length, 72);
  assert.equal(trueFalse.length, 10);
  assert.deepEqual([0, 1, 2, 3].map(index => multipleChoice.filter(question => question.correct === index).length), [18, 18, 18, 18]);
  assert.equal(new Set(HISTORY.questions.map(question => question.id)).size, HISTORY.questions.length);
});

test('Historia no inventa el tercer mundo', () => {
  const related = HISTORY.questions.filter(question => /tercer mundo/i.test(question.prompt));
  assert.equal(related.length, 1);
  assert.equal(related[0].type, 'tf');
  assert.equal(related[0].correct, false);
  assert.match(related[0].exp, /información sobre el tercero está incompleta/i);
  assert.equal(HISTORY.reviewCards.some(card => /tercer mundo/i.test(`${card.title} ${card.def} ${card.example}`)), false);
});

test('contexto de IA de Historia autoriza Mayas y rechaza Español', () => {
  const context = normalizeAssistantContext({
    subjectId: 'historia', subjectName: 'Historia', unitId: HISTORY.unit.id, unitName: HISTORY.unit.name,
    topicId: 'mayas', topicName: 'Mayas', approvedContent: HISTORY.reviewCards.filter(card => card.topic === 'mayas'),
  });
  assert.equal(context.approvedContent.length > 0, true);
  assert.equal(authorizeAssistantSubject(context, 'historia').allowed, true);
  const blocked = authorizeAssistantSubject(context, 'espanol');
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.message, OTHER_SUBJECT_MESSAGE);
});

test('progreso y snapshots separan Historia sin romper Español legacy', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /subjectTotals:\{historia:/);
  assert.match(html, /questionSubjectId\(question\)\{return question\?\.subjectId\|\|'espanol';\}/);
  assert.match(html, /subjectId:sessionSubjectId,unitId:/);
  assert.match(html, /subjectId:s\.subjectId\|\|'espanol'/);
  assert.match(html, /showPendingPracticeDecision\(opts\);return/);
  assert.match(html, /s\.startedAt\+=Math\.max\(0,Date\.now\(\)-s\.pausedAt\)/);
  assert.doesNotMatch(html, /s\.miniReviewShown=false;\s*\n\s*const isExam/);
});

test('Super Dev solo se eleva mediante Dev Login y las cookies respetan remember me', async () => {
  await putUser({ id: 'super-1', username: 'superdev' });
  const normal = await payload(await accountHandler(request('account', {
    method: 'POST', body: { action: 'login', identifier: 'superdev', password: 'Password123!', remember: true },
  })));
  assert.equal(normal.status, 401);
  const elevatedResponse = await accountHandler(request('account', {
    method: 'POST', body: { action: 'dev-login', code: process.env.DEV_LOGIN_CODE, remember: false },
  }));
  const elevated = await payload(elevatedResponse);
  assert.equal(elevated.status, 200);
  assert.equal(elevated.data.user.role, 'superdev');
  assert.doesNotMatch(elevatedResponse.headers.get('set-cookie') || '', /Max-Age=/i);
  assert.match(setSessionCookie('test-token', true), /Max-Age=/i);
});

test('navegación primaria tiene cinco accesos, Cuenta dinámica y Más condicional', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const primary = html.match(/const PRIMARY_NAV_ITEMS=\[([\s\S]*?)\];/)?.[1] || '';
  assert.equal((primary.match(/\{id:/g) || []).length, 5);
  for (const id of ['hub', 'repaso', 'practica', 'cuenta', 'more']) assert.match(primary, new RegExp(`id:'${id}'`));
  assert.match(html, /item\.id==='cuenta'\?\(accountSession\.user\?'Cuenta':'Entrar'\)/);
  for (const id of ['examen', 'errores', 'guardadas', 'historial', 'dashboard', 'feedback', 'ajustes']) assert.match(html, new RegExp(`id:'${id}'`));
  assert.match(html, /\['admin','owner','superdev'\]\.includes\(role\)/);
  assert.match(html, /aria-expanded="false" aria-controls="morePanel"/);
  assert.match(html, /const DESKTOP_NAV_GROUPS=/);
  assert.doesNotMatch(html, /rail\.querySelector\('\[data-open-more\]'\)/);
  assert.match(html, /if\(!moreOpen\|\|event\.key!=='Tab'\)return/);
});

test('cliente API centraliza timeout y mensajes de red sin exponer errores técnicos', async () => {
  const source = await readFile(new URL('../public/js/api-client.js', import.meta.url), 'utf8');
  assert.match(source, /controller\.abort\(\)/);
  assert.match(source, /No hay conexión con el servicio/);
  assert.match(source, /La solicitud tardó demasiado/);
  assert.match(source, /response\.status >= 500/);
  assert.doesNotMatch(source, /DEV_LOGIN_CODE|password|token/i);
});

test('catálogo conserva Español anterior y añade Competencia sin alterar claves legacy', async () => {
  const [html,legacy] = await Promise.all([readFile(new URL('../public/index.html', import.meta.url), 'utf8'),readFile(new URL('../public/js/spanish-legacy-content.js', import.meta.url), 'utf8')]);
  assert.match(html, /id:'espanol-unidad-anterior',subjectId:'espanol',name:'Contenido anterior de Español'/);
  assert.match(html, /examTaken:true,examTakenDate:'2026-09-14'/);
  assert.match(html, /contentKey:'spanish-v2'/);
  assert.match(html, /SPANISH_VOCABULARY\.unit/);
  assert.match(html, /activeUnitId/);
  assert.equal((legacy.match(/id:nid\(\)/g) || []).length, 75);
  assert.doesNotMatch(html, />5 temas</);
  assert.match(html, /const STABLE_STORAGE_KEY = 'cuaderno_espanol_hub_progress_v1'/);
  assert.match(html, /según tu dispositivo/);
  assert.doesNotMatch(html, /sebas10|Sebastián/);
  assert.match(legacy, /role==='INF'\?'MDI'/);
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

  const conflict = await payload(await accountHandler(request('account', {
    method: 'POST', token, body: { action: 'sync', state: { ...state, totalAnswered: 8 }, baseUpdatedAt: 0 },
  })));
  assert.equal(conflict.status, 409);
  assert.equal(conflict.data.conflict, true);
  assert.deepEqual(conflict.data.cloudState.session.queueIds, ['q1']);
});
