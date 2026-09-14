import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';

const LEADERBOARD = getStore('study-hub-leaderboard-v2');
const USERS = getStore('study-hub-users-v1');
const SESSIONS = getStore('study-hub-sessions-v1');
const COOKIE = 'studyhub_session';
const MAX_PLAYERS = 100;
const ALLOWED_TOPICS = new Set(['gramatica','morfologia','narrativa','cronica','figuras']);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
function parseCookies(req) {
  const raw = req.headers.get('cookie') || '';
  return Object.fromEntries(raw.split(';').map(x => x.trim()).filter(Boolean).map(pair => {
    const i = pair.indexOf('=');
    return [decodeURIComponent(i < 0 ? pair : pair.slice(0, i)), decodeURIComponent(i < 0 ? '' : pair.slice(i + 1))];
  }));
}
function tokenHash(token) { return createHash('sha256').update(token).digest('hex'); }
async function authenticate(req) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return null;
  const session = await SESSIONS.get(`session/${tokenHash(token)}`, { type: 'json', consistency: 'strong' });
  if (!session || session.expiresAt < Date.now()) return null;
  const user = await USERS.get(`user/${session.userId}`, { type: 'json', consistency: 'strong' });
  if (!user || (session.sessionVersion ?? 1) !== (user.sessionVersion ?? 1)) return null;
  return user;
}
function cleanTopics(v) {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map(String).filter(x => ALLOWED_TOPICS.has(x)))].slice(0, 5);
}

export default async (req) => {
  try {
    const currentUser = await authenticate(req);

    if (req.method === 'GET') {
      const { blobs } = await LEADERBOARD.list({ prefix: 'players/' });
      const players = [];
      for (const item of blobs.slice(0, 500)) {
        const p = await LEADERBOARD.get(item.key, { type: 'json', consistency: 'strong' });
        if (p && typeof p === 'object') players.push({ ...p, isMe: !!currentUser && p.userId === currentUser.id });
      }
      players.sort((a, b) =>
        (b.bestPct - a.bestPct) ||
        (b.bestTotal - a.bestTotal) ||
        (b.bestScore - a.bestScore) ||
        (a.updatedAt - b.updatedAt)
      );
      return json({ players: players.slice(0, MAX_PLAYERS) });
    }

    if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
    if (!currentUser) return json({ error: 'Inicia sesión para publicar una nota.' }, 401);

    let body = {};
    try { body = await req.json(); } catch {}
    const score = Number(body.score);
    const total = Number(body.total);
    let pct = Number(body.pct);
    if (!Number.isInteger(score) || !Number.isInteger(total) || total < 1 || total > 500 || score < 0 || score > total) return json({ error: 'Nota inválida.' }, 400);
    const calculated = Math.round((score / total) * 100);
    if (!Number.isFinite(pct) || Math.abs(pct - calculated) > 1) pct = calculated;
    pct = Math.max(0, Math.min(100, Math.round(pct)));
    const topics = cleanTopics(body.topics);
    const fullExam = body.fullExam === true;

    const key = `players/${currentUser.id}`;
    const old = await LEADERBOARD.get(key, { type: 'json', consistency: 'strong' });
    const isBetter = !old || pct > old.bestPct || (pct === old.bestPct && total > old.bestTotal);
    const next = {
      userId: currentUser.id,
      name: currentUser.username,
      bestPct: isBetter ? pct : old.bestPct,
      bestScore: isBetter ? score : old.bestScore,
      bestTotal: isBetter ? total : old.bestTotal,
      bestTopics: isBetter ? topics : (old.bestTopics || []),
      bestFullExam: isBetter ? fullExam : !!old.bestFullExam,
      exams: (old?.exams || 0) + 1,
      updatedAt: Date.now(),
    };
    await LEADERBOARD.setJSON(key, next);
    return json({ ok: true, player: { ...next, isMe: true } });
  } catch (error) {
    console.error('leaderboard function error', error);
    return json({ error: 'Ocurrió un error en el leaderboard.' }, 500);
  }
};
