import { getStore } from '@netlify/blobs';
import { createHash, randomBytes } from 'node:crypto';

export const USERS = getStore('study-hub-users-v1');
export const SESSIONS = getStore('study-hub-sessions-v1');
export const COOKIE = 'studyhub_session';
export const REMEMBER_DAYS = 30;
export const SHORT_SESSION_HOURS = 12;

const ROLE_LEVEL = Object.freeze({ member: 0, admin: 1, owner: 2, superdev: 3 });

export function normalizeUsername(value) {
  return String(value ?? '').trim().toLowerCase();
}

function configuredUsernames(name) {
  return new Set(String(process.env[name] || '')
    .split(/[\s,;]+/)
    .map(normalizeUsername)
    .filter(Boolean));
}

export function roleForUser(user) {
  const username = normalizeUsername(user?.normalizedUsername || user?.username);
  if (username === 'superdev') return 'superdev';
  if (username && configuredUsernames('OWNER_USERNAME').has(username)) return 'owner';
  if (username && configuredUsernames('ADMIN_USERNAMES').has(username)) return 'admin';
  if (user?.securityRole === 'admin') return 'admin';
  return 'member';
}

export function accountProfile(user) {
  const username = String(user?.username || 'Estudiante').slice(0, 20);
  const veteran = user?.veteran === true || user?.whitelisted === true || user?.entitlement === 'veteran';
  return {
    displayName: String(user?.displayName || username).trim().slice(0, 60) || username,
    visibleRank: String(user?.visibleRank || (veteran ? 'Veterano' : 'Estudiante')).trim().slice(0, 40) || 'Estudiante',
    veteran,
    entitlement: veteran ? 'veteran' : 'standard',
    privacy: user?.privacy && typeof user.privacy === 'object' ? { profile: user.privacy.profile === 'public' ? 'public' : 'private' } : { profile: 'private' },
  };
}

export function roleForSession(user, session) {
  const identityRole = roleForUser(user);
  if (identityRole === 'superdev') return session?.superdevAuthenticated === true ? 'superdev' : 'member';
  return identityRole;
}

export function isSuspended(user) {
  return user?.status === 'suspended' || user?.suspended === true;
}

function safeDecode(value) {
  try { return decodeURIComponent(value); } catch { return value; }
}

export function parseCookies(req) {
  const raw = req.headers.get('cookie') || '';
  return Object.fromEntries(raw.split(';').map(value => value.trim()).filter(Boolean).map(pair => {
    const index = pair.indexOf('=');
    return [safeDecode(index < 0 ? pair : pair.slice(0, index)), safeDecode(index < 0 ? '' : pair.slice(index + 1))];
  }));
}

export function tokenHash(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

export async function readUserById(id) {
  return id ? await USERS.get(`user/${id}`, { type: 'json', consistency: 'strong' }) : null;
}

export async function resolveUser(identifier) {
  const raw = String(identifier ?? '').trim();
  if (!raw || raw.length > 120) return null;
  let index = null;
  if (raw.includes('@')) index = await USERS.get(`email/${raw.toLowerCase()}`, { type: 'json', consistency: 'strong' });
  if (!index?.userId) index = await USERS.get(`username/${normalizeUsername(raw)}`, { type: 'json', consistency: 'strong' });
  return index?.userId ? await readUserById(index.userId) : null;
}

export async function authenticateRequest(req, { allowSuspended = false } = {}) {
  const token = parseCookies(req)[COOKIE];
  if (!token || token.length < 20 || token.length > 256) return { ok: false, reason: 'missing' };
  const session = await SESSIONS.get(`session/${tokenHash(token)}`, { type: 'json', consistency: 'strong' });
  if (!session || !Number.isFinite(session.expiresAt) || session.expiresAt < Date.now()) return { ok: false, reason: 'expired' };
  const user = await readUserById(session.userId);
  if (!user || (session.sessionVersion ?? 1) !== (user.sessionVersion ?? 1)) return { ok: false, reason: 'revoked' };
  if (!allowSuspended && isSuspended(user)) return { ok: false, reason: 'suspended', user };
  return { ok: true, token, session, user, role: roleForSession(user, session) };
}

export async function createSession(user, remember = true, { superdevAuthenticated = false } = {}) {
  const token = randomBytes(32).toString('base64url');
  const ttlMs = remember ? REMEMBER_DAYS * 24 * 60 * 60 * 1000 : SHORT_SESSION_HOURS * 60 * 60 * 1000;
  const session = {
    userId: user.id,
    sessionVersion: user.sessionVersion ?? 1,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
  };
  if (superdevAuthenticated === true) session.superdevAuthenticated = true;
  await SESSIONS.setJSON(`session/${tokenHash(token)}`, session);
  return token;
}

export function setSessionCookie(token, remember = true) {
  const persistent = remember ? `; Max-Age=${REMEMBER_DAYS * 24 * 60 * 60}` : '';
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/${persistent}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

export function publicUser(user, role = roleForUser(user)) {
  const profile = accountProfile(user);
  return {
    id: user.id,
    username: user.username,
    email: user.email || '',
    displayName: profile.displayName,
    visibleRank: profile.visibleRank,
    veteran: profile.veteran,
    entitlement: profile.entitlement,
    privacy: profile.privacy,
    createdAt: user.createdAt,
    updatedAt: Number(user.updatedAt || user.createdAt || 0),
    lastActivityAt: Number(user.lastActivityAt || user.updatedAt || user.createdAt || 0),
    status: isSuspended(user) ? 'suspended' : 'active',
    role,
  };
}

export function canAccessAdmin(role) {
  return (ROLE_LEVEL[role] ?? -1) >= ROLE_LEVEL.admin;
}

export function canManageUser(actor, target, action, authenticatedActorRole = roleForUser(actor)) {
  const actorRole = authenticatedActorRole;
  const targetRole = roleForUser(target);
  if (!canAccessAdmin(actorRole) || targetRole === 'superdev') return false;
  if (actor?.id === target?.id && ['suspend', 'delete', 'revoke-sessions'].includes(action)) return false;
  if (['set-veteran', 'remove-veteran', 'grant-admin', 'revoke-admin'].includes(action)) {
    return actorRole === 'superdev' && ['member', 'admin', 'owner'].includes(targetRole);
  }
  if (actorRole === 'admin') return targetRole === 'member';
  if (actorRole === 'owner') return targetRole === 'member' || targetRole === 'admin';
  if (actorRole === 'superdev') return ['member', 'admin', 'owner'].includes(targetRole);
  return false;
}

export async function invalidateUserSessions(user) {
  user.sessionVersion = (user.sessionVersion ?? 1) + 1;
  user.updatedAt = Date.now();
  await USERS.setJSON(`user/${user.id}`, user);
  return user;
}
