import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('Más agrupa cada destino una sola vez y conserva permisos y cinco accesos', () => {
  const sandbox = { state: { view: 'hub' }, accountSession: { user: null } };
  vm.createContext(sandbox);
  vm.runInContext(html.slice(html.indexOf('const MORE_NAV_ITEMS='), html.indexOf('function primaryLabel(')) + '\nthis.items=MORE_NAV_ITEMS;this.groups=MORE_NAV_GROUPS;this.visible=visibleMoreItems;', sandbox);
  assert.deepEqual(Array.from(sandbox.groups, group => group.label), ['Estudiar','Organizar','Social','Progreso','Cuenta']);
  const ids = Array.from(sandbox.groups).flatMap(group => Array.from(group.ids));
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids.slice().sort(), Array.from(sandbox.items, item => item.id).sort());
  assert.equal(sandbox.visible().some(item => item.id === 'admin'), false);
  for (const role of ['admin','owner','superdev']) {
    sandbox.accountSession.user = { role };
    assert.equal(sandbox.visible().some(item => item.id === 'admin'), true);
  }
  sandbox.accountSession.user = { role: 'member' };
  assert.equal(sandbox.visible().some(item => item.id === 'admin'), false);
});

function practice(subjectId, selected = null) {
  const vocabulary = { window: {} }; vm.createContext(vocabulary);
  return readFile(new URL('../public/js/spanish-vocabulary.js', import.meta.url),'utf8').then(source => {
    vm.runInContext(source, vocabulary);
    const topic = { id: subjectId === 'espanol' ? 'vocabulario' : 'geografia', name: 'Tema de prueba', icon: '○' };
    const elements = new Map();
    const element = key => {
      if (!elements.has(key)) elements.set(key, { checked: true, addEventListener() {}, focus() {} });
      return elements.get(key);
    };
    const main = { innerHTML: '', querySelectorAll: () => [], querySelector: element };
    const sandbox = {
      main, state: { activeTopicId: selected, settings: {} },
      activeSubject: () => ({ id: subjectId, name: subjectId }), activeTopics: () => [topic],
      activeQuestions: () => [{ topic: topic.id }], hasResumablePractice: () => false,
      computeMastery: () => ({ pct: 0 }), escHtml: value => value,
      VOCAB_TOPIC: topic, TOPICS: [], SPANISH_VOCABULARY: vocabulary.window.SpanishVocabulary,
      document: { getElementById: () => null },
    };
    vm.createContext(sandbox);
    const start = html.indexOf('function renderPracticaHome(');
    vm.runInContext(html.slice(start, html.indexOf('/* ===', start)) + '\nrenderPracticaHome(main);', sandbox);
    return { markup: main.innerHTML, modes: vocabulary.window.SpanishVocabulary.modes };
  });
}

test('sin tema no se renderizan modos de vocabulario ni CTA de tema', async () => {
  const { markup } = await practice('espanol');
  assert.match(markup, /Selecciona un tema arriba para comenzar/);
  assert.match(markup, /Elige qué quieres practicar/);
  assert.doesNotMatch(markup, /<summary>Elegir tema<\/summary>/);
  assert.doesNotMatch(markup, /data-vocab-mode=|id="reviewPracticeTopic"/);
});

test('tema español conserva todos los modos, agrupados sin duplicar repasar/practicar', async () => {
  const { markup, modes } = await practice('espanol', 'vocabulario');
  assert.match(markup, /data-topic="vocabulario">Practicar/);
  assert.match(markup, /id="reviewPracticeTopic">Repasar/);
  assert.ok(markup.indexOf('>Practicar<') < markup.indexOf('id="reviewPracticeTopic">Repasar'));
  assert.match(markup, /<summary><span>Más opciones<\/span>/);
  assert.doesNotMatch(markup, /Práctica combinada y modos especiales|Opciones de práctica/);
  for (const mode of modes.filter(mode => !['study','general'].includes(mode.id))) assert.ok(markup.includes(`data-vocab-mode="${mode.id}"`), mode.id);
  assert.doesNotMatch(markup, /data-vocab-mode="(?:study|general)"/);
});

test('tema Historia no ofrece modos de Español', async () => {
  const { markup } = await practice('historia', 'geografia');
  assert.match(markup, /data-topic="geografia">Practicar/);
  assert.doesNotMatch(markup, /data-vocab-mode=/);
});

test('Hub no duplica prioridad ni estadísticas y conserva cuenta y continuación', () => {
  const hub = html.slice(html.indexOf('function renderHub(main)'), html.indexOf('function ringSvg('));
  assert.doesNotMatch(hub, /Progreso por materia|openSpanishQuick|openHistoryQuick/);
  for (const id of ['resumeFromHub','continueLastTopic','createAccountFromHub','loginFromHub','hubSignals']) assert.ok(hub.includes(id));
});

test('repaso conserva favoritos en disclosure y una única salida del tema', () => {
  const review = html.slice(html.indexOf('function renderRepasoCards('), html.indexOf('function renderPracticaHome('));
  assert.equal((review.match(/id="exitTopic"/g) || []).length, 1);
  assert.doesNotMatch(review, /backRep/);
  assert.match(review, /id="practThis">Practicar este tema/);
  assert.match(review, /<summary><b>Más opciones<\/b>/);
  assert.doesNotMatch(review, /Ver opciones ▾/);
  for (const id of ['cardKnown','cardUnknown','cardFavorite','topicFavorite','practThis','prevRep','nextRep']) assert.ok(review.includes(`id="${id}"`));
});

test('comunidad conserva contenido completo y acciones secundarias; calendario no confunde pasado con vencido', async () => {
  const source = await readFile(new URL('../public/js/platform-ui.js', import.meta.url),'utf8');
  assert.match(source, /<summary>Filtros de comunidad<\/summary>/);
  assert.match(source, /<summary>Más acciones<\/summary>/);
  assert.match(source, /<summary>Leer aporte completo<\/summary>/);
  assert.match(source, /context.escape\(row.text\)/);
  assert.match(source, /<h2>Mis asignaciones<\/h2>/);
  assert.match(source, /row.date<today\?'Pasado'/);
  assert.doesNotMatch(source, /OVERDUE/);
});

test('menú Más aísla el fondo y mantiene foco al cerrar o navegar', () => {
  const menu = html.slice(html.indexOf('function closeMoreMenu('),html.indexOf('function renderNav('));
  assert.match(menu, /element.inert=true/);
  assert.match(menu, /element.inert=false/);
  assert.match(menu, /heading.focus\(\)/);
  assert.match(menu, /if\(restoreFocus\).*\.focus\(\)/);
  assert.match(menu, /event.shiftKey/);
  assert.match(menu, /event.key==='Escape'/);
});


test('los disclosures nativos no muestran flechas y la práctica seamless guarda la anterior', () => {
  assert.match(html, /details>summary\{list-style:none\}/);
  assert.match(html, /showToast\('Práctica anterior guardada'\)/);
  assert.match(html, /pausedPractices/);
  assert.match(html, /practiceTopicBySubject/);
  assert.match(html, /id="clearExamSelection"/);
});
