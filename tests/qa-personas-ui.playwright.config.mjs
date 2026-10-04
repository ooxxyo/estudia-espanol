import base from '../playwright.config.mjs';
export default {
  ...base,
  testDir: './qa-ui-browser',
  outputDir: '../test-results-qa-ui',
  use: { ...base.use, baseURL: 'http://127.0.0.1:8877' },
  webServer: {
    command: 'node --import ./register-blobs.mjs ./qa-personas-ui-browser-server.mjs',
    env: { STUDY_HUB_ENV: 'qa' },
    url: 'http://127.0.0.1:8877/.netlify/functions/qa-personas-ui',
    reuseExistingServer: false,
    timeout: 20_000,
  },
};
