import { isSuspended } from './auth.mjs';

export const QA_TOOLS_CAPABILITY = 'qa:tools';

export function studyHubEnvironment(source = process.env) {
  const value = source?.STUDY_HUB_ENV;
  return value === 'qa' || value === 'local-test' || value === 'production' ? value : 'production';
}

export function qaToolsEnabled(source = process.env) {
  return source?.QA_TOOLS_ENABLED === 'true';
}

export function hasQaToolsCapability(auth, source = process.env) {
  const environment = studyHubEnvironment(source);
  return (environment === 'qa' || environment === 'local-test')
    && qaToolsEnabled(source)
    && auth?.ok === true
    && !isSuspended(auth.user)
    && (auth.role === 'owner' || auth.role === 'superdev');
}
