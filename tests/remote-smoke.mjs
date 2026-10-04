// One assisted remote run. No product code, persistent profile or saved auth state.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDecipheriv } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createInterface } from 'node:readline';

export const QA_ORIGIN = 'https://rad-cajeta-60f537.netlify.app';
export const OWNER_ID = 'cde6534d-5904-48a6-9280-225951566df3';
const READS = new Set(['account', 'features', 'qa-tools', 'qa-personas-ui', 'qa-session-ui']);
const STAGES = new Set(['configuration', 'human_browser_checkpoint', 'netlify_auth', 'desktop', 'mobile', 'owner_login', 'owner_version', 'logout', 'complete']);
const CHECKS = ['privateAccess', 'desktop', 'mobile', 'ownerAccount', 'ownerVersion', 'qaTools', 'emptyBaseline', 'logout', 'noCriticalErrors', 'noAcademicWrites', 'owner'];
const AUTH_HOSTS = new Set(['app.netlify.com', 'github.com', 'gitlab.com', 'bitbucket.org', 'accounts.google.com']);
export const AUTH_WAIT_TIMEOUT_MS = 15 * 60_000;
const AUTH_NAVIGATION_TIMEOUT_MS = 60_000;
export const SMOKE_NAVIGATION_TIMEOUT_MS = 30_000;
const HUMAN_AUTH_MESSAGE = 'WAITING_FOR_HUMAN_AUTH\nCompleta ahora el login normal de Netlify en ESTA ventana.\nCuando termines, deja la ventana abierta.\n';
const HUMAN_CHECKPOINT_MESSAGE = 'CHECKPOINT_HUMAN_BROWSER\nChromium está abierto.\nConfirma si puedes ver y utilizar ESTA ventana:\nhacer clic y escribir.\nDéjala abierta.\n';
const HOST_CATEGORIES = new Set(['netlify', 'qa_target', 'github_auth', 'google_auth', 'gitlab_auth', 'bitbucket_auth', 'unknown']);
const RESOURCE_TYPES = new Set(['document', 'stylesheet', 'image', 'media', 'font', 'script', 'texttrack', 'xhr', 'fetch', 'eventsource', 'websocket', 'manifest', 'other']);
const DECISIONS = new Set(['continue', 'deny', 'exclude_presence']);
const AUTH_CODES = ['AUTH_PAGE_CLOSED', 'AUTH_CONTEXT_CLOSED', 'AUTH_BROWSER_CLOSED', 'AUTH_NAVIGATION_FAILED', 'AUTH_INTERRUPTED', 'AUTH_UNKNOWN_FAILURE'];
const CODES = new Set(['TARGET_REJECTED', 'CONFIGURATION_MISSING', 'REPORT_PATH_REJECTED', 'VAULT_INVALID', 'VAULT_UNAVAILABLE', 'READ_TARGET_REJECTED', 'READ_FAILED', 'READ_HTTP_FAILED', 'READ_JSON_FAILED', 'OWNER_ACCOUNT_INVALID', 'OWNER_BASELINE_CHANGED', 'OWNER_VERSION_INVALID', 'QA_TOOLS_INVALID', 'ANONYMOUS_ACCOUNT_INVALID', 'UNEXPECTED_REQUEST', 'CRITICAL_BROWSER_ERROR', 'NAVIGATION_FAILED', 'UNEXPECTED_REDIRECT', 'MOBILE_OVERFLOW', 'AUTH_TIMEOUT', 'LOGOUT_FAILED', 'ATTESTATION_FAILED', 'UNEXPECTED_FAILURE']);
for (const code of AUTH_CODES) CODES.add(code);
CODES.add('HUMAN_BROWSER_UNUSABLE');
class SmokeError extends Error {
  constructor(code) { super(code); this.code = CODES.has(code) ? code : 'UNEXPECTED_FAILURE'; }
}
function requireCondition(condition, code) { if (!condition) throw new SmokeError(code); }

