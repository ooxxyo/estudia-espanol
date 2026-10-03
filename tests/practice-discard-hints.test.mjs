import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'css', 'study-hub-study-p0.css'), 'utf8');

function sourceBetween(startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `No se encontro ${startMarker}`);
  assert.notEqual(end, -1, `No se encontro ${endMarker}`);
  return html.slice(start, end);
}

function loadAcademicData() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  for (const file of [
    'public/history-data.js',
    'public/js/science-data.js',
    'public/js/math-data.js',
    'public/js/spanish-legacy-content.js',
    'public/js/spanish-vocabulary.js',
  ]) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
  }
  return sandbox.window;
}

function eventElement(extra = {}) {
  const handlers = new Map();
  const attributes = new Map();
  return {
    disabled: false,
    dataset: {},
    textContent: '',
    addEventListener(type, handler) { handlers.set(type, handler); },
    fire(type = 'click', event = {}) { handlers.get(type)?.({ currentTarget: this, target: this, ...event }); },
    focus() { this.focused = true; },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    ...extra,
  };
}

function renderSession(mode = 'practica', question = { id: 'q1', subjectId: 'matematicas', topic: 'tema', type: 'math-workspace', dif: 'normal', hints: ['Separa primero la parte entera de la decimal.'] }) {
  const elements = new Map([
    ['quitSession', eventElement()],
    ['discardCurrentPractice', eventElement()],
    ['skipBtn', eventElement()],
    ['restartQBtn', eventElement()],
    ['starBtn', eventElement()],
    ['hintBtn', eventElement()],
    ['submitBtn', eventElement()],
  ]);
  const state = {
    saved: new Set(),
    session: { mode, subjectId: question.subjectId, queue: [question], idx: 0, answers: [], hintLevel: 0, currentSelection: null },
  };
  const calls = { dialog: null, discarded: 0, destinations: [] };
  const main = { innerHTML: '' };
  const sandbox = {
    attemptStage: 0,
    availablePracticeHints: (row) => row.hints || [],
    confirmQuit() {},
    currentQ: () => question,
    discardPausedPractice: () => { calls.discarded += 1; state.session = null; },
    document: { getElementById: (id) => elements.get(id) || null },
    goto: (view) => calls.destinations.push(view),
    nextQuestion() {},
    openPracticeDiscardDialog: (trigger, onConfirm) => { calls.dialog = { trigger, onConfirm }; },
    previousReviewIndex: () => -1,
    qaToolsPanelMarkup: () => '',
    render() {},
    renderAnsweredReview() {},
    renderQuestionBody() {},
    restoreFinalizedQuestion() {},
    saveAndExitPractice() {},
    saveState() {},
    sessionAnswerAt: () => null,
    showHint() {},
    state,
    subjectContent: () => ({ reviewCards: [] }),
    topicForQuestion: () => ({ icon: '°′″', name: 'Ángulos' }),
    wireQaToolsPanel() {},
  };
  vm.createContext(sandbox);
  vm.runInContext(sourceBetween('function renderSession(main)', 'function renderAnsweredReview(answerIndex)'), sandbox);
  sandbox.renderSession(main);
  return { calls, elements, main, state };
}

test('todas las preguntas disponibles en Practicar tienen una pista valida', () => {
  const data = loadAcademicData();
  const questions = [
    ...data.SpanishVocabulary.questions,
    ...data.STUDY_HUB_LEGACY_QUESTIONS,
    ...data.HISTORY_CONTENT.questions,
    ...data.SCIENCE_CONTENT.questions,
    ...data.MATH_CONTENT.questionsForMode('practice'),
    ...data.MATH_CONTENT.questionsForMode('learning'),
  ];
  const placeholders = /^(TODO|TBD|Pista|Hint aqu[ií])$/i;
  const invalid = questions.filter((question) => !Array.isArray(question.hints)
    || !question.hints.some((hint) => typeof hint === 'string' && hint.trim() && !placeholders.test(hint.trim())));

  assert.equal(questions.length, 461);
  assert.deepEqual(invalid.map((question) => question.id), []);
});

test('Descartar practica abre confirmacion y solo confirma la eliminacion de la sesion actual', () => {
  const rendered = renderSession();
  rendered.elements.get('discardCurrentPractice').fire();
  assert.equal(rendered.calls.dialog?.trigger, rendered.elements.get('discardCurrentPractice'));
  assert.equal(rendered.calls.discarded, 0);
  assert.ok(rendered.state.session);

  rendered.calls.dialog.onConfirm();
  assert.equal(rendered.calls.discarded, 1);
  assert.equal(rendered.state.session, null);
  assert.equal(rendered.calls.destinations.at(-1), 'practica');
});

