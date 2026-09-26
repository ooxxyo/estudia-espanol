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
    'degrees',
    'decimalPart',
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
  assert.match(html,/\.math-decimal-choices\{[^}]*width:100%[^}]*max-width:calc\(var\(--math-columns\) \* 58px\)/);
  assert.match(html,/\.math-decimal-choice\{[^}]*min-height:44px/);
  assert.match(html,/@media\(max-width:520px\)\{[^\n]*\.math-decimal-choices\{max-width:calc\(var\(--math-columns\) \* 58px\)\}/);
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
  assert.equal(first.multiplicandDigits,'0125');
  assert.deepEqual(Array.from(first.partialProducts),[0,7500]);
  assert.deepEqual(Array.from(first.carries[1]),[3,1,0,0]);
  assert.equal(first.rawProduct,7500);
  assert.equal(first.decimalPlaces,3);
  assert.equal(first.decimalProduct,7.5);
  const second = WORKSPACE.verticalMultiplication('0.916',60);
  assert.deepEqual(Array.from(second.partialProducts),[0,54960]);
  assert.equal(second.decimalPlaces,3);
  assert.equal(second.decimalProduct,54.96);
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
  const values = Object.fromEntries(operation.fields.map(field => [field.id,String(field.expected)]));
  values.minuteOperandCol3 = '9';
  const report = WORKSPACE.validateVerticalOperation(operation,values);
  assert.equal(report.fieldId,'minuteOperandCol3');
  assert.match(html,/validateVerticalOperation\(operation,values\)/);
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
  assert.deepEqual(Array.from(operation.operand.cells, cell => cell.expected),['0','1','2','5']);
  assert.deepEqual(Array.from(operation.multiplier.cells, cell => cell.expected),['','','6','0']);
  assert.deepEqual(Array.from(operation.carry.cells, cell => cell.expected),['','1','3','']);
  assert.deepEqual(Array.from(operation.partialRows[0].cells, cell => cell.expected),['','','','0']);
  assert.deepEqual(Array.from(operation.partialRows[1].cells, cell => cell.expected),['7','5','0','0']);
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
  const shifted={...complete,probePartial0Col3:'0',probePartial0Col4:''};
  assert.equal(WORKSPACE.validateVerticalOperation(operation,shifted).category,'ALINEACIÓN');
  const decimalError=WORKSPACE.validateVerticalOperation(operation,{...complete,probeDecimalPosition:'2'});
  assert.equal(decimalError.category,'PUNTO DECIMAL');
  assert.equal(decimalError.message,'El producto está bien. Revisa la posición del punto decimal.');
  assert.equal(WORKSPACE.verticalOperationValue(operation,complete),7.5);
});

test('la libreta acepta ceros iniciales equivalentes sin perder la detección de alineación', () => {
  const operation=WORKSPACE.createVerticalOperation({id:'probe',value:'0.125',multiplier:60,stepId:'C'});
  const complete=Object.fromEntries(operation.fields.map(field=>[field.id,String(field.expected)]));
  const zeroFilled={...complete,probePartial0Col1:'0',probePartial0Col2:'0',probePartial0Col3:'0'};
  assert.equal(WORKSPACE.validateVerticalOperation(operation,zeroFilled).valid,true);
  const shifted={...zeroFilled,probePartial0Col4:'',probePartial0Col3:'0'};
  assert.equal(WORKSPACE.validateVerticalOperation(operation,shifted).category,'ALINEACIÓN');
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
  assert.deepEqual(Array.from(CONFIG.visibleSteps(config,{},'practice')),['A']);
  assert.deepEqual(Array.from(CONFIG.visibleSteps(config,{degrees:'89'},'practice')),['A','B']);
  assert.deepEqual(Array.from(CONFIG.visibleSteps(config,{degrees:'89',decimalPart:'0.125'},'practice')),['A','B','C']);
  const operationValues=Object.fromEntries(config.operationsByStep.C.fields.map(field=>[field.id,String(field.expected)]));
  assert.deepEqual(Array.from(CONFIG.visibleSteps(config,{degrees:'89',decimalPart:'0.125',...operationValues},'practice')),['A','B','C','D']);
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
  assert.match(html,/!isExam&&q\.type!=='math-workspace'/);
  assert.match(html,/q\.type==='math-workspace'\?\[\]:/);
});