// Diagnostic families only. This table does not authorize any destination.
function authHostCategory(value) {
  let url;
  try { url = new URL(value); } catch { return 'unknown'; }
  if (url.origin === QA_ORIGIN) return 'qa_target';
  const families = [
    ['netlify', ['netlify.com']],
    ['github_auth', ['github.com', 'githubassets.com', 'githubusercontent.com']],
    ['google_auth', ['google.com', 'googleapis.com', 'gstatic.com']],
    ['gitlab_auth', ['gitlab.com']],
    ['bitbucket_auth', ['bitbucket.org']],
  ];
  return families.find(([, domains]) => domains.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`)))?.[0] || 'unknown';
}

export function createAuthRequestCounter() {
  const counts = new Map();
  return {
    record({ url, resourceType, decision }) {
      if (!DECISIONS.has(decision)) return;
      const hostCategory = authHostCategory(url);
      const type = RESOURCE_TYPES.has(resourceType) ? resourceType : 'other';
      const key = `${hostCategory}|${type}|${decision}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    },
    snapshot() {
      return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([key, count]) => {
        const [hostCategory, resourceType, decision] = key.split('|');
        return { phase: 'netlify_auth', hostCategory, resourceType, decision, count };
      });
    },
  };
}

export function classifyAuthFailure(error, signals, TimeoutError) {
  if (signals.browserClosed === true) return 'AUTH_BROWSER_CLOSED';
  if (signals.contextClosed === true) return 'AUTH_CONTEXT_CLOSED';
  if (signals.pageClosed === true) return 'AUTH_PAGE_CLOSED';
  if (signals.interrupted === true) return 'AUTH_INTERRUPTED';
  if (signals.navigationFailed === true) return 'AUTH_NAVIGATION_FAILED';
  if (typeof TimeoutError === 'function' && error instanceof TimeoutError) return 'AUTH_TIMEOUT';
  return 'AUTH_UNKNOWN_FAILURE';
}

export function observeAuthLifecycle(browser, context, page, signalSource = process) {
  const signals = {};
  const listeners = [];
  const stop = new Promise((_, reject) => {
    for (const [source, event, flag, code] of [
      [browser, 'disconnected', 'browserClosed', 'AUTH_BROWSER_CLOSED'],
      [context, 'close', 'contextClosed', 'AUTH_CONTEXT_CLOSED'],
      [page, 'close', 'pageClosed', 'AUTH_PAGE_CLOSED'],
      [signalSource, 'SIGINT', 'interrupted', 'AUTH_INTERRUPTED'],
      [signalSource, 'SIGTERM', 'interrupted', 'AUTH_INTERRUPTED'],
    ]) {
      const listener = () => { signals[flag] = true; reject(new SmokeError(code)); };
      source.on(event, listener);
      listeners.push([source, event, listener]);
    }
  });
  return { signals, stop, dispose() { for (const [source, event, listener] of listeners) source.removeListener(event, listener); } };
}

export async function waitForHumanAuth(page, { signals, TimeoutError, stop, onWaiting = message => process.stdout.write(message) }) {
  try {
    onWaiting(HUMAN_AUTH_MESSAGE);
    const ready = page.getByRole('heading', { name: '¿Qué estudiamos hoy?', exact: true }).waitFor({ state: 'visible', timeout: AUTH_WAIT_TIMEOUT_MS });
    await (stop ? Promise.race([ready, stop]) : ready);
  } catch (error) { throw new SmokeError(classifyAuthFailure(error, signals, TimeoutError)); }
  requireCondition(new URL(page.url()).origin === QA_ORIGIN, 'UNEXPECTED_REDIRECT');
}

