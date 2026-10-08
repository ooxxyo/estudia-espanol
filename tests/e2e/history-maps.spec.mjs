import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function openMaps(page, theme = 'light') {
  await page.goto('/');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('main').getByRole('button', { name: /^Historia\b/ }).click();
  await page.locator('[data-history-unit="historia-europeos"][data-history-open="repaso"]').click();
  await page.evaluate(theme => { state.settings.themeMode = theme; applyThemeMode(); saveState(); }, theme);
  await page.getByRole('button', { name: 'Explorar mapas', exact: true }).click();
}

for (const theme of ['light', 'dark']) {
  test(`Mapas permite estudiar, identificar, ampliar y regresar (${theme})`, async ({ page }, info) => {
    await openMaps(page, theme);
    const contextBefore = await page.evaluate(() => JSON.stringify(state.settings.examTopicsBySubject.historia));
    for (const id of ['america-colonial', 'tordesillas', 'asentamientos']) {
      await page.locator(`[data-history-map="${id}"]`).click();
      await expect(page.locator('#historyMapSvg')).toBeVisible();
      await expect(page.locator('#historyMapImage')).toHaveCount(0);
      await page.locator('#mapLegendToggle').click();
      await expect(page.locator('#historyMapLegend')).toBeVisible();
      await page.locator('[data-map-element]').first().click();
      await expect(page.locator('#historyMapDetail')).toBeVisible();
      await page.locator('#mapZoomIn').click();
      await expect(page.locator('#mapZoomLabel')).toHaveText('125 %');
      await page.locator('#mapResetView').click();
      await expect(page.locator('#mapZoomLabel')).toHaveText('100 %');
      const { violations } = await new AxeBuilder({ page }).include('#main').analyze();
      expect(violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id)).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: info.outputPath(`${theme}-${id}.png`), fullPage: true });
    }
    await page.locator('#historyMapLegend [data-map-element="jamestown"]').click();
    await page.locator('#mapIdentify').click();
    await expect(page.locator('#historyMapDetail')).toContainText('Respuesta de la actividad oculta');
    await page.locator('#mapReveal').click();
    await expect(page.locator('#historyMapDetail')).toContainText('1607');
    await page.locator('#mapReveal').click();
    await expect(page.locator('#historyMapDetail')).not.toContainText('1607');
    await page.locator('#mapResetActivity').click();
    await page.locator('[data-map-pin="plymouth"]').focus();
    await page.keyboard.press('Enter');
    await page.locator('#mapReveal').click();
    await expect(page.locator('#historyMapDetail')).toContainText('1620');
    await page.reload();
    await expect(page.locator('[data-history-map="asentamientos"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#mapIdentify')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await expect(page.locator('#historyTopics')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Explorar mapas', exact: true })).toBeFocused();
    expect(await page.evaluate(() => JSON.stringify(state.settings.examTopicsBySubject.historia))).toBe(contextBefore);
    await page.getByRole('button', { name: 'Volver', exact: true }).click();
    await expect(page.locator('.subject-overview')).toBeVisible();
  });
}

