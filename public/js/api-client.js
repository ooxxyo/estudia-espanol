(() => {
  'use strict';

  const STATUS_MESSAGES = Object.freeze({
    400: 'La solicitud no es válida.',
    401: 'Tu sesión terminó. Vuelve a entrar.',
    403: 'No tienes permiso para realizar esta acción.',
    404: 'No se encontró el recurso solicitado.',
    409: 'Hay cambios más recientes. Actualiza e inténtalo otra vez.',
    429: 'Demasiados intentos. Espera un momento.',
  });
  function signalFailure(url, type, message, status = 0) {
    if (String(url).includes('/bugs')) return;
    try { window.dispatchEvent(new CustomEvent('studyhub:api-error', { detail: { type, message, status, path: new URL(url, location.origin).pathname } })); } catch {}
  }

  async function requestJson(url, { method = 'GET', body = null, cache = 'no-store', timeoutMs = 12000, fallbackMessage = 'No se pudo completar la solicitud.' } = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache,
        signal: controller.signal,
        body: body == null ? undefined : JSON.stringify(body),
      });
      const raw = await response.text(); let data = {};
      if (raw) { try { data = JSON.parse(raw); } catch { signalFailure(url, 'parse', 'La respuesta del servicio no era válida.', response.status); } }
      if (!response.ok) {
        const message = typeof data.error === 'string' && data.error.trim()
          ? data.error
          : STATUS_MESSAGES[response.status] || (response.status >= 500 ? 'El servicio no está disponible ahora.' : fallbackMessage);
        const error = new Error(message);
        error.status = response.status;
        error.data = data;
        if (response.status >= 500) signalFailure(url, 'backend', message, response.status);
        throw error;
      }
      return data;
    } catch (error) {
      if (error?.status) throw error;
      const message = error?.name === 'AbortError'
        ? 'La solicitud tardó demasiado. Inténtalo otra vez.'
        : 'No hay conexión con el servicio. Revisa tu red e inténtalo otra vez.';
      signalFailure(url, error?.name === 'AbortError' ? 'timeout' : 'network', message);
      const friendly = new Error(message);
      friendly.cause = error;
      throw friendly;
    } finally {
      clearTimeout(timeout);
    }
  }

  window.StudyHubApi = Object.freeze({ requestJson });
})();
