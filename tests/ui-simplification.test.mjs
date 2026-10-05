import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const historySource = await readFile(new URL('../public/history-data.js', import.meta.url), 'utf8');

test('la identidad visible usa Study Hub 0.8.0 y presenta superdev como Owner sin cambiar el contrato', () => {
  const version = html.match(/const APP_VERSION = '([^']+)'/)?.[1];
  assert.equal(version, '0.8.0');
  const roleSource = html.match(/function roleLabel\(role\)\{[^}]+\}/)?.[0];
  assert.ok(roleSource);
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${roleSource};this.roleLabel=roleLabel;`, sandbox);
  assert.equal(sandbox.roleLabel('superdev'), 'Owner');
  assert.equal(sandbox.roleLabel('owner'), 'Owner');
  const audienceSource = html.match(/function featureAudienceLabel\(audience\)\{[^}]+\}/)?.[0];
  assert.ok(audienceSource);
  vm.runInContext(`${audienceSource};this.featureAudienceLabel=featureAudienceLabel;`, sandbox);
  assert.equal(sandbox.featureAudienceLabel('superdev'), 'Owner');
  assert.equal(sandbox.featureAudienceLabel('admins'), 'Admins');
  assert.match(html, /role==='superdev'/);
  assert.match(html, /roles:\['superdev'\]/);
  assert.match(html, /<option value="\$\{value\}"[^>]*>\$\{featureAudienceLabel\(value\)\}<\/option>/);
  assert.doesNotMatch(html, /Entrar como Super Dev|Laboratorio Super Dev|Super Dev nunca puede modificarse/);
  const nav = html.slice(html.indexOf('function openMoreMenu('), html.indexOf('function resolveViewAlias('));
  assert.match(nav, /more-product-meta[\s\S]*Study Hub[\s\S]*v\$\{APP_VERSION\}/);
  const railBrand = html.match(/<div class="rail-brand">[\s\S]*?<\/div>\s*\$\{DESKTOP_NAV_GROUPS/)?.[0] || '';
  assert.match(railBrand, /class="brand-tile"[^>]*>S</);
  assert.match(railBrand, /class="brand-name"[^>]*>Study Hub</);
  assert.match(railBrand, /class="brand-version"[^>]*>v\$\{APP_VERSION\}</);
  const settings = html.slice(html.indexOf('function renderAjustes('), html.indexOf('function renderNovedadesFooter('));
  assert.match(settings, /Study Hub[\s\S]*v\$\{APP_VERSION\}/);
});

test('Configuración conserva light/dark/auto y no ofrece ni aplica un acento manual', () => {
  const settings = html.slice(html.indexOf('function renderAjustes('), html.indexOf('/* =========================================================\n   TECLADO'));
  assert.match(settings, /id="themeMode"/);
  assert.match(settings, />Claro<|>Oscuro<|>Automático</);
  assert.doesNotMatch(settings, /accentColor|settings-color|Color de la interfaz/);
  assert.doesNotMatch(html, /applyAccentColor|incoming\.accentColor|accentColor:/);
});

test('Historia modela una evaluación confirmada con fecha exacta pendiente', () => {
  const sandbox = { window:{} };
  vm.createContext(sandbox);
  vm.runInContext(historySource, sandbox);
  const assessment = sandbox.window.HISTORY_CONTENT.unit.assessments.find(item => item.status === 'scheduled');
  assert.ok(assessment);
  assert.equal(assessment.confirmed, true);
  assert.equal(assessment.date, null);
  assert.equal(assessment.dateStatus, 'pending');
  assert.equal(assessment.provisionalDateLabel, 'Próxima semana');
  assert.doesNotMatch(JSON.stringify(assessment), /viernes|2026-\d{2}-\d{2}/i);
});

function subjectCatalogFixture() {
  const sandbox = {
    HISTORY_CONTENT:{unit:{id:'history-unit'}}, SCIENCE_CONTENT:{unit:{id:'science-unit'}}, MATH_CONTENT:{unit:{id:'math-unit'}},
    SPANISH_VOCABULARY:{unit:{id:'spanish-unit'}}, TOPICS:[],
  };
  vm.createContext(sandbox);
  const start = html.indexOf('const SUBJECT_CATALOG=');
  const end = html.indexOf('const SUBJECT_BY_ID=', start);
  vm.runInContext(`${html.slice(start,end)};this.catalog=SUBJECT_CATALOG;`, sandbox);
  return sandbox.catalog;
}

test('Home conserva Memoir para Inglés y deja Español pendiente de confirmación', () => {
  const catalog = subjectCatalogFixture();
  const english = catalog.find(subject => subject.id === 'ingles');
  const spanish = catalog.find(subject => subject.id === 'espanol');
  assert.equal(english.currentMaterial, 'Memoir');
  assert.equal(english.available, false);
  assert.equal(spanish.currentMaterial, 'Pendiente de confirmación');
  assert.doesNotMatch(spanish.currentMaterial, /Vocabulario|Black Beauty|Realismo/i);
});

test('Batch 1 organiza los destinos sin duplicarlos y conserva los permisos de Más', () => {
  const sandbox = { state: { view: 'hub' }, accountSession: { user: null } };
  vm.createContext(sandbox);
  vm.runInContext(html.slice(html.indexOf('const PRIMARY_NAV_ITEMS='), html.indexOf('function primaryLabel(')) + '\nthis.primary=PRIMARY_NAV_ITEMS;this.items=MORE_NAV_ITEMS;this.desktop=DESKTOP_NAV_GROUPS;this.groups=MORE_NAV_GROUPS;this.mobileGroups=MOBILE_MORE_NAV_GROUPS;this.visible=visibleMoreItems;', sandbox);
  assert.deepEqual(Array.from(sandbox.desktop, group => group.label), ['Principal','Estudio','Tu estudio','Accesos secundarios','Cuenta']);
  assert.deepEqual(Array.from(sandbox.desktop).flatMap(group => Array.from(group.items, item => item.id)), [
    'hub','today','repaso','practica','examen','dashboard','historial','errores','guardadas','more','ajustes','cuenta',
  ]);
  assert.deepEqual(Array.from(sandbox.groups, group => group.label), ['Planificación','Estudio','Comunidad','Producto y ayuda','Gestión']);
  const desktopMoreIds = Array.from(sandbox.groups).flatMap(group => Array.from(group.ids));
  assert.equal(new Set(desktopMoreIds).size, desktopMoreIds.length);
  assert.deepEqual(desktopMoreIds, [
    'calendar','search','community','groups','friends','notifications','leaderboard',
    'novedades','roadmap','feedback','bugReport','admin',
  ]);
  const mobileIds = Array.from(sandbox.mobileGroups).flatMap(group => Array.from(group.ids));
  assert.deepEqual(Array.from(sandbox.mobileGroups, group => group.label), ['Planificación','Estudio','Tu estudio','Comunidad','Producto y ayuda','Preferencias','Gestión']);
  assert.equal(new Set(mobileIds).size, mobileIds.length);
  assert.deepEqual(mobileIds.slice().sort(), Array.from(sandbox.items, item => item.id).sort());
  assert.deepEqual(Array.from(sandbox.primary, item => item.id), ['hub','repaso','more','practica','cuenta']);
  const directIds=Array.from(sandbox.desktop).flatMap(group=>Array.from(group.items,item=>item.id));
  assert.equal(new Set(directIds).size,directIds.length);
  assert.equal(desktopMoreIds.some(id=>directIds.includes(id)),false);
  assert.equal(mobileIds.includes('cuenta'),false);
  assert.equal(mobileIds.includes('favorites'),false);
  assert.equal(mobileIds.includes('studyToday'),false);
  assert.equal(sandbox.items.find(item=>item.id==='dashboard').label,'Resumen');
  assert.equal(sandbox.items.find(item=>item.id==='guardadas').label,'Guardado');
  assert.equal(sandbox.visible().some(item => item.id === 'admin'), false);
  for (const role of ['admin','owner','superdev']) {
    sandbox.accountSession.user = { role };
    assert.equal(sandbox.visible().some(item => item.id === 'admin'), true);
  }
  sandbox.accountSession.user = { role: 'member' };
  assert.equal(sandbox.visible().some(item => item.id === 'admin'), false);
});

test('la selección legacy sigue Guardado/Hoy sin reescribir la vista persistida', () => {
  const sandbox={state:{view:'hub'},accountSession:{user:null}};
  vm.createContext(sandbox);
  const source=html.slice(html.indexOf('const PRIMARY_NAV_ITEMS='),html.indexOf('function closeMoreMenu('));
  const alias=html.match(/function resolveViewAlias\(view\)\{[^}]+\}/)[0];
  vm.runInContext(`${source}\n${alias}\nthis.mobileActive=primaryActive;this.desktopActive=typeof desktopActive==='function'?desktopActive:null;`,sandbox);
  assert.ok(sandbox.desktopActive,'la selección desktop debe resolver destinos compatibles');
  for(const [view,direct] of [['favorites','guardadas'],['studyToday','today'],['progreso','dashboard']]){
    sandbox.state.view=view;
    assert.equal(sandbox.desktopActive({id:direct}),true,view);
    assert.equal(sandbox.desktopActive({id:'more'}),false,view);
    assert.equal(sandbox.mobileActive({id:'more'}),true,view);
    assert.equal(sandbox.state.view,view,'seleccionar no migra state.view');
  }
  sandbox.state.view='calendar';
  assert.equal(sandbox.desktopActive({id:'more'}),true);
  sandbox.state.view='cuenta';
  assert.equal(sandbox.mobileActive({id:'cuenta'}),true);
  assert.equal(sandbox.mobileActive({id:'more'}),false);
});

test('Más desktop tiene activador accesible y restaura el foco al mismo activador', () => {
  const nav = html.slice(html.indexOf('function closeMoreMenu('), html.indexOf('function setViewContext('));
  assert.match(nav, /data-more-scope="desktop"/);
  assert.match(nav, /data-more-scope="mobile"/);
  assert.match(nav, /lastMoreTrigger/);
  assert.match(nav, /lastMoreTrigger\?\.focus\(\)/);
  assert.match(nav, /event\.key==='Escape'/);
});

test('alias progreso abre dashboard y también normaliza sesiones antiguas al renderizar', () => {
  const aliasMatch = html.match(/function resolveViewAlias\(view\)\{[^}]+\}/);
  assert.ok(aliasMatch, 'falta la compatibilidad del alias progreso');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${aliasMatch[0]};this.resolveViewAlias=resolveViewAlias;`, sandbox);
  assert.equal(sandbox.resolveViewAlias('progreso'), 'dashboard');
  assert.equal(sandbox.resolveViewAlias('historial'), 'historial');
  const gotoSource = html.slice(html.indexOf('function goto('), html.indexOf('function platformUiContext('));
  const renderSource = html.slice(html.indexOf('function render(){'), html.indexOf('/* =========================================================\n   DASHBOARD'));
  assert.match(gotoSource, /resolveViewAlias\(view\)/);
  assert.match(renderSource, /state\.view=resolveViewAlias\(state\.view\)/);
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

