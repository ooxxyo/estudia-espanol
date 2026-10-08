import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const sandbox = { window: {} };
vm.runInNewContext(readFileSync(new URL('../public/history-data.js', import.meta.url), 'utf8'), sandbox);
const history = sandbox.window.HISTORY_CONTENT;

test('Europeos es actual sin completar civilizaciones ni renombrar sus IDs', () => {
  assert.equal(history.unit.id, 'historia-europeos');
  assert.equal(history.unit.name, 'Europeos');
  assert.equal(history.unit.status, 'current');
  const previous = history.previousUnits.find(unit => unit.id === 'historia-geografia-civilizaciones');
  assert.equal(previous.status, 'previous');
  assert.notEqual(previous.topicStatus, 'completed');
  assert.equal(previous.topicIds.length, 8);
  assert.equal(history.questions.filter(q => q.unitId === previous.id).length, 82);
  assert.equal(history.reviewCards.filter(c => previous.topicIds.includes(c.topic)).length, 27);
});

test('el banco de Europeos tiene cobertura, IDs estables y cuatro opciones inequívocas', () => {
  assert.equal(history.unit.topicIds.length, 18);
  const questions = history.questions.filter(q => q.unitId === 'historia-europeos');
  assert.equal(questions.length, 72);
  assert.equal(new Set(history.questions.map(q => q.id)).size, history.questions.length);
  assert.equal(new Set(history.topics.map(t => t.id)).size, history.topics.length);
  assert.equal(new Set(questions.map(q => q.prompt)).size, questions.length);
  for (const topicId of history.unit.topicIds) {
    assert.ok(history.topics.some(t => t.id === topicId));
    assert.ok(history.reviewCards.some(c => c.topic === topicId));
    assert.ok(questions.filter(q => q.topic === topicId).length >= 3);
  }
  for (const q of questions) {
    assert.ok(history.unit.topicIds.includes(q.topic), q.id);
    assert.equal(q.subjectId, 'historia');
    assert.equal(q.type, 'mc');
    assert.equal(q.options.length, 4, q.id);
    assert.equal(new Set(q.options.map(o => o.toLowerCase().trim())).size, 4, q.id);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, q.id);
    assert.ok(q.exp.length > 25, q.id);
    assert.ok(q.hints.length > 0, q.id);
    for (const hint of q.hints) {
      assert.ok(hint.length > 15, q.id);
      assert.doesNotMatch(hint, /la respuesta es|respuesta correcta/i, q.id);
      assert.ok(!hint.toLowerCase().includes(q.options[q.correct].toLowerCase()), `${q.id}: la pista copia la respuesta`);
    }
  }
});

test('el repaso conserva asociaciones y detalles de clase sin corregirlos en silencio', () => {
  const text = history.reviewCards.filter(c => history.unit.topicIds.includes(c.topic)).map(c => `${c.title} ${c.def} ${c.example}`).join('\n');
  for (const term of ['370 leguas', 'Cabo Verde', '1625 según la diapositiva', 'House of Burgesses', '1619', 'Mayflower Compact', '1620', '1637', '1654', 'Maine', 'bacalao', 'textiles', 'burguesía criolla', 'Guayanas', 'Powhatan', '1675–1676', 'Antropocentrismo', 'Virginia Company']) {
    assert.ok(text.includes(term), term);
  }
});
