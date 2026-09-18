import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';
import { authenticateRequest, canAccessAdmin, resolveUser } from './_shared/auth.mjs';
import { RateLimitError, enforceRateLimit, recordRateLimitFailure } from './_shared/rate-limit.mjs';
import {
  COMMUNITY_STATUSES, COMMUNITY_TYPES, REPORT_REASONS, SUBJECTS, auditEvent, cleanText,
  createNotification, isBlockedBetween, json, listRows, paginateRows, possibleDuplicate, readBody, safeActor, validDate,
} from './_shared/platform.mjs';
import { validateAcademicScope } from './groups.mjs';

export const COMMUNITY = getStore('study-hub-community-v1');
export const COMMENTS = getStore('study-hub-community-comments-v1');
export const CONFIRMATIONS = getStore('study-hub-community-confirmations-v1');
export const REPORTS = getStore('study-hub-reports-v1');
const CALENDAR_EVENTS = getStore('study-hub-calendar-v1');

function attachmentsMetadata(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 5).map(item => ({ name: cleanText(item?.name, 120), type: cleanText(item?.type, 80), size: Math.max(0, Math.min(Number(item?.size) || 0, 25_000_000)) })).filter(item => item.name);
}

function publicContribution(row, auth) {
  const staff = canAccessAdmin(auth.role);
  return {
    contributionId: row.contributionId,
    authorDisplayName: cleanText(row.authorDisplayName, 60),
    subjectId: cleanText(row.subjectId, 40), unitId: cleanText(row.unitId, 80), topicId: cleanText(row.topicId, 80),
    classGroupId: cleanText(row.classGroupId, 80), schoolYearId: cleanText(row.schoolYearId, 80), termId: cleanText(row.termId, 80), date: row.date,
    type: COMMUNITY_TYPES.has(row.type) ? row.type : 'other', title: cleanText(row.title, 140), text: cleanText(row.text, 5000),
    attachments: attachmentsMetadata(row.attachments), status: COMMUNITY_STATUSES.has(row.status) ? row.status : 'community',
    label: row.status === 'official' ? 'Material oficial' : row.status === 'admin_verified' ? 'Verificado' : 'Aporte comunitario',
    createdAt: Number(row.createdAt || 0), updatedAt: Number(row.updatedAt || row.createdAt || 0),
    confirmationsCount: Number(row.confirmationsCount || 0), commentsCount: Number(row.commentsCount || 0), reportsCount: staff ? Number(row.reportsCount || 0) : undefined,
    possibleDuplicate: row.possibleDuplicate === true, own: row.authorId === auth.user.id,
  };
}

function publicComment(row, auth) {
  return { commentId: row.commentId, resourceType: row.resourceType, resourceId: row.resourceId, authorDisplayName: cleanText(row.authorDisplayName, 60), text: row.removed ? '' : cleanText(row.text, 2000), createdAt: Number(row.createdAt || 0), updatedAt: Number(row.updatedAt || row.createdAt || 0), status: row.removed ? 'removed' : 'active', own: row.authorId === auth.user.id };
}

async function getContribution(id) { return id ? await COMMUNITY.get(`contributions/${id}`, { type: 'json', consistency: 'strong' }) : null; }
async function socialResource(type, id) {
  if (type === 'contribution') return await getContribution(id);
  if (type === 'calendar_event') return await CALENDAR_EVENTS.get(`events/${id}`, { type: 'json', consistency: 'strong' });
  if (type === 'comment') return (await listRows(COMMENTS, 'comments/')).find(row => row.commentId === id) || null;
  return type === 'social_user' ? await resolveUser(id) : null;
}

async function resourceAccess(auth, row) {
  if (!row?.classGroupId) return { ok: true };
  return await validateAcademicScope(auth, row);
}

