import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const sources = await Promise.all([
  '../public/js/math-workspace.js',
  '../public/js/math-data.js',
  '../public/js/math-workspace-config.js',
].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const studyCss = await readFile(new URL('../public/css/study-hub-study-p0.css', import.meta.url), 'utf8');
const sandbox = { window:{} };
vm.createContext(sandbox);
for (const source of sources) vm.runInContext(source, sandbox);
const WORKSPACE = sandbox.window.MATH_WORKSPACE;
const CONTENT = sandbox.window.MATH_CONTENT;
const CONFIG = sandbox.window.MATH_WORKSPACE_CONFIG;

test('convierte el ejemplo exacto aprobado a DMS', () => {
  assert.deepEqual(
    JSON.parse(JSON.stringify(WORKSPACE.dmsFromDecimal(89.125))),
    { degrees:89, decimalPart:0.125, minuteProduct:7.5, minutes:7, remainingDecimal:0.5, secondProduct:30, seconds:30 },
  );
  const question = CONTENT.banks.practice.find(row => row.decimalDegrees === 89.125);
  assert.equal(CONTENT.checkDmsAnswer(question,{degrees:'89',minutes:'7',seconds:'30'}).correct,true);
});

test('convierte y redondea el segundo ejemplo aprobado', () => {
  const result = WORKSPACE.dmsFromDecimal(23.3486);
  assert.equal(result.degrees,23);
  assert.equal(result.minutes,20);
  assert.ok(Math.abs(result.secondProduct - 54.96) < 1e-9);
  assert.equal(result.seconds,55);
  const question = CONTENT.banks.practice.find(row => row.decimalDegrees === 23.3486);
  assert.equal(CONTENT.checkDmsAnswer(question,{degrees:'23',minutes:'20',seconds:'55'}).correct,true);
  assert.equal(CONTENT.checkDmsAnswer(question,{degrees:'23',minutes:'20',seconds:'54'}).errorType,'SEGUNDOS');
});

test('la configuración organiza DMS por etapas y omite el redondeo innecesario', () => {
  const config = CONFIG.forQuestion(CONTENT.banks.practice[0]);
  assert.deepEqual(Array.from(config.steps, step => step.id),['A','B','C','D','E','F','H']);
  assert.equal(config.fields.find(field => field.id === 'degrees').expected,89);
  assert.equal(config.fields.find(field => field.id === 'minutes').expected,7);
  for (const question of CONTENT.questions) {
    const questionConfig = CONFIG.forQuestion(question);
    const completed = Object.fromEntries(questionConfig.fields.map(field => [field.id,String(field.expected)]));
    assert.equal(CONFIG.validateWorkspace(questionConfig,completed).valid,true,question.id);
  }
});

test('la práctica normal conserva pocos campos y lleva la multiplicación a la libreta', () => {
  const config = CONFIG.forQuestion(CONTENT.banks.practice[0]);
  assert.deepEqual(Array.from(config.primaryFields, field => field.id),[
    'minutes',
    'remainingDecimal',
    'finalDegrees',
    'finalMinutes',
    'finalSeconds',
  ]);
  assert.deepEqual(Object.keys(config.operationsByStep),['C','F']);
  assert.match(html,/class="math-notebook"/);
  assert.match(html,/data-vertical-operation/);
  assert.doesNotMatch(html,/>Producto parcial ×0</);
  assert.doesNotMatch(html,/>Primer acarreo</);
});

test('los acarreos y el punto decimal tienen objetivos táctiles cómodos', () => {
  assert.match(html,/\.math-carry-row \.math-cell\{[^}]*min-height:44px[^}]*height:44px/);
  assert.match(html,/\.math-decimal-choice\{[^}]*width:44px[^}]*min-height:44px/);
  assert.match(html,/@media\(max-width:520px\)\{[^\n]*\.math-column-frame\{grid-template-columns:24px/);
  assert.match(html,/@media\(max-width:360px\)\{[^\n]*\.math-column-frame\{grid-template-columns:22px/);
  assert.match(html,/main:has\(\.math-notebook\)\{padding-inline:4px\}\.q-card:has\(\.math-notebook\)\{padding-inline:4px!important\}/);
});

test('modo oscuro integra la libreta con la superficie P0 sin un bloque blanco', () => {
  assert.match(studyCss,/html\[data-theme="dark"\] body\[data-shds-shell="p0"\] \.math-notebook\s*\{[^}]*background:\s*var\(--shds-color-surface\)[^}]*color:\s*var\(--shds-color-ink\)/s);
  assert.match(studyCss,/html\[data-theme="dark"\] body\[data-shds-shell="p0"\] \.math-help-panel\s*\{[^}]*background:\s*var\(--shds-color-recess\)/s);
  assert.match(studyCss,/html\[data-theme="dark"\] body\[data-shds-shell="p0"\] \.math-paper-field input\s*\{[^}]*background:\s*var\(--shds-color-recess\)[^}]*color:\s*var\(--shds-color-ink\)/s);
  assert.match(studyCss,/html\[data-theme="dark"\] body\[data-shds-shell="p0"\] :is\(\.math-help-topic,\.math-cell,\.math-procedure-review\)\s*\{[^}]*background:\s*var\(--shds-color-recess\)/s);
  assert.match(studyCss,/html\[data-theme="dark"\] body\[data-shds-shell="p0"\] :is\(\.math-help-topic\.active,\.math-decimal-choice\[aria-pressed="true"\],\.math-learning-badge\)\s*\{[^}]*background:\s*var\(--shds-color-action-soft\)/s);
  assert.match(html,/\.math-notebook\{[^}]*background:#fff[^}]*color:#22303a/);
});

test('Aprender es un flujo separado y la ayuda avanzada empieza cerrada en práctica normal', () => {
  assert.equal(CONTENT.banks.practice.every(question => question.learningMode === false),true);
  assert.equal(CONTENT.banks.learning.every(question => question.learningMode === true),true);
  assert.match(html,/¿No sabes cómo multiplicar\? Aprender el procedimiento/);
  assert.match(html,/¿Necesitas ayuda\?/);
  assert.match(html,/data-math-help-panel/);
  assert.match(html,/math-learning-badge/);
  const dmsMarkupSource = html.slice(
    html.indexOf('function mathWorkspaceMarkup'),
    html.indexOf('function wireMathWorkspace'),
  );
  assert.doesNotMatch(dmsMarkupSource,/math-keyboard|Teclado matemático/);
});

test('todas las entradas normales usan solo el banco de práctica', () => {
  assert.deepEqual(
    Array.from(CONTENT.questionsForMode('practice'), question => question.id),
    Array.from(CONTENT.banks.practice, question => question.id),
  );
  assert.deepEqual(
    Array.from(CONTENT.questionsForMode('learning'), question => question.id),
    Array.from(CONTENT.banks.learning, question => question.id),
  );
  assert.match(html,/MATH_CONTENT\.questionsForMode\(opts\.mathLearning\?'learning':'practice'\)/);
  assert.match(html,/mathLearning:true/);
  assert.match(html,/MATH_CONTENT\.questionsForMode\('practice'\)\.length/);
  assert.doesNotMatch(html,/subject\.id==='matematicas'\?\[2,4,6\]/);
});

test('la ayuda permanece cerrada hasta que el estudiante la solicita', () => {
  const guided = CONTENT.banks.learning[0];
  const normal = CONTENT.banks.practice[0];
  assert.equal(CONFIG.isMultiplicationHelpOpen(guided,{},'C'),false);
  assert.equal(CONFIG.isMultiplicationHelpOpen(guided,{CHelpOpen:false},'C'),false);
  assert.equal(CONFIG.isMultiplicationHelpOpen(normal,{},'C'),false);
  assert.equal(CONFIG.isMultiplicationHelpOpen(normal,{CHelpOpen:true},'C'),true);
});

test('multiplicación vertical conserva dígitos, productos parciales, acarreo y punto decimal', () => {
  const first = WORKSPACE.verticalMultiplication('0.125',60);
  assert.equal(first.multiplicandDigits,'125');
  assert.deepEqual(Array.from(first.partialProducts),[0,750]);
  assert.deepEqual(Array.from(first.carries[1]),[3,1,0]);
  assert.equal(first.rawProduct,7500);
  assert.equal(first.decimalPlaces,3);
  assert.equal(first.decimalProduct,7.5);
  const second = WORKSPACE.verticalMultiplication('0.916',60);
  assert.deepEqual(Array.from(second.partialProducts),[0,5496]);
  assert.equal(second.decimalPlaces,3);
  assert.equal(second.decimalProduct,54.96);
});

test('el modelo DMS separa valor, dígitos y escala en una matriz de casos', () => {
  const cases = [
    {
      decimalDegrees:89.125,
      decimalPartText:'0.125',
      expected:{decimalDigits:'125',decimalPlaces:3,minuteProductText:'7.500',minutes:7,remainderValue:0.5,remainderDigits:'500',secondProductText:'30.000',seconds:30,rounded:false},
    },
    {
      decimalDegrees:12.05,
      decimalPartText:'0.050',
      expected:{decimalDigits:'050',decimalPlaces:3,minuteProductText:'3.000',minutes:3,remainderValue:0,remainderDigits:'000',secondProductText:'0.000',seconds:0,rounded:false},
    },
    {
      decimalDegrees:10.0168,
      decimalPartText:'0.0168',
      expected:{decimalDigits:'0168',decimalPlaces:4,minuteProductText:'1.0080',minutes:1,remainderValue:0.008,remainderDigits:'0080',secondProductText:'0.4800',seconds:0,rounded:true},
    },
    {
      decimalDegrees:23.3486,
      decimalPartText:'0.3486',
      expected:{decimalDigits:'3486',decimalPlaces:4,minuteProductText:'20.9160',minutes:20,remainderValue:0.916,remainderDigits:'9160',secondProductText:'54.9600',seconds:55,rounded:true},
    },
  ];
  for (const row of cases) {
    const procedure=WORKSPACE.createDmsProcedure(row);
    for (const [key,value] of Object.entries(row.expected)) assert.equal(procedure[key],value,`${row.decimalPartText} · ${key}`);
  }
});

test('la multiplicación vertical conserva ceros significativos de la fracción', () => {
  const leading=WORKSPACE.verticalMultiplication('0.050',60);
  assert.equal(leading.multiplicandDigits,'050');
  assert.equal(leading.rawProductDigits,'3000');
  assert.equal(leading.decimalProductText,'3.000');
  const small=WORKSPACE.verticalMultiplication('0.0001',60);
  assert.equal(small.multiplicandDigits,'0001');
  assert.equal(small.rawProductDigits,'0060');
  assert.equal(small.decimalProductText,'0.0060');
});

test('Resolver describe dinámicamente la escala y los dígitos restantes', () => {
  const exact=WORKSPACE.createDmsProcedure({decimalDegrees:89.125,decimalPartText:'0.125'});
  const rounded=WORKSPACE.createDmsProcedure({decimalDegrees:23.3486,decimalPartText:'0.3486'});
  const exactText=WORKSPACE.dmsSolutionSteps(exact).join(' ');
  const roundedText=WORKSPACE.dmsSolutionSteps(rounded).join(' ');
  assert.match(exactText,/7\.500/);
  assert.match(exactText,/500/);
  assert.match(exactText,/30\.000/);
  assert.match(roundedText,/20\.9160/);
  assert.match(roundedText,/9160/);
  assert.match(roundedText,/54\.9600/);
  assert.match(roundedText,/55/);
});

test('las explicaciones DMS publicadas conservan la misma escala del workspace', () => {
  assert.equal(CONTENT.approvedExamples.exact.remainingDecimalText,'0.500');
  assert.equal(CONTENT.approvedExamples.rounded.remainingDecimalText,'0.9160');
  const exact=CONTENT.banks.practice.find(row=>row.decimalDegrees===89.125).detailedExplanation;
  const rounded=CONTENT.banks.practice.find(row=>row.decimalDegrees===23.3486).detailedExplanation;
  for(const fragment of ['7.500','500','30.000'])assert.match(exact,new RegExp(fragment.replace('.','\\.')));
  for(const fragment of ['20.9160','9160','54.9600','55'])assert.match(rounded,new RegExp(fragment.replace('.','\\.')));
});

test('la validación DMS usa la operación vertical de cada multiplicación', () => {
  const config = CONFIG.forQuestion(CONTENT.banks.practice[0]);
  const operation=config.operationsByStep.C;
  const valid = Object.fromEntries(operation.fields.map(field => [field.id,String(field.expected)]));
  assert.equal(WORKSPACE.validateVerticalOperation(operation,valid).valid,true);
  assert.equal(WORKSPACE.validateVerticalOperation(operation,{...valid,minuteCarryCol3:'9'}).category,'ACARREO');
  const decimalError = WORKSPACE.validateVerticalOperation(operation,{...valid,minuteDecimalPosition:'2'});
  assert.equal(decimalError.category,'PUNTO DECIMAL');
  assert.match(decimalError.message,/punto decimal/i);
});

test('Comprobar paso valida la superficie sin depender de la respuesta DMS final', () => {
  const config = CONFIG.forQuestion(CONTENT.banks.practice[0]);
  const operation=config.operationsByStep.C;
  const values = Object.fromEntries(operation.fields.filter(field=>field.row!=='operand').map(field => [field.id,String(field.expected)]));
  assert.equal(operation.operandKnown,true);
  assert.equal(config.operationsByStep.F.operandKnown,false);
  assert.equal(WORKSPACE.validateVerticalOperation(operation,values).valid,true);
  values.minuteCarryCol3 = '9';
  const report = WORKSPACE.validateVerticalOperation(operation,values);
  assert.equal(report.fieldId,'minuteCarryCol3');
  assert.match(html,/validateVerticalOperation\(operation,values\)/);
  assert.match(html,/operation\.operandKnown\?staticCells/);
  assert.match(html,/>Llevadas<\/span>/);
  assert.match(html,/>Producto parcial × \$\{escHtml\(row\.multiplierDigit\)\}<\/span>/);
  assert.match(html,/>Coloca el punto decimal<\/span>/);
});

test('Aprender el procedimiento progresa de guiado a independiente sin rellenar variables', () => {
  assert.deepEqual(Array.from(CONTENT.banks.learning, row => row.learningStage),[
    'Ejemplo guiado','Ejercicio con ayuda','Ejercicio con menos ayuda','Ejercicio independiente',
  ]);
  assert.match(html,/Aprender el procedimiento/);
  assert.match(html,/data-workspace-field/);
  assert.doesNotMatch(html,/value="89"[^\n]*data-workspace-field/);
});

test('workspace y respuesta DMS se persisten dentro de la sesión', () => {
  assert.match(html,/workspaceByQuestion:\{\}/);
  assert.match(html,/s\.workspaceByQuestion\[q\.id\]/);
  assert.match(html,/values\[control\.dataset\.workspaceField\]=control\.value/);
  assert.match(html,/sessionSelection=\{degrees:values\.finalDegrees/);
  assert.match(html,/saveState\(\)/);
  assert.match(html,/\['historia','ciencia','matematicas'\]/);
  assert.match(html,/MATH_CONTENT\.questions/);
});

test('sesiones legacy convierten el decimal restante a dígitos sin perder escala', () => {
  assert.equal(WORKSPACE.proceduralDigits('0.5',3),'500');
  assert.equal(WORKSPACE.proceduralDigits(0.008,4),'0080');
  const config=CONFIG.forQuestion(CONTENT.banks.practice.find(row=>row.decimalDegrees===89.125));
  const completed=Object.fromEntries(config.fields.map(field=>[field.id,String(field.expected)]));
  completed.remainingDecimal='0.5';
  assert.equal(CONFIG.validateWorkspace(config,completed).valid,true);
});

test('Matemáticas queda aislada y contiene solo el tema DMS aprobado', () => {
  assert.equal(CONTENT.subjectId,'matematicas');
  assert.deepEqual(Array.from(CONTENT.topics, topic => topic.id),['grados-decimales-dms']);
  assert.equal(CONTENT.unit.status,'current');
  assert.equal(CONTENT.unit.addedAt,'2026-09-25');
  assert.equal(CONTENT.unit.updatedAt,'2026-09-25');
  assert.equal(CONTENT.unit.assessmentDate,null);
  const serialized = JSON.stringify(CONTENT).toLowerCase();
  for (const forbidden of ['cuadrante','cuadrantes','vuelta completa','ángulos anteriores']) assert.doesNotMatch(serialized,new RegExp(forbidden));
  assert.match(html,/contentKey:'math-v1'/);
  assert.match(html,/contentKey:'science-v1'/);
  assert.match(html,/contentKey:'historia-v1'/);
  assert.match(html,/contentKey:'spanish-v2'/);
});

test('la operación vertical reusable organiza columnas, acarreos y filas sin resolverlas', () => {
  const operation = WORKSPACE.createVerticalOperation({ id:'probe', value:'0.125', multiplier:60, stepId:'C' });
  assert.equal(operation.kind,'multiplication');
  assert.equal(operation.columns,4);
  assert.deepEqual(Array.from(operation.operand.cells, cell => cell.expected),['','1','2','5']);
  assert.deepEqual(Array.from(operation.multiplier.cells, cell => cell.expected),['','','6','0']);
  assert.deepEqual(Array.from(operation.carry.cells, cell => cell.expected),['','1','3','']);
  assert.deepEqual(Array.from(operation.partialRows[0].cells, cell => cell.expected),['','','','0']);
  assert.deepEqual(Array.from(operation.partialRows[1].cells, cell => cell.expected),['7','5','0','']);
  assert.equal(operation.partialRows[1].cells.at(-1).structural,true);
  assert.equal(operation.fields.some(field=>field.id==='probePartial1Col4'),false);
  assert.deepEqual(Array.from(operation.result.cells, cell => cell.expected),['7','5','0','0']);
  assert.equal(operation.result.decimal.expected,1);
  assert.equal(operation.resultValueId,'probeProduct');
});

test('la operación vertical localiza dígito, acarreo, producto, alineación y decimal', () => {
  const operation = WORKSPACE.createVerticalOperation({ id:'probe', value:'0.125', multiplier:60, stepId:'C' });
  const complete = Object.fromEntries(operation.fields.map(field => [field.id,String(field.expected)]));
  assert.equal(WORKSPACE.validateVerticalOperation(operation,complete).valid,true);
  assert.equal(WORKSPACE.validateVerticalOperation(operation,{...complete,probeOperandCol3:'9'}).category,'DÍGITO');
  assert.equal(WORKSPACE.validateVerticalOperation(operation,{...complete,probeCarryCol3:'8'}).category,'ACARREO');
  assert.equal(WORKSPACE.validateVerticalOperation(operation,{...complete,probePartial1Col2:'8'}).category,'PRODUCTO PARCIAL');
  const decimalError=WORKSPACE.validateVerticalOperation(operation,{...complete,probeDecimalPosition:'2'});
  assert.equal(decimalError.category,'PUNTO DECIMAL');
  assert.equal(decimalError.message,'El producto está bien. Revisa la posición del punto decimal.');
  assert.equal(WORKSPACE.verticalOperationValue(operation,complete),7.5);
});

test('las celdas estructurales de alineación no son editables ni obligatorias', () => {
  const operation=WORKSPACE.createVerticalOperation({id:'probe',value:'0.125',multiplier:60,stepId:'C'});
  const complete=Object.fromEntries(operation.fields.map(field=>[field.id,String(field.expected)]));
  assert.equal(WORKSPACE.validateVerticalOperation(operation,complete).valid,true);
  assert.equal(operation.partialRows[0].cells.filter(cell=>cell.structural).length,3);
  assert.equal(operation.partialRows[1].cells.filter(cell=>cell.structural).length,1);
  assert.equal(operation.fields.some(field=>field.structural),false);
  assert.doesNotMatch(html,/data-workspace-field="\$\{field\.id\}"[^>]*data-structural-cell/);
});

test('Aprender reduce la guía en cuatro niveles sin completar respuestas', () => {
  const guided=CONFIG.learningSupportFor('guided');
  const assisted=CONFIG.learningSupportFor('assisted');
  const light=CONFIG.learningSupportFor('light');
  const independent=CONFIG.learningSupportFor('independent');
  assert.equal(guided.autoOpenHelp,true);
  assert.equal(guided.showStepCue,true);
  assert.equal(assisted.autoOpenHelp,false);
  assert.equal(assisted.helpLimit,5);
  assert.equal(light.helpLimit,2);
  assert.equal(independent.helpLimit,0);
  assert.equal(independent.showStepCheck,false);
  assert.match(html,/learningSupportFor\(config\.helpLevel\)/);
  assert.match(html,/learningSupport\.showStepCue/);
});

test('el procedimiento de examen se conserva para revisarlo y sus controles quedan finalizados', () => {
  assert.match(html,/function mathProcedureReview/);
  assert.match(html,/mathProcedureReview\(q,procedure\)/);
  assert.match(html,/detailedExplanation\(q,a\.userAnswer,a\.correct,a\.procedure\)/);
  assert.match(html,/\[data-decimal-position\],\[data-check-math-step\]/);
  assert.match(html,/if\(sessionAnswerAt\(s,s\.idx\)\)return;/);
});

test('la revisión posterior distingue un error de cálculo de un error de punto decimal', () => {
  const config=CONFIG.forQuestion(CONTENT.banks.practice.find(row=>row.decimalDegrees===23.3486));
  const complete=Object.fromEntries(config.fields.map(field=>[field.id,String(field.expected)]));
  assert.deepEqual(Array.from(CONFIG.reviewProcedure(config,complete)),[]);
  const decimalIssues=CONFIG.reviewProcedure(config,{...complete,secondDecimalPosition:'1'});
  assert.deepEqual(Array.from(decimalIssues,issue=>[issue.stepId,issue.category]),[['F','PUNTO DECIMAL']]);
  const calculationIssues=CONFIG.reviewProcedure(config,{...complete,secondResultCol2:'5'});
  assert.deepEqual(Array.from(calculationIssues,issue=>[issue.stepId,issue.category]),[['F','CÁLCULO']]);
});

test('DMS trunca minutos, conserva el decimal completo y redondea únicamente segundos', () => {
  const rounded=WORKSPACE.dmsFromDecimal(23.3486);
  assert.equal(rounded.minuteProduct,20.916);
  assert.equal(rounded.minutes,20);
  assert.equal(rounded.remainingDecimal,0.916);
  assert.equal(rounded.secondProduct,54.96);
  assert.equal(rounded.seconds,55);
  const exactConfig=CONFIG.forQuestion(CONTENT.banks.practice.find(row=>row.decimalDegrees===89.125));
  const roundedConfig=CONFIG.forQuestion(CONTENT.banks.practice.find(row=>row.decimalDegrees===23.3486));
  assert.equal(exactConfig.steps.some(step=>step.kind==='rounding'),false);
  assert.equal(roundedConfig.steps.filter(step=>step.kind==='rounding').length,1);
});

test('el flujo DMS revela pasos progresivamente y el examen presenta todo sin ayudas', () => {
  const config=CONFIG.forQuestion(CONTENT.banks.practice[0]);
  assert.equal(config.steps.find(step=>step.id==='A').kind,'known');
  assert.equal(config.steps.find(step=>step.id==='B').kind,'known');
  assert.deepEqual(Array.from(CONFIG.visibleSteps(config,{},'practice')),['A','B','C']);
  assert.match(config.steps.find(step=>step.id==='C').title,/125\s*×\s*60/);
  const operationValues=Object.fromEntries(config.operationsByStep.C.fields.map(field=>[field.id,String(field.expected)]));
  assert.deepEqual(Array.from(CONFIG.visibleSteps(config,operationValues,'practice')),['A','B','C','D']);
  assert.deepEqual(Array.from(CONFIG.visibleSteps(config,{},'exam')),Array.from(config.steps,step=>step.id));
  const roundedConfig=CONFIG.forQuestion(CONTENT.banks.practice.find(row=>row.decimalDegrees===23.3486));
  assert.equal(roundedConfig.steps.some(step=>step.kind==='rounding'),true);
  assert.equal(CONFIG.visibleSteps(roundedConfig,{},'exam').includes('G'),false);
  assert.deepEqual(JSON.parse(JSON.stringify(CONFIG.presentationFor('exam'))),{
    progressive:false,
    showHelp:false,
    showStepCheck:false,
    showLearning:false,
  });
  assert.equal(CONFIG.presentationFor('practice').showHelp,true);
  assert.match(html,/presentation\.showHelp/);
  assert.match(html,/presentation\.showStepCheck/);
  assert.match(html,/q\.type==='math-workspace' && !isExam/);
  assert.match(html,/\$\{!isExam\? `<button class="icon-btn" id="hintBtn"/);
  assert.match(html,/const availableHints=isExam\?\[\]:availablePracticeHints\(q\)/);
});

test('DMS presenta los datos conocidos sin convertirlos en respuestas editables', () => {
  const config=CONFIG.forQuestion(CONTENT.banks.practice.find(row=>row.decimalDegrees===89.125));
  assert.deepEqual(Array.from(config.steps.filter(step=>step.kind==='known'),step=>step.fields[0].expected),[89,0.125]);
  assert.match(html,/class="math-known-data"/);
  assert.match(html,/Datos del ejercicio/);
  assert.match(html,/mathKnownFieldMarkup/);
  assert.doesNotMatch(html,/values\.degrees\s*=/);
  assert.doesNotMatch(html,/values\.decimalPart\s*=/);
});

test('DMS muestra los dígitos decimales sin ceros artificiales', () => {
  const config=CONFIG.forQuestion(CONTENT.banks.practice.find(row=>row.decimalDegrees===89.125));
  const decimalField=config.steps.find(step=>step.id==='B').fields[0];
  assert.equal(decimalField.displayValue,'125');
  assert.equal(config.operationsByStep.C.operandDigits,'125');
  assert.equal(config.operationsByStep.C.operand.cells.map(cell=>cell.expected).join(''),'125');
  assert.doesNotMatch(config.steps.find(step=>step.id==='C').title,/0\.125|0125|0\.0125/);
});

test('DMS reutiliza los dígitos restantes en la segunda multiplicación', () => {
  const exact=CONFIG.forQuestion(CONTENT.banks.practice.find(row=>row.decimalDegrees===89.125));
  const rounded=CONFIG.forQuestion(CONTENT.banks.practice.find(row=>row.decimalDegrees===23.3486));
  assert.equal(exact.procedure.remainderDigits,'500');
  assert.equal(exact.fields.find(field=>field.id==='remainingDecimal').expected,'500');
  assert.equal(exact.fields.find(field=>field.id==='remainingDecimal').label,'Sin punto');
  assert.equal(exact.operationsByStep.F.operandDigits,'500');
  assert.equal(exact.operationsByStep.F.operandSourceFieldId,'remainingDecimal');
  assert.equal(rounded.procedure.remainderDigits,'9160');
  assert.equal(rounded.operationsByStep.F.operandDigits,'9160');
});

test('el operando preparado conserva en revisión exactamente lo escrito por el estudiante', () => {
  const config=CONFIG.forQuestion(CONTENT.banks.practice.find(row=>row.decimalDegrees===89.125));
  const operation=config.operationsByStep.F;
  assert.equal(WORKSPACE.operationOperandDigits(operation,{remainingDecimal:'0.5'}),'500');
  assert.equal(WORKSPACE.operationOperandDigits(operation,{remainingDecimal:'400'}),'400');
  assert.equal(WORKSPACE.operationOperandDigits(operation,{remainingDecimal:''}),'');
});

test('todas las filas y el punto decimal comparten el mismo grid lógico', () => {
  assert.match(html,/class="math-column-frame"/);
  assert.match(html,/\.math-column-frame\{[^}]*grid-template-columns:28px repeat\(calc\(var\(--math-columns\) \* 2\)/);
  assert.match(html,/\.math-digit-grid[^}]*grid-template-columns:subgrid/);
  assert.match(html,/\.math-decimal-choices[^}]*grid-template-columns:subgrid/);
  assert.match(html,/\.math-decimal-choice\{[^}]*grid-row:1/);
  assert.match(html,/--decimal-grid-start:\$\{decimalGridStart\}/);
});

test('Resolver es ayuda explícita de Practice y no altera progreso ni aparece en Exam', () => {
  const markupSource=html.slice(html.indexOf('function mathWorkspaceMarkup'),html.indexOf('function wireMathWorkspace'));
  const wiringSource=html.slice(html.indexOf('function wireMathWorkspace'),html.indexOf('function validateMathWorkspace'));
  assert.match(markupSource,/const solve=mode==='practice'\?mathSolutionMarkup/);
  assert.match(html,/function mathSolutionMarkup\(config,workspace,mode\)\{\s*if\(mode!=='practice'\)return '';/);
  assert.match(html,/¿Quieres ver cómo se resuelve paso a paso\?/);
  assert.match(html,/Ver solución/);
  assert.match(html,/data-math-solution-panel/);
  assert.match(wiringSource,/values\.mathSolutionViewed=true/);
  assert.match(wiringSource,/values\.mathSolutionOpen=true/);
  assert.match(wiringSource,/saveState\(\)/);
  assert.doesNotMatch(wiringSource,/recordAnswer|state\.stats|subjectTotals|totalAnswered/);
});