function renderHubFixture(pending = null, navigationEnter = false, user = null) {
  const subjects = [
    { id:'ingles', name:'Inglés', emoji:'📘', day:1, available:false, currentMaterial:'Memoir', units:{current:null,previous:[],completed:[]} },
    { id:'salud', name:'Salud', emoji:'❤️', day:1, available:false, units:{current:null,previous:[],completed:[]} },
    { id:'historia', name:'Historia', emoji:'🏛️', day:1, available:true, units:{current:{name:'Historia',assessments:[{label:'Prueba',status:'scheduled',confirmed:true,date:null,dateStatus:'pending',provisionalDateLabel:'Próxima semana'}]},previous:[],completed:[]} },
    { id:'ciencia', name:'Ciencia', emoji:'🔬', day:2, available:true, currentMaterial:'Temperatura', units:{current:{name:'Ciencia',assessments:[{label:'Prueba',status:'scheduled',date:'2026-09-30',dateStatus:'confirmed',displayTopic:'Temperatura'}]},previous:[],completed:[]} },
    { id:'matematicas', name:'Matemáticas', emoji:'📐', day:2, available:true, units:{current:{name:'Matemáticas',assessments:[]},previous:[],completed:[]} },
    { id:'espanol', name:'Español', emoji:'📚', day:2, available:true, currentMaterial:'Pendiente de confirmación', units:{current:{name:'Español',assessments:[]},previous:[],completed:[]} },
  ];
  const byId = new Map(subjects.map(subject => [subject.id, subject]));
  const main = { innerHTML:'', querySelectorAll:() => [], querySelector:() => null };
  const sandbox = {
    main, SUBJECT_CATALOG:subjects, SUBJECT_BY_ID:byId, STUDY_DAYS:[{id:1,name:'Día 1'},{id:2,name:'Día 2'}],
    state:{settings:{topicStudyStatus:{vocabulario:'reviewed'}},lastSubjectId:'historia',lastVisitedTopicBySubject:{historia:'geografia'}},
    accountSession:{user}, localDateLabel:() => 'sábado, 26 de septiembre',
    resumablePracticeProgress:() => pending, subjectsForDay:day => subjects.filter(subject => subject.day===day),
    renderHubSubjectRow:subject => `<article data-subject="${subject.id}">${subject.name}</article>`,
    subjectContent:() => ({topics:[{id:'geografia',name:'Geografía'}]}), escHtml:value => value,
    platformUiContext:() => ({}), goto() {}, resumeSavedPractice() {},
    window:{StudyHubHubUI:{mountHub() {}}}, document:{getElementById:() => null},
  };
  vm.createContext(sandbox);
  const start = html.indexOf('function renderHub(');
  vm.runInContext(html.slice(start, html.indexOf('function ringSvg(', start)) + `\nrenderHub(main,${navigationEnter});`, sandbox);
  return main.innerHTML;
}