async function waitForHumanCheckpoint({ input, onCheckpoint, lifecycle, TimeoutError }) {
  onCheckpoint(HUMAN_CHECKPOINT_MESSAGE);
  const reader = createInterface({ input, terminal: false });
  try {
    const line = await Promise.race([
      new Promise((resolve, reject) => {
        reader.once('line', resolve);
        reader.once('close', () => reject(new SmokeError('AUTH_UNKNOWN_FAILURE')));
      }),
      lifecycle.stop,
    ]);
    if (line === 'ABORT') throw new SmokeError('HUMAN_BROWSER_UNUSABLE');
    requireCondition(line === 'CONTINUE', 'AUTH_UNKNOWN_FAILURE');
  } catch (error) {
    if (error instanceof SmokeError && error.code === 'HUMAN_BROWSER_UNUSABLE') throw error;
    throw new SmokeError(classifyAuthFailure(error, lifecycle.signals, TimeoutError));
  } finally { reader.close(); }
}

export async function authenticateWithCheckpoint({ browser, context, page }, {
  TimeoutError, input = process.stdin, signalSource = process,
  onCheckpoint = message => process.stdout.write(message), onContinue = () => {}, onWaiting,
}) {
  const lifecycle = observeAuthLifecycle(browser, context, page, signalSource);
  try {
    await waitForHumanCheckpoint({ input, onCheckpoint, lifecycle, TimeoutError });
    onContinue();
    try { await Promise.race([page.goto(QA_ORIGIN, { waitUntil: 'domcontentloaded', timeout: AUTH_NAVIGATION_TIMEOUT_MS }), lifecycle.stop]); }
    catch (error) { throw new SmokeError(classifyAuthFailure(error, { ...lifecycle.signals, navigationFailed: true }, TimeoutError)); }
    await waitForHumanAuth(page, { signals: lifecycle.signals, TimeoutError, stop: lifecycle.stop, onWaiting });
  } finally { lifecycle.dispose(); }
}

export function assertTarget(value) {
  let url;
  try { url = new URL(value); } catch { throw new SmokeError('TARGET_REJECTED'); }
  requireCondition(url.origin === QA_ORIGIN && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/', 'TARGET_REJECTED');
  return QA_ORIGIN;
}

// Until explicit confirmation, even manual navigation must not start auth.
export function guardedRequestDecision(request, stage) {
  if (stage === 'human_browser_checkpoint') return 'deny';
  return requestDecision(request, stage);
}

export function requestDecision({ url: value, method = 'GET', body = '', navigation = false }, stage) {
  let url;
  try { url = new URL(value); } catch { return 'deny'; }
  if (url.protocol !== 'https:' || url.username || url.password) return 'deny';
  if (url.origin !== QA_ORIGIN) {
    if (stage === 'netlify_auth' && (AUTH_HOSTS.has(url.hostname) || url.hostname.endsWith('.netlify.com'))) return 'continue';
    if (!navigation && ['GET', 'HEAD'].includes(method) && (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname) || url.hostname.endsWith('.netlify.com'))) return 'continue';
    return 'deny';
  }
  if (navigation && stage !== 'netlify_auth' && url.search && url.search !== '?format=json') return 'deny';
  const endpoint = url.pathname.startsWith('/.netlify/functions/') ? url.pathname.slice('/.netlify/functions/'.length) : null;
  if (endpoint === 'presence') return 'exclude_presence';
  if (['GET', 'HEAD'].includes(method)) return endpoint === null || READS.has(endpoint) ? 'continue' : 'deny';
  if (method !== 'POST') return 'deny';
  let data;
  try { data = JSON.parse(body); } catch { return 'deny'; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'deny';
  if (endpoint === 'account' && stage === 'owner_login'
    && Object.keys(data).sort().join(',') === 'action,identifier,password,remember'
    && data.action === 'login' && data.identifier === 'qa-owner' && typeof data.password === 'string' && data.remember === false) return 'continue';
  if (endpoint === 'qa-session-ui' && stage === 'logout' && Object.keys(data).join(',') === 'action' && data.action === 'logout') return 'continue';
  return 'deny';
}

export async function readJsonOnce(requester, endpoint) {
  requireCondition(['/.netlify/functions/account', '/.netlify/functions/qa-tools', '/.netlify/functions/qa-personas-ui?format=json'].includes(endpoint), 'READ_TARGET_REJECTED');
  let response;
  try { response = await requester.get(`${QA_ORIGIN}${endpoint}`, { maxRedirects: 0, maxRetries: 0, timeout: 15_000 }); }
  catch { throw new SmokeError('READ_FAILED'); }
  try {
    requireCondition(response.status() === 200, 'READ_HTTP_FAILED');
    try { return await response.json(); } catch { throw new SmokeError('READ_JSON_FAILED'); }
  } finally { await response.dispose(); }
}

export function validateOwnerAccount(data) {
  requireCondition(data?.authenticated === true && data.user?.id === OWNER_ID && data.user.username === 'qa-owner' && data.user.status === 'active' && data.user.role === 'owner', 'OWNER_ACCOUNT_INVALID');
  requireCondition(data.cloudState === null && data.cloudUpdatedAt === 0, 'OWNER_BASELINE_CHANGED');
}

export function validateVersionEvidence(data) {
  requireCondition(data && Object.keys(data).sort().join(',') === 'id,sessionVersion,username'
    && data.id === OWNER_ID && data.username === 'qa-owner' && data.sessionVersion === 2, 'OWNER_VERSION_INVALID');
}

export function decryptOwnerEnvelope(envelope, key) {
  let plaintext;
  try {
    requireCondition(envelope?.version === 1 && envelope.project === 'rad-cajeta-60f537' && envelope.username === 'qa-owner', 'VAULT_INVALID');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
    decipher.setAAD(Buffer.from('rad-cajeta-60f537:qa-owner'));
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]);
    const data = JSON.parse(plaintext.toString('utf8'));
    requireCondition(data.username === 'qa-owner' && /^[A-Za-z0-9_-]{43}$/.test(data.password), 'VAULT_INVALID');
    return data.password;
  } catch { throw new SmokeError('VAULT_INVALID'); }
  finally { plaintext?.fill(0); }
}

