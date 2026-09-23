import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { validateAcademicCatalog } from '../netlify/functions/_shared/content-validator.mjs';

const source = await readFile(new URL('../public/js/science-data.js', import.meta.url), 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const SCIENCE = sandbox.window.SCIENCE_CONTENT;
const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('Ciencia está habilitada con tres bloques separados', () => {
  assert.match(html, /id:'ciencia'.*status:'Prueba mañana'.*available:true.*contentKey:'science-v1'/);
  assert.deepEqual(Array.from(SCIENCE.topics, topic => topic.id), ['ciencia-si','densidad','temperatura']);
  assert.deepEqual(Array.from(SCIENCE.banks.si, q => q.topic === 'ciencia-si'), Array(SCIENCE.banks.si.length).fill(true));
  assert.deepEqual(Array.from(SCIENCE.banks.density, q => q.topic === 'densidad'), Array(SCIENCE.banks.density.length).fill(true));
  assert.deepEqual(Array.from(SCIENCE.banks.temperature, q => q.topic === 'temperatura'), Array(SCIENCE.banks.temperature.length).fill(true));
});

test('la evaluación de mañana incluye Densidad y Temperatura, nunca SI', () => {
  const tomorrow = SCIENCE.unit.assessments.find(row => row.date === '2026-09-24');
  assert.deepEqual(Array.from(tomorrow.topicIds), ['densidad','temperatura']);
  assert.equal(tomorrow.topicIds.includes('ciencia-si'), false);
  assert.match(html, /topics:\['densidad','temperatura'\],balancedTopics:true,limit:20/);
  assert.match(html, /perTopic=Math\.max\(1,Math\.floor/);
});

test('Conversiones SI se conserva separada para el 28 de septiembre', () => {
  const later = SCIENCE.unit.assessments.find(row => row.date === '2026-09-28');
  assert.deepEqual(Array.from(later.topicIds), ['ciencia-si']);
  assert.match(html, /topics:\['ciencia-si','densidad','temperatura'\],limit:30/);
});

test('los bancos cumplen mínimos, IDs únicos y validador académico', () => {
  assert.equal(SCIENCE.banks.si.length >= 25, true);
  assert.equal(SCIENCE.banks.density.length >= 35, true);
  assert.equal(SCIENCE.banks.temperature.length >= 35, true);
  assert.equal(new Set(SCIENCE.questions.map(q => q.id)).size, SCIENCE.questions.length);
  const report = validateAcademicCatalog([{ id:'ciencia', units:[SCIENCE.unit], topics:SCIENCE.topics, reviewCards:SCIENCE.reviewCards, questions:SCIENCE.questions }]);
  assert.equal(report.valid, true, report.errors.join('\n'));
});

test('Densidad contiene las tres fórmulas y procedimiento completo', () => {
  const text = SCIENCE.reviewCards.filter(card => card.topic === 'densidad').map(card => `${card.def} ${card.example}`).join(' ');
  for (const formula of ['D = M / V','M = D × V','V = M / D']) assert.match(text, new RegExp(formula.replace(/[×/]/g, '\\$&')));
  for (const question of SCIENCE.banks.density.filter(q => q.type === 'numeric')) {
    for (const phrase of ['Qué se busca:','Fórmula:','Sustitución:','Procedimiento:','Unidades:','Cálculo:','Respuesta final:','Error común:']) assert.ok(question.detailedExplanation.includes(phrase), `${question.id}: ${phrase}`);
  }
});

test('Temperatura contiene las seis fórmulas y Kelvin sin grado', () => {
  const formulas = new Set(SCIENCE.banks.temperature.map(q => q.formula).filter(Boolean));
  for (const formula of ['K = °C + 273.15','°C = K - 273.15','°F = (°C × 1.8) + 32','°C = (°F - 32) × 5/9','K = (°F + 459.67) / 1.8','°F = (K × 1.8) - 459.67']) assert.equal(formulas.has(formula), true, formula);
  assert.doesNotMatch(source, /°K/);
  assert.equal(SCIENCE.questions.filter(q => q.unitSymbol === 'K').every(q => !q.unitSymbol.includes('°')), true);
});

test('explicación simple, detalle y feedback de error están definidos', () => {
  for (const question of SCIENCE.questions) {
    assert.ok(question.simpleExplanation?.trim(), question.id);
    assert.ok(question.detailedExplanation?.trim(), question.id);
  }
  for (const question of SCIENCE.questions.filter(q => q.type === 'numeric')) assert.ok(['FÓRMULA','OPERACIÓN','CONVERSIÓN'].includes(question.errorType), question.id);
  assert.match(html, /Ver explicación detallada/);
  assert.match(html, /Error detectado:/);
});

test('la respuesta numérica tolera redondeo pero exige unidad correcta', () => {
  const density = SCIENCE.banks.density.find(q => q.type === 'numeric' && q.unitSymbol === 'g/cm³');
  assert.equal(SCIENCE.checkNumericAnswer(density,{ value:String(density.answer + 0.001), unit:'g/cm3' }).correct, true);
  const wrongUnit = SCIENCE.checkNumericAnswer(density,{ value:String(density.answer), unit:'g' });
  assert.equal(wrongUnit.numberCorrect, true); assert.equal(wrongUnit.unitCorrect, false); assert.equal(wrongUnit.correct, false);
  const kelvin = SCIENCE.banks.temperature.find(q => q.unitSymbol === 'K');
  assert.equal(SCIENCE.checkNumericAnswer(kelvin,{ value:String(kelvin.answer), unit:'°K' }).correct, false);
});

test('estado y snapshots de Ciencia se aíslan de Español e Historia', () => {
  assert.match(html, /subjectTotals:\{historia:.*ciencia:/s);
  assert.match(html, /examTopicsBySubject:\{historia:.*ciencia:/s);
  assert.match(html, /SCIENCE_CONTENT\.questions/);
  assert.equal(SCIENCE.questions.every(q => q.subjectId === 'ciencia' && q.unitId === SCIENCE.unit.id), true);
  assert.equal(SCIENCE.questions.some(q => q.id.startsWith('hist-') || /^q\d+$/.test(q.id)), false);
});