test('Home ofrece Entrar o Cuenta en el encabezado sin sustituir la navegación principal', () => {
  const loggedOut = renderHubFixture(null, false, null);
  const loggedIn = renderHubFixture(null, false, { username:'estudiante' });
  assert.match(loggedOut, /class="hub-account-action"[^>]*data-hub-view="cuenta"[^>]*>[^<]*Entrar/);
  assert.match(loggedIn, /class="hub-account-action"[^>]*data-hub-view="cuenta"[^>]*>[^<]*Cuenta/);
  assert.equal((loggedOut.match(/data-hub-view="cuenta"/g)||[]).length, 1);
});

function renderSubjectRowFixture() {
  const subject={id:'matematicas',name:'Matemáticas',emoji:'📐',available:true,status:'Tema actual'};
  const sandbox={
    state:{settings:{seenContentAt:{},topicStudyStatus:{}}},
    SPANISH_VOCABULARY:{unit:{id:'spanish-current'}},
    escHtml:value=>value,
    subjectContent:()=>({units:{current:{name:'Grados decimales a grados, minutos y segundos',type:'Tema actual'}}}),
  };
  vm.createContext(sandbox);
  const start=html.indexOf('function renderHubSubjectRow(');
  vm.runInContext(html.slice(start,html.indexOf('function openSubject(',start))+'\nthis.markup=renderHubSubjectRow('+JSON.stringify(subject)+');',sandbox);
  return sandbox.markup;
}

