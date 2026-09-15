import { randomUUID } from 'node:crypto';
import { USERS, authenticateRequest, readUserById, resolveUser } from './_shared/auth.mjs';
import { RateLimitError, enforceRateLimit, recordRateLimitFailure } from './_shared/rate-limit.mjs';
import {
  FRIENDS, FRIEND_REQUEST_VALUES, PROFILE_VISIBILITY_VALUES, cleanText, createNotification,
  isBlockedBetween, json, listRows, readBody, safeSocialProfile,
} from './_shared/platform.mjs';

function pairKey(a, b) { return [a, b].sort().join('_'); }

async function relationship(first, second) {
  if (await isBlockedBetween(first, second)) return 'blocked';
  const friendship = await FRIENDS.get(`friendships/${pairKey(first, second)}`, { type: 'json', consistency: 'strong' });
  return friendship?.status === 'accepted' ? 'friend' : 'none';
}

async function listFriends(auth) {
  const [requests, friendships, blocks] = await Promise.all([
    listRows(FRIENDS, 'requests/'), listRows(FRIENDS, 'friendships/'), listRows(FRIENDS, `blocks/${auth.user.id}/`),
  ]);
  const friendProfiles = [];
  for (const row of friendships.filter(item => item.status === 'accepted' && item.userIds?.includes(auth.user.id))) {
    const otherId = row.userIds.find(id => id !== auth.user.id);
    const other = await readUserById(otherId);
    if (other && !(await isBlockedBetween(auth.user.id, otherId))) friendProfiles.push(safeSocialProfile(other, 'friend'));
  }
  const safeRequest = async row => {
    const otherId = row.fromUserId === auth.user.id ? row.toUserId : row.fromUserId;
    const other = await readUserById(otherId);
    return other ? { requestId: row.requestId, direction: row.fromUserId === auth.user.id ? 'sent' : 'received', status: row.status, createdAt: row.createdAt, user: safeSocialProfile(other, 'pending') } : null;
  };
  const visibleRequests = requests.filter(row => row.status === 'pending' && (row.fromUserId === auth.user.id || row.toUserId === auth.user.id));
  const requestProfiles = (await Promise.all(visibleRequests.map(safeRequest))).filter(Boolean);
  return json({
    friends: friendProfiles,
    received: requestProfiles.filter(item => item.direction === 'received'),
    sent: requestProfiles.filter(item => item.direction === 'sent'),
    blocked: blocks.map(row => ({ username: cleanText(row.blockedUsername, 20), createdAt: row.createdAt })),
    privacy: {
      friendRequests: FRIEND_REQUEST_VALUES.has(auth.user.socialPrivacy?.friendRequests) ? auth.user.socialPrivacy.friendRequests : 'everyone',
      profileVisibility: PROFILE_VISIBILITY_VALUES.has(auth.user.socialPrivacy?.profileVisibility) ? auth.user.socialPrivacy.profileVisibility : 'private',
    },
  });
}

