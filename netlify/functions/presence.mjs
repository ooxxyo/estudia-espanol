import { getStore } from '@netlify/blobs';

const PRESENCE = getStore('study-hub-presence-v1');
const ACTIVE_MS = 90_000;
const CLEANUP_MS = 10 * 60_000;
const MAX_SCAN = 1000;

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
async function activeCount(now) {
  const { blobs } = await PRESENCE.list({ prefix: 'heartbeat/' });
  let count = 0;
  let cleaned = 0;
  for (const item of blobs.slice(0, MAX_SCAN)) {
    const row = await PRESENCE.get(item.key, { type: 'json', consistency: 'strong' });
    if (!row || !Number.isFinite(row.at)) continue;
    const age = now - row.at;
    if (age <= ACTIVE_MS) count++;
    else if (age > CLEANUP_MS && cleaned < 25) {
      cleaned++;
      try { await PRESENCE.delete(item.key); } catch {}
    }
  }
  return count;
}

export default async (req) => {
  try {
    const now = Date.now();
    if (req.method === 'POST') {
      let body = {};
      try { body = await req.json(); } catch {}
      if (!validId(body.clientId)) return json({ error: 'Identificador inválido.' }, 400);
      await PRESENCE.setJSON(`heartbeat/${body.clientId}`, { at: now });
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