test('Home presenta cada materia disponible como una fila editorial sin badges ni card', () => {
  const markup=renderSubjectRowFixture();
  assert.match(markup,/<button[^>]+class="hub-subject-row/);
  assert.match(markup,/hub-subject-symbol/);
  assert.match(markup,/Grados decimales a grados, minutos y segundos/);
  assert.doesNotMatch(markup,/\bcard\b|subject-status|new-pill|Tema actual · Tema actual/);
});

test('Home replica la jerarquía editorial aprobada y prioriza una sola continuación real', () => {
  const markup = renderHubFixture({subjectName:'Historia',current:2,total:10,answered:1,topic:'Geografía'});
  assert.equal((markup.match(/id="resumeFromHub"/g)||[]).length, 1);
  assert.doesNotMatch(markup, /continueLastTopic|Continuar donde lo dejaste/);
  assert.match(markup, /<h1>¿Qué estudiamos hoy\?<\/h1>/);
  assert.match(markup, /Retoma tu práctica o elige tu siguiente materia\./);
  assert.match(markup, /class="hub-days"/);
  const continueAt=markup.indexOf('id="hubContinueTitle"');
  const studyAt=markup.indexOf('id="hubStudyTitle"');
  const upcomingAt=markup.indexOf('id="hubUpcomingTitle"');
  const footerAt=markup.indexOf('class="hub-footer-links"');
  assert.ok(continueAt >= 0 && continueAt < studyAt && studyAt < upcomingAt && upcomingAt < footerAt);
  for (const subject of ['Español','Matemáticas','Ciencia','Historia','Inglés','Salud']) assert.match(markup, new RegExp(subject));
  assert.match(markup, /Ciencia[\s\S]*Prueba[\s\S]*miércoles 30 sep/);
  for (const view of ['progreso','calendar','novedades']) assert.match(markup,new RegExp(`data-hub-view="${view}"`));
  assert.match(markup,/data-hub-view="progreso">▥ Resumen<\/button>/);
  assert.doesNotMatch(markup,/hubSecondaryTitle|También puedes|studyToday|createAccountFromHub|loginFromHub/);
  assert.ok(markup.includes('hubSignals'));
});

test('Próximamente separa fechas oficiales de evaluaciones confirmadas con fecha pendiente', () => {
  const markup = renderHubFixture();
  assert.match(markup, /Prueba de Ciencia[\s\S]*Temperatura[\s\S]*miércoles 30 sep de 2026/);
  assert.match(markup, /aria-label="Evaluaciones con fecha por confirmar"[\s\S]*Prueba de Historia[\s\S]*Próxima semana · Fecha por confirmar/);
  const historyRow = markup.slice(markup.indexOf('Prueba de Historia'), markup.indexOf('Prueba de Historia') + 300);
  assert.doesNotMatch(historyRow, /datetime=|viernes|2026-\d{2}-\d{2}/i);
});

test('Home no inventa una continuación cuando solo existe un tema recordado', () => {
  const markup = renderHubFixture();
  assert.doesNotMatch(markup, /hubContinueTitle|resumeFromHub|continueLastTopic|Continuar donde lo dejaste/);
  assert.match(markup,/Elige una materia\. El resto, paso a paso\./);
});

test('Home no acopla motion a su render y deja la transición al shell', () => {
  assert.doesNotMatch(renderHubFixture(),/is-navigation-enter/);
  assert.doesNotMatch(renderHubFixture(null,true),/is-navigation-enter/);
});

test('navegación expone la vista activa sin depender solo del color', () => {
  const nav=html.slice(html.indexOf('function renderNav()'),html.indexOf('function setViewContext('));
  assert.match(nav,/aria-current="\$\{desktopActive\(item\)\?'page':'false'\}"/);
  assert.match(nav,/aria-current="\$\{primaryActive\(item\)\?'page':'false'\}"/);
});

test('Repasar, Practicar y Examen usan contexto corto de materia y tema real', () => {
  const contextSource=html.slice(html.indexOf('const COMPACT_STUDY_CONTEXT_VIEWS'),html.indexOf('function renderNav()'));
  assert.match(contextSource,/new Set\(\['repaso','repasoCards','practica','examen','session'\]\)/);
  assert.match(contextSource,/subjectContent\(subject\.id\)\.topics/);
  assert.match(contextSource,/state\.settings\.practiceTopicBySubject/);
  assert.match(contextSource,/state\.settings\.examTopicsBySubject/);
  assert.match(contextSource,/`\$\{subject\.name\} · \$\{topic\.name\}`/);
  const compactBranch=contextSource.slice(contextSource.indexOf('if(COMPACT_STUDY_CONTEXT_VIEWS'),contextSource.indexOf('return `${subject.emoji}'));
  assert.doesNotMatch(compactBranch,/Día|activeUnit\.name/);
  const nav=html.slice(html.indexOf('function renderNav()'),html.indexOf('function setViewContext('));
  assert.match(nav,/const context=shellContextLabel\(activeSubject,activeUnit\)/);
  assert.match(nav,/class="rail-context" title="\$\{escHtml\(context\)\}"/);
});

test('Home móvil apila los días y mantiene materias como filas editoriales', () => {
  assert.match(html, /class="hub-days"/);
  assert.doesNotMatch(html.slice(html.indexOf('function renderHubSubjectRow('),html.indexOf('function openSubject(')),/hub-subject-card/);
});

test('las métricas de materia mantienen dos columnas compactas en móvil', () => {
  assert.match(html, /class="grid grid-4 dash-stats"/);
  const base=html.indexOf('.dash-top{display:flex');
  const mobile=html.indexOf('@media(max-width:480px){.dash-top{display:grid;justify-items:center}.dash-stats{width:100%;grid-template-columns:repeat(2,minmax(0,1fr))',base);
  assert.ok(base>=0 && mobile>base);
});

test('Cuenta amplía el objetivo táctil de Ver sin agrandar el resto de controles', () => {
  assert.match(html, /\.show-pass\{[^}]*min-width:44px[^}]*min-height:44px/);
});

