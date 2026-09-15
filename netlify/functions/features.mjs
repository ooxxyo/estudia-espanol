import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';
import { authenticateRequest, normalizeUsername, publicUser } from './_shared/auth.mjs';

const FEATURES = getStore('study-hub-feature-flags-v1');
const AUDIT = getStore('study-hub-admin-audit-v1');
const STATUSES = new Set(['development', 'experimental', 'preview', 'ready']);
const AUDIENCES = new Set(['superdev', 'admins', 'veterans', 'selectedUsers', 'members']);
const MAX_SELECTED_USERS = 50;

// Early Access solo registra funciones experimentales reales. availability y
// location son metadata de implementación, no controles editables del cliente.
const FEATURE_CATALOG = Object.freeze([
  { id: 'ui-beta', name: 'UI Beta / Design Lab', description: 'Comparación futura entre la interfaz clásica y una UI Beta.', status: 'development', audience: 'superdev', enabled: false, availability: 'unavailable', location: '' },
  { id: 'ai-assistant', name: 'Asistente IA por materia', description: 'Asistente futuro limitado al contenido aprobado de la materia activa.', status: 'development', audience: 'superdev', enabled: false, availability: 'unavailable', location: '' },
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

function normalizeSelectedUsers(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(normalizeUsername).filter(Boolean))].slice(0, MAX_SELECTED_USERS);
}

function normalizeLegacyStatus(saved, fallback) {
  if (STATUSES.has(saved?.status)) return saved.status;
  if (STATUSES.has(saved?.state)) return saved.state;
  return fallback;
}

function normalizeLegacyAudience(value, fallback) {
  if (AUDIENCES.has(value)) return value;
  if (value === 'staff') return 'admins';
  if (value === 'all') return 'members';
  return fallback;
}

async function resolvedFeatures() {
  return await Promise.all(FEATURE_CATALOG.map(async feature => {
    const saved = await FEATURES.get(`flags/${feature.id}`, { type: 'json', consistency: 'strong' });
    return {
      ...feature,
      status: normalizeLegacyStatus(saved, feature.status),
      enabled: typeof saved?.enabled === 'boolean' ? saved.enabled : feature.enabled,
      audience: normalizeLegacyAudience(saved?.audience, feature.audience),
      selectedUsers: normalizeSelectedUsers(saved?.selectedUsers),
      updatedAt: Number(saved?.updatedAt || 0),
    };
  }));
}

function audienceAllows(feature, auth) {
  if (!auth.ok) return false;
  if (auth.role === 'superdev') return true;
  if (feature.audience === 'admins') return auth.role === 'admin' || auth.role === 'owner';
  if (feature.audience === 'veterans') return publicUser(auth.user, auth.role).veteran === true;
  if (feature.audience === 'selectedUsers') return feature.selectedUsers.includes(normalizeUsername(auth.user.username));
  if (feature.audience === 'members') return auth.role === 'member' && publicUser(auth.user, auth.role).veteran !== true;
  return false;
}

function accessDecision(feature, auth) {
  const audienceAuthorized = audienceAllows(feature, auth);
  const superdev = auth.ok && auth.role === 'superdev';
  const authorized = superdev || (feature.enabled === true && audienceAuthorized);
  const available = feature.availability === 'available' && Boolean(feature.location);
  return { authorized, available, canLaunch: authorized && available };
}

function publicFeature(feature, auth, includeSelectedUsers = false) {
  const result = {
    id: feature.id,
    name: feature.name,
    description: feature.description,
    status: feature.status,
    audience: feature.audience,
    enabled: feature.enabled,
    availability: feature.availability,
    location: feature.location,
    updatedAt: feature.updatedAt,
    ...accessDecision(feature, auth),
  };
  if (includeSelectedUsers) result.selectedUsers = feature.selectedUsers;
  return result;
}

export default async (req) => {
  try {
    const auth = await authenticateRequest(req);
    const all = await resolvedFeatures();

    if (req.method === 'GET') {
      const featureId = String(new URL(req.url).searchParams.get('id') || '').trim();
      if (featureId) {
        const feature = all.find(item => item.id === featureId);
        if (!feature) return json({ error: 'Feature no encontrada.' }, 404);
        const visible = publicFeature(feature, auth, auth.ok && auth.role === 'superdev');
        if (!visible.authorized) return json({ error: 'No tienes acceso a esta feature.' }, 403);
        if (!visible.available) return json({ error: 'Todavía no disponible para pruebas.', feature: visible }, 409);
        return json({ feature: visible });
      }

      const isSuperdev = auth.ok && auth.role === 'superdev';
      const features = all
        .filter(feature => isSuperdev || (feature.enabled && audienceAllows(feature, auth)))
        .map(feature => publicFeature(feature, auth, isSuperdev));
      return json({ features });
    }

    if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
    if (!auth.ok || auth.role !== 'superdev') return json({ error: 'Acceso exclusivo de Super Dev.' }, 403);

    let body = {};
    try { body = await req.json(); } catch {}
    const feature = all.find(item => item.id === body.id);
    if (!feature || !STATUSES.has(body.status) || !AUDIENCES.has(body.audience) || typeof body.enabled !== 'boolean') {
      return json({ error: 'Configuración de feature inválida.' }, 400);
    }
    const selectedUsers = body.audience === 'selectedUsers' ? normalizeSelectedUsers(body.selectedUsers) : [];
    if (body.audience === 'selectedUsers' && selectedUsers.length === 0) return json({ error: 'Añade al menos un username para selectedUsers.' }, 400);

    const updated = { ...feature, status: body.status, audience: body.audience, enabled: body.enabled, selectedUsers, updatedAt: Date.now() };
    await FEATURES.setJSON(`flags/${feature.id}`, {
      status: updated.status,
      audience: updated.audience,
      enabled: updated.enabled,
      selectedUsers: updated.selectedUsers,
      updatedAt: updated.updatedAt,
    });
    await AUDIT.setJSON(`events/${updated.updatedAt}_${randomUUID()}`, {
      actorUserId: auth.user.id,
      actorUsername: normalizeUsername(auth.user.username).slice(0, 20),
      actorRole: auth.role,
      action: 'feature-update',
      targetFeatureId: feature.id,
      status: updated.status,
      enabled: updated.enabled,
      audience: updated.audience,
      selectedUserCount: updated.selectedUsers.length,
      timestamp: updated.updatedAt,
      outcome: 'completed',
    });
    return json({ ok: true, feature: publicFeature(updated, auth, true) });
  } catch (error) {
    console.error('features function error', { name: error?.name || 'Error' });
    return json({ error: 'No se pudieron consultar las funciones experimentales.' }, 500);
  }
};
