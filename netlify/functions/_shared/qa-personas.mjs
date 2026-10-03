import { getStore } from '@netlify/blobs';
import { randomBytes } from 'node:crypto';
import { USERS, hashSecret, normalizeUsername } from './auth.mjs';

const PROGRESS = getStore('study-hub-progress-v1');
const FIXTURE_TIME = 1_700_000_000_000;
const RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{2,63}$/;

export const QA_PERSONAS = Object.freeze([
  Object.freeze({ username: 'qa-student-new', displayName: 'QA Student New', status: 'active', baseline: 'new' }),
  Object.freeze({ username: 'qa-student', displayName: 'QA Student', status: 'active', baseline: 'progress' }),
  Object.freeze({ username: 'qa-admin', displayName: 'QA Admin', status: 'active', baseline: 'empty' }),
  Object.freeze({ username: 'qa-owner', displayName: 'QA Owner', status: 'active', baseline: 'empty' }),
  Object.freeze({ username: 'qa-suspended', displayName: 'QA Suspended', status: 'suspended', baseline: 'empty' }),
]);

const QA_PERSONA_BY_USERNAME = new Map(QA_PERSONAS.map(persona => [persona.username, persona]));

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, expected) {
  return plainObject(value)
    && Object.keys(value).sort().join('\n') === expected.slice().sort().join('\n');
}

export function validQaRunId(value) {
  return typeof value === 'string' && RUN_ID_PATTERN.test(value);
}

export function validateQaSeedBody(body) {
  if (!exactKeys(body, ['accounts', 'runId']) || !validQaRunId(body.runId) || !plainObject(body.accounts)) return null;
  const usernames = Object.keys(body.accounts).sort();
  const expected = QA_PERSONAS.map(persona => persona.username).sort();
  if (usernames.join('\n') !== expected.join('\n')) return null;
  for (const username of expected) {
    const credentials = body.accounts[username];
    if (!exactKeys(credentials, ['password']) || typeof credentials.password !== 'string' || credentials.password.length < 8 || credentials.password.length > 128) return null;
  }
  return { runId: body.runId, accounts: body.accounts };
}

export function validateQaResetBody(body) {
  if (!exactKeys(body, ['runId', 'username']) || !validQaRunId(body.runId) || !QA_PERSONA_BY_USERNAME.has(body.username)) return null;
  return { runId: body.runId, username: body.username };
}

async function existingPersona(username) {
  const index = await USERS.get(`username/${username}`, { type: 'json', consistency: 'strong' });
  const stable = await USERS.get(`user/${username}`, { type: 'json', consistency: 'strong' });
  if (!index?.userId) {
    if (!stable) return null;
    if (normalizeUsername(stable.username) !== username) throw new Error('Estado QA inesperado.');
    return stable;
  }
  const indexed = await USERS.get(`user/${index.userId}`, { type: 'json', consistency: 'strong' });
  if (!indexed || normalizeUsername(indexed.username) !== username || (stable && stable.id !== indexed.id)) throw new Error('Estado QA inesperado.');
  return indexed;
}

function canonicalUser(persona, existing, password) {
  return {
    id: existing?.id || persona.username,
    username: persona.username,
    normalizedUsername: persona.username,
    email: '',
    displayName: persona.displayName,
    visibleRank: 'Estudiante',
    veteran: false,
    entitlement: 'standard',
    privacy: { profile: 'private' },
    password: password ? hashSecret(password) : existing.password,
    recovery: existing?.recovery || hashSecret(randomBytes(32).toString('base64url')),
    status: persona.status,
    sessionVersion: Math.max(0, Number(existing?.sessionVersion || 0)) + 1,
    createdAt: Number(existing?.createdAt || FIXTURE_TIME),
    updatedAt: Date.now(),
  };
}

function progressBaseline() {
  return {
    updatedAt: FIXTURE_TIME,
    state: {
      version: '2.0',
      savedAt: FIXTURE_TIME,
      totalAnswered: 4,
      totalCorrect: 3,
      currentStreak: 2,
      bestStreak: 2,
      studySeconds: 300,
      stats: {},
      errors: [],
      saved: [],
      history: [],
      session: null,
    },
  };
}

async function restoreProgress(persona, userId) {
  const key = `user/${userId}`;
  if (persona.baseline === 'progress') await PROGRESS.setJSON(key, progressBaseline());
  else await PROGRESS.delete(key);
}

async function saveCanonicalPersona(persona, existing, password) {
  const user = canonicalUser(persona, existing, password);
  if (existing?.email) await USERS.delete(`email/${String(existing.email).trim().toLowerCase()}`);
  await USERS.setJSON(`user/${user.id}`, user);
  await USERS.setJSON(`username/${persona.username}`, { userId: user.id });
  await restoreProgress(persona, user.id);
  return user;
}

export async function seedQaPersonas(accounts) {
  const seeded = [];
  for (const persona of QA_PERSONAS) {
    const existing = await existingPersona(persona.username);
    seeded.push(await saveCanonicalPersona(persona, existing, accounts[persona.username].password));
  }
  return seeded;
}

export async function resetQaPersona(username) {
  const persona = QA_PERSONA_BY_USERNAME.get(username);
  if (!persona) throw new Error('Persona QA inválida.');
  const existing = await existingPersona(username);
  if (!existing?.password) throw new Error('Persona QA no provisionada.');
  return saveCanonicalPersona(persona, existing);
}
