(() => {
  'use strict';

  const METRIC_SCALE = 'kilo → hecto → deca → unidad → deci → centi → mili';

  const evaluateExpression = value => window.MATH_WORKSPACE.evaluateExpression(value);

  function helpForQuestion(question) {
    if (!question || question.subjectId !== 'ciencia' || question.type !== 'numeric') return null;
    if (question.topic === 'ciencia-si') {
      const direction = /divide/i.test(question.simpleExplanation || '')
        ? 'Izquierda: ÷10 por salto.'
        : 'Derecha: ×10 por salto.';
      return Object.freeze({
        buttonLabel: 'Ver ayuda',
        heading: 'Ayuda para Conversiones SI',
        lines: Object.freeze([
          METRIC_SCALE,
          'Derecha: ×10 por salto · Izquierda: ÷10 por salto.',
          question.simpleExplanation || direction,
          `Operación para plantear: ${question.formula}`,
        ]),
      });
    }
    if (question.topic === 'densidad') {
      return Object.freeze({
        buttonLabel: 'Ver fórmula',
        heading: 'Fórmula necesaria',
        lines: Object.freeze([question.formula, 'D = densidad · M = masa · V = volumen']),
      });
    }
    if (question.topic === 'temperatura') {
      const involvesKelvin = /(?:^|[^A-Za-z])K(?:[^A-Za-z]|$)|Kelvin/i.test(`${question.formula} ${question.prompt}`);
      return Object.freeze({
        buttonLabel: 'Ver fórmula',
        heading: 'Fórmula necesaria',
        lines: Object.freeze(involvesKelvin ? [question.formula, 'Kelvin se escribe K, sin símbolo de grado.'] : [question.formula]),
      });
    }
    return null;
  }

  function toolsEnabled(question, session) {
    return Boolean(helpForQuestion(question)) && session?.practiceToolsEnabled !== false;
  }

  window.SCIENCE_PRACTICE_TOOLS = Object.freeze({ METRIC_SCALE, evaluateExpression, helpForQuestion, toolsEnabled });
})();
