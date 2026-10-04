import { test, expect } from '@playwright/test';
test('one-person reset, canonical verification and owner reauthentication', async ({ page }, testInfo) => {
  await page.goto('/__fixture/owner');
  await expect(page.getByRole('heading', { name: 'Personas de prueba' })).toBeVisible();
  await page.screenshot({ path: `../qa-7c-${testInfo.project.name}.png`, fullPage: true });
  await page.locator('#qa-target').selectOption('qa-student');
  await page.locator('#qa-confirm').check();
  await page.getByRole('button', { name: 'Normalizar esta persona' }).click();
  await expect(page.locator('#qa-status')).toHaveText('qa-student: baseline y rol verificados.');
  await expect(page.locator('#qa-diagnostic')).toBeVisible();
  expect(JSON.parse(await page.locator('#qa-diagnostic').innerText())).toMatchObject({ stage: 'complete', httpStatus: 200, postVerificationFinished: true });
  await page.locator('#qa-target').selectOption('qa-owner');
  await page.locator('#qa-confirm').check();
  await page.getByRole('button', { name: 'Normalizar esta persona' }).click();
  await expect(page.locator('#qa-status')).toContainText('Sesión invalidada');
  await expect(page.locator('#qa-reset')).toBeHidden();
  expect(JSON.parse(await page.locator('#qa-diagnostic').innerText())).toMatchObject({ stage: 'complete', postVerificationStarted: false, postVerificationFinished: false });
  await page.reload();
  await expect(page.locator('#qa-login')).toBeVisible();
  await page.locator('#qa-login-password').fill('Fictitious-browser-test!');
  await page.getByRole('button', { name: 'Entrar como QA Owner' }).click();
  await expect(page.locator('#qa-reset')).toBeVisible();
  await expect(page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'qa-owner', exact: true }) })).toContainText('Baseline correcto');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('HTTP failure preserves safe diagnostics and blocks the next persona', async ({ page }, testInfo) => {
  let requests = 0;
  await page.route('**/.netlify/functions/qa-reset', async route => {
    requests++;
    await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'FICTITIOUS-PRIVATE-ERROR', cookie: 'FICTITIOUS-COOKIE' }) });
  });
  await page.goto('/__fixture/owner');
  await page.locator('#qa-target').selectOption('qa-student');
  await page.locator('#qa-confirm').check();
  await page.getByRole('button', { name: 'Normalizar esta persona' }).click();
  await expect(page.locator('#qa-status')).toContainText('Operación detenida');
  await expect(page.locator('#qa-reset')).toBeHidden();
  const diagnostic = await page.locator('#qa-diagnostic').innerText();
  expect(JSON.parse(diagnostic)).toMatchObject({ stage: 'response_non_ok', errorCode: 'RESET_RESPONSE_NON_OK', httpStatus: 403, jsonParsed: false, postVerificationStarted: false });
  expect(diagnostic).not.toContain('FICTITIOUS');
  expect(requests).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `../qa-7c-diagnostic-${testInfo.project.name}.png`, fullPage: true });
});
