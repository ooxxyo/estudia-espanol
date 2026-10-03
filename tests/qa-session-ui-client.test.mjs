import test from 'node:test';
import assert from 'node:assert/strict';
let mount;
try { ({ mountQaSessionUI: mount } = await import('../public/js/qa-session-ui.mjs')); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; }
function fixture() {
  assert.equal(typeof mount, 'function', 'Automated QA logout client missing');
  const button = { disabled: true, hidden: false, addEventListener(event, action) { this[event] = action; } };
  const status = { textContent: '', dataset: {} }; const identity = { textContent: '' };
  return { button, status, identity, root: { querySelector(selector) { return ({ '#qa-session-logout': button, '#qa-session-status': status, '#qa-session-identity': identity })[selector]; } } };
}
function response(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }); }
const active = { authenticated: true, user: { username: 'qa-student-new', id: 'member-id' } };

test('closes current session once and certifies it through the real account GET', async () => {
  const f = fixture(); const sent = [];
  const control = mount(f.root, async (url, options) => { sent.push({ url, options }); return response(sent.length === 1 ? active : sent.length === 2 ? { ok: true } : { authenticated: false }); });
  await control.ready; assert.equal(f.button.disabled, false); assert.match(f.identity.textContent, /qa-student-new/);
  await f.button.click(); await f.button.click();
  assert.deepEqual(sent.map(c => c.url), ['/.netlify/functions/account', '/.netlify/functions/qa-session-ui', '/.netlify/functions/account']);
  assert.deepEqual(JSON.parse(sent[1].options.body), { action: 'logout' });
  assert.equal(sent[1].options.method, 'POST');
  for (const c of sent) { assert.equal(c.options.credentials, 'same-origin'); assert.equal(c.options.cache, 'no-store'); assert.equal(c.options.redirect, 'error'); }
  assert.equal(f.status.dataset.state, 'closed'); assert.equal(f.identity.textContent, ''); assert.equal(f.button.disabled, true);
});

test('anonymous account is certified closed without another logout', async () => {
  const f = fixture(); let calls = 0;
  const control = mount(f.root, async () => { calls++; return response({ authenticated: false }); });
  await control.ready; await f.button.click();
  assert.equal(calls, 1); assert.equal(f.status.dataset.state, 'closed'); assert.equal(f.button.disabled, true);
});

test('suspended account response does not certify logout until the real current session is terminated', async () => {
  const f = fixture(); let calls = 0;
  const control = mount(f.root, async () => {
    calls++;
    return response(calls === 1 ? { authenticated: false, reason: 'suspended' } : calls === 2 ? { ok: true } : { authenticated: false });
  });
  await control.ready; assert.equal(f.status.dataset.state, 'active'); assert.equal(f.button.disabled, false);
  await f.button.click(); assert.equal(calls, 3); assert.equal(f.status.dataset.state, 'closed');
});

test('failed initial account check fails closed and exposes no received error details', async () => {
  for (const reply of [() => response({ error: 'Secret detail' }, 500), () => response({}), () => { throw new Error('Token or callback URL'); }]) {
    const f = fixture(); let calls = 0;
    const control = mount(f.root, async () => { calls++; return reply(); });
    await control.ready; await f.button.click();
    assert.equal(calls, 1); assert.equal(f.status.dataset.state, 'stopped'); assert.equal(f.button.disabled, true);
    assert.doesNotMatch(f.status.textContent, /Secret detail|Token|callback/);
  }
});

test('failed logout or a still-active/malformed verification stops without retrying', async () => {
  for (const failedAt of ['post', 'still-active', 'suspended', 'malformed', 'get-error']) {
    const f = fixture(); let calls = 0;
    const control = mount(f.root, async () => {
      calls++;
      if (calls === 1) return response(active);
      if (calls === 2) return response(failedAt === 'post' ? { ok: false } : { ok: true }, failedAt === 'post' ? 404 : 200);
      return response(failedAt === 'still-active' ? active : failedAt === 'suspended' ? { authenticated: false, reason: 'suspended' } : {}, failedAt === 'get-error' ? 500 : 200);
    });
    await control.ready; await f.button.click(); await f.button.click();
    assert.equal(calls, failedAt === 'post' ? 2 : 3); assert.equal(f.status.dataset.state, 'stopped'); assert.equal(f.button.disabled, true);
  }
});

test('a double click while logout is pending cannot send two mutations', async () => {
  const f = fixture(); let posts = 0; let resolvePost;
  const control = mount(f.root, async (url, options) => {
    if (options.method === 'POST') { posts++; return new Promise(resolve => { resolvePost = resolve; }); }
    return response(posts ? { authenticated: false } : active);
  });
  await control.ready; const first = f.button.click(); await f.button.click();
  assert.equal(posts, 1); resolvePost(response({ ok: true })); await first; assert.equal(f.status.dataset.state, 'closed');
});
