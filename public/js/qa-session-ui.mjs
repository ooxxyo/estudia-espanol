export function mountQaSessionUI(root, fetcher = fetch) {
  const button = root.querySelector('#qa-session-logout');
  const status = root.querySelector('#qa-session-status');
  const identity = root.querySelector('#qa-session-identity');
  let stopped = false;
  let busy = false;
  const options = { credentials: 'same-origin', cache: 'no-store', redirect: 'error' };
  function stop() {
    stopped = true;
    button.disabled = true;
    status.dataset.state = 'stopped';
    status.textContent = 'Operación detenida. No se pudo certificar el cierre de sesión. No reintentar automáticamente.';
  }
  function closed() {
    stopped = true;
    button.disabled = true;
    identity.textContent = '';
    status.dataset.state = 'closed';
    status.textContent = 'Study Hub session = closed. Verificado mediante account.';
  }
  async function readSession() {
    const response = await fetcher('/.netlify/functions/account', { ...options, method: 'GET' });
    if (!response.ok) throw new Error('Account check failed');
    const data = await response.json();
    if (data?.authenticated !== true && data?.authenticated !== false) throw new Error('Invalid account state');
    if (data.authenticated === false && data.reason !== undefined && data.reason !== 'suspended') throw new Error('Unknown account state');
    return data;
  }
  async function initialize() {
    button.disabled = true;
    try {
      const data = await readSession();
      if (data.authenticated === false && data.reason !== 'suspended') { closed(); return; }
      if (data.reason === 'suspended') {
        identity.textContent = 'Sesión actual con acceso suspendido.';
        status.dataset.state = 'active';
        status.textContent = 'El acceso está suspendido. Puedes terminar únicamente la sesión actual.';
        button.disabled = false;
        return;
      }
      if (typeof data.user?.username !== 'string' || !data.user.username || typeof data.user?.id !== 'string' || !data.user.id) throw new Error('Invalid identity');
      identity.textContent = `Sesión actual: @${data.user.username}`;
      status.dataset.state = 'active';
      status.textContent = 'Sesión autenticada verificada. Puedes cerrar únicamente esta sesión.';
      button.disabled = false;
    } catch { stop(); }
  }
  button.addEventListener('click', async () => {
    if (stopped || busy || button.disabled) return;
    busy = true;
    button.disabled = true;
    status.dataset.state = 'closing';
    status.textContent = 'Cerrando y verificando la sesión…';
    try {
      const response = await fetcher('/.netlify/functions/qa-session-ui', {
        ...options, method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'logout' }),
      });
      if (!response.ok || (await response.json())?.ok !== true) throw new Error('Logout failed');
      const verified = await readSession();
      if (verified.authenticated !== false || verified.reason === 'suspended') throw new Error('Session still present');
      closed();
    } catch { stop(); }
  });
  return { ready: initialize() };
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('#qa-session-ui');
  if (root) mountQaSessionUI(root);
}
