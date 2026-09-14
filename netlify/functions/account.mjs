import { getStore } from '@netlify/blobs';
import { randomBytes, randomUUID, createHash, scryptSync, timingSafeEqual } from 'node:crypto';

const USERS = getStore('study-hub-users-v1');
const SESSIONS = getStore('study-hub-sessions-v1');
const PROGRESS = getStore('study-hub-progress-v1');
const COOKIE = 'studyhub_session';
const REMEMBER_DAYS = 30;
const SHORT_SESSION_HOURS = 12;
const MAX_STATE_BYTES = 900_000;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });
}

function normalizeUsername(v) { return String(v ?? '').trim().toLowerCase(); }
function cleanUsername(v) { return String(v ?? '').trim().slice(0, 20); }
function validUsername(v) { return /^[A-Za-z0-9_.-]{3,20}$/.test(v); }
function cleanEmail(v) { return String(v ?? '').trim().toLowerCase().slice(0, 120); }
function validEmail(v) { return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function validPassword(v) { return typeof v === 'string' && v.length >= 8 && v.length <= 128; }
function hashSecret(secret, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(String(secret), salt, 64).toString('hex');
  return { salt, hash };
}
function checkSecret(secret, stored) {
  try {
    if (!stored?.salt || !stored?.hash) return false;
    const candidate = Buffer.from(scryptSync(String(secret), stored.salt, 64).toString('hex'), 'hex');
    const actual = Buffer.from(stored.hash, 'hex');
    return candidate.length === actual.length && timingSafeEqual(candidate, actual);
  } catch { return false; }
}
function parseCookies(req) {
  const raw = req.headers.get('cookie') || '';
  return Object.fromEntries(raw.split(';').map(x => x.trim()).filter(Boolean).map(pair => {
    const i = pair.indexOf('=');
    return [decodeURIComponent(i < 0 ? pair : pair.slice(0, i)), decodeURIComponent(i < 0 ? '' : pair.slice(i + 1))];
  }));
}
function tokenHash(token) { return createHash('sha256').update(token).digest('hex'); }
function setCookie(token, remember = true) {
  const seconds = remember ? REMEMBER_DAYS * 24 * 60 * 60 : SHORT_SESSION_HOURS * 60 * 60;
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${seconds}; HttpOnly; Secure; SameSite=Lax`;
}
function clearCookie() { return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`; }
async function readUserById(id) { return id ? await USERS.get(`user/${id}`, { type: 'json', consistency: 'strong' }) : null; }
async function resolveUser(identifier) {
  const raw = String(identifier ?? '').trim();
  if (!raw) return null;
  let idx = null;
  if (raw.includes('@')) idx = await USERS.get(`email/${cleanEmail(raw)}`, { type: 'json', consistency: 'strong' });
  if (!idx?.userId) idx = await USERS.get(`username/${normalizeUsername(raw)}`, { type: 'json', consistency: 'strong' });
  return idx?.userId ? await readUserById(idx.userId) : null;
}
async function authenticate(req) {
  const token = parseCookies(req)[COOKIE];
  if (!token || token.length < 20) return null;
  const session = await SESSIONS.get(`session/${tokenHash(token)}`, { type: 'json', consistency: 'strong' });
  if (!session || session.expiresAt < Date.now()) return null;
  const user = await readUserById(session.userId);
  if (!user || (session.sessionVersion ?? 1) !== (user.sessionVersion ?? 1)) return null;
  return { token, session, user };
}
async function createSession(user, remember = true) {
  const token = randomBytes(32).toString('base64url');
  const ttlMs = remember ? REMEMBER_DAYS * 24 * 60 * 60 * 1000 : SHORT_SESSION_HOURS * 60 * 60 * 1000;
  const session = { userId: user.id, sessionVersion: user.sessionVersion ?? 1, createdAt: Date.now(), expiresAt: Date.now() + ttlMs };
  await SESSIONS.setJSON(`session/${tokenHash(token)}`, session);
  return token;
}
function publicUser(user) { return { id: user.id, username: user.username, email: user.email || '', createdAt: user.createdAt }; }
function makeRecoveryCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = randomBytes(16);
  for (let i = 0; i < 16; i++) out += alphabet[bytes[i] % alphabet.length];
  return out.match(/.{1,4}/g).join('-');
}
async function parseBody(req) { try { return await req.json(); } catch { return {}; } }