async function readOwnerPassword(vault, powershell) {
  let output;
  let key;
  // Only an AES key crosses the private subprocess pipe; never plaintext credentials.
  const script = `
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Security
$rsa=[Security.Cryptography.RSA]::Create()
$private=$null; $key=$null
try {
  $envelope=[IO.File]::ReadAllText((Join-Path $env:QA_SMOKE_VAULT 'qa-owner.encrypted.json'))|ConvertFrom-Json
  if($envelope.version -ne 1 -or $envelope.project -cne 'rad-cajeta-60f537' -or $envelope.username -cne 'qa-owner'){throw 'Invalid'}
  $private=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes((Join-Path $env:QA_SMOKE_VAULT 'recipient.private.dpapi')),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  $count=0; $rsa.ImportPkcs8PrivateKey($private,[ref]$count)
  $key=$rsa.Decrypt([Convert]::FromBase64String($envelope.wrappedKey),[Security.Cryptography.RSAEncryptionPadding]::OaepSHA256)
  [Console]::Out.Write([Convert]::ToBase64String($key))
} catch { exit 1 } finally {
  foreach($bytes in @($private,$key)){if($null -ne $bytes){[Array]::Clear($bytes,0,$bytes.Length)}}
  $rsa.Dispose()
}`;
  try {
    const envelope = JSON.parse(await readFile(path.join(vault, 'qa-owner.encrypted.json'), 'utf8'));
    const result = await promisify(execFile)(powershell, ['-NoProfile', '-NonInteractive', '-Command', script], { env: { ...process.env, QA_SMOKE_VAULT: vault }, encoding: 'buffer', windowsHide: true, timeout: 15_000, maxBuffer: 4096 });
    output = result.stdout;
    key = Buffer.from(output.toString('ascii').trim(), 'base64');
    requireCondition(key.length === 32, 'VAULT_INVALID');
    return decryptOwnerEnvelope(envelope, key);
  } catch { throw new SmokeError('VAULT_UNAVAILABLE'); }
  finally { output?.fill(0); key?.fill(0); }
}

