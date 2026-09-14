import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';
import { authenticateRequest } from './_shared/auth.mjs';

const FEATURES = getStore('study-hub-feature-flags-v1');
const AUDIT = getStore('study-hub-admin-audit-v1');
const STATES = new Set(['hidden', 'development', 'experimental', 'preview', 'ready']);
const AUDIENCES = new Set(['superdev', 'staff', 'all']);
const FEATURE_CATALOG = Object.freeze([
  { id: 'ui-beta', name: 'Design Lab / UI Beta', description: 'Comparación futura entre Classic UI y New UI Beta.', state: 'development', enabled: false, audience: 'superdev' },
  { id: 'ai-assistant', name: 'Asistente IA por tema', description: 'Asistente limitado a la materia y tema activos usando material aprobado.', state: 'hidden', enabled: false, audience: 'superdev' },
  { id: 'new-dashboard', name: 'Nuevo dashboard', description: 'Pruebas de una vista general alternativa del Hub.', state: 'experimental', enabled: false, audience: 'superdev' },
  { id: 'new-practice', name: 'Nueva práctica', description: 'Laboratorio para extensiones del Study Engine.', state: 'preview', enabled: false, audience: 'superdev' },
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function resolvedFeatures() {
  return await Promise.all(FEATURE_CATALOG.map(async feature => {
    const saved = await FEATURES.get(`flags/${feature.id}`, { type: 'json', consistency: 'strong' });
    return {
      ...feature,
      state: STATES.has(saved?.state) ? saved.state : feature.state,
      enabled: typeof saved?.enabled === 'boolean' ? saved.enabled : feature.enabled,
      audience: AUDIENCES.has(saved?.audience) ? saved.audience : feature.audience,
      updatedAt: Number(saved?.updatedAt || 0),
    };
  }));
}

export default async (req) => {
  try {
    const auth = await authenticateRequest(req);
    const all = await resolvedFeatures();
    if (req.method === 'GET') {
      const features = auth.ok && auth.role === 'superdev'
        ? all
        : all.filter(feature => feature.enabled && feature.state !== 'hidden' && feature.audience === 'all');
      return json({ features });
    }
    if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
    if (!auth.ok || auth.role !== 'superdev') return json({ error: 'Acceso exclusivo de Super Dev.' }, 403);
    let body = {};
    try { body = await req.json(); } catch {}
    const feature = all.find(item => item.id === body.id);
    if (!feature || !STATES.has(body.state) || !AUDIENCES.has(body.audience) || typeof body.enabled !== 'boolean') {
      return json({ error: 'Configuración de feature inválida.' }, 400);
    }
    const updated = { ...feature, state: body.state, enabled: body.enabled, audience: body.audience, updatedAt: Date.now() };
    await FEATURES.setJSON(`flags/${feature.id}`, {
      state: updated.state,
      enabled: updated.enabled,
      audience: updated.audience,
      updatedAt: updated.updatedAt,
    });
    await AUDIT.setJSON(`events/${updated.updatedAt}_${randomUUID()}`, {
      actorUserId: auth.user.id,
      actorUsername: String(auth.user.username || '').slice(0, 20),
      actorRole: auth.role,
      action: 'feature-update',
      targetFeatureId: feature.id,
      state: updated.state,
      enabled: updated.enabled,
      audience: updated.audience,
      timestamp: updated.updatedAt,
      outcome: 'completed',
    });
    return json({ ok: true, feature: updated });
  } catch (error) {
    console.error('features function error', { name: error?.name || 'Error' });
    return json({ error: 'No se pudieron consultar las funciones experimentales.' }, 500);
  }
};
