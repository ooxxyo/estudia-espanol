(() => {
  'use strict';

  const numberField = (id, label, expected, stepId, category, errorMessage, extra = {}) => Object.freeze({ id, label, expected, stepId, category, type:'number', errorMessage, ...extra });

  function presentationFor(mode) {
    if(mode==='exam')return Object.freeze({progressive:false,showHelp:false,showStepCheck:false,showLearning:false});
    if(mode==='learning')return Object.freeze({progressive:true,showHelp:true,showStepCheck:true,showLearning:true});
    return Object.freeze({progressive:true,showHelp:true,showStepCheck:true,showLearning:false});
  }

  function learningSupportFor(helpLevel) {
    const levels={
      guided:{autoOpenHelp:true,showStepCue:true,showStepCheck:true,helpLimit:5,helpIds:null},
      assisted:{autoOpenHelp:false,showStepCue:true,showStepCheck:true,helpLimit:5,helpIds:null},
      light:{autoOpenHelp:false,showStepCue:false,showStepCheck:true,helpLimit:2,helpIds:['start','decimal']},
      independent:{autoOpenHelp:false,showStepCue:false,showStepCheck:false,helpLimit:0,helpIds:[]},
    };
    return Object.freeze(levels[helpLevel]||levels.independent);
  }

  function isMultiplicationHelpOpen(question, workspace = {}, stepId) {
    const key=`${stepId}HelpOpen`;
    if(Object.prototype.hasOwnProperty.call(workspace,key)) return workspace[key]===true;
    return false;
  }

  function stepComplete(step, values) {
    if(step.kind==='known')return true;
    if(step.kind==='operation')return window.MATH_WORKSPACE.isVerticalOperationComplete(step.operation,values);
    return (step.fields||[]).every(field=>String(values[field.id]??'').trim()!=='');
  }

  function visibleSteps(config, values = {}, mode = 'practice') {
    if(!presentationFor(mode).progressive)return Object.freeze(config.steps.filter(step=>mode!=='exam'||step.kind!=='rounding').map(step=>step.id));
    const visible=[];
    for(let index=0;index<config.steps.length;index++){
      const step=config.steps[index];
      if(index===0 || stepComplete(config.steps[index-1],values))visible.push(step.id);
      else break;
    }
    return Object.freeze(visible);
  }

  function validateWorkspace(config, values = {}, options = {}) {
    const steps=options.answerOnly?config.steps.filter(step=>step.kind==='answer'):config.steps.filter(step=>step.kind!=='known');
    for(const step of steps){
      const report=step.kind==='operation'
        ? window.MATH_WORKSPACE.validateVerticalOperation(step.operation,values)
        : window.MATH_WORKSPACE.validate({fields:step.fields||[]},values);
      if(!report.valid)return report;
    }
    return {valid:true,fieldId:null,category:'',message:''};
  }

  function reviewProcedure(config, values = {}) {
    const issues=[];
    for(const step of config.steps.filter(item=>!['answer','rounding','known'].includes(item.kind))){
      const report=step.kind==='operation'
        ? window.MATH_WORKSPACE.validateVerticalOperation(step.operation,values)
        : window.MATH_WORKSPACE.validate({fields:step.fields||[]},values);
      if(!report.valid)issues.push(Object.freeze({stepId:step.id,stepTitle:step.title,fieldId:report.fieldId,category:report.category,message:report.message}));
    }
    return Object.freeze(issues);
  }

  function forQuestion(question) {
    if (!question || question.subjectId !== 'matematicas' || question.workspaceKind !== 'dms') return null;
    const expected = Object.values(window.MATH_CONTENT.approvedExamples).find(example => example.decimalDegrees === question.decimalDegrees);
    if (!expected) return null;
    const procedure=window.MATH_WORKSPACE.createDmsProcedure({decimalDegrees:expected.decimalDegrees,decimalPartText:expected.decimalPartText});

    const degreesField=numberField('degrees','Grados',procedure.degrees,'A','GRADOS','La parte entera original corresponde a los grados.',{suffix:'°'});
    const minuteOperation=window.MATH_WORKSPACE.createVerticalOperation({id:'minute',value:procedure.decimalPartText,multiplier:60,stepId:'C',operandKnown:true});
    const decimalPartField=numberField('decimalPart','Parte decimal',procedure.decimalPartValue,'B','PARTE DECIMAL','Conserva únicamente la parte que queda después del punto decimal.',{displayValue:procedure.decimalDigits});
    const minutesField=numberField('minutes','Minutos',procedure.minutes,'D','MINUTOS','Toma la parte entera del resultado; no redondees los minutos.');
    const remainingDecimalField=numberField('remainingDecimal','Sin punto',procedure.remainderDigits,'E','PARTE DECIMAL','Conserva todos los dígitos restantes según la escala decimal.',{type:'procedural-digits',decimalPlaces:procedure.decimalPlaces});
    const secondOperation=window.MATH_WORKSPACE.createVerticalOperation({id:'second',value:procedure.remainderText,multiplier:60,stepId:'F',operandSourceFieldId:'remainingDecimal'});
    const roundingField=expected.rounded
      ? numberField('roundedSeconds','Segundos redondeados',expected.seconds,'G','REDONDEO','Redondea los segundos al entero más cercano.')
      : null;
    const finalDegreesField=numberField('finalDegrees','°',expected.degrees,'H','RESPUESTA FINAL','Revisa los grados de la respuesta final.');
    const finalMinutesField=numberField('finalMinutes','′',expected.minutes,'H','RESPUESTA FINAL','Revisa los minutos de la respuesta final.');
    const finalSecondsField=numberField('finalSeconds','″',expected.seconds,'H','RESPUESTA FINAL','Revisa los segundos de la respuesta final.');
    const answerFields=Object.freeze([finalDegreesField,finalMinutesField,finalSecondsField]);
    const steps=[
      Object.freeze({id:'A',kind:'known',title:'Grados',guidance:'La parte entera ya viene dada en el ejercicio.',fields:Object.freeze([degreesField])}),
      Object.freeze({id:'B',kind:'known',title:'Parte decimal',guidance:'La parte decimal ya viene dada en el ejercicio.',fields:Object.freeze([decimalPartField])}),
      Object.freeze({id:'C',kind:'operation',title:`${minuteOperation.operandDigits} × 60`,guidance:'Multiplica sin el punto y vuelve a colocarlo al terminar.',operation:minuteOperation,fields:minuteOperation.fields}),
      Object.freeze({id:'D',kind:'field',title:'Minutos',guidance:'Toma la parte entera del primer producto, sin redondearla.',fields:Object.freeze([minutesField])}),
      Object.freeze({id:'E',kind:'field',title:'Parte decimal restante',guidance:`Conserva sus ${procedure.decimalPlaces} dígitos y escríbelos sin el punto.`,fields:Object.freeze([remainingDecimalField])}),
      Object.freeze({id:'F',kind:'operation',title:'× 60',guidance:'Repite la multiplicación por 60 con el decimal restante.',operation:secondOperation,fields:secondOperation.fields}),
    ];
    if(roundingField)steps.push(Object.freeze({id:'G',kind:'rounding',title:'Redondear segundos',guidance:'Redondea solo ahora, al entero más cercano.',fields:Object.freeze([roundingField])}));
    steps.push(Object.freeze({id:'H',kind:'answer',title:'Respuesta DMS',guidance:'Reúne grados, minutos y segundos.',fields:answerFields}));
    const knownFields=Object.freeze([degreesField,decimalPartField]);
    const primaryFields=Object.freeze([minutesField,remainingDecimalField,...(roundingField?[roundingField]:[]),...answerFields]);
    const operationsByStep=Object.freeze({C:minuteOperation,F:secondOperation});
    const fields=Object.freeze([...knownFields,...primaryFields,...minuteOperation.fields,...secondOperation.fields]);
    const helpItems=[
      Object.freeze({id:'start',label:'Cómo empezar',text:'Study Hub ya separó los grados y la parte decimal. Empieza multiplicando la parte decimal por 60.'}),
      Object.freeze({id:'columns',label:'Multiplicación por columnas',text:'Alinea cada dígito a la derecha y completa una fila por cada cifra de 60.'}),
      Object.freeze({id:'carry',label:'Acarreo',text:'Escribe arriba de la siguiente columna únicamente el número que llevas.'}),
      Object.freeze({id:'decimal',label:'Punto decimal',text:'Haz primero la multiplicación sin punto; después decide dónde colocarlo contando las cifras decimales.'}),
    ];
    if(expected.rounded)helpItems.push(Object.freeze({id:'rounding',label:'Redondeo',text:'Solo los segundos se redondean, y únicamente al final.'}));

    return Object.freeze({
      kind:'dms',
      title:'Math Workspace',
      search:'grados, minutos y segundos',
      learningStage:question.learningStage,
      helpLevel:question.helpLevel,
      procedure,
      fields,
      primaryFields,
      answerFields,
      operationsByStep,
      advancedFieldsByStep:Object.freeze({C:minuteOperation.fields,F:secondOperation.fields}),
      helpItems:Object.freeze(helpItems),
      steps:Object.freeze(steps),
    });
  }

  window.MATH_WORKSPACE_CONFIG = Object.freeze({
    forQuestion,
    isMultiplicationHelpOpen,
    learningSupportFor,
    presentationFor,
    reviewProcedure,
    visibleSteps,
    validateWorkspace,
  });
})();
