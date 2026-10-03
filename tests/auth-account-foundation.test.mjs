import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

async function read(relativePath) {
  try {
    return await readFile(new URL(relativePath, import.meta.url), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return '';
    throw error;
  }
}

const [production, accountCss, labHtml, labModule, accountFunction] = await Promise.all([
  read('../public/index.html'),
  read('../public/css/study-hub-account-p0.css'),
  read('../dev/design-lab.html'),
  read('../dev/design-lab.mjs'),
  read('../netlify/functions/account.mjs'),
]);

function accountPanelSource() {
  const start = production.indexOf('function renderAccountPanel(');
  const end = production.indexOf('/* =========================================================\n   FEEDBACK', start);
  return production.slice(start, end);
}

test('Auth, Cuenta y Configuración cargan un adaptador P0 aislado', () => {
  assert.match(production, /<link[^>]+href="css\/study-hub-account-p0\.css"/);
  assert.match(accountCss, /body\[data-shds-shell="p0"\]\[data-view="cuenta"\]/);
  assert.match(accountCss, /body\[data-shds-shell="p0"\]\[data-view="ajustes"\]/);
  assert.match(accountCss, /var\(--shds-color-paper\)/);
  assert.match(accountCss, /min-height:\s*44px/);
  assert.match(accountCss, /prefers-reduced-motion:\s*reduce/);
});

test('los formularios Auth conservan contratos y ganan jerarquía accesible', () => {
  const account = accountPanelSource();
  for (const formId of ['loginForm', 'registerForm', 'recoverForm']) assert.match(account, new RegExp(`id="${formId}"`));
  for (const action of ['login', 'register', 'reset-password']) assert.match(account, new RegExp(`action:'${action}'`));
  assert.match(account, /class="account-auth-layout"/);
  assert.match(account, /class="account-auth-form"/);
  assert.match(account, /role="status"[^>]+aria-live="polite"/);
  assert.match(account, /aria-pressed="true"[^>]+data-reg-mode="basic"/);
  assert.match(account, /aria-describedby="loginHelp"/);
  assert.match(account, /function renderAccountPanel\(mode,animate=false\)/);
  assert.match(production, /renderAccountPanel\(b\.dataset\.accountTab,true\)/);
});

test('Dev Login real permanece secundario y conserva su contrato server-side', () => {
  const account = accountPanelSource();
  assert.match(account, /<details class="account-dev-access"/);
  assert.match(account, /action:'dev-login'/);
  assert.match(accountFunction, /enforceRateLimit\(req, 'devLogin', 'superdev', \{ strict: true \}\)/);
  assert.match(accountFunction, /process\.env\.DEV_LOGIN_CODE \|\| ''/);
  assert.match(accountFunction, /safeSecretMatch\(body\.code, configuredCode\)/);
});

test('el Dev Design Lab vive fuera del publish y se bloquea fuera de local', async () => {
  const labPath = fileURLToPath(new URL('../dev/design-lab.html', import.meta.url));
  const publicPath = path.resolve(fileURLToPath(new URL('../public/', import.meta.url)));
  assert.equal(path.resolve(labPath).startsWith(publicPath), false);
  assert.match(labHtml, /data-dev-design-lab/);
  const lab = await import('../dev/design-lab.mjs');
  assert.equal(lab.isLocalDesignLabHost('localhost'), true);
  assert.equal(lab.isLocalDesignLabHost('127.0.0.1'), true);
  assert.equal(lab.isLocalDesignLabHost('estudia-espanol.netlify.app'), false);
});

test('el Dev Design Lab renderiza su estado inicial al montarse en local', async () => {
  const lab = await import('../dev/design-lab.mjs');
  const root = {
    dataset: {},
    innerHTML: '<main>Preparando Design Lab…</main>',
    addEventListener() {},
    querySelector() { return null; },
  };
  const mounted = lab.mountDesignLab(root, { hostname: 'localhost' });
  assert.equal(mounted.blocked, false);
  assert.match(root.innerHTML, /Study Hub Dev Design Lab/);
  assert.match(root.innerHTML, /Preview visual · sin autorización/);
});

test('el Dev Design Lab reutiliza los estilos P0 desde el root local servido', () => {
  assert.match(labHtml, /href="\/css\/design-system-p0\.css"/);
  assert.match(labHtml, /href="\/css\/study-hub-account-p0\.css"/);
  assert.doesNotMatch(labHtml, /href="\.\.\/public\/css\//);
});

test('los controles visuales del laboratorio aplican tema y reduced motion al root P0', async () => {
  const lab = await import('../dev/design-lab.mjs');
  const handlers = {};
  const presentationRoot = { dataset: { shdsTheme: 'light' } };
  const makeButton = textContent => ({
    attributes: {},
    textContent,
    setAttribute(name, value) { this.attributes[name] = value; },
    getAttribute(name) { return this.attributes[name]; },
  });
  const themeButton = makeButton('Modo oscuro');
  const motionButton = makeButton('Reducir movimiento');
  const root = {
    dataset: {},
    _innerHTML: '',
    get innerHTML() { return this._innerHTML; },
    set innerHTML(value) {
      this._innerHTML = value;
      themeButton.attributes = {};
      themeButton.textContent = 'Modo oscuro';
      motionButton.attributes = {};
    },
    closest(selector) { return selector === '[data-shds="p0"]' ? presentationRoot : null; },
    addEventListener(type, handler) { handlers[type] = handler; },
    querySelector(selector) {
      if (selector === '[data-lab-theme]') return themeButton;
      if (selector === '[data-lab-motion]') return motionButton;
      return null;
    },
  };
  const mounted = lab.mountDesignLab(root, { hostname: 'localhost' });
  handlers.click({ target: { closest: selector => selector === '[data-lab-theme]' ? themeButton : null } });
  assert.equal(presentationRoot.dataset.shdsTheme, 'dark');
  handlers.click({ target: { closest: selector => selector === '[data-lab-motion]' ? motionButton : null } });
  assert.equal(presentationRoot.dataset.shdsReduced, 'true');
  mounted.render();
  assert.equal(themeButton.getAttribute('aria-pressed'), 'true');
  assert.equal(themeButton.textContent, 'Modo claro');
  assert.equal(motionButton.getAttribute('aria-pressed'), 'true');
});

test('las fixtures cubren cinco estados y cinco pantallas sin sesión ni permisos', async () => {
  const lab = await import('../dev/design-lab.mjs');
  assert.deepEqual(Object.keys(lab.DESIGN_LAB_STATES), ['logged-out', 'new', 'normal', 'progress', 'owner-preview']);
  assert.deepEqual(lab.DESIGN_LAB_SCREENS, ['login', 'register', 'recover', 'account', 'settings']);
  for (const stateId of Object.keys(lab.DESIGN_LAB_STATES)) {
    const model = lab.createPreviewModel(stateId, 'account');
    assert.equal(model.previewOnly, true);
    assert.equal(model.session, null);
    assert.equal(model.claims, null);
    assert.deepEqual(model.permissions, []);
  }
  assert.equal(lab.createPreviewModel('owner-preview', 'account').profile.roleLabel, 'Owner Preview');
});

test('el Dev Design Lab no conoce APIs, storage ni dev-login', () => {
  const source = `${labHtml}\n${labModule}`;
  assert.doesNotMatch(source, /fetch\s*\(|accountRequest|dev-login|document\.cookie|localStorage|sessionStorage|DEV_LOGIN_CODE/);
  assert.match(source, /Owner Preview/);
  assert.match(source, /Futuro · no implementado/);
});
