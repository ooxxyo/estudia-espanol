import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';
import { authenticateRequest, canAccessAdmin } from './_shared/auth.mjs';
import { RateLimitError, enforceRateLimit, recordRateLimitFailure } from './_shared/rate-limit.mjs';
import {
  CALENDAR_TYPES, PROPOSAL_STATUSES, SUBJECTS, auditEvent, cleanText, createNotification,
  hasCapability, json, listRows, possibleDuplicate, readBody, validDate,
} from './_shared/platform.mjs';
import { validateAcademicScope } from './groups.mjs';

export const CALENDAR = getStore('study-hub-calendar-v1');
export const PROPOSALS = getStore('study-hub-calendar-proposals-v1');
export const ASSIGNMENTS = getStore('study-hub-assignments-v1');
export const ASSIGNMENT_PROGRESS = getStore('study-hub-assignment-progress-v1');

function eventInput(body) {
  return {
    subjectId: cleanText(body.subjectId, 40), unitId: cleanText(body.unitId, 80), topicId: cleanText(body.topicId, 80),
    classGroupId: cleanText(body.classGroupId, 80), schoolYearId: cleanText(body.schoolYearId, 80), termId: cleanText(body.termId, 80), type: cleanText(body.type, 30),
    title: cleanText(body.title, 140), description: cleanText(body.description, 3000), date: validDate(body.date),
  };
}

function validEvent(input) { return SUBJECTS.has(input.subjectId) && CALENDAR_TYPES.has(input.type) && input.title.length >= 4 && Boolean(input.date); }
function publicEvent(row) { return { eventId: row.eventId, subjectId: row.subjectId, unitId: row.unitId || '', topicId: row.topicId || '', classGroupId: row.classGroupId || '', schoolYearId: row.schoolYearId || '', termId: row.termId || '', type: row.type, title: row.title, description: row.description, date: row.date, createdAt: row.createdAt, updatedAt: row.updatedAt, status: row.removed ? 'removed' : row.status, source: row.source, visibility: row.visibility, proposalId: row.proposalId || '', possibleDuplicate: row.possibleDuplicate === true }; }
function publicProposal(row, auth) { return { proposalId: row.proposalId, subjectId: row.subjectId, unitId: row.unitId || '', topicId: row.topicId || '', classGroupId: row.classGroupId || '', schoolYearId: row.schoolYearId || '', termId: row.termId || '', type: row.type, title: row.title, description: row.description, date: row.date, createdAt: row.createdAt, status: row.status, possibleDuplicate: row.possibleDuplicate === true, own: row.authorId === auth.user.id }; }

async function createEvent(auth, input, extra = {}) {
  const rows = await listRows(CALENDAR, 'events/'); const now = Date.now();
  const row = { schemaVersion: 1, eventId: randomUUID(), ...input, createdBy: auth.user.id, createdAt: now, updatedAt: now, status: 'active', source: extra.source || 'admin_created', visibility: 'members', proposalId: extra.proposalId || '', originalAuthor: extra.originalAuthor || '', approvedBy: extra.approvedBy || '', possibleDuplicate: possibleDuplicate(rows, input), removed: false };
  await CALENDAR.setJSON(`events/${row.eventId}`, row); return row;
}

