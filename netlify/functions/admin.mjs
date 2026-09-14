import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';
import {
  USERS,
  authenticateRequest,
  canAccessAdmin,
  canManageUser,
  invalidateUserSessions,
  isSuspended,
  publicUser,
  readUserById,
} from './_shared/auth.mjs';

const PROGRESS = getStore('study-hub-progress-v1');
const LEADERBOARD = getStore('study-hub-leaderboard-v2');
const AUDIT = getStore('study-hub-admin-audit-v1');
const MAX_SCAN = 500;
const MAX_RESULTS = 100;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function adminUser(user) {
  const safe = publicUser(user);
  return {
    id: safe.id,
    username: safe.username,
    email: safe.email,
    role: safe.role,
    status: safe.status,
    createdAt: safe.createdAt,
  };
}

function cleanReason(value) {
  return typeof value === 'string' ? value.trim().slice(0, 200) : '';
}

async function beginAudit(actor, actorRole, action, target, reason = '') {
  const timestamp = Date.now();
  const event = {
    actorUserId: actor.id,
    actorUsername: String(actor.username || '').slice(0, 20),
    actorRole,
    action,
    targetUserId: target.id,
    targetUsername: String(target.username || '').slice(0, 20),
    timestamp,
    outcome: 'pending',
  };
  if (reason) event.reason = cleanReason(reason);
  const key = `events/${timestamp}_${randomUUID()}`;
  await AUDIT.setJSON(key, event);
  return { key, event };
}

async function finishAudit(audit, outcome) {
  await AUDIT.setJSON(audit.key, { ...audit.event, outcome });
}

async function requireAdmin(req) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return { error: json({ error: 'Sesión no válida.' }, 401) };
  if (!canAccessAdmin(auth.role)) return { error: json({ error: 'No tienes permiso para acceder a Admin.' }, 403) };
  return { auth };
}

export default async (req) => {
  try {
    const access = await requireAdmin(req);
    if (access.error) return access.error;
    const { auth } = access;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const query = String(url.searchParams.get('q') || '').trim().toLowerCase().slice(0, 120);
      const { blobs } = await USERS.list({ prefix: 'user/' });
      const users = [];
      for (const item of blobs.slice(0, MAX_SCAN)) {
        const user = await USERS.get(item.key, { type: 'json', consistency: 'strong' });
        if (!user || typeof user !== 'object') continue;
        const matches = !query || String(user.username || '').toLowerCase().includes(query) || String(user.email || '').toLowerCase().includes(query);
        if (matches) users.push(adminUser(user));
        if (users.length >= MAX_RESULTS) break;
      }
      users.sort((a, b) => a.username.localeCompare(b.username, 'es', { sensitivity: 'base' }));
      return json({ actor: publicUser(auth.user, auth.role), users });
    }

    if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
    let body = {};
    try { body = await req.json(); } catch {}
    const action = String(body.action || '');
    const allowedActions = new Set(['suspend', 'reactivate', 'revoke-sessions', 'remove-leaderboard', 'delete']);
    if (!allowedActions.has(action)) return json({ error: 'Acción administrativa desconocida.' }, 400);
    const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId.slice(0, 80) : '';
    const target = await readUserById(targetUserId);
    if (!target) return json({ error: 'Usuario no encontrado.' }, 404);
    if (!canManageUser(auth.user, target, action, auth.role)) return json({ error: 'No tienes permiso para modificar este usuario.' }, 403);
    const reason = cleanReason(body.reason);
    const audit = await beginAudit(auth.user, auth.role, action, target, reason);

    try {
      if (action === 'suspend') {
        if (isSuspended(target)) {
          await finishAudit(audit, 'rejected');
          return json({ error: 'La cuenta ya está suspendida.' }, 409);
        }
        target.status = 'suspended';
        target.suspendedAt = Date.now();
        target.suspendedBy = auth.user.id;
        await invalidateUserSessions(target);
      } else if (action === 'reactivate') {
        target.status = 'active';
        delete target.suspended;
        delete target.suspendedAt;
        delete target.suspendedBy;
        target.updatedAt = Date.now();
        await USERS.setJSON(`user/${target.id}`, target);
      } else if (action === 'revoke-sessions') {
        await invalidateUserSessions(target);
      } else if (action === 'remove-leaderboard') {
        await LEADERBOARD.delete(`players/${target.id}`);
      } else if (action === 'delete') {
        await LEADERBOARD.delete(`players/${target.id}`);
        await PROGRESS.delete(`user/${target.id}`);
        await USERS.delete(`username/${String(target.normalizedUsername || target.username || '').toLowerCase()}`);
        if (target.email) await USERS.delete(`email/${String(target.email).toLowerCase()}`);
        await USERS.delete(`user/${target.id}`);
      }
    } catch (error) {
      try { await finishAudit(audit, 'failed'); } catch {}
      throw error;
    }

    try { await finishAudit(audit, 'completed'); } catch {}
    return json({ ok: true, action, target: action === 'delete' ? null : adminUser(target) });
  } catch (error) {
    console.error('admin function error', { name: error?.name || 'Error' });
    return json({ error: 'Ocurrió un error en Admin.' }, 500);
  }
};
