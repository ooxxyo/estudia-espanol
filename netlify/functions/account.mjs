import { getStore } from '@netlify/blobs';
import { randomBytes, randomUUID, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import {
  USERS,
  SESSIONS,
  authenticateRequest,
  clearSessionCookie,
  createSession,
  isSuspended,
  normalizeUsername,
  publicUser,
  resolveUser,
  setSessionCookie,
  tokenHash,
} from './_shared/auth.mjs';
import {
  RateLimitError,
  clearRateLimit,
  enforceRateLimit,
  recordRateLimitFailure,
} from './_shared/rate-limit.mjs';

const PROGRESS = getStore('study-hub-progress-v1');
const MAX_STATE_BYTES = 900_000;
const MAX_BODY_BYTES = 1_000_000;

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

function cleanUsername(value) { return String(value ?? '').trim().slice(0, 20); }
function validUsername(value) { return /^[A-Za-z0-9_.-]{3,20}$/.test(value); }
function cleanEmail(value) { return String(value ?? '').trim().toLowerCase().slice(0, 120); }
function validEmail(value) { return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function validPassword(value) { return typeof value === 'string' && value.length >= 8 && value.length <= 128; }

function hashSecret(secret, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(String(secret), salt, 64).toString('hex');
  return { salt, hash };
}

function checkSecret(secret, stored, maxLength = 128) {
  try {
    if (typeof secret !== 'string' || secret.length < 1 || secret.length > maxLength || !stored?.salt || !stored?.hash) return false;
    const candidate = scryptSync(secret, stored.salt, 64);
    const actual = Buffer.from(stored.hash, 'hex');
    return candidate.length === actual.length && timingSafeEqual(candidate, actual);
  } catch { return false; }
}

function safeCodeMatch(candidate, configured) {
  if (typeof candidate !== 'string' || candidate.length < 1 || candidate.length > 256 || !configured) return false;
  const left = createHash('sha256').update(candidate).digest();
  const right = createHash('sha256').update(configured).digest();
  return timingSafeEqual(left, right);
}

function makeRecoveryCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let output = '';
  const bytes = randomBytes(16);
  for (let index = 0; index < 16; index++) output += alphabet[bytes[index] % alphabet.length];
  return output.match(/.{1,4}/g).join('-');
}

async function parseBody(req) {
  const declared = Number(req.headers.get('content-length') || 0);
  if (declared > MAX_BODY_BYTES) {
    const error = new Error('Solicitud demasiado grande.');
    error.status = 413;
    throw error;
  }
  try { return await req.json(); } catch { return {}; }
}

async function failAttempt(context, message = 'Credenciales incorrectas.') {
  await recordRateLimitFailure(context);
  return json({ error: message }, 401);
}

export default async (req) => {
  try {
    if (req.method === 'GET') {
      const auth = await authenticateRequest(req);
      if (!auth.ok) return json({ authenticated: false, reason: auth.reason === 'suspended' ? 'suspended' : undefined });
      const cloudState = await PROGRESS.get(`user/${auth.user.id}`, { type: 'json', consistency: 'strong' });
      return json({
        authenticated: true,
        user: publicUser(auth.user, auth.role),
        cloudState: cloudState?.state || null,
        cloudUpdatedAt: cloudState?.updatedAt || 0,
      });
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
      const rate = await enforceRateLimit(req, 'register', normalized || email);
      if (!validUsername(username) || normalized === 'superdev') return await failAttempt(rate, 'No se pudo crear la cuenta con esos datos.');
      if ((requireEmail && !email) || !validEmail(email) || !validPassword(password)) return await failAttempt(rate, 'No se pudo crear la cuenta con esos datos.');
      const existingUser = await USERS.get(`username/${normalized}`, { type: 'json', consistency: 'strong' });
      if (existingUser) return await failAttempt(rate, 'No se pudo crear la cuenta con esos datos.');
      if (email) {
        const existingEmail = await USERS.get(`email/${email}`, { type: 'json', consistency: 'strong' });
        if (existingEmail) return await failAttempt(rate, 'No se pudo crear la cuenta con esos datos.');
      }

      const recoveryCode = makeRecoveryCode();
      const user = {
        id: randomUUID(),
        username,
        normalizedUsername: normalized,
        email,
        password: hashSecret(password),
        recovery: hashSecret(recoveryCode.replace(/-/g, '').toUpperCase()),
        status: 'active',
        sessionVersion: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await USERS.setJSON(`user/${user.id}`, user);
      await USERS.setJSON(`username/${normalized}`, { userId: user.id });
      if (email) await USERS.setJSON(`email/${email}`, { userId: user.id });
      const token = await createSession(user, remember);
      await clearRateLimit(rate);
      return json({ ok: true, user: publicUser(user), recoveryCode }, 201, { 'set-cookie': setSessionCookie(token, remember) });
    }

    if (action === 'login') {
      const identifier = String(body.identifier ?? body.username ?? '').trim().slice(0, 120);
      const rate = await enforceRateLimit(req, 'login', identifier);
      if (!validPassword(body.password)) return await failAttempt(rate, 'Usuario/email o contraseña incorrectos.');
      const user = await resolveUser(identifier);
      if (!user || !checkSecret(body.password, user.password)) return await failAttempt(rate, 'Usuario/email o contraseña incorrectos.');
      if (isSuspended(user)) return await failAttempt(rate, 'Esta cuenta está suspendida.');
      if (normalizeUsername(user.username) === 'superdev') return await failAttempt(rate, 'Usa Dev Login para acceder a esta cuenta.');
      const remember = body.remember !== false;
      const token = await createSession(user, remember);
      const cloudState = await PROGRESS.get(`user/${user.id}`, { type: 'json', consistency: 'strong' });
      await clearRateLimit(rate);
      return json({
        ok: true,
        user: publicUser(user),
        cloudState: cloudState?.state || null,
        cloudUpdatedAt: cloudState?.updatedAt || 0,
      }, 200, { 'set-cookie': setSessionCookie(token, remember) });
    }

    if (action === 'dev-login') {
      const rate = await enforceRateLimit(req, 'devLogin', 'superdev', { strict: true });
      const configuredCode = process.env.DEV_LOGIN_CODE || '';
      if (!safeCodeMatch(body.code, configuredCode)) return await failAttempt(rate, 'Código de desarrollador incorrecto.');
      const user = await resolveUser('superdev');
      if (!user) return await failAttempt(rate, 'La cuenta Super Dev todavía no está configurada.');
      if (isSuspended(user)) return await failAttempt(rate, 'La cuenta Super Dev no está disponible.');
      const remember = body.remember !== false;
      const token = await createSession(user, remember, { superdevAuthenticated: true });
      const cloudState = await PROGRESS.get(`user/${user.id}`, { type: 'json', consistency: 'strong' });
      await clearRateLimit(rate);
      return json({
        ok: true,
        user: publicUser(user),
        cloudState: cloudState?.state || null,
        cloudUpdatedAt: cloudState?.updatedAt || 0,
      }, 200, { 'set-cookie': setSessionCookie(token, remember) });
    }

    if (action === 'logout') {
      const auth = await authenticateRequest(req, { allowSuspended: true });
      if (auth.ok) await SESSIONS.delete(`session/${tokenHash(auth.token)}`);
      return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie() });
    }

    if (action === 'sync') {
      const auth = await authenticateRequest(req);
      if (!auth.ok) return json({ error: auth.reason === 'suspended' ? 'Cuenta suspendida.' : 'Inicia sesión para sincronizar.' }, 401);
      const state = body.state;
      if (!state || typeof state !== 'object' || Array.isArray(state)) return json({ error: 'Estado inválido.' }, 400);
      const serialized = JSON.stringify(state);
      if (Buffer.byteLength(serialized, 'utf8') > MAX_STATE_BYTES) return json({ error: 'El progreso es demasiado grande para sincronizar.' }, 413);
      const existing = await PROGRESS.get(`user/${auth.user.id}`, { type: 'json', consistency: 'strong' });
      const baseUpdatedAt = Number(body.baseUpdatedAt || 0);
      if (existing?.updatedAt && (!baseUpdatedAt || existing.updatedAt > baseUpdatedAt)) {
        return json({ error: 'El progreso cambió en otro dispositivo.', conflict: true, cloudState: existing.state, cloudUpdatedAt: existing.updatedAt }, 409);
      }
      const updatedAt = Math.max(Date.now(), Number(existing?.updatedAt || 0) + 1);
      await PROGRESS.setJSON(`user/${auth.user.id}`, { updatedAt, state });
      return json({ ok: true, updatedAt });
    }

    if (action === 'reset-password') {
      const identifier = String(body.identifier ?? body.username ?? '').trim().slice(0, 120);
      const rate = await enforceRateLimit(req, 'recovery', identifier);
      const rawCode = typeof body.recoveryCode === 'string' && body.recoveryCode.length <= 64 ? body.recoveryCode : '';
      const code = rawCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (!validPassword(body.newPassword) || code.length !== 16) return await failAttempt(rate, 'Cuenta o código de recuperación incorrectos.');
      const user = await resolveUser(identifier);
      if (!user || !checkSecret(code, user.recovery, 32)) return await failAttempt(rate, 'Cuenta o código de recuperación incorrectos.');
      if (isSuspended(user)) return await failAttempt(rate, 'Esta cuenta está suspendida.');
      const recoveryCode = makeRecoveryCode();
      user.password = hashSecret(body.newPassword);
      user.recovery = hashSecret(recoveryCode.replace(/-/g, '').toUpperCase());
      user.sessionVersion = (user.sessionVersion ?? 1) + 1;
      user.updatedAt = Date.now();
      await USERS.setJSON(`user/${user.id}`, user);
      const remember = body.remember !== false;
      const token = await createSession(user, remember);
      await clearRateLimit(rate);
      const responseUser = normalizeUsername(user.username) === 'superdev' ? publicUser(user, 'member') : publicUser(user);
      return json({ ok: true, user: responseUser, recoveryCode }, 200, { 'set-cookie': setSessionCookie(token, remember) });
    }

    return json({ error: 'Acción desconocida.' }, 400);
  } catch (error) {
    if (error instanceof RateLimitError || error?.status === 429) {
      return json({ error: error.message }, 429, { 'retry-after': String(error.retryAfterSeconds || 60) });
    }
    if (error?.status === 413 || error?.status === 503) return json({ error: error.message }, error.status);
    console.error('account function error', { name: error?.name || 'Error', status: error?.status || 500 });
    return json({ error: 'Ocurrió un error en el servidor.' }, 500);
  }
};