test('descartar elimina el estado recuperable sin tocar historial ni otras practicas', () => {
  const question = { id: 'science-q1', subjectId: 'ciencia', topic: 'temperatura' };
  const otherPractice = { id: 'other-practice', subjectId: 'historia', queueIds: ['hist-q1'] };
  const history = [{ id: 'completed-result' }];
  const state = {
    history,
    session: { mode: 'practica', subjectId: 'ciencia', unitId: 'science-unit', queue: [question], idx: 0, answers: [{ qid: question.id }], hintLevel: 1 },
    settings: { discardedSessions: [], pausedPractices: [otherPractice] },
  };
  let saves = 0;
  const sandbox = {
    Date,
    questionSubjectId: (row) => row.subjectId,
    saveState: () => { saves += 1; },
    state,
  };
  vm.createContext(sandbox);
  vm.runInContext(sourceBetween('function hasResumablePractice()', 'function portablePracticeSession('), sandbox);
  assert.equal(sandbox.hasResumablePractice(), true);
  sandbox.discardPausedPractice();

  assert.equal(state.session, null);
  assert.equal(sandbox.hasResumablePractice(), false);
  assert.equal(state.history, history);
  assert.deepEqual(state.settings.pausedPractices, [otherPractice]);
  assert.equal(state.settings.discardedSessions.length, 1);
  assert.equal(saves, 1);
});

test('la confirmacion P0 permite cancelar sin ejecutar el descarte y restaura el foco', () => {
  const trigger = eventElement();
  const cancel = eventElement();
  const confirm = eventElement();
  const backdrop = eventElement({ id: 'practiceDiscardBackdrop' });
  const panel = eventElement({ querySelectorAll: () => [cancel, confirm] });
  const rootElement = { innerHTML: '' };
  const shell = [eventElement(), eventElement(), eventElement()];
  let confirmed = 0;
  const sandbox = {
    document: {
      activeElement: cancel,
      addEventListener() {},
      removeEventListener() {},
      getElementById(id) {
        return {
          pendingPracticeRoot: rootElement,
          cancelPracticeDiscard: cancel,
          confirmPracticeDiscard: confirm,
          practiceDiscardBackdrop: backdrop,
          practiceDiscardPanel: panel,
          main: shell[0], rail: shell[1], mobileNav: shell[2],
        }[id] || null;
      },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(sourceBetween('let practiceDiscardOpen=', 'const COMPACT_STUDY_CONTEXT_VIEWS='), sandbox);
  sandbox.openPracticeDiscardDialog(trigger, () => { confirmed += 1; });
  cancel.fire();

  assert.equal(confirmed, 0);
  assert.equal(rootElement.innerHTML, '');
  assert.equal(trigger.focused, true);
  assert.ok(shell.every((element) => element.inert === false));
});

test('Guardar y salir conserva la sesion y su nivel de pista', () => {
  const state = { session: { mode: 'practica', experimental: false, hintLevel: 1, answered: false }, view: 'session', activeTopicId: 'tema' };
  let saves = 0;
  const sandbox = { attemptStage: 1, Date, goto() {}, render() {}, saveState: () => { saves += 1; }, state, window: { scrollTo() {} } };
  vm.createContext(sandbox);
  vm.runInContext(sourceBetween('function saveAndExitPractice()', 'function resumeSavedPractice()'), sandbox);
  sandbox.saveAndExitPractice();

  assert.ok(state.session);
  assert.equal(state.session.hintLevel, 1);
  assert.equal(state.session.attemptStage, 1);
  assert.equal(state.view, 'practica');
  assert.equal(saves, 1);
});

test('Pista aparece tambien en Math Workspace y Examen sigue sin mostrarla', () => {
  const practice = renderSession('practica');
  const exam = renderSession('examen');
  assert.match(practice.main.innerHTML, /id="hintBtn"/);
  assert.match(practice.main.innerHTML, /aria-expanded="false"/);
  assert.match(practice.main.innerHTML, /aria-controls="hintZone"/);
  assert.doesNotMatch(exam.main.innerHTML, /id="hintBtn"/);
});

test('abrir una pista muestra el contenido correcto, actualiza aria-expanded y guarda el estado', () => {
  const hint = 'Identifica primero la unidad inicial y la unidad final.';
  const zone = eventElement({ innerHTML: '', hidden: true });
  const button = eventElement();
  const state = { session: { queue: [{ hints: [hint] }], idx: 0, hintLevel: 0 } };
  let saves = 0;
  const sandbox = {
    availablePracticeHints: (question) => question.hints,
    currentQ: () => state.session.queue[0],
    document: { getElementById: (id) => id === 'hintZone' ? zone : id === 'hintBtn' ? button : null },
    escHtml: (value) => String(value),
    saveState: () => { saves += 1; },
    state,
  };
  vm.createContext(sandbox);
  vm.runInContext(sourceBetween('function showHint()', 'function checkCorrectness('), sandbox);
  sandbox.showHint();

  assert.equal(state.session.hintLevel, 1);
  assert.match(zone.innerHTML, new RegExp(hint));
  assert.equal(zone.hidden, false);
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  assert.equal(saves, 1);
});

test('hint y confirmacion usan EXPAND P0, touch targets y reduced motion', () => {
  assert.match(css, /\.study-hint-zone/);
  assert.match(css, /\.practice-discard-panel/);
  assert.match(css, /var\(--shds-motion-expand\)/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
});
