import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import accountHandler from '../netlify/functions/account.mjs';
import adminHandler from '../netlify/functions/admin.mjs';
import feedbackHandler from '../netlify/functions/feedback.mjs';
import featuresHandler from '../netlify/functions/features.mjs';
import leaderboardHandler from '../netlify/functions/leaderboard.mjs';
import presenceHandler from '../netlify/functions/presence.mjs';
import communityHandler from '../netlify/functions/community.mjs';
import calendarHandler from '../netlify/functions/calendar.mjs';
import friendsHandler from '../netlify/functions/friends.mjs';
import notificationsHandler from '../netlify/functions/notifications.mjs';
import roadmapHandler from '../netlify/functions/roadmap.mjs';
import searchHandler from '../netlify/functions/search.mjs';
import moderationHandler from '../netlify/functions/moderation.mjs';
import groupsHandler from '../netlify/functions/groups.mjs';
import bugsHandler from '../netlify/functions/bugs.mjs';
import { USERS, COOKIE, createSession, setSessionCookie } from '../netlify/functions/_shared/auth.mjs';
import { getStore } from '@netlify/blobs';

const root = path.resolve(import.meta.dirname, '..');
const handlers = new Map([
  ['/account', accountHandler],
  ['/admin', adminHandler],
  ['/feedback', feedbackHandler],
  ['/features', featuresHandler],
  ['/leaderboard', leaderboardHandler],
  ['/presence', presenceHandler],
  ['/community', communityHandler],
  ['/calendar', calendarHandler],
  ['/friends', friendsHandler],
  ['/notifications', notificationsHandler],
  ['/roadmap', roadmapHandler],
  ['/search', searchHandler],
  ['/moderation', moderationHandler],
  ['/groups', groupsHandler],
  ['/bugs', bugsHandler],
]);

async function seedUser(user) {
  const row = { sessionVersion: 1, status: 'active', createdAt: Date.now() - 86_400_000, updatedAt: Date.now() - 60_000, normalizedUsername: user.username.toLowerCase(), ...user };
  await USERS.setJSON(`user/${row.id}`, row);
  await USERS.setJSON(`username/${row.normalizedUsername}`, { userId: row.id });
  if (row.email) await USERS.setJSON(`email/${row.email.toLowerCase()}`, { userId: row.id });
  return row;
}

const superdev = await seedUser({ id: 'superdev-test', username: 'superdev', displayName: 'Super Dev' });
await seedUser({ id: 'old-test', username: 'cuentaantigua', email: 'antigua@example.test' });
await seedUser({ id: 'new-test', username: 'cuentanueva', displayName: 'Amiga Nueva', email: 'nueva@example.test', veteran: true, entitlement: 'veteran', visibleRank: 'Veterano' });
await seedUser({ id: 'admin-test', username: 'adminamigo', displayName: 'Admin Amigo', securityRole: 'admin' });
const token = await createSession(superdev, true, { superdevAuthenticated: true });
// Synthetic UI fixtures; the loader keeps these outside real Netlify stores.
const fixtureDate = offset => { const date = new Date(); date.setDate(date.getDate() + offset); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; };
const fixtureRequest = body => new Request('http://127.0.0.1:8765/.netlify/functions/fixture', { method: 'POST', headers: { 'content-type': 'application/json', cookie: `${COOKIE}=${token}` }, body: JSON.stringify(body) });
await communityHandler(fixtureRequest({ action: 'create', subjectId: 'historia', date: fixtureDate(0), type: 'announcement', title: 'Ejemplo local de comunidad', text: 'Datos sintéticos para revisar diseño, autor, comentarios y acciones. No es material académico.' }));
for (const offset of [-1,0,1]) await calendarHandler(fixtureRequest({ action: 'create-event', subjectId: 'historia', date: fixtureDate(offset), type: 'announcement', title: `Evento local de prueba (${offset})`, description: 'Ejemplo visual en memoria; no representa una fecha escolar real.' }));
await getStore('study-hub-presence-v1').setJSON('heartbeat/friend_online_test', { at: Date.now(), userId: 'new-test', section: 'dashboard', subjectId: 'espanol', unitId: 'espanol-unidad-actual', clientKind: 'mobile' });
await getStore('study-hub-feedback-v1').setJSON('reports/feedback-test', { id: 'feedback-test', type: 'suggestion', title: 'Mejorar acceso rápido', message: 'Sería útil mantener visible el acceso durante la práctica.', userId: 'new-test', username: 'cuentanueva', displayName: 'Amiga Nueva', status: 'new', subjectId: 'espanol', unitId: 'espanol-unidad-actual', createdAt: Date.now(), updatedAt: Date.now() });

async function asRequest(req, body) {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1:8765'}`);
  return new Request(url, { method: req.method, headers: req.headers, body: body.length ? body : undefined });
}

function sendResponse(res, response) {
  return response.arrayBuffer().then(buffer => {
    const headers = Object.fromEntries(response.headers.entries());
    res.writeHead(response.status, headers);
    res.end(Buffer.from(buffer));
  });
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1:8765'}`);
    if (url.pathname === '/__test/superdev') {
      res.writeHead(302, { location: '/', 'set-cookie': setSessionCookie(token, true).replace('; Secure', '') });
      res.end();
      return;
    }
    if (url.pathname.startsWith('/.netlify/functions/')) {
      const name = `/${url.pathname.split('/').pop()}`;
      const handler = handlers.get(name);
      if (!handler) { res.writeHead(404); res.end('Not found'); return; }
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      await sendResponse(res, await handler(await asRequest(req, Buffer.concat(chunks))));
      return;
    }
    const relative = url.pathname === '/' ? 'public/index.html' : `public/${url.pathname.replace(/^\//, '')}`;
    const file = path.resolve(root, relative);
    if (!file.startsWith(path.resolve(root, 'public'))) { res.writeHead(403); res.end('Forbidden'); return; }
    const data = await readFile(file);
    const type = file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'application/octet-stream';
    res.writeHead(200, { 'content-type': type });
    res.end(data);
  } catch (error) {
    res.writeHead(error?.code === 'ENOENT' ? 404 : 500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Test server error');
  }
}).listen(8765, '127.0.0.1', () => console.log('Study Hub test server: http://127.0.0.1:8765'));
