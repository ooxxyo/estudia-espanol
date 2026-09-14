import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';
import {
  USERS,
  SESSIONS,
  authenticateRequest,
  canAccessAdmin,
  canManageUser,
  invalidateUserSessions,
  isSuspended,
  publicUser,
  readUserById,
  roleForUser,
} from './_shared/auth.mjs';

const PROGRESS = getStore('study-hub-progress-v1');
const LEADERBOARD = getStore('study-hub-leaderboard-v2');
const AUDIT = getStore('study-hub-admin-audit-v1');
const PRESENCE = getStore('study-hub-presence-v1');
const FEEDBACK = getStore('study-hub-feedback-v1');
const FEATURES = getStore('study-hub-feature-flags-v1');
const MAX_SCAN = 1000;
const MAX_RESULTS = 200;
const ACTIVE_MS = 90_000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function cleanText(value, max = 120) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function adminUser(user, presence = null, sessions = 0) {
  const safe = publicUser(user);
  return {
    ...safe,
    online: Boolean(presence),
    lastActivityAt: Math.max(safe.lastActivityAt, Number(presence?.at || 0)),
    section: cleanText(presence?.section, 80),
    subjectId: cleanText(presence?.subjectId, 40),
    topicId: cleanText(presence?.topicId, 80),
    clientKind: cleanText(presence?.clientKind, 20),
    activeSessions: Math.max(0, Number(sessions || 0)),
  };
}

async function listUsersRaw() {
  const { blobs } = await USERS.list({ prefix: 'user/' });
  const users = [];
  for (const item of blobs.slice(0, MAX_SCAN)) {
    const user = await USERS.get(item.key, { type: 'json', consistency: 'strong' });
    if (user && typeof user === 'object') users.push(user);
  }
  return users;
}

async function presenceSnapshot(now = Date.now()) {
  const { blobs } = await PRESENCE.list({ prefix: 'heartbeat/' });
  const byUser = new Map();
  let total = 0;
  for (const item of blobs.slice(0, MAX_SCAN)) {
    const row = await PRESENCE.get(item.key, { type: 'json', consistency: 'strong' });
    if (!row || !Number.isFinite(row.at) || now - row.at > ACTIVE_MS) continue;
    total++;
    if (row.userId && (!byUser.has(row.userId) || byUser.get(row.userId).at < row.at)) byUser.set(row.userId, row);
  }
  return { byUser, total };
}

async function sessionCounts(now = Date.now()) {
  const { blobs } = await SESSIONS.list({ prefix: 'session/' });
  const counts = new Map();
  let total = 0;
  for (const item of blobs.slice(0, MAX_SCAN)) {
    const row = await SESSIONS.get(item.key, { type: 'json', consistency: 'strong' });
    if (!row?.userId || !Number.isFinite(row.expiresAt) || row.expiresAt <= now) continue;
    total++;
    counts.set(row.userId, (counts.get(row.userId) || 0) + 1);
  }
  return { counts, total };
}

async function countFeedback() {
  const { blobs } = await FEEDBACK.list({ prefix: 'reports/' });
  let total = 0;
  let fresh = 0;
  for (const item of blobs.slice(0, MAX_SCAN)) {
    const row = await FEEDBACK.get(item.key, { type: 'json', consistency: 'strong' });
    if (!row) continue;
    total++;
    if (!row.status || row.status === 'new') fresh++;
  }
  return { total, fresh };
}

async function countEnabledFeatures() {
  const { blobs } = await FEATURES.list({ prefix: 'flags/' });
  let enabled = 0;
  for (const item of blobs.slice(0, 100)) {
    const row = await FEATURES.get(item.key, { type: 'json', consistency: 'strong' });
    if (row?.enabled === true) enabled++;
  }
  return enabled;
}