export default async (req) => {
  try {
    if (req.method === 'GET') {
      const auth = await authenticate(req);
      if (!auth) return json({ authenticated: false });
      const cloudState = await PROGRESS.get(`user/${auth.user.id}`, { type: 'json', consistency: 'strong' });
      return json({ authenticated: true, user: publicUser(auth.user), cloudState: cloudState?.state || null, cloudUpdatedAt: cloudState?.updatedAt || 0 });
    }

    if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
    const body = await parseBody(req);
    const action = String(body.action || '');

    if (action === 'register') {
      const username = cleanUsername(body.username);
      const normalized = normalizeUsername(username);
      const email = cleanEmail(body.email);
      const password = body.password;
      const requireEmail = body.requireEmail === true;
      const remember = body.remember !== false;
      if (!validUsername(username)) return json({ error: 'El username debe tener 3–20 caracteres y solo letras, números, punto, guion o _.' }, 400);
      if (requireEmail && !email) return json({ error: 'Este tipo de cuenta requiere un email.' }, 400);
      if (!validEmail(email)) return json({ error: 'El email no parece válido.' }, 400);
      if (!validPassword(password)) return json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, 400);
      const existingUser = await USERS.get(`username/${normalized}`, { type: 'json', consistency: 'strong' });
      if (existingUser) return json({ error: 'Ese username ya existe.' }, 409);
      if (email) {
        const existingEmail = await USERS.get(`email/${email}`, { type: 'json', consistency: 'strong' });
        if (existingEmail) return json({ error: 'Ese email ya está asociado a otra cuenta.' }, 409);
      }

      const recoveryCode = makeRecoveryCode();
      const user = {
        id: randomUUID(), username, normalizedUsername: normalized, email,
        password: hashSecret(password), recovery: hashSecret(recoveryCode.replace(/-/g, '').toUpperCase()),
        sessionVersion: 1, createdAt: Date.now(), updatedAt: Date.now(),
      };
      await USERS.setJSON(`user/${user.id}`, user);
      await USERS.setJSON(`username/${normalized}`, { userId: user.id });
      if (email) await USERS.setJSON(`email/${email}`, { userId: user.id });
      const token = await createSession(user, remember);
      return json({ ok: true, user: publicUser(user), recoveryCode }, 201, { 'set-cookie': setCookie(token, remember) });
    }

    if (action === 'login') {
      const identifier = body.identifier ?? body.username;
      const user = await resolveUser(identifier);
      if (!user || !checkSecret(body.password, user.password)) return json({ error: 'Usuario/email o contraseña incorrectos.' }, 401);
      const remember = body.remember !== false;
      const token = await createSession(user, remember);
      const cloudState = await PROGRESS.get(`user/${user.id}`, { type: 'json', consistency: 'strong' });
      return json({ ok: true, user: publicUser(user), cloudState: cloudState?.state || null, cloudUpdatedAt: cloudState?.updatedAt || 0 }, 200, { 'set-cookie': setCookie(token, remember) });
    }

    if (action === 'logout') {
      const auth = await authenticate(req);
      if (auth?.token) await SESSIONS.delete(`session/${tokenHash(auth.token)}`);
      return json({ ok: true }, 200, { 'set-cookie': clearCookie() });
    }

    if (action === 'sync') {
      const auth = await authenticate(req);
      if (!auth) return json({ error: 'Inicia sesión para sincronizar.' }, 401);
      const state = body.state;
      if (!state || typeof state !== 'object' || Array.isArray(state)) return json({ error: 'Estado inválido.' }, 400);
      const serialized = JSON.stringify(state);
      if (Buffer.byteLength(serialized, 'utf8') > MAX_STATE_BYTES) return json({ error: 'El progreso es demasiado grande para sincronizar.' }, 413);
      const updatedAt = Date.now();
      await PROGRESS.setJSON(`user/${auth.user.id}`, { updatedAt, state });
      return json({ ok: true, updatedAt });
    }

    if (action === 'reset-password') {
      const identifier = body.identifier ?? body.username;
      const code = String(body.recoveryCode || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const newPassword = body.newPassword;
      if (!validPassword(newPassword)) return json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' }, 400);
      const user = await resolveUser(identifier);
      if (!user || !checkSecret(code, user.recovery)) return json({ error: 'Cuenta o código de recuperación incorrectos.' }, 401);
      user.password = hashSecret(newPassword);
      user.sessionVersion = (user.sessionVersion ?? 1) + 1;
      user.updatedAt = Date.now();
      await USERS.setJSON(`user/${user.id}`, user);
      const remember = body.remember !== false;
      const token = await createSession(user, remember);
      return json({ ok: true, user: publicUser(user) }, 200, { 'set-cookie': setCookie(token, remember) });
    }

    return json({ error: 'Acción desconocida.' }, 400);
  } catch (error) {
    console.error('account function error', error);
    return json({ error: 'Ocurrió un error en el servidor.' }, 500);
  }
};
