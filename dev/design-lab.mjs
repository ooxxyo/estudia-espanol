export const DESIGN_LAB_SCREENS = Object.freeze(['login', 'register', 'recover', 'account', 'settings']);

export const DESIGN_LAB_STATES = Object.freeze({
  'logged-out': Object.freeze({
    label: 'Logged out',
    description: 'Sin cuenta conectada.',
    profile: null,
    progress: Object.freeze({ completed: 0, accuracy: 0, streak: 0 }),
  }),
  new: Object.freeze({
    label: 'Usuario nuevo',
    description: 'Cuenta creada, todavía sin actividad.',
    profile: Object.freeze({ displayName: 'Lina', username: 'lina', roleLabel: 'Member', email: '' }),
    progress: Object.freeze({ completed: 0, accuracy: 0, streak: 0 }),
  }),
  normal: Object.freeze({
    label: 'Usuario normal',
    description: 'Cuenta activa con actividad reciente.',
    profile: Object.freeze({ displayName: 'Mateo', username: 'mateo', roleLabel: 'Member', email: 'mateo@example.test' }),
    progress: Object.freeze({ completed: 8, accuracy: 78, streak: 3 }),
  }),
  progress: Object.freeze({
    label: 'Con progreso',
    description: 'Cuenta con historial, guardadas y racha.',
    profile: Object.freeze({ displayName: 'Sofía', username: 'sofia', roleLabel: 'Veterano', email: 'sofia@example.test' }),
    progress: Object.freeze({ completed: 42, accuracy: 91, streak: 12 }),
  }),
  'owner-preview': Object.freeze({
    label: 'Owner Preview',
    description: 'Presentación visual sin privilegios.',
    profile: Object.freeze({ displayName: 'Owner Preview', username: 'preview-owner', roleLabel: 'Owner Preview', email: 'owner-preview@example.test' }),
    progress: Object.freeze({ completed: 128, accuracy: 96, streak: 28 }),
  }),
});

const SCREEN_LABELS = Object.freeze({
  login: 'Entrar',
  register: 'Registro',
  recover: 'Recuperación',
  account: 'Cuenta',
  settings: 'Configuración',
});

