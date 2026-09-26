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
    const handlers = new Map();
    const reviewCalls = [];
    const element = key => {
      if (!elements.has(key)) elements.set(key, { checked: true, addEventListener(type, handler) { handlers.set(`${key}:${type}`, handler); }, focus() {} });
      return elements.get(key);
    };
    const main = { innerHTML: '', querySelectorAll: () => [], querySelector: element };
    const sandbox = {
      main, state: { activeTopicId: selected, settings: {} },
      activeSubject: () => ({ id: subjectId, name: subjectId }), activeTopics: () => [topic],
      activeQuestions: () => [{ topic: topic.id }], hasResumablePractice: () => false,
      computeMastery: () => ({ pct: 0 }), escHtml: value => value,
      VOCAB_TOPIC: topic, TOPICS: [], SPANISH_VOCABULARY: vocabulary.window.SpanishVocabulary,
      platformUiContext: () => ({ reviewTopic: (...args) => reviewCalls.push(args) }),
      document: { getElementById: () => null },
    };
    vm.createContext(sandbox);
    const start = html.indexOf('function renderPracticaHome(');
    vm.runInContext(html.slice(start, html.indexOf('/* ===', start)) + '\nrenderPracticaHome(main);', sandbox);
    return {
      markup: main.innerHTML,
      modes: vocabulary.window.SpanishVocabulary.modes,
      reviewCalls,
      triggerReview: () => handlers.get('#reviewPracticeTopic:click')?.(),
    };
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

test('Repasar desde un tema elegido abre ese tema directamente', async () => {
  const result = await practice('historia', 'geografia');
  result.triggerReview();
  assert.deepEqual(result.reviewCalls, [['historia', 'geografia']]);
});

function renderHubFixture(pending = null) {
  const subjects = [
    { id:'ingles', name:'Inglés', emoji:'📘', day:1, available:false, units:{current:null,previous:[],completed:[]} },
    { id:'salud', name:'Salud', emoji:'❤️', day:1, available:false, units:{current:null,previous:[],completed:[]} },
    { id:'historia', name:'Historia', emoji:'🏛️', day:1, available:true, units:{current:{name:'Historia',assessments:[]},previous:[],completed:[]} },
    { id:'ciencia', name:'Ciencia', emoji:'🔬', day:2, available:true, units:{current:{name:'Ciencia',assessments:[{label:'Prueba',status:'scheduled',date:'2026-09-30'}]},previous:[],completed:[]} },
    { id:'matematicas', name:'Matemáticas', emoji:'📐', day:2, available:true, units:{current:{name:'Matemáticas',assessments:[]},previous:[],completed:[]} },
    { id:'espanol', name:'Español', emoji:'📚', day:2, available:true, units:{current:{name:'Español',assessments:[]},previous:[],completed:[]} },
  ];
  const byId = new Map(subjects.map(subject => [subject.id, subject]));
  const main = { innerHTML:'', querySelectorAll:() => [], querySelector:() => null };
  const sandbox = {
    main, SUBJECT_CATALOG:subjects, SUBJECT_BY_ID:byId, STUDY_DAYS:[{id:1,name:'Día 1'},{id:2,name:'Día 2'}],
    state:{settings:{topicStudyStatus:{vocabulario:'reviewed'}},lastSubjectId:'historia',lastVisitedTopicBySubject:{historia:'geografia'}},
    accountSession:{user:null}, localDateLabel:() => 'sábado, 26 de septiembre',
    resumablePracticeProgress:() => pending, subjectsForDay:day => subjects.filter(subject => subject.day===day),
    renderHubSubjectCard:subject => `<article data-subject="${subject.id}">${subject.name}</article>`,
    subjectContent:() => ({topics:[{id:'geografia',name:'Geografía'}]}), escHtml:value => value,
    platformUiContext:() => ({}), goto() {}, resumeSavedPractice() {},
    window:{StudyHubHubUI:{mountHub() {}}}, document:{getElementById:() => null},
  };
  vm.createContext(sandbox);
  const start = html.indexOf('function renderHub(main)');
  vm.runInContext(html.slice(start, html.indexOf('function ringSvg(', start)) + '\nrenderHub(main);', sandbox);
  return main.innerHTML;
}

function renderSubjectCardFixture() {
  const subject={id:'matematicas',name:'Matemáticas',emoji:'📐',available:true,status:'Tema actual'};
  const sandbox={
    state:{settings:{seenContentAt:{},topicStudyStatus:{}}},
    SPANISH_VOCABULARY:{unit:{id:'spanish-current'}},
    subjectContent:()=>({units:{current:{name:'Grados decimales a grados, minutos y segundos',type:'Tema actual'}}}),
  };
  vm.createContext(sandbox);
  const start=html.indexOf('function renderHubSubjectCard(');
  vm.runInContext(html.slice(start,html.indexOf('function openSubject(',start))+'\nthis.markup=renderHubSubjectCard('+JSON.stringify(subject)+');',sandbox);
  return sandbox.markup;
}

test('Home no repite el mismo estado académico en la tarjeta de una materia', () => {
  const markup=renderSubjectCardFixture();
  assert.doesNotMatch(markup,/Tema actual · Tema actual/);
  assert.equal((markup.match(/Tema actual/g)||[]).length,2);
});

