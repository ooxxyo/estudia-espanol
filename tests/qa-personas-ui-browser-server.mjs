import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { getStore, __resetAll, __STUDY_HUB_TEST_BLOBS__ } from '@netlify/blobs';
import ui from '../netlify/functions/qa-personas-ui.mjs';
import reset from '../netlify/functions/qa-reset.mjs';
import account from '../netlify/functions/account.mjs';
import { createSession, hashSecret, COOKIE } from '../netlify/functions/_shared/auth.mjs';

if (__STUDY_HUB_TEST_BLOBS__ !== true || process.env.STUDY_HUB_ENV !== 'qa') throw new Error('QA UI preview requires QA and in-memory Blobs.');
Object.assign(process.env, { QA_TOOLS_ENABLED: 'true', OWNER_USERNAME: 'qa-owner', ADMIN_USERNAMES: 'qa-admin' });
__resetAll();
const users = getStore('study-hub-users-v1');
for (const username of ['qa-owner', 'qa-admin', 'qa-student', 'qa-student-new', 'qa-suspended']) {
  const row = { id: username, username, normalizedUsername: username, status: 'active', sessionVersion: 1, password: hashSecret('Fictitious-browser-test!'), recovery: hashSecret('Fictitious-recovery!') };
  await users.setJSON(`user/${username}`, row);
  await users.setJSON(`username/${username}`, { userId: username });
}
const handlers = new Map([['qa-personas-ui', ui], ['qa-reset', reset], ['account', account]]);
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:8877');
    if (url.pathname === '/__fixture/owner') {
      const token = await createSession(await users.get('user/qa-owner'));
      res.writeHead(302, { location: '/.netlify/functions/qa-personas-ui', 'set-cookie': `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax` }); res.end(); return;
    }
    if (url.pathname.startsWith('/.netlify/functions/')) {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const payload = Buffer.concat(chunks);
      const handler = handlers.get(url.pathname.split('/').at(-1));
      if (!handler) { res.writeHead(404); res.end(); return; }
      const response = await handler(new Request(url, { method: req.method, headers: req.headers, ...(payload.length ? { body: payload } : {}) }));
      // Test loopback uses HTTP; remove Secure only from this synthetic fixture response.
      const headers = Object.fromEntries(response.headers);
      if (headers['set-cookie']) headers['set-cookie'] = headers['set-cookie'].replace('; Secure', '');
      res.writeHead(response.status, headers); res.end(Buffer.from(await response.arrayBuffer())); return;
    }
    if (['/js/qa-personas-ui.mjs', '/css/qa-personas-ui.css'].includes(url.pathname)) {
      const data = await readFile(new URL(`../public${url.pathname}`, import.meta.url));
      res.writeHead(200, { 'content-type': url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript' }); res.end(data); return;
    }
    res.writeHead(404); res.end();
  } catch { res.writeHead(500); res.end('Local fixture error'); }
}).listen(8877, '127.0.0.1');