test('el selector de tamaño de examen expone y sincroniza aria-pressed', () => {
  const exam = html.slice(html.indexOf('function renderExamenHome('), html.indexOf('/* =========================================================\n   SESSION', html.indexOf('function renderExamenHome(')));
  assert.match(exam, /aria-pressed="\$\{chosen===String\(n\)\}"/);
  assert.match(exam, /aria-pressed="\$\{chosen==='all'\}"/);
  assert.match(exam, /setAttribute\('aria-pressed',String\(selected\)\)/);
});

function renderHistoryDetailFixture() {
  const main={innerHTML:''};
  const back={addEventListener(){}};
  const questions=new Map([
    ['correcta',{id:'correcta',prompt:'Pregunta correcta'}],
    ['incorrecta',{id:'incorrecta',prompt:'Pregunta incorrecta'}],
  ]);
  const sandbox={
    document:{getElementById:id=>id==='main'?main:back},
    findQuestionById:id=>questions.get(id),topicForQuestion:()=>({name:'Tema'}),
    escHtml:value=>String(value),goto(){},
    detailedExplanation:(question,userAnswer,correct,procedure)=>`<div class="kept-detail">${question.id}:${userAnswer}:${correct}:${procedure.marker}</div>`,
  };
  vm.createContext(sandbox);
  const start=html.indexOf('function renderHistoryDetail(');
  vm.runInContext(html.slice(start,html.indexOf('/* =========================================================\n   CUENTA',start))+`\nrenderHistoryDetail(${JSON.stringify({
    mode:'examen',date:'26/9/2026',time:'10:00',correct:1,total:2,pct:50,
    answers:[
      {qid:'correcta',userAnswer:'A',correct:true,procedure:{marker:'procedimiento-1'}},
      {qid:'incorrecta',userAnswer:'B',correct:false,procedure:{marker:'procedimiento-2'}},
    ],
  })});`,sandbox);
  return main.innerHTML;
}

