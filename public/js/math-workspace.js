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
    dms: Object.freeze(['7','8','9','⌫','4','5','6','C','1','2','3','.','0','×','60']),
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
    if (field.type === 'digit' || field.type === 'text') return String(value ?? '').trim() === String(field.expected);
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

  function validateStep(config, stepId, values = {}) {
    const fields = (config.fields || []).filter(field => field.stepId === stepId);
    return validate({ fields }, values);
  }

  function decimalPlaces(value) {
    const source = String(value ?? '').trim().replace(',','.');
    return source.includes('.') ? source.split('.')[1].length : 0;
  }

  function verticalMultiplication(value, multiplier = 60) {
    const source = String(value ?? '').trim().replace(',','.');
    if (!/^\d+(?:\.\d+)?$/.test(source) || !Number.isInteger(multiplier) || multiplier < 0) throw new Error('Multiplicación no válida');
    const places = decimalPlaces(source);
    const multiplicandDigits = source.replace('.','');
    const multiplierDigits = String(multiplier);
    const multiplicand = Number(multiplicandDigits);
    const partialProducts = [];
    const carries = [];
    [...multiplierDigits].reverse().forEach((digitText, rowIndex) => {
      const digit = Number(digitText);
      let carry = 0;
      const rowCarries = [];
      [...multiplicandDigits].reverse().forEach(valueDigit => {
        const product = Number(valueDigit) * digit + carry;
        carry = Math.floor(product / 10);
        rowCarries.push(carry);
      });
      carries.push(Object.freeze(rowCarries));
      partialProducts.push(multiplicand * digit * (10 ** rowIndex));
    });
    const rawProduct = multiplicand * multiplier;
    const decimalProduct = rawProduct / (10 ** places);
    return Object.freeze({
      source,
      multiplierValue:multiplier,
      multiplicandDigits,
      multiplierDigits,
      decimalPlaces: places,
      partialProducts: Object.freeze(partialProducts),
      carries: Object.freeze(carries),
      rawProduct,
      decimalProduct,
      alignment: 'derecha',
    });
  }

  function createVerticalOperation({ id, value, multiplier = 60, stepId = '' }) {
    if (!id) throw new Error('La operación necesita un identificador');
    const model = verticalMultiplication(value, multiplier);
    const rawDigits = String(model.rawProduct);
    const columns = Math.max(model.multiplicandDigits.length, model.multiplierDigits.length, rawDigits.length);
    const align = source => Array(Math.max(0,columns-source.length)).fill('').concat([...source]);
    const cell = (cellId, expected, column, row, category, message) => Object.freeze({
      id:cellId,
      expected:String(expected ?? ''),
      column,
      row,
      stepId,
      type:'digit',
      category,
      label:`Columna ${column}`,
      errorMessage:message,
    });
    const operandCells=align(model.multiplicandDigits).map((digit,index)=>cell(`${id}OperandCol${index+1}`,digit,index+1,'operand','DÍGITO','Revisa este dígito y su columna.'));
    const multiplierCells=align(model.multiplierDigits).map((digit,index)=>cell(`${id}MultiplierCol${index+1}`,digit,index+1,'multiplier','ALINEACIÓN','Revisa la posición del multiplicador.'));
    const activeCarryIndex=[...model.multiplierDigits].reverse().findIndex(digit=>Number(digit)!==0);
    const carries=Array(columns).fill('');
    if(activeCarryIndex>=0){
      const sourceCarries=model.carries[activeCarryIndex]||[];
      for(let sourceIndex=model.multiplicandDigits.length-1;sourceIndex>0;sourceIndex--){
        const carry=sourceCarries[model.multiplicandDigits.length-1-sourceIndex]||0;
        if(carry) carries[columns-model.multiplicandDigits.length+sourceIndex-1]=String(carry);
      }
    }
    const carryCells=carries.map((digit,index)=>cell(`${id}CarryCol${index+1}`,digit,index+1,'carry','ACARREO','Revisa el número llevado sobre esta columna.'));
    const partialRows=[...model.multiplierDigits].reverse().map((digit,rowIndex)=>{
      const product=String(model.partialProducts[rowIndex]);
      const expected=align(product);
      return Object.freeze({
        index:rowIndex,
        multiplierDigit:digit,
        shift:rowIndex,
        cells:Object.freeze(expected.map((valueDigit,index)=>cell(`${id}Partial${rowIndex}Col${index+1}`,valueDigit,index+1,`partial-${rowIndex}`,'PRODUCTO PARCIAL','Revisa esta fila de la multiplicación.'))),
      });
    });
    const resultCells=align(rawDigits).map((digit,index)=>cell(`${id}ResultCol${index+1}`,digit,index+1,'result','CÁLCULO','Revisa la suma de las filas por columnas.'));
    const decimal=Object.freeze({
      id:`${id}DecimalPosition`,
      expected:columns-model.decimalPlaces,
      stepId,
      type:'decimal-position',
      category:'PUNTO DECIMAL',
      label:'Posición del punto decimal',
      errorMessage:'El producto está bien. Revisa la posición del punto decimal.',
    });
    const fields=Object.freeze([...operandCells,...multiplierCells,...carryCells,...partialRows.flatMap(row=>row.cells),...resultCells,decimal]);
    return Object.freeze({
      id,
      kind:'multiplication',
      stepId,
      columns,
      operator:'×',
      multiplierValue:multiplier,
      decimalPlaces:model.decimalPlaces,
      operand:Object.freeze({cells:Object.freeze(operandCells),decimalPosition:columns-model.multiplicandDigits.length+1}),
      multiplierRow:Object.freeze({cells:Object.freeze(multiplierCells)}),
      multiplier:Object.freeze({cells:Object.freeze(multiplierCells)}),
      carry:Object.freeze({cells:Object.freeze(carryCells)}),
      partialRows:Object.freeze(partialRows),
      result:Object.freeze({cells:Object.freeze(resultCells),decimal}),
      fields,
      resultValueId:`${id}Product`,
    });
  }

  function rowValues(cells, values) {
    return cells.map(field=>String(values[field.id]??'').trim());
  }

  function validateOperationRow(cells, values, category, message, options = {}) {
    const actual=rowValues(cells,values), expected=cells.map(field=>String(field.expected??''));
    if(actual.every((value,index)=>value===expected[index])) return null;
    if(options.allowLeadingZeros){
      const firstExpected=expected.findIndex(value=>value!=='');
      const leadingZerosAreEquivalent=firstExpected>=0
        && actual.every((value,index)=>index<firstExpected?(value===''||value==='0'):value===expected[index]);
      if(leadingZerosAreEquivalent)return null;
    }
    const actualCompact=actual.join(''), expectedCompact=expected.join('');
    const field=cells.find((item,index)=>actual[index]!==expected[index])||cells[0];
    const normalizedCompact=value=>value.replace(/^0+(?=\d)/,'');
    if(actualCompact===expectedCompact||(actualCompact&&expectedCompact&&normalizedCompact(actualCompact)===normalizedCompact(expectedCompact))) return {valid:false,fieldId:field.id,category:'ALINEACIÓN',message:'Los dígitos son correctos, pero revisa la columna donde los colocaste.'};
    return {valid:false,fieldId:field.id,category,message};
  }

  function validateVerticalOperation(operation, values = {}) {
    let report=validateOperationRow(operation.operand.cells,values,'DÍGITO','Revisa el dígito escrito en esta columna.');
    if(report)return report;
    report=validateOperationRow(operation.carry.cells,values,'ACARREO','Revisa el acarreo asociado con esta columna.');
    if(report)return report;
    for(const row of operation.partialRows){
      report=validateOperationRow(row.cells,values,'PRODUCTO PARCIAL','Revisa esta fila antes de sumar los productos parciales.',{allowLeadingZeros:true});
      if(report)return report;
    }
    report=validateOperationRow(operation.result.cells,values,'CÁLCULO','Revisa la suma final por columnas.',{allowLeadingZeros:true});
    if(report)return report;
    const decimalValue=String(values[operation.result.decimal.id]??'').trim();
    if(decimalValue==='')return{valid:false,fieldId:operation.result.decimal.id,category:'PUNTO DECIMAL',message:'Decide dónde colocar el punto decimal.'};
    if(Number(decimalValue)!==operation.result.decimal.expected)return{valid:false,fieldId:operation.result.decimal.id,category:'PUNTO DECIMAL',message:operation.result.decimal.errorMessage};
    return {valid:true,fieldId:null,category:'',message:''};
  }

  function verticalOperationValue(operation, values = {}) {
    const digits=rowValues(operation.result.cells,values).join('');
    const position=Number(values[operation.result.decimal.id]);
    if(!/^\d+$/.test(digits)||!Number.isInteger(position)||position<0||position>digits.length)return NaN;
    const source=position===digits.length?digits:position===0?`0.${digits}`:`${digits.slice(0,position)}.${digits.slice(position)}`;
    return Number(source);
  }

  function isVerticalOperationComplete(operation, values = {}) {
    const expectedDigits=operation.result.cells.filter(field=>field.expected!=='').length;
    const enteredDigits=rowValues(operation.result.cells,values).filter(Boolean).length;
    return enteredDigits>=expectedDigits && String(values[operation.result.decimal.id]??'').trim()!=='';
  }

  function dmsFromDecimal(value) {
    const decimalDegrees = Number(value);
    if (!Number.isFinite(decimalDegrees) || decimalDegrees < 0) throw new Error('Grados decimales no válidos');
    const degrees = Math.trunc(decimalDegrees);
    const decimalPart = Number((decimalDegrees - degrees).toPrecision(12));
    const minuteProduct = Number((decimalPart * 60).toPrecision(12));
    const minutes = Math.trunc(minuteProduct);
    const remainingDecimal = Number((minuteProduct - minutes).toPrecision(12));
    const secondProduct = Number((remainingDecimal * 60).toPrecision(12));
    const seconds = Math.round(secondProduct);
    return Object.freeze({ degrees, decimalPart, minuteProduct, minutes, remainingDecimal, secondProduct, seconds });
  }

  window.MATH_WORKSPACE = Object.freeze({
    evaluateExpression,
    keyboardProfiles,
    applyKey,
    validate,
    validateStep,
    numericValue,
    decimalPlaces,
    verticalMultiplication,
    createVerticalOperation,
    validateVerticalOperation,
    verticalOperationValue,
    isVerticalOperationComplete,
    dmsFromDecimal,
  });
})();
