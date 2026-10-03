import { authenticateRequest } from './_shared/auth.mjs';
import {
  QA_TOOLS_CAPABILITY,
  hasQaToolsCapability,
  studyHubEnvironment,
} from './_shared/qa-access.mjs';

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

export default async (req) => {
  const environment = studyHubEnvironment();
  if (environment === 'production') return json({ error: 'No encontrado.' }, 404);

  const auth = await authenticateRequest(req);
  if (!auth.ok) return json({ error: 'Sesión no válida.' }, 401);
  if (!hasQaToolsCapability(auth)) return json({ error: 'No tienes acceso a QA Tools.' }, 403);
  if (req.method !== 'GET') return json({ error: 'Método no permitido.' }, 405, { allow: 'GET' });

  return json({ capabilities: [QA_TOOLS_CAPABILITY], environment });
};