async function listCalendar(req, auth) {
  const url = new URL(req.url); const date = validDate(url.searchParams.get('date')); const subjectId = cleanText(url.searchParams.get('subject'), 40); const classGroupId = cleanText(url.searchParams.get('classGroupId'), 80); const schoolYearId = cleanText(url.searchParams.get('schoolYearId'), 80); const termId = cleanText(url.searchParams.get('termId'), 80);
  if (classGroupId || schoolYearId || termId) { const scope = await validateAcademicScope(auth, { classGroupId, schoolYearId, termId, subjectId }); if (!scope.ok) return json({ error: scope.error }, scope.status); }
  const rows = (await listRows(CALENDAR, 'events/')).filter(row => !row.removed && (!date || row.date === date) && (!SUBJECTS.has(subjectId) || row.subjectId === subjectId) && (!row.classGroupId || row.classGroupId === classGroupId) && (!schoolYearId || row.schoolYearId === schoolYearId) && (!termId || row.termId === termId)).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  const proposals = [];
  for (const row of await listRows(PROPOSALS, 'proposals/')) {
    if (!canAccessAdmin(auth.role) && row.authorId !== auth.user.id) continue;
    const access = await validateAcademicScope(auth, row); if (!access.ok) continue;
    if (classGroupId && row.classGroupId !== classGroupId) continue;
    if (schoolYearId && row.schoolYearId !== schoolYearId) continue;
    if (termId && row.termId !== termId) continue;
    proposals.push(publicProposal(row, auth));
  }
  const assignments = (await listRows(ASSIGNMENTS, 'assignments/')).filter(row => !row.removed && (!date || row.dueDate === date || row.assignedDate === date) && (!row.classGroupId || row.classGroupId === classGroupId) && (!schoolYearId || row.schoolYearId === schoolYearId) && (!termId || row.termId === termId));
  const safeAssignments = await Promise.all(assignments.map(async row => {
    const personal = await ASSIGNMENT_PROGRESS.get(`progress/${auth.user.id}/${row.assignmentId}`, { type: 'json', consistency: 'strong' });
    return { assignmentId: row.assignmentId, subjectId: row.subjectId, unitId: row.unitId || '', topicId: row.topicId || '', classGroupId: row.classGroupId || '', schoolYearId: row.schoolYearId || '', termId: row.termId || '', title: row.title, description: row.description, assignedDate: row.assignedDate, dueDate: row.dueDate || '', source: row.source, status: row.status, personalStatus: personal?.status || 'pending' };
  }));
  return json({ events: rows.map(publicEvent), proposals, assignments: safeAssignments, capabilities: { create: hasCapability(auth, 'calendar:create'), moderate: hasCapability(auth, 'moderation:global') } });
}