async function beginAudit(actor, actorRole, action, target, reason = '') {
  const timestamp = Date.now();
  const event = {
    actorUserId: actor.id,
    actorUsername: cleanText(actor.username, 20),
    actorRole,
    action,
    targetUserId: target.id,
    targetUsername: cleanText(target.username, 20),
    timestamp,
    outcome: 'pending',
  };
  if (reason) event.reason = cleanText(reason, 200);
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

function matchesFilter(user, filter) {
  if (filter === 'online') return user.online;
  if (filter === 'veteran') return user.veteran;
  if (filter === 'admin') return ['admin', 'owner', 'superdev'].includes(user.role);
  if (filter === 'member') return user.role === 'member';
  if (filter === 'suspended') return user.status === 'suspended';
  return true;
}

async function removeUserRows(store, prefix, userId) {
  const { blobs } = await store.list({ prefix });
  for (const item of blobs.slice(0, MAX_SCAN)) {
    const row = await store.get(item.key, { type: 'json', consistency: 'strong' });
    if (row?.userId === userId) await store.delete(item.key);
  }
}

export default async (req) => {
  try {
    const access = await requireAdmin(req);
    if (access.error) return access.error;
    const { auth } = access;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const section = cleanText(url.searchParams.get('section'), 30) || 'users';
      const actor = publicUser(auth.user, auth.role);

      if (section === 'summary') {
        const [users, presence, sessions, feedback, enabledFeatures] = await Promise.all([
          listUsersRaw(), presenceSnapshot(), sessionCounts(), countFeedback(), countEnabledFeatures(),
        ]);
        const safeUsers = users.map(user => publicUser(user));
        return json({
          actor,
          summary: {
            users: safeUsers.length,
            online: presence.total,
            veterans: safeUsers.filter(user => user.veteran).length,
            admins: safeUsers.filter(user => ['admin', 'owner', 'superdev'].includes(user.role)).length,
            suspended: safeUsers.filter(user => user.status === 'suspended').length,
            newFeedback: feedback.fresh,
            feedback: feedback.total,
            enabledFeatures,
            activeSessions: sessions.total,
          },
        });
      }

      if (section === 'connected') {
        const presence = await presenceSnapshot();
        const users = await listUsersRaw();
        const query = cleanText(url.searchParams.get('q'), 120).toLowerCase();
        const filter = cleanText(url.searchParams.get('filter'), 20) || 'all';
        const connected = users
          .filter(user => presence.byUser.has(user.id))
          .map(user => adminUser(user, presence.byUser.get(user.id)))
          .filter(user => !query || `${user.username} ${user.displayName} ${user.email}`.toLowerCase().includes(query))
          .filter(user => matchesFilter(user, filter))
          .sort((a, b) => b.lastActivityAt - a.lastActivityAt);
        return json({ actor, count: presence.total, users: connected.slice(0, MAX_RESULTS), filter });
      }

      if (section === 'audit') {
        const { blobs } = await AUDIT.list({ prefix: 'events/' });
        const events = [];
        for (const item of blobs.slice(-MAX_RESULTS).reverse()) {
          const event = await AUDIT.get(item.key, { type: 'json', consistency: 'strong' });
          if (event) events.push(event);
        }
        return json({ actor, events });
      }

      const query = cleanText(url.searchParams.get('q'), 120).toLowerCase();
      const filter = cleanText(url.searchParams.get('filter'), 20) || 'all';
      const [rawUsers, presence, sessions] = await Promise.all([listUsersRaw(), presenceSnapshot(), sessionCounts()]);
      const users = rawUsers.map(user => adminUser(user, presence.byUser.get(user.id), sessions.counts.get(user.id)))
        .filter(user => !query || `${user.username} ${user.displayName} ${user.email}`.toLowerCase().includes(query))
        .filter(user => matchesFilter(user, filter))
        .sort((a, b) => a.displayName.localeCompare(b.displayName, 'es', { sensitivity: 'base' }))
        .slice(0, MAX_RESULTS);
      return json({ actor, users, filter });
    }

    if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
    let body = {};
    try { body = await req.json(); } catch {}
    const action = cleanText(body.action, 40);
    const allowedActions = new Set([
      'update-profile', 'set-veteran', 'remove-veteran', 'grant-admin', 'revoke-admin',
      'suspend', 'reactivate', 'revoke-sessions', 'remove-leaderboard', 'delete',
    ]);
    if (!allowedActions.has(action)) return json({ error: 'Acción administrativa desconocida.' }, 400);
    const targetUserId = cleanText(body.targetUserId, 80);
    const target = await readUserById(targetUserId);
    if (!target) return json({ error: 'Usuario no encontrado.' }, 404);
    if (!canManageUser(auth.user, target, action, auth.role)) return json({ error: 'No tienes permiso para modificar este usuario.' }, 403);

    if (action === 'grant-admin' && roleForUser(target) !== 'member') return json({ error: 'Solo una cuenta Member puede convertirse en Admin.' }, 409);
    if (action === 'revoke-admin') {
      if (roleForUser(target) !== 'admin') return json({ error: 'La cuenta no tiene rol Admin.' }, 409);
      const projected = { ...target, securityRole: 'member' };
      if (roleForUser(projected) === 'admin') return json({ error: 'Este Admin proviene de la configuración de Netlify y no puede quitarse desde el panel.' }, 409);
    }

    const audit = await beginAudit(auth.user, auth.role, action, target, body.reason);
    try {
      if (action === 'update-profile') {
        const displayName = cleanText(body.displayName, 60);
        if (displayName.length < 2) {
          await finishAudit(audit, 'rejected');
          return json({ error: 'El nombre visible debe tener al menos 2 caracteres.' }, 400);
        }
        target.displayName = displayName;
        if (auth.role === 'superdev' && cleanText(body.visibleRank, 40)) target.visibleRank = cleanText(body.visibleRank, 40);
        target.updatedAt = Date.now();
        await USERS.setJSON(`user/${target.id}`, target);
      } else if (action === 'set-veteran') {
        target.veteran = true;
        target.entitlement = 'veteran';
        if (!target.visibleRank || target.visibleRank === 'Estudiante') target.visibleRank = 'Veterano';
        target.updatedAt = Date.now();
        await USERS.setJSON(`user/${target.id}`, target);
      } else if (action === 'remove-veteran') {
        target.veteran = false;
        target.entitlement = 'standard';
        if (target.visibleRank === 'Veterano') target.visibleRank = 'Estudiante';
        target.updatedAt = Date.now();
        await USERS.setJSON(`user/${target.id}`, target);
      } else if (action === 'grant-admin') {
        target.securityRole = 'admin';
        target.updatedAt = Date.now();
        await USERS.setJSON(`user/${target.id}`, target);
      } else if (action === 'revoke-admin') {
        target.securityRole = 'member';
        target.updatedAt = Date.now();
        await invalidateUserSessions(target);
      } else if (action === 'suspend') {
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
        await removeUserRows(FEEDBACK, 'reports/', target.id);
        await removeUserRows(PRESENCE, 'heartbeat/', target.id);
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
