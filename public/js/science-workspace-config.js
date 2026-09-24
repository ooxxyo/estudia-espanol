(() => {
  'use strict';

  const unitOptions = Object.freeze({
    densidad: Object.freeze(['g','cm³','g/cm³']),
    temperatura: Object.freeze(['°C','°F','K']),
    'ciencia-si': Object.freeze(['km','m','dm','cm','mm','kg','hg','g','cg','L','dL','mL']),
  });
  const parseNumber = value => Number(String(value).replace(/,/g,''));
  const field = (id,label,expected,category='SUSTITUCIÓN',extra={}) => Object.freeze({ id,label,expected,category,type:'number',...extra });
  const tokenField = id => Object.freeze({ field:id });
  const tokenText = text => Object.freeze({ text });

  function temperatureConfig(question) {
    const match = question.prompt.match(/Convierte\s+(-?[\d,.]+)\s+(°C|°F|K)\s+a\s+(Kelvin|Celsius|Fahrenheit)/i);
    if (!match) return null;
    const source=parseNumber(match[1]), sourceUnit=match[2], target=question.unitSymbol;
    const sourceField=field('source',`Dato inicial (${sourceUnit})`,source,'DATOS',{errorMessage:`Revisa los datos: usa ${match[1]} ${sourceUnit}, no otro valor.`});
    let fields=[sourceField], tokens=[];
    // Los números que pertenecen SIEMPRE a la fórmula son constantes visibles,
    // no espacios que el estudiante tenga que memorizar o volver a escribir.
    // El dato variable del problema sí se deja en blanco para practicar la sustitución.
    if(question.formula==='K = °C + 273.15'){
      tokens=[tokenText('K = '),tokenField('source'),tokenText(' + 273.15')];
    }else if(question.formula==='°C = K - 273.15'){
      tokens=[tokenText('°C = '),tokenField('source'),tokenText(' − 273.15')];
    }else if(question.formula==='°F = (°C × 1.8) + 32'){
      tokens=[tokenText('°F = ('),tokenField('source'),tokenText(' × 1.8) + 32')];
    }else if(question.formula==='°C = (°F - 32) × 5/9'){
      tokens=[tokenText('°C = ('),tokenField('source'),tokenText(' − 32) × 5/9')];
    }else if(question.formula==='K = (°F + 459.67) / 1.8'){
      tokens=[tokenText('K = ('),tokenField('source'),tokenText(' + 459.67) ÷ 1.8')];
    }else{
      tokens=[tokenText('°F = ('),tokenField('source'),tokenText(' × 1.8) − 459.67')];
    }
    return Object.freeze({kind:'temperature',title:'Formula Workspace',search:target,formula:question.formula,fields:Object.freeze(fields),tokens:Object.freeze(tokens),keyboardProfile:'temperature',unitOptions:unitOptions.temperatura});
  }

  function densityConfig(question) {
    const values={};
    for(const key of ['M','D','V']){const match=question.prompt.match(new RegExp(`${key} = ([\\d.]+)`));if(match)values[key]=Number(match[1]);}
    const formulaMatch=question.formula.match(/^([DMV]) = ([DMV]) ([/×]) ([DMV])$/);
    if(!formulaMatch) return null;
    const [,target,left,operator,right]=formulaMatch;
    const labels={M:'Masa M',D:'Densidad D',V:'Volumen V'};
    const fields=[field(left,labels[left],values[left],'DATOS',{errorMessage:`Revisa los datos de ${labels[left].toLowerCase()}.`}),field(right,labels[right],values[right],'DATOS',{errorMessage:`Revisa los datos de ${labels[right].toLowerCase()}.`})];
    return Object.freeze({kind:'density',title:'Formula Workspace',search:target,formula:question.formula,fields:Object.freeze(fields),tokens:Object.freeze([tokenText(`${target} = `),tokenField(left),tokenText(` ${operator==='/'?'÷':'×'} `),tokenField(right)]),keyboardProfile:'density',unitOptions:unitOptions.densidad});
  }

  const levels=Object.freeze({km:0,kg:0,hg:1,m:3,g:3,L:3,dm:4,dL:4,cm:5,cg:5,mm:6,mL:6});
  function siConfig(question) {
    const match=question.prompt.match(/Convierte\s+([\d,.]+)\s+(\w+)\s+a\s+(\w+)/i);
    if(!match) return null;
    const source=parseNumber(match[1]),from=match[2],to=match[3],fromLevel=levels[from],toLevel=levels[to];
    if(!Number.isFinite(fromLevel)||!Number.isFinite(toLevel)) return null;
    const direction=toLevel>fromLevel?'derecha':'izquierda',steps=Math.abs(toLevel-fromLevel),factor=10**steps,operator=direction==='derecha'?'×':'÷';
    const path=steps===1?`${from} → ${to}`:`${from} → ${direction==='derecha'?'… →':'… →'} ${to}`;
    const fields=[
      Object.freeze({id:'direction',label:'Dirección',expected:direction,category:'CONVERSIÓN',type:'select',options:Object.freeze(['derecha','izquierda']),errorMessage:`Desde ${from} debes moverte hacia la ${direction}.`}),
      field('steps','Cantidad de saltos',steps,'CONVERSIÓN',{errorMessage:`Cuenta ${steps} salto${steps===1?'':'s'} entre ${from} y ${to}.`}),
      field('factor','Factor de conversión',factor,'SUSTITUCIÓN',{errorMessage:`${steps} salto${steps===1?'':'s'} corresponde${steps===1?'':'n'} a ${factor}.`}),
    ];
    return Object.freeze({kind:'conversion',title:'Formula Workspace',search:`${from} → ${to}`,formula:'Regla del Sistema Internacional',metadata:Object.freeze([{label:'Unidad inicial',value:from},{label:'Unidad final',value:to},{label:'Recorrido',value:path}]),fields:Object.freeze(fields),tokens:Object.freeze([tokenText(`${match[1]} ${operator} `),tokenField('factor')]),keyboardProfile:'conversion',unitOptions:unitOptions['ciencia-si']});
  }

  function forQuestion(question){
    if(!question||question.subjectId!=='ciencia'||question.type!=='numeric')return null;
    if(question.topic==='temperatura')return temperatureConfig(question);
    if(question.topic==='densidad')return densityConfig(question);
    if(question.topic==='ciencia-si')return siConfig(question);
    return null;
  }

  window.SCIENCE_WORKSPACE_CONFIG=Object.freeze({forQuestion,unitOptions});
})();
