import {expect,test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function history(page){await page.goto('/');await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('main').getByRole('button',{name:/^Historia\b/}).click();}
test('los tres accesos son visibles en Europeos y vuelven al origen con foco',async({page})=>{
  await history(page);
  for(const mode of ['repaso','practica','examen'])await expect(page.locator(`[data-history-map-open="${mode}"]`)).toBeVisible();
  await page.locator('[data-history-map-open="repaso"]').click();
  await expect(page.locator('#mapStudy')).toHaveAttribute('aria-pressed','true');
  await page.locator('[data-history-map="asentamientos"]').click();
  await page.locator('#historyMapsBack').click();
  await expect(page.locator('[data-history-map-open="repaso"]')).toBeFocused();
  await page.locator('[data-history-map-open="practica"]').click();
  await expect(page.locator('[data-study-mode="practice"]')).toBeVisible();
  expect(await page.evaluate(()=>state.session.historyMapId)).toBe('asentamientos');
  await page.locator('#hintBtn').click();await expect(page.locator('#hintZone')).toBeVisible();
  await page.locator('#quitSession').click();await expect(page.locator('[data-history-map-open="practica"]')).toBeFocused();
  await page.locator('[data-history-map-open="examen"]').click();await page.locator('#historyMapsBack').click();
  await page.locator('#resumeFromDash').click();await expect(page.locator('#hintZone')).toBeVisible();
  await page.locator('#quitSession').click();await expect(page.locator('[data-history-map-open="practica"]')).toBeFocused();
});
test('los tres mapas evaluados no revelan asociaciones en geometría, atributos o feedback',async({page})=>{
  await history(page);await page.locator('[data-history-map-open="examen"]').click();await page.locator('#startHistoryMapExam').click();
  const ids=await page.evaluate(()=>state.session.queue.map(q=>q.id));expect(ids).toHaveLength(32);
  const historyBefore=await page.evaluate(()=>state.history.length);
  for(let i=0;i<ids.length;i++){
    await expect(page.locator('.history-map-exam')).toBeVisible();
    const markup=await page.locator('.history-map-exam').innerHTML();
    expect(markup).not.toMatch(/data-power|data-territory|data-map-group|data-map-answer|data-map-pin|oeste · Francia|este · España|hm-espana|hm-francia|Jamestown|San Agustín|Quebec|Santa Fe|Plymouth|1494|370 leguas/);
    const colors=await page.locator('.history-map-exam .hm-region').evaluateAll(regions=>[...new Set(regions.map(region=>getComputedStyle(region).fill))]);expect(colors).toHaveLength(1);
    await expect(page.locator('#hintBtn,#mapReveal,#historyMapDetail')).toHaveCount(0);
    await page.locator('.opt').first().click();await page.locator('#submitBtn').click();
    await expect(page.locator('#feedbackZone')).toBeEmpty();await expect(page.locator('.opt.correct,.opt.wrong')).toHaveCount(0);
    await page.locator('#submitBtn').click();
  }
  await expect(page.locator('#submitExamFinal')).toBeVisible();expect(await page.evaluate(()=>state.history.length)).toBe(historyBefore);
});
test('una práctica de mapas anterior sin metadata de origen sigue regresando al atlas',async({page})=>{
  await history(page);await page.locator('[data-history-unit="historia-europeos"][data-history-open="repaso"]').click();await page.locator('[data-history-map-open="repaso"]').click();await page.locator('#mapPractice').click();
  await page.evaluate(()=>{delete state.session.historyMapEntry;saveState();});
  await page.locator('#quitSession').click();await page.locator('#historyMapsBack').click();await page.locator('#historySelectorBack').click();
  await page.locator('[data-history-map-open="examen"]').click();await page.locator('#historyMapsBack').click();
  await page.locator('#resumeFromDash').click();await page.locator('#quitSession').click();
  await expect(page.locator('#historyMapSvg')).toBeVisible();await expect(page.locator('#mapStudy')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#mapPractice')).toBeFocused();
});
test('examen de mapas usa entrega real, selección independiente y SVG sin respuestas anticipadas',async({page})=>{
  await history(page);
  const defaults=await page.evaluate(()=>JSON.stringify(state.settings.examTopicsBySubject.historia));
  await page.locator('[data-history-map-open="examen"]').click();
  await expect(page.locator('#historyMapExamChoices input')).toHaveCount(3);
  for(const input of await page.locator('#historyMapExamChoices input').all())await input.uncheck();
  await expect(page.locator('#startHistoryMapExam')).toBeDisabled();
  await page.locator('#historyMapExamChoices input[value="asentamientos"]').check();
  await page.locator('#startHistoryMapExam').click();
  await expect(page.locator('[data-study-mode="exam"]')).toBeVisible();
  const ids=await page.evaluate(()=>state.session.queue.map(q=>q.id));expect(ids).toHaveLength(9);
  expect(ids.every(id=>id.startsWith('hm-asentamientos-')||id.startsWith('hist-eu-ase-'))).toBe(true);
  const safe=async()=>{
    await expect(page.locator('#hintBtn,#mapReveal,#historyMapDetail,#historyMapLegend')).toHaveCount(0);
    await expect(page.locator('.history-map-session')).toBeVisible();
    await expect(page.locator('.history-map-session [data-power],.history-map-session [data-territory],.history-map-session [data-map-answer],.history-map-session [data-map-group]')).toHaveCount(0);
    await expect(page.locator('.history-map-session')).not.toContainText(/España|Inglaterra|Francia|Jamestown|San Agustín|Quebec|Santa Fe|Plymouth|1565|1607|1608|1610|1620/);
    await expect(page.locator('#feedbackZone')).toBeEmpty();
    await expect(page.locator('.opt.correct,.opt.wrong,.hm-region.selected,.hm-marker.selected')).toHaveCount(0);
  };
  await safe();
  page.once('dialog',d=>d.dismiss());await page.locator('#quitSession').click();expect(await page.evaluate(()=>state.view)).toBe('session');
  await page.reload();await safe();
  for(let i=0;i<ids.length;i++){
    const answer=await page.evaluate(()=>({type:currentQ().type,correct:currentQ().correct}));
    if(answer.type==='mc')await page.locator(`.opt[data-i="${answer.correct}"]`).click();
    else if(answer.type==='tf')await page.locator(`.opt[data-v="${answer.correct}"]`).click();
    else await page.locator('#fillInput').fill(Array.isArray(answer.correct)?answer.correct[0]:String(answer.correct));
    await page.locator('#submitBtn').click();await safe();
    if(i===0){await page.reload();await safe();await expect(page.locator('#submitBtn')).toHaveText('Siguiente');}
    await page.locator('#submitBtn').click();
  }
  await expect(page.locator('#submitExamFinal')).toBeVisible();await expect(page.locator('#main')).not.toContainText('100%');
  await page.locator('[data-exam-question="0"]').click();await safe();await expect(page.locator('#submitBtn')).toHaveText('Siguiente');
  await page.locator('#submitBtn').click();
  await page.evaluate(()=>{state.session.idx=state.session.queue.length-1;render();});await page.locator('#submitBtn').click();
  page.once('dialog',d=>d.accept());await page.locator('#submitExamFinal').click();
  await expect(page.locator('.big')).toHaveText('100%');
  expect(await page.evaluate(()=>state.lastResult.mode)).toBe('examen');
  expect(await page.evaluate(()=>JSON.stringify(state.settings.examTopicsBySubject.historia))).toBe(defaults);
  await page.locator('#backDash').click();await expect(page.locator('#startHistoryMapExam')).toBeVisible();
  await page.locator('#historyMapsBack').click();await expect(page.locator('[data-history-map-open="examen"]')).toBeFocused();
  const {violations}=await new AxeBuilder({page}).include('#main').analyze();expect(violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);
});
test('selector general conserva sus 72 preguntas y cada modalidad ofrece su acceso cartográfico',async({page})=>{
  await history(page);
  for(const mode of ['repaso','practica','examen']){
    await page.locator(`[data-history-unit="historia-europeos"][data-history-open="${mode}"]`).click();
    await expect(page.locator(`[data-history-map-open="${mode}"]`)).toBeVisible();
    await page.locator('#historySelectorBack').click();
  }
  await page.locator('[data-history-unit="historia-europeos"][data-history-open="examen"]').click();
  await page.locator('#examSize [data-n="all"]').click();await page.locator('#startExam').click();
  const ids=await page.evaluate(()=>state.session.queue.map(q=>q.id));expect(ids).toHaveLength(72);expect(ids.some(id=>id.startsWith('hm-'))).toBe(false);
});
