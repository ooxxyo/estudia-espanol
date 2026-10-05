import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';

const navigation = page => page.locator('#rail:visible, #mobileNav:visible');
const moreTrigger = page => navigation(page).getByRole('button', { name: 'Abrir menú Más' });

async function visit(page, view) {
  const direct = navigation(page).locator(`[data-nav="${view}"], [data-navm="${view}"]`);
  if (await direct.count()) await direct.click();
  else {
    await moreTrigger(page).click();
    await page.locator(`[data-more-view="${view}"]`).click();
  }
  await expect(page.locator('body')).toHaveAttribute('data-view', view);
}

async function prepare(page, theme, username = null) {
  // Keep this non-academic signal identical across the four visual fixtures.
  await page.route('**/.netlify/functions/presence', route => route.fulfill({ json: { count: 2 } }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(username ? `/__test/persona/${username}` : '/');
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
  if (username) await expect(navigation(page).getByRole('button', { name: 'Cuenta', exact: true })).toBeVisible();
  await visit(page, 'ajustes');
  await page.locator('#themeMode').selectOption(theme);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await visit(page, 'hub');
}

async function capture(page, testInfo, theme, step) {
  if (!process.env.BATCH1_EVIDENCE_DIR) return;
  const dir = path.join(process.env.BATCH1_EVIDENCE_DIR, `${testInfo.project.name}-${theme}`);
  await mkdir(dir, { recursive: true });
  await page.mouse.move(0, 0);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(dir, `${step}.png`), animations: 'disabled' });
}

async function checkNavigationA11y(page, selector) {
  const result = await new AxeBuilder({ page }).include(selector).analyze();
  const blocking = result.violations.filter(row => ['critical', 'serious'].includes(row.impact));
  expect(blocking.map(row => ({ id: row.id, targets: row.nodes.map(node => node.target) }))).toEqual([]);
}

