import account from './account.mjs';
import { qaToolsEnabled, studyHubEnvironment } from './_shared/qa-access.mjs';

const HEADERS = {
  'cache-control': 'no-store',
  'content-security-policy': "default-src 'none'; script-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
};
function json(data, status) {
  return new Response(JSON.stringify(data), { status, headers: { ...HEADERS, 'content-type': 'application/json; charset=utf-8' } });
}

export default async req => {
  if (studyHubEnvironment() !== 'qa' || !qaToolsEnabled()) return json({ error: 'No encontrado.' }, 404);
  const url = new URL(req.url);
  if (url.search) return json({ error: 'Solicitud inválida.' }, 400);
  if (req.method === 'GET') {
    return new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sesión QA · Study Hub</title><script type="module" src="/js/qa-session-ui.mjs"></script></head><body><main id="qa-session-ui"><p>Study Hub · herramienta interna QA</p><h1>Sesión actual</h1><p>Este control cierra únicamente la sesión actual de Study Hub. Conserva tu progreso y la sesión de Netlify.</p><p id="qa-session-identity"></p><button type="button" id="qa-session-logout" disabled>Cerrar sesión QA</button><p id="qa-session-status" role="status" aria-live="polite" data-state="checking">Comprobando sesión…</p><p><a href="/">Volver a Study Hub</a></p></main></body></html>`, {
      status: 200, headers: { ...HEADERS, 'content-type': 'text/html; charset=utf-8' },
    });
  }
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
  if (req.headers.get('origin') !== url.origin) return json({ error: 'Origen no permitido.' }, 403);
  if (Number(req.headers.get('content-length') || 0) > 128) return json({ error: 'Solicitud demasiado grande.' }, 413);
  let body;
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw, 'utf8') > 128) return json({ error: 'Solicitud demasiado grande.' }, 413);
    body = JSON.parse(raw);
  } catch { return json({ error: 'Solicitud inválida.' }, 400); }
  if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).length !== 1 || body.action !== 'logout') {
    return json({ error: 'Solicitud inválida.' }, 400);
  }
  // Use the unchanged real logout: authenticate the request's cookie, delete only
  // that session, and let its existing Set-Cookie expire the HttpOnly cookie.
  const response = await account(new Request(new URL('/.netlify/functions/account', url), {
    method: 'POST', headers: req.headers, body: JSON.stringify({ action: 'logout' }),
  }));
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, headers });
};
