import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:8765';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: 'list',
  outputDir: 'test-results',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: {
    command: 'node --import ./tests/register-blobs.mjs ./tests/browser-server.mjs',
    env: {
      STUDY_HUB_ENV: 'local-test',
      QA_TOOLS_ENABLED: 'true',
    },
    url: baseURL,
    reuseExistingServer: false,
    timeout: 20_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'chromium-mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
