import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';
import { canAccessAdmin, publicUser } from './auth.mjs';

export const SUBJECT_IDS = Object.freeze(['ingles', 'salud', 'historia', 'ciencia', 'matematicas', 'espanol']);
export const SUBJECTS = new Set(SUBJECT_IDS);
export const COMMUNITY_TYPES = new Set(['class_notes', 'assignment', 'quiz', 'test', 'announcement', 'study_material', 'other']);
export const COMMUNITY_STATUSES = new Set(['pending', 'community', 'confirmed', 'admin_verified', 'official', 'rejected', 'duplicate']);
export const CALENDAR_TYPES = new Set(['test', 'quiz', 'homework', 'project', 'presentation', 'announcement', 'study', 'other']);
export const PROPOSAL_STATUSES = new Set(['pending', 'approved', 'rejected', 'needs_info', 'duplicate']);
export const REPORT_REASONS = new Set(['spam', 'incorrect', 'duplicate', 'inappropriate', 'private_information', 'other']);
export const FRIEND_REQUEST_VALUES = new Set(['everyone', 'members', 'nobody']);
export const PROFILE_VISIBILITY_VALUES = new Set(['limited', 'private']);
export const MAX_SCAN = 1000;
export const MAX_RESULTS = 200;

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export function cleanText(value, max = 200) {
  return typeof value === 'string' ? value.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max) : '';
}

export async function readBody(req) {
  try { return await req.json(); } catch { return {}; }
}

export function validDate(value) {
  const date = cleanText(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day ? date : '';
}

export function normalizeTitle(value) {
  return cleanText(value, 140).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export async function listRows(store, prefix, limit = MAX_RESULTS) {
  const { blobs } = await store.list({ prefix });
  const items = blobs.slice(0, Math.min(MAX_SCAN, limit));
  const rows = await Promise.all(items.map(item => store.get(item.key, { type: 'json', consistency: 'strong' })));
  return rows.filter(Boolean);
}

export function hasCapability(auth, capability) {
  if (!auth?.ok) return false;
  if (capability === 'calendar:create') return canAccessAdmin(auth.role) || publicUser(auth.user, auth.role).veteran === true;
  if (capability === 'moderation:global') return canAccessAdmin(auth.role);
  return false;
}

export function safeActor(auth) {
  const user = publicUser(auth.user, auth.role);
  return { userId: auth.user.id, username: cleanText(user.username, 20), displayName: cleanText(user.displayName, 60), visibleRank: cleanText(user.visibleRank, 40), veteran: user.veteran === true, role: auth.role };
}

export function safeSocialProfile(user, relationship = 'none') {
  const profile = publicUser(user);
  return { username: cleanText(profile.username, 20), displayName: cleanText(profile.displayName, 60), visibleRank: cleanText(profile.visibleRank, 40), veteran: profile.veteran === true, profileVisibility: user?.socialPrivacy?.profileVisibility === 'limited' ? 'limited' : 'private', relationship };
}

export function possibleDuplicate(rows, candidate) {
  const normalized = normalizeTitle(candidate.title);
  return rows.some(row => !row.removed && row.subjectId === candidate.subjectId && row.date === candidate.date && row.type === candidate.type && normalizeTitle(row.title) === normalized);
}

export const FRIENDS = getStore('study-hub-friends-v1');
export const NOTIFICATIONS = getStore('study-hub-notifications-v1');
export const AUDIT = getStore('study-hub-admin-audit-v1');

export async function isBlockedBetween(firstUserId, secondUserId) {
  if (!firstUserId || !secondUserId) return false;
  const [first, second] = await Promise.all([
    FRIENDS.get(`blocks/${firstUserId}/${secondUserId}`, { type: 'json', consistency: 'strong' }),
    FRIENDS.get(`blocks/${secondUserId}/${firstUserId}`, { type: 'json', consistency: 'strong' }),
  ]);
  return Boolean(first || second);
}

export async function createNotification(userId, input) {
  if (!userId) return null;
  const now = Date.now();
  const notification = {
    schemaVersion: 1,
    notificationId: randomUUID(),
    userId,
    type: cleanText(input.type, 40) || 'academic_update',
    title: cleanText(input.title, 100),
    message: cleanText(input.message, 500),
    resourceType: cleanText(input.resourceType, 40),
    resourceId: cleanText(input.resourceId, 80),
    createdAt: now,
    readAt: null,
    status: 'active',
  };
  await NOTIFICATIONS.setJSON(`notifications/${userId}/${now}_${notification.notificationId}`, notification);
  return notification;
}

export async function auditEvent(auth, action, details = {}) {
  const timestamp = Date.now();
  await AUDIT.setJSON(`events/${timestamp}_${randomUUID()}`, {
    actorUserId: auth.user.id,
    actorUsername: cleanText(auth.user.username, 20),
    actorRole: auth.role,
    action: cleanText(action, 80),
    timestamp,
    outcome: 'completed',
    ...details,
  });
}
