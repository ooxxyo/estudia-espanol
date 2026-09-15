(() => {
  'use strict';
  async function run(target, loadingLabel, task) {
    const form = target?.tagName === 'FORM' ? target : target?.closest?.('form');
    const controls = form ? [...form.querySelectorAll('button[type="submit"], input[type="submit"]')] : [target].filter(Boolean);
    if ((form || target)?.dataset?.submitting === 'true') return undefined;
    const owner = form || target;
    if (owner?.dataset) owner.dataset.submitting = 'true';
    if (form) form.setAttribute('aria-busy', 'true');
    const originals = controls.map(control => ({ control, disabled: control.disabled, text: control.textContent }));
    controls.forEach(control => { control.disabled = true; if (loadingLabel && control.tagName === 'BUTTON') control.textContent = loadingLabel; });
    try { return await task(); }
    finally {
      if (owner?.dataset) delete owner.dataset.submitting;
      if (form?.isConnected) form.removeAttribute('aria-busy');
      originals.forEach(({ control, disabled, text }) => { if (control.isConnected) { control.disabled = disabled; control.textContent = text; } });
    }
  }
  window.StudyHubForms = Object.freeze({ run });
})();
