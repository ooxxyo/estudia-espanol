import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');

function sourceBetween(startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `No se encontro ${startMarker}`);
  assert.notEqual(end, -1, `No se encontro ${endMarker}`);
  return html.slice(start, end);
}

function optionalReturnViewHelper() {
  const start = html.indexOf('function sessionReturnView(');
  if (start === -1) return '';
  const end = html.indexOf('function snapshotState(', start);
  assert.notEqual(end, -1, 'No se encontro el final de sessionReturnView');
  return html.slice(start, end);
}

function classList(initial = []) {
  const values = new Set(initial);
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    contains: (name) => values.has(name),
    toggle: (name, force) => {
      if (force === true) values.add(name);
      else if (force === false) values.delete(name);
      else if (values.has(name)) values.delete(name);
      else values.add(name);
      return values.has(name);
    },
  };
}

function eventElement(extra = {}) {
  const handlers = new Map();
  return {
    disabled: false,
    textContent: '',
    classList: classList(),
    addEventListener(type, handler) { handlers.set(type, handler); },
    fire(type = 'click') { handlers.get(type)?.({ currentTarget: this, target: this }); },
    ...extra,
  };
}

function renderExam(settings, subjectId = 'ciencia') {
  const topic = { id: `${subjectId}-topic`, title: 'Tema', type: 'concept' };
  const subject = { id: subjectId, name: subjectId === 'ciencia' ? 'Ciencia' : 'Historia', available: true };
  const topicInputs = [eventElement({ value: topic.id, checked: true })];
  const sizeValues = ['10', '20', '25', '30', '50'];
  const sizeButtons = sizeValues.map((value) => eventElement({ dataset: { n: value } }));
  const startExam = eventElement({ disabled: true, textContent: 'Selecciona un numero de preguntas' });
  const clearExamSelection = eventElement();
  const main = {
    innerHTML: '',
    querySelectorAll(selector) {
      if (selector === '#examTopics input') return topicInputs;
      if (selector === '#examTopics input:checked') return topicInputs.filter((input) => input.checked);
      if (selector === '#examSize .chip') return sizeButtons;
      return [];
    },
  };
  const sandbox = {
    activeQuestions: () => Array.from({ length: 50 }, (_, index) => ({
      id: `${subjectId}-q${index + 1}`,
      topic: topic.id,
      subjectId,
    })),
    activeSubject: () => subject,
    activeTopics: () => [topic],
    currentUnit: () => ({ name: 'Unidad actual' }),
    document: {
      getElementById(id) {
        if (id === 'startExam') return startExam;
        if (id === 'clearExamSelection') return clearExamSelection;
        return null;
      },
    },
    escHtml: (value) => String(value),
    MATH_CONTENT: { questionsForMode: () => [] },
    saveState: () => {},
    startSession: () => {},
    state: { settings },
  };
  vm.createContext(sandbox);
  vm.runInContext(sourceBetween('function renderExamenHome(', 'function shuffle('), sandbox);
  sandbox.renderExamenHome(main);
  return { sizeButtons, startExam };
}

test('el tamano de examen persiste al volver a la materia', () => {
  const settings = {
    examTopics: [],
    examTopicsBySubject: { ciencia: ['ciencia-topic'] },
    examSizeBySubject: {},
  };
  const first = renderExam(settings);
  first.sizeButtons.find((button) => button.dataset.n === '20').fire();
  assert.equal(settings.examSizeBySubject.ciencia, '20');

  const reloaded = reloadState(null, { examSizeBySubject: settings.examSizeBySubject });
  const restored = renderExam(reloaded.settings);
  assert.equal(restored.sizeButtons.find((button) => button.dataset.n === '20').classList.contains('active'), true);
  assert.equal(restored.startExam.disabled, false);
});

test('el tamano de examen queda aislado entre materias', () => {
  const settings = {
    examTopics: [],
    examTopicsBySubject: { ciencia: ['ciencia-topic'], historia: ['historia-topic'] },
    examSizeBySubject: { ciencia: '20' },
  };
  const science = renderExam(settings, 'ciencia');
  const history = renderExam(settings, 'historia');
  assert.equal(science.sizeButtons.find((button) => button.dataset.n === '20').classList.contains('active'), true);
  assert.equal(history.sizeButtons.some((button) => button.classList.contains('active')), false);
  assert.equal(history.startExam.disabled, true);
});

function renderResultsAndGo(lastResult) {
  const elements = new Map([
    ['backDash', eventElement()],
    ['retryWrong', eventElement()],
  ]);
  const destinations = [];
  const sandbox = {
    activeSubject: () => ({ id: 'ciencia', name: 'Ciencia' }),
    currentUnit: () => ({ name: 'Unidad actual' }),
    document: { getElementById: (id) => elements.get(id) || null },
    escHtml: (value) => String(value),
    findQuestionById: () => null,
    fmtTime: () => '0:00',
    goto: (view) => destinations.push(view),
    main: { innerHTML: '' },
    renderSidebar: () => {},
    retryWrong: () => {},
    state: { lastResult },
    SUBJECT: { id: 'espanol', name: 'Español' },
    SUBJECT_BY_ID: new Map([['ciencia', { id: 'ciencia', name: 'Ciencia' }]]),
    SUBJECT_VIEW_IDS: new Set(['dashboard', 'repaso', 'repasoCards', 'practica', 'experimental', 'examen', 'scienceFormulas', 'errores', 'guardadas', 'historial', 'session', 'results']),
    subjectContent: () => ({ topics: [] }),
    topicForQuestion: () => null,
  };
  vm.createContext(sandbox);
  vm.runInContext(`${optionalReturnViewHelper()}\n${sourceBetween('function renderResults(', 'function renderErrores(')}`, sandbox);
  sandbox.renderResults(sandbox.main);
  elements.get('backDash').fire();
  return destinations.at(-1);
}

