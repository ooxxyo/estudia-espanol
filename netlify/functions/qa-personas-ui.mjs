import { authenticateRequest } from './_shared/auth.mjs';
import { hasQaToolsCapability, qaToolsEnabled, studyHubEnvironment } from './_shared/qa-access.mjs';
import { QA_PERSONAS, qaPersonaSummaries } from './_shared/qa-personas.mjs';

const HEADERS = {
  'cache-control': 'no-store',
  'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
};
function json(data, status) {
  return new Response(JSON.stringify(data), { status, headers: { ...HEADERS, 'content-type': 'application/json; charset=utf-8' } });
}
function html(content, status) {
  const body = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Personas QA · Study Hub</title><link rel="stylesheet" href="/css/qa-personas-ui.css"><script type="module" src="/js/qa-personas-ui.mjs"></script></head><body><main id="qa-personas-ui"><p>Study Hub · herramienta interna QA</p><h1>Personas de prueba</h1>${content}<p id="qa-status" role="status" aria-live="polite"></p><p><a href="/">Volver a Study Hub</a></p></main></body></html>`;
  return new Response(body, { status, headers: { ...HEADERS, 'content-type': 'text/html; charset=utf-8' } });
}
function loginPage(status) {
  return html('<p>Necesitas una sesión Owner autorizada. Este acceso usa el login normal de Study Hub y no sincroniza progreso local.</p><form id="qa-login"><label>Cuenta <input id="qa-login-user" value="qa-owner" readonly autocomplete="username"></label><label>Contraseña <input id="qa-login-password" type="password" required minlength="8" maxlength="128" autocomplete="current-password"></label><button type="submit">Entrar como QA Owner</button></form>', status);
}
export default async req => {
  if (studyHubEnvironment() !== 'qa' || !qaToolsEnabled()) return json({ error: 'No encontrado.' }, 404);
  if (req.method !== 'GET') return json({ error: 'Método no permitido.' }, 405);
  const auth = await authenticateRequest(req);
  const wantsJson = new URL(req.url).searchParams.get('format') === 'json';
  if (!auth.ok) return wantsJson ? json({ error: 'Sesión no válida.' }, 401) : loginPage(401);
  if (!hasQaToolsCapability(auth)) return wantsJson ? json({ error: 'Acceso QA denegado.' }, 403) : loginPage(403);
  try {
    const personas = await qaPersonaSummaries();
    if (wantsJson) return json({ environment: 'qa', personas }, 200);
    const options = QA_PERSONAS.map(p => `<option value="${p.username}">${p.username}</option>`).join('');
    const rows = personas.map(p => `<tr><th scope="row">${p.username}</th><td>${p.exists ? 'Creada' : 'Sin crear'}</td><td>${p.exists && p.canonical && p.baselineCorrect ? 'Baseline correcto' : 'Pendiente de normalizar'}</td></tr>`).join('');
    return html(`<p>Solo estas cinco cuentas. Cada reset restaura perfil, suspensión y progreso canónico; invalida las sesiones de la cuenta elegida. Conserva contraseña y recuperación.</p><table><caption>Estado actual, verificado por el servidor</caption><thead><tr><th>Persona</th><th>Cuenta</th><th>Baseline</th></tr></thead><tbody>${rows}</tbody></table><form id="qa-reset"><label>Persona <select id="qa-target" required><option value="">Elige una cuenta</option>${options}</select></label><label><input id="qa-confirm" type="checkbox" required> Confirmo restaurar únicamente esta persona de prueba.</label><button type="submit">Normalizar esta persona</button></form><p>Normaliza qa-owner al final. Su sesión se invalidará y tendrás que volver a entrar.</p>`, 200);
  } catch {
    return json({ error: 'Estado QA inconsistente. Operación detenida.' }, 409);
  }
};
