import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const sources = await Promise.all([
  '../public/js/science-data.js',
  '../public/js/math-workspace.js',
  '../public/js/science-workspace-config.js',
].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const sandbox = { window:{} };
vm.createContext(sandbox);
for (const source of sources) vm.runInContext(source, sandbox);
const SCIENCE = sandbox.window.SCIENCE_CONTENT;
const MATH = sandbox.window.MATH_WORKSPACE;
const CONFIG = sandbox.window.SCIENCE_WORKSPACE_CONFIG;

test('todo ejercicio numérico de Ciencia recibe un workspace configurable', () => {
  for (const question of SCIENCE.questions.filter(row => row.type === 'numeric')) {
    const config = CONFIG.forQuestion(question);
    assert.ok(config, question.id);
    assert.ok(config.formula && config.fields.length && config.tokens.length, question.id);
    assert.ok(config.unitOptions.includes(question.unitSymbol), `${question.id}: ${question.unitSymbol}`);
  }
});

test('Temperatura guía búsqueda, fórmula, sustitución y unidad K', () => {
  const question = SCIENCE.banks.temperature.find(row => row.prompt === 'Convierte 20 °C a Kelvin.');
  const config = CONFIG.forQuestion(question);
  assert.equal(config.search, 'K');
  assert.equal(config.formula, 'K = °C + 273.15');
  assert.deepEqual(Array.from(config.fields, row => [row.id,row.expected]), [['source',20]]);
  assert.equal(MATH.validate(config,{source:'20'}).valid, true);
  assert.match(Array.from(config.tokens, token => token.text || '').join(''), /273\.15/);
  assert.equal(SCIENCE.checkNumericAnswer(question,{value:'293.15',unit:'K'}).correct, true);
  assert.equal(SCIENCE.checkNumericAnswer(question,{value:'293.15',unit:'°K'}).correct, false);
});

test('Densidad usa la fórmula correspondiente y valida la sustitución', () => {
  const question = SCIENCE.banks.density.find(row => row.prompt.includes('M = 17.8 g') && row.prompt.includes('D = 8.9'));
  const config = CONFIG.forQuestion(question);
  assert.equal(config.formula, 'V = M / D');
  assert.equal(MATH.validate(config,{M:'17.8',D:'8.9'}).valid, true);
  assert.equal(MATH.evaluateExpression('17.8 ÷ 8.9'), 2);
  assert.equal(SCIENCE.checkNumericAnswer(question,{value:'2',unit:'cm³'}).correct, true);
});

test('Conversiones SI identifica dirección, saltos y factor sin depender del ID', () => {
  const question = SCIENCE.banks.si.find(row => row.prompt === 'Convierte 6.4 m a cm.');
  const config = CONFIG.forQuestion(question);
  assert.equal(config.search, 'm → cm');
  assert.equal(MATH.validate(config,{direction:'derecha',steps:'2',factor:'100'}).valid, true);
  assert.equal(MATH.validate(config,{direction:'izquierda',steps:'2',factor:'100'}).category, 'CONVERSIÓN');
  assert.equal(SCIENCE.checkNumericAnswer(question,{value:'640',unit:'cm'}).correct, true);
});

test('el teclado contextual admite operaciones seguras, paréntesis y fracciones', () => {
  assert.equal(MATH.evaluateExpression('(65 + 273.15) × 5/9'), 187.861111111);
  assert.ok(MATH.keyboardProfiles.temperature.includes('('));
  assert.ok(MATH.keyboardProfiles.temperature.includes('5/9'));
  assert.equal(MATH.applyKey('12','⌫'), '1');
  assert.equal(MATH.applyKey('12','C'), '');
  assert.throws(() => MATH.evaluateExpression('window.alert(1)'), /no válida/);
});

test('la interfaz persiste pasos, conserva la calculadora y guía la corrección', () => {
  assert.match(html, /workspaceByQuestion:\{\}/);
  assert.match(html, /s\.workspaceByQuestion\[q\.id\]/);
  assert.match(html, /Revisa este paso · \$\{report\.category\}/);
  assert.match(html, /Comprobar de nuevo/);
  assert.match(html, /Ver procedimiento completo/);
  assert.match(html, /scienceCalculatorToggle/);
  assert.match(html, /data-formula-workspace/);
  assert.match(html, /workspace-step-letter\">A/);
  assert.match(html, /método de casita \/ procedimiento/);
  assert.match(html, /workspace-step-letter\">C/);
});

test('el examen de práctica usa el mismo workspace sin cambiar el banco', () => {
  assert.match(html, /scienceWorkspaceMarkup\(q,savedSelection\)/);
  assert.match(html, /if\(isExam\)/);
  assert.match(html, /Examen de práctica/);
  assert.equal(SCIENCE.banks.si.length, 25);
  assert.equal(SCIENCE.banks.density.length, 36);
  assert.equal(SCIENCE.banks.temperature.length, 36);
});
