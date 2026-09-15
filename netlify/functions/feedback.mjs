import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';
import { authenticateRequest, canAccessAdmin, publicUser } from './_shared/auth.mjs';
import {
  RateLimitError,
  enforceRateLimit,
  recordRateLimitFailure,
} from './_shared/rate-limit.mjs';

const FEEDBACK = getStore('study-hub-feedback-v1');
const AUDIT = getStore('study-hub-admin-audit-v1');
const TYPES = new Set(['bug', 'suggestion', 'content', 'ui-ux', 'other']);
const STATUSES = new Set(['new', 'reviewing', 'planned', 'fixed', 'dismissed']);
const SUBJECTS = new Set(['ingles', 'salud', 'historia', 'ciencia', 'matematicas', 'espanol']);
const MAX_SCAN = 1000;
const MAX_RESULTS = 200;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

function cleanText(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function publicReport(report) {
  return {
    id: report.id,
    type: TYPES.has(report.type) ? report.type : 'other',
    title: cleanText(report.title, 100),
    message: cleanText(report.message, 4000),
    subjectId: SUBJECTS.has(report.subjectId) ? report.subjectId : '',
    unitId: cleanText(report.unitId, 80),
    topicId: cleanText(report.topicId, 80),
    section: cleanText(report.section, 80),
    status: STATUSES.has(report.status) ? report.status : 'new',
    userId: report.userId,
    username: cleanText(report.username, 20),
    displayName: cleanText(report.displayName || report.username, 60),
    createdAt: Number(report.createdAt || 0),
    updatedAt: Number(report.updatedAt || report.createdAt || 0),
  };
}

async function listReports(auth, url) {
  const adminScope = url.searchParams.get('scope') === 'admin' && canAccessAdmin(auth.role);
  const query = cleanText(url.searchParams.get('q'), 120).toLowerCase();
  const type = cleanText(url.searchParams.get('type'), 20);
  const status = cleanText(url.searchParams.get('status'), 20);
  const subjectId = cleanText(url.searchParams.get('subject'), 40);
  const { blobs } = await FEEDBACK.list({ prefix: 'reports/' });
  const reports = [];
  for (const item of blobs.slice(0, MAX_SCAN)) {
    const report = await FEEDBACK.get(item.key, { type: 'json', consistency: 'strong' });
    if (!report || (!adminScope && report.userId !== auth.user.id)) continue;
    const safe = publicReport(report);
    if (query && !`${safe.title} ${safe.message} ${safe.username} ${safe.displayName}`.toLowerCase().includes(query)) continue;
    if (TYPES.has(type) && safe.type !== type) continue;
    if (STATUSES.has(status) && safe.status !== status) continue;
    if (SUBJECTS.has(subjectId) && safe.subjectId !== subjectId) continue;
    reports.push(safe);
    if (reports.length >= MAX_RESULTS) break;
  }
  reports.sort((a, b) => b.createdAt - a.createdAt);
  return json({ reports, scope: adminScope ? 'admin' : 'own' });
}

export default async (req) => {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.ok) return json({ error: 'Inicia sesión para enviar y consultar feedback.' }, 401);

    if (req.method === 'GET') return await listReports(auth, new URL(req.url));
    if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);

    let body = {};
    try { body = await req.json(); } catch {}
    const action = cleanText(body.action, 30) || 'create';

    if (action === 'create') {
      const rate = await enforceRateLimit(req, 'feedback', auth.user.id, { strict: true });
      const type = cleanText(body.type, 20);
      const title = cleanText(body.title, 100);
      const message = cleanText(body.message, 4000);
      if (!TYPES.has(type) || title.length < 4 || message.length < 10) {
        await recordRateLimitFailure(rate);
        return json({ error: 'Completa el tipo, un título claro y un mensaje de al menos 10 caracteres.' }, 400);
      }
      await recordRateLimitFailure(rate);
      const id = randomUUID();
      const now = Date.now();
      const actor = publicUser(auth.user, auth.role);
      const report = {
        id,
        type,
        title,
        message,
        subjectId: SUBJECTS.has(body.subjectId) ? body.subjectId : '',
        unitId: cleanText(body.unitId, 80),
        topicId: cleanText(body.topicId, 80),
        section: cleanText(body.section, 80),
        userId: auth.user.id,
        username: actor.username,
        displayName: actor.displayName,
        status: 'new',
        createdAt: now,
        updatedAt: now,
      };
      await FEEDBACK.setJSON(`reports/${id}`, report);
      return json({ ok: true, report: publicReport(report) }, 201);
    }

    if (action === 'set-status') {
      if (!canAccessAdmin(auth.role)) return json({ error: 'No tienes permiso para cambiar el estado.' }, 403);
      const id = cleanText(body.reportId, 80);
      const status = cleanText(body.status, 20);
      if (!STATUSES.has(status)) return json({ error: 'Estado inválido.' }, 400);
      const report = await FEEDBACK.get(`reports/${id}`, { type: 'json', consistency: 'strong' });
      if (!report) return json({ error: 'Feedback no encontrado.' }, 404);
      const previousStatus = report.status;
      report.status = status;
      report.updatedAt = Date.now();
      await FEEDBACK.setJSON(`reports/${id}`, report);
      const eventId = randomUUID();
      await AUDIT.setJSON(`events/${report.updatedAt}_${eventId}`, {
        actorUserId: auth.user.id,
        actorUsername: cleanText(auth.user.username, 20),
        actorRole: auth.role,
        action: 'feedback-status',
        targetFeedbackId: id,
        previousStatus,
        nextStatus: status,
        timestamp: report.updatedAt,
        outcome: 'completed',
      });
      return json({ ok: true, report: publicReport(report) });
    }

    return json({ error: 'Acción desconocida.' }, 400);
  } catch (error) {
    if (error instanceof RateLimitError || error?.status === 429) {
      return json({ error: error.message }, 429, { 'retry-after': String(error.retryAfterSeconds || 60) });
    }
    console.error('feedback function error', { name: error?.name || 'Error' });
    return json({ error: 'No se pudo procesar el feedback.' }, 500);
  }
};
