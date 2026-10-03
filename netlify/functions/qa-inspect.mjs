import { authenticateRequest } from './_shared/auth.mjs';
import { hasQaToolsCapability, qaToolsEnabled, studyHubEnvironment } from './_shared/qa-access.mjs';
import { INSPECTION_NAMES, inspectQaState } from './_shared/qa-inspection.mjs';
const headers = {
  'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'", 'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer',
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
export default async req => {
  if (studyHubEnvironment() !== 'qa' || !qaToolsEnabled()) return json({ error: 'No encontrado.' }, 404);
  if (req.method !== 'GET') return json({ error: 'Método no permitido.' }, 405);
  try {
    const auth = await authenticateRequest(req);
    if (!auth.ok) return json({ error: 'Sesión no válida.' }, 401);
    if (!hasQaToolsCapability(auth)) return json({ error: 'Acceso QA denegado.' }, 403);
    const params = new URL(req.url).searchParams;
    const names = [...params.keys()];
    const selected = params.get('username');
    if (names.length > 1 || (names.length === 1 && (names[0] !== 'username' || !INSPECTION_NAMES.includes(selected)))) return json({ error: 'Consulta inválida.' }, 400);
    const result = await inspectQaState(auth, selected);
    // Recheck the same real session after reading; no refresh or write.
    const verified = await authenticateRequest(req);
    if (!verified.ok) return json({ error: 'Sesión no válida.' }, 401);
    if (!hasQaToolsCapability(verified) || verified.user.id !== auth.user.id || verified.role !== auth.role) return json({ error: 'Acceso QA denegado.' }, 403);
    return json(result);
  } catch {
    return json({ error: 'Inspección incompleta o estado inestable. Operación detenida.' }, 409);
  }
};
