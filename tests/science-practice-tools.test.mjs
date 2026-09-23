import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const scienceSource = await readFile(new URL('../public/js/science-data.js', import.meta.url), 'utf8');
const toolsSource = await readFile(new URL('../public/js/science-practice-tools.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(scienceSource, sandbox);
vm.runInContext(toolsSource, sandbox);
const SCIENCE = sandbox.window.SCIENCE_CONTENT;
const TOOLS = sandbox.window.SCIENCE_PRACTICE_TOOLS;

test('la calculadora básica evalúa las operaciones autorizadas de forma segura', () => {
  assert.equal(TOOLS.evaluateExpression('17.8 ÷ 8.9'), 2);
  assert.equal(TOOLS.evaluateExpression('(65 + 273.15) × 2'), 676.3);
  assert.equal(TOOLS.evaluateExpression('-40 + 273.15'), 233.15);
  assert.equal(TOOLS.evaluateExpression('9 − 3 + 2'), 8);
  assert.throws(() => TOOLS.evaluateExpression('1 / 0'), /dividir entre cero/);
  assert.throws(() => TOOLS.evaluateExpression('alert(1)'), /no válida/);
});

test('todo ejercicio numérico de Ciencia expone calculadora y fórmula o ayuda', () => {
  for (const question of SCIENCE.questions.filter(row => row.type === 'numeric')) {
    assert.equal(TOOLS.toolsEnabled(question, { practiceToolsEnabled:true }), true, question.id);
    const help = TOOLS.helpForQuestion(question);
    assert.ok(help?.lines?.length, question.id);
    assert.ok(['Ver fórmula','Ver ayuda'].includes(help.buttonLabel), question.id);
  }
  assert.match(html, /id="scienceCalculatorToggle"/);
  assert.match(html, /id="scienceFormulaToggle"/);
});

test('Temperatura muestra únicamente la fórmula correspondiente a la dirección', () => {
  for (const question of SCIENCE.banks.temperature.filter(row => row.type === 'numeric')) {
    const help = TOOLS.helpForQuestion(question);
    assert.equal(help.lines[0], question.formula, question.id);
    assert.equal(help.lines.filter(line => line.includes(' = ')).length, 1, question.id);
    if (!question.prompt.includes('Kelvin') && !/(?:^|[^A-Za-z])K(?:[^A-Za-z]|$)/.test(question.formula)) assert.equal(help.lines.length, 1, question.id);
  }
});

test('Densidad muestra la fórmula de la variable solicitada', () => {
  for (const formula of ['D = M / V','M = D × V','V = M / D']) {
    const question = SCIENCE.banks.density.find(row => row.type === 'numeric' && row.formula === formula);
    assert.equal(TOOLS.helpForQuestion(question).lines[0], formula);
  }
});

test('Conversiones SI usa ayuda métrica separada de Temperatura', () => {
  const question = SCIENCE.banks.si.find(row => row.type === 'numeric');
  const help = TOOLS.helpForQuestion(question);
  assert.equal(help.buttonLabel, 'Ver ayuda');
  assert.ok(help.lines.includes('kilo → hecto → deca → unidad → deci → centi → mili'));
  assert.match(help.lines.join(' '), /×10 por salto.*÷10 por salto/);
  assert.doesNotMatch(help.lines.join(' '), /273\.15|459\.67/);
});

test('Kelvin conserva K sin grado y la ayuda no revela la respuesta final', () => {
  const question = SCIENCE.banks.temperature.find(row => row.prompt === 'Convierte 20 °C a Kelvin.');
  const helpText = TOOLS.helpForQuestion(question).lines.join(' ');
  assert.equal(question.unitSymbol, 'K');
  assert.doesNotMatch(helpText, /°K/);
  assert.doesNotMatch(helpText, new RegExp(`(^|\\D)${String(question.answer).replace('.', '\\.')}($|\\D)`));
});

test('abrir y cerrar fórmula o calculadora conserva la respuesta actual', () => {
  const wiring = html.slice(html.indexOf('function wireSciencePracticeTools'), html.indexOf('function renderQuestionBody'));
  assert.match(wiring, /panel\.hidden=!panel\.hidden/);
  assert.doesNotMatch(wiring, /currentSelection\s*=|sessionSelection\s*=|render\s*\(/);
  assert.match(html, /state\.session\.currentSelection=sessionSelection;saveState\(\)/);
});

test('los exámenes de práctica de Ciencia conservan etiqueta y herramientas', () => {
  assert.match(html, /Examen de práctica/);
  assert.match(html, /Puedes usar la fórmula y la calculadora para practicar el procedimiento/);
  assert.match(html, /isSciencePracticeExam = isExam && s\.subjectId==='ciencia'/);
  assert.match(html, /sciencePracticeToolsMarkup\(q\)/);
});

test('Prepararme para mañana conserva ayudas y excluye Conversiones SI', () => {
  assert.match(html, /action==='tomorrow'.*topics:\['densidad','temperatura'\].*limit:20/);
  assert.doesNotMatch(html, /action==='tomorrow'.*ciencia-si/);
  for (const bank of ['density','temperature']) {
    assert.equal(SCIENCE.banks[bank].filter(row => row.type === 'numeric').every(row => TOOLS.toolsEnabled(row,{practiceToolsEnabled:true})), true);
  }
});
