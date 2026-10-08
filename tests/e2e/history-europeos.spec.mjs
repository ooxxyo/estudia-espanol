import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function openEuropeos(page) {
  await page.goto('/');
  await page.getByRole('main').getByRole('button', { name: /^Historia\b/ }).click();
  await page.getByRole('main').getByRole('button', { name: 'Europeos', exact: true }).click();
  await expect(page.locator('#historyTopics input')).toHaveCount(18);
}

async function chooseTopics(page, ids) {
  await page.getByRole('button', { name: 'Limpiar selección', exact: true }).click();
  for (const id of ids) await page.locator(`#historyTopics input[value="${id}"]`).check();
}

async function answer(page, correct) {
  const index = await page.evaluate(correct => {
    const q = state.session.queue[state.session.idx];
    return correct ? q.correct : (q.correct + 1) % 4;
  }, correct);
  await page.locator(`#qBody .opt[data-i="${index}"]`).click();
  await page.locator('#submitBtn').click();
}

async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

async function accessible(page) {
  const { violations } = await new AxeBuilder({ page }).include('#main').analyze();
  expect(violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, detail: n.failureSummary })) }))).toEqual([]);
}

for (const theme of ['light', 'dark']) {
  test(`Europeos: selección, repaso, pistas, feedback y reanudación (${theme})`, async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await openEuropeos(page);
    await page.evaluate(theme => { state.theme = theme; state.settings.themeMode = theme; applyThemeMode(); saveState(); }, theme);
    await noOverflow(page);
    await accessible(page);
    await page.screenshot({ path: testInfo.outputPath(`topics-${theme}.png`), fullPage: true });
    await chooseTopics(page, ['euro-gobierno', 'euro-plymouth']);
    await page.getByRole('main').getByRole('button', { name: 'Repasar', exact: true }).click();
    await expect(page.locator('[data-study-surface="review-card"]')).toBeVisible();
    await page.locator('#nextRep').click();
    await expect(page.locator('.study-session-context')).toHaveText('2 / 4');
    await page.locator('#prevRep').click();
    await noOverflow(page);
    await accessible(page);
    await page.screenshot({ path: testInfo.outputPath(`review-${theme}.png`), fullPage: true });
    await page.locator('#practThis').click();
    await expect(page.locator('.study-session-context')).toContainText('1 / 8');
    expect(await page.evaluate(() => [...new Set(state.session.queue.map(q => q.topic))].sort())).toEqual(['euro-gobierno', 'euro-plymouth']);
    await expect(page.locator('#hintZone')).toBeHidden();
    const initialOrder = await page.locator('#qBody .opt').evaluateAll(options => options.map(o => o.dataset.i));
    await page.locator('#hintBtn').click();
    await expect(page.locator('#hintZone')).toBeVisible();
    expect(await page.locator('#qBody .opt').evaluateAll(options => options.map(o => o.dataset.i))).toEqual(initialOrder);
    await page.locator('#quitSession').click();
    await page.reload();
    await page.locator('#resumePractice').click();
    await expect(page.locator('#hintZone')).toBeVisible();
    await answer(page, true);
    await expect(page.locator('#feedbackZone')).toContainText('Correcto');
    await expect(page.locator('#feedbackZone .why-box')).not.toBeEmpty();
    await expect(page.locator('#qBody .opt.correct')).toHaveAttribute('data-i', String(await page.evaluate(() => currentQ().correct)));
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`correct-${theme}.png`), fullPage: true });
    await page.locator('#submitBtn').click();
    await answer(page, false);
    await expect(page.locator('#feedbackZone')).toContainText('Inténtalo otra vez');
    await answer(page, false);
    await expect(page.locator('#feedbackZone')).toContainText('respuesta correcta');
    await expect(page.locator('#feedbackZone .why-box')).not.toBeEmpty();
    await expect(page.locator('#qBody .opt.correct')).toHaveAttribute('data-i', String(await page.evaluate(() => currentQ().correct)));
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`incorrect-${theme}.png`), fullPage: true });
    await page.locator('#quitSession').click();
    await expect(page.locator('#historyTopics input:checked')).toHaveCount(2);
    await page.getByRole('button', { name: 'Limpiar selección', exact: true }).click();
    await expect(page.locator('[data-history-mode="practica"]')).toBeDisabled();
    await expect(page.locator('[data-history-mode="repaso"]')).toBeDisabled();
    await page.reload();
    await expect(page.locator('#historyTopics input:checked')).toHaveCount(0);
    await page.getByRole('button', { name: 'Seleccionar todos', exact: true }).click();
    await expect(page.locator('#historyTopics input:checked')).toHaveCount(18);
    await page.locator('[data-history-mode="practica"]').click();
    expect(await page.evaluate(() => new Set(state.session.queue.map(q => q.id)).size)).toBe(72);
    await page.locator('#quitSession').click();
    await page.locator('[data-resume-paused]').first().click();
    expect(await page.locator('#qBody .opt').evaluateAll(options => options.map(o => o.dataset.i))).toEqual(await page.evaluate(() => state.session.optionOrderByQuestion[currentQ().id].map(String)));
    expect(await page.evaluate(() => state.session.answers.length)).toBe(2);
    expect(errors).toEqual([]);
  });

  test(`Europeos: examen protegido, resultados y errores (${theme})`, async ({ page }, testInfo) => {
    await openEuropeos(page);
    await chooseTopics(page, ['euro-trabajo']);
    await page.getByRole('main').getByRole('button', { name: 'Examen', exact: true }).click();
    await page.evaluate(theme => { state.theme = theme; state.settings.themeMode = theme; applyThemeMode(); }, theme);
    await expect(page.locator('#examTopics input:checked')).toHaveCount(1);
    await page.getByRole('button', { name: 'Examen completo', exact: true }).click();
    await page.locator('#startExam').click();
    await expect(page.locator('#hintBtn')).toHaveCount(0);
    await noOverflow(page);
    await accessible(page);
    await page.screenshot({ path: testInfo.outputPath(`exam-${theme}.png`), fullPage: true });
    page.once('dialog', dialog => dialog.dismiss());
    await page.locator('#quitSession').click();
    await expect(page.locator('[data-study-mode="exam"]')).toBeVisible();
    for (let i = 0; i < 4; i++) {
      await answer(page, i !== 0);
      await expect(page.locator('#feedbackZone')).toBeEmpty();
      await page.locator('#submitBtn').click();
    }
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /Entregar examen/ }).click();
    await expect(page.locator('[data-study-surface="results"]')).toBeVisible();
    await expect(page.getByRole('main')).toContainText('75%');
    await noOverflow(page);
    await accessible(page);
    await page.screenshot({ path: testInfo.outputPath(`results-${theme}.png`), fullPage: true });
    await page.locator('#retryWrong').click();
    await expect(page.locator('#hintBtn')).toBeVisible();
    expect(await page.evaluate(() => state.session.queue.length)).toBe(1);
  });
}