export function isLocalDesignLabHost(hostname) {
  const value = String(hostname || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  return value === 'localhost' || value === '127.0.0.1' || value === '::1' || value.endsWith('.localhost');
}

export function createPreviewModel(stateId = 'logged-out', screenId = 'login') {
  const resolvedStateId = Object.hasOwn(DESIGN_LAB_STATES, stateId) ? stateId : 'logged-out';
  const resolvedScreenId = DESIGN_LAB_SCREENS.includes(screenId) ? screenId : 'login';
  const fixture = DESIGN_LAB_STATES[resolvedStateId];
  return Object.freeze({
    previewOnly: true,
    session: null,
    claims: null,
    permissions: Object.freeze([]),
    stateId: resolvedStateId,
    screenId: resolvedScreenId,
    stateLabel: fixture.label,
    description: fixture.description,
    profile: fixture.profile ? Object.freeze({ ...fixture.profile }) : null,
    progress: Object.freeze({ ...fixture.progress }),
  });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function field(label, input) {
  return `<label>${label}${input}</label>`;
}

function authShell(overline, title, copy, form, aside) {
  return `<div class="pagehead"><p class="account-overline">${overline}</p><h1>${title}</h1><p>${copy}</p></div><div class="account-auth-layout"><section class="account-auth-form">${form}</section><aside class="account-auth-aside">${aside}</aside></div>`;
}

function loginPreview() {
  return authShell('Entrar', 'Bienvenido de vuelta', 'Continúa exactamente donde dejaste tu estudio.', `<form class="account-form" data-preview-form>${field('Username o email','<input autocomplete="username" placeholder="Tu username o email">')}${field('Contraseña','<div class="password-wrap"><input type="password" autocomplete="current-password"><button class="show-pass" type="button" aria-pressed="false">Ver</button></div>')}<label class="remember-row"><input type="checkbox" checked> Mantener mi sesión iniciada</label><button class="btn" type="submit">Entrar</button><p class="account-message" role="status" aria-live="polite" data-preview-message></p></form>`, `<p class="account-overline">Preview local</p><h2>Tus datos, en tu control</h2><ul class="account-auth-points"><li>No crea una sesión.</li><li>No envía credenciales.</li><li>No modifica permisos.</li></ul>`);
}

function registerPreview() {
  return authShell('Crear cuenta', 'Guarda tu recorrido', 'Esta muestra nunca crea una cuenta real.', `<div class="account-choice"><button class="active" type="button" aria-pressed="true">Cuenta básica</button><button type="button" aria-pressed="false">Con email</button></div><form class="account-form" data-preview-form>${field('Username','<input autocomplete="username" placeholder="ej. usuario">')}${field('Email (opcional)','<input type="email" autocomplete="email">')}${field('Contraseña','<input type="password" autocomplete="new-password">')}${field('Confirmar contraseña','<input type="password" autocomplete="new-password">')}<button class="btn" type="submit">Crear cuenta</button><p class="account-message" role="status" aria-live="polite" data-preview-message></p></form>`, `<p class="account-overline">Datos falsos</p><h2>Nada sale del laboratorio</h2><p>Los valores son visuales y se descartan al cambiar de preview.</p>`);
}

function recoverPreview() {
  return authShell('Recuperación', 'Vuelve a entrar con seguridad', 'Preview del flujo completo, sin cambiar contraseñas.', `<form class="account-form" data-preview-form>${field('Username o email','<input autocomplete="username">')}${field('Código de recuperación','<input placeholder="XXXX-XXXX-XXXX-XXXX">')}${field('Nueva contraseña','<input type="password" autocomplete="new-password">')}<button class="btn" type="submit">Cambiar contraseña</button><p class="account-message" role="status" aria-live="polite" data-preview-message></p></form>`, `<p class="account-overline">Protección</p><h2>El código sigue siendo obligatorio</h2><p>Esta superficie solo permite revisar jerarquía, copy y estados de foco.</p>`);
}

function accountPreview(model) {
  if (!model.profile) return `<div class="pagehead"><p class="account-overline">Cuenta</p><h1>Tu estudio, donde lo dejaste</h1><p>Estado sin sesión real.</p></div><section class="account-data-surface"><h2>Entra para sincronizar</h2><p>La preview permanece desconectada aunque pulses sus controles.</p><button class="btn" type="button">Entrar</button></section>`;
  const profile = model.profile;
  return `<div class="pagehead"><p class="account-overline">Cuenta</p><h1>Tu espacio de estudio</h1><p>${escapeHtml(model.description)}</p></div><section class="account-summary-surface"><div class="account-status"><div><div class="account-user">${escapeHtml(profile.displayName)} <span class="role-badge">${escapeHtml(profile.roleLabel)}</span></div><div class="account-sub">@${escapeHtml(profile.username)} · ${escapeHtml(profile.email || 'Sin email añadido')}</div></div><span class="sync-pill">Preview local</span></div><div class="btn-row" style="margin-top:20px"><button class="btn" type="button">Sincronizar ahora</button><button class="icon-btn" type="button">Cerrar sesión</button></div></section><section class="account-data-surface"><p class="account-overline">Resumen ficticio</p><h2>${model.progress.completed} sesiones completadas</h2><p>${model.progress.accuracy}% de precisión · racha de ${model.progress.streak} días.</p></section>`;
}

function settingsPreview() {
  return `<div class="pagehead"><p class="settings-overline">Preferencias</p><h1>Configuración</h1><p>Los cambios de esta preview no se guardan.</p></div><div class="settings-page"><section class="settings-section"><p class="settings-overline">Apariencia</p><h2>Hazlo cómodo para ti</h2><div class="setting-row"><div class="setting-copy"><b>Tema</b><span>Claro, oscuro o automático.</span></div><div class="setting-control"><select><option>Claro</option><option>Oscuro</option><option>Automático</option></select></div></div><div class="setting-row"><div class="setting-copy"><b>Color de la interfaz</b><span>Solo cambia la muestra.</span></div><input class="settings-color" type="color" value="#862e42" aria-label="Color de preview"></div></section><section class="settings-section"><p class="settings-overline">Práctica</p><h2>Tu forma de trabajar</h2><label class="check-line"><input type="checkbox" checked> Contar prácticas por defecto</label></section><div class="settings-actions"><button class="btn" type="button">Guardar cambios</button><span class="save-note">Preview · no se guardará</span></div></div>`;
}

function screenMarkup(model) {
  if (model.screenId === 'login') return loginPreview();
  if (model.screenId === 'register') return registerPreview();
  if (model.screenId === 'recover') return recoverPreview();
  if (model.screenId === 'account') return accountPreview(model);
  return settingsPreview();
}

function labMarkup(model) {
  const stateButtons = Object.entries(DESIGN_LAB_STATES).map(([id, fixture]) => `<button type="button" data-lab-state="${id}" aria-pressed="${id === model.stateId}"><strong>${escapeHtml(fixture.label)}</strong><span>${escapeHtml(fixture.description)}</span></button>`).join('');
  const screenButtons = DESIGN_LAB_SCREENS.map(id => `<button type="button" data-lab-screen="${id}" aria-pressed="${id === model.screenId}">${SCREEN_LABELS[id]}</button>`).join('');
  return `<header class="dev-lab-banner"><div><p>LOCAL / DEVELOPMENT ONLY</p><strong>Study Hub Dev Design Lab</strong></div><div class="dev-lab-actions"><button type="button" data-lab-theme aria-pressed="false">Modo oscuro</button><button type="button" data-lab-motion aria-pressed="false">Reducir movimiento</button></div></header><div class="dev-lab-layout"><aside class="dev-lab-controls" aria-label="Controles de preview"><section><p class="account-overline">Estado</p><div class="dev-lab-state-list">${stateButtons}</div></section><section><p class="account-overline">Pantalla</p><div class="dev-lab-screen-list">${screenButtons}</div></section><section><p class="account-overline">Siguientes previews</p><button type="button" disabled>Owner · Futuro · no implementado</button><button type="button" disabled>Analytics · Futuro · no implementado</button><button type="button" disabled>System Health · Futuro · no implementado</button><button type="button" disabled>Community · Futuro · no implementado</button></section></aside><main id="main" class="dev-lab-preview" tabindex="-1"><div class="dev-lab-preview-meta"><span>${escapeHtml(model.stateLabel)}</span><b>Preview visual · sin autorización</b></div>${screenMarkup(model)}</main></div>`;
}

export function mountDesignLab(root, options = {}) {
  if (!root) return null;
  const hostname = options.hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  if (!isLocalDesignLabHost(hostname)) {
    root.innerHTML = '<main class="dev-lab-blocked"><h1>Design Lab no disponible</h1><p>Esta herramienta solo funciona en desarrollo local.</p></main>';
    return Object.freeze({ blocked: true });
  }
  const presentationRoot = root.closest?.('[data-shds="p0"]') || root;
  let stateId = 'logged-out';
  let screenId = 'login';
  const render = () => {
    const model = createPreviewModel(stateId, screenId);
    root.innerHTML = labMarkup(model);
    const dark = presentationRoot.dataset.shdsTheme === 'dark';
    const reduced = presentationRoot.dataset.shdsReduced === 'true';
    const themeButton = root.querySelector('[data-lab-theme]');
    const motionButton = root.querySelector('[data-lab-motion]');
    themeButton?.setAttribute('aria-pressed', String(dark));
    if (themeButton) themeButton.textContent = dark ? 'Modo claro' : 'Modo oscuro';
    motionButton?.setAttribute('aria-pressed', String(reduced));
    if (typeof document !== 'undefined') document.body.dataset.view = screenId === 'settings' ? 'ajustes' : 'cuenta';
    return model;
  };
  root.addEventListener('click', event => {
    const stateButton = event.target.closest('[data-lab-state]');
    const screenButton = event.target.closest('[data-lab-screen]');
    if (stateButton) { stateId = stateButton.dataset.labState; render(); return; }
    if (screenButton) { screenId = screenButton.dataset.labScreen; render(); root.querySelector('#main')?.focus(); return; }
    const themeButton = event.target.closest('[data-lab-theme]');
    if (themeButton) {
      const dark = presentationRoot.dataset.shdsTheme !== 'dark';
      presentationRoot.dataset.shdsTheme = dark ? 'dark' : 'light';
      themeButton.setAttribute('aria-pressed', String(dark));
      themeButton.textContent = dark ? 'Modo claro' : 'Modo oscuro';
    }
    const motionButton = event.target.closest('[data-lab-motion]');
    if (motionButton) {
      const reduced = presentationRoot.dataset.shdsReduced !== 'true';
      presentationRoot.dataset.shdsReduced = String(reduced);
      motionButton.setAttribute('aria-pressed', String(reduced));
    }
  });
  root.addEventListener('submit', event => {
    if (!event.target.matches('[data-preview-form]')) return;
    event.preventDefault();
    const message = event.target.querySelector('[data-preview-message]');
    if (message) message.textContent = 'Preview local: no se envió ningún dato.';
  });
  render();
  return Object.freeze({ blocked: false, render });
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('[data-dev-design-lab]');
  if (root) mountDesignLab(root);
}