export function sanitizedReport(data) {
  const checks = Object.fromEntries(CHECKS.filter(name => typeof data.checks?.[name] === 'boolean').map(name => [name, data.checks[name]]));
  return {
    result: data.stage === 'complete' && !data.error ? 'PASS' : 'FAIL',
    stage: STAGES.has(data.stage) ? data.stage : 'configuration',
    errorCode: data.error ? data.error instanceof SmokeError ? data.error.code : 'UNEXPECTED_FAILURE' : null,
    deployId: /^[a-f0-9]{24}$/.test(data.deployId || '') ? data.deployId : null,
    commit: /^[a-f0-9]{40}$/.test(data.commit || '') ? data.commit : null,
    checks,
    authRequests: (Array.isArray(data.authRequests) ? data.authRequests : [])
      .filter(row => row?.phase === 'netlify_auth' && HOST_CATEGORIES.has(row.hostCategory) && RESOURCE_TYPES.has(row.resourceType)
        && DECISIONS.has(row.decision) && Number.isSafeInteger(row.count) && row.count > 0)
      .map(({ phase, hostCategory, resourceType, decision, count }) => ({ phase, hostCategory, resourceType, decision, count })),
    presenceExcluded: true,
    blockedPresenceRequests: Number.isSafeInteger(data.blockedPresenceRequests) ? data.blockedPresenceRequests : 0,
    unexpectedRequests: Number.isSafeInteger(data.unexpectedRequests) ? data.unexpectedRequests : 0,
    criticalBrowserErrors: Number.isSafeInteger(data.criticalBrowserErrors) ? data.criticalBrowserErrors : 0,
    permittedWrites: { ownerLogin: Number.isSafeInteger(data.loginCount) ? data.loginCount : 0, currentSessionLogout: Number.isSafeInteger(data.logoutCount) ? data.logoutCount : 0 },
    sessionVersionSource: 'focalized authenticated Netlify QA dashboard read',
    owner: data.checks?.ownerVersion === true ? { id: OWNER_ID, username: 'qa-owner', sessionVersion: 2 } : null,
  };
}

async function dashboardAttestation() {
  process.stdout.write('WAITING_FOR_OWNER_DASHBOARD_ATTESTATION\n');
  const input = createInterface({ input: process.stdin, terminal: false });
  try {
    const line = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new SmokeError('ATTESTATION_FAILED')), 300_000);
      input.once('line', value => { clearTimeout(timer); resolve(value); });
      input.once('close', () => { clearTimeout(timer); reject(new SmokeError('ATTESTATION_FAILED')); });
    });
    requireCondition(line.length <= 256, 'OWNER_VERSION_INVALID');
    const data = JSON.parse(line);
    validateVersionEvidence(data);
  } catch (error) { throw error instanceof SmokeError ? error : new SmokeError('ATTESTATION_FAILED'); }
  finally { input.close(); }
}

