import { getStore } from '@netlify/blobs';

const STORE_NAME = 'study-hub-leaderboard';
const MAX_PLAYERS = 100;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function cleanName(value) {
  return String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);
}

function validDeviceId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(value);
}

export default async (req) => {
  const store = getStore(STORE_NAME);

  if (req.method === 'GET') {
    const { blobs } = await store.list({ prefix: 'players/' });
    const players = [];

    for (const item of blobs.slice(0, 500)) {
      const player = await store.get(item.key, { type: 'json', consistency: 'strong' });
      if (player && typeof player === 'object') players.push(player);
    }

    players.sort((a, b) =>
      (Number(b.bestPct) || 0) - (Number(a.bestPct) || 0) ||
      (Number(b.bestScore) || 0) - (Number(a.bestScore) || 0) ||
      (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0)
    );

    return json({ players: players.slice(0, MAX_PLAYERS) });
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'JSON inválido.' }, 400);
    }

    const deviceId = String(body.deviceId ?? '');
    const name = cleanName(body.name);
    const score = Number(body.score);
    const total = Number(body.total);
    const pct = Number(body.pct);

    if (!validDeviceId(deviceId)) return json({ error: 'Identificador inválido.' }, 400);
    if (name.length < 2) return json({ error: 'El nombre debe tener al menos 2 caracteres.' }, 400);
    if (!Number.isInteger(score) || !Number.isInteger(total) || total < 1 || total > 250 || score < 0 || score > total) {
      return json({ error: 'Nota inválida.' }, 400);
    }

    const calculatedPct = Math.round((score / total) * 100);
    if (!Number.isInteger(pct) || pct !== calculatedPct || pct < 0 || pct > 100) {
      return json({ error: 'Porcentaje inválido.' }, 400);
    }

    const key = `players/${deviceId}`;
    const current = await store.get(key, { type: 'json', consistency: 'strong' });
    const now = Date.now();
    const previousBest = Number(current?.bestPct ?? -1);
    const isNewBest = pct > previousBest || (pct === previousBest && score > Number(current?.bestScore ?? -1));

    const next = {
      deviceId,
      name,
      bestPct: isNewBest ? pct : Number(current?.bestPct ?? pct),
      bestScore: isNewBest ? score : Number(current?.bestScore ?? score),
      bestTotal: isNewBest ? total : Number(current?.bestTotal ?? total),
      exams: Math.max(0, Number(current?.exams ?? 0)) + 1,
      updatedAt: now,
    };

    await store.setJSON(key, next);
    return json({ ok: true, player: next });
  }

  return json({ error: 'Método no permitido.' }, 405);
};

export const config = {
  path: '/.netlify/functions/leaderboard',
};