export default async (req) => {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.ok) return json({ error: 'Inicia sesión para usar Amigos.' }, 401);
    if (req.method === 'GET') return await listFriends(auth);
    if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
    const body = await readBody(req);
    const action = cleanText(body.action, 30);

    if (action === 'set-privacy') {
      if (!FRIEND_REQUEST_VALUES.has(body.friendRequests) || !PROFILE_VISIBILITY_VALUES.has(body.profileVisibility)) return json({ error: 'Preferencias de privacidad inválidas.' }, 400);
      auth.user.socialPrivacy = { friendRequests: body.friendRequests, profileVisibility: body.profileVisibility };
      auth.user.updatedAt = Date.now();
      await USERS.setJSON(`user/${auth.user.id}`, auth.user);
      return json({ ok: true, privacy: auth.user.socialPrivacy });
    }

    if (action === 'request') {
      const target = await resolveUser(cleanText(body.username, 120));
      const rate = await enforceRateLimit(req, 'friendRequest', auth.user.id, { strict: true });
      if (!target || target.id === auth.user.id) { await recordRateLimitFailure(rate); return json({ error: target ? 'No puedes enviarte una solicitud.' : 'Usuario no encontrado.' }, target ? 400 : 404); }
      if (await isBlockedBetween(auth.user.id, target.id)) return json({ error: 'Esta interacción no está disponible.' }, 403);
      if (target.socialPrivacy?.friendRequests === 'nobody') return json({ error: 'Este usuario no acepta solicitudes.' }, 403);
      if (await relationship(auth.user.id, target.id) === 'friend') return json({ error: 'Ya son amigos.' }, 409);
      const requests = await listRows(FRIENDS, 'requests/');
      if (requests.some(row => row.status === 'pending' && pairKey(row.fromUserId, row.toUserId) === pairKey(auth.user.id, target.id))) return json({ error: 'Ya existe una solicitud pendiente.' }, 409);
      const now = Date.now();
      const row = { schemaVersion: 1, requestId: randomUUID(), fromUserId: auth.user.id, toUserId: target.id, status: 'pending', createdAt: now, updatedAt: now };
      await FRIENDS.setJSON(`requests/${row.requestId}`, row);
      await createNotification(target.id, { type: 'friend_request', title: 'Nueva solicitud de amistad', message: `${cleanText(auth.user.displayName || auth.user.username, 60)} quiere añadirte.`, resourceType: 'friend_request', resourceId: row.requestId });
      return json({ ok: true, requestId: row.requestId }, 201);
    }

    if (['accept', 'reject', 'cancel'].includes(action)) {
      const id = cleanText(body.requestId, 80);
      const row = await FRIENDS.get(`requests/${id}`, { type: 'json', consistency: 'strong' });
      if (!row || row.status !== 'pending') return json({ error: 'Solicitud no encontrada.' }, 404);
      const canRespond = row.toUserId === auth.user.id && ['accept', 'reject'].includes(action);
      const canCancel = row.fromUserId === auth.user.id && action === 'cancel';
      if (!canRespond && !canCancel) return json({ error: 'No tienes permiso para modificar esta solicitud.' }, 403);
      if (await isBlockedBetween(row.fromUserId, row.toUserId)) return json({ error: 'Esta interacción no está disponible.' }, 403);
      row.status = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'cancelled'; row.updatedAt = Date.now();
      await FRIENDS.setJSON(`requests/${id}`, row);
      if (action === 'accept') {
        await FRIENDS.setJSON(`friendships/${pairKey(row.fromUserId, row.toUserId)}`, { schemaVersion: 1, userIds: [row.fromUserId, row.toUserId], status: 'accepted', createdAt: row.updatedAt });
        await createNotification(row.fromUserId, { type: 'friend_accepted', title: 'Solicitud aceptada', message: `${cleanText(auth.user.displayName || auth.user.username, 60)} aceptó tu solicitud.`, resourceType: 'profile', resourceId: cleanText(auth.user.username, 20) });
      }
      return json({ ok: true, status: row.status });
    }

    const target = await resolveUser(cleanText(body.username, 120));
    if (!target || target.id === auth.user.id) return json({ error: 'Usuario inválido.' }, 400);
    const key = pairKey(auth.user.id, target.id);
    if (action === 'remove') {
      const row = await FRIENDS.get(`friendships/${key}`, { type: 'json', consistency: 'strong' });
      if (!row || row.status !== 'accepted') return json({ error: 'Amistad no encontrada.' }, 404);
      await FRIENDS.setJSON(`friendships/${key}`, { ...row, status: 'removed', updatedAt: Date.now() });
      return json({ ok: true });
    }
    if (action === 'block') {
      await FRIENDS.setJSON(`blocks/${auth.user.id}/${target.id}`, { schemaVersion: 1, blockerUserId: auth.user.id, blockedUserId: target.id, blockedUsername: cleanText(target.username, 20), createdAt: Date.now() });
      const existing = await FRIENDS.get(`friendships/${key}`, { type: 'json', consistency: 'strong' });
      if (existing) await FRIENDS.setJSON(`friendships/${key}`, { ...existing, status: 'blocked', updatedAt: Date.now() });
      const requests = await listRows(FRIENDS, 'requests/');
      await Promise.all(requests.filter(row => row.status === 'pending' && pairKey(row.fromUserId, row.toUserId) === key).map(row => FRIENDS.setJSON(`requests/${row.requestId}`, { ...row, status: 'blocked', updatedAt: Date.now() })));
      return json({ ok: true });
    }
    if (action === 'unblock') {
      const block = await FRIENDS.get(`blocks/${auth.user.id}/${target.id}`, { type: 'json', consistency: 'strong' });
      if (!block) return json({ error: 'Bloqueo no encontrado.' }, 404);
      await FRIENDS.delete(`blocks/${auth.user.id}/${target.id}`);
      return json({ ok: true });
    }
    return json({ error: 'Acción desconocida.' }, 400);
  } catch (error) {
    if (error instanceof RateLimitError || error?.status === 429) return json({ error: error.message }, 429, { 'retry-after': String(error.retryAfterSeconds || 60) });
    console.error('friends function error', { name: error?.name || 'Error' });
    return json({ error: 'No se pudo procesar Amigos.' }, 500);
  }
};