export async function runRemoteSmoke(env = process.env) {
  const evidence = { stage: 'configuration', checks: {}, deployId: env.QA_SMOKE_DEPLOY_ID, commit: env.QA_SMOKE_COMMIT, blockedPresenceRequests: 0, unexpectedRequests: 0, criticalBrowserErrors: 0, loginCount: 0, logoutCount: 0 };
  let browser;
  let context;
  let password;
  let reportPath;
  const authRequests = createAuthRequestCounter();
  try {
    assertTarget(env.QA_SMOKE_TARGET);
    requireCondition(env.QA_SMOKE_VAULT && env.QA_SMOKE_PWSH && env.QA_SMOKE_REPORT && env.QA_SMOKE_CONFIG_WITHDRAWN === 'true'
      && /^[a-f0-9]{24}$/.test(env.QA_SMOKE_DEPLOY_ID || '') && /^[a-f0-9]{40}$/.test(env.QA_SMOKE_COMMIT || ''), 'CONFIGURATION_MISSING');
    const repository = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
    reportPath = path.resolve(env.QA_SMOKE_REPORT);
    const relative = path.relative(repository, reportPath);
    requireCondition(relative.startsWith('..') || path.isAbsolute(relative), 'REPORT_PATH_REJECTED');
    password = await readOwnerPassword(env.QA_SMOKE_VAULT, env.QA_SMOKE_PWSH);
    const { chromium, expect, errors } = await import('@playwright/test');
    browser = await chromium.launch({ headless: false });
    context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
    const excluded = new WeakSet();
    const stages = new WeakMap();
    const noteAuthDecision = (request, decision) => {
      if (evidence.stage === 'netlify_auth') authRequests.record({ url: request.url(), resourceType: request.resourceType(), decision });
    };
    await context.route('**/*', async route => {
      const request = route.request();
      stages.set(request, evidence.stage);
      const decision = guardedRequestDecision({ url: request.url(), method: request.method(), body: request.method() === 'POST' ? request.postData() : '', navigation: request.isNavigationRequest() }, evidence.stage);
      if (decision !== 'continue') {
        noteAuthDecision(request, decision);
        if (decision === 'exclude_presence') { excluded.add(request); evidence.blockedPresenceRequests++; }
        else evidence.unexpectedRequests++;
        await route.abort('blockedbyclient');
        return;
      }
      if (request.method() === 'POST' && new URL(request.url()).origin === QA_ORIGIN) {
        if (evidence.unexpectedRequests || evidence.criticalBrowserErrors
          || (evidence.stage === 'owner_login' && evidence.loginCount >= 1)
          || (evidence.stage === 'logout' && evidence.logoutCount >= 1)) {
          evidence.unexpectedRequests++;
          noteAuthDecision(request, 'deny');
          await route.abort('blockedbyclient');
          return;
        }
        if (evidence.stage === 'owner_login') evidence.loginCount++;
        else if (evidence.stage === 'logout') evidence.logoutCount++;
      }
      noteAuthDecision(request, 'continue');
      await route.continue();
    });
    context.on('requestfailed', request => {
      if (!excluded.has(request) && stages.get(request) !== 'netlify_auth') evidence.criticalBrowserErrors++;
    });
    context.on('response', response => {
      if (stages.get(response.request()) === 'netlify_auth') return;
      const url = new URL(response.url());
      const expectedLogin = response.status() === 401 && url.origin === QA_ORIGIN && url.pathname === '/.netlify/functions/qa-personas-ui' && stages.get(response.request()) === 'owner_login';
      if (response.status() >= 400 && !expectedLogin && url.pathname !== '/favicon.ico') evidence.criticalBrowserErrors++;
      if (response.status() >= 300 && response.status() < 400 && response.request().isNavigationRequest()) evidence.unexpectedRequests++;
    });
    evidence.stage = 'human_browser_checkpoint';
    const page = await context.newPage();
    page.on('pageerror', () => { if (evidence.stage !== 'netlify_auth') evidence.criticalBrowserErrors++; });
    page.on('console', message => {
      if (message.type() !== 'error' || evidence.stage === 'netlify_auth') return;
      let pathname;
      try { pathname = new URL(message.location().url).pathname; } catch { pathname = ''; }
      const expected = pathname === '/.netlify/functions/presence' || pathname === '/favicon.ico'
        || (pathname === '/.netlify/functions/qa-personas-ui' && evidence.stage === 'owner_login');
      if (!expected) evidence.criticalBrowserErrors++;
    });
    const healthy = () => {
      requireCondition(evidence.unexpectedRequests === 0, 'UNEXPECTED_REQUEST');
      requireCondition(evidence.criticalBrowserErrors === 0, 'CRITICAL_BROWSER_ERROR');
    };
    const navigate = async endpoint => {
      healthy();
      try {
        const response = await page.goto(`${QA_ORIGIN}${endpoint}`, { waitUntil: 'load', timeout: SMOKE_NAVIGATION_TIMEOUT_MS });
        requireCondition(response?.status() === 200 || (evidence.stage === 'owner_login' && response?.status() === 401), 'NAVIGATION_FAILED');
        requireCondition(new URL(page.url()).origin === QA_ORIGIN, 'UNEXPECTED_REDIRECT');
      } catch (error) { throw error instanceof SmokeError ? error : new SmokeError('NAVIGATION_FAILED'); }
      healthy();
    };
    evidence.checks.privateAccess = false;
    await authenticateWithCheckpoint({ browser, context, page }, { TimeoutError: errors.TimeoutError, onContinue: () => { evidence.stage = 'netlify_auth'; } });
    // Exact QA confirmed. The existing strict stage policy begins with desktop.
    evidence.checks.privateAccess = true;
    for (const [stage, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
      evidence.stage = stage;
      await page.setViewportSize(viewport);
      await navigate('/');
      const anonymous = await readJsonOnce(context.request, '/.netlify/functions/account');
      requireCondition(anonymous.authenticated === false && anonymous.reason !== 'suspended', 'ANONYMOUS_ACCOUNT_INVALID');
      await expect(page.getByRole('heading', { name: '¿Qué estudiamos hoy?', exact: true })).toBeVisible();
      const navigation = page.locator('#rail:visible, #mobileNav:visible');
      await navigation.getByRole('button', { name: 'Entrar', exact: true }).click();
      await expect(page.locator('#loginForm')).toBeVisible();
      healthy();
      await navigation.getByRole('button', { name: 'Hub', exact: true }).click();
      await expect(page.getByRole('heading', { name: '¿Qué estudiamos hoy?', exact: true })).toBeVisible();
      if (stage === 'mobile') requireCondition(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'MOBILE_OVERFLOW');
      healthy(); evidence.checks[stage] = true;
    }
    evidence.stage = 'owner_login';
    await navigate('/.netlify/functions/qa-personas-ui');
    await page.locator('#qa-login-password').fill(password);
    password = null;
    healthy();
    await page.getByRole('button', { name: 'Entrar como QA Owner', exact: true }).click();
    await expect(page.locator('#qa-reset')).toBeVisible({ timeout: 20_000 });
    healthy();
    requireCondition(evidence.loginCount === 1, 'OWNER_ACCOUNT_INVALID');
    validateOwnerAccount(await readJsonOnce(context.request, '/.netlify/functions/account'));
    evidence.checks.ownerAccount = true;
    const tools = await readJsonOnce(context.request, '/.netlify/functions/qa-tools');
    requireCondition(tools.environment === 'qa' && Array.isArray(tools.capabilities) && tools.capabilities.includes('qa:tools'), 'QA_TOOLS_INVALID');
    evidence.checks.qaTools = true;
    evidence.stage = 'owner_version';
    healthy();
    await dashboardAttestation();
    evidence.checks.ownerVersion = true;
    validateOwnerAccount(await readJsonOnce(context.request, '/.netlify/functions/account'));
    evidence.checks.emptyBaseline = true;
    evidence.stage = 'logout';
    await navigate('/.netlify/functions/qa-session-ui');
    await expect(page.locator('#qa-session-identity')).toHaveText('Sesión actual: @qa-owner');
    healthy();
    await page.getByRole('button', { name: 'Cerrar sesión QA', exact: true }).click();
    await expect(page.locator('#qa-session-status')).toHaveAttribute('data-state', 'closed');
    const closed = await readJsonOnce(context.request, '/.netlify/functions/account');
    requireCondition(closed.authenticated === false && closed.reason !== 'suspended' && evidence.logoutCount === 1, 'LOGOUT_FAILED');
    evidence.checks.logout = true;
    healthy(); evidence.checks.noCriticalErrors = true; evidence.checks.noAcademicWrites = true;
    evidence.stage = 'complete';
  } catch (error) { evidence.error = error; }
  finally { password = null; await context?.close().catch(() => {}); await browser?.close().catch(() => {}); }
  evidence.authRequests = authRequests.snapshot();
  const report = sanitizedReport(evidence);
  if (reportPath) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  process.stdout.write(`${JSON.stringify(report)}\n`);
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const report = await runRemoteSmoke(); process.exitCode = report.result === 'PASS' ? 0 : 1; }
  catch { process.stdout.write('REMOTE_SMOKE_STOPPED: safe evidence could not be finalized.\n'); process.exitCode = 1; }
}
