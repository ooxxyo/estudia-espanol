(() => {
  'use strict';
  // Material proporcionado para Competencia en Español (14-09-2026).
  const entries = [
    ['acicate','s. m.','Estímulo que mueve o incita a hacer algo. Motivación.','incentivo, aliciente','freno, obstáculo','Los recuerdos de su niñez le servían de acicate para seguir adelante.'],
    ['rozagante','adj.','Vistoso, lozano o presumido.','lozano, florecido, presuntuoso','humilde, modesto','Caminaba de lo más rozagante por el parque.'],
    ['hilvanar','v.','Unir, enlazar o coordinar pensamientos, ideas, frases, palabras o cosas.','componer, improvisar, proyectar, esbozar','','Esa escritora tiene la habilidad de hilvanar historias.'],
    ['ascendencia','s. f.','Antepasados o personas de las que desciende alguien.','antepasados, linaje, estirpe, ancestros','descendencia, prole','No existe información sobre mi ascendencia en el registro demográfico.'],
    ['beldad','s. f.','Mujer de extraordinaria belleza.','bella, hermosa, linda','adefesio','El cantante está casado con una beldad brasileña.'],
    ['inocuo','adj.','Que no hace daño.','inofensivo, no dañino','nocivo, perjudicial, dañino','Sus bromas son inocuas; no le hacen daño a nadie.'],
    ['tergiversar','v.','Dar una interpretación errónea, falsa o forzada a palabras o hechos.','falsear, deformar','aclarar, clarificar','Para no tergiversar sus palabras, copia sus declaraciones palabra por palabra.'],
    ['embargar','v.','1. Producir o causar un sentimiento intenso. 2. Retener o incautar una propiedad por orden judicial.','confiscar, incautar (sentido judicial)','','Nos embargó una gran pena; un tribunal puede embargar una propiedad.'],
    ['lisonja','s. f.','Elogio o halago utilizado para ganarse la simpatía o buena voluntad de alguien.','halago, adulación, elogio','crítica','Déjate de lisonjas; tus exageraciones no van a convencerme.'],
    ['viable','adj.','Que tiene posibilidades de realizarse.','factible, realizable, posible','irrealizable','Su propuesta nos parece económicamente viable.'],
    ['yacer','v.','Estar tendido o acostado, vivo o muerto.','reposar, estar tendido, permanecer acostado','','El enfermo yació en su lecho por dos semanas.'],
    ['mero','adj. / s. m.','1. Pez de agua salada cuya carne es comestible. 2. Simple, solamente o sin importancia.','','','Fue un mero formalismo; el mero es un pez de agua salada.'],
    ['exequias','s. f.','Ceremonias realizadas en honor de una persona fallecida.','funeral, sepelio, honras fúnebres','','Las exequias del cantante duraron diez días.'],
    ['urdir','v.','Planear o tramar algo, especialmente contra alguien.','conspirar, maquinar, tramar, concebir','','Los rebeldes se reunieron para urdir el contraataque.'],
    ['descendencia','s. f.','Hijos, nietos, bisnietos y demás sucesores de una persona.','descendientes, prole','ascendencia','La descendencia de Gengis Kan está esparcida por toda la región.'],
    ['rebosar','v.','1. Desbordarse un líquido sobre los bordes de un recipiente. 2. Estar un lugar completamente lleno de personas. 3. Experimentar un sentimiento intensamente.','','','La jarra rebosaba de cerveza; la funeraria rebosaba de gente; rebosamos de felicidad.'],
    ['celestina','s. f.','Mujer que facilita, arregla o encubre relaciones amorosas.','alcahueta','','A Mariela le gusta hacer de celestina.'],
    ['sudario','s. m.','Lienzo o tela utilizada para cubrir a un cadáver.','mortaja','','Los familiares descorrieron el sudario del rostro de la difunta.'],
    ['inusitado','adj.','Raro, poco usual o fuera de lo común.','insólito, desacostumbrado, extraordinario','común, habitual, acostumbrado','La bolsa experimentó un inusitado crecimiento.'],
    ['séquito','s. m.','Grupo de personas que acompaña o sigue a alguien.','comitiva, escolta','','El rapero estaba divirtiéndose con su numeroso séquito.'],
  ].map(([word,grammar,definition,synonyms,antonyms,example]) => ({id:`vocab-${word}`,word,grammar,definition,synonyms:synonyms? synonyms.split(', '):[],antonyms:antonyms?antonyms.split(', '):[],example}));
  const reading = 'La funeraria rebosaba de gente durante las exequias. Celia, una celestina que había unido a parejas viables, recordó a una rozagante beldad que yacía bajo el sudario, también llamado mortaja. No quiso tergiversar sus palabras: intentó hilvanar las declaraciones de quienes la conocieron. Antes, Celia había ayudado a urdir una cita con sus inocuas mañas; ahora las lisonjas y los engaños no podían embargar su tristeza. «No es algo inusitado», dijo, pensando en la descendencia figurada de afectos que aquella mujer dejaba entre sus amistades.';
  const questions = [];
  const add = (kind,word,prompt,answer,options,dif='medio',extra={}) => {
    const id=`vocab-${kind}-${questions.filter(q=>q.kind===kind).length+1}`;
    questions.push({id,subjectId:'espanol',topic:'vocabulario',kind,word,type:options?'mc':'fill',dif,prompt,options,correct:options?options.indexOf(answer):undefined,answer:options?undefined:answer,strictAccents:false,hints:[`Piensa en el significado de «${word}».`,`Consulta la tarjeta de ${word}.`],exp:extra.explanation||`En este contexto corresponde «${answer}».`,...extra});
  };
  const fill = [
    ['descendencia','Debido al gran número de hijos que tuvo, la ______ del emperador mongol Gengis Kan está esparcida por toda la región.','descendencia'],
    ['inocuo','Sus bromas son ______; no le hacen daño a nadie.','inocuas'],
    ['tergiversar','Para no ______ sus palabras, copia sus declaraciones palabra por palabra.','tergiversar'],
    ['lisonja','Déjate de ______; tus exageraciones no van a convencerme.','lisonjas'],
    ['viable','Su propuesta nos parece económicamente ______, así que pensamos implementarla.','viable'],
    ['séquito','El rapero estaba divirtiéndose con su numeroso ______.','séquito'],
    ['yacer','El enfermo ______ en su lecho por dos semanas.','yació'],
    ['beldad','El cantante está casado con una ______ brasileña.','beldad'],
    ['ascendencia','No existe información sobre mi ______ en el registro demográfico.','ascendencia'],
    ['rebosar','La jarra ______ de cerveza.','rebosaba'],
    ['embargar','Desde que nos enteramos de su muerte nos ______ una gran pena.','embargó'],
    ['mero','La entrevista fue un ______ formalismo.','mero'],
    ['exequias','Las ______ del cantante duraron diez días.','exequias'],
    ['sudario','Los familiares descorrieron el ______ del rostro de la difunta.','sudario'],
    ['urdir','Los rebeldes se reunieron para ______ el contraataque.','urdir'],
    ['rozagante','Caminaba de lo más ______ por el parque.','rozagante'],
    ['acicate','Los recuerdos de su niñez le servían de ______ para seguir adelante.','acicate'],
    ['inusitado','La bolsa experimentó un ______ crecimiento.','inusitado'],
    ['hilvanar','Esa escritora tiene la habilidad de ______ historias.','hilvanar'],
    ['celestina','A Mariela le gusta hacer de ______.','celestina'],
    ['rebosar','La funeraria ______ de gente durante las exequias.','rebosaba'],
    ['rebosar','Al conocer la noticia, ______ de felicidad.','rebosamos'],
    ['embargar','El juez ordenó ______ la propiedad.','embargar'],
    ['mero','En el mercado compraron un ______ para la cena.','mero'],
    ['ascendencia','Sus abuelos forman parte de su ______.','ascendencia'],
  ];
  fill.forEach(([word,prompt,answer])=>add('completar',word,prompt,answer,null,'medio'));
  const choose = [
    ['urdir','Los conspiradores (urdieron / tergiversaron) el golpe de Estado.','urdieron','tergiversaron'],
    ['inocuo','El gas era (inusitado / inocuo) para plantas y animales.','inocuo','inusitado'],
    ['acicate','La derrota nos sirvió de (lisonja / acicate) para practicar más.','acicate','lisonja'],
    ['rebosar','Todos (embargamos / rebosamos) de felicidad.','rebosamos','embargamos'],
    ['descendencia','Celebró sus cien años junto con su (ascendencia / descendencia).','descendencia','ascendencia'],
    ['mero','Fue un (mero / rozagante) tropiezo.','mero','rozagante'],
    ['beldad','Las paredes estaban cubiertas de fotografías de (celestinas / beldades).','beldades','celestinas'],
    ['séquito','El (séquito / sudario) del empresario desapareció.','séquito','sudario'],
    ['yacer','Deben (hilvanar / yacer) inmóviles.','yacer','hilvanar'],
    ['viable','Necesitamos una resolución (mera / viable).','viable','mera'],
    ['exequias','Sus (lisonjas / exequias) fueron breves.','exequias','lisonjas'],
    ['rebosar','El auditorio (embargará / rebosará) de familiares.','rebosará','embargará'],
    ['hilvanar','Para ordenar el relato, debemos (hilvanar / urdir) las ideas.','hilvanar','urdir'],
    ['ascendencia','El árbol genealógico registra nuestra (ascendencia / descendencia) anterior.','ascendencia','descendencia'],
    ['tergiversar','Citar solo una frase podría (tergiversar / hilvanar) el argumento.','tergiversar','hilvanar'],
    ['sudario','Cubrieron el cuerpo con un (sudario / séquito).','sudario','séquito'],
    ['inocuo','Un juego sin daño es (inocuo / inusitado).','inocuo','inusitado'],
    ['celestina','Quien arregla citas ajenas hace de (celestina / beldad).','celestina','beldad'],
    ['lisonja','Un halago interesado es una (lisonja / exequia).','lisonja','exequia'],
    ['rozagante','Entró vistoso y lozano, muy (rozagante / viable).','rozagante','viable'],
  ];
  choose.forEach(([word,prompt,answer,other],i)=>add('escoge',word,prompt,answer,i%2?[answer,other]:[other,answer],'medio'));
  const clues = [
    ['beldad','Fémina de extraordinaria belleza'],['viable','Que tiene posibilidades de realizarse'],['yacer','Estar tendido, muerto o vivo'],['embargar','Incautar una posesión por orden judicial'],
    ['rebosar','Desbordarse un líquido sobre los bordes'],['celestina','Mujer que se dedica a alcahuetear'],['exequias','Ceremonias en honor de un difunto'],['mero','Pez cuya carne es comestible'],
    ['lisonja','Elogio para ganarse la simpatía'],['inocuo','Que es incapaz de hacer daño'],['descendencia','Hijos, nietos, bisnietos y demás sucesores'],['hilvanar','Coordinar ideas, frases o palabras'],
    ['acicate','Aliciente o motivación'],['inusitado','Antónimo de común o habitual'],
  ];
  clues.forEach(([word,prompt])=>add('pista',word,`${prompt}. Escribe la palabra.`,word,null,'facil'));
  const alternatives = ['acicate','rozagante','hilvanar','ascendencia','beldad','inocuo','tergiversar','embargar','lisonja','viable','yacer','mero','exequias','urdir','descendencia','rebosar','celestina','sudario','inusitado','séquito'];
  entries.forEach((entry,i)=>{
    const distractors=[alternatives[(i+7)%20],alternatives[(i+13)%20],alternatives[(i+17)%20]];
    const options=[...distractors]; options.splice(i%4,0,entry.word);
    add('definicion',entry.word,`¿A qué palabra corresponde esta definición? ${entry.definition}`,entry.word,options,'facil');
  });
  const synonymItems = [
    ['acicate','aliciente'],['rozagante','lozano'],['hilvanar','coordinar'],['ascendencia','linaje'],['beldad','hermosa'],['inocuo','inofensivo'],['tergiversar','falsear'],['embargar','incautar'],['lisonja','adulación'],['viable','factible'],['yacer','reposar'],['exequias','sepelio'],['urdir','tramar'],['descendencia','prole'],['celestina','alcahueta'],['sudario','mortaja'],['inusitado','insólito'],['séquito','comitiva'],['acicate','incentivo'],['tergiversar','deformar']
  ];
  synonymItems.forEach(([word,synonym],i)=>{
    const choices=[synonym,synonymItems[(i+5)%20][1],synonymItems[(i+11)%20][1],synonymItems[(i+15)%20][1]];
    const answer=i%2?synonym:word;
    add('sinonimo',word,i%2?`¿Qué término equivale a «${word}»?`:`«${synonym}» se relaciona con:`,answer,i%2?choices:[word,alternatives[(i+7)%20],alternatives[(i+11)%20],alternatives[(i+15)%20]],'facil');
  });
  const opposite = [['acicate','freno'],['rozagante','modesto'],['ascendencia','descendencia'],['beldad','adefesio'],['inocuo','nocivo'],['tergiversar','aclarar'],['lisonja','crítica'],['viable','irrealizable'],['descendencia','ascendencia'],['inusitado','habitual']];
  opposite.forEach(([word,antonym],i)=>add('antonimo',word,`¿Cuál es el antónimo de «${word}»?`,antonym,[opposite[(i+3)%10][1],antonym,opposite[(i+6)%10][1],opposite[(i+8)%10][1]],'medio'));
  const families = [
    ['descendencia','Los hijos, nietos y demás sucesores son sus ______.','descendientes'],['viable','Debemos examinar la ______ de sus propuestas.','viabilidad'],
    ['yacer','Los arqueólogos encontraron objetos en el ______ taíno.','yacimiento'],['celestina','Muchas parejas fueron felices gracias al ______.','celestinaje'],
    ['lisonja','Raúl se la pasa ______ a su jefa con falsos cumplidos.','lisonjeando'],['tergiversar','Una interpretación forzada puede ser una ______.','tergiversación'],
    ['embargar','La retención judicial de bienes es un ______.','embargo'],['urdir','Una trama también puede llamarse ______.','urdimbre'],
    ['lisonja','Halagar interesadamente es ______.','lisonjear'],['descendencia','Los ______ son los sucesores de una persona.','descendientes'],
  ];
  families.forEach(([word,prompt,answer])=>add('familia',word,prompt,answer,null,'medio'));
  const comprehension = [
    ['rebosar','En la lectura, «rebosaba» se refiere a:', 'una gran cantidad de personas',['un líquido derramado','una gran cantidad de personas','un sentimiento intenso','un funeral cancelado']],
    ['inusitado','«No es algo inusitado» puede sustituirse por:','es algo común',['es algo común','es algo dañino','es algo triste','es algo judicial']],
    ['exequias','«Exequias» NO puede sustituirse por:','levantamiento del cadáver',['sepelio','honras fúnebres','levantamiento del cadáver','funeral']],
    ['embargar','En ese contexto, «embargar» tiene que ver con:','sentimientos intensos',['retención judicial','sentimientos intensos','una cita','una declaración']],
    ['celestina','El oficio de una celestina consiste en:','emparejar personas',['escribir discursos','emparejar personas','cubrir cadáveres','organizar funerales']],
    ['beldad','«Una rozagante beldad» alude a:','una mujer bella y vistosa',['una persona que engaña','una mujer bella y vistosa','una ceremonia breve','una familia extensa']],
    ['hilvanar','«Hilvanar» las declaraciones significa:','componer o coordinar',['falsear los hechos','incautar los bienes','componer o coordinar','halagar a alguien']],
    ['urdir','«Urdir» una cita equivale a:','planear o tramar',['planear o tramar','incautar o retener','desbordarse','reposar']],
    ['inocuo','«Inocuas mañas» significa:','inofensivas astucias',['astucias dañinas','inofensivas astucias','elogios interesados','ceremonias breves']],
    ['yacer','NO es sinónimo de «yacía»:','estaba atendida',['estaba tendida','estaba acostada','estaba atendida','reposaba']],
    ['lisonja','Antónimo de «lisonja»:','crítica',['halago','elogio','adulación','crítica']],
    ['sudario','Sinónimo de «sudario»:','mortaja',['linaje','mortaja','comitiva','prole']],
  ];
  comprehension.forEach(([word,prompt,answer,options])=>add('lectura',word,`${reading}\n\n${prompt}`,answer,options,'dificil'));
  const context = [
    ['embargar','En «el banco embargó la casa», embargar significa:','incautar por orden judicial',['causar tristeza','incautar por orden judicial','elogiar','reposar']],
    ['embargar','En «nos embargó la alegría», embargar significa:','causar un sentimiento intenso',['retener un bien','causar un sentimiento intenso','crear una familia','dar un discurso']],
    ['mero','En «pescamos un mero», la palabra nombra:','un pez',['un formalismo','un pez','una tela','un halago']],
    ['mero','En «es un mero trámite», mero significa:','simple',['vistoso','simple','nocivo','extraordinario']],
    ['rebosar','En «la jarra rebosó», lo que se desbordó fue:','un líquido',['un líquido','una multitud','una emoción','una familia']],
    ['rebosar','En «el teatro rebosaba», el lugar estaba:','lleno de personas',['lleno de personas','vacío','cubierto por un sudario','bajo orden judicial']],
    ['rebosar','En «rebosaban de orgullo», se expresa:','un sentimiento intenso',['un sentimiento intenso','una sustancia derramada','una multitud','un trámite']],
    ['ascendencia','Para hablar de bisabuelos corresponde:','ascendencia',['ascendencia','descendencia','séquito','prole']],
    ['descendencia','Para hablar de bisnietos corresponde:','descendencia',['ascendencia','linaje','descendencia','séquito']],
    ['acicate','La motivación para perseverar es un:','acicate',['acicate','lisonja','sudario','exequia']],
  ];
  context.forEach(([word,prompt,answer,options])=>add('contexto',word,prompt,answer,options,'dificil'));
  const grammar = [
    ['acicate','¿Qué significa «s. m.»?','sustantivo masculino',['sustantivo masculino','sustantivo femenino','verbo','adjetivo']],
    ['lisonja','¿Qué significa «s. f.»?','sustantivo femenino',['sustantivo masculino','verbo','adjetivo','sustantivo femenino']],
    ['urdir','¿Qué significa «v.»?','verbo',['verbo','sustantivo masculino','adjetivo','sustantivo femenino']],
    ['viable','¿Qué significa «adj.»?','adjetivo',['verbo','adjetivo','sustantivo masculino','sustantivo femenino']],
    ['inusitado','¿Qué clase de palabra es «inusitado»?','adjetivo',['sustantivo masculino','adjetivo','verbo','sustantivo femenino']],
    ['lisonja','¿Qué clase de palabra es «lisonja»?','sustantivo femenino',['adjetivo','verbo','sustantivo femenino','sustantivo masculino']],
    ['sudario','¿Qué clase de palabra es «sudario»?','sustantivo masculino',['verbo','adjetivo','sustantivo masculino','sustantivo femenino']],
    ['hilvanar','¿Qué clase de palabra es «hilvanar»?','verbo',['sustantivo masculino','sustantivo femenino','adjetivo','verbo']],
    ['inocuo','Completa: unas bromas ______ no hacen daño.','inocuas',null],
    ['yacer','Completa: ayer ______ en su lecho.','yacía',null],
  ];
  grammar.forEach(([word,prompt,answer,options])=>add('gramatica',word,prompt,answer,options,'facil'));
  let multipleChoiceIndex=0;
  for(const question of questions.filter(item=>item.type==='mc')){
    const answer=question.options[question.correct],target=multipleChoiceIndex++%question.options.length;
    question.options.splice(question.correct,1);question.options.splice(target,0,answer);question.correct=target;
  }
  const normalizeAnswer=(value,strict=false)=>{const text=String(value??'').normalize('NFC').trim().toLocaleLowerCase('es');return strict?text:text.normalize('NFD').replace(/[\u0300-\u036f]/g,'');};
  function validate(){
    const errors=[], ids=new Set(), counts={};
    if(entries.length!==20)errors.push('El vocabulario debe contener 20 entradas.');
    for(const question of questions){
      if(ids.has(question.id))errors.push(`ID duplicado: ${question.id}`);ids.add(question.id);
      if(!entries.some(entry=>entry.word===question.word))errors.push(`Palabra desconocida: ${question.id}`);
      if(question.type==='mc' && (!Array.isArray(question.options)||question.correct<0||question.correct>=question.options.length||new Set(question.options).size!==question.options.length))errors.push(`Opciones inválidas: ${question.id}`);
      counts[question.kind]=(counts[question.kind]||0)+1;
    }
    if(questions.length<120)errors.push('El banco debe tener al menos 120 preguntas.');
    return {valid:!errors.length,errors,counts,total:questions.length};
  }
  const modes=Object.freeze([
    ['study','Estudiar vocabulario'],['general','Práctica general'],['completar','¿Cuál va?'],['escoge','Escoge la correcta'],['pista','Juega con las palabras'],['sinonimo','Sinónimos'],['antonimo','Antónimos'],['familia','Familia semántica'],['contexto','Contexto'],['lectura','Lectura'],['difficult','Palabras difíciles'],['errors','Mis errores'],['adaptive','Adaptativo'],['mini','Mini examen'],['full','Examen completo'],
  ].map(([id,label])=>({id,label})));
  window.SpanishVocabulary=Object.freeze({entries,reading,questions,modes,validate,normalizeAnswer,unit:{id:'espanol-competencia-vocabulario',subjectId:'espanol',name:'Competencia en Español — Vocabulario',type:'Vocabulario',status:'current',createdAt:'2026-09-18',order:2,topicIds:['vocabulario']}});
})();
