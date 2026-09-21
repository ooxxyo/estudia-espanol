import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';

const RATE_LIMIT = getStore('study-hub-rate-limit-v1');

export const RATE_POLICIES = Object.freeze({
  login: { attempts: 8, windowMs: 15 * 60_000, cooldownMs: 15 * 60_000 },
  recovery: { attempts: 5, windowMs: 30 * 60_000, cooldownMs: 30 * 60_000 },
  devLogin: { attempts: 5, windowMs: 15 * 60_000, cooldownMs: 30 * 60_000 },
  register: { attempts: 5, windowMs: 60 * 60_000, cooldownMs: 60 * 60_000 },
  feedback: { attempts: 6, windowMs: 15 * 60_000, cooldownMs: 30 * 60_000 },
  contribution: { attempts: 8, windowMs: 15 * 60_000, cooldownMs: 15 * 60_000 },
  confirmation: { attempts: 30, windowMs: 15 * 60_000, cooldownMs: 15 * 60_000 },
  comment: { attempts: 20, windowMs: 15 * 60_000, cooldownMs: 15 * 60_000 },
  friendRequest: { attempts: 12, windowMs: 60 * 60_000, cooldownMs: 60 * 60_000 },
  calendarProposal: { attempts: 8, windowMs: 60 * 60_000, cooldownMs: 60 * 60_000 },
  calendarEvent: { attempts: 20, windowMs: 60 * 60_000, cooldownMs: 60 * 60_000 },
  report: { attempts: 8, windowMs: 60 * 60_000, cooldownMs: 60 * 60_000 },
  bugReport: { attempts: 8, windowMs: 30 * 60_000, cooldownMs: 30 * 60_000 },
});

function clientAddress(req) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return req.headers.get('x-nf-client-connection-ip') || forwarded || 'unknown';
}

function limiterKey(req, scope, subject = '') {
  const material = `${scope}|${clientAddress(req)}|${String(subject).trim().toLowerCase().slice(0, 120)}`;
  return `limits/${scope}/${createHash('sha256').update(material).digest('hex')}`;
}

export class RateLimitError extends Error {
  constructor(retryAfterSeconds) {
    super('Demasiados intentos. Espera antes de volver a intentarlo.');
    this.name = 'RateLimitError';
    this.status = 429;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function readRow(key) {
  return await RATE_LIMIT.get(key, { type: 'json', consistency: 'strong' });
}

export async function enforceRateLimit(req, scope, subject = '', { strict = false } = {}) {
  const policy = RATE_POLICIES[scope];
  if (!policy) throw new Error('Unknown rate limit policy');
  const key = limiterKey(req, scope, subject);
  try {
    const row = await readRow(key);
    const now = Date.now();
    if (row?.blockedUntil > now) throw new RateLimitError(Math.ceil((row.blockedUntil - now) / 1000));
    return { key, policy, row };
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    if (strict) {
      const unavailable = new Error('No se pudo validar el acceso en este momento.');
      unavailable.status = 503;
      throw unavailable;
    }
    return { key, policy, row: null, unavailable: true };
  }
}

export async function recordRateLimitFailure(context) {
  if (!context || context.unavailable) return;
  const now = Date.now();
  const active = context.row && now - context.row.windowStartedAt < context.policy.windowMs;
  const attempts = active ? (context.row.attempts || 0) + 1 : 1;
  const blockedUntil = attempts >= context.policy.attempts ? now + context.policy.cooldownMs : 0;
  await RATE_LIMIT.setJSON(context.key, { attempts, windowStartedAt: active ? context.row.windowStartedAt : now, blockedUntil });
  if (blockedUntil) throw new RateLimitError(Math.ceil(context.policy.cooldownMs / 1000));
}

export async function clearRateLimit(context) {
  if (!context || context.unavailable) return;
  try { await RATE_LIMIT.delete(context.key); } catch {}
}