async function listContributions(req, auth) {
  const url = new URL(req.url); const date = validDate(url.searchParams.get('date')); const subjectId = cleanText(url.searchParams.get('subject'), 40); const classGroupId = cleanText(url.searchParams.get('classGroupId'), 80); const schoolYearId = cleanText(url.searchParams.get('schoolYearId'), 80); const termId = cleanText(url.searchParams.get('termId'), 80);
  if (classGroupId || schoolYearId || termId) { const scope = await validateAcademicScope(auth, { classGroupId, schoolYearId, termId, subjectId }); if (!scope.ok) return json({ error: scope.error }, scope.status); }
  const type = cleanText(url.searchParams.get('type'), 30);
  const rows = (await listRows(COMMUNITY, 'contributions/', 1000)).filter(row => !row.removed && (!['rejected', 'duplicate'].includes(row.status) || row.authorId === auth.user.id || canAccessAdmin(auth.role)));
  const visible = [];
  for (const row of rows) {
    if (date && row.date !== date) continue;
    if (SUBJECTS.has(subjectId) && row.subjectId !== subjectId) continue;
    if (COMMUNITY_TYPES.has(type) && row.type !== type) continue;
    if (row.classGroupId && row.classGroupId !== classGroupId) continue;
    if (schoolYearId && row.schoolYearId !== schoolYearId) continue;
    if (termId && row.termId !== termId) continue;
    if (row.authorId !== auth.user.id && await isBlockedBetween(auth.user.id, row.authorId)) continue;
    visible.push(publicContribution(row, auth));
  }
  visible.sort((a, b) => b.createdAt - a.createdAt);
  const page = paginateRows(visible, url.searchParams);
  return json({ contributions: page.items, nextCursor: page.nextCursor, limit: page.limit });
}

async function listComments(req, auth) {
  const url = new URL(req.url); const resourceType = cleanText(url.searchParams.get('resourceType'), 40); const resourceId = cleanText(url.searchParams.get('resourceId'), 80);
  if (!['contribution', 'calendar_event'].includes(resourceType) || !resourceId) return json({ error: 'Recurso inválido.' }, 400);
  const target = await socialResource(resourceType, resourceId); if (!target || target.removed) return json({ error: 'Recurso no encontrado.' }, 404);
  const access = await resourceAccess(auth, target); if (!access.ok) return json({ error: access.error }, access.status);
  const rows = await listRows(COMMENTS, `comments/${resourceType}/${resourceId}/`);
  const visible = [];
  for (const row of rows.sort((a, b) => a.createdAt - b.createdAt)) if (row.authorId === auth.user.id || !(await isBlockedBetween(auth.user.id, row.authorId))) visible.push(publicComment(row, auth));
  return json({ comments: visible });
}