test('actualizar Historia conserva progreso y una práctica antigua de Mayas', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const q = HISTORY_CONTENT.questions.find(q => q.topic === 'mayas');
    state.activeSubjectId = 'historia'; state.activeUnitId = 'historia-geografia-civilizaciones';
    state.stats.mayas = { attempts: 5, correct: 3, recent: [true, false], mastered: false };
    state.saved.add(q.id);
    state.session = { subjectId: 'historia', unitId: 'historia-geografia-civilizaciones', mode: 'practica', queue: [q], idx: 0, answers: [], hintLevel: 1, currentSelection: q.correct, returnView: 'practica', startedAt: Date.now() };
    state.view = 'practica'; saveState();
  });
  await page.reload();
  await page.locator('#resumePractice').click();
  await expect(page.locator('#hintZone')).toBeVisible();
  expect(await page.evaluate(() => state.stats.mayas.attempts)).toBe(5);
  expect(await page.evaluate(() => state.session.unitId)).toBe('historia-geografia-civilizaciones');
  expect(await page.evaluate(() => state.saved.has(state.session.queue[0].id))).toBe(true);
  await expect(page.locator('#qBody .opt.selected')).toHaveAttribute('data-i', String(await page.evaluate(() => currentQ().correct)));
  await page.locator('#quitSession').click();
  await page.locator('#rail:visible, #mobileNav:visible').getByRole('button', { name: 'Hub', exact: true }).click();
  await page.getByRole('main').getByRole('button', { name: /^Historia\b/ }).click();
  await expect(page.getByRole('button', { name: 'Europeos', exact: true })).toBeVisible();
  expect(await page.evaluate(() => state.stats.mayas.attempts)).toBe(5);
  expect(await page.evaluate(() => state.stats['euro-vikingos'].attempts)).toBe(0);
});

test('los enlaces de temas y tarjetas anteriores conservan su unidad y tarjeta', async ({ page }) => {
  await page.goto('/');
  // Son los mismos handlers que usan Favoritos y búsqueda académica.
  await page.evaluate(() => platformUiContext().reviewTopic('historia', 'mayas'));
  await expect(page.locator('.q-topic-tag')).toHaveText('Mayas');
  expect(await page.evaluate(() => state.activeUnitId)).toBe('historia-geografia-civilizaciones');
  await page.evaluate(() => platformUiContext().reviewCard('historia', 'historia|mayas|Haab'));
  await expect(page.getByRole('heading', { name: 'Haab', exact: true })).toBeVisible();
  await page.locator('#practThis').click();
  expect(await page.evaluate(() => [...new Set(state.session.queue.map(q => q.topic))])).toEqual(['mayas']);
});

test('Examen conserva selección vacía, varios temas y todos sin mezclar unidades', async ({ page }) => {
  await openEuropeos(page);
  await chooseTopics(page, ['euro-vikingos', 'euro-jamestown']);
  await page.getByRole('main').getByRole('button', { name: 'Examen', exact: true }).click();
  await page.getByRole('button', { name: 'Examen completo', exact: true }).click();
  await page.getByRole('button', { name: 'Limpiar selección', exact: true }).click();
  await expect(page.locator('#startExam')).toBeDisabled();
  await page.reload();
  await expect(page.locator('#examTopics input:checked')).toHaveCount(0);
  for (const id of ['euro-vikingos', 'euro-jamestown']) await page.locator(`#examTopics input[value="${id}"]`).check();
  await page.locator('#startExam').click();
  expect(await page.evaluate(() => state.session.queue.length)).toBe(8);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#quitSession').click();
  await page.getByRole('button', { name: 'Seleccionar todos', exact: true }).click();
  await page.locator('#startExam').click();
  expect(await page.evaluate(() => state.session.queue.length)).toBe(72);
  expect(await page.evaluate(() => state.session.queue.every(q => q.unitId === 'historia-europeos'))).toBe(true);
  expect(await page.evaluate(() => new Set(state.session.queue.map(q => q.id)).size)).toBe(72);
});
