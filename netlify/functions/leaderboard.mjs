import { getStore } from '@netlify/blobs';
import { authenticateRequest } from './_shared/auth.mjs';

const LEADERBOARD = getStore('study-hub-leaderboard-v2');
const MAX_PLAYERS = 100;
const ALLOWED_TOPICS = new Set(['gramatica', 'morfologia', 'narrativa', 'cronica', 'figuras']);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function cleanTopics(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).filter(topic => ALLOWED_TOPICS.has(topic)))].slice(0, 5);
}

function finiteInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) ? number : fallback;
}

function publicPlayer(player, currentUserId) {
  const bestTotal = Math.max(0, finiteInteger(player.bestTotal));
  const bestScore = Math.max(0, Math.min(bestTotal, finiteInteger(player.bestScore)));
  const calculated = bestTotal ? Math.round((bestScore / bestTotal) * 100) : 0;
  const bestPct = Math.max(0, Math.min(100, finiteInteger(player.bestPct, calculated)));
  return {
    name: String(player.name || 'Estudiante').slice(0, 20),
    bestPct,
    bestScore,
    bestTotal,
    bestTopics: cleanTopics(player.bestTopics),
    bestFullExam: player.bestFullExam === true,
    exams: Math.max(0, finiteInteger(player.exams)),
    updatedAt: Number.isFinite(player.updatedAt) ? player.updatedAt : 0,
    isMe: Boolean(currentUserId && player.userId === currentUserId),
  };
}

export default async (req) => {
  try {
    const auth = await authenticateRequest(req);
    const currentUser = auth.ok ? auth.user : null;

    if (req.method === 'GET') {
      const { blobs } = await LEADERBOARD.list({ prefix: 'players/' });
      const players = [];
      for (const item of blobs.slice(0, 500)) {
        const stored = await LEADERBOARD.get(item.key, { type: 'json', consistency: 'strong' });
        if (stored && typeof stored === 'object') players.push(publicPlayer(stored, currentUser?.id));
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
    if (!currentUser) return json({ error: auth.reason === 'suspended' ? 'Cuenta suspendida.' : 'Inicia sesión para publicar una nota.' }, 401);

    let body = {};
    try { body = await req.json(); } catch {}
    const score = Number(body.score);
    const total = Number(body.total);
    let pct = Number(body.pct);
    if (!Number.isInteger(score) || !Number.isInteger(total) || total < 1 || total > 500 || score < 0 || score > total) {
      return json({ error: 'Nota inválida.' }, 400);
    }
    const calculated = Math.round((score / total) * 100);
    if (!Number.isFinite(pct) || Math.abs(pct - calculated) > 1) pct = calculated;
    pct = Math.max(0, Math.min(100, Math.round(pct)));
    const topics = cleanTopics(body.topics);
    const fullExam = body.fullExam === true;

    const key = `players/${currentUser.id}`;
    const old = await LEADERBOARD.get(key, { type: 'json', consistency: 'strong' });
    const oldPct = finiteInteger(old?.bestPct, -1);
    const oldTotal = finiteInteger(old?.bestTotal);
    const isBetter = !old || pct > oldPct || (pct === oldPct && total > oldTotal);
    const next = {
      userId: currentUser.id,
      name: currentUser.username,
      bestPct: isBetter ? pct : oldPct,
      bestScore: isBetter ? score : finiteInteger(old.bestScore),
      bestTotal: isBetter ? total : oldTotal,
      bestTopics: isBetter ? topics : cleanTopics(old.bestTopics),
      bestFullExam: isBetter ? fullExam : old.bestFullExam === true,
      exams: Math.max(0, finiteInteger(old?.exams)) + 1,
      updatedAt: Date.now(),
    };
    await LEADERBOARD.setJSON(key, next);
    return json({ ok: true, player: publicPlayer(next, currentUser.id) });
  } catch (error) {
    console.error('leaderboard function error', { name: error?.name || 'Error' });
    return json({ error: 'Ocurrió un error en el leaderboard.' }, 500);
  }
};