test('identificar asentamientos usa dos intentos y conserva mapa, pista y sesión al guardar', async ({ page }, info) => {
  await openMaps(page);
  await page.locator('[data-history-map="asentamientos"]').click();
  await page.locator('#mapIdentify').click();
  await page.locator('#mapPractice').click();
  expect(await page.evaluate(() => state.session.queue.length)).toBe(5);
  await expect(page.locator('[data-map-answer][aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator('#hintZone')).toBeHidden();
  await page.locator('#hintBtn').click();
  await expect(page.locator('#hintZone')).toBeVisible();
  const question = await page.evaluate(() => ({ id: currentQ().id, correct: currentQ().correct, options: currentQ().options, element: currentQ().mapElementId }));
  await page.locator(`.opt[data-i="${(question.correct + 1) % 5}"]`).click();
  await page.locator('#submitBtn').click();
  expect(await page.evaluate(() => state.session.answers.length)).toBe(0);
  await expect(page.locator('#feedbackZone')).toContainText('Inténtalo otra vez');
  await expect(page.locator('[data-map-answer][aria-pressed="true"]')).toHaveCount(0);
  await page.locator(`.opt[data-i="${(question.correct + 2) % 5}"]`).click();
  await page.locator('#submitBtn').click();
  expect(await page.evaluate(() => state.session.answers.length)).toBe(1);
  await expect(page.locator('#feedbackZone')).toContainText(question.options[question.correct]);
  await page.screenshot({ path: info.outputPath('map-identification-feedback.png'), fullPage: true });
  await page.locator('#submitBtn').click();
  const next = await page.evaluate(() => currentQ().mapElementId);
  await page.locator(`[data-map-answer="${next}"]`).click();
  await page.locator('#hintBtn').click();
  await page.locator('#quitSession').click();
  await expect(page.locator('[data-history-map="asentamientos"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#mapPractice')).toBeFocused();
  await page.locator('[data-history-map="tordesillas"]').click();
  await page.reload();
  await page.locator('#mapResume').click();
  await expect(page.locator('#hintZone')).toBeVisible();
  expect(await page.evaluate(() => currentQ().mapElementId)).toBe(next);
  await page.locator('#submitBtn').click();
  await expect(page.locator('#feedbackZone')).toContainText('Correct');
  const { violations } = await new AxeBuilder({ page }).include('#main').analyze();
  expect(violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id)).toEqual([]);
  await page.locator('#quitSession').click();
  await expect(page.locator('[data-history-map="asentamientos"]')).toHaveAttribute('aria-selected', 'true');
  await page.locator('#mapStudy').click();
  await page.locator('#mapPractice').click();
  expect(await page.evaluate(() => state.settings.pausedPractices.some(row => row.historyMapId === 'asentamientos' && row.answers.length === 2))).toBe(true);
  expect(await page.evaluate(() => state.session.queue.every(q => q.id.startsWith('hist-eu-ase-')))).toBe(true);
});

test('Enter en zoom, marcadores y opciones selecciona sin responder ni avanzar', async ({ page }) => {
  await openMaps(page);
  await page.locator('[data-history-map="asentamientos"]').click();
  await page.locator('#mapIdentify').click();
  await page.locator('#mapPractice').click();
  const target = await page.evaluate(() => currentQ().mapElementId);
  await page.locator(`[data-map-answer="${target}"]`).click();
  await page.locator('#mapZoomIn').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#mapZoomLabel')).toHaveText('125 %');
  expect(await page.evaluate(() => state.session.answers.length)).toBe(0);
  expect(await page.evaluate(() => state.session.idx)).toBe(0);
  await page.locator('#mapResetView').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#mapZoomLabel')).toHaveText('100 %');
  await page.locator(`[data-map-answer="${target}"]`).focus();
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => state.session.answers.length)).toBe(0);
  await page.locator('.opt.selected').focus();
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => state.session.answers.length)).toBe(0);
  await page.locator('#submitBtn').focus();
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => state.session.answers.length)).toBe(1);
  expect(await page.evaluate(() => state.session.idx)).toBe(0);
  const before=await page.locator('[data-map-answer][aria-pressed="true"]').getAttribute('data-map-answer');
  const different=page.locator(`[data-map-answer]:not([data-map-answer="${before}"])`).first();
  await different.focus();await page.keyboard.press('Enter');
  await expect(page.locator('[data-map-answer][aria-pressed="true"]')).toHaveAttribute('data-map-answer',before);
});

test('los cinco lugares completan resultados, reiniciar guarda la anterior y Examen conserva 72 preguntas', async ({ page }) => {
  await openMaps(page);
  await page.locator('[data-history-map="asentamientos"]').click();
  await page.locator('#mapIdentify').click();
  await page.locator('#mapPractice').click();
  const visited = [];
  for (let i = 0; i < 5; i++) {
    const target = await page.evaluate(() => currentQ().mapElementId);
    visited.push(target);
    await page.locator(`[data-map-answer="${target}"]`).click();
    await page.locator('#submitBtn').click();
    await expect(page.locator('#feedbackZone')).toContainText('Correcto');
    await page.locator('#submitBtn').click();
  }
  expect(visited.sort()).toEqual(['jamestown', 'plymouth', 'quebec', 'san-agustin', 'santa-fe']);
  await expect(page.getByRole('heading', { name: 'Resultados de Historia' })).toBeVisible();
  await expect(page.locator('#backDash')).toHaveText('Volver a Mapas');
  await page.locator('#backDash').click();
  await expect(page.locator('[data-history-map="asentamientos"]')).toHaveAttribute('aria-selected', 'true');
  await page.locator('#mapPractice').click();
  await page.locator('#quitSession').click();
  await page.getByRole('button', { name: 'Reiniciar práctica', exact: true }).click();
  expect(await page.evaluate(() => state.settings.pausedPractices.some(row => row.historyMapId === 'asentamientos' && row.queueIds.length === 5))).toBe(true);
  await page.locator('#quitSession').click();
  await page.locator('#historyMapsBack').click();
  const navigation = page.locator('#rail:visible, #mobileNav:visible');
  if (await navigation.getByRole('button', { name: 'Examen', exact: true }).count()) await navigation.getByRole('button', { name: 'Examen', exact: true }).click();
  else {
    await navigation.getByRole('button', { name: 'Abrir menú Más' }).click();
    await page.locator('[data-more-view="examen"]').click();
  }
  await page.getByRole('button', { name: 'Seleccionar todos', exact: true }).click();
  await page.getByRole('button', { name: 'Examen completo', exact: true }).click();
  await page.locator('#startExam').click();
  expect(await page.evaluate(() => state.session.queue.length)).toBe(72);
  expect(await page.evaluate(() => state.session.queue.every(q => q.id.startsWith('hist-eu-')))).toBe(true);
  await expect(page.locator('#hintBtn')).toHaveCount(0);
  await expect(page.locator('#historyMapImage')).toHaveCount(0);
  await expect(page.locator('#feedbackZone')).toBeEmpty();
});

