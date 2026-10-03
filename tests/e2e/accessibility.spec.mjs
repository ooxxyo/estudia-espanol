import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const BLOCKING_IMPACTS = new Set(['critical', 'serious']);
const BLOCKING_RULES = new Set(['page-has-heading-one', 'region']);

function formatViolations(violations) {
  return violations.map(violation => {
    const nodes = violation.nodes.slice(0, 5).map(node => {
      const selector = node.target.map(target => String(target)).join(' ');
      const detail = String(node.failureSummary || '').replace(/\s+/g, ' ').trim();
      return `  - ${selector}${detail ? ` — ${detail}` : ''}`;
    }).join('\n');
    return `${violation.id} [${violation.impact || 'unknown'}] ${violation.description}\n${nodes}\n  ${violation.helpUrl}`;
  }).join('\n\n');
}

async function runAxeCheck(page, testInfo) {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(violation => BLOCKING_IMPACTS.has(violation.impact) || BLOCKING_RULES.has(violation.id));
  const nonBlocking = results.violations.filter(violation => !blocking.includes(violation));

  if (nonBlocking.length) {
    console.warn(`[axe][${testInfo.title}] non-blocking:\n${formatViolations(nonBlocking)}`);
    await testInfo.attach('axe-moderate-minor', {
      body: Buffer.from(formatViolations(nonBlocking)),
      contentType: 'text/plain',
    });
  }

  expect(formatViolations(blocking), 'axe encontró violations bloqueantes').toBe('');
}

async function signInAs(page, username) {
  await page.goto(`/__test/persona/${encodeURIComponent(username)}`);
  await expect(page.getByRole('heading', { name: '¿Qué estudiamos hoy?' })).toBeVisible();
}

async function openSettings(page) {
  const navigation = page.locator('#rail:visible, #mobileNav:visible');
  const direct = navigation.getByRole('button', { name: 'Configuración' });
  if (await direct.count()) await direct.click();
  else {
    await navigation.getByRole('button', { name: 'Abrir menú Más' }).click();
    await page.getByRole('dialog', { name: 'Más' }).getByRole('button', { name: 'Configuración' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Configuración' })).toBeVisible();
}

async function startQaPractice(page) {
  await page.locator('#rail:visible, #mobileNav:visible').getByRole('button', { name: 'Hub', exact: true }).click();
  const main = page.getByRole('main');
  await main.getByRole('button', { name: /^Historia\b/ }).click();
  await main.getByRole('button', { name: 'Practicar', exact: true }).click();
  await main.getByRole('button', { name: /^Geografía\b/ }).click();
  await main.getByRole('button', { name: 'Practicar', exact: true }).click();
  await expect(page.getByRole('region', { name: 'QA / Testing' })).toBeVisible();
}

test('Home no contiene violations bloqueantes', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '¿Qué estudiamos hoy?' })).toBeVisible();
  await runAxeCheck(page, testInfo);
});

test('Cuenta/Login no contiene violations bloqueantes', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.locator('#rail:visible, #mobileNav:visible').getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tu estudio, donde lo dejaste' })).toBeVisible();
  await runAxeCheck(page, testInfo);
});

test('Practice no contiene violations bloqueantes', async ({ page }, testInfo) => {
  await page.goto('/');
  const main = page.getByRole('main');
  await main.getByRole('button', { name: /^Historia\b/ }).click();
  await main.getByRole('button', { name: 'Practicar', exact: true }).click();
  await main.getByRole('button', { name: /^Geografía\b/ }).click();
  await main.getByRole('button', { name: 'Practicar', exact: true }).click();
  await expect(page.locator('#qBody').getByRole('button').first()).toBeVisible();
  await runAxeCheck(page, testInfo);
});

test('Administración Owner no contiene violations bloqueantes', async ({ page }, testInfo) => {
  await signInAs(page, 'qa-owner');
  await page.locator('#rail:visible, #mobileNav:visible').getByRole('button', { name: 'Abrir menú Más' }).click();
  await page.getByRole('button', { name: 'Administración' }).click();
  await expect(page.getByRole('heading', { name: 'Administración Owner' })).toBeVisible();
  await runAxeCheck(page, testInfo);
});

test('Settings con Developer / QA no contiene violations bloqueantes', async ({ page }, testInfo) => {
  await signInAs(page, 'qa-owner');
  await openSettings(page);
  await expect(page.getByRole('heading', { name: 'Developer / QA' })).toBeVisible();
  await runAxeCheck(page, testInfo);
});

test('Practice con QA Tools activo no contiene violations bloqueantes', async ({ page }, testInfo) => {
  await signInAs(page, 'qa-owner');
  await openSettings(page);
  await page.getByRole('checkbox', { name: 'Activar QA Tools' }).check();
  await startQaPractice(page);
  await runAxeCheck(page, testInfo);
});
