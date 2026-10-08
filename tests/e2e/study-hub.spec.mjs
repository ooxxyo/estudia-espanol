import { expect, test } from '@playwright/test';

async function signInAs(page, username) {
  await page.goto('/');
  await page.locator('#rail:visible, #mobileNav:visible').getByRole('button', { name: 'Hub', exact: true }).click();
  await expect(page.getByRole('heading', { name: '¿Qué estudiamos hoy?' })).toBeVisible();
  await page.context().clearCookies();
  await page.goto(`/__test/persona/${encodeURIComponent(username)}`);
  await expect(page.getByRole('heading', { name: '¿Qué estudiamos hoy?' })).toBeVisible();
}

async function openAccount(page) {
  await page.locator('#rail:visible, #mobileNav:visible').getByRole('button', { name: /^(Cuenta|Entrar)$/ }).click();
  await expect(page.getByRole('heading', { name: /Tu espacio de estudio|Tu estudio, donde lo dejaste/ })).toBeVisible();
}

async function openMore(page) {
  await page.locator('#rail:visible, #mobileNav:visible').getByRole('button', { name: 'Abrir menú Más' }).click();
  await expect(page.getByRole('dialog', { name: 'Más' })).toBeVisible();
}

test('Study Hub carga sin errores fatales y Home es utilizable', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');

  await expect(page.getByRole('heading', { name: '¿Qué estudiamos hoy?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Repasar', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Practicar', exact: true })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('qa-student conserva la sesión al recargar y puede cerrarla', async ({ page }) => {
  await signInAs(page, 'qa-student');
  await openAccount(page);
  const accountSummary = page.getByRole('region', { name: /QA Student Member/ });
  await expect(accountSummary).toContainText('@qa-student');

  await page.reload();
  await expect(accountSummary).toContainText('@qa-student');

  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.getByRole('heading', { name: 'Tu estudio, donde lo dejaste' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tu estudio, donde lo dejaste' })).toBeVisible();
});

test('los roles solo ven la administración permitida', async ({ page }) => {
  await signInAs(page, 'qa-student');
  await openMore(page);
  await expect(page.getByRole('button', { name: 'Administración' })).toHaveCount(0);

  for (const [username, label] of [['qa-admin', 'Admin'], ['qa-owner', 'Owner']]) {
    await signInAs(page, username);
    await openMore(page);
    await page.getByRole('button', { name: 'Administración' }).click();
    await expect(page.getByRole('heading', { name: `Administración ${label}` })).toBeVisible();
    if (username === 'qa-admin') {
      await expect(page.getByRole('button', { name: /^(Early Access|Sesiones|Sistema)$/ })).toHaveCount(0);
    }
  }
});

test('qa-suspended no puede utilizar una sesión normal', async ({ page }) => {
  await page.goto('/__test/persona/qa-suspended');
  await expect(page.getByRole('heading', { name: '¿Qué estudiamos hoy?' })).toBeVisible();
  await openAccount(page);
  await expect(page.getByRole('heading', { name: 'Tu estudio, donde lo dejaste' })).toBeVisible();
});

test('qa:tools pertenece solo a qa-owner dentro del harness', async ({ page }) => {
  for (const [username, expectedStatus] of [['qa-owner', 200], ['qa-admin', 403], ['qa-student', 403]]) {
    await signInAs(page, username);
    const response = await page.request.get('/.netlify/functions/qa-tools');
    expect(response.status()).toBe(expectedStatus);
    if (expectedStatus === 200) {
      await expect(response.json()).resolves.toEqual({ capabilities: ['qa:tools'], environment: 'local-test' });
    }
  }
});

test('una práctica normal conserva la respuesta seleccionada al guardar y reanudar', async ({ page }) => {
  await page.goto('/');
  const main = page.getByRole('main');
  await main.getByRole('button', { name: /^Historia\b/ }).click();
  await expect(main.getByRole('heading', { name: 'Historia' })).toBeVisible();
  await main.locator('[data-history-unit="historia-europeos"][data-history-open="practica"]').click();
  await main.getByRole('button', { name: 'Limpiar selección', exact: true }).click();
  await main.locator('#historyTopics input[value="euro-vikingos"]').check();
  await main.getByRole('button', { name: 'Practicar', exact: true }).click();

  const chosenAnswer = page.locator('#qBody').getByRole('button').first();
  const chosenText = await chosenAnswer.textContent();
  await chosenAnswer.click();
  await page.getByRole('button', { name: /Guardar y salir/ }).click();

  await expect(page.getByRole('heading', { name: 'Continúa donde la dejaste' })).toBeVisible();
  await page.reload();
  await main.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.locator('#qBody button.selected')).toHaveText(chosenText.trim());
});

test('el proyecto móvil mantiene navegación crítica y evita overflow horizontal', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Verificación específica del proyecto móvil');
  await page.goto('/');

  const mobileNav = page.locator('#mobileNav');
  for (const name of ['Hub', 'Repasar', 'Practicar', 'Entrar']) {
    await expect(mobileNav.getByRole('button', { name, exact: true })).toBeVisible();
  }
  await expect(mobileNav.getByRole('button', { name: 'Abrir menú Más' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  await mobileNav.getByRole('button', { name: 'Repasar', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Repaso de / })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
