import { expect, test } from '@playwright/test';

async function signInAs(page, username) {
  await page.goto('/');
  const hub = page.locator('#rail:visible, #mobileNav:visible').getByRole('button', { name: 'Hub', exact: true });
  if (await hub.count()) await hub.click();
  await page.context().clearCookies();
  await page.goto(`/__test/persona/${encodeURIComponent(username)}`);
  await expect(page.getByRole('heading', { name: '¿Qué estudiamos hoy?' })).toBeVisible();
}

async function openSettings(page) {
  const navigation = page.locator('#rail:visible, #mobileNav:visible');
  const direct = navigation.getByRole('button', { name: 'Configuración' });
  if (await direct.count()) {
    await direct.click();
  } else {
    await navigation.getByRole('button', { name: 'Abrir menú Más' }).click();
    const dialog = page.getByRole('dialog', { name: 'Más' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Configuración' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Configuración' })).toBeVisible();
}

async function enableQaTools(page) {
  await openSettings(page);
  const toggle = page.getByRole('checkbox', { name: 'Activar QA Tools' });
  await expect(toggle).toBeVisible();
  if (!await toggle.isChecked()) await toggle.check();
}

async function startHistoryPractice(page) {
  await page.locator('#rail:visible, #mobileNav:visible').getByRole('button', { name: 'Hub', exact: true }).click();
  const main = page.getByRole('main');
  await main.getByRole('button', { name: /^Historia\b/ }).click();
  await main.getByRole('button', { name: 'Practicar', exact: true }).click();
  await main.getByRole('button', { name: /^Geografía\b/ }).click();
  await main.getByRole('button', { name: 'Practicar', exact: true }).click();
  await expect(page.locator('#qBody')).toBeVisible();
}

test('Developer / QA solo aparece cuando el servidor concede qa:tools', async ({ page }) => {
  await signInAs(page, 'qa-owner');
  await openSettings(page);
  await expect(page.getByRole('heading', { name: 'Developer / QA' })).toBeVisible();

  for (const username of ['qa-admin', 'qa-student']) {
    await signInAs(page, username);
    await openSettings(page);
    await expect(page.getByRole('heading', { name: 'Developer / QA' })).toHaveCount(0);
  }

  await page.locator('#rail:visible, #mobileNav:visible').getByRole('button', { name: 'Hub', exact: true }).click();
  await page.context().clearCookies();
  await page.goto('/__test/superdev');
  await expect(page.getByRole('heading', { name: '¿Qué estudiamos hoy?' })).toBeVisible();
  await openSettings(page);
  await expect(page.getByRole('heading', { name: 'Developer / QA' })).toBeVisible();
});

test('un 404 production-like o sessionStorage manipulado no concede UI QA', async ({ page }) => {
  await page.route('**/.netlify/functions/qa-tools', route => route.fulfill({
    status: 404,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'No encontrado.' }),
  }));
  await signInAs(page, 'qa-owner');
  await page.evaluate(() => sessionStorage.setItem('studyHubQaToolsVisible', 'true'));
  await openSettings(page);
  await expect(page.getByRole('heading', { name: 'Developer / QA' })).toHaveCount(0);
});

test('el toggle es temporal, sobrevive reload y desaparece al cambiar de cuenta', async ({ page }) => {
  await signInAs(page, 'qa-owner');
  await enableQaTools(page);
  await page.reload();
  await openSettings(page);
  await expect(page.getByRole('checkbox', { name: 'Activar QA Tools' })).toBeChecked();

  await signInAs(page, 'qa-student');
  await startHistoryPractice(page);
  await expect(page.getByRole('heading', { name: 'QA / Testing' })).toHaveCount(0);
});

test('autofill correcto e incorrecto usan controles y producen respuestas distintas', async ({ page }) => {
  await signInAs(page, 'qa-owner');
  await enableQaTools(page);
  await startHistoryPractice(page);

  const qaPanel = page.getByRole('region', { name: 'QA / Testing' });
  await expect(qaPanel).toBeVisible();
  await qaPanel.getByRole('button', { name: 'Autorrellenar correcto' }).click();
  const correctSelection = await page.locator('#qBody .selected, #qBody .picked, #qBody input, #qBody select').evaluateAll(elements => elements.map(element => element.value || element.textContent?.trim()).filter(Boolean).join('|'));
  expect(correctSelection).not.toBe('');

  await qaPanel.getByRole('button', { name: 'Autorrellenar incorrecto' }).click();
  const incorrectSelection = await page.locator('#qBody .selected, #qBody .picked, #qBody input, #qBody select').evaluateAll(elements => elements.map(element => element.value || element.textContent?.trim()).filter(Boolean).join('|'));
  expect(incorrectSelection).not.toBe(correctSelection);
});

test('todos los tipos de pregunta actuales declaran autofill seguro', async ({ page }) => {
  await page.goto('/');
  const unsupported = await page.evaluate(() => {
    const questions = [
      ...(window.STUDY_HUB_LEGACY_QUESTIONS || []),
      ...(window.HISTORY_CONTENT?.questions || []),
      ...(window.SCIENCE_CONTENT?.questions || []),
      ...(window.MATH_CONTENT?.questions || []),
    ];
    return questions.filter(question => !window.qaAutofillSupported(question)).map(question => ({ id: question.id, type: question.type }));
  });
  expect(unsupported).toEqual([]);
});

test('Completar ejercicio y Completar práctica usan el flujo académico normal', async ({ page }) => {
  await signInAs(page, 'qa-owner');
  await enableQaTools(page);
  await startHistoryPractice(page);

  let qaPanel = page.getByRole('region', { name: 'QA / Testing' });
  await qaPanel.getByRole('button', { name: 'Completar ejercicio' }).click();
  await expect(page.locator('#feedbackZone')).toContainText('Correcto');
  await page.getByRole('button', { name: /Siguiente pregunta|Ver resultados/ }).click();

  qaPanel = page.getByRole('region', { name: 'QA / Testing' });
  await qaPanel.getByRole('button', { name: 'Completar práctica de prueba' }).click();
  await expect(page.getByRole('heading', { name: /^Resultados de / })).toBeVisible();
});

test('Completar práctica se cancela al salir de Practice', async ({ page }) => {
  await signInAs(page, 'qa-owner');
  await enableQaTools(page);
  await startHistoryPractice(page);

  await page.getByRole('region', { name: 'QA / Testing' }).getByRole('button', { name: 'Completar práctica de prueba' }).click();
  await page.locator('#rail:visible, #mobileNav:visible').getByRole('button', { name: 'Hub', exact: true }).click();
  await expect(page.getByRole('heading', { name: '¿Qué estudiamos hoy?' })).toBeVisible();
  await page.waitForTimeout(150);
  await expect(page.getByRole('heading', { name: /^Resultados de / })).toHaveCount(0);
});