for (const theme of ['light', 'dark']) {
  test(`Batch 1 composición, permisos y foco de Más — ${theme}`, async ({ page, isMobile }, testInfo) => {
    await prepare(page, theme);
    const nav = navigation(page);
    const ids = await nav.locator('[data-nav], [data-navm], [data-open-more]').evaluateAll(buttons => buttons.map(button => button.dataset.nav || button.dataset.navm || 'more'));
    expect(ids).toEqual(isMobile
      ? ['hub', 'repaso', 'more', 'practica', 'cuenta']
      : ['hub', 'today', 'repaso', 'practica', 'examen', 'dashboard', 'historial', 'errores', 'guardadas', 'more', 'ajustes', 'cuenta']);
    await expect(nav.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
    if (!isMobile) await expect(nav.locator('.nav-group-title')).toHaveText(['Principal', 'Estudio', 'Tu estudio', 'Accesos secundarios', 'Cuenta']);
    await checkNavigationA11y(page, isMobile ? '#mobileNav' : '#rail');
    await capture(page, testInfo, theme, '01-hub-guest');

    const trigger = moreTrigger(page);
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Más', exact: true });
    await expect(dialog.locator('.more-group h3')).toHaveText(isMobile
      ? ['Planificación', 'Estudio', 'Tu estudio', 'Comunidad', 'Producto y ayuda', 'Preferencias']
      : ['Planificación', 'Estudio', 'Comunidad', 'Producto y ayuda']);
    for (const id of ['cuenta', 'favorites', 'studyToday', 'admin']) await expect(dialog.locator(`[data-more-view="${id}"]`)).toHaveCount(0);
    await expect(page.locator('#main')).toHaveJSProperty('inert', true);
    await expect(page.locator('#closeMore')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.locator('button').last()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#closeMore')).toBeFocused();
    await checkNavigationA11y(page, '#morePanel');
    await capture(page, testInfo, theme, '02-more-guest-top');
    await dialog.evaluate(panel => { panel.scrollTop = panel.scrollHeight; });
    await capture(page, testInfo, theme, '03-more-guest-bottom');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page.locator('#main')).toHaveJSProperty('inert', false);
    await capture(page, testInfo, theme, '04-more-escape-focus');
    await visit(page, 'cuenta');
    await capture(page, testInfo, theme, '04b-entrar-guest');
  });

  test(`Batch 1 story y destinos compatibles — ${theme}`, async ({ page, isMobile }, testInfo) => {
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.name));
    await prepare(page, theme, 'qa-student');
    await capture(page, testInfo, theme, '05-hub-member');
    await moreTrigger(page).click();
    await expect(page.locator('[data-more-view="admin"]')).toHaveCount(0);
    await capture(page, testInfo, theme, '06-more-member');
    await page.keyboard.press('Escape');

    await visit(page, 'calendar');
    await moreTrigger(page).click();
    await expect(page.locator('[data-more-view="calendar"]')).toHaveAttribute('aria-current', 'page');
    await capture(page, testInfo, theme, '06b-more-selected-calendar');
    await page.keyboard.press('Escape');

    for (const [view, step] of [['dashboard', '07-resumen'], ['historial', '08-historial'], ['errores', '09-errores'], ['guardadas', '10-guardado']]) {
      await visit(page, view);
      const selected = isMobile ? navigation(page).locator('[data-open-more]') : navigation(page).locator(`[data-nav="${view}"]`);
      await expect(selected).toHaveAttribute('aria-current', 'page');
      await capture(page, testInfo, theme, step);
    }
    await page.getByRole('main').getByRole('button', { name: 'Ver favoritos', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'favorites');
    await expect(isMobile ? moreTrigger(page) : navigation(page).locator('[data-nav="guardadas"]')).toHaveAttribute('aria-current', 'page');
    await capture(page, testInfo, theme, '11-favoritos');
    await page.getByRole('main').getByRole('button', { name: 'Volver a Guardado', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'guardadas');
    await capture(page, testInfo, theme, '12-guardado-return');

    await visit(page, 'today');
    await page.getByRole('main').getByRole('button', { name: 'Qué estudiar hoy', exact: true }).waitFor();
    await capture(page, testInfo, theme, '13-hoy');
    await page.getByRole('main').getByRole('button', { name: 'Qué estudiar hoy', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'studyToday');
    await expect(page.locator('#studyTodayPanel .platform-list')).toBeVisible();
    await expect(isMobile ? moreTrigger(page) : navigation(page).locator('[data-nav="today"]')).toHaveAttribute('aria-current', 'page');
    await capture(page, testInfo, theme, '14-plan');
    await page.getByRole('main').getByRole('button', { name: 'Volver a Hoy', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-view', 'today');
    await visit(page, 'cuenta');
    await capture(page, testInfo, theme, '15-cuenta-member');
    expect(pageErrors).toEqual([]);

    await prepare(page, theme, 'qa-owner');
    await expect(navigation(page).getByRole('button', { name: 'Cuenta', exact: true })).toBeVisible();
    await moreTrigger(page).click();
    await expect(page.locator('[data-more-view="admin"]')).toBeVisible();
    const dialog = page.getByRole('dialog', { name: 'Más', exact: true });
    await dialog.evaluate(panel => { panel.scrollTop = panel.scrollHeight; });
    await capture(page, testInfo, theme, '16-more-owner');
    await page.keyboard.press('Escape');
  });
}

test('Batch 1 navegación pausa y recupera una práctica sin perder respuesta ni materia', async ({ page }) => {
  await prepare(page, 'light');
  const main = page.getByRole('main');
  await main.getByRole('button', { name: /^Historia\b/ }).click();
  await main.getByRole('button', { name: 'Practicar', exact: true }).click();
  await main.getByRole('button', { name: /^Geografía\b/ }).click();
  await main.getByRole('button', { name: 'Practicar', exact: true }).click();
  const answer = page.locator('#qBody').getByRole('button').first();
  const text = (await answer.textContent()).trim();
  await answer.click();
  await visit(page, 'hub');
  await expect(main.locator('.hub-continue-card')).toContainText('Historia');
  await page.reload();
  await main.getByRole('button', { name: 'Continuar práctica', exact: true }).click();
  await expect(page.locator('#qBody button.selected')).toHaveText(text);
  expect(await page.evaluate(() => {
    const saved=JSON.parse(localStorage.getItem('cuaderno_espanol_hub_progress_v1'));
    return {activeSubjectId:saved.activeSubjectId,sessionSubjectId:saved.session.subjectId};
  })).toEqual({activeSubjectId:'historia',sessionSubjectId:'historia'});
});

test('Batch 1 conserva el acceso invitado a Favoritos y al plan sin entradas principales duplicadas', async ({ page }) => {
  await prepare(page, 'light');
  await visit(page, 'guardadas');
  await expect(page.getByRole('main').getByRole('button', { name: 'Ver favoritos', exact: true })).toHaveCount(1);
  await page.getByRole('main').getByRole('button', { name: 'Ver favoritos', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-view', 'favorites');
  await page.getByRole('main').getByRole('button', { name: 'Volver a Guardado', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-view', 'guardadas');
  await visit(page, 'today');
  await expect(page.getByRole('main').getByRole('button', { name: 'Qué estudiar hoy', exact: true })).toHaveCount(1);
  await page.getByRole('main').getByRole('button', { name: 'Qué estudiar hoy', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-view', 'studyToday');
  await page.getByRole('main').getByRole('button', { name: 'Volver a Hoy', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-view', 'today');
});
