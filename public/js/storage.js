(() => {
  'use strict';
  const CURRENT_SCHEMA_VERSION = 2;
  function migrate(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const version = Number.isInteger(value.schemaVersion) ? value.schemaVersion : 1;
    if (version > CURRENT_SCHEMA_VERSION) return null;
    return version < 2 ? { ...value, schemaVersion: 2 } : { ...value };
  }
  function parse(raw) {
    if (typeof raw !== 'string' || !raw) return null;
    try { return migrate(JSON.parse(raw)); } catch { return null; }
  }
  function validate(value) {
    return Boolean(value && typeof value === 'object' && Number.isFinite(value.savedAt) && (!value.session || Array.isArray(value.session.queueIds)));
  }
  window.StudyHubStorage = Object.freeze({ CURRENT_SCHEMA_VERSION, migrate, parse, validate });
})();
