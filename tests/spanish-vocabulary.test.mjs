import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { validateAcademicCatalog } from '../netlify/functions/_shared/content-validator.mjs';

async function vocabulary(){
  const source=await readFile(new URL('../public/js/spanish-vocabulary.js',import.meta.url),'utf8');
  const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(source,sandbox);return sandbox.window.SpanishVocabulary;
}

test('Competencia contiene 20 entradas oficiales y al menos 120 preguntas válidas',async()=>{
  const data=await vocabulary(),report=data.validate();
  assert.equal(data.entries.length,20);assert.equal(report.valid,true,report.errors.join('\n'));assert.ok(report.total>=120);
  assert.deepEqual([...data.entries.map(row=>row.word)],['acicate','rozagante','hilvanar','ascendencia','beldad','inocuo','tergiversar','embargar','lisonja','viable','yacer','mero','exequias','urdir','descendencia','rebosar','celestina','sudario','inusitado','séquito']);
});

test('el banco cubre categorías, palabras y significados múltiples',async()=>{
  const data=await vocabulary(),report=data.validate();
  for(const [kind,minimum] of Object.entries({completar:25,escoge:20,definicion:20,pista:14,sinonimo:20,antonimo:10,familia:10,contexto:10,lectura:10,gramatica:10}))assert.ok(report.counts[kind]>=minimum,`${kind}: ${report.counts[kind]}`);
  for(const entry of data.entries)assert.ok(data.questions.some(q=>q.word===entry.word),entry.word);
  const contexts=data.questions.filter(q=>q.kind==='contexto');
  assert.equal(contexts.filter(q=>q.word==='embargar').length,2);assert.equal(contexts.filter(q=>q.word==='mero').length,2);assert.equal(contexts.filter(q=>q.word==='rebosar').length,3);
});

test('respuestas escritas normalizan espacio, case, Unicode y tildes sin fuzzy amplio',async()=>{
  const data=await vocabulary();
  assert.equal(data.normalizeAnswer('  YACIÓ  '),data.normalizeAnswer('yacio'));
  assert.notEqual(data.normalizeAnswer('viavilidad'),data.normalizeAnswer('viabilidad'));
  assert.notEqual(data.normalizeAnswer('yacio',true),data.normalizeAnswer('yació',true));
});

test('la navegación declara topic activo separado y tamaños de mini examen',async()=>{
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  assert.match(html,/activeTopicId:null/);assert.match(html,/lastVisitedTopicBySubject:\{\}/);assert.match(html,/\[5,10,15,20\]/);assert.match(html,/Salir del tema/);
  assert.doesNotMatch(html,/activeTopicId\s*=\s*state\.lastVisitedTopic/);
});

test('Competencia conserva estado urgente pendiente y el ciclo anterior es un solo bloque',async()=>{
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  assert.match(html,/studyStatus:'pending_review',priority:'urgent',newContent:true/);
  assert.match(html,/Tema pasado · Examen tomado el 14 de septiembre de 2026/);
  assert.match(html,/assessments:\[\{type:'exam',label:'Examen',status:'taken',date:'2026-09-14'\}\]/);
  assert.match(html,/state\.settings\.topicStudyStatus\[effectiveFilter\]='reviewed'/);
  assert.doesNotMatch(html,/seenContentAt[^\n]+topicStudyStatus/);
});

test('la decisión de práctica pendiente ofrece continuar, descartar e iniciar o cancelar',async()=>{
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  for(const label of ['Continuar anterior','Descartar e iniciar esta','Cancelar','Descartar práctica'])assert.match(html,new RegExp(label));
  assert.match(html,/discardedSessions=/);assert.match(html,/showPendingPracticeDecision\(opts\);return/);
  assert.doesNotMatch(html,/Continúala o descártala antes de iniciar otra/);
});

test('Historia separa estado del tema y evaluaciones sin inventar fecha',async()=>{
  const source=await readFile(new URL('../public/history-data.js',import.meta.url),'utf8');
  assert.match(source,/topicStatus: 'in_progress'/);assert.match(source,/canGrow: true/);
  assert.match(source,/type: 'test', label: 'Prueba', status: 'taken', date: null/);
  assert.match(source,/type: 'exam', label: 'Examen', status: 'pending', date: null/);
});

test('el validador académico real no encuentra referencias ni duplicados estructurales',async()=>{
  const [vocabularyData,legacySource,historySource]=await Promise.all([vocabulary(),readFile(new URL('../public/js/spanish-legacy-content.js',import.meta.url),'utf8'),readFile(new URL('../public/history-data.js',import.meta.url),'utf8')]);
  const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(legacySource,sandbox);vm.runInContext(historySource,sandbox);
  const legacyTopics=[
    {id:'gramatica',subjectId:'espanol'},{id:'morfologia',subjectId:'espanol'},{id:'narrativa',subjectId:'espanol'},{id:'cronica',subjectId:'espanol'},{id:'figuras',subjectId:'espanol'}
  ];
  const spanish={id:'espanol',units:[vocabularyData.unit,{id:'espanol-unidad-anterior',subjectId:'espanol',status:'previous'}],topics:[{id:'vocabulario',subjectId:'espanol'},...legacyTopics],reviewCards:[...vocabularyData.entries.map((entry,index)=>({id:`vocab-card-${index}`,topicId:'vocabulario',title:entry.word,def:entry.definition,example:entry.example})),...sandbox.window.STUDY_HUB_LEGACY_REVIEW_CARDS.map((card,index)=>({...card,id:`legacy-card-${index}`,topicId:card.topic}))],questions:[...vocabularyData.questions,...sandbox.window.STUDY_HUB_LEGACY_QUESTIONS]};
  const history={id:'historia',units:[sandbox.window.HISTORY_CONTENT.unit],topics:sandbox.window.HISTORY_CONTENT.topics.map(topic=>({...topic,subjectId:'historia',unitId:sandbox.window.HISTORY_CONTENT.unit.id})),reviewCards:sandbox.window.HISTORY_CONTENT.reviewCards.map((card,index)=>({...card,id:`history-card-${index}`,topicId:card.topic})),questions:sandbox.window.HISTORY_CONTENT.questions};
  const report=validateAcademicCatalog([spanish,history]);assert.equal(report.valid,true,report.errors.join('\n'));
});

test('motion y modales respetan reducción de movimiento y foco',async()=>{
  const [html,hub]=await Promise.all([readFile(new URL('../public/index.html',import.meta.url),'utf8'),readFile(new URL('../public/js/hub-ui.js',import.meta.url),'utf8')]);
  assert.match(hub,/@media\(prefers-reduced-motion:reduce\)/);assert.match(hub,/animation-duration:\.001ms!important/);
  assert.match(html,/aria-modal="true" aria-labelledby="pendingPracticeTitle"/);assert.match(html,/pendingPracticeReturnFocus/);assert.match(html,/event\.key==='Escape'&&pendingPracticeOpen/);
});