test('Home prioriza una sola continuación real y ordena estudiar, fechas y acciones secundarias', () => {
  const markup = renderHubFixture({subjectName:'Historia',current:2,total:10,answered:1,topic:'Geografía'});
  assert.equal((markup.match(/id="resumeFromHub"/g)||[]).length, 1);
  assert.doesNotMatch(markup, /continueLastTopic|Continuar donde lo dejaste/);
  const continueAt=markup.indexOf('id="hubContinueTitle"');
  const studyAt=markup.indexOf('id="hubStudyTitle"');
  const upcomingAt=markup.indexOf('id="hubUpcomingTitle"');
  const secondaryAt=markup.indexOf('id="hubSecondaryTitle"');
  assert.ok(continueAt >= 0 && continueAt < studyAt && studyAt < upcomingAt && upcomingAt < secondaryAt);
  for (const subject of ['Español','Matemáticas','Ciencia','Historia','Inglés','Salud']) assert.match(markup, new RegExp(subject));
  assert.match(markup, /Ciencia[\s\S]*Prueba[\s\S]*miércoles 30 sep/);
  for (const id of ['createAccountFromHub','loginFromHub','hubSignals']) assert.ok(markup.includes(id));
});

test('Home no inventa una continuación cuando solo existe un tema recordado', () => {
  const markup = renderHubFixture();
  assert.doesNotMatch(markup, /hubContinueTitle|resumeFromHub|continueLastTopic|Continuar donde lo dejaste/);
});

test('Home móvil libera la altura de las tarjetas para evitar bloques vacíos', () => {
  assert.match(html, /@media \(max-width:620px\)\{[^\n]*\.hub-subject-card\{min-height:0\}/);
});

function renderLowScoreResultsFixture() {
  const answers=Array.from({length:10},(_,index)=>({qid:`density-${index}`,correct:index===0}));
  const questions=new Map(answers.map(answer=>[answer.qid,{id:answer.qid,topic:'densidad',prompt:`Pregunta ${answer.qid}`}]))
  const elements=new Map();
  const element=id=>{
    if(!elements.has(id)) elements.set(id,{addEventListener(){}});
    return elements.get(id);
  };
  const main={innerHTML:''};
  const subject={id:'ciencia',name:'Ciencia'};
  const sandbox={
    main,
    state:{lastResult:{subjectId:'ciencia',unitId:'science-current',total:10,correctCount:1,pct:10,elapsed:30,byTopic:{densidad:{c:1,t:10}},answers,mode:'practica'}},
    SUBJECT_BY_ID:new Map([['ciencia',subject]]),SUBJECT:subject,
    subjectContent:()=>({topics:[{id:'densidad',name:'Densidad',icon:'◆'}]}),
    findQuestionById:id=>questions.get(id),topicForQuestion:()=>({id:'densidad',name:'Densidad',icon:'◆'}),
    fmtTime:seconds=>`${seconds}s`,goto(){},saveState(){},shuffle:rows=>rows,currentUnit:()=>({id:'science-current'}),
    document:{getElementById:element},
  };
  vm.createContext(sandbox);
  const start=html.indexOf('function renderResults(');
  vm.runInContext(html.slice(start,html.indexOf('/* =========================================================\n   ERRORES',start))+'\nrenderResults(main);',sandbox);
  return main.innerHTML;
}

test('Resultados no presenta como dominado un tema con rendimiento bajo', () => {
  const markup=renderLowScoreResultsFixture();
  assert.doesNotMatch(markup,/Dominas bien: Densidad/);
  assert.match(markup,/Todavía no hay un tema dominado en esta sesión/);
});

function renderReviewHomeFixture(rememberedTopicId = 'geografia') {
  const topic={id:'geografia',name:'Geografía',icon:'○'};
  const handlers=new Map(), calls=[];
  const continueButton={addEventListener(type,handler){handlers.set(type,handler);}};
  const main={innerHTML:'',querySelectorAll:()=>[],querySelector:selector=>selector==='#continuePreviousReview'?continueButton:null};
  const sandbox={
    main,state:{lastVisitedTopicBySubject:{historia:rememberedTopicId}},
    activeSubject:()=>({id:'historia',name:'Historia'}),activeTopics:()=>[topic],
    activeReviewCards:()=>[{topic:'geografia'}],VOCAB_TOPIC:topic,TOPICS:[],
    platformUiContext:()=>({reviewTopic:(...args)=>calls.push(args)}),
  };
  vm.createContext(sandbox);
  const start=html.indexOf('function renderRepasoHome(main)');
  vm.runInContext(html.slice(start,html.indexOf('function renderRepasoCards(',start))+'\nrenderRepasoHome(main);',sandbox);
  return {markup:main.innerHTML,calls,continueReview:()=>handlers.get('click')?.()};
}

test('Repasar ofrece el tema anterior como acción secundaria sin interceptar la selección', () => {
  const result=renderReviewHomeFixture();
  assert.ok(result.markup.indexOf('data-t="geografia"') < result.markup.indexOf('id="continuePreviousReview"'));
  assert.match(result.markup,/Continuar repaso anterior/);
  assert.doesNotMatch(result.markup,/Tu último repaso/);
  result.continueReview();
  assert.deepEqual(result.calls,[['historia','geografia']]);
});

test('Repasar no muestra continuación anterior si no existe un tema recuperable', () => {
  assert.doesNotMatch(renderReviewHomeFixture(null).markup,/continuePreviousReview|Continuar repaso anterior/);
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