test('Resultados regresa al origen logico de la sesion', () => {
  assert.equal(renderResultsAndGo({
    mode: 'practica',
    subjectId: 'ciencia',
    returnView: 'scienceFormulas',
    total: 0,
    correctCount: 0,
    pct: 0,
    answers: [],
    elapsed: 0,
    byTopic: {},
  }), 'scienceFormulas');
});

test('una sesion nueva guarda la vista desde la que se inicio', () => {
  const question = { id: 'science-q1', topic: 'science-topic', subjectId: 'ciencia' };
  const state = {
    view: 'scienceFormulas',
    activeTopicId: null,
    lastVisitedTopicBySubject: {},
    errors: [],
    settings: { topicStudyStatus: {}, pausedPractices: [] },
    session: null,
  };
  const sandbox = {
    activeContent: () => ({ topics: [{ id: 'science-topic' }], questions: [question] }),
    activeSubject: () => ({ id: 'ciencia' }),
    attemptStage: 0,
    computeMastery: () => ({ pct: 0 }),
    currentUnit: () => ({ id: 'science-unit' }),
    findQuestionById: () => question,
    goto: () => {},
    hasResumablePractice: () => false,
    MATH_CONTENT: { questionsForMode: () => [] },
    questionSubjectId: () => 'ciencia',
    saveState: () => {},
    sessionReturnView: undefined,
    showToast: () => {},
    shuffle: (items) => items.slice(),
    stashCurrentPractice: () => false,
    state,
    SUBJECT_VIEW_IDS: new Set(['dashboard', 'repaso', 'repasoCards', 'practica', 'experimental', 'examen', 'scienceFormulas', 'errores', 'guardadas', 'historial', 'session', 'results']),
  };
  vm.createContext(sandbox);
  vm.runInContext(`${optionalReturnViewHelper()}\n${sourceBetween('function startSession(', 'function currentQ(')}`, sandbox);
  sandbox.startSession({ mode: 'practica', topic: 'science-topic', limit: 1 });
  assert.equal(state.session.returnView, 'scienceFormulas');
});

function reloadState(savedSession, settings = {}) {
  const question = { id: 'science-q1', topic: 'science-topic', subjectId: 'ciencia' };
  const subject = { id: 'ciencia', available: true };
  const state = {
    view: 'hub',
    activeSubjectId: null,
    lastSubjectId: null,
    activeUnitId: null,
    stats: {},
    subjectTotals: {},
    errors: {},
    saved: new Set(),
    history: [],
    lastResult: null,
    settings: {
      mixedTopicIds: [],
      practiceTopicBySubject: {},
      examTopics: [],
      examTopicsBySubject: {},
      examSizeBySubject: {},
      collapsedUnits: [],
      pausedPractices: [],
    },
    session: null,
    answerChecked: false,
    startedAt: null,
  };
  const sandbox = {
    allTopics: () => [{ id: 'science-topic' }],
    currentUnit: () => ({ id: 'science-unit' }),
    findQuestionById: (id) => id === question.id ? question : null,
    lastSaveAt: null,
    questionSubjectId: () => 'ciencia',
    state,
    SUBJECT: { id: 'espanol' },
    SUBJECT_BY_ID: new Map([['ciencia', subject]]),
    SUBJECT_VIEW_IDS: new Set(['dashboard', 'repaso', 'repasoCards', 'practica', 'experimental', 'examen', 'scienceFormulas', 'errores', 'guardadas', 'historial', 'session', 'results']),
    unitById: () => ({ id: 'science-unit' }),
  };
  vm.createContext(sandbox);
  vm.runInContext(`${optionalReturnViewHelper()}\n${sourceBetween('function applySavedData(', 'function openProgressDB(')}`, sandbox);
  sandbox.applySavedData({
    view: 'hub',
    activeSubjectId: 'ciencia',
    lastSubjectId: 'ciencia',
    settings,
    session: savedSession,
  });
  return sandbox.state;
}

test('una sesion antigua sin origen conserva un fallback seguro', () => {
  const restored = reloadState({
    mode: 'practica',
    subjectId: 'ciencia',
    unitId: 'science-unit',
    queueIds: ['science-q1'],
    idx: 0,
    answers: [],
  }).session;
  assert.equal(restored.returnView, 'practica');
});

test('el origen y la cola se conservan despues de recargar', () => {
  const restored = reloadState({
    mode: 'practica',
    subjectId: 'ciencia',
    unitId: 'science-unit',
    queueIds: ['science-q1'],
    idx: 0,
    answers: [],
    returnView: 'scienceFormulas',
  }).session;
  assert.equal(restored.returnView, 'scienceFormulas');
  assert.deepEqual(Array.from(restored.queue, (question) => question.id), ['science-q1']);
});
