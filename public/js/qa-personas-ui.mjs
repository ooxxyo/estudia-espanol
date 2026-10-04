const PERSONAS = new Set(['qa-student-new', 'qa-student', 'qa-admin', 'qa-owner', 'qa-suspended']);

export function mountQaPersonasUI(root, send = fetch, reload = () => location.reload(), newRun = () => `qa-reset-${crypto.randomUUID()}`) {
  const status = root.querySelector('#qa-status');
  const login = root.querySelector('#qa-login');
  const reset = root.querySelector('#qa-reset');
  const diagnostic = root.querySelector('#qa-diagnostic');
  let busy = false;
  let stopped = false;
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
    if (busy || stopped || !confirmation.checked || !PERSONAS.has(target.value)) return;
    busy = true;
    const username = target.value;
    const button = reset.querySelector('button');
    button.disabled = true;
    // Project only fixed client fields; never retain a response body or exception.
    const evidence = {
      username, stage: 'prepare_request', errorCode: null, httpStatus: null, verificationHttpStatus: null,
      requestPrepared: false, fetchStarted: false, responseReceived: false, jsonParsed: false,
      postVerificationStarted: false, postVerificationFinished: false,
    };
    let failureStage = 'prepare_request';
    let failureCode = 'REQUEST_PREPARATION_FAILED';
    function show(stage, errorCode = null) {
      evidence.stage = stage;
      evidence.errorCode = errorCode;
      if (diagnostic) { diagnostic.textContent = JSON.stringify(evidence, null, 2); diagnostic.hidden = false; }
    }
    const httpStatus = response => Number.isInteger(response.status) && response.status >= 100 && response.status <= 599 ? response.status : null;
    show('prepare_request');
    try {
      const options = {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ runId: newRun(), username }),
      };
      evidence.requestPrepared = true;
      evidence.fetchStarted = true;
      failureStage = 'fetch_started'; failureCode = 'RESET_FETCH_FAILED';
      show('fetch_started');
      const response = await send('/.netlify/functions/qa-reset', options);
      evidence.responseReceived = true; evidence.httpStatus = httpStatus(response);
      show('response_received');
      if (!response.ok) {
        failureStage = 'response_non_ok'; failureCode = 'RESET_RESPONSE_NON_OK';
        throw new Error('Solicitud rechazada.');
      }
      failureStage = 'response_parse_failed'; failureCode = 'RESET_RESPONSE_PARSE_FAILED';
      const result = await response.json();
      evidence.jsonParsed = true;
      failureStage = 'server_reported_failure';
      failureCode = result?.ok === false ? 'SERVER_REPORTED_FAILURE' : 'RESET_RESULT_INVALID';
      if (result?.ok !== true || result.username !== username) throw new Error('Resultado inesperado.');
      if (result.reauthenticate === true) {
        stopped = true;
        reset.hidden = true;
        status.textContent = 'qa-owner normalizado. Sesión invalidada; vuelve a abrir esta página para entrar otra vez.';
        // Completion acknowledges self-reset only; post-verification still needs reauthentication.
        show('complete');
        return;
      }
      evidence.postVerificationStarted = true;
      failureStage = 'post_verify_failed'; failureCode = 'VERIFY_FETCH_FAILED';
      show('post_verify_started');
      const verified = await send('/.netlify/functions/qa-personas-ui?format=json', { credentials: 'same-origin', cache: 'no-store' });
      evidence.verificationHttpStatus = httpStatus(verified);
      failureCode = 'VERIFY_RESPONSE_NON_OK';
      if (!verified.ok) throw new Error('No se pudo verificar.');
      failureCode = 'VERIFY_RESPONSE_PARSE_FAILED';
      const data = await verified.json();
      failureCode = 'VERIFY_RESULT_INVALID';
      const persona = Array.isArray(data?.personas) ? data.personas.find(p => p?.username === username) : null;
      const expectedRole = username === 'qa-admin' ? 'admin' : username === 'qa-owner' ? 'owner' : 'member';
      if (data?.environment !== 'qa' || !persona?.exists || !persona.canonical || !persona.baselineCorrect || persona.role !== expectedRole) throw new Error('Baseline o rol inesperado.');
      evidence.postVerificationFinished = true;
      status.textContent = `${username}: baseline y rol verificados.`;
      show('complete');
    } catch {
      stopped = true;
      reset.hidden = true;
      status.textContent = 'Operación detenida. No se repetirá el reset automáticamente; revisa el estado antes de continuar.';
      show(failureStage, failureCode);
    } finally { busy = false; confirmation.checked = false; button.disabled = false; }
  });
}
if (typeof document !== 'undefined') {
  const root = document.querySelector('#qa-personas-ui');
  if (root) mountQaPersonasUI(root);
}
