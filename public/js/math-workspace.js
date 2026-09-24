(() => {
  'use strict';

  function evaluateExpression(value) {
    const source = String(value ?? '').replace(/[×x]/gi, '*').replace(/÷/g, '/').replace(/[−–—]/g, '-').replace(/\s+/g, '');
    if (!source || !/^[0-9.+\-*/()]+$/.test(source)) throw new Error('Expresión no válida');
    const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/]/g) || [];
    if (tokens.join('') !== source) throw new Error('Expresión no válida');
    let cursor = 0;
    const peek = () => tokens[cursor];
    const take = () => tokens[cursor++];
    const parsePrimary = () => {
      const token = take();
      if (token === '+' || token === '-') { const result = parsePrimary(); return token === '-' ? -result : result; }
      if (token === '(') { const result = parseSum(); if (take() !== ')') throw new Error('Paréntesis incompletos'); return result; }
      const result = Number(token);
      if (!Number.isFinite(result)) throw new Error('Número no válido');
      return result;
    };
    const parseProduct = () => {
      let result = parsePrimary();
      while (peek() === '*' || peek() === '/') {
        const operator = take(), right = parsePrimary();
        if (operator === '/' && right === 0) throw new Error('No se puede dividir entre cero');
        result = operator === '*' ? result * right : result / right;
      }
      return result;
    };
    const parseSum = () => {
      let result = parseProduct();
      while (peek() === '+' || peek() === '-') { const operator = take(), right = parseProduct(); result = operator === '+' ? result + right : result - right; }
      return result;
    };
    const result = parseSum();
    if (cursor !== tokens.length || !Number.isFinite(result)) throw new Error('Expresión no válida');
    return Number(result.toPrecision(12));
  }

  const keyboardProfiles = Object.freeze({
    basic: Object.freeze(['7','8','9','⌫','4','5','6','C','1','2','3','.','0','−','×','÷']),
    density: Object.freeze(['7','8','9','⌫','4','5','6','C','1','2','3','.','0','−','×','÷']),
    temperature: Object.freeze(['7','8','9','⌫','4','5','6','C','1','2','3','.','0','+','−','×','÷','(',')','5/9','9/5']),
    conversion: Object.freeze(['7','8','9','⌫','4','5','6','C','1','2','3','.','0','×','÷']),
  });

  function applyKey(value, key) {
    if (key === 'C') return '';
    if (key === '⌫') return String(value ?? '').slice(0, -1);
    return `${value ?? ''}${key}`;
  }

  function numericValue(value) {
    try { return evaluateExpression(value); } catch { return NaN; }
  }

  function valuesMatch(field, value) {
    if (field.type === 'select') return String(value ?? '') === String(field.expected);
    const actual = numericValue(value), expected = Number(field.expected);
    return Number.isFinite(actual) && Math.abs(actual - expected) <= Math.max(field.tolerance || 0.000001, Math.abs(expected) * 0.000001);
  }

  function validate(config, values = {}) {
    for (const field of config.fields || []) {
      const value = values[field.id];
      if (String(value ?? '').trim() === '') return { valid:false, fieldId:field.id, category:field.category || 'DATOS', message:`Completa “${field.label}”.` };
      if (!valuesMatch(field, value)) return { valid:false, fieldId:field.id, category:field.category || 'SUSTITUCIÓN', message:field.errorMessage || `Revisa “${field.label}” antes de continuar.` };
    }
    return { valid:true, fieldId:null, category:'', message:'' };
  }

  window.MATH_WORKSPACE = Object.freeze({ evaluateExpression, keyboardProfiles, applyKey, validate, numericValue });
})();
