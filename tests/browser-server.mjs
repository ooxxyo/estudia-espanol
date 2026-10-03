import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import * as blobs from '@netlify/blobs';
import {
  assertBrowserTestSafety,
  configureLocalTestEnvironment,
  resetBrowserFixtures,
} from './browser-harness.mjs';

assertBrowserTestSafety(process.env, blobs.__STUDY_HUB_TEST_BLOBS__);
configureLocalTestEnvironment(process.env);

const [
  { default: accountHandler },
  { default: adminHandler },
  { default: feedbackHandler },
  { default: featuresHandler },
  { default: leaderboardHandler },
  { default: presenceHandler },
  { default: communityHandler },
  { default: calendarHandler },
  { default: friendsHandler },
  { default: notificationsHandler },
  { default: roadmapHandler },
  { default: searchHandler },
  { default: moderationHandler },
  { default: groupsHandler },
  { default: bugsHandler },
  { default: qaToolsHandler },
  auth,
] = await Promise.all([
  import('../netlify/functions/account.mjs'),
  import('../netlify/functions/admin.mjs'),
  import('../netlify/functions/feedback.mjs'),
  import('../netlify/functions/features.mjs'),
  import('../netlify/functions/leaderboard.mjs'),
  import('../netlify/functions/presence.mjs'),
  import('../netlify/functions/community.mjs'),
  import('../netlify/functions/calendar.mjs'),
  import('../netlify/functions/friends.mjs'),
  import('../netlify/functions/notifications.mjs'),
  import('../netlify/functions/roadmap.mjs'),
  import('../netlify/functions/search.mjs'),
  import('../netlify/functions/moderation.mjs'),
  import('../netlify/functions/groups.mjs'),
  import('../netlify/functions/bugs.mjs'),
  import('../netlify/functions/qa-tools.mjs'),
  import('../netlify/functions/_shared/auth.mjs'),
]);

const { COOKIE, createSession, setSessionCookie } = auth;
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
  ['/qa-tools', qaToolsHandler],
]);

const fixtures = await resetBrowserFixtures(blobs);
const ownerToken = await createSession(fixtures.personas['qa-owner']);
const superdevToken = await createSession(fixtures.superdev, true, { superdevAuthenticated: true });
const fixtureDate = offset => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const fixtureRequest = body => new Request('http://127.0.0.1:8765/.netlify/functions/fixture', {
  method: 'POST',
  headers: { 'content-type': 'application/json', cookie: `${COOKIE}=${ownerToken}` },
  body: JSON.stringify(body),
});
await communityHandler(fixtureRequest({ action: 'create', subjectId: 'historia', date: fixtureDate(0), type: 'announcement', title: 'Ejemplo local de comunidad', text: 'Datos sintéticos para revisar diseño, autor, comentarios y acciones. No es material académico.' }));
for (const offset of [-1, 0, 1]) {
  await calendarHandler(fixtureRequest({ action: 'create-event', subjectId: 'historia', date: fixtureDate(offset), type: 'announcement', title: `Evento local de prueba (${offset})`, description: 'Ejemplo visual en memoria; no representa una fecha escolar real.' }));
}
await blobs.getStore('study-hub-presence-v1').setJSON('heartbeat/friend_online_test', { at: Date.now(), userId: 'qa-student', section: 'dashboard', subjectId: 'espanol', unitId: 'espanol-unidad-actual', clientKind: 'mobile' });
await blobs.getStore('study-hub-feedback-v1').setJSON('reports/feedback-test', { id: 'feedback-test', type: 'suggestion', title: 'Mejorar acceso rápido', message: 'Sería útil mantener visible el acceso durante la práctica.', userId: 'qa-student', username: 'qa-student', displayName: 'QA Student', status: 'new', subjectId: 'espanol', unitId: 'espanol-unidad-actual', createdAt: Date.now(), updatedAt: Date.now() });

async function asRequest(req, body) {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1:8765'}`);
  return new Request(url, { method: req.method, headers: req.headers, body: body.length ? body : undefined });
}

function sendResponse(res, response) {
  return response.arrayBuffer().then(buffer => {
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    res.end(Buffer.from(buffer));
  });
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1:8765'}`);
    if (url.pathname === '/__test/superdev') {
      res.writeHead(302, { location: '/', 'set-cookie': setSessionCookie(superdevToken, true).replace('; Secure', '') });
      res.end();
      return;
    }
    if (url.pathname.startsWith('/__test/persona/')) {
      const id = decodeURIComponent(url.pathname.slice('/__test/persona/'.length));
      const persona = fixtures.personas[id];
      if (!persona) { res.writeHead(404); res.end('Unknown test persona'); return; }
      const token = await createSession(persona);
      res.writeHead(302, { location: '/', 'set-cookie': setSessionCookie(token, true).replace('; Secure', '') });
      res.end();
      return;
    }
    if (url.pathname.startsWith('/.netlify/functions/')) {
      const handler = handlers.get(`/${url.pathname.split('/').pop()}`);
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
}).listen(8765, '127.0.0.1', () => console.log('Study Hub local-test server: http://127.0.0.1:8765'));
