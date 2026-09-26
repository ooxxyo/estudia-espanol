(() => {
  'use strict';

  const subjectId = 'ciencia';
  const unit = Object.freeze({
    id: 'ciencia-medicion-materia', subjectId, name: 'Medición, densidad y temperatura', type: 'Prueba corta',
    status: 'current', topicStatus: 'current', order: 1,
    topicIds: ['ciencia-si', 'densidad', 'temperatura'],
    assessments: [
      {
        id: 'science-test-2026-09-24',
        type: 'quiz',
        label: 'Prueba',
        status: 'taken',
        date: '2026-09-24',
        topicIds: ['ciencia-si', 'densidad', 'temperatura'],
        source: 'teacher_assessment',
        note: 'Prueba real proporcionada: Densidad, Sistema Internacional y una pregunta conceptual de Temperatura. No incluyó conversiones de temperatura.',
      },
      {
        id: 'science-test-2026-09-30',
        type: 'quiz',
        label: 'Prueba',
        status: 'scheduled',
        date: '2026-09-30',
        topicIds: ['ciencia-si', 'densidad', 'temperatura'],
        contentPending: true,
        sourceAssessmentId: 'science-test-2026-09-24',
        note: 'Incluye el material de la prueba del 24 de septiembre y contenido adicional que todavía no ha sido proporcionado.',
      },
    ],
  });
  const topics = Object.freeze([
    { id: 'ciencia-si', subjectId, unitId: unit.id, name: 'Conversiones SI', icon: '↔', topicStatus: 'current' },
    { id: 'densidad', subjectId, unitId: unit.id, name: 'Densidad', icon: '◆', topicStatus: 'current', priority: 'urgent' },
    { id: 'temperatura', subjectId, unitId: unit.id, name: 'Temperatura', icon: '🌡', topicStatus: 'current', priority: 'urgent' },
  ]);

  const cards = (topic, rows) => rows.map((row, index) => ({
    id: `science-card-${topic}-${index + 1}`, subjectId, unitId: unit.id, topic, topicId: topic,
    title: row[0], def: row[1], example: row[2], detail: row[3] || '',
  }));
  const reviewCards = Object.freeze([
    ...cards('ciencia-si', [
      ['Escala del SI', 'kilo → hecto → deca → unidad → deci → centi → mili. Cada salto cambia por un factor de 10.', 'A la derecha se multiplica por 10 por salto; a la izquierda se divide.', 'Identifica la unidad inicial, marca la dirección, cuenta saltos, aplica la potencia de 10 y escribe la unidad final.'],
      ['Longitud', 'km, m, dm, cm y mm son unidades importantes de longitud.', '1 km = 1,000 m · 1 m = 100 cm · 1 m = 1,000 mm · 1 cm = 10 mm.', 'El prefijo indica la posición en la escala; conserva siempre la magnitud de longitud.'],
      ['Capacidad y masa', 'La misma escala decimal se aplica a litros y gramos cuando aparecen sus prefijos.', '1 L = 10 dL · 1 L = 1,000 mL · 1 dL = 100 mL. También: kg, hg y cg.', 'No mezcles magnitudes: convierte longitud con longitud, capacidad con capacidad y masa con masa.'],
    ]),
    ...cards('densidad', [
      ['Densidad', 'D = M / V. Se usa cuando conocemos masa y volumen.', '8.76 g / 3.07 cm³ ≈ 2.85 g/cm³.', 'D significa densidad, M masa y V volumen. Los gramos se dividen entre centímetros cúbicos.'],
      ['Masa', 'M = D × V. Se usa cuando conocemos densidad y volumen.', '1.54 g/cm³ × 3.00 cm³ = 4.62 g.', 'Los cm³ se cancelan y queda g, la unidad de masa.'],
      ['Volumen', 'V = M / D. Se usa cuando conocemos masa y densidad.', '17.8 g / 8.9 g/cm³ = 2 cm³.', 'Los gramos se cancelan y queda cm³, la unidad de volumen.'],
    ]),
    ...cards('temperatura', [
      ['Celsius → Kelvin', 'K = °C + 273.15.', '20 °C = 293.15 K.', 'Kelvin se escribe K, sin símbolo de grado.'],
      ['Kelvin → Celsius', '°C = K - 273.15.', '310 K = 36.85 °C.', 'Resta 273.15 y conserva el signo del resultado.'],
      ['Celsius → Fahrenheit', '°F = (°C × 1.8) + 32; también puede usarse 9/5.', '37 °C = 98.6 °F.', 'Primero multiplica; después suma 32.'],
      ['Fahrenheit → Celsius', '°C = (°F - 32) × 5/9.', '68 °F = 20 °C.', 'Primero resta 32 y usa 5/9.'],
      ['Fahrenheit → Kelvin', 'K = (°F + 459.67) / 1.8.', '32 °F ≈ 273.15 K.', 'Primero suma 459.67 y luego divide entre 1.8.'],
      ['Kelvin → Fahrenheit', '°F = (K × 1.8) - 459.67.', '373.15 K = 212 °F.', 'Primero multiplica por 1.8 y después resta 459.67.'],
    ]),
  ]);

  const base = (id, topic, type, prompt, extra) => ({ id: `science-${id}`, subjectId, unitId: unit.id, topic, topicId: topic, type, prompt, dif: extra.dif || 'normal', hints: extra.hints || [], ...extra });
  const mc = (id, topic, prompt, options, correct, exp, dif = 'fácil') => base(id, topic, 'mc', prompt, { options, correct, exp, simpleExplanation: exp, detailedExplanation: exp, dif });
  const numeric = (id, topic, prompt, answer, unitSymbol, formula, detail, dif = 'normal', tolerance = 0.02) => base(id, topic, 'numeric', prompt, {
    answer, unitSymbol, tolerance, formula, dif,
    exp: detail.simple,
    simpleExplanation: detail.simple,
    detailedExplanation: `Qué se busca: ${detail.search}. Fórmula: ${formula}. Sustitución: ${detail.substitution}. Procedimiento: ${detail.procedure}. Unidades: ${detail.units}. Cálculo: ${detail.calculation}. Respuesta final: ${answer} ${unitSymbol}. Error común: ${detail.errorCommon}`,
    errorType: detail.errorType || 'OPERACIÓN',
    hints: [`Identifica qué se busca y selecciona la fórmula.`, `Usa ${formula} y escribe también la unidad.`],
  });
  const siDetail = (from, to, steps, operation, expression, errorCommon = 'Mover el decimal en la dirección contraria.') => ({
    simple: `De ${from} a ${to}: ${steps} salto${steps === 1 ? '' : 's'}; ${operation}.`, search: `convertir ${from} a ${to}`,
    substitution: expression, procedure: `Ubica ${from} en la escala, avanza hacia ${to} y cuenta ${steps} salto${steps === 1 ? '' : 's'}.`,
    units: `La unidad inicial ${from} cambia a ${to}.`, calculation: expression, errorCommon, errorType: 'CONVERSIÓN',
  });
  const densityDetail = (search, formula, substitution, calculation, units, errorCommon) => ({
    simple: `Usamos ${formula} porque conocemos los otros dos datos y queremos encontrar ${search}.`, search, substitution,
    procedure: `Método de casita: coloca el dato que se divide dentro y el divisor fuera; si es multiplicación, multiplica D por V.`,
    units, calculation, errorCommon, errorType: 'FÓRMULA',
  });
  const tempDetail = (search, formula, substitution, calculation, errorCommon) => ({
    simple: `Usamos ${formula} porque convertimos hacia ${search}.`, search, substitution,
    procedure: 'Respeta el orden de operaciones indicado por los paréntesis.', units: `La respuesta debe escribirse en ${search}; K nunca lleva símbolo de grado.`,
    calculation, errorCommon, errorType: 'CONVERSIÓN',
  });

  const siQuestions = [
    mc('si-01','ciencia-si','¿Qué símbolo corresponde al kilómetro?',['km','m','cm','kg'],0,'km es el símbolo de kilómetro.'),
    mc('si-02','ciencia-si','¿Qué unidad representa el símbolo dL?',['decilitro','decámetro','mililitro','centigramo'],0,'dL significa decilitro.'),
    mc('si-03','ciencia-si','Al moverse hacia la derecha en la escala SI, ¿qué se hace por cada salto?',['Multiplicar por 10','Dividir entre 10','Sumar 10','Restar 10'],0,'Cada salto a la derecha multiplica por 10.'),
    mc('si-04','ciencia-si','Al moverse hacia la izquierda en la escala SI, ¿qué se hace por cada salto?',['Dividir entre 10','Multiplicar por 10','Sumar un cero siempre','Cambiar la magnitud'],0,'Cada salto a la izquierda divide entre 10.'),
    mc('si-05','ciencia-si','¿Cuántos saltos hay de metro a milímetro?',['3','2','1','4'],0,'m → dm → cm → mm son tres saltos.'),
    mc('si-06','ciencia-si','¿Cuál relación es correcta?',['1 L = 1,000 mL','1 L = 100 mL','1 dL = 10 mL','1 cm = 100 mm'],0,'Un litro equivale a 1,000 mililitros.'),
    mc('si-07','ciencia-si','¿Cuál lista mantiene una sola magnitud?',['km, m, cm, mm','kg, m, mL, cm','L, g, cm, K','hg, dL, km, °C'],0,'Todas son unidades de longitud.'),
    mc('si-08','ciencia-si','Un estudiante convierte 4 m a cm dividiendo entre 100. ¿Cuál fue el error?',['Usó la dirección contraria','Contó demasiados saltos','Debió cambiar a litros','La unidad inicial era incorrecta'],0,'De m a cm se avanza a la derecha y se multiplica por 100.','difícil'),
    numeric('si-09','ciencia-si','Convierte 7.5 cm a m.',0.075,'m','7.5 ÷ 100',siDetail('cm','m',2,'divide entre 100','7.5 ÷ 100 = 0.075')),
    numeric('si-10','ciencia-si','Convierte 6.4 m a cm.',640,'cm','6.4 × 100',siDetail('m','cm',2,'multiplica por 100','6.4 × 100 = 640')),
    numeric('si-11','ciencia-si','Convierte 72.5 mm a m.',0.0725,'m','72.5 ÷ 1,000',siDetail('mm','m',3,'divide entre 1,000','72.5 ÷ 1,000 = 0.0725')),
    numeric('si-12','ciencia-si','Convierte 12.4 m a mm.',12400,'mm','12.4 × 1,000',siDetail('m','mm',3,'multiplica por 1,000','12.4 × 1,000 = 12,400')),
    numeric('si-13','ciencia-si','Convierte 42,750 m a km.',42.75,'km','42,750 ÷ 1,000',siDetail('m','km',3,'divide entre 1,000','42,750 ÷ 1,000 = 42.75')),
    numeric('si-14','ciencia-si','Convierte 450 dL a L.',45,'L','450 ÷ 10',siDetail('dL','L',1,'divide entre 10','450 ÷ 10 = 45')),
    numeric('si-15','ciencia-si','Convierte 85 L a dL.',850,'dL','85 × 10',siDetail('L','dL',1,'multiplica por 10','85 × 10 = 850')),
    numeric('si-16','ciencia-si','Convierte 6 cm a mm.',60,'mm','6 × 10',siDetail('cm','mm',1,'multiplica por 10','6 × 10 = 60')),
    numeric('si-17','ciencia-si','Convierte 64,300 mm a cm.',6430,'cm','64,300 ÷ 10',siDetail('mm','cm',1,'divide entre 10','64,300 ÷ 10 = 6,430')),
    numeric('si-18','ciencia-si','Convierte 4.2 mm a km.',0.0000042,'km','4.2 ÷ 1,000,000',siDetail('mm','km',6,'divide entre 1,000,000','4.2 ÷ 1,000,000 = 0.0000042'),'difícil',0.00000001),
    numeric('si-19','ciencia-si','Convierte 35 km a mm.',35000000,'mm','35 × 1,000,000',siDetail('km','mm',6,'multiplica por 1,000,000','35 × 1,000,000 = 35,000,000'),'difícil',1),
    numeric('si-20','ciencia-si','Convierte 0.45 km a cm.',45000,'cm','0.45 × 100,000',siDetail('km','cm',5,'multiplica por 100,000','0.45 × 100,000 = 45,000')),
    numeric('si-21','ciencia-si','Convierte 2,805 cm a km.',0.02805,'km','2,805 ÷ 100,000',siDetail('cm','km',5,'divide entre 100,000','2,805 ÷ 100,000 = 0.02805')),
    numeric('si-22','ciencia-si','Convierte 3.2 L a mL.',3200,'mL','3.2 × 1,000',siDetail('L','mL',3,'multiplica por 1,000','3.2 × 1,000 = 3,200')),
    numeric('si-23','ciencia-si','Convierte 950 mL a L.',0.95,'L','950 ÷ 1,000',siDetail('mL','L',3,'divide entre 1,000','950 ÷ 1,000 = 0.95')),
    numeric('si-24','ciencia-si','Convierte 2.6 kg a g.',2600,'g','2.6 × 1,000',siDetail('kg','g',3,'multiplica por 1,000','2.6 × 1,000 = 2,600')),
    numeric('si-25','ciencia-si','Convierte 84 hg a kg.',8.4,'kg','84 ÷ 10',siDetail('hg','kg',1,'divide entre 10','84 ÷ 10 = 8.4')),
  ];

  const densityQuestions = [
    mc('den-01','densidad','Conozco masa y volumen. ¿Qué fórmula uso?',['D = M / V','M = D × V','V = M / D','D = M × V'],0,'Usamos D = M / V porque buscamos densidad.'),
    mc('den-02','densidad','Me piden la masa y conozco densidad y volumen. ¿Qué fórmula uso?',['M = D × V','D = M / V','V = M / D','M = D / V'],0,'Usamos M = D × V porque buscamos masa.'),
    mc('den-03','densidad','Me piden el volumen y conozco masa y densidad. ¿Qué fórmula uso?',['V = M / D','D = M / V','M = D × V','V = D / M'],0,'Usamos V = M / D porque buscamos volumen.'),
  ];
  const substances = ['corcho','piedra caliza','cobalto','cemento','perclorato de bario','fosfato de bismuto','cloruro de calcio','sulfato de cerio','siliciuro de cromo','cromato de amonio y magnesio'];
  const massVolume = [[8.76,3.07],[12.6,7],[17.4,6],[24.5,10],[9.45,3.5],[36.8,8],[15.75,4.5],[6.72,3.2],[42.3,9],[5.46,2.1],[18.2,6.5]];
  massVolume.forEach(([mass,volume],index)=>{const answer=Number((mass/volume).toFixed(2));densityQuestions.push(numeric(`den-${String(index+4).padStart(2,'0')}`,'densidad',`Una muestra de ${substances[index%substances.length]} tiene M = ${mass} g y V = ${volume} cm³. Calcula D.`,answer,'g/cm³','D = M / V',densityDetail('la densidad','D = M / V',`D = ${mass} g / ${volume} cm³`,`${mass} ÷ ${volume} ≈ ${answer}`,'g / cm³ = g/cm³','Multiplicar masa por volumen en vez de dividir.')))});
  const densityVolume = [[1.54,3],[2.4,5.5],[0.25,16],[8.9,2.4],[3.2,7.5],[6.7,1.8],[4.25,4],[0.6,12],[7.8,3.3],[2.75,6],[5.1,2.2]];
  densityVolume.forEach(([density,volume],index)=>{const answer=Number((density*volume).toFixed(2));densityQuestions.push(numeric(`den-${String(index+15).padStart(2,'0')}`,'densidad',`Una muestra de ${substances[(index+3)%substances.length]} tiene D = ${density} g/cm³ y V = ${volume} cm³. Calcula M.`,answer,'g','M = D × V',densityDetail('la masa','M = D × V',`M = ${density} g/cm³ × ${volume} cm³`,`${density} × ${volume} = ${answer}`,'Los cm³ se cancelan y queda g.','Dividir D entre V en vez de multiplicar.')))});
  const massDensity = [[17.8,8.9],[14.4,2.4],[9.6,1.2],[22.5,4.5],[31.5,3.5],[7.2,0.8],[12.6,2.1],[45,7.5],[19.2,3.2],[5.5,1.1],[28.8,4.8]];
  massDensity.forEach(([mass,density],index)=>{const answer=Number((mass/density).toFixed(2));densityQuestions.push(numeric(`den-${String(index+26).padStart(2,'0')}`,'densidad',`Una muestra de ${substances[(index+6)%substances.length]} tiene M = ${mass} g y D = ${density} g/cm³. Calcula V.`,answer,'cm³','V = M / D',densityDetail('el volumen','V = M / D',`V = ${mass} g / ${density} g/cm³`,`${mass} ÷ ${density} = ${answer}`,'Los g se cancelan y queda cm³.','Invertir la división y usar D / M.')))});

  const temperatureQuestions = [
    mc('temp-01','temperatura','¿Qué fórmula convierte Celsius a Kelvin?',['K = °C + 273.15','°C = K - 273.15','°F = (°C × 1.8) + 32','K = (°F + 459.67) / 1.8'],0,'Para pasar de Celsius a Kelvin se suma 273.15.'),
    mc('temp-02','temperatura','¿Qué fórmula convierte Kelvin a Celsius?',['°C = K - 273.15','K = °C + 273.15','°F = (K × 1.8) - 459.67','°C = (°F - 32) × 5/9'],0,'Para pasar de Kelvin a Celsius se resta 273.15.'),
    mc('temp-03','temperatura','¿Qué fórmula convierte Celsius a Fahrenheit?',['°F = (°C × 1.8) + 32','°C = (°F - 32) × 5/9','K = °C + 273.15','°F = (K × 1.8) - 459.67'],0,'Multiplica Celsius por 1.8 y suma 32.'),
    mc('temp-04','temperatura','¿Qué fórmula convierte Fahrenheit a Celsius?',['°C = (°F - 32) × 5/9','°C = (°F + 32) × 9/5','K = (°F + 459.67) / 1.8','°F = (°C × 1.8) + 32'],0,'Resta 32 y usa 5/9.'),
    mc('temp-05','temperatura','¿Qué fórmula directa convierte Fahrenheit a Kelvin?',['K = (°F + 459.67) / 1.8','K = °F + 273.15','°F = (K × 1.8) - 459.67','°C = K - 273.15'],0,'La fórmula directa suma 459.67 y divide entre 1.8.'),
    mc('temp-06','temperatura','¿Qué fórmula convierte Kelvin a Fahrenheit?',['°F = (K × 1.8) - 459.67','K = (°F + 459.67) / 1.8','°F = K + 32','°C = K - 273.15'],0,'Multiplica K por 1.8 y resta 459.67.'),
  ];
  const celsiusValues=[-273.15,-40,0,20,37];
  celsiusValues.forEach((value,index)=>temperatureQuestions.push(numeric(`temp-${String(index+7).padStart(2,'0')}`,'temperatura',`Convierte ${value} °C a Kelvin.`,Number((value+273.15).toFixed(2)),'K','K = °C + 273.15',tempDetail('K','K = °C + 273.15',`K = ${value} + 273.15`,`${value} + 273.15`,'Escribir símbolo de grado junto a K.'))));
  const kelvinC=[0,233.15,273.15,293.15,310.15];
  kelvinC.forEach((value,index)=>temperatureQuestions.push(numeric(`temp-${String(index+12).padStart(2,'0')}`,'temperatura',`Convierte ${value} K a Celsius.`,Number((value-273.15).toFixed(2)),'°C','°C = K - 273.15',tempDetail('°C','°C = K - 273.15',`°C = ${value} - 273.15`,`${value} - 273.15`,'Sumar 273.15 en vez de restarlo.'))));
  const celsiusF=[-40,0,20,37,100];
  celsiusF.forEach((value,index)=>temperatureQuestions.push(numeric(`temp-${String(index+17).padStart(2,'0')}`,'temperatura',`Convierte ${value} °C a Fahrenheit.`,Number(((value*1.8)+32).toFixed(2)),'°F','°F = (°C × 1.8) + 32',tempDetail('°F','°F = (°C × 1.8) + 32',`°F = (${value} × 1.8) + 32`,`(${value} × 1.8) + 32`,'Sumar 32 antes de multiplicar.'))));
  const fahrenheitC=[-40,32,68,98.6,212];
  fahrenheitC.forEach((value,index)=>temperatureQuestions.push(numeric(`temp-${String(index+22).padStart(2,'0')}`,'temperatura',`Convierte ${value} °F a Celsius.`,Number((((value-32)*5)/9).toFixed(2)),'°C','°C = (°F - 32) × 5/9',tempDetail('°C','°C = (°F - 32) × 5/9',`°C = (${value} - 32) × 5/9`,`(${value} - 32) × 5/9`,'Usar 9/5 o no restar 32 primero.'))));
  const fahrenheitK=[-459.67,-40,32,68,212];
  fahrenheitK.forEach((value,index)=>temperatureQuestions.push(numeric(`temp-${String(index+27).padStart(2,'0')}`,'temperatura',`Convierte ${value} °F a Kelvin.`,Number(((value+459.67)/1.8).toFixed(2)),'K','K = (°F + 459.67) / 1.8',tempDetail('K','K = (°F + 459.67) / 1.8',`K = (${value} + 459.67) / 1.8`,`(${value} + 459.67) / 1.8`,'Escribir K con grado o restar 459.67.'))));
  const kelvinF=[0,233.15,273.15,293.15,373.15];
  kelvinF.forEach((value,index)=>temperatureQuestions.push(numeric(`temp-${String(index+32).padStart(2,'0')}`,'temperatura',`Convierte ${value} K a Fahrenheit.`,Number(((value*1.8)-459.67).toFixed(2)),'°F','°F = (K × 1.8) - 459.67',tempDetail('°F','°F = (K × 1.8) - 459.67',`°F = (${value} × 1.8) - 459.67`,`(${value} × 1.8) - 459.67`,'Sumar 459.67 en vez de restarlo.'))));


  // Snapshot de la prueba real del 24 de septiembre de 2026.
  // Se conserva separado por procedencia, pero puede reutilizarse para repasar
  // exactamente el formato que apareció en la evaluación.
  const actualTestQuestions = [
    mc('test-2026-09-24-01','densidad','La densidad de un alcohol es 0.8 g/cm3 y el volumen es de 1,600 cm3. ¿Cuál es su masa?',['D=M/V','M=D×V','V=M/D'],1,'Según la prueba, para hallar la masa se usa M=D×V.'),
    mc('test-2026-09-24-02','densidad','¿Cuál sería la respuesta del problema uno?',['1,280 g','34.33 g','25.99 g'],0,'0.8 × 1,600 = 1,280 g.'),
    mc('test-2026-09-24-03','densidad','Un bloque de hierro tiene 60 cm3 de volumen y una masa de 474 g. ¿Cuál es su densidad?',['D=M/V','M=D×V','V=M/D'],0,'Según la prueba, para hallar densidad se usa D=M/V.'),
    mc('test-2026-09-24-04','densidad','¿Cuál sería el resultado?',['146.2 g/ml','7.9g/cm3','316.8 g/cm3'],1,'474 ÷ 60 = 7.9 g/cm3.'),
    mc('test-2026-09-24-05','densidad','Calcula el volumen de un cuerpo que tiene una densidad 2g/cm3 y una masa de 50g. ¿Cuál sería la fórmula?',['D=M/V','M=D×V','V=M/D'],2,'Según la prueba, para hallar volumen se usa V=M/D.'),
    mc('test-2026-09-24-06','densidad','¿Cuál es el resultado?',['48 cm3','100 cm3','25 cm3'],2,'50 ÷ 2 = 25 cm3.'),
    mc('test-2026-09-24-07','ciencia-si',"¿Cuál es el símbolo del prefijo 'kilo' en el Sistema Internacional de Unidades?",['kl','ki','k'],2,'Según la prueba, el símbolo de kilo es k.'),
    mc('test-2026-09-24-08','ciencia-si',"¿Cuál es el símbolo correcto del prefijo 'hecto' en el Sistema Internacional de Unidades?",['ht','h','he'],1,'Según la prueba, el símbolo de hecto es h.'),
    mc('test-2026-09-24-09','ciencia-si',"¿Cuál es el símbolo correcto del prefijo 'mili' en el Sistema Internacional de Unidades?",['m','mi','ml'],0,'Según la prueba, el símbolo del prefijo mili es m.'),
    mc('test-2026-09-24-10','ciencia-si',"¿Cuál es el valor numérico del prefijo 'deca' en el Sistema Internacional de Unidades?",['10','100','0.1'],0,'Según la prueba, deca corresponde a 10.'),
    mc('test-2026-09-24-11','ciencia-si',"¿Cuál es el valor numérico del prefijo 'deci' en el Sistema Internacional de Unidades?",['0.01','0.1','10'],1,'Según la prueba, deci corresponde a 0.1.'),
    mc('test-2026-09-24-12','ciencia-si',"¿Cuál de las siguientes opciones define mejor el término 'volumen'?",['Cantidad de espacio que ocupa un cuerpo.','Cantidad de materia en un objeto.','Medida de la densidad de un material.'],0,'Según la prueba, volumen es la cantidad de espacio que ocupa un cuerpo.'),
    mc('test-2026-09-24-13','temperatura',"¿Cuál de las siguientes opciones define mejor el término 'temperatura'?",['Cantidad de materia en un objeto.','Cantidad de espacio que ocupa un cuerpo.','Medida del calor o energía cinética promedio de las partículas de un cuerpo.'],2,'Se conserva la definición utilizada en la prueba del maestro.'),
    mc('test-2026-09-24-14','ciencia-si',"¿Cuál de las siguientes opciones define mejor el término 'litro'?",['Unidad de longitud equivalente a 1 metro.','Unidad de masa equivalente a 1 kilogramo.','Unidad de volumen y se expresa en centímetros cúbicos.'],2,'Se conserva exactamente la respuesta marcada como correcta en la prueba.'),
    mc('test-2026-09-24-15','ciencia-si',"¿Cuál de las siguientes opciones define mejor el término 'menisco'?",['La cantidad de materia en un objeto.','La unidad de volumen en el Sistema Internacional.','La curvatura que se forma en la superficie de un líquido dentro de un recipiente.'],2,'Según la prueba, menisco es la curvatura que se forma en la superficie de un líquido dentro de un recipiente.'),
    mc('test-2026-09-24-16','ciencia-si',"¿Cuál de las siguientes opciones define mejor el término 'longitud'?",['Medida de la masa de un objeto.','Cantidad de espacio que ocupa un cuerpo.','Distancia entre dos puntos.'],2,'Según la prueba, longitud es la distancia entre dos puntos.'),
    mc('test-2026-09-24-17','ciencia-si',"¿Cuál de las siguientes opciones define mejor el término 'metro' en el Sistema Internacional de Unidades?",['Unidad de longitud equivalente a la distancia entre dos líneas.','Unidad de masa equivalente a 1 kilogramo.','Unidad de volumen equivalente a 1 litro.'],0,'Se conserva exactamente la respuesta marcada como correcta en la prueba.'),
    mc('test-2026-09-24-18','densidad',"¿Cuál de las siguientes opciones define mejor el término 'densidad'?",['Relación entre la masa y el volumen de un cuerpo.','Cantidad de espacio que ocupa un cuerpo.','Medida de la temperatura de un objeto.'],0,'Según la prueba, densidad es la relación entre la masa y el volumen de un cuerpo.'),
    mc('test-2026-09-24-19','ciencia-si','Convierte 500 centímetros a metros usando análisis dimensional.',['50 m','0.5 m','5 m'],2,'500 cm = 5 m.'),
    mc('test-2026-09-24-20','ciencia-si','Utilizando análisis dimensional, ¿cuál es el resultado de convertir 1200 milímetros a kilómetros?',['0.0012 km','0.12 km','0.012 km'],0,'1200 mm = 0.0012 km.'),
  ].map(question => Object.freeze({
    ...question,
    sourceAssessmentId: 'science-test-2026-09-24',
    sourceReference: 'Prueba real · 24 sep 2026',
  }));

  const normalizeUnit = value => String(value ?? '').trim().replace(/\s+/g,'').replace(/3/g,'³').toLowerCase();
  const checkNumericAnswer = (question, response) => {
    const value = Number(String(response?.value ?? '').replace(',','.'));
    const numberCorrect = Number.isFinite(value) && Math.abs(value - question.answer) <= Math.max(question.tolerance || 0.02, Math.abs(question.answer) * 0.002);
    const unitCorrect = normalizeUnit(response?.unit) === normalizeUnit(question.unitSymbol) && !(question.unitSymbol === 'K' && /°/.test(String(response?.unit || '')));
    return { correct: numberCorrect && unitCorrect, numberCorrect, unitCorrect, errorType: !numberCorrect ? 'OPERACIÓN' : !unitCorrect ? 'UNIDAD' : '' };
  };
  const questions = Object.freeze([...siQuestions, ...densityQuestions, ...temperatureQuestions, ...actualTestQuestions]);
  window.SCIENCE_CONTENT = Object.freeze({
    subjectId,
    unit,
    topics,
    reviewCards,
    questions,
    banks: Object.freeze({
      si: siQuestions,
      density: densityQuestions,
      temperature: temperatureQuestions,
      actualTest: actualTestQuestions,
    }),
    assessmentSnapshots: Object.freeze({
      'science-test-2026-09-24': Object.freeze({
        id: 'science-test-2026-09-24',
        date: '2026-09-24',
        label: 'Prueba real',
        questionIds: Object.freeze(actualTestQuestions.map(question => question.id)),
      }),
    }),
    normalizeUnit,
    checkNumericAnswer,
  });
})();