test('Historial colapsa cada respuesta sin perder estado, explicación ni procedimiento', () => {
  const markup=renderHistoryDetailFixture();
  assert.equal((markup.match(/<details class="history-answer"/g)||[]).length,2);
  assert.equal((markup.match(/<summary>/g)||[]).length,2);
  assert.doesNotMatch(markup,/<details class="history-answer"[^>]*\sopen(?:\s|>)/);
  assert.match(markup,/✓ La sacaste bien/);
  assert.match(markup,/✗ La sacaste mal/);
  assert.match(markup,/correcta:A:true:procedimiento-1/);
  assert.match(markup,/incorrecta:B:false:procedimiento-2/);
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
  assert.doesNotMatch(markup,/tema dominado|Estás listo/);
  assert.match(markup,/Esta sesión todavía no muestra un tema con 80% o más de respuestas correctas/);
  assert.match(markup,/Puedes practicar las preguntas falladas o volver a la materia/);
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

test('las pestañas de Comunidad usan una rama explícita sin cambiar su destino', async () => {
  const source = await readFile(new URL('../public/js/platform-ui.js', import.meta.url),'utf8');
  assert.match(source, /if\s*\(button\.dataset\.communityTab === 'create'\)\s*showCreate\(\);\s*else\s*showList\(button\.dataset\.communityTab === 'today'\);/);
  assert.doesNotMatch(source, /button\.dataset\.communityTab === 'create'\s*\?\s*showCreate\(\)/);
});

test('QA Tools etiqueta Local o QA usando únicamente el entorno confirmado por el servidor', () => {
  const capability = html.slice(html.indexOf('function qaAccountKey()'), html.indexOf('function stableCloudPayload('));
  const panel = html.slice(html.indexOf('function qaToolsPanelMarkup('), html.indexOf('function qaSetControlValue('));
  assert.match(capability, /data\.environment==='qa'\?'qa':data\.environment==='local-test'\?'local-test':''/);
  assert.match(capability, /qaToolsCapability=\{accountKey,allowed:[^}]+,environment\}/);
  assert.match(panel, /qaToolsEnvironmentLabel\(\)/);
  assert.doesNotMatch(panel, /status-tag">Local</);
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
