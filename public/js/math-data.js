(() => {
  'use strict';

  const subjectId = 'matematicas';
  const topicId = 'grados-decimales-dms';
  const unit = Object.freeze({
    id: 'matematicas-conversion-dms',
    subjectId,
    name: 'Grados decimales a grados, minutos y segundos',
    type: 'Tema actual',
    status: 'current',
    topicStatus: 'current',
    addedAt: '2026-09-25',
    updatedAt: '2026-09-25',
    assessmentDate: null,
    order: 1,
    topicIds: [topicId],
    assessments: [Object.freeze({ type:'practice_exam', label:'Examen de práctica', status:'pending', date:null })],
  });
  const topics = Object.freeze([
    Object.freeze({
      id: topicId,
      subjectId,
      unitId: unit.id,
      name: 'Grados decimales a DMS',
      icon: '°′″',
      topicStatus: 'current',
      addedAt: '2026-09-25',
      updatedAt: '2026-09-25',
      assessmentDate: null,
      priority: 'current',
    }),
  ]);

  const reviewCards = Object.freeze([
    Object.freeze({ id:'math-card-dms-1', subjectId, unitId:unit.id, topic:topicId, topicId, title:'Identificar grados', def:'La parte entera del número decimal corresponde a los grados.', example:'89.125° → 89°.' }),
    Object.freeze({ id:'math-card-dms-2', subjectId, unitId:unit.id, topic:topicId, topicId, title:'Encontrar minutos', def:'Multiplica la parte decimal × 60. La parte entera del resultado corresponde a los minutos.', example:'0.125 × 60 = 7.500 → 7′.' }),
    Object.freeze({ id:'math-card-dms-3', subjectId, unitId:unit.id, topic:topicId, topicId, title:'Encontrar segundos', def:'Multiplica la parte decimal restante × 60. Ese resultado corresponde a los segundos.', example:'0.500 × 60 = 30 → 30″.' }),
    Object.freeze({ id:'math-card-dms-4', subjectId, unitId:unit.id, topic:topicId, topicId, title:'Redondear segundos', def:'Los segundos se redondean al entero más cercano cuando sea necesario.', example:'54.96 → 55″.' }),
    Object.freeze({ id:'math-card-dms-5', subjectId, unitId:unit.id, topic:topicId, topicId, title:'Formato DMS', def:'La respuesta final usa grados °, minutos ′ y segundos ″.', example:'23° 20′ 55″.' }),
  ]);

  const approvedExamples = Object.freeze({
    exact: Object.freeze({ decimalDegrees:89.125, degrees:89, decimalPart:0.125, decimalPartText:'0.125', minuteProduct:7.5, minutes:7, remainingDecimal:0.5, remainingDecimalText:'0.500', secondProduct:30, seconds:30, rounded:false }),
    rounded: Object.freeze({ decimalDegrees:23.3486, degrees:23, decimalPart:0.3486, decimalPartText:'0.3486', minuteProduct:20.916, minutes:20, remainingDecimal:0.916, remainingDecimalText:'0.916', secondProduct:54.96, seconds:55, rounded:true }),
  });

  const question = (id, exampleKey, learningStage, helpLevel, dif, learningMode) => {
    const example = approvedExamples[exampleKey];
    return Object.freeze({
      id,
      subjectId,
      unitId:unit.id,
      topic:topicId,
      topicId,
      type:'math-workspace',
      workspaceKind:'dms',
      prompt:`Convierte ${example.decimalDegrees}° a grados, minutos y segundos (DMS).`,
      decimalDegrees:example.decimalDegrees,
      answer:Object.freeze({ degrees:example.degrees, minutes:example.minutes, seconds:example.seconds }),
      learningStage,
      helpLevel,
      learningMode,
      dif,
      hints:Object.freeze([
        'Empieza con la parte entera para identificar los grados.',
        'Multiplica cada parte decimal restante por 60 y conserva la parte entera correspondiente.',
      ]),
      exp:'Sigue el procedimiento aprobado: parte entera, decimal × 60, minutos, decimal restante × 60 y redondeo de segundos cuando haga falta.',
      simpleExplanation:`La conversión correcta es ${example.degrees}° ${example.minutes}′ ${example.seconds}″.`,
      detailedExplanation: example.rounded
        ? '23°; 0.3486 × 60 = 20.916; 20′; 0.916 × 60 = 54.96; 54.96 → 55″; resultado: 23° 20′ 55″.'
        : '89°; 0.125 × 60 = 7.500; 7′; 0.500 × 60 = 30; resultado: 89° 7′ 30″.',
    });
  };

  const learningQuestions = Object.freeze([
    question('math-dms-learn-guided','exact','Ejemplo guiado','guided','fácil',true),
    question('math-dms-learn-assisted','rounded','Ejercicio con ayuda','assisted','normal',true),
    question('math-dms-learn-light','exact','Ejercicio con menos ayuda','light','normal',true),
    question('math-dms-learn-independent','rounded','Ejercicio independiente','independent','difícil',true),
  ]);
  const practiceQuestions = Object.freeze([
    question('math-dms-practice-exact','exact','Práctica normal','independent','normal',false),
    question('math-dms-practice-rounded','rounded','Práctica normal','independent','normal',false),
  ]);
  const questions = Object.freeze([...learningQuestions, ...practiceQuestions]);

  function questionsForMode(mode) {
    return mode==='learning' ? learningQuestions : practiceQuestions;
  }

  function checkDmsAnswer(questionRow, response) {
    const expected = questionRow?.answer || {};
    const degreesCorrect = Number(response?.degrees) === expected.degrees;
    const minutesCorrect = Number(response?.minutes) === expected.minutes;
    const secondsCorrect = Number(response?.seconds) === expected.seconds;
    return Object.freeze({
      correct:degreesCorrect && minutesCorrect && secondsCorrect,
      degreesCorrect,
      minutesCorrect,
      secondsCorrect,
      errorType:!degreesCorrect?'GRADOS':!minutesCorrect?'MINUTOS':!secondsCorrect?'SEGUNDOS':'',
    });
  }

  window.MATH_CONTENT = Object.freeze({
    subjectId,
    unit,
    topics,
    reviewCards,
    questions,
    approvedExamples,
    banks:Object.freeze({ learning:learningQuestions, practice:practiceQuestions }),
    questionsForMode,
    checkDmsAnswer,
  });
})();
