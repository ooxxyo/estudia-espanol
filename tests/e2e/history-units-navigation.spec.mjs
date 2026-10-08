import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function history(page, theme = 'light') {
  await page.goto('/');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('main').getByRole('button', { name: /^Historia\b/ }).click();
  await page.evaluate(theme => { state.settings.themeMode = theme; applyThemeMode(); saveState(); }, theme);
}

async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

for (const theme of ['light', 'dark']) {
  test(`Historia agrupa el progreso real por unidades y oculta etiquetas (${theme})`, async ({ page }, testInfo) => {
    await history(page, theme);
    await page.evaluate(() => {
      state.stats.mayas = { attempts: 5, correct: 3, recent: [true, true, false], mastered: false };
      state.stats['euro-vikingos'] = { attempts: 4, correct: 2, recent: [true, false], mastered: false };
      render();
    });
    const beforeStats = await page.evaluate(() => JSON.stringify(state.stats));
    const overview = page.locator('.subject-overview');
    await expect(overview.locator('.subject-tag')).toHaveCount(0);
    await expect(overview).toContainText('18 temas disponibles');
    await expect(overview).toContainText('Unidad actual');
    await expect(overview).toContainText('Unidad anterior');
    const groups = page.locator('[data-history-progress]');
    await expect(groups).toHaveCount(2);
    for (const group of await groups.all()) await expect(group).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.history-progress-topics:visible')).toHaveCount(0);
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`history-${theme}-compact.png`), fullPage: true });
    const current = page.getByRole('button', { name: 'Progreso de Europeos', exact: true });
    await current.focus();
    await page.keyboard.press('Enter');
    const currentPanel = page.locator('#progress-historia-europeos');
    await expect(currentPanel).toBeVisible();
    await expect(currentPanel.locator('.topic-row')).toHaveCount(18);
    expect(await currentPanel.locator('[data-topic-progress="euro-vikingos"] .bar-fill').getAttribute('style')).toBe(await page.evaluate(() => `width:${computeMastery('euro-vikingos').pct}%`));
    const previous = page.getByRole('button', { name: 'Progreso de Geografía y grandes civilizaciones', exact: true });
    await previous.focus();
    await page.keyboard.press('Space');
    const previousPanel = page.locator('#progress-historia-geografia-civilizaciones');
    await expect(previousPanel.locator('.topic-row')).toHaveCount(8);
    await expect(previousPanel).toBeVisible();
    expect(await previousPanel.locator('[data-topic-progress="mayas"] .bar-fill').getAttribute('style')).toBe(await page.evaluate(() => `width:${computeMastery('mayas').pct}%`));
    expect(await page.evaluate(() => JSON.stringify(state.stats))).toBe(beforeStats);
    await previous.click();
    await expect(previousPanel).toBeHidden();
    const { violations } = await new AxeBuilder({ page }).include('#main').analyze();
    expect(violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => ({ id: v.id, nodes: v.nodes.map(n => n.failureSummary) }))).toEqual([]);
    await noOverflow(page);
  });
}

test('Volver, Escape y foco funcionan en los tres selectores sin perder selección', async ({ page }) => {
  await history(page);
  for (const mode of ['repaso', 'practica', 'examen']) {
    const trigger = page.locator(`[data-history-unit="historia-europeos"][data-history-open="${mode}"]`);
    await trigger.click();
    const picker = mode === 'examen' ? '#examTopics' : '#historyTopics';
    await page.getByRole('button', { name: 'Limpiar selección', exact: true }).click();
    await page.locator(`${picker} input[value="euro-jamestown"]`).check();
    await page.locator(`${picker} input[value="euro-plymouth"]`).check();
    await page.getByRole('button', { name: 'Volver', exact: true }).click();
    await expect(page.locator('.subject-overview')).toBeVisible();
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => state.session)).toBeNull();
    await trigger.click();
    await expect(page.locator(`${picker} input:checked`)).toHaveCount(2);
    await page.keyboard.press('Escape');
    await expect(page.locator('.subject-overview')).toBeVisible();
    await expect(trigger).toBeFocused();
  }
  await page.locator('[data-history-unit="historia-europeos"][data-history-open="examen"]').click();
  await page.getByRole('button', { name: 'Examen completo', exact: true }).click();
  await page.locator('#startExam').click();
  expect(await page.evaluate(() => state.session.mode)).toBe('examen');
  expect(await page.evaluate(() => state.session.queue.length)).toBe(8);
  expect(await page.evaluate(() => [...new Set(state.session.queue.map(q => q.topic))].sort())).toEqual(['euro-jamestown', 'euro-plymouth']);
  await expect(page.locator('#hintBtn')).toHaveCount(0);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#quitSession').click();
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  await page.locator('[data-history-unit="historia-europeos"][data-history-open="practica"]').click();
  await page.locator('[data-history-mode="practica"]').click();
  expect(await page.evaluate(() => [...new Set(state.session.queue.map(q => q.topic))].sort())).toEqual(['euro-jamestown', 'euro-plymouth']);
  await page.locator('#hintBtn').click();
  await page.locator('#quitSession').click();
  const sessionBefore = await page.evaluate(() => JSON.stringify(state.session));
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  expect(await page.evaluate(() => JSON.stringify(state.session))).toBe(sessionBefore);
  await page.locator('#resumeFromDash').click();
  await expect(page.locator('#hintZone')).toBeVisible();
});

test('Volver respeta el origen Hub y Escape cierra Más antes del selector', async ({ page }) => {
  await history(page);
  const navigation = page.locator('#rail:visible, #mobileNav:visible');
  await navigation.getByRole('button', { name: 'Hub', exact: true }).click();
  const trigger = navigation.getByRole('button', { name: 'Practicar', exact: true });
  await trigger.click();
  await expect(page.locator('#historyTopics')).toBeVisible();
  await navigation.getByRole('button', { name: 'Abrir menú Más' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#historyTopics')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: '¿Qué estudiamos hoy?' })).toBeVisible();
  await expect(trigger).toBeFocused();
});
