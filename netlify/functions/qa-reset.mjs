import { authenticateRequest } from './_shared/auth.mjs';
import { hasQaToolsCapability, qaToolsEnabled, studyHubEnvironment } from './_shared/qa-access.mjs';
import { auditEvent } from './_shared/platform.mjs';
import { resetQaPersona, validateQaResetBody } from './_shared/qa-personas.mjs';

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

async function body(req) {
  const length = Number(req.headers.get('content-length') || 0);
  if (length > 2_000) return null;
  try { return await req.json(); } catch { return null; }
}

export default async (req) => {
  if (studyHubEnvironment() !== 'qa' || !qaToolsEnabled()) return json({ error: 'No encontrado.' }, 404);
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405, { allow: 'POST' });
  const auth = await authenticateRequest(req);
  if (!auth.ok) return json({ error: 'Sesión no válida.' }, 401);
  if (!hasQaToolsCapability(auth)) return json({ error: 'No tienes acceso a QA Tools.' }, 403);
  const input = validateQaResetBody(await body(req));
  if (!input) return json({ error: 'Solicitud QA inválida.' }, 400);

  try {
    const user = await resetQaPersona(input.username);
    const reauthenticate = user.id === auth.user.id;
    await auditEvent(auth, 'qa-reset', {
      targetUsername: user.username,
      runId: input.runId,
      scope: 'account+progress',
      reauthenticate,
    });
    return json({ ok: true, runId: input.runId, username: user.username, reauthenticate });
  } catch {
    return json({ error: 'No se pudo restablecer la cuenta QA.' }, 409);
  }
};
