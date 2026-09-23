(() => {
  'use strict';

  const METRIC_SCALE = 'kilo → hecto → deca → unidad → deci → centi → mili';

  function evaluateExpression(value) {
    const source = String(value ?? '')
      .replace(/[×x]/gi, '*')
      .replace(/÷/g, '/')
      .replace(/[−–—]/g, '-')
      .replace(/\s+/g, '');
    if (!source || !/^[0-9.+\-*/()]+$/.test(source)) throw new Error('Expresión no válida');
    const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/]/g) || [];
    if (tokens.join('') !== source) throw new Error('Expresión no válida');
    let cursor = 0;
    const peek = () => tokens[cursor];
    const take = () => tokens[cursor++];
    const parsePrimary = () => {
      const token = take();
      if (token === '+' || token === '-') {
        const number = parsePrimary();
        return token === '-' ? -number : number;
      }
      if (token === '(') {
        const number = parseSum();
        if (take() !== ')') throw new Error('Paréntesis incompletos');
        return number;
      }
      const number = Number(token);
      if (!Number.isFinite(number)) throw new Error('Número no válido');
      return number;
    };
    const parseProduct = () => {
      let result = parsePrimary();
      while (peek() === '*' || peek() === '/') {
        const operator = take();
        const right = parsePrimary();
        if (operator === '/' && right === 0) throw new Error('No se puede dividir entre cero');
        result = operator === '*' ? result * right : result / right;
      }
      return result;
    };
    const parseSum = () => {
      let result = parseProduct();
      while (peek() === '+' || peek() === '-') {
        const operator = take();
        const right = parseProduct();
        result = operator === '+' ? result + right : result - right;
      }
      return result;
    };
    const result = parseSum();
    if (cursor !== tokens.length || !Number.isFinite(result)) throw new Error('Expresión no válida');
    return Number(result.toPrecision(12));
  }

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
