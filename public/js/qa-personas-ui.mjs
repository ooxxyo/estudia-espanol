const PERSONAS = new Set(['qa-student-new', 'qa-student', 'qa-admin', 'qa-owner', 'qa-suspended']);

export function mountQaPersonasUI(root, send = fetch, reload = () => location.reload(), newRun = () => `qa-reset-${crypto.randomUUID()}`) {
  const status = root.querySelector('#qa-status');
  const login = root.querySelector('#qa-login');
  const reset = root.querySelector('#qa-reset');
  let busy = false;
  async function post(endpoint, data) {
    const response = await send(`/.netlify/functions/${endpoint}`, {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Solicitud rechazada. No se reintentó.');
    return response.json();
  }
  login?.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    const password = root.querySelector('#qa-login-password');
    const button = login.querySelector('button');
    button.disabled = true;
    try {
      const result = await post('account', { action: 'login', identifier: 'qa-owner', password: password.value, remember: false });
      password.value = '';
      if (result.ok !== true || result.user?.role !== 'owner') throw new Error('La cuenta no tiene rol Owner.');
      reload();
    } catch { status.textContent = 'No se pudo autorizar QA Owner. Operación detenida.'; }
    finally { password.value = ''; busy = false; button.disabled = false; }
  });
  reset?.addEventListener('submit', async event => {
    event.preventDefault();
    const target = root.querySelector('#qa-target');
    const confirmation = root.querySelector('#qa-confirm');
    if (busy || !confirmation.checked || !PERSONAS.has(target.value)) return;
    busy = true;
    const username = target.value;
    const button = reset.querySelector('button');
    button.disabled = true;
    try {
      const result = await post('qa-reset', { runId: newRun(), username });
      if (result.ok !== true || result.username !== username) throw new Error('Resultado inesperado.');
      if (result.reauthenticate === true) {
        reset.hidden = true;
        status.textContent = 'qa-owner normalizado. Sesión invalidada; vuelve a abrir esta página para entrar otra vez.';
        return;
      }
      const verified = await send('/.netlify/functions/qa-personas-ui?format=json', { credentials: 'same-origin', cache: 'no-store' });
      if (!verified.ok) throw new Error('No se pudo verificar.');
      const data = await verified.json();
      const persona = data.personas?.find(p => p.username === username);
      const expectedRole = username === 'qa-admin' ? 'admin' : username === 'qa-owner' ? 'owner' : 'member';
      if (data.environment !== 'qa' || !persona?.exists || !persona.canonical || !persona.baselineCorrect || persona.role !== expectedRole) throw new Error('Baseline o rol inesperado.');
      status.textContent = `${username}: baseline y rol verificados.`;
    } catch {
      reset.hidden = true;
      status.textContent = 'Operación detenida. No se repetirá el reset automáticamente; revisa el estado antes de continuar.';
    } finally { busy = false; confirmation.checked = false; button.disabled = false; }
  });
}
if (typeof document !== 'undefined') {
  const root = document.querySelector('#qa-personas-ui');
  if (root) mountQaPersonasUI(root);
}