export default async (req) => {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.ok) return json({ error: 'Inicia sesión para usar Calendario.' }, 401);
    if (req.method === 'GET') return await listCalendar(req, auth);
    if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
    const body = await readBody(req); const action = cleanText(body.action, 40);
    if (action === 'create-event') {
      if (!hasCapability(auth, 'calendar:create')) return json({ error: 'Tu cuenta puede proponer eventos, pero no publicarlos directamente.' }, 403);
      const rate = await enforceRateLimit(req, 'calendarEvent', auth.user.id, { strict: true });
      const input = eventInput(body); if (!validEvent(input)) { await recordRateLimitFailure(rate); return json({ error: 'Evento inválido.' }, 400); }
      const scope = await validateAcademicScope(auth, input); if (!scope.ok) return json({ error: scope.error }, scope.status);
      Object.assign(input, { classGroupId: scope.classGroupId, schoolYearId: scope.schoolYearId, termId: scope.termId });
      await recordRateLimitFailure(rate);
      const row = await createEvent(auth, input, { source: auth.role === 'member' ? 'veteran_created' : 'admin_created' });
      return json({ ok: true, event: publicEvent(row) }, 201);
    }
    if (action === 'create-proposal') {
      const rate = await enforceRateLimit(req, 'calendarProposal', auth.user.id, { strict: true }); const input = eventInput(body);
      if (!validEvent(input)) { await recordRateLimitFailure(rate); return json({ error: 'Propuesta inválida.' }, 400); }
      const scope = await validateAcademicScope(auth, input); if (!scope.ok) return json({ error: scope.error }, scope.status);
      Object.assign(input, { classGroupId: scope.classGroupId, schoolYearId: scope.schoolYearId, termId: scope.termId });
      const prior = await listRows(PROPOSALS, 'proposals/'); const now = Date.now();
      const row = { schemaVersion: 1, proposalId: randomUUID(), authorId: auth.user.id, ...input, createdAt: now, updatedAt: now, status: 'pending', reviewedAt: null, reviewedBy: '', possibleDuplicate: possibleDuplicate(prior, input) };
      await recordRateLimitFailure(rate); await PROPOSALS.setJSON(`proposals/${row.proposalId}`, row);
      return json({ ok: true, proposal: publicProposal(row, auth) }, 201);
    }
    if (action === 'moderate-proposal') {
      if (!hasCapability(auth, 'moderation:global')) return json({ error: 'No tienes permiso para moderar propuestas.' }, 403);
      const id = cleanText(body.proposalId, 80); const status = cleanText(body.status, 30); const row = await PROPOSALS.get(`proposals/${id}`, { type: 'json', consistency: 'strong' });
      if (!row) return json({ error: 'Propuesta no encontrada.' }, 404);
      if (!PROPOSAL_STATUSES.has(status) || status === 'pending') return json({ error: 'Estado de propuesta inválido.' }, 400);
      row.status = status; row.reviewedAt = Date.now(); row.reviewedBy = auth.user.id; row.updatedAt = row.reviewedAt;
      await PROPOSALS.setJSON(`proposals/${id}`, row); let event = null;
      if (status === 'approved') { const scope = await validateAcademicScope(auth, row); if (!scope.ok) return json({ error: scope.error }, scope.status); event = await createEvent(auth, { ...eventInput(row), classGroupId: scope.classGroupId, schoolYearId: scope.schoolYearId, termId: scope.termId }, { source: 'community_proposal', proposalId: id, originalAuthor: row.authorId, approvedBy: auth.user.id }); }
      await auditEvent(auth, `calendar-proposal-${status}`, { targetProposalId: id, createdEventId: event?.eventId || '' });
      await createNotification(row.authorId, { type: status === 'approved' ? 'calendar_proposal_approved' : status === 'needs_info' ? 'calendar_needs_info' : 'calendar_proposal_rejected', title: 'Actualización de propuesta', message: `Tu propuesta cambió a ${status}.`, resourceType: 'calendar_proposal', resourceId: id });
      return json({ ok: true, proposal: publicProposal(row, auth), event: event ? publicEvent(event) : null });
    }
    if (action === 'create-assignment') {
      if (!hasCapability(auth, 'calendar:create')) return json({ error: 'No tienes permiso para publicar assignments.' }, 403);
      const subjectId = cleanText(body.subjectId, 40); const title = cleanText(body.title, 140); const assignedDate = validDate(body.assignedDate); const dueDate = body.dueDate ? validDate(body.dueDate) : '';
      if (!SUBJECTS.has(subjectId) || title.length < 4 || !assignedDate || (body.dueDate && !dueDate)) return json({ error: 'Assignment inválido.' }, 400);
      const scope = await validateAcademicScope(auth, { classGroupId: body.classGroupId, schoolYearId: body.schoolYearId, termId: body.termId, subjectId }); if (!scope.ok) return json({ error: scope.error }, scope.status);
      const now = Date.now(); const row = { schemaVersion: 1, assignmentId: randomUUID(), subjectId, unitId: cleanText(body.unitId, 80), topicId: cleanText(body.topicId, 80), classGroupId: scope.classGroupId, schoolYearId: scope.schoolYearId, termId: scope.termId, title, description: cleanText(body.description, 3000), assignedDate, dueDate, createdBy: auth.user.id, source: 'calendar', status: 'active', createdAt: now, updatedAt: now, removed: false };
      await ASSIGNMENTS.setJSON(`assignments/${row.assignmentId}`, row); return json({ ok: true, assignmentId: row.assignmentId }, 201);
    }
    if (action === 'set-assignment-status') {
      const assignmentId = cleanText(body.assignmentId, 80); const status = cleanText(body.status, 30);
      if (!['pending', 'in_progress', 'completed', 'submitted'].includes(status)) return json({ error: 'Estado personal inválido.' }, 400);
      const assignment = await ASSIGNMENTS.get(`assignments/${assignmentId}`, { type: 'json', consistency: 'strong' });
      if (!assignment) return json({ error: 'Assignment no encontrado.' }, 404);
      const scope = await validateAcademicScope(auth, assignment); if (!scope.ok) return json({ error: scope.error }, scope.status);
      await ASSIGNMENT_PROGRESS.setJSON(`progress/${auth.user.id}/${assignmentId}`, { schemaVersion: 1, userId: auth.user.id, assignmentId, status, updatedAt: Date.now() });
      return json({ ok: true, status });
    }
    if (action === 'remove-event') {
      const id = cleanText(body.eventId, 80); const row = await CALENDAR.get(`events/${id}`, { type: 'json', consistency: 'strong' });
      if (!row) return json({ error: 'Evento no encontrado.' }, 404);
      if (row.createdBy !== auth.user.id && !canAccessAdmin(auth.role)) return json({ error: 'No tienes permiso para retirar este evento.' }, 403);
      row.removed = true; row.deletedAt = Date.now(); row.deletedBy = auth.user.id; row.deletionReason = cleanText(body.reason, 200); row.updatedAt = row.deletedAt; await CALENDAR.setJSON(`events/${id}`, row);
      return json({ ok: true });
    }
    return json({ error: 'Acción desconocida.' }, 400);
  } catch (error) {
    if (error instanceof RateLimitError || error?.status === 429) return json({ error: error.message }, 429, { 'retry-after': String(error.retryAfterSeconds || 60) });
    console.error('calendar function error', { name: error?.name || 'Error' });
    return json({ error: 'No se pudo procesar Calendario.' }, 500);
  }
};