export default async (req) => {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.ok) return json({ error: 'Inicia sesión para usar Comunidad.' }, 401);
    if (req.method === 'GET') return new URL(req.url).searchParams.get('action') === 'comments' ? await listComments(req, auth) : await listContributions(req, auth);
    if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
    const body = await readBody(req); const action = cleanText(body.action, 40);

    if (action === 'create') {
      const rate = await enforceRateLimit(req, 'contribution', auth.user.id, { strict: true });
      const subjectId = cleanText(body.subjectId, 40); const type = cleanText(body.type, 30); const title = cleanText(body.title, 140); const text = cleanText(body.text, 5000); const date = validDate(body.date);
      if (!SUBJECTS.has(subjectId) || !COMMUNITY_TYPES.has(type) || title.length < 4 || text.length < 5 || !date) { await recordRateLimitFailure(rate); return json({ error: 'Completa materia, fecha, tipo, título y notas válidas.' }, 400); }
      const scope = await validateAcademicScope(auth, { classGroupId: body.classGroupId, schoolYearId: body.schoolYearId, termId: body.termId, subjectId, date });
      if (!scope.ok) return json({ error: scope.error }, scope.status);
      const prior = await listRows(COMMUNITY, 'contributions/'); const actor = safeActor(auth); const now = Date.now();
      const row = { schemaVersion: 1, contributionId: randomUUID(), authorId: actor.userId, authorDisplayName: actor.displayName, subjectId, unitId: cleanText(body.unitId, 80), topicId: cleanText(body.topicId, 80), classGroupId: scope.classGroupId, schoolYearId: scope.schoolYearId, termId: scope.termId, date, type, title, text, attachments: attachmentsMetadata(body.attachments), status: 'community', createdAt: now, updatedAt: now, confirmationsCount: 0, commentsCount: 0, reportsCount: 0, possibleDuplicate: possibleDuplicate(prior, { subjectId, date, type, title }) };
      await recordRateLimitFailure(rate); await COMMUNITY.setJSON(`contributions/${row.contributionId}`, row);
      return json({ ok: true, contribution: publicContribution(row, auth) }, 201);
    }

    if (action === 'confirm') {
      const row = await getContribution(cleanText(body.contributionId, 80)); if (!row || row.removed) return json({ error: 'Aporte no encontrado.' }, 404);
      const access = await resourceAccess(auth, row); if (!access.ok) return json({ error: access.error }, access.status);
      if (row.authorId === auth.user.id) return json({ error: 'No puedes confirmar tu propio aporte.' }, 400);
      if (await isBlockedBetween(auth.user.id, row.authorId)) return json({ error: 'Esta interacción no está disponible.' }, 403);
      const rate = await enforceRateLimit(req, 'confirmation', auth.user.id, { strict: true }); const key = `confirmations/${row.contributionId}/${auth.user.id}`;
      if (await CONFIRMATIONS.get(key, { type: 'json', consistency: 'strong' })) return json({ error: 'Ya confirmaste este aporte.' }, 409);
      await recordRateLimitFailure(rate); await CONFIRMATIONS.setJSON(key, { schemaVersion: 1, contributionId: row.contributionId, userId: auth.user.id, createdAt: Date.now() });
      row.confirmationsCount = Number(row.confirmationsCount || 0) + 1; if (row.status === 'community' && row.confirmationsCount >= 2) row.status = 'confirmed'; row.updatedAt = Date.now();
      await COMMUNITY.setJSON(`contributions/${row.contributionId}`, row);
      await createNotification(row.authorId, { type: 'community_confirmation', title: 'Confirmaron tu aporte', message: 'Otro estudiante confirmó que también recibió este material.', resourceType: 'contribution', resourceId: row.contributionId });
      return json({ ok: true, contribution: publicContribution(row, auth) });
    }

    if (action === 'comment') {
      const resourceType = cleanText(body.resourceType, 40); const resourceId = cleanText(body.resourceId, 80); const text = cleanText(body.text, 2000);
      if (!['contribution', 'calendar_event'].includes(resourceType) || !resourceId || text.length < 2) return json({ error: 'Comentario inválido.' }, 400);
      const target = await socialResource(resourceType, resourceId); if (!target || target.removed) return json({ error: 'Recurso no encontrado.' }, 404); const ownerId = target.authorId || target.createdBy || '';
      const access = await resourceAccess(auth, target); if (!access.ok) return json({ error: access.error }, access.status);
      if (ownerId && await isBlockedBetween(auth.user.id, ownerId)) return json({ error: 'Esta interacción no está disponible.' }, 403);
      const rate = await enforceRateLimit(req, 'comment', auth.user.id, { strict: true }); const now = Date.now(); const actor = safeActor(auth);
      const row = { schemaVersion: 1, commentId: randomUUID(), resourceType, resourceId, authorId: actor.userId, authorDisplayName: actor.displayName, classGroupId: cleanText(target.classGroupId, 80), schoolYearId: cleanText(target.schoolYearId, 80), termId: cleanText(target.termId, 80), text, createdAt: now, updatedAt: now, status: 'active', removed: false };
      await recordRateLimitFailure(rate); await COMMENTS.setJSON(`comments/${resourceType}/${resourceId}/${now}_${row.commentId}`, row);
      if (resourceType === 'contribution') { const target = await getContribution(resourceId); target.commentsCount = Number(target.commentsCount || 0) + 1; target.updatedAt = now; await COMMUNITY.setJSON(`contributions/${resourceId}`, target); if (target.authorId !== auth.user.id) await createNotification(target.authorId, { type: 'comment', title: 'Nuevo comentario', message: `${actor.displayName} comentó tu aporte.`, resourceType, resourceId }); }
      return json({ ok: true, comment: publicComment(row, auth) }, 201);
    }

    if (action === 'remove-comment') {
      const id = cleanText(body.commentId, 80); const rows = await listRows(COMMENTS, 'comments/'); const row = rows.find(item => item.commentId === id);
      if (!row) return json({ error: 'Comentario no encontrado.' }, 404);
      const parent = await socialResource(row.resourceType, row.resourceId);
      if (!parent || parent.removed) return json({ error: 'Recurso no encontrado.' }, 404);
      const access = await resourceAccess(auth, parent); if (!access.ok) return json({ error: access.error }, access.status);
      if (row.authorId !== auth.user.id && !canAccessAdmin(auth.role)) return json({ error: 'No puedes eliminar comentarios ajenos.' }, 403);
      row.removed = true; row.status = 'removed'; row.deletedAt = Date.now(); row.deletedBy = auth.user.id; row.deletionReason = cleanText(body.reason, 200); row.updatedAt = row.deletedAt;
      await COMMENTS.setJSON(`comments/${row.resourceType}/${row.resourceId}/${row.createdAt}_${row.commentId}`, row);
      return json({ ok: true });
    }

    if (action === 'report') {
      const resourceType = cleanText(body.resourceType, 40); const resourceId = cleanText(body.resourceId, 80); const reason = cleanText(body.reason, 40);
      if (!['contribution', 'comment', 'calendar_event', 'social_user'].includes(resourceType) || !resourceId || !REPORT_REASONS.has(reason)) return json({ error: 'Reporte inválido.' }, 400);
      const target = await socialResource(resourceType, resourceId); if (!target) return json({ error: 'Recurso no encontrado.' }, 404);
      const access = await resourceAccess(auth, target); if (!access.ok) return json({ error: access.error }, access.status);
      const rate = await enforceRateLimit(req, 'report', auth.user.id, { strict: true }); const key = `reports/${resourceType}/${resourceId}/${auth.user.id}`;
      if (await REPORTS.get(key, { type: 'json', consistency: 'strong' })) return json({ error: 'Ya reportaste este recurso.' }, 409);
      await recordRateLimitFailure(rate); const row = { schemaVersion: 1, reportId: randomUUID(), reporterId: auth.user.id, resourceType, resourceId, reason, details: cleanText(body.details, 1000), status: 'pending', createdAt: Date.now() };
      await REPORTS.setJSON(key, row); return json({ ok: true, reportId: row.reportId }, 201);
    }

    if (action === 'moderate') {
      if (!canAccessAdmin(auth.role)) return json({ error: 'No tienes permiso para moderar.' }, 403);
      const row = await getContribution(cleanText(body.contributionId, 80)); const status = cleanText(body.status, 30);
      if (!row) return json({ error: 'Aporte no encontrado.' }, 404);
      if (!COMMUNITY_STATUSES.has(status) || status === 'pending' || status === 'community' || status === 'confirmed') return json({ error: 'Estado de moderación inválido.' }, 400);
      if (status === 'official' && row.status !== 'admin_verified') return json({ error: 'Primero verifica el aporte; la publicación oficial requiere una segunda aprobación.' }, 409);
      const previousStatus = row.status; row.status = status; row.updatedAt = Date.now(); row.moderatedBy = auth.user.id;
      await COMMUNITY.setJSON(`contributions/${row.contributionId}`, row); await auditEvent(auth, `community-${status}`, { targetContributionId: row.contributionId, previousStatus, nextStatus: status });
      await createNotification(row.authorId, { type: 'community_moderation', title: 'Actualización de tu aporte', message: `El estado cambió a ${status}.`, resourceType: 'contribution', resourceId: row.contributionId });
      return json({ ok: true, contribution: publicContribution(row, auth) });
    }
    return json({ error: 'Acción desconocida.' }, 400);
  } catch (error) {
    if (error instanceof RateLimitError || error?.status === 429) return json({ error: error.message }, 429, { 'retry-after': String(error.retryAfterSeconds || 60) });
    console.error('community function error', { name: error?.name || 'Error' });
    return json({ error: 'No se pudo procesar Comunidad.' }, 500);
  }
};