test('si falla la geometría siguen disponibles la leyenda y las respuestas textuales', async ({ page }) => {
  await page.route('**/js/history-map-geometry.js', route => route.abort());
  await openMaps(page);
  await expect(page.locator('.history-map-error')).toBeVisible();
  await page.locator('#mapLegendToggle').click();
  await page.locator('[data-map-element="portugal"]').click();
  await expect(page.locator('#historyMapDetail')).toContainText('Brasil');
  await page.locator('[data-map-element="portugal"]').click();
  await expect(page.locator('#historyMapDetail')).toContainText('Brasil');
  await page.locator('[data-history-map="asentamientos"]').click();
  await page.locator('#mapIdentify').click();
  await page.locator('#mapPractice').click();
  await expect(page.locator('.history-map-error')).toBeVisible();
  await expect(page.locator('.opt')).toHaveCount(5);
  const correct = await page.evaluate(() => currentQ().correct);
  await page.locator(`.opt[data-i="${correct}"]`).click();
  await page.locator('#submitBtn').click();
  await expect(page.locator('#feedbackZone')).toContainText('Correcto');
});

test('América distingue La Española y las potencias sin categorías técnicas', async ({ page }) => {
  await openMaps(page);
  const map=page.locator('#historyMapSvg');
  await expect(map.locator('[data-territory="espanola-occidental"]')).toHaveAttribute('data-power','Francia');
  await expect(map.locator('[data-territory="espanola-oriental"]')).toHaveAttribute('data-power','España');
  await expect(map.locator('[data-territory="alaska"]')).toHaveAttribute('data-power','Rusia');
  await expect(map.locator('[data-territory="brasil"]')).toHaveAttribute('data-power','Portugal');
  await expect(map.locator('[data-territory="guayanas-holanda"]')).toHaveAttribute('data-power','Países Bajos');
  await expect(map.locator('[data-territory="guayanas-inglaterra"]')).toHaveAttribute('data-power','Inglaterra');
  await expect(map.locator('[data-territory="antillas-menores"]')).toHaveCount(1);
  await map.locator('[data-territory="espanola-occidental"]').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#historyMapDetail')).toContainText('parte occidental de La Española');
  await map.locator('[data-territory="espanola-oriental"]').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#historyMapDetail')).toContainText('parte oriental de La Española');
  await page.locator('#mapLegendToggle').click();
  await page.locator('[data-map-element="guayanas"]').click();
  await expect(page.locator('#historyMapDetail')).toContainText('Países Bajos (Holanda), Francia e Inglaterra');
  await page.locator('[data-map-element="antillas-menores"]').click();
  await expect(page.locator('#historyMapDetail')).toContainText('Francia, Inglaterra y Países Bajos');
  expect(await page.locator('.history-maps').innerText()).not.toMatch(/zonas por validar|geometría provisional|ejemplo visual|pruebas técnicas/i);
  expect(await page.locator('.history-maps img').count()).toBe(0);
});

test('identificar América conserva preguntas precisas, pista y selección al reanudar', async ({page}) => {
  await openMaps(page);await page.locator('#mapIdentify').click();await page.locator('#mapPractice').click();
  expect(await page.evaluate(()=>state.session.queue.length)).toBe(15);
  expect(await page.evaluate(()=>state.session.queue.every(q=>q.mapId==='america-colonial'))).toBe(true);
  const q=await page.evaluate(()=>({id:currentQ().id,correct:currentQ().correct,prompt:currentQ().prompt,options:currentQ().options}));
  expect(q.prompt).not.toMatch(/¿Qué potencia controlaba La Española\?/);
  await page.locator('#hintBtn').click();
  await page.locator(`.opt[data-i="${q.correct}"]`).click();
  await page.locator('#quitSession').click();
  await page.locator('[data-history-map="tordesillas"]').click();await page.reload();
  await page.locator('#mapResume').click();
  expect(await page.evaluate(()=>currentQ().id)).toBe(q.id);
  await expect(page.locator('#hintZone')).toBeVisible();
  await expect(page.locator(`.opt[data-i="${q.correct}"]`)).toHaveClass(/selected/);
  await page.locator('#submitBtn').click();await expect(page.locator('#feedbackZone')).toContainText('Correcto');
  await expect(page.locator('#historyMapImage')).toHaveCount(0);
});

test('Países Bajos conecta su región con la opción de potencia en práctica', async ({page}) => {
  await openMaps(page);
  await page.evaluate(()=>startSession({mode:'practica',questionIds:['hm-america-alaska'],historyMapId:'america-colonial',returnView:'historyMaps'}));
  const index=await page.evaluate(()=>currentQ().options.indexOf('Países Bajos'));
  const shape=page.locator('#historyMapSvg [data-map-answer="paises-bajos"]').first();
  await shape.focus();await page.keyboard.press('Enter');
  await expect(page.locator(`.opt[data-i="${index}"]`)).toHaveClass(/selected/);
  await expect(shape).toHaveAttribute('aria-pressed','true');
  const correct=await page.evaluate(()=>currentQ().correct);
  await page.locator(`.opt[data-i="${correct}"]`).click();
  await expect(shape).toHaveAttribute('aria-pressed','false');
});
