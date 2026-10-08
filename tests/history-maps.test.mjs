import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('public/history-data.js', 'utf8'), sandbox);
if (fs.existsSync('public/js/history-map-geometry.js')) vm.runInContext(fs.readFileSync('public/js/history-map-geometry.js', 'utf8'), sandbox);
if (fs.existsSync('public/js/history-maps.js')) vm.runInContext(fs.readFileSync('public/js/history-maps.js', 'utf8'), sandbox);
const api = sandbox.window.StudyHubHistoryMaps;
const plain = value => JSON.parse(JSON.stringify(value));

test('los tres recursos nativos proceden del material sin raster ni originales públicos', () => {
  assert.equal(api?.maps.length, 3);
  assert.ok(sandbox.window.StudyHubHistoryMapGeometry);
  for (const map of api.maps) {
    assert.equal(map.src, undefined);
    const geometry = sandbox.window.StudyHubHistoryMapGeometry[map.id];
    assert.ok(geometry?.width > 0 && geometry.height > 0);
    assert.ok(geometry.layers.length);
    assert.ok(!JSON.stringify(geometry).includes('data:image'));
  }
});

test('asentamientos mantiene las cinco relaciones y evalúa identificación sobre el banco compartido', () => {
  assert.ok(api);
  const map = api.maps.find(item => item.id === 'asentamientos');
  assert.deepEqual(plain(map.elements.map(({ name, power, year }) => [name, power, year])), [
    ['San Agustín', 'España', 1565], ['Jamestown', 'Inglaterra', 1607], ['Quebec', 'Francia', 1608], ['Santa Fe', 'España', 1610], ['Plymouth', 'Inglaterra', 1620],
  ]);
  assert.equal(api.questions.filter(q => q.mapId === 'asentamientos').length, 5);
  for (const question of api.questions.filter(q => q.mapId === 'asentamientos')) {
    assert.equal(question.type, 'mc');
    assert.equal(question.subjectId, 'historia');
    assert.equal(question.unitId, 'historia-europeos');
    assert.equal(question.options[question.correct], map.elements.find(item => item.id === question.mapElementId).name);
    assert.ok(question.hints[0] && question.exp);
    assert.ok(!sandbox.window.HISTORY_CONTENT.questions.some(item => item.id === question.id));
  }
});

test('normalizar contexto rechaza IDs, modos, selección y zoom inválidos', () => {
  assert.ok(api);
  assert.deepEqual(plain(api.normalizeContext({ schema: 50, mapId: '<script>', mode: 'exam', selectedId: 'bad', zoom: Infinity })), { schema: 1, mapId: 'america-colonial', mode: 'study', selectedId: null, zoom: 1 });
  const ctx = api.normalizeContext({ mapId: 'asentamientos', mode: 'identify', selectedId: 'jamestown', zoom: 8 });
  assert.deepEqual(plain(ctx), { schema: 1, mapId: 'asentamientos', mode: 'identify', selectedId: 'jamestown', zoom: 2.5 });
  assert.equal(api.normalizeContext({ mapId: 'tordesillas', selectedId: 'jamestown', zoom: -1 }).selectedId, null);
});

test('el banco original sigue con 154 preguntas y los mapas reutilizan IDs aprobados', () => {
  assert.ok(api);
  assert.equal(sandbox.window.HISTORY_CONTENT.questions.length, 154);
  const ids = new Set(sandbox.window.HISTORY_CONTENT.questions.map(q => q.id));
  for (const map of api.maps) for (const id of map.questionIds) assert.ok(ids.has(id));
  assert.equal(new Set(api.questions.map(q => q.id)).size, api.questions.length);
});

test('La Española conserva dos partes y respuestas históricas precisas', () => {
  const questions = api.questions.filter(q => q.mapId === 'america-colonial');
  assert.ok(questions.length >= 5);
  const expected = [['espanola-occidental', 'Francia'], ['espanola-oriental', 'España'], ['alaska', 'Rusia'], ['brasil', 'Portugal']];
  for (const [id, answer] of expected) {
    const question = questions.find(q => q.id === `hm-america-${id}`);
    assert.ok(question, id);
    assert.equal(question.options[question.correct], answer);
    const layer = sandbox.window.StudyHubHistoryMapGeometry['america-colonial'].layers.find(layer => layer.id === id);
    assert.equal(layer.power, answer);
    assert.ok(layer.d.length);
  }
  assert.ok(!questions.some(q => /¿Qué potencia controlaba La Española\?/i.test(q.prompt)));
  assert.ok(!JSON.stringify(api).match(/Pequeñas zonas por validar|geometría provisional|ejemplo visual|contorno provisional/i));
});

test('Guayanas y Antillas Menores se evalúan colectivamente sin inventar microterritorios', () => {
  for (const id of ['guayanas', 'antillas-menores']) {
    const question = api.questions.find(q => q.id === `hm-america-${id}`);
    assert.ok(question);
    assert.equal(question.options[question.correct], 'Países Bajos, Francia e Inglaterra');
    assert.equal(question.mapElementId, undefined);
  }
  const layers = sandbox.window.StudyHubHistoryMapGeometry['america-colonial'].layers;
  assert.equal(layers.find(layer => layer.id === 'guayanas-holanda').power, 'Países Bajos');
  assert.equal(layers.find(layer => layer.id === 'guayanas-inglaterra').power, 'Inglaterra');
  assert.ok(!layers.some(layer => /guayanas|antillas/.test(layer.id) && layer.power === 'Rusia'));
});

test('la selección de Países Bajos resuelve el nombre de potencia y conserva asentamientos', () => {
  assert.equal(typeof api.optionIndex,'function');
  const america=api.maps.find(map=>map.id==='america-colonial');
  const q=api.questions.find(q=>q.id==='hm-america-alaska');
  assert.equal(api.optionIndex(q,america.elements.find(item=>item.id==='paises-bajos')),q.options.indexOf('Países Bajos'));
  const place=api.maps.find(map=>map.id==='asentamientos').elements[0];
  const settlementQuestion=api.questions.find(q=>q.mapId==='asentamientos');
  assert.equal(api.optionIndex(settlementQuestion,place),settlementQuestion.options.indexOf(place.name));
  assert.equal(api.optionIndex(q,undefined),-1);
});

test('restaurar una respuesta de examen permite continuar sin revelar feedback',()=>{
  const html=fs.readFileSync('public/index.html','utf8');
  const start=html.indexOf('function restoreFinalizedQuestion('),end=html.indexOf('function markAnswerVisual(',start);
  const button={},feedback={innerHTML:''};
  const context={state:{session:{mode:'examen',historyMapIds:['asentamientos'],idx:0,queue:[{id:'a'},{id:'b'}]}},document:{querySelectorAll:()=>[],getElementById:id=>id==='submitBtn'?button:feedback},advance:()=>{},sessionSelection:null};
  vm.createContext(context);vm.runInContext(html.slice(start,end),context);
  context.restoreFinalizedQuestion({id:'a'},true,{userAnswer:1});
  assert.equal(button.textContent,'Siguiente');assert.equal(button.disabled,false);assert.equal(feedback.innerHTML,'');
  context.state.session.idx=1;context.restoreFinalizedQuestion({id:'b'},true,{userAnswer:0});assert.equal(button.textContent,'Revisar antes de entregar');
});
