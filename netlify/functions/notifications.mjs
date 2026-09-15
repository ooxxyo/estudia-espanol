import { authenticateRequest } from './_shared/auth.mjs';
import { NOTIFICATIONS, cleanText, json, listRows, readBody } from './_shared/platform.mjs';

function publicNotification(row) {
  return {
    notificationId: row.notificationId,
    type: cleanText(row.type, 40),
    title: cleanText(row.title, 100),
    message: cleanText(row.message, 500),
    resourceType: cleanText(row.resourceType, 40),
    resourceId: cleanText(row.resourceId, 80),
    createdAt: Number(row.createdAt || 0),
    readAt: Number(row.readAt || 0) || null,
    status: row.status === 'archived' ? 'archived' : 'active',
  };
}

export default async (req) => {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.ok) return json({ error: 'Inicia sesión para consultar notificaciones.' }, 401);
    const prefix = `notifications/${auth.user.id}/`;
    if (req.method === 'GET') {
      const includeArchived = new URL(req.url).searchParams.get('archived') === 'true';
      const rows = (await listRows(NOTIFICATIONS, prefix)).filter(row => row.userId === auth.user.id && (includeArchived || row.status !== 'archived')).sort((a, b) => b.createdAt - a.createdAt);
      const saved = await NOTIFICATIONS.get(`preferences/${auth.user.id}`, { type: 'json', consistency: 'strong' });
      const defaults = { friendRequests: true, comments: true, calendar: true, assignments: true, tests: true, community: true, moderation: true, studyReminders: true };
      return json({ notifications: rows.map(publicNotification), unreadCount: rows.filter(row => !row.readAt && row.status !== 'archived').length, preferences: { ...defaults, ...(saved?.preferences || {}) } });
    }
    if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
    const body = await readBody(req);
    if (body.action === 'set-preferences') {
      const keys = ['friendRequests', 'comments', 'calendar', 'assignments', 'tests', 'community', 'moderation', 'studyReminders'];
      const preferences = Object.fromEntries(keys.map(key => [key, body.preferences?.[key] !== false]));
      await NOTIFICATIONS.setJSON(`preferences/${auth.user.id}`, { schemaVersion: 1, userId: auth.user.id, preferences, updatedAt: Date.now() });
      return json({ ok: true, preferences });
    }
    const rows = await listRows(NOTIFICATIONS, prefix);
    if (body.action === 'mark-all-read') {
      const now = Date.now();
      await Promise.all(rows.filter(row => !row.readAt).map(row => NOTIFICATIONS.setJSON(`${prefix}${row.createdAt}_${row.notificationId}`, { ...row, readAt: now })));
      return json({ ok: true });
    }
    const id = cleanText(body.notificationId, 80);
    const row = rows.find(item => item.notificationId === id && item.userId === auth.user.id);
    if (!row) return json({ error: 'Notificación no encontrada.' }, 404);
    if (body.action === 'mark-read') row.readAt = row.readAt || Date.now();
    else if (body.action === 'archive') row.status = 'archived';
    else return json({ error: 'Acción desconocida.' }, 400);
    await NOTIFICATIONS.setJSON(`${prefix}${row.createdAt}_${row.notificationId}`, row);
    return json({ ok: true, notification: publicNotification(row) });
  } catch (error) {
    console.error('notifications function error', { name: error?.name || 'Error' });
    return json({ error: 'No se pudieron procesar las notificaciones.' }, 500);
  }
};
