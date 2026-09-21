import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { getStore, __resetAll } from '@netlify/blobs';
import communityHandler from '../netlify/functions/community.mjs';
import friendsHandler from '../netlify/functions/friends.mjs';
import calendarHandler from '../netlify/functions/calendar.mjs';
import notificationsHandler from '../netlify/functions/notifications.mjs';
import roadmapHandler from '../netlify/functions/roadmap.mjs';
import searchHandler from '../netlify/functions/search.mjs';
import moderationHandler from '../netlify/functions/moderation.mjs';
import adminHandler from '../netlify/functions/admin.mjs';
import groupsHandler from '../netlify/functions/groups.mjs';
import { COOKIE, createSession } from '../netlify/functions/_shared/auth.mjs';
import { validateAcademicCatalog } from '../netlify/functions/_shared/content-validator.mjs';

const USERS = getStore('study-hub-users-v1');

function request(path, { method = 'GET', body, token, ip = '127.0.0.1' } = {}) {
  const headers = { 'content-type': 'application/json', 'x-forwarded-for': ip };
  if (token) headers.cookie = `${COOKIE}=${token}`;
  return new Request(`https://study-hub.test/.netlify/functions/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
}
async function payload(response) { return { status: response.status, data: await response.json() }; }
async function putUser(input) {
  const user = { sessionVersion: 1, status: 'active', createdAt: 1, updatedAt: 1, normalizedUsername: input.username.toLowerCase(), ...input };
  await USERS.setJSON(`user/${user.id}`, user); await USERS.setJSON(`username/${user.normalizedUsername}`, { userId: user.id }); return user;
}
async function token(user, elevated = false) { return await createSession(user, true, { superdevAuthenticated: elevated }); }
const contribution = overrides => ({ action: 'create', subjectId: 'historia', date: '2026-09-15', type: 'class_notes', title: 'Apuntes de clase', text: 'Contenido compartido por el estudiante.', ...overrides });
const event = overrides => ({ subjectId: 'historia', date: '2026-09-20', type: 'test', title: 'Prueba de Historia', description: 'Repasar el material oficial.', ...overrides });

test.beforeEach(() => { __resetAll(); process.env.OWNER_USERNAME = 'owner'; process.env.ADMIN_USERNAMES = ''; });

test('content validator acepta catálogo coherente y detecta referencias/respuestas inválidas', () => {
  const valid = validateAcademicCatalog([{ id: 'historia', units: [{ id: 'u1', subjectId: 'historia', status: 'current' }], topics: [{ id: 't1', subjectId: 'historia', unitId: 'u1' }], reviewCards: [{ id: 'c1', topicId: 't1' }], questions: [{ id: 'q1', topicId: 't1', type: 'mc', options: ['A', 'B'], correct: 1 }] }]);
  assert.equal(valid.valid, true);
  const invalid = validateAcademicCatalog([{ id: 'historia', units: [{ id: 'u1', subjectId: 'espanol', status: 'other' }], topics: [{ id: 't1', unitId: 'missing' }], reviewCards: [{ id: 'c1', topicId: 'missing' }], questions: [{ id: 'q1', topicId: 't1', type: 'mc', options: ['A'], correct: 2 }] }]);
  assert.equal(invalid.valid, false); assert.equal(invalid.errors.length >= 4, true);
});

test('Community crea, confirma una sola vez y nunca vuelve oficial por confirmaciones', async () => {
  const author = await putUser({ id: 'u1', username: 'autora', displayName: 'Autora' }); const peer = await putUser({ id: 'u2', username: 'companero' });
  const authorToken = await token(author); const peerToken = await token(peer);
  const created = await payload(await communityHandler(request('community', { method: 'POST', token: authorToken, body: contribution() })));
  assert.equal(created.status, 201); assert.equal(created.data.contribution.label, 'Aporte comunitario');
  const id = created.data.contribution.contributionId;
  let confirmed = await payload(await communityHandler(request('community', { method: 'POST', token: peerToken, body: { action: 'confirm', contributionId: id } })));
  assert.equal(confirmed.status, 200); assert.notEqual(confirmed.data.contribution.status, 'official');
  confirmed = await payload(await communityHandler(request('community', { method: 'POST', token: peerToken, body: { action: 'confirm', contributionId: id } })));
  assert.equal(confirmed.status, 409);
});

test('comentarios respetan ownership, soft delete y bloqueo social', async () => {
  const author = await putUser({ id: 'u1', username: 'autora' }); const peer = await putUser({ id: 'u2', username: 'lector' });
  const authorToken = await token(author); const peerToken = await token(peer);
  const created = await payload(await communityHandler(request('community', { method: 'POST', token: authorToken, body: contribution() }))); const id = created.data.contribution.contributionId;
  const comment = await payload(await communityHandler(request('community', { method: 'POST', token: peerToken, body: { action: 'comment', resourceType: 'contribution', resourceId: id, text: 'También lo vimos.' } })));
  assert.equal(comment.status, 201);
  let removed = await payload(await communityHandler(request('community', { method: 'POST', token: authorToken, body: { action: 'remove-comment', commentId: comment.data.comment.commentId } })));
  assert.equal(removed.status, 403);
  removed = await payload(await communityHandler(request('community', { method: 'POST', token: peerToken, body: { action: 'remove-comment', commentId: comment.data.comment.commentId } })));
  assert.equal(removed.status, 200);
  await friendsHandler(request('friends', { method: 'POST', token: authorToken, body: { action: 'block', username: 'lector' } }));
  const blocked = await payload(await communityHandler(request('community', { method: 'POST', token: peerToken, body: { action: 'comment', resourceType: 'contribution', resourceId: id, text: 'No debe publicarse.' } })));
  assert.equal(blocked.status, 403);
});

test('moderación de Community requiere Admin y exige doble paso para official', async () => {
  const author = await putUser({ id: 'u1', username: 'autora' }); const member = await putUser({ id: 'u2', username: 'member' }); const admin = await putUser({ id: 'a1', username: 'staff', securityRole: 'admin' });
  const authorToken = await token(author); const memberToken = await token(member); const adminToken = await token(admin);
  const created = await payload(await communityHandler(request('community', { method: 'POST', token: authorToken, body: contribution() }))); const id = created.data.contribution.contributionId;
  let result = await payload(await communityHandler(request('community', { method: 'POST', token: memberToken, body: { action: 'moderate', contributionId: id, status: 'admin_verified' } })));
  assert.equal(result.status, 403);
  result = await payload(await communityHandler(request('community', { method: 'POST', token: adminToken, body: { action: 'moderate', contributionId: id, status: 'official' } })));
  assert.equal(result.status, 409);
  result = await payload(await communityHandler(request('community', { method: 'POST', token: adminToken, body: { action: 'moderate', contributionId: id, status: 'admin_verified' } })));
  assert.equal(result.status, 200);
  result = await payload(await communityHandler(request('community', { method: 'POST', token: adminToken, body: { action: 'moderate', contributionId: id, status: 'official' } })));
  assert.equal(result.data.contribution.label, 'Material oficial');
});

test('reportes evitan duplicados y aparecen solo en moderación autorizada', async () => {
  const author = await putUser({ id: 'u1', username: 'autora' }); const peer = await putUser({ id: 'u2', username: 'lector' }); const admin = await putUser({ id: 'a1', username: 'staff', securityRole: 'admin' });
  const authorToken = await token(author); const peerToken = await token(peer); const adminToken = await token(admin);
  const created = await payload(await communityHandler(request('community', { method: 'POST', token: authorToken, body: contribution() }))); const resourceId = created.data.contribution.contributionId;
  let report = await payload(await communityHandler(request('community', { method: 'POST', token: peerToken, body: { action: 'report', resourceType: 'contribution', resourceId, reason: 'incorrect' } })));
  assert.equal(report.status, 201);
  report = await payload(await communityHandler(request('community', { method: 'POST', token: peerToken, body: { action: 'report', resourceType: 'contribution', resourceId, reason: 'spam' } })));
  assert.equal(report.status, 409);
  assert.equal((await payload(await moderationHandler(request('moderation', { token: peerToken })))).status, 403);
  const queue = await payload(await moderationHandler(request('moderation', { token: adminToken })));
  assert.equal(queue.data.items.some(item => item.queueType === 'report'), true);
  const reportId = queue.data.items.find(item => item.queueType === 'report').id;
  assert.equal((await payload(await moderationHandler(request('moderation', { method: 'POST', token: adminToken, body: { action: 'resolve-report', reportId } })))).status, 200);
  const resolved = await payload(await moderationHandler(request('moderation', { token: adminToken })));
  assert.equal(resolved.data.items.some(item => item.id === reportId), false);
});

test('Friends bloquea self-request, duplicados y solicitudes tras bloqueo', async () => {
  const first = await putUser({ id: 'u1', username: 'primera' }); const second = await putUser({ id: 'u2', username: 'segunda' }); const firstToken = await token(first); const secondToken = await token(second);
  assert.equal((await payload(await friendsHandler(request('friends', { method: 'POST', token: firstToken, body: { action: 'request', username: 'primera' } })))).status, 400);
  const sent = await payload(await friendsHandler(request('friends', { method: 'POST', token: firstToken, body: { action: 'request', username: 'segunda' } })));
  assert.equal(sent.status, 201);
  assert.equal((await payload(await friendsHandler(request('friends', { method: 'POST', token: firstToken, body: { action: 'request', username: 'segunda' } })))).status, 409);
  assert.equal((await payload(await friendsHandler(request('friends', { method: 'POST', token: secondToken, body: { action: 'accept', requestId: sent.data.requestId } })))).status, 200);
  let list = await payload(await friendsHandler(request('friends', { token: firstToken }))); assert.equal(list.data.friends[0].username, 'segunda');
  await friendsHandler(request('friends', { method: 'POST', token: firstToken, body: { action: 'block', username: 'segunda' } }));
  assert.equal((await payload(await friendsHandler(request('friends', { method: 'POST', token: secondToken, body: { action: 'request', username: 'primera' } })))).status, 403);
  await friendsHandler(request('friends', { method: 'POST', token: firstToken, body: { action: 'unblock', username: 'segunda' } }));
  list = await payload(await friendsHandler(request('friends', { token: firstToken }))); assert.equal(list.data.blocked.length, 0);
});

test('privacidad social se guarda sin exponer email ni IDs internos', async () => {
  const user = await putUser({ id: 'u1', username: 'privada', email: 'private@example.test' }); const userToken = await token(user);
  const saved = await payload(await friendsHandler(request('friends', { method: 'POST', token: userToken, body: { action: 'set-privacy', friendRequests: 'nobody', profileVisibility: 'limited' } })));
  assert.equal(saved.status, 200);
  const list = await payload(await friendsHandler(request('friends', { token: userToken })));
  assert.deepEqual(list.data.privacy, { friendRequests: 'nobody', profileVisibility: 'limited' }); assert.equal(JSON.stringify(list.data).includes('private@example.test'), false);
});

test('Friends permite rechazar, cancelar y eliminar sin borrar cuentas', async () => {
  const first = await putUser({ id: 'u1', username: 'first' }); const second = await putUser({ id: 'u2', username: 'second' }); const firstToken = await token(first); const secondToken = await token(second);
  let sent = await payload(await friendsHandler(request('friends', { method: 'POST', token: firstToken, body: { action: 'request', username: 'second' } })));
  assert.equal((await payload(await friendsHandler(request('friends', { method: 'POST', token: secondToken, body: { action: 'reject', requestId: sent.data.requestId } })))).data.status, 'rejected');
  sent = await payload(await friendsHandler(request('friends', { method: 'POST', token: firstToken, body: { action: 'request', username: 'second' } })));
  assert.equal((await payload(await friendsHandler(request('friends', { method: 'POST', token: firstToken, body: { action: 'cancel', requestId: sent.data.requestId } })))).data.status, 'cancelled');
  sent = await payload(await friendsHandler(request('friends', { method: 'POST', token: firstToken, body: { action: 'request', username: 'second' } })));
  await friendsHandler(request('friends', { method: 'POST', token: secondToken, body: { action: 'accept', requestId: sent.data.requestId } }));
  assert.equal((await payload(await friendsHandler(request('friends', { method: 'POST', token: firstToken, body: { action: 'remove', username: 'second' } })))).status, 200);
  assert.equal((await payload(await friendsHandler(request('friends', { token: firstToken })))).data.friends.length, 0);
  assert.ok(await USERS.get('user/u2', { type: 'json' }));
});

test('Calendar separa capability Veterano de Admin y member solo propone', async () => {
  const member = await putUser({ id: 'u1', username: 'member' }); const veteran = await putUser({ id: 'u2', username: 'veteran', veteran: true }); const admin = await putUser({ id: 'a1', username: 'staff', securityRole: 'admin' });
  const memberToken = await token(member); const veteranToken = await token(veteran); const adminToken = await token(admin);
  assert.equal((await payload(await calendarHandler(request('calendar', { method: 'POST', token: memberToken, body: { action: 'create-event', ...event() } })))).status, 403);
  assert.equal((await payload(await calendarHandler(request('calendar', { method: 'POST', token: veteranToken, body: { action: 'create-event', ...event() } })))).status, 201);
  const proposal = await payload(await calendarHandler(request('calendar', { method: 'POST', token: memberToken, body: { action: 'create-proposal', ...event() } })));
  assert.equal(proposal.status, 201);
  assert.equal((await payload(await calendarHandler(request('calendar', { method: 'POST', token: veteranToken, body: { action: 'moderate-proposal', proposalId: proposal.data.proposal.proposalId, status: 'approved' } })))).status, 403);
  assert.equal((await payload(await calendarHandler(request('calendar', { method: 'POST', token: memberToken, body: { action: 'moderate-proposal', proposalId: proposal.data.proposal.proposalId, status: 'approved' } })))).status, 403);
  const approved = await payload(await calendarHandler(request('calendar', { method: 'POST', token: adminToken, body: { action: 'moderate-proposal', proposalId: proposal.data.proposal.proposalId, status: 'approved' } })));
  assert.equal(approved.status, 200); assert.equal(approved.data.event.proposalId, proposal.data.proposal.proposalId); assert.equal(approved.data.event.possibleDuplicate, true);
});

test('Owner y Super Dev pueden publicar calendario sin alterar su jerarquía', async () => {
  const owner = await putUser({ id: 'o1', username: 'owner' }); const superdev = await putUser({ id: 's1', username: 'superdev' });
  for (const [user, elevated] of [[owner, false], [superdev, true]]) {
    const authToken = await token(user, elevated); const created = await payload(await calendarHandler(request('calendar', { method: 'POST', token: authToken, body: { action: 'create-event', ...event({ title: `Evento ${user.username}` }) } })));
    assert.equal(created.status, 201);
  }
});

test('Assignments mantienen estado personal separado por usuario', async () => {
  const admin = await putUser({ id: 'a1', username: 'staff', securityRole: 'admin' }); const first = await putUser({ id: 'u1', username: 'first' }); const second = await putUser({ id: 'u2', username: 'second' });
  const adminToken = await token(admin); const firstToken = await token(first); const secondToken = await token(second);
  const created = await payload(await calendarHandler(request('calendar', { method: 'POST', token: adminToken, body: { action: 'create-assignment', subjectId: 'espanol', title: 'Leer la crónica', description: 'Lectura', assignedDate: '2026-09-15', dueDate: '2026-09-20' } })));
  await calendarHandler(request('calendar', { method: 'POST', token: firstToken, body: { action: 'set-assignment-status', assignmentId: created.data.assignmentId, status: 'completed' } }));
  const firstList = await payload(await calendarHandler(request('calendar', { token: firstToken }))); const secondList = await payload(await calendarHandler(request('calendar', { token: secondToken })));
  assert.equal(firstList.data.assignments[0].personalStatus, 'completed'); assert.equal(secondList.data.assignments[0].personalStatus, 'pending');
});

test('eventos de calendario admiten comentarios autenticados y validados', async () => {
  const admin = await putUser({ id: 'a1', username: 'staff', securityRole: 'admin' }); const member = await putUser({ id: 'u1', username: 'member' }); const adminToken = await token(admin); const memberToken = await token(member);
  const created = await payload(await calendarHandler(request('calendar', { method: 'POST', token: adminToken, body: { action: 'create-event', ...event() } })));
  const comment = await payload(await communityHandler(request('community', { method: 'POST', token: memberToken, body: { action: 'comment', resourceType: 'calendar_event', resourceId: created.data.event.eventId, text: '¿Qué temas entran?' } })));
  assert.equal(comment.status, 201);
  const listed = await payload(await communityHandler(request(`community?action=comments&resourceType=calendar_event&resourceId=${created.data.event.eventId}`, { token: memberToken })));
  assert.equal(listed.data.comments[0].text, '¿Qué temas entran?');
  assert.equal((await payload(await communityHandler(request('community', { method: 'POST', token: memberToken, body: { action: 'comment', resourceType: 'calendar_event', resourceId: 'missing', text: 'No existe.' } })))).status, 404);
});

test('notificaciones son privadas y soportan unread/mark read/mark all', async () => {
  const first = await putUser({ id: 'u1', username: 'first' }); const second = await putUser({ id: 'u2', username: 'second' }); const firstToken = await token(first); const secondToken = await token(second);
  await friendsHandler(request('friends', { method: 'POST', token: firstToken, body: { action: 'request', username: 'second' } }));
  const secondList = await payload(await notificationsHandler(request('notifications', { token: secondToken }))); const firstList = await payload(await notificationsHandler(request('notifications', { token: firstToken })));
  assert.equal(secondList.data.unreadCount, 1); assert.equal(firstList.data.unreadCount, 0);
  const id = secondList.data.notifications[0].notificationId;
  await notificationsHandler(request('notifications', { method: 'POST', token: secondToken, body: { action: 'mark-read', notificationId: id } }));
  assert.equal((await payload(await notificationsHandler(request('notifications', { token: secondToken })))).data.unreadCount, 0);
  assert.equal((await payload(await notificationsHandler(request('notifications', { method: 'POST', token: firstToken, body: { action: 'mark-read', notificationId: id } })))).status, 404);
  await friendsHandler(request('friends', { method: 'POST', token: secondToken, body: { action: 'accept', requestId: (await payload(await friendsHandler(request('friends', { token: secondToken })))).data.received[0].requestId } }));
  assert.equal((await payload(await notificationsHandler(request('notifications', { token: firstToken })))).data.unreadCount, 1);
  await notificationsHandler(request('notifications', { method: 'POST', token: firstToken, body: { action: 'mark-all-read' } }));
  assert.equal((await payload(await notificationsHandler(request('notifications', { token: firstToken })))).data.unreadCount, 0);
  const prefs = await payload(await notificationsHandler(request('notifications', { method: 'POST', token: firstToken, body: { action: 'set-preferences', preferences: { comments: false } } })));
  assert.equal(prefs.data.preferences.comments, false); assert.equal(prefs.data.preferences.calendar, true);
});

test('membresía de grupo protege lectura, publicación y Lo que dieron hoy', async () => {
  const user = await putUser({ id: 'u1', username: 'publisher' }); const outsider = await putUser({ id: 'u2', username: 'outsider', veteran: true }); const admin = await putUser({ id: 'a1', username: 'staff', securityRole: 'admin' }); const userToken = await token(user); const outsiderToken = await token(outsider); const adminToken = await token(admin);
  const currentYear = await payload(await groupsHandler(request('groups', { method: 'POST', token: adminToken, body: { action: 'create-year', label: '2026–2027', startDate: '2026-08-01', endDate: '2027-06-30', status: 'current' } })));
  const oldYear = await payload(await groupsHandler(request('groups', { method: 'POST', token: adminToken, body: { action: 'create-year', label: '2025–2026', startDate: '2025-08-01', endDate: '2026-06-30' } })));
  const currentTerm = await payload(await groupsHandler(request('groups', { method: 'POST', token: adminToken, body: { action: 'add-term', schoolYearId: currentYear.data.schoolYear.schoolYearId, label: 'Primer trimestre', startDate: '2026-08-01', endDate: '2026-11-30' } })));
  const oldTerm = await payload(await groupsHandler(request('groups', { method: 'POST', token: adminToken, body: { action: 'add-term', schoolYearId: oldYear.data.schoolYear.schoolYearId, label: 'Primer trimestre', startDate: '2025-08-01', endDate: '2025-11-30' } })));
  const createGroup = async (name, schoolYearId) => (await payload(await groupsHandler(request('groups', { method: 'POST', token: adminToken, body: { action: 'create-group', name, subjectId: 'historia', schoolYearId } })))).data.group.classGroupId;
  const groupA = await createGroup('Historia A', currentYear.data.schoolYear.schoolYearId); const groupB = await createGroup('Historia B', currentYear.data.schoolYear.schoolYearId); const oldGroupA = await createGroup('Historia A anterior', oldYear.data.schoolYear.schoolYearId);
  for (const classGroupId of [groupA, groupB, oldGroupA]) await groupsHandler(request('groups', { method: 'POST', token: adminToken, body: { action: 'add-member', classGroupId, username: 'publisher' } }));
  await communityHandler(request('community', { method: 'POST', token: userToken, body: contribution({ title: 'Grupo A actual', classGroupId: groupA, schoolYearId: currentYear.data.schoolYear.schoolYearId, termId: currentTerm.data.term.termId }) }));
  await communityHandler(request('community', { method: 'POST', token: userToken, body: contribution({ title: 'Grupo B actual', classGroupId: groupB, schoolYearId: currentYear.data.schoolYear.schoolYearId, termId: currentTerm.data.term.termId }) }));
  await communityHandler(request('community', { method: 'POST', token: userToken, body: contribution({ title: 'Grupo A anterior', date: '2025-09-15', classGroupId: oldGroupA, schoolYearId: oldYear.data.schoolYear.schoolYearId, termId: oldTerm.data.term.termId }) }));
  let rows = await payload(await communityHandler(request(`community?date=2026-09-15&classGroupId=${groupA}&schoolYearId=${currentYear.data.schoolYear.schoolYearId}&termId=${currentTerm.data.term.termId}`, { token: userToken })));
  assert.deepEqual(rows.data.contributions.map(row => row.title), ['Grupo A actual']);
  rows = await payload(await communityHandler(request(`community?classGroupId=${oldGroupA}&schoolYearId=${oldYear.data.schoolYear.schoolYearId}&termId=${oldTerm.data.term.termId}`, { token: userToken })));
  assert.deepEqual(rows.data.contributions.map(row => row.title), ['Grupo A anterior']);
  rows = await payload(await communityHandler(request('community', { token: userToken })));
  assert.equal(rows.data.contributions.length, 0);
  assert.equal((await payload(await communityHandler(request(`community?classGroupId=${groupA}`, { token: outsiderToken })))).status, 403);
  assert.equal((await payload(await communityHandler(request('community', { method: 'POST', token: outsiderToken, body: contribution({ title: 'Intrusión', classGroupId: groupA }) })))).status, 403);
  assert.equal((await payload(await calendarHandler(request('calendar', { method: 'POST', token: outsiderToken, body: { action: 'create-event', ...event({ classGroupId: groupA, schoolYearId: currentYear.data.schoolYear.schoolYearId, termId: currentTerm.data.term.termId }) } })))).status, 403);
  assert.equal((await payload(await calendarHandler(request('calendar', { method: 'POST', token: outsiderToken, body: { action: 'create-proposal', ...event({ classGroupId: groupA, schoolYearId: currentYear.data.schoolYear.schoolYearId, termId: currentTerm.data.term.termId }) } })))).status, 403);

  await groupsHandler(request('groups', { method: 'POST', token: adminToken, body: { action: 'set-current-year', schoolYearId: oldYear.data.schoolYear.schoolYearId } }));
  const catalog = await payload(await groupsHandler(request('groups', { token: userToken })));
  assert.equal(catalog.data.schoolYears.length, 2); assert.equal(catalog.data.schoolYears.every(year => year.terms.length === 1), true);
  assert.equal(catalog.data.schoolYears.find(year => year.schoolYearId === oldYear.data.schoolYear.schoolYearId).status, 'current');
  assert.equal(catalog.data.schoolYears.find(year => year.schoolYearId === currentYear.data.schoolYear.schoolYearId).status, 'archived');
});

test('Community, Calendar y assignments aíslan grupo, año y trimestre para member/Admin/Super Dev', async () => {
  const member = await putUser({ id: 'u1', username: 'member' }); const outsider = await putUser({ id: 'u2', username: 'outsider' }); const admin = await putUser({ id: 'a1', username: 'staff', securityRole: 'admin' }); const superdev = await putUser({ id: 's1', username: 'superdev' });
  const memberToken = await token(member); const outsiderToken = await token(outsider); const adminToken = await token(admin); const superToken = await token(superdev, true);
  const year = (await payload(await groupsHandler(request('groups', { method: 'POST', token: adminToken, body: { action: 'create-year', label: '2026–2027', startDate: '2026-08-01', endDate: '2027-06-30', status: 'current' } })))).data.schoolYear;
  const term = (await payload(await groupsHandler(request('groups', { method: 'POST', token: adminToken, body: { action: 'add-term', schoolYearId: year.schoolYearId, label: 'T1', startDate: '2026-08-01', endDate: '2026-11-30' } })))).data.term;
  const group = (await payload(await groupsHandler(request('groups', { method: 'POST', token: adminToken, body: { action: 'create-group', name: 'Historia privada', subjectId: 'historia', schoolYearId: year.schoolYearId } })))).data.group;
  await groupsHandler(request('groups', { method: 'POST', token: adminToken, body: { action: 'add-member', classGroupId: group.classGroupId, username: member.username } }));
  const scope = { classGroupId: group.classGroupId, schoolYearId: year.schoolYearId, termId: term.termId };
  const contributionResult = await payload(await communityHandler(request('community', { method: 'POST', token: memberToken, body: contribution({ title: 'Privado del grupo', ...scope }) }))); assert.equal(contributionResult.status, 201);
  const proposal = await payload(await calendarHandler(request('calendar', { method: 'POST', token: memberToken, body: { action: 'create-proposal', ...event({ title: 'Propuesta privada', ...scope }) } }))); assert.equal(proposal.status, 201);
  const adminEvent = await payload(await calendarHandler(request('calendar', { method: 'POST', token: adminToken, body: { action: 'create-event', ...event({ title: 'Evento Admin', ...scope }) } }))); assert.equal(adminEvent.status, 201);
  const superEvent = await payload(await calendarHandler(request('calendar', { method: 'POST', token: superToken, body: { action: 'create-event', ...event({ title: 'Evento Super Dev', ...scope }) } }))); assert.equal(superEvent.status, 201);
  const assignment = await payload(await calendarHandler(request('calendar', { method: 'POST', token: adminToken, body: { action: 'create-assignment', subjectId: 'historia', title: 'Tarea privada', assignedDate: '2026-09-15', ...scope } }))); assert.equal(assignment.status, 201);
  const allowed = await payload(await calendarHandler(request(`calendar?classGroupId=${group.classGroupId}&schoolYearId=${year.schoolYearId}&termId=${term.termId}`, { token: memberToken })));
  assert.equal(allowed.status, 200); assert.equal(allowed.data.events.length, 2); assert.equal(allowed.data.assignments.length, 1); assert.equal(allowed.data.proposals.length, 1);
  assert.equal((await payload(await calendarHandler(request(`calendar?classGroupId=${group.classGroupId}`, { token: outsiderToken })))).status, 403);
  assert.equal((await payload(await calendarHandler(request('calendar', { method: 'POST', token: outsiderToken, body: { action: 'set-assignment-status', assignmentId: assignment.data.assignmentId, status: 'completed' } })))).status, 403);
  assert.equal((await payload(await communityHandler(request('community', { method: 'POST', token: outsiderToken, body: { action: 'comment', resourceType: 'contribution', resourceId: contributionResult.data.contribution.contributionId, text: 'No autorizado' } })))).status, 403);
});

test('Search no filtra contenido de otros grupos aunque se conozca classGroupId', async () => {
  const member = await putUser({ id: 'u1', username: 'member' }); const outsider = await putUser({ id: 'u2', username: 'outsider' }); const admin = await putUser({ id: 'a1', username: 'staff', securityRole: 'admin' }); const memberToken = await token(member); const outsiderToken = await token(outsider); const adminToken = await token(admin);
  const year = (await payload(await groupsHandler(request('groups', { method: 'POST', token: adminToken, body: { action: 'create-year', label: '2026–2027', startDate: '2026-08-01', endDate: '2027-06-30' } })))).data.schoolYear;
  const group = (await payload(await groupsHandler(request('groups', { method: 'POST', token: adminToken, body: { action: 'create-group', name: 'Grupo secreto', subjectId: 'historia', schoolYearId: year.schoolYearId } })))).data.group;
  await groupsHandler(request('groups', { method: 'POST', token: adminToken, body: { action: 'add-member', classGroupId: group.classGroupId, username: member.username } }));
  await communityHandler(request('community', { method: 'POST', token: memberToken, body: contribution({ title: 'Clave grupoprivado', classGroupId: group.classGroupId, schoolYearId: year.schoolYearId }) }));
  let result = await payload(await searchHandler(request('search?q=grupoprivado', { token: outsiderToken }))); assert.equal(result.data.results.some(row => row.type === 'community'), false);
  result = await payload(await searchHandler(request(`search?q=grupoprivado&classGroupId=${group.classGroupId}`, { token: outsiderToken }))); assert.equal(result.status, 403);
  result = await payload(await searchHandler(request(`search?q=grupoprivado&classGroupId=${group.classGroupId}`, { token: memberToken }))); assert.equal(result.status, 200); assert.equal(result.data.results.some(row => row.type === 'community'), true);
});

test('Roadmap público no concede acceso y Search no filtra aportes bloqueados', async () => {
  const publicRoadmap = await payload(await roadmapHandler(request('roadmap'))); assert.equal(publicRoadmap.status, 200); assert.equal(publicRoadmap.data.items.some(item => item.id === 'community'), true); assert.equal('enabled' in publicRoadmap.data.items[0], false);
  const author = await putUser({ id: 'u1', username: 'autora' }); const reader = await putUser({ id: 'u2', username: 'reader' }); const authorToken = await token(author); const readerToken = await token(reader);
  await communityHandler(request('community', { method: 'POST', token: authorToken, body: contribution({ title: 'Contenido localizable' }) }));
  let search = await payload(await searchHandler(request('search?q=localizable', { token: readerToken }))); assert.equal(search.data.results.some(row => row.type === 'community'), true);
  await friendsHandler(request('friends', { method: 'POST', token: authorToken, body: { action: 'block', username: 'reader' } }));
  search = await payload(await searchHandler(request('search?q=localizable', { token: readerToken }))); assert.equal(search.data.results.some(row => row.type === 'community'), false);
});

test('Community aplica rate limit server-side', async () => {
  const user = await putUser({ id: 'u1', username: 'publisher' }); const userToken = await token(user); let last;
  for (let index = 0; index < 8; index++) last = await payload(await communityHandler(request('community', { method: 'POST', token: userToken, ip: '10.0.0.8', body: contribution({ title: `Aporte ${index}` }) })));
  assert.equal(last.status, 429);
});

test('storage y planner migran datos antiguos y producen planes deterministas', async () => {
  const context = { window: {} }; vm.runInNewContext(await readFile(new URL('../public/js/storage.js', import.meta.url), 'utf8'), context); vm.runInNewContext(await readFile(new URL('../public/js/study-planner.js', import.meta.url), 'utf8'), context);
  const migrated = context.window.StudyHubStorage.parse(JSON.stringify({ savedAt: 1, totalAnswered: 3 }));
  assert.equal(migrated.schemaVersion, 2); assert.equal(context.window.StudyHubStorage.validate(migrated), true); assert.equal(context.window.StudyHubStorage.parse('{broken'), null);
  const topics = [{ id: 'a' }, { id: 'b' }]; const stats = { a: { attempts: 10, correct: 9 }, b: { attempts: 2, correct: 2 } };
  const plan = context.window.StudyHubPlanner.prepareTest(topics, stats, 30); assert.equal(plan.questionTarget, 20); assert.equal(plan.topicIds[0], 'b');
  const card = context.window.StudyHubPlanner.updateFlashcard({}, false, 10); assert.equal(card.unknown, true); assert.equal(card.reviewCount, 1);
});

test('UI centraliza loading, escapa contenido y conserva cinco accesos móviles', async () => {
  const [html, platform, forms] = await Promise.all([readFile(new URL('../public/index.html', import.meta.url), 'utf8'), readFile(new URL('../public/js/platform-ui.js', import.meta.url), 'utf8'), readFile(new URL('../public/js/form-state.js', import.meta.url), 'utf8')]);
  assert.match(forms, /dataset\.submitting/); assert.match(forms, /aria-busy/); assert.match(html, /StudyHubForms\.run\(e\.currentTarget,'Entrando…'/);
  assert.match(platform, /context\.escape\(row\.text\)/); assert.doesNotMatch(platform, /innerHTML\s*=\s*row\.text/);
  assert.match(html, /\{id:'hub'.*\{id:'repaso'.*\{id:'practica'.*\{id:'cuenta'.*\{id:'more'/s);
  for (const id of ['community', 'calendar', 'friends', 'notifications', 'roadmap', 'search']) assert.match(html, new RegExp(`id:'${id}'`));
});

test('System Health es exclusivo de Super Dev y no expone secretos', async () => {
  const admin = await putUser({ id: 'a1', username: 'staff', securityRole: 'admin' }); const adminToken = await token(admin);
  const summary = await payload(await adminHandler(request('admin?section=summary', { token: adminToken })));
  assert.equal(summary.status, 200); assert.equal('health' in summary.data, false); assert.equal(summary.data.summary.community, 0);
  assert.equal((await payload(await adminHandler(request('admin?section=health', { token: adminToken })))).status, 403);
  const superdev = await putUser({ id: 's1', username: 'superdev' }); const superToken = await token(superdev, true);
  const health = await payload(await adminHandler(request('admin?section=health', { token: superToken })));
  assert.equal(health.status, 200); assert.equal(health.data.health.Community, 'Disponible');
  assert.doesNotMatch(JSON.stringify(summary.data), /password|cookie|token|DEV_LOGIN_CODE/i);
  assert.doesNotMatch(JSON.stringify(health.data), /password|cookie|token|DEV_LOGIN_CODE/i);
});

test('endpoints privados rechazan acceso anónimo y cuentas suspendidas', async () => {
  for (const [name, handler] of [['community', communityHandler], ['friends', friendsHandler], ['calendar', calendarHandler], ['notifications', notificationsHandler]]) assert.equal((await payload(await handler(request(name)))).status, 401);
  assert.equal((await payload(await moderationHandler(request('moderation')))).status, 403);
  const suspended = await putUser({ id: 'u1', username: 'suspended', status: 'suspended' }); const suspendedToken = await token(suspended);
  assert.equal((await payload(await communityHandler(request('community', { token: suspendedToken })))).status, 401);
});

test('borrar cuenta limpia relaciones privadas y retira aportes sin tocar stores existentes', async () => {
  const admin = await putUser({ id: 'a1', username: 'staff', securityRole: 'admin' }); const author = await putUser({ id: 'u1', username: 'autora' }); const peer = await putUser({ id: 'u2', username: 'peer' });
  const adminToken = await token(admin); const authorToken = await token(author); const peerToken = await token(peer);
  const created = await payload(await communityHandler(request('community', { method: 'POST', token: authorToken, body: contribution() })));
  await friendsHandler(request('friends', { method: 'POST', token: authorToken, body: { action: 'request', username: 'peer' } }));
  const removed = await payload(await adminHandler(request('admin', { method: 'POST', token: adminToken, body: { action: 'delete', targetUserId: author.id, reason: 'prueba local' } })));
  assert.equal(removed.status, 200); assert.equal(await USERS.get('user/u1', { type: 'json' }), null);
  const row = await getStore('study-hub-community-v1').get(`contributions/${created.data.contribution.contributionId}`, { type: 'json' });
  assert.equal(row.removed, true); assert.equal(row.authorDisplayName, 'Cuenta eliminada');
  assert.equal((await payload(await friendsHandler(request('friends', { token: peerToken })))).data.received.length, 0);
});

test('feeds, búsqueda, notificaciones y moderación paginan sin duplicar filas', async () => {
  const member = await putUser({ id: 'u1', username: 'member' }); const admin = await putUser({ id: 'a1', username: 'staff', securityRole: 'admin' });
  const memberToken = await token(member); const adminToken = await token(admin);
  for (let index = 0; index < 3; index++) {
    await getStore('study-hub-community-v1').setJSON(`contributions/c${index}`, { schemaVersion: 1, contributionId: `c${index}`, authorId: member.id, authorDisplayName: 'Member', subjectId: 'historia', date: '2026-09-18', type: 'class_notes', title: `Paginable ${index}`, text: 'Texto', status: 'community', createdAt: index + 1 });
    await getStore('study-hub-calendar-v1').setJSON(`events/e${index}`, { schemaVersion: 1, eventId: `e${index}`, subjectId: 'historia', date: `2026-09-${20 + index}`, type: 'test', title: `Paginable evento ${index}`, description: '', status: 'active', source: 'admin_created', createdAt: index + 1 });
    await getStore('study-hub-notifications-v1').setJSON(`notifications/${member.id}/${index}`, { schemaVersion: 1, notificationId: `n${index}`, userId: member.id, title: `Aviso ${index}`, message: 'Mensaje', createdAt: index + 1, status: 'active', readAt: null });
  }
  for (const [name, handler, field, tokenValue] of [['community', communityHandler, 'contributions', memberToken], ['calendar', calendarHandler, 'events', memberToken], ['notifications', notificationsHandler, 'notifications', memberToken], ['moderation', moderationHandler, 'items', adminToken]]) {
    const first = await payload(await handler(request(`${name}?limit=2`, { token: tokenValue })));
    assert.equal(first.status, 200, name); assert.equal(first.data[field].length, 2, name); assert.ok(first.data.nextCursor, name);
    const second = await payload(await handler(request(`${name}?limit=2&cursor=${first.data.nextCursor}`, { token: tokenValue })));
    assert.equal(second.data[field].length, 1, name);
    assert.equal(second.data.nextCursor, null, name);
  }
  const first = await payload(await searchHandler(request('search?q=paginable&type=community&limit=2', { token: memberToken })));
  assert.equal(first.data.results.length, 2); assert.ok(first.data.nextCursor);
  const second = await payload(await searchHandler(request(`search?q=paginable&type=community&limit=2&cursor=${first.data.nextCursor}`, { token: memberToken })));
  assert.equal(second.data.results.length, 1);
  const byDate = await payload(await searchHandler(request('search?q=paginable&date=2026-09-18', { token: memberToken })));
  assert.equal(byDate.data.results.every(row => row.date === '2026-09-18'), true);
  const otherDate = await payload(await searchHandler(request('search?q=paginable&date=2026-09-19', { token: memberToken })));
  assert.equal(otherDate.data.results.length, 0);
});

test('perfil limitado excluye identificadores privados y respeta bloqueo', async () => {
  const viewer = await putUser({ id: 'u1', username: 'viewer' }); const target = await putUser({ id: 'u2', username: 'target', displayName: 'Nombre Visible', email: 'hidden@example.test', visibleRank: 'Estudiante', socialPrivacy: { profileVisibility: 'limited' } });
  const viewerToken = await token(viewer); const targetToken = await token(target);
  const profile = await payload(await friendsHandler(request('friends?action=profile&username=target', { token: viewerToken })));
  assert.equal(profile.status, 200); assert.equal(profile.data.profile.displayName, 'Nombre Visible');
  assert.doesNotMatch(JSON.stringify(profile.data), /hidden@example\.test|"u2"|session|progress/i);
  await USERS.setJSON(`user/${target.id}`, { ...target, socialPrivacy: { profileVisibility: 'private' } });
  assert.equal((await payload(await friendsHandler(request('friends?action=profile&username=target', { token: viewerToken })))).status, 403);
  await USERS.setJSON(`user/${target.id}`, target);
  await friendsHandler(request('friends', { method: 'POST', token: targetToken, body: { action: 'block', username: 'viewer' } }));
  assert.equal((await payload(await friendsHandler(request('friends?action=profile&username=target', { token: viewerToken })))).status, 403);
});

test('fechas de grupo respetan año y trimestre incluso en vencimientos', async () => {
  const admin = await putUser({ id: 'a1', username: 'staff', securityRole: 'admin' }); const adminToken = await token(admin);
  const year = (await payload(await groupsHandler(request('groups', { method: 'POST', token: adminToken, body: { action: 'create-year', label: '2026–2027', startDate: '2026-08-01', endDate: '2027-06-30' } })))).data.schoolYear;
  const term = (await payload(await groupsHandler(request('groups', { method: 'POST', token: adminToken, body: { action: 'add-term', schoolYearId: year.schoolYearId, label: 'T1', startDate: '2026-08-01', endDate: '2026-11-30' } })))).data.term;
  const group = (await payload(await groupsHandler(request('groups', { method: 'POST', token: adminToken, body: { action: 'create-group', name: 'Historia A', subjectId: 'historia', schoolYearId: year.schoolYearId } })))).data.group;
  const scope = { classGroupId: group.classGroupId, termId: term.termId };
  assert.equal((await payload(await communityHandler(request('community', { method: 'POST', token: adminToken, body: contribution({ ...scope, date: '2027-01-10' }) })))).status, 400);
  assert.equal((await payload(await calendarHandler(request('calendar', { method: 'POST', token: adminToken, body: { action: 'create-event', ...event({ ...scope, date: '2027-01-10' }) } })))).status, 400);
  assert.equal((await payload(await calendarHandler(request('calendar', { method: 'POST', token: adminToken, body: { action: 'create-assignment', subjectId: 'historia', title: 'Tarea grupal', assignedDate: '2026-09-18', dueDate: '2027-01-10', ...scope } })))).status, 400);
});

test('aprobar una propuesta dos veces no duplica el evento', async () => {
  const member = await putUser({ id: 'u1', username: 'member' }); const admin = await putUser({ id: 'a1', username: 'staff', securityRole: 'admin' });
  const memberToken = await token(member); const adminToken = await token(admin);
  const proposed = await payload(await calendarHandler(request('calendar', { method: 'POST', token: memberToken, body: { action: 'create-proposal', ...event() } })));
  assert.equal(proposed.status, 201);
  const body = { action: 'moderate-proposal', proposalId: proposed.data.proposal.proposalId, status: 'approved' };
  const first = await payload(await calendarHandler(request('calendar', { method: 'POST', token: adminToken, body })));
  assert.equal(first.status, 200);
  const second = await payload(await calendarHandler(request('calendar', { method: 'POST', token: adminToken, body })));
  assert.equal(second.status, 409);
  const listed = await payload(await calendarHandler(request('calendar', { token: memberToken })));
  assert.equal(listed.data.events.filter(row => row.proposalId === body.proposalId).length, 1);
});

test('UI nueva conserva favoritas, flashcards y categorías sin alterar Guardadas', async () => {
  const [html, platform, extras] = await Promise.all([readFile(new URL('../public/index.html', import.meta.url), 'utf8'), readFile(new URL('../public/js/platform-ui.js', import.meta.url), 'utf8'), readFile(new URL('../public/js/platform-extras.js', import.meta.url), 'utf8')]);
  for (const marker of ['savedCategories', 'flashcards', 'cardKnown', 'cardUnknown', 'topicFavorite', 'practSaved']) assert.match(html, new RegExp(marker));
  for (const marker of ['Lo que dieron hoy', 'Cargar más', 'Falté hoy', 'Filtrar personas', 'data-person-request']) assert.match(platform, new RegExp(marker));
  for (const marker of ['Qué estudiar hoy', 'data-prepare', 'Mis grupos', 'Favoritos']) assert.match(extras, new RegExp(marker));
  assert.match(html, /saved:\[\.\.\.state\.saved\]/);
});
