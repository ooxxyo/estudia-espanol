import { getStore, listStores } from '@netlify/blobs';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { isSuspended, normalizeUsername, roleForUser } from './auth.mjs';
import { QA_PERSONAS, progressBaseline } from './qa-personas.mjs';

export const INSPECTION_NAMES = Object.freeze([...QA_PERSONAS.map(p => p.username), 'superdev', 'testmem']);
export const INSPECTION_STORES = Object.freeze([
  'study-hub-users-v1', 'study-hub-progress-v1', 'study-hub-sessions-v1',
  'study-hub-admin-audit-v1', 'study-hub-rate-limit-v1', 'study-hub-presence-v1',
  'study-hub-feedback-v1', 'study-hub-bug-reports-v1', 'study-hub-feature-flags-v1',
]);
const MAX_OBJECTS = 512;
const MAX_OBJECT_BYTES = 1_000_000;
const MAX_TOTAL_BYTES = 8_000_000;
const personaByName = new Map(QA_PERSONAS.map(p => [p.username, p]));
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
function digest(value) {
  return createHash('sha256').update(canonical(value)).digest('hex');
}
function reference(store, key) {
  return digest([store, key]);
}
async function capture() {
  const { stores: presentStores } = await listStores({ consistency: 'strong' });
  if (!Array.isArray(presentStores) || presentStores.length > INSPECTION_STORES.length
    || new Set(presentStores).size !== presentStores.length || presentStores.some(name => !INSPECTION_STORES.includes(name))) throw new Error('Unreviewed store');
  const inventory = new Map();
  let objects = 0, bytes = 0;
  for (const name of INSPECTION_STORES) {
    const store = getStore({ name, consistency: 'strong' });
    const listing = await store.list(); // The SDK collects every page when paginate is false.
    if (!Array.isArray(listing.blobs) || listing.blobs.length + objects > MAX_OBJECTS) throw new Error('Incomplete inspection');
    const rows = new Map();
    for (const { key } of [...listing.blobs].sort((a,b) => a.key.localeCompare(b.key))) {
      if (typeof key !== 'string' || rows.has(key)) throw new Error('Invalid inventory');
      const row = await store.getWithMetadata(key, { type: 'json', consistency: 'strong' });
      if (!row || typeof row !== 'object' || Array.isArray(row) || !Object.hasOwn(row, 'data') || row.data === undefined
        || !row.metadata || typeof row.metadata !== 'object' || Array.isArray(row.metadata)) throw new Error('Incomplete object envelope');
      const payload = { data: row.data, metadata: row.metadata };
      const size = Buffer.byteLength(canonical(payload));
      objects++; bytes += size;
      if (size > MAX_OBJECT_BYTES || bytes > MAX_TOTAL_BYTES) throw new Error('Inspection limit');
      rows.set(key, { data: row.data, digest: digest(payload), ref: reference(name, key) });
    }
    inventory.set(name, rows);
  }
  return { inventory, presentStores: [...presentStores].sort() };
}
function publicInventory(inventory) {
  return INSPECTION_STORES.map(name => {
    const objects = [...inventory.get(name).values()].map(row => ({ ref: row.ref, digest: row.digest })).sort((a,b) => a.ref.localeCompare(b.ref));
    return { name, objectCount: objects.length, digest: digest(objects), objects };
  });
}
function safeNumber(value) { return Number.isFinite(value) ? value : null; }
function safeCount(value) { return Array.isArray(value) ? value.length : null; }
function progressSummary(progress, present) {
  if (!present) return { present: false, totalAnswered: null, totalCorrect: null, currentStreak: null, bestStreak: null, studySeconds: null, statsCount: null, errorsCount: null, savedCount: null, historyCount: null, sessionPresent: false };
  const state = progress?.state;
  return {
    present: true, totalAnswered: safeNumber(state?.totalAnswered), totalCorrect: safeNumber(state?.totalCorrect),
    currentStreak: safeNumber(state?.currentStreak), bestStreak: safeNumber(state?.bestStreak), studySeconds: safeNumber(state?.studySeconds),
    statsCount: state?.stats && typeof state.stats === 'object' && !Array.isArray(state.stats) ? Object.keys(state.stats).length : null,
    errorsCount: safeCount(state?.errors), savedCount: safeCount(state?.saved), historyCount: safeCount(state?.history), sessionPresent: state?.session != null,
  };
}
function accountSummary(username, inventory, auth, seenIds) {
  const users = inventory.get('study-hub-users-v1');
  const index = users.get(`username/${username}`);
  const legacy = users.get(`user/${username}`);
  let record = legacy;
  if (index) {
    if (!index.data?.userId) throw new Error('Invalid identity');
    record = users.get(`user/${index.data.userId}`);
    if (!record || record.data?.id !== index.data.userId || (legacy && legacy.data?.id !== index.data.userId)) throw new Error('Inconsistent identity');
  }
  for (const [key, candidate] of users) {
    if (key.startsWith('user/') && normalizeUsername(candidate.data?.normalizedUsername || candidate.data?.username) === username && candidate.ref !== record?.ref) throw new Error('Duplicate or orphan identity');
    if (record && key.startsWith('username/') && key !== `username/${username}` && candidate.data?.userId === record.data?.id) throw new Error('Outside alias');
  }
  if (!record) return { username, exists: false };
  const user = record.data;
  if (!user || user.username !== username || normalizeUsername(user.normalizedUsername || user.username) !== username
    || typeof user.id !== 'string' || !/^[A-Za-z0-9_-]{1,120}$/.test(user.id) || seenIds.has(user.id)
    || (user.status != null && user.status !== 'active' && user.status !== 'suspended')) throw new Error('Invalid identity');
  seenIds.add(user.id);
  const stored = user.sessionVersion ?? null;
  if (stored !== null && (!Number.isSafeInteger(stored) || stored < 0)) throw new Error('Invalid session version');
  const progressRecord = inventory.get('study-hub-progress-v1').get(`user/${user.id}`);
  const progress = progressRecord?.data ?? null;
  const persona = personaByName.get(username);
  const suspended = isSuspended(user);
  const configured = roleForUser(user);
  const sessionVerified = auth.user.id === user.id;
  const effective = suspended ? null : configured === 'superdev' ? (sessionVerified ? auth.role : null) : configured;
  return {
    username, exists: true, id: user.id, sessionVersion: { stored, effective: stored ?? 1 }, status: suspended ? 'suspended' : 'active',
    role: { configured, effective, sessionVerified },
    baseline: persona ? {
      expected: persona.baseline, matches: persona.baseline === 'progress' ? isDeepStrictEqual(progress, progressBaseline()) : !progressRecord,
      canonicalProfile: user.displayName === persona.displayName && user.status === persona.status && user.email === ''
        && user.visibleRank === 'Estudiante' && user.veteran === false && user.entitlement === 'standard' && user.privacy?.profile === 'private',
    } : null,
    progress: persona ? progressSummary(progress, !!progressRecord) : null,
    integrity: {
      userRef: record.ref, userDigest: record.digest, indexRef: index?.ref ?? null, indexDigest: index?.digest ?? null,
      legacyRef: legacy?.ref ?? null, legacyDigest: legacy?.digest ?? null,
      progressRef: progressRecord?.ref ?? null, progressDigest: progressRecord?.digest ?? null,
    },
  };
}
export async function inspectQaState(auth, selectedUsername = null) {
  const first = await capture();
  // Exactly two application captures. Bounded SDK read retries are permitted; a final rejection escapes immediately.
  const second = await capture(); // No application retry, stabilization loop or partial snapshot.
  const firstInventory = publicInventory(first.inventory);
  const secondInventory = publicInventory(second.inventory);
  if (!isDeepStrictEqual(firstInventory, secondInventory) || !isDeepStrictEqual(first.presentStores, second.presentStores)) throw new Error('Concurrent change');
  const seenIds = new Set();
  const accounts = INSPECTION_NAMES.map(name => accountSummary(name, second.inventory, auth, seenIds));
  const actor = second.inventory.get('study-hub-users-v1').get(`user/${auth.user.id}`)?.data;
  if (!actor || actor.sessionVersion !== auth.user.sessionVersion || actor.status !== auth.user.status || roleForUser(actor) !== roleForUser(auth.user)) throw new Error('Authorization changed');
  return {
    schemaVersion: 1, environment: 'qa', accounts: selectedUsername ? accounts.filter(a => a.username === selectedUsername) : accounts,
    integrity: { algorithm: 'sha256-canonical-json-v1', scope: 'fixed-nine-project-stores', observation: 'two-equal-strong-read-passes-not-a-transaction', complete: true, presentStores: second.presentStores, stores: secondInventory },
  };
}
