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
    if (field.type === 'procedural-digits') return proceduralDigits(value,field.decimalPlaces) === String(field.expected);
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

  function scaledDecimalText(rawValue, places) {
    const digits=String(rawValue).padStart(places+1,'0');
    return places===0?digits:`${digits.slice(0,-places)}.${digits.slice(-places)}`;
  }

  function proceduralDigits(value, places) {
    const source=String(value??'').trim().replace(',','.');
    if(source==='')return '';
    if(typeof value!=='number'&&!source.includes('.'))return source;
    if(!/^\d+(?:\.\d+)?$/.test(source))return source;
    const fraction=(source.split('.')[1]||'');
    if(fraction.length>places)return fraction;
    return fraction.padEnd(places,'0');
  }

  function verticalMultiplication(value, multiplier = 60) {
    const source = String(value ?? '').trim().replace(',','.');
    if (!/^\d+(?:\.\d+)?$/.test(source) || !Number.isInteger(multiplier) || multiplier < 0) throw new Error('Multiplicación no válida');
    const places = decimalPlaces(source);
    const [integerPart,fractionPart='']=source.split('.');
    const multiplicandDigits = `${integerPart.replace(/^0+/,'')}${fractionPart}`||'0';
    const multiplierDigits = String(multiplier);
    const multiplicand = Number(multiplicandDigits);
    const partialProducts = [];
    const carries = [];
    [...multiplierDigits].reverse().forEach(digitText => {
      const digit = Number(digitText);
      let carry = 0;
      const rowCarries = [];
      [...multiplicandDigits].reverse().forEach(valueDigit => {
        const product = Number(valueDigit) * digit + carry;
        carry = Math.floor(product / 10);
        rowCarries.push(carry);
      });
      carries.push(Object.freeze(rowCarries));
      partialProducts.push(multiplicand * digit);
    });
    const rawProduct = multiplicand * multiplier;
    const rawProductDigits=String(rawProduct).padStart(Math.max(1,places),'0');
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
      rawProductDigits,
      decimalProduct,
      decimalProductText:scaledDecimalText(rawProduct,places),
      alignment: 'derecha',
    });
  }

  function createVerticalOperation({ id, value, multiplier = 60, stepId = '', operandKnown = false, operandSourceFieldId = '' }) {
    if (!id) throw new Error('La operación necesita un identificador');
    const model = verticalMultiplication(value, multiplier);
    const rawDigits = model.rawProductDigits;
    const columns = Math.max(
      model.multiplicandDigits.length,
      model.multiplierDigits.length,
      rawDigits.length,
      ...model.partialProducts.map((product,index)=>String(product).length+index),
    );
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
      structural:false,
    });
    const structuralCell=(column,row,reason='alignment')=>Object.freeze({
      id:`${id}${row.replace(/(^|-)(\w)/g,(_,separator,letter)=>letter.toUpperCase())}Col${column}`,
      expected:'',column,row,stepId,type:'structural',category:'',label:`Columna ${column}`,
      errorMessage:'',structural:true,reason,
    });
    const alignedRow=(source,row,category,message,shift=0)=>{
      const leading=Math.max(0,columns-shift-source.length);
      return Object.freeze(Array.from({length:columns},(_,index)=>{
        const column=index+1;
        if(index<leading)return structuralCell(column,row,'leading-space');
        if(index>=columns-shift)return structuralCell(column,row,'place-value-shift');
        return cell(`${id}${row.replace(/(^|-)(\w)/g,(_,separator,letter)=>letter.toUpperCase())}Col${column}`,source[index-leading],column,row,category,message);
      }));
    };
    const operandCells=alignedRow(model.multiplicandDigits,'operand','DÍGITO','Revisa este dígito y su columna.');
    const multiplierCells=alignedRow(model.multiplierDigits,'multiplier','ALINEACIÓN','Revisa la posición del multiplicador.');
    const activeCarryIndex=[...model.multiplierDigits].reverse().findIndex(digit=>Number(digit)!==0);
    const carries=Array(columns).fill('');
    if(activeCarryIndex>=0){
      const sourceCarries=model.carries[activeCarryIndex]||[];
      for(let sourceIndex=model.multiplicandDigits.length-1;sourceIndex>0;sourceIndex--){
        const carry=sourceCarries[model.multiplicandDigits.length-1-sourceIndex]||0;
        if(carry) carries[columns-model.multiplicandDigits.length+sourceIndex-1]=String(carry);
      }
    }
    const carryCells=Object.freeze(carries.map((digit,index)=>digit===''?structuralCell(index+1,'carry','unused-carry'):cell(`${id}CarryCol${index+1}`,digit,index+1,'carry','ACARREO','Revisa el número llevado sobre esta columna.')));
    const partialRows=[...model.multiplierDigits].reverse().map((digit,rowIndex)=>{
      const product=String(model.partialProducts[rowIndex]);
      return Object.freeze({
        index:rowIndex,
        multiplierDigit:digit,
        shift:rowIndex,
        product,
        cells:alignedRow(product,`partial-${rowIndex}`,'PRODUCTO PARCIAL','Revisa esta fila de la multiplicación.',rowIndex),
      });
    });
    const resultCells=alignedRow(rawDigits,'result','CÁLCULO','Revisa la suma de las filas por columnas.');
    const decimal=Object.freeze({
      id:`${id}DecimalPosition`,
      expected:columns-model.decimalPlaces,
      stepId,
      type:'decimal-position',
      category:'PUNTO DECIMAL',
      label:'Posición del punto decimal',
      errorMessage:'El producto está bien. Revisa la posición del punto decimal.',
    });
    const fields=Object.freeze([...operandCells,...multiplierCells,...carryCells,...partialRows.flatMap(row=>row.cells),...resultCells].filter(field=>!field.structural).concat(decimal));
    return Object.freeze({
      id,
      kind:'multiplication',
      stepId,
      columns,
      operator:'×',
      multiplierValue:multiplier,
      operandKnown,
      operandSourceFieldId,
      operandDigits:model.multiplicandDigits,
      rawProduct:model.rawProduct,
      rawProductDigits:model.rawProductDigits,
      decimalProduct:model.decimalProduct,
      decimalProductText:model.decimalProductText,
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

  function operationOperandDigits(operation, values = {}) {
    if(operation.operandSourceFieldId)return proceduralDigits(values[operation.operandSourceFieldId],operation.decimalPlaces);
    const cells=operation.operand.cells.filter(field=>!field.structural);
    if(operation.operandKnown)return cells.map(field=>field.expected).join('');
    return rowValues(cells,values).join('');
  }

  function validateOperationRow(cells, values, category, message, options = {}) {
    cells=cells.filter(field=>!field.structural);
    if(!cells.length)return null;
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
    let report=null;
    if(!operation.operandKnown&&!operation.operandSourceFieldId){
      report=validateOperationRow(operation.operand.cells,values,'DÍGITO','Revisa el dígito escrito en esta columna.');
      if(report)return report;
    }
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
    const procedure=createDmsProcedure({decimalDegrees:value});
    return Object.freeze({
      degrees:procedure.degrees,
      decimalPart:procedure.decimalPartValue,
      minuteProduct:procedure.minuteProductValue,
      minutes:procedure.minutes,
      remainingDecimal:procedure.remainderValue,
      secondProduct:procedure.secondProductValue,
      seconds:procedure.seconds,
    });
  }

  function createDmsProcedure({decimalDegrees,decimalPartText}={}) {
    const numericDegrees=Number(decimalDegrees);
    if(!Number.isFinite(numericDegrees)||numericDegrees<0)throw new Error('Grados decimales no válidos');
    const degrees=Math.trunc(numericDegrees);
    const fallbackFraction=String(numericDegrees).split('.')[1]||'0';
    const source=String(decimalPartText??`0.${fallbackFraction}`).trim().replace(',','.');
    if(!/^0\.\d+$/.test(source))throw new Error('Parte decimal no válida');
    const decimalPartValue=Number(source);
    if(Math.abs((numericDegrees-degrees)-decimalPartValue)>1e-9)throw new Error('La parte decimal no corresponde a los grados dados');
    const minuteOperation=verticalMultiplication(source,60);
    const scale=10**minuteOperation.decimalPlaces;
    const minutes=Math.trunc(minuteOperation.rawProduct/scale);
    const remainderRaw=minuteOperation.rawProduct-(minutes*scale);
    const remainderDigits=String(remainderRaw).padStart(minuteOperation.decimalPlaces,'0');
    const remainderValue=remainderRaw/scale;
    const remainderText=`0.${remainderDigits}`;
    const secondOperation=verticalMultiplication(remainderText,60);
    const secondProductValue=secondOperation.decimalProduct;
    const seconds=Math.round(secondProductValue);
    return Object.freeze({
      degrees,
      decimalPartValue,
      decimalPartText:source,
      decimalDigits:minuteOperation.multiplicandDigits,
      decimalPlaces:minuteOperation.decimalPlaces,
      minuteRawProduct:minuteOperation.rawProduct,
      minuteProductValue:minuteOperation.decimalProduct,
      minuteProductText:minuteOperation.decimalProductText,
      minutes,
      remainderValue,
      remainderDigits,
      remainderText,
      secondRawProduct:secondOperation.rawProduct,
      secondProductValue,
      secondProductText:secondOperation.decimalProductText,
      seconds,
      rounded:!Number.isInteger(secondProductValue),
    });
  }

  function dmsSolutionSteps(procedure) {
    return Object.freeze([
      `Los grados son ${procedure.degrees}° y los dígitos decimales son ${procedure.decimalDigits}.`,
      `${procedure.decimalDigits} × 60 = ${procedure.minuteRawProduct}; con ${procedure.decimalPlaces} cifras decimales se lee ${procedure.minuteProductText}.`,
      `La parte entera da ${procedure.minutes} minutos. Matemáticamente, el resto vale ${procedure.remainderValue}; en la libreta conserva los dígitos ${procedure.remainderDigits} según la escala.`,
      `${procedure.remainderDigits} × 60 = ${procedure.secondRawProduct}; con la misma escala se lee ${procedure.secondProductText}.`,
      procedure.rounded?`Los segundos se redondean al final a ${procedure.seconds}.`:`Los segundos son exactos: ${procedure.seconds}.`,
    ]);
  }

  window.MATH_WORKSPACE = Object.freeze({
    evaluateExpression,
    keyboardProfiles,
    applyKey,
    validate,
    validateStep,
    numericValue,
    decimalPlaces,
    proceduralDigits,
    verticalMultiplication,
    createVerticalOperation,
    operationOperandDigits,
    validateVerticalOperation,
    verticalOperationValue,
    isVerticalOperationComplete,
    createDmsProcedure,
    dmsSolutionSteps,
    dmsFromDecimal,
  });
})();
