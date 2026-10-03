import { safeSecretMatch } from './_shared/auth.mjs';
import { qaToolsEnabled, studyHubEnvironment } from './_shared/qa-access.mjs';
import { auditEvent } from './_shared/platform.mjs';
import { QA_PERSONAS, seedQaPersonas, validateQaSeedBody } from './_shared/qa-personas.mjs';

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

async function body(req) {
  const length = Number(req.headers.get('content-length') || 0);
  if (length > 10_000) return null;
  try { return await req.json(); } catch { return null; }
}

export default async (req) => {
  if (studyHubEnvironment() !== 'qa' || !qaToolsEnabled()) return json({ error: 'No encontrado.' }, 404);
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405, { allow: 'POST' });
  if (!safeSecretMatch(req.headers.get('x-qa-seed-token'), process.env.QA_SEED_TOKEN || '')) return json({ error: 'Acceso no autorizado.' }, 401);
  const input = validateQaSeedBody(await body(req));
  if (!input) return json({ error: 'Solicitud QA inválida.' }, 400);

  try {
    const users = await seedQaPersonas(input.accounts);
    const technicalActor = { user: { id: 'qa-seed', username: 'qa-seed' }, role: 'system' };
    for (const user of users) {
      await auditEvent(technicalActor, 'qa-seed', {
        targetUsername: user.username,
        runId: input.runId,
        scope: 'account+progress',
      });
    }
    return json({
      ok: true,
      runId: input.runId,
      accounts: QA_PERSONAS.map(({ username, status, baseline }) => ({ username, status, baseline })),
    });
  } catch {
    return json({ error: 'No se pudo preparar QA.' }, 500);
  }
};
