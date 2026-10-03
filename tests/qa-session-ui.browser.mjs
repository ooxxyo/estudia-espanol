// Loopback only, fictitious data, in-memory Blobs; never uses the user's browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { __STUDY_HUB_TEST_BLOBS__, __resetAll, __inspectionSnapshot, getStore } from '@netlify/blobs';
import { USERS, createSession, COOKIE, tokenHash } from '../netlify/functions/_shared/auth.mjs';
import account from '../netlify/functions/account.mjs';
let ui;
try { ({ default: ui } = await import('../netlify/functions/qa-session-ui.mjs')); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; }

for (const viewport of [{ name: 'desktop', width: 1280, height: 800 }, { name: 'mobile', width: 390, height: 844 }, { name: 'suspended', width: 390, height: 844, suspended: true }]) {
  test(`real current-session logout and account verification preserve academic storage and Netlify cookie (${viewport.name})`, async () => {
    assert.equal(typeof ui, 'function', 'QA session page missing');
    assert.equal(__STUDY_HUB_TEST_BLOBS__, true);
    __resetAll(); Object.assign(process.env, { STUDY_HUB_ENV: 'qa', QA_TOOLS_ENABLED: 'true' });
    const member = { id: 'fictitious-member', username: 'qa-student-new', status: viewport.suspended ? 'suspended' : 'active', sessionVersion: 1 };
    await USERS.setJSON('user/fictitious-member', member);
    await USERS.setJSON('user/protected', { id: 'protected', username: 'testmem', sessionVersion: 2, status: 'active' });
    await getStore('study-hub-progress-v1').setJSON('user/fictitious-member', { state: { totalAnswered: 4 }, updatedAt: 7 });
    await getStore('study-hub-progress-v1').setJSON('user/protected', { state: { totalAnswered: 10 }, updatedAt: 8 });
    await getStore('study-hub-feedback-v1').setJSON('keep', { unchanged: true });
    const token = await createSession(member, false);
    await createSession(member, false); await createSession(await USERS.get('user/protected'), false);
    const before = __inspectionSnapshot();
    const requests = [];
    const server = http.createServer(async (incoming, outgoing) => {
      try {
        const url = new URL(incoming.url, `http://127.0.0.1:${server.address().port}`);
        requests.push({ path: url.pathname, method: incoming.method });
        if (url.pathname === '/__fixture/member') {
          outgoing.writeHead(302, { location: '/.netlify/functions/qa-session-ui', 'set-cookie': `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax` }); outgoing.end(); return;
        }
        if (url.pathname === '/js/qa-session-ui.mjs') {
          outgoing.writeHead(200, { 'content-type': 'text/javascript' }); outgoing.end(await readFile(new URL('../public/js/qa-session-ui.mjs', import.meta.url))); return;
        }
        const handler = url.pathname === '/.netlify/functions/qa-session-ui' ? ui : url.pathname === '/.netlify/functions/account' ? account : null;
        if (!handler) { outgoing.writeHead(404); outgoing.end(); return; }
        const chunks = []; for await (const chunk of incoming) chunks.push(chunk);
        const body = Buffer.concat(chunks);
        const result = await handler(new Request(url, { method: incoming.method, headers: incoming.headers, ...(body.length ? { body } : {}) }));
        const headers = Object.fromEntries(result.headers);
        // Secure remains mandatory in product; this fixture alone runs over HTTP loopback.
        if (headers['set-cookie']) headers['set-cookie'] = headers['set-cookie'].replace('; Secure', '');
        outgoing.writeHead(result.status, headers); outgoing.end(Buffer.from(await result.arrayBuffer()));
      } catch { outgoing.writeHead(500); outgoing.end('Fictitious fixture failed'); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      await context.addCookies([{ name: 'netlify_fixture', value: 'fictitious-unrelated-session', domain: 'app.netlify.test', path: '/', httpOnly: true, secure: true }]);
      const netlifyBefore = await context.cookies('https://app.netlify.test');
      const page = await context.newPage();
      const dialogs = []; page.on('dialog', async dialog => { dialogs.push(dialog.type()); await dialog.dismiss(); });
      await page.goto(`http://127.0.0.1:${server.address().port}/__fixture/member`);
      await page.locator('#qa-session-status[data-state="active"]').waitFor();
      await page.evaluate(() => {
        localStorage.setItem('cuaderno_espanol_hub_progress_v1', JSON.stringify({ progress: 'fictitious', theme: 'dark', practice: 'paused' }));
        localStorage.setItem('cuaderno_espanol_v12', 'fictitious-legacy');
        localStorage.setItem('cuaderno_espanol_v12_backup', 'fictitious-backup');
        sessionStorage.setItem('studyHubQaToolsVisible', 'true');
      });
      const localBefore = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
      await page.getByRole('button', { name: 'Cerrar sesión QA', exact: true }).click();
      await page.locator('#qa-session-status[data-state="closed"]').waitFor();
      assert.deepEqual(dialogs, []);
      assert.deepEqual(await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } })), localBefore);
      assert.deepEqual(await context.cookies('https://app.netlify.test'), netlifyBefore);
      assert.equal((await context.cookies(`http://127.0.0.1:${server.address().port}`)).some(c => c.name === COOKIE), false);
      const expected = structuredClone(before);
      const sessions = expected.find(([name]) => name === 'study-hub-sessions-v1');
      sessions[1] = sessions[1].filter(([key]) => key !== `session/${tokenHash(token)}`);
      assert.deepEqual(__inspectionSnapshot(), expected);
      const accountResponse = await context.request.get(`http://127.0.0.1:${server.address().port}/.netlify/functions/account`);
      assert.equal((await accountResponse.json()).authenticated, false);
      const mutation = requests.filter(r => r.method === 'POST');
      assert.deepEqual(mutation, [{ path: '/.netlify/functions/qa-session-ui', method: 'POST' }]);
      await page.reload(); await page.locator('#qa-session-status[data-state="closed"]').waitFor();
      assert.equal(requests.filter(r => r.method === 'POST').length, 1);
      await page.screenshot({ path: `../qa-7c-session-${viewport.name}.png`, fullPage: true });
      process.env.STUDY_HUB_ENV = 'production';
      const production = await context.request.get(`http://127.0.0.1:${server.address().port}/.netlify/functions/qa-session-ui`);
      assert.equal(production.status(), 404);
      await context.close();
    } finally {
      if (browser) await browser.close();
      await new Promise(resolve => server.close(resolve));
    }
  });
}
