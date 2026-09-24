import { getStore } from '@netlify/blobs';
import { authenticateRequest, publicUser } from './_shared/auth.mjs';

const PRESENCE = getStore('study-hub-presence-v1');
const ACTIVE_MS = 90_000;
const CLEANUP_MS = 10 * 60_000;
const MAX_SCAN = 1000;
const MAX_CLEANUP = 100;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    },
  });
}
function validId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,120}$/.test(value);
}
function cleanContext(value, max = 80) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function clientKind(req) {
  const agent = String(req.headers.get('user-agent') || '').toLowerCase();
  if (/iphone|android|mobile/.test(agent)) return 'mobile';
  if (/ipad|tablet/.test(agent)) return 'tablet';
  return agent ? 'desktop' : 'unknown';
}
async function activeCount(now) {
  const { blobs } = await PRESENCE.list({ prefix: 'heartbeat/' });
  const activeIdentities = new Set();
  let cleaned = 0;
  for (const item of blobs.slice(0, MAX_SCAN)) {
    const row = await PRESENCE.get(item.key, { type: 'json', consistency: 'strong' });
    if (!row || !Number.isFinite(row.at)) {
      if (cleaned < MAX_CLEANUP) {
        cleaned++;
        try { await PRESENCE.delete(item.key); } catch {}
      }
      continue;
    }
    const age = now - row.at;
    if (age <= ACTIVE_MS) {
      // Una cuenta autenticada cuenta una sola vez aunque tenga varias pestañas,
      // sesiones o heartbeats. Los guests se mantienen separados por clientId.
      const clientId = item.key.slice('heartbeat/'.length);
      const identity = row.userId ? `user:${row.userId}` : `guest:${clientId}`;
      activeIdentities.add(identity);
    } else if (age > CLEANUP_MS && cleaned < MAX_CLEANUP) {
      cleaned++;
      try { await PRESENCE.delete(item.key); } catch {}
    }
  }
  return activeIdentities.size;
}

export default async (req) => {
  try {
    const now = Date.now();
    if (req.method === 'POST') {
      let body = {};
      try { body = await req.json(); } catch {}
      if (!validId(body.clientId)) return json({ error: 'Identificador inválido.' }, 400);
      const auth = await authenticateRequest(req);
      const row = {
        at: now,
        section: cleanContext(body.section),
        subjectId: cleanContext(body.subjectId, 40),
        unitId: cleanContext(body.unitId),
        topicId: cleanContext(body.topicId),
        clientKind: clientKind(req),
      };
      if (auth.ok) {
        const user = publicUser(auth.user, auth.role);
        row.userId = user.id;
        row.username = user.username;
        row.displayName = user.displayName;
        row.role = user.role;
        row.visibleRank = user.visibleRank;
        row.veteran = user.veteran;
      }
      await PRESENCE.setJSON(`heartbeat/${body.clientId}`, row);
      return json({ count: await activeCount(now), windowSeconds: Math.round(ACTIVE_MS / 1000) });
    }
    if (req.method === 'GET') {
      return json({ count: await activeCount(now), windowSeconds: Math.round(ACTIVE_MS / 1000) });
    }
    return json({ error: 'Método no permitido.' }, 405);
  } catch (error) {
    console.error('presence error', error);
    return json({ error: 'No se pudo consultar la presencia.' }, 500);
  }
};
