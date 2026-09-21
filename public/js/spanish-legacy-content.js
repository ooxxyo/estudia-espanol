(()=>{
'use strict';
/* =========================================================
   DATOS: preguntas
   tipo: 'mc' | 'tf' | 'seg' | 'fill' | 'eviden'
========================================================= */
let _id = 0;
const nid = () => 'q' + (++_id);

const Q = [];

/* ---------- SECCIÓN 1: GRAMÁTICA ---------- */
Q.push(
{id:nid(), topic:'gramatica', type:'mc', dif:'facil',
 prompt:'¿Cuál disciplina estudia la estructura de una lengua en general: la forma de las palabras, cómo se organizan y cómo se relacionan?',
 options:['Morfología','Sintaxis','Gramática','Crónica'], correct:2,
 hints:['Es el término más amplio de los tres.','Incluye tanto la morfología como la sintaxis.','La palabra que buscas nombra a toda la disciplina, no a una de sus partes.'],
 exp:'La gramática es la disciplina general que estudia la estructura de la lengua; morfología y sintaxis son sus dos partes.'},
{id:nid(), topic:'gramatica', type:'mc', dif:'facil',
 prompt:'"Estudia la estructura interna de las palabras, su formación y sus variaciones." Esta definición corresponde a:',
 options:['Sintaxis','Morfología','Gramática','Narrador'], correct:1,
 hints:['Piensa en la palabra "interna": se enfoca dentro de la palabra.','No es sobre cómo se combinan varias palabras.','Es la parte de la gramática que estudia lexemas y morfemas.'],
 exp:'La morfología mira hacia adentro de la palabra: su formación y variaciones.'},
{id:nid(), topic:'gramatica', type:'mc', dif:'facil',
 prompt:'"Estudia cómo las palabras se combinan y organizan para formar frases y oraciones." Esta definición corresponde a:',
 options:['Morfología','Sintaxis','Crónica','Narrador testigo'], correct:1,
 hints:['Aquí el enfoque está en varias palabras juntas, no en una sola.','Piensa en el orden de las palabras dentro de una oración.','Es la otra mitad de la gramática, junto con la morfología.'],
 exp:'La sintaxis estudia la combinación de palabras para formar frases y oraciones.'},
{id:nid(), topic:'gramatica', type:'tf', dif:'facil',
 prompt:'La morfología y la sintaxis son ambas partes de la gramática.',
 correct:true,
 hints:['La gramática es el término general.','Ambas estudian distintos aspectos de la lengua, pero pertenecen a la misma disciplina.'],
 exp:'Correcto: la gramática incluye la relación entre morfología y sintaxis.'},
{id:nid(), topic:'gramatica', type:'mc', dif:'medio',
 prompt:'Si un ejercicio te pide dividir la palabra "calentadores" en sus partes internas (lexema, sufijo, morfema flexivo), ¿qué disciplina estás practicando?',
 options:['Sintaxis','Morfología','Crónica','Narrador'], correct:1,
 hints:['Estás trabajando con una sola palabra, no con una oración completa.','El análisis interno de una palabra es morfológico.'],
 exp:'Dividir una palabra en lexema y morfemas es un ejercicio de morfología.'},
{id:nid(), topic:'gramatica', type:'mc', dif:'medio',
 prompt:'Si un ejercicio te pide identificar el sujeto y el predicado de una oración, ¿qué disciplina estás practicando?',
 options:['Morfología','Sintaxis','Gramática (en general, sin especificar)','Ninguna de las anteriores'], correct:1,
 hints:['Sujeto y predicado son partes de la oración, no de una sola palabra.','Esto trata sobre cómo se organizan varias palabras juntas.'],
 exp:'Identificar sujeto y predicado es un análisis sintáctico: organización de palabras en la oración.'},
{id:nid(), topic:'gramatica', type:'tf', dif:'medio',
 prompt:'La sintaxis se enfoca en la formación interna de una sola palabra.',
 correct:false,
 hints:['Eso describe mejor a otra disciplina.','La sintaxis trabaja con combinaciones de palabras, no con una palabra aislada.'],
 exp:'Falso: eso describe a la morfología. La sintaxis trabaja con la combinación de palabras.'},
{id:nid(), topic:'gramatica', type:'mc', dif:'dificil',
 prompt:'¿Cuál de las siguientes afirmaciones describe mejor la relación entre gramática, morfología y sintaxis?',
 options:[
   'Son tres disciplinas completamente independientes sin relación entre sí.',
   'La gramática es la disciplina general; la morfología estudia la palabra y la sintaxis estudia la oración.',
   'La sintaxis es una parte de la morfología.',
   'La morfología estudia oraciones completas y la sintaxis estudia palabras sueltas.'],
 correct:1,
 hints:['Piensa en cuál es el término "paraguas" que engloba a los otros dos.','Una mira hacia adentro de la palabra; la otra mira hacia afuera, hacia la oración.'],
 exp:'La gramática engloba ambas: la morfología analiza la palabra por dentro y la sintaxis analiza cómo se combinan las palabras.'}
);

/* ---------- SECCIÓN 2/3: MORFOLOGÍA - conceptos ---------- */
Q.push(
{id:nid(), topic:'morfologia', type:'mc', dif:'facil',
 prompt:'¿Cómo se llama la parte fundamental de una palabra, la que contiene el significado principal?',
 options:['Morfema flexivo','Lexema o raíz','Interfijo','Sufijo'], correct:1,
 hints:['A partir de esta parte se forman palabras relacionadas como pan, panadero, panadería.','Es la base sobre la que se añaden los demás elementos.'],
 exp:'El lexema (o raíz) es la parte fundamental de la palabra y contiene el significado principal.'},
{id:nid(), topic:'morfologia', type:'mc', dif:'facil',
 prompt:'¿Cuál es el lexema compartido por "pan", "panadero", "panadería" y "panecillo"?',
 options:['pan','ero','ería','ecillo'], correct:0,
 hints:['Busca la parte que se repite igual en las cuatro palabras.'],
 exp:'"pan-" es el lexema; el resto son morfemas añadidos.'},
{id:nid(), topic:'morfologia', type:'mc', dif:'facil',
 prompt:'Un morfema que expresa información gramatical como género, número, persona, tiempo o modo, sin crear una palabra nueva, se llama:',
 options:['Morfema derivativo','Morfema flexivo','Interfijo','Lexema'], correct:1,
 hints:['Piensa en el ejemplo "niñas": la -a y la -s no crean una palabra distinta, solo dan información.'],
 exp:'El morfema flexivo aporta género, número, persona, tiempo o modo, sin crear una palabra completamente nueva.'},
{id:nid(), topic:'morfologia', type:'mc', dif:'facil',
 prompt:'En la palabra "niñas", ¿qué representa la "-s" final?',
 options:['Morfema flexivo de género','Morfema flexivo de número plural','Morfema derivativo prefijo','Interfijo'], correct:1,
 hints:['La -a ya marca el género femenino.','La -s marca cuántos son.'],
 exp:'La "-s" es el morfema flexivo de número plural; la "-a" es el morfema flexivo de género femenino.'},
{id:nid(), topic:'morfologia', type:'mc', dif:'medio',
 prompt:'Un morfema que sirve para formar una palabra nueva o modificar el significado del lexema (y puede ser prefijo o sufijo) se llama:',
 options:['Morfema flexivo','Morfema derivativo','Interfijo','Lexema'], correct:1,
 hints:['A diferencia del flexivo, este sí puede crear una palabra distinta o cambiar su significado.'],
 exp:'El morfema derivativo forma palabras nuevas o modifica el significado del lexema; incluye prefijos y sufijos.'},
{id:nid(), topic:'morfologia', type:'mc', dif:'medio',
 prompt:'¿Dónde aparece un prefijo respecto al lexema?',
 options:['Después','Antes','En medio, entre el lexema y el sufijo','No tiene posición fija'], correct:1,
 hints:['MDP = Morfema Derivativo Prefijo. "Pre-" significa "antes".'],
 exp:'El prefijo aparece antes del lexema (por ejemplo, "i-" en "ilegal").'},
{id:nid(), topic:'morfologia', type:'mc', dif:'medio',
 prompt:'¿Dónde aparece un interfijo?',
 options:['Antes del lexema','Después del sufijo','Entre el lexema y el sufijo','Al final absoluto de la palabra'], correct:2,
 hints:['Funciona como una partícula de enlace.','Ejemplo clave: "panecillo" → pan + ec + illo.'],
 exp:'El interfijo aparece entre el lexema y el sufijo, funcionando como enlace (ej. la "-ec-" en "panecillo").'},
{id:nid(), topic:'morfologia', type:'tf', dif:'medio',
 prompt:'El interfijo normalmente tiene un significado propio muy importante.',
 correct:false,
 hints:['El documento dice que "normalmente no tiene significado propio importante".'],
 exp:'Falso: el interfijo funciona como partícula de enlace y normalmente no aporta un significado propio importante.'},
{id:nid(), topic:'morfologia', type:'mc', dif:'medio',
 prompt:'Una palabra derivada se forma:',
 options:['Combinando dos lexemas completos','Añadiendo uno o más morfemas derivativos a un lexema','Quitando morfemas de un lexema','Repitiendo el mismo lexema dos veces'], correct:1,
 hints:['Ejemplo: casa → casita.'],
 exp:'Una palabra derivada se forma añadiendo uno o más morfemas derivativos a un lexema (casa → casita).'},
{id:nid(), topic:'morfologia', type:'mc', dif:'dificil',
 prompt:'La parasíntesis es un procedimiento de formación de palabras que se practica especialmente con esta estructura:',
 options:['lexema + lexema','sufijo + lexema + prefijo','prefijo + lexema + sufijo','interfijo + lexema'], correct:2,
 hints:['Intervienen simultáneamente distintos elementos, con el prefijo y el sufijo "abrazando" al lexema.'],
 exp:'La estructura típica de la parasíntesis es prefijo + lexema + sufijo, con ambos elementos actuando a la vez.'},
{id:nid(), topic:'morfologia', type:'mc', dif:'dificil',
 prompt:'¿Cuál es la diferencia clave entre morfema derivativo y morfema flexivo?',
 options:[
   'El derivativo cambia el significado o forma una palabra nueva; el flexivo solo aporta información gramatical.',
   'El flexivo siempre va antes del lexema; el derivativo siempre va después.',
   'No hay ninguna diferencia real, son sinónimos.',
   'El derivativo solo existe en verbos.'],
 correct:0,
 hints:['Piensa en "niñas": -a y -s no crean una palabra nueva. Piensa en "casita": -ita sí forma una palabra derivada.'],
 exp:'El morfema derivativo forma palabras nuevas o cambia el significado; el flexivo únicamente marca género, número, persona, tiempo o modo.'}
);

/* ---------- SECCIÓN 3: ANÁLISIS MORFOLÓGICO (segmentación) ---------- */
// roles: MDP, LEX, MDI, MDS, MF. INF se acepta solo como alias de sesiones antiguas.
function segQ(word, parts, dif, note){
  return {id:nid(), topic:'morfologia', type:'seg', dif,
    prompt:`Divide la palabra "${word}" y asigna la función correcta a cada parte.`,
    word, parts,
    hints:[
      'Busca primero el lexema: la parte con el significado principal.',
      'Revisa si hay algo antes del lexema (prefijo) o después (sufijo/flexivo).',
      note || 'Recuerda: MDP = prefijo, LEX = lexema, MDI = interfijo, MDS = sufijo, MF = morfema flexivo.'
    ],
    exp: explainSeg(word, parts)
  };
}
function explainSeg(word, parts){
  return parts.map(p=>`${p.text.toUpperCase()} (${roleName(p.role)})`).join(' + ');
}
function normalizeMorphRole(role){return role==='INF'?'MDI':role;}
function roleName(r){
  return {MDP:'prefijo', LEX:'lexema', MDI:'interfijo', INF:'interfijo', MDS:'sufijo', MF:'morfema flexivo'}[r];
}

Q.push(
 segQ('panecillo', [{text:'pan',role:'LEX'},{text:'ec',role:'MDI'},{text:'illo',role:'MDS'}], 'medio',
   'Este es el ejemplo fundamental de interfijo: pan + ec + illo.'),
 segQ('calentadores', [{text:'calent',role:'LEX'},{text:'ador',role:'MDS'},{text:'es',role:'MF'}], 'medio'),
 segQ('destornillador', [{text:'des',role:'MDP'},{text:'tornill',role:'LEX'},{text:'ador',role:'MDS'}], 'medio'),
 segQ('casita', [{text:'cas',role:'LEX'},{text:'ita',role:'MDS'}], 'facil'),
 segQ('rojizo', [{text:'roj',role:'LEX'},{text:'izo',role:'MDS'}], 'facil'),
 segQ('bombardeo', [{text:'bombard',role:'LEX'},{text:'eo',role:'MDS'}], 'facil'),
 segQ('ilegal', [{text:'i',role:'MDP'},{text:'legal',role:'LEX'}], 'facil'),
 segQ('subterráneos', [{text:'sub',role:'MDP'},{text:'terráne',role:'LEX'},{text:'os',role:'MF'}], 'medio'),
 segQ('antiaéreos', [{text:'anti',role:'MDP'},{text:'aére',role:'LEX'},{text:'os',role:'MF'}], 'medio'),
 segQ('inhospitales', [{text:'in',role:'MDP'},{text:'hospital',role:'LEX'},{text:'es',role:'MF'}], 'dificil'),
 segQ('ilegalidad', [{text:'i',role:'MDP'},{text:'legal',role:'LEX'},{text:'idad',role:'MDS'}], 'dificil'),
 segQ('comparación', [{text:'compar',role:'LEX'},{text:'ación',role:'MDS'}], 'medio'),
 segQ('avispero', [{text:'avisp',role:'LEX'},{text:'ero',role:'MDS'}], 'facil'),
 segQ('descomponer', [{text:'des',role:'MDP'},{text:'componer',role:'LEX'}], 'medio'),
 segQ('pronombres', [{text:'pro',role:'MDP'},{text:'nombre',role:'LEX'},{text:'s',role:'MF'}], 'dificil'),
 // extra "same level" words to check real understanding
 segQ('panadería', [{text:'pan',role:'LEX'},{text:'ader',role:'MDS'},{text:'ía',role:'MDS'}], 'dificil',
   'En este nivel puedes agrupar "-adería" como un sufijo compuesto que forma el lugar donde se hace algo.'),
 segQ('florecillas', [{text:'flor',role:'LEX'},{text:'ec',role:'MDI'},{text:'ill',role:'MDS'},{text:'as',role:'MF'}], 'dificil',
   'Igual que en "panecillo": lexema + interfijo -ec- + sufijo + flexivo de plural.'),
 segQ('desilusionado', [{text:'des',role:'MDP'},{text:'ilusion',role:'LEX'},{text:'ado',role:'MDS'}], 'dificil')
);

// Palabra compuesta especial (cabizbajo) — no es un simple prefijo+lexema+sufijo
Q.push({id:nid(), topic:'morfologia', type:'mc', dif:'dificil',
 prompt:'"Cabizbajo" se forma a partir de "cabeza" + "bajo". ¿Cómo se describe mejor este tipo de formación?',
 options:['Es solo un morfema flexivo','Es una palabra compuesta a partir de dos lexemas, no un simple prefijo o sufijo','Es un interfijo','No tiene ninguna formación morfológica'], correct:1,
 hints:['Observa que "cabeza" y "bajo" son dos palabras completas con significado propio, no un prefijo ni un sufijo.'],
 exp:'"Cabizbajo" une dos lexemas (cabeza + bajo) en una palabra compuesta, un proceso distinto a simplemente añadir un prefijo o sufijo.'});

Q.push(
{id:nid(), topic:'morfologia', type:'mc', dif:'medio',
 prompt:'¿Qué representan las siglas MDP, LEX, MDI, MDS y MF en el análisis morfológico?',
 options:[
  'Morfema Derivativo Prefijo, Lexema, Morfema Derivativo Interfijo, Morfema Derivativo Sufijo, Morfema Flexivo',
  'Modo, Léxico, Interjección, Modo de Sufijo, Modo Final',
  'Morfema Doble, Léxico, Intención, Morfema del Sujeto, Modo Flexivo',
  'Ninguna de las anteriores'], correct:0,
 hints:['Cada sigla corresponde a un tipo de parte de la palabra que hemos estudiado.'],
 exp:'MDP=Morfema Derivativo Prefijo, LEX=Lexema, MDI=Morfema Derivativo Interfijo, MDS=Morfema Derivativo Sufijo, MF=Morfema Flexivo.'},
{id:nid(), topic:'morfologia', type:'mc', dif:'dificil',
 prompt:'Un compañero analizó "calentadores" así: "calentador (LEX) + es (MDS)". ¿Qué corrigirías?',
 options:[
   'Está completamente correcto',
   '"calentador" no es un lexema completo; debería ser calent (LEX) + ador (MDS) + es (MF), y "-es" es un morfema flexivo, no derivativo',
   'Falta un interfijo',
   '"-es" debería ser un prefijo'], correct:1,
 hints:['El lexema debe ser la raíz mínima con el significado base: "calent-".','La "-es" final solo marca plural: eso es información gramatical, no una palabra nueva.'],
 exp:'El análisis correcto es calent (LEX) + ador (MDS) + es (MF): "-es" marca plural, así que es un morfema flexivo, no derivativo.'}
);

/* ---------- SECCIÓN 4/5: NARRATIVA Y NARRADOR ---------- */
Q.push(
{id:nid(), topic:'narrativa', type:'mc', dif:'facil',
 prompt:'¿Qué caracteriza principalmente al género narrativo?',
 options:['Cuenta acontecimientos, reales o ficticios, con personajes que actúan','Expresa solamente sentimientos personales sin personajes','Da instrucciones paso a paso','Es siempre en verso'], correct:0,
 hints:['Piensa en historias: personajes, acciones, conflictos.'],
 exp:'El género narrativo cuenta acontecimientos (reales o ficticios) con personajes que actúan y participan en conflictos.'},
{id:nid(), topic:'narrativa', type:'mc', dif:'medio',
 prompt:'Un texto narrativo usa diálogo, metáfora y descripción detallada de un lugar. ¿Qué son estos elementos?',
 options:['Morfemas flexivos','Recursos retóricos y estilísticos del género narrativo','Errores de redacción','Características exclusivas de la crónica'], correct:1,
 hints:['El género narrativo puede utilizar diálogo, metáfora, símil, personificación, hipérbole y descripción.'],
 exp:'Son recursos retóricos y estilísticos que el género narrativo puede emplear.'},
{id:nid(), topic:'narrativa', type:'mc', dif:'facil',
 prompt:'"Entré al Teatro Cervantes cinco minutos antes de las ocho." Palabras como "entré" indican que el narrador habla en:',
 options:['Tercera persona','Primera persona','Segunda persona','No se puede saber'], correct:1,
 hints:['Busca la terminación del verbo: "-é" en "entré" indica "yo".'],
 exp:'"Entré" es una forma verbal de primera persona (yo), típica de expresiones como yo, nosotros, me, mi, vi, pensé, escuché.'},
{id:nid(), topic:'narrativa', type:'mc', dif:'medio',
 prompt:'Un narrador que cuenta una historia en la que él mismo es el personaje principal es un narrador:',
 options:['Testigo','Protagonista','Omnisciente en tercera persona','Ninguno de los anteriores'], correct:1,
 hints:['Piensa en quién vive los acontecimientos centrales de la historia.'],
 exp:'El narrador protagonista cuenta una historia en la que él mismo es el personaje principal, normalmente en primera persona.'},
{id:nid(), topic:'narrativa', type:'mc', dif:'medio',
 prompt:'Un narrador que cuenta acontecimientos que vio o presenció, pero que no es necesariamente el personaje principal, es un narrador:',
 options:['Protagonista','Testigo','Omnisciente','Antagonista'], correct:1,
 hints:['Puede aparecer en la historia, pero el foco no está en él.'],
 exp:'El narrador testigo cuenta lo que vio o presenció y puede aparecer en la historia sin ser el personaje principal.'},
{id:nid(), topic:'narrativa', type:'eviden', dif:'dificil',
 prompt:'Lee el fragmento y decide: ¿el narrador es protagonista o testigo? Selecciona la oración que mejor lo demuestra.',
 reading:['Vi a Marcela entrar corriendo a la estación.', 'Ella dejó caer su maleta y se sentó a llorar.', 'Me acerqué para preguntarle qué había pasado, aunque el tren que ella esperaba ya se iba.'],
 correctSentence:0, // index sentence that shows he only observed
 followup:{options:['Protagonista','Testigo'], correct:1},
 hints:['¿Quién vive los hechos centrales de la historia: el narrador o Marcela?','El narrador observa y luego se acerca, pero el conflicto principal le ocurre a otro personaje.'],
 exp:'El narrador es testigo: presencia los hechos ("Vi a Marcela...") pero el conflicto central le ocurre a Marcela, no a él.'},
{id:nid(), topic:'narrativa', type:'tf', dif:'medio',
 prompt:'Un narrador testigo siempre tiene que ser también el personaje principal de la historia.',
 correct:false,
 hints:['Recuerda la definición: "puede aparecer en la historia pero no necesariamente es el personaje principal".'],
 exp:'Falso: el narrador testigo puede aparecer en la historia sin ser el protagonista.'},
{id:nid(), topic:'narrativa', type:'mc', dif:'facil',
 prompt:'¿Cuál de estas expresiones NO es típica de la primera persona?',
 options:['nosotros','él pensó','yo escuché','mi casa'], correct:1,
 hints:['"Él" es un pronombre de tercera persona.'],
 exp:'"Él pensó" está en tercera persona; las demás opciones son marcas de primera persona.'},
{id:nid(), topic:'narrativa', type:'eviden', dif:'dificil',
 prompt:'Lee el fragmento y selecciona la oración que demuestra que el narrador es protagonista.',
 reading:['La lluvia caía sobre el pueblo desde el amanecer.', 'Yo caminaba sin rumbo, pensando en la carta que acababa de recibir.', 'Nadie más en la calle parecía notar el frío que sentía yo.'],
 correctSentence:1,
 followup:{options:['Protagonista','Testigo'], correct:0},
 hints:['Busca dónde el narrador habla de sus propias acciones y pensamientos, no de otro personaje.'],
 exp:'"Yo caminaba... pensando en la carta" muestra que el narrador vive y siente los hechos centrales: es protagonista.'},
{id:nid(), topic:'narrativa', type:'mc', dif:'medio',
 prompt:'¿Qué tienen en común el narrador protagonista y el narrador testigo?',
 options:['Ambos hablan siempre en tercera persona','Ambos pueden narrar en primera persona, ya que ambos "estuvieron ahí"','Ninguno puede aparecer en la historia','Solo existen en la crónica, no en la narrativa'], correct:1,
 hints:['Los dos tipos suelen usar expresiones como yo, vi, escuché — la diferencia está en su papel dentro de los hechos, no en la persona gramatical.'],
 exp:'Ambos pueden narrar en primera persona; la diferencia es si el narrador vive los hechos centrales (protagonista) o solo los observa (testigo).'}
);

/* ---------- SECCIÓN 6/7/8: CRÓNICA ---------- */
Q.push(
{id:nid(), topic:'cronica', type:'mc', dif:'facil',
 prompt:'¿Qué es una crónica?',
 options:[
   'Un poema sin estructura fija',
   'Un texto narrativo que relata acontecimientos siguiendo una secuencia temporal, combinando hechos reales con una forma narrativa de contarlos',
   'Un texto exclusivamente de opinión sin hechos comprobables',
   'Un diálogo teatral'], correct:1,
 hints:['Combina información real con una manera de contarla parecida a una narración.'],
 exp:'La crónica relata acontecimientos en secuencia temporal, combinando hechos reales con una forma narrativa.'},
{id:nid(), topic:'cronica', type:'mc', dif:'facil',
 prompt:'¿Qué puede hacer un cronista para reunir información?',
 options:['Solamente inventar los hechos','Presenciarlos, investigarlos, entrevistar personas, consultar información o reconstruir acontecimientos','Copiar exactamente una crónica anterior','Nada, la crónica no requiere investigación'], correct:1,
 hints:['El cronista puede obtener información de varias formas distintas, no solo de una.'],
 exp:'El cronista puede haber presenciado los hechos, investigarlos, entrevistar personas, consultar información o reconstruirlos.'},
{id:nid(), topic:'cronica', type:'mc', dif:'medio',
 prompt:'¿Cuáles son las características de la crónica, correctamente agrupadas?',
 options:[
   'Autor testigo, Exactitud, Veracidad (por separado), Afán descriptivo, Intención narrativa, Recursos retóricos, Recursos literarios (por separado)',
   'Autor testigo, Exactitud y veracidad, Afán descriptivo, Intención narrativa, Recursos retóricos y literarios',
   'Solo Exactitud y Opinión personal',
   'Autor testigo y nada más'], correct:1,
 hints:['"Exactitud y veracidad" va junta, como una sola característica.','"Recursos retóricos y literarios" también va junta, como una sola característica.'],
 exp:'Las cinco características son: Autor testigo, Exactitud y veracidad, Afán descriptivo, Intención narrativa, y Recursos retóricos y literarios.'},
{id:nid(), topic:'cronica', type:'tf', dif:'medio',
 prompt:'"Exactitud" y "veracidad" son dos características completamente separadas de la crónica.',
 correct:false,
 hints:['El material indica explícitamente que no deben separarse.'],
 exp:'Falso: "Exactitud y veracidad" se agrupan como UNA sola característica.'},
{id:nid(), topic:'cronica', type:'mc', dif:'medio',
 prompt:'La característica que se refiere a fechas, horas, lugares, nombres y circunstancias precisas es:',
 options:['Afán descriptivo','Exactitud y veracidad','Intención narrativa','Recursos retóricos y literarios'], correct:1,
 hints:['Piensa en datos concretos y comprobables.'],
 exp:'La exactitud y veracidad se refiere a que la información corresponda a hechos reales, con precisión (fechas, horas, lugares, nombres).'},
{id:nid(), topic:'cronica', type:'mc', dif:'medio',
 prompt:'La característica que describe lugares, personas, ambiente y acciones para que el lector pueda imaginar mejor lo ocurrido es:',
 options:['Afán descriptivo','Exactitud y veracidad','Autor testigo','Intención narrativa'], correct:0,
 hints:['La palabra clave es "describir".'],
 exp:'El afán descriptivo describe lugares, personas, ambiente y circunstancias para ayudar a imaginar lo ocurrido.'},
{id:nid(), topic:'cronica', type:'mc', dif:'medio',
 prompt:'La característica que hace que los datos NO se presenten como una simple lista, sino organizados como una historia con secuencia y desarrollo temporal, es:',
 options:['Intención narrativa','Autor testigo','Exactitud y veracidad','Recursos retóricos y literarios'], correct:0,
 hints:['Piensa en la diferencia entre una lista de datos y un relato organizado.'],
 exp:'La intención narrativa organiza los acontecimientos como una narración, no como una simple lista de datos.'},
{id:nid(), topic:'cronica', type:'mc', dif:'medio',
 prompt:'El uso de metáforas, símiles, personificación e imágenes en una crónica corresponde a la característica de:',
 options:['Recursos retóricos y literarios','Exactitud y veracidad','Autor testigo','Afán descriptivo únicamente'], correct:0,
 hints:['Son herramientas de lenguaje figurado.'],
 exp:'Los recursos retóricos y literarios son el uso de lenguaje figurado como metáforas, símiles, personificación, etc.'},
{id:nid(), topic:'cronica', type:'tf', dif:'dificil',
 prompt:'Si una crónica usa recursos retóricos y literarios, puede inventar libremente los hechos.',
 correct:false,
 hints:['El uso de estos recursos no anula la obligación de ser veraz.'],
 exp:'Falso: usar recursos retóricos NO significa que se puedan inventar los hechos; la crónica debe conservar exactitud y veracidad.'},
{id:nid(), topic:'cronica', type:'mc', dif:'facil',
 prompt:'La característica de "autor testigo" en la crónica significa que:',
 options:['El cronista nunca puede haber visto los hechos','El cronista puede haber presenciado directamente los acontecimientos','El cronista siempre inventa lo ocurrido','El cronista es un personaje de ficción'], correct:1,
 hints:['Relaciona esto con la idea de "estar presente" en los hechos.'],
 exp:'El autor testigo puede haber presenciado directamente los acontecimientos que narra.'}
);

// Tipos de crónica — definiciones y escenarios
const cronicaTypes = ['Crónica informativa','Crónica interpretativa','Crónica de opinión','Crónica policial','Crónica negra','Crónica de sucesos','Crónica política','Crónica deportiva','Crónica social','Crónica de viaje','Crónica literaria','Crónica histórica'];

Q.push(
{id:nid(), topic:'cronica', type:'mc', dif:'medio',
 prompt:'Un texto narra, en orden cronológico, los goles y jugadas más importantes de la final de un campeonato de fútbol. ¿Qué tipo de crónica es?',
 options:cronicaTypes.slice(0,4).concat(['Crónica deportiva']), correct:4,
 hints:['El tema central es un evento de un deporte.'],
 exp:'Es una crónica deportiva: narra en secuencia los hechos de un evento deportivo.'},
{id:nid(), topic:'cronica', type:'mc', dif:'medio',
 prompt:'Un texto relata, con detalle y en orden temporal, los días previos y posteriores a un crimen ocurrido en un barrio, incluyendo entrevistas a vecinos y a la policía. ¿Qué tipo de crónica es probablemente?',
 options:['Crónica de viaje','Crónica policial','Crónica deportiva','Crónica de opinión'], correct:1,
 hints:['El tema central involucra un delito y una investigación.'],
 exp:'Es una crónica policial: se centra en hechos delictivos, investigación y testimonios relacionados.'},
{id:nid(), topic:'cronica', type:'mc', dif:'dificil',
 prompt:'Un texto sobre un crimen se enfoca de manera especialmente cruda en la violencia, el ambiente sórdido y los detalles más oscuros del hecho. ¿Qué matiz de crónica es este, más específico que la simple crónica policial?',
 options:['Crónica negra','Crónica de viaje','Crónica social','Crónica literaria'], correct:0,
 hints:['Este subtipo se enfoca en un tono más oscuro y crudo dentro de los temas criminales.'],
 exp:'La crónica negra es un subtipo centrado en el lado más crudo y sombrío de los hechos delictivos.'},
{id:nid(), topic:'cronica', type:'mc', dif:'medio',
 prompt:'Un texto describe un accidente de tránsito ocurrido esa mañana: hora, lugar, personas involucradas y consecuencias inmediatas, sin profundizar en investigación policial. ¿Qué tipo de crónica es?',
 options:['Crónica de sucesos','Crónica política','Crónica deportiva','Crónica histórica'], correct:0,
 hints:['Piensa en hechos cotidianos e imprevistos, como accidentes o incidentes.'],
 exp:'Es una crónica de sucesos: relata hechos imprevistos de la vida cotidiana, como accidentes.'},
{id:nid(), topic:'cronica', type:'mc', dif:'medio',
 prompt:'Un texto narra el desarrollo de una sesión legislativa, las negociaciones entre partidos y las declaraciones de los diputados durante el día. ¿Qué tipo de crónica es?',
 options:['Crónica política','Crónica social','Crónica de viaje','Crónica literaria'], correct:0,
 hints:['El tema central son instituciones de gobierno y actores políticos.'],
 exp:'Es una crónica política: se centra en hechos relacionados con el poder, gobierno o instituciones políticas.'},
{id:nid(), topic:'cronica', type:'mc', dif:'medio',
 prompt:'Un texto describe con detalle sensorial un viaje en tren por los Andes, las paradas, la gente que el autor conoció y sus propias reflexiones durante el trayecto. ¿Qué tipo de crónica es?',
 options:['Crónica de viaje','Crónica policial','Crónica política','Crónica de sucesos'], correct:0,
 hints:['El eje central es un desplazamiento geográfico y la experiencia personal de recorrerlo.'],
 exp:'Es una crónica de viaje: relata una experiencia de desplazamiento con observaciones personales del entorno.'},
{id:nid(), topic:'cronica', type:'mc', dif:'dificil',
 prompt:'Un texto relata, décadas después, cómo ocurrió un terremoto que marcó a una ciudad, apoyándose en archivos, testimonios recogidos con el tiempo y documentos oficiales. ¿Qué tipo de crónica es principalmente?',
 options:['Crónica histórica','Crónica deportiva','Crónica de opinión','Crónica social'], correct:0,
 hints:['El hecho ocurrió hace mucho tiempo y se reconstruye con fuentes documentales.'],
 exp:'Es una crónica histórica: reconstruye hechos del pasado a partir de archivos y testimonios.'},
{id:nid(), topic:'cronica', type:'mc', dif:'dificil',
 prompt:'Un texto no solo informa sobre un hecho, sino que además explica sus causas, consecuencias y contexto, ayudando al lector a comprender el "por qué" detrás de lo ocurrido, sin llegar a dar una opinión personal explícita del autor. ¿Qué tipo de crónica es?',
 options:['Crónica interpretativa','Crónica de opinión','Crónica informativa','Crónica social'], correct:0,
 hints:['La diferencia con la crónica de opinión es que aquí no hay una postura personal explícita, sino análisis del contexto.','La diferencia con la informativa es que va más allá de solo contar el hecho: también lo explica.'],
 exp:'Es una crónica interpretativa: explica causas y contexto sin llegar a la opinión personal directa, a diferencia de la crónica de opinión.'},
{id:nid(), topic:'cronica', type:'mc', dif:'dificil',
 prompt:'Un texto relata un evento social —una boda, una fiesta de gala, una reunión de la alta sociedad— describiendo a los asistentes, el ambiente y las costumbres. ¿Qué tipo de crónica es?',
 options:['Crónica social','Crónica de sucesos','Crónica policial','Crónica interpretativa'], correct:0,
 hints:['El foco está en la vida social y las costumbres de un grupo.'],
 exp:'Es una crónica social: se centra en eventos y costumbres de la vida social.'},
{id:nid(), topic:'cronica', type:'mc', dif:'dificil',
 prompt:'Un texto narra un hecho real, pero con un lenguaje muy cuidado, recursos estilísticos elaborados y una estructura que se acerca al cuento, publicado en una revista cultural. ¿Qué tipo de crónica es, sobre todo por su cuidado estilístico?',
 options:['Crónica literaria','Crónica deportiva','Crónica de sucesos','Crónica política'], correct:0,
 hints:['El énfasis está en la elaboración estética del lenguaje, casi como una obra literaria.'],
 exp:'Es una crónica literaria: prioriza un lenguaje elaborado y recursos estilísticos, acercándose a la literatura.'},
{id:nid(), topic:'cronica', type:'mc', dif:'dificil',
 prompt:'Un texto cuenta un hecho y, además, el autor incluye claramente su punto de vista personal y sus juicios de valor sobre lo ocurrido. ¿Qué tipo de crónica es?',
 options:['Crónica de opinión','Crónica informativa','Crónica de sucesos','Crónica de viaje'], correct:0,
 hints:['Aquí sí aparece explícitamente la postura personal del autor, a diferencia de la interpretativa.'],
 exp:'Es una crónica de opinión: el autor expresa explícitamente su punto de vista y juicios de valor.'},
{id:nid(), topic:'cronica', type:'mc', dif:'medio',
 prompt:'Un texto simplemente informa qué pasó, cuándo, dónde y quiénes participaron, sin profundizar en interpretación ni opinión. ¿Qué tipo de crónica es la más básica de todas?',
 options:['Crónica informativa','Crónica interpretativa','Crónica de opinión','Crónica literaria'], correct:0,
 hints:['Es el tipo más neutral y directo, centrado en los datos básicos del hecho.'],
 exp:'Es una crónica informativa: se limita a contar los hechos esenciales sin interpretación ni opinión explícita.'}
);

// Lectura completa de crónica con preguntas de análisis
const cronicaReading = [
 'El sábado a las once y media de la noche, un incendio consumió parte del mercado municipal de la calle Higueras.',
 'Yo llegué al lugar minutos después de escuchar las sirenas desde mi ventana, a solo dos cuadras de distancia.',
 'El fuego avanzaba como una lengua hambrienta que devoraba los toldos de lona uno tras otro.',
 'Los bomberos, encabezados por el capitán Ortiz, controlaron las llamas en poco más de cuarenta minutos.',
 'Según los comerciantes afectados, todo comenzó en un puesto de velas cerca de la entrada norte.',
 'Para cuando el sol asomó sobre los techos ennegrecidos, ya se contaban doce puestos destruidos.'
];
Q.push(
{id:nid(), topic:'cronica', type:'eviden', dif:'dificil',
 prompt:'Lee la crónica y selecciona la oración que demuestra "exactitud y veracidad" (datos precisos de hora, lugar, tiempo).',
 reading:cronicaReading, correctSentence:0,
 hints:['Busca datos concretos: hora exacta, día, lugar.'],
 exp:'"El sábado a las once y media de la noche... mercado municipal de la calle Higueras" da hora, día y lugar precisos.'},
{id:nid(), topic:'cronica', type:'eviden', dif:'dificil',
 prompt:'En la misma crónica, ¿qué oración demuestra que el autor es un "autor testigo"?',
 reading:cronicaReading, correctSentence:1,
 hints:['Busca dónde el narrador habla de sí mismo llegando al lugar.'],
 exp:'"Yo llegué al lugar minutos después de escuchar las sirenas" muestra que el cronista presenció los hechos directamente.'},
{id:nid(), topic:'cronica', type:'eviden', dif:'dificil',
 prompt:'¿Qué oración de la crónica contiene un recurso retórico o literario (una comparación)?',
 reading:cronicaReading, correctSentence:2,
 hints:['Busca una comparación usando "como".'],
 exp:'"El fuego avanzaba como una lengua hambrienta" es un símil, un recurso retórico y literario.'},
{id:nid(), topic:'cronica', type:'mc', dif:'medio',
 prompt:'En esta crónica del incendio, ¿quién narra los hechos?',
 options:['Un narrador protagonista, porque el incendio le ocurrió a él','Un narrador testigo, porque presenció los hechos pero no fue el afectado directo','No hay narrador identificable','Un narrador en tercera persona omnisciente'], correct:1,
 hints:['El narrador llega al lugar y observa, pero el incendio no le sucede directamente a él.'],
 exp:'Es un narrador testigo: presenció el incendio y lo relata, pero no es él quien sufre el hecho central.'},
{id:nid(), topic:'cronica', type:'mc', dif:'medio',
 prompt:'¿Cuál es el acontecimiento principal de esta crónica?',
 options:['La llegada del sol','Un incendio en el mercado municipal','Una entrevista con el capitán Ortiz','Una fiesta en la calle Higueras'], correct:1,
 hints:['Busca el hecho central alrededor del cual gira todo el texto.'],
 exp:'El acontecimiento principal es el incendio que consumió parte del mercado municipal.'},
{id:nid(), topic:'cronica', type:'mc', dif:'dificil',
 prompt:'¿En qué tipo de crónica encaja mejor este texto sobre el incendio?',
 options:['Crónica de sucesos','Crónica política','Crónica de viaje','Crónica de opinión'], correct:0,
 hints:['Es un hecho imprevisto de la vida cotidiana, sin ser necesariamente un delito.'],
 exp:'Encaja como crónica de sucesos: relata un hecho imprevisto (un incendio) sin enfoque de opinión o investigación criminal profunda.'},
{id:nid(), topic:'cronica', type:'mc', dif:'medio',
 prompt:'¿En qué orden se presentan los acontecimientos en esta crónica?',
 options:['Cronológico: desde el inicio del incendio hasta el amanecer siguiente','Aleatorio, sin ningún orden','Solo en el presente, sin referencias de tiempo','De atrás hacia adelante (empezando por el final)'], correct:0,
 hints:['Sigue las marcas de tiempo: "el sábado a las once y media", "minutos después", "en poco más de cuarenta minutos", "cuando el sol asomó".'],
 exp:'Los acontecimientos siguen una secuencia cronológica, desde el inicio del incendio hasta la mañana siguiente.'}
);

/* ---------- SECCIÓN 9: FIGURAS LITERARIAS ---------- */
function figQ(name, sentence, options, correctIdx, hints, exp, dif){
  return {id:nid(), topic:'figuras', type:'mc', dif: dif||'facil',
   prompt:`¿Qué figura literaria aparece en: "${sentence}"?`,
   options, correct: correctIdx, hints, exp};
}
const FIG_ALL = ['Símil','Metáfora','Personificación','Hipérbole','Antítesis','Anáfora','Retruécano','Aliteración','Asíndeton','Polisíndeton','Onomatopeya','Hipérbaton','Redundancia','Encabalgamiento','Oxímoron','Paradoja','Alegoría'];
function pickOpts(correctName, n){
  const others = FIG_ALL.filter(f=>f!==correctName);
  const shuffled = others.sort(()=>Math.random()-0.5).slice(0,n-1);
  const opts = [correctName, ...shuffled];
  return opts.sort(()=>Math.random()-0.5);
}
function mkFig(name, sentence, hints, exp, dif){
  const opts = pickOpts(name,4);
  return figQ(name, sentence, opts, opts.indexOf(name), hints, exp, dif);
}

Q.push(
 mkFig('Símil','Tus ojos son como universos vivos.', ['Busca la palabra "como" haciendo una comparación explícita.'], 'Es un símil: comparación explícita usando "como".','facil'),
 mkFig('Metáfora','Su alma es una mina de carbón.', ['No hay "como"; se relaciona una cosa con otra directamente.'], 'Es una metáfora: relación directa entre dos elementos sin comparación explícita.','facil'),
 mkFig('Personificación','El sol sonrió a lo lejos.', ['El sol, que no es humano, realiza una acción humana.'], 'Es una personificación: se atribuye una acción humana (sonreír) a un objeto natural.','facil'),
 mkFig('Hipérbole','Te esperé una eternidad.', ['Es una exageración; nadie espera literalmente una eternidad.'], 'Es una hipérbole: exageración intencional.','facil'),
 mkFig('Antítesis','Hielo abrasador, fuego helado.', ['Observa que se presentan ideas opuestas entre sí, en frases distintas.'], 'Es una antítesis: contraste de ideas opuestas.','medio'),
 mkFig('Anáfora','Quiero verte. Quiero escucharte. Quiero hablarte.', ['Fíjate en la palabra que se repite al inicio de cada frase.'], 'Es una anáfora: repetición de "quiero" al comienzo de cada frase.','facil'),
 mkFig('Retruécano','Viví para amar y amé para vivir.', ['Las mismas palabras se repiten pero en orden invertido.'], 'Es un retruécano: se invierten los términos de la primera frase en la segunda.','dificil'),
 mkFig('Aliteración','Mi mamá me mima.', ['Presta atención al sonido que se repite: la "m".'], 'Es una aliteración: repetición del sonido "m".','facil'),
 mkFig('Asíndeton','Llegué, vi, vencí.', ['No hay ninguna conjunción como "y" entre las acciones.'], 'Es un asíndeton: se eliminan las conjunciones entre los elementos.','medio'),
 mkFig('Polisíndeton','Y corre, y salta, y grita, y ríe.', ['La conjunción "y" se repite varias veces, más de lo normal.'], 'Es un polisíndeton: repetición de la conjunción "y".','medio'),
 mkFig('Onomatopeya','El reloj hacía tic-tac en la habitación silenciosa.', ['Busca la palabra que imita un sonido.'], 'Es una onomatopeya: "tic-tac" imita el sonido del reloj.','facil'),
 mkFig('Hipérbaton','Sobre el mar brillaba la luna.', ['Compara con el orden normal: "La luna brillaba sobre el mar". Aquí el orden está alterado.'], 'Es un hipérbaton: se altera el orden normal de la oración.','medio'),
 mkFig('Oxímoron','El silencio ensordecedor llenaba la sala.', ['Se unen dos palabras de significado contradictorio en una sola idea muy breve.'], 'Es un oxímoron: une términos aparentemente contradictorios ("silencio" y "ensordecedor").','medio'),
 mkFig('Paradoja','Mientras más aprendo, más comprendo lo poco que sé.', ['A diferencia del oxímoron, aquí la contradicción se desarrolla en una idea completa, no en dos palabras juntas, y tiene un sentido lógico profundo.'], 'Es una paradoja: presenta una idea contradictoria que, pensada bien, tiene sentido lógico.','dificil'),
);
Q.push(
{id:nid(), topic:'figuras', type:'mc', dif:'medio',
 prompt:'"Silencio ensordecedor" y "dulce amargura" son ejemplos de:',
 options:['Paradoja','Oxímoron','Antítesis','Hipérbaton'], correct:1,
 hints:['Son solo dos palabras unidas, contradictorias entre sí, no una idea completa desarrollada.'],
 exp:'Son oxímoron: unen dos términos contradictorios en una expresión muy breve.'},
{id:nid(), topic:'figuras', type:'mc', dif:'dificil',
 prompt:'¿Qué figura literaria consiste en repetir una idea o información que ya está contenida en otra expresión?',
 options:['Redundancia','Encabalgamiento','Alegoría','Anáfora'], correct:0,
 hints:['Piensa en decir lo mismo dos veces con distintas palabras, de forma innecesaria.'],
 exp:'La redundancia repite una idea ya contenida en otra expresión.'},
{id:nid(), topic:'figuras', type:'mc', dif:'dificil',
 prompt:'¿Qué figura literaria ocurre cuando una idea comienza en un verso y continúa en el siguiente sin una pausa completa?',
 options:['Encabalgamiento','Hipérbaton','Anáfora','Retruécano'], correct:0,
 hints:['Ocurre específicamente entre el final de un verso y el inicio del siguiente.'],
 exp:'El encabalgamiento ocurre cuando una idea sigue de un verso a otro sin pausa completa.'},
{id:nid(), topic:'figuras', type:'mc', dif:'dificil',
 prompt:'¿Qué figura literaria utiliza una serie de imágenes o elementos para representar de forma extensa otra idea (por ejemplo, un relato completo que representa un concepto abstracto)?',
 options:['Alegoría','Onomatopeya','Aliteración','Redundancia'], correct:0,
 hints:['Es una figura que se desarrolla a lo largo de todo un texto o imagen, no en una sola frase.'],
 exp:'La alegoría usa una serie extensa de imágenes o elementos para representar otra idea más amplia.'}
);

// Comparaciones importantes
Q.push(
{id:nid(), topic:'figuras', type:'mc', dif:'medio',
 prompt:'"Sus lágrimas eran como perlas" vs. "Sus lágrimas eran perlas". ¿Cuál es símil y cuál es metáfora?',
 options:['La primera es metáfora, la segunda es símil','La primera es símil (usa "como"), la segunda es metáfora (relación directa)','Ambas son símiles','Ambas son metáforas'], correct:1,
 hints:['El símil necesita una palabra comparativa como "como". La metáfora no la usa.'],
 exp:'"Como perlas" es símil (comparación explícita); "eran perlas" es metáfora (relación directa, sin "como").'},
{id:nid(), topic:'figuras', type:'mc', dif:'medio',
 prompt:'¿Cuál es la diferencia clave entre antítesis y oxímoron?',
 options:[
   'No hay ninguna diferencia',
   'La antítesis contrasta ideas opuestas generalmente en frases o cláusulas distintas; el oxímoron une dos términos contradictorios en una sola expresión muy breve',
   'El oxímoron siempre es más largo que la antítesis',
   'La antítesis solo se usa en poesía'], correct:1,
 hints:['Piensa en "hielo abrasador, fuego helado" (dos frases opuestas) frente a "silencio ensordecedor" (dos palabras juntas).'],
 exp:'La antítesis contrasta ideas opuestas en frases o cláusulas; el oxímoron condensa la contradicción en una sola expresión breve.'},
{id:nid(), topic:'figuras', type:'mc', dif:'dificil',
 prompt:'¿Cuál es la diferencia clave entre oxímoron y paradoja?',
 options:[
   'El oxímoron une dos palabras contradictorias de forma breve; la paradoja desarrolla una idea completa que, aunque parece contradictoria, tiene sentido lógico',
   'Son exactamente lo mismo',
   'La paradoja siempre es más corta que el oxímoron',
   'El oxímoron nunca aparece en el lenguaje cotidiano'], correct:0,
 hints:['El oxímoron es breve (dos palabras); la paradoja se desarrolla en una idea o frase completa con sentido reflexivo.'],
 exp:'El oxímoron es una unión breve de opuestos; la paradoja es una idea más desarrollada que, pensada bien, resulta lógica.'},
{id:nid(), topic:'figuras', type:'mc', dif:'medio',
 prompt:'¿Cuál es la diferencia entre anáfora y aliteración?',
 options:[
   'La anáfora repite palabras al comienzo de frases o versos; la aliteración repite sonidos dentro de las palabras',
   'Ambas repiten exactamente lo mismo',
   'La aliteración solo ocurre al final de una frase',
   'La anáfora repite sonidos, la aliteración repite palabras completas'], correct:0,
 hints:['"Quiero verte, quiero escucharte" repite una palabra al inicio (anáfora). "Mi mamá me mima" repite un sonido (aliteración).'],
 exp:'La anáfora repite palabras al inicio de frases o versos; la aliteración repite sonidos dentro de las palabras.'},
{id:nid(), topic:'figuras', type:'mc', dif:'medio',
 prompt:'¿Cuál es la diferencia entre asíndeton y polisíndeton?',
 options:[
   'El asíndeton elimina conjunciones; el polisíndeton las repite en exceso',
   'Ambos eliminan las conjunciones',
   'Ambos repiten las conjunciones',
   'El asíndeton solo se usa en prosa, nunca en poesía'], correct:0,
 hints:['"Llegué, vi, vencí" (sin conjunciones) frente a "y corre, y salta, y grita" (conjunción repetida).'],
 exp:'El asíndeton elimina las conjunciones; el polisíndeton las repite más de lo habitual.'},
{id:nid(), topic:'figuras', type:'mc', dif:'dificil',
 prompt:'"El tiempo es un ladrón" (una frase) frente a una novela completa donde cada personaje representa un pecado capital. ¿Cuál es metáfora y cuál es alegoría?',
 options:[
   '"El tiempo es un ladrón" es metáfora (relación directa breve); la novela es alegoría (serie extensa de elementos que representan otra idea)',
   'Ambas son metáforas',
   'Ambas son alegorías',
   'La frase es alegoría y la novela es metáfora'], correct:0,
 hints:['La alegoría se extiende a lo largo de todo un relato; la metáfora suele ser una relación puntual y breve.'],
 exp:'La metáfora es una relación directa y breve; la alegoría desarrolla una serie extensa de elementos para representar otra idea.'},
{id:nid(), topic:'figuras', type:'mc', dif:'medio',
 prompt:'"El sol sonrió" (personificación) frente a "su sonrisa es un amanecer" (metáfora). ¿Cuál es la diferencia principal?',
 options:[
   'La personificación da cualidades humanas a algo no humano; la metáfora relaciona directamente dos elementos sin necesariamente dar cualidades humanas',
   'No hay ninguna diferencia',
   'La metáfora siempre habla del sol',
   'La personificación nunca puede usarse con el sol'], correct:0,
 hints:['En la personificación, algo no humano actúa como persona (sonreír). En la metáfora, se identifica una cosa con otra, sin que sea necesariamente una acción humana.'],
 exp:'La personificación atribuye cualidades o acciones humanas a algo no humano; la metáfora identifica directamente dos elementos entre sí.'},
{id:nid(), topic:'figuras', type:'mc', dif:'dificil',
 prompt:'"Te esperé una eternidad" (hipérbole) frente a "eres mi sol" (metáfora). ¿Cuál es la diferencia clave?',
 options:[
   'La hipérbole exagera una cantidad, tiempo o intensidad; la metáfora identifica una cosa con otra sin necesariamente exagerar',
   'Ambas son exactamente lo mismo',
   'La metáfora siempre exagera más que la hipérbole',
   'La hipérbole nunca se usa con el tiempo'], correct:0,
 hints:['La hipérbole se trata de exagerar (una eternidad = mucho tiempo). La metáfora identifica dos elementos, sin que el punto central sea la exageración.'],
 exp:'La hipérbole exagera intencionalmente; la metáfora identifica directamente dos elementos, sin que su función central sea exagerar.'}
);

const QUESTION_AUDIT_RULES=Object.freeze({lengthRatio:1.35,minCorrectLength:12,technicalWordLength:8});
function auditQuestionOptions(bank=Q,{includeExperimental=false}={}){
  const scoped=includeExperimental?bank:bank.filter(question=>!question.experimental);
  const multipleChoice=scoped.filter(question=>question.type==='mc'&&Array.isArray(question.options)&&Number.isInteger(question.correct));
  const distribution={A:0,B:0,C:0,D:0,E:0};
  const flagged=[];
  multipleChoice.forEach(question=>{
    const correct=String(question.options[question.correct]||'');
    const distractors=question.options.filter((_,index)=>index!==question.correct).map(String);
    const average=distractors.length?distractors.reduce((sum,text)=>sum+text.length,0)/distractors.length:0;
    const reasons=[];
    if(correct.length>=QUESTION_AUDIT_RULES.minCorrectLength&&average&&correct.length>average*QUESTION_AUDIT_RULES.lengthRatio)reasons.push('correcta-más-larga');
    const distractorWords=new Set(distractors.join(' ').toLowerCase().match(/[a-záéíóúñü]{8,}/g)||[]);
    const uniqueTechnical=(correct.toLowerCase().match(/[a-záéíóúñü]{8,}/g)||[]).filter(word=>!distractorWords.has(word));
    if(uniqueTechnical.length>=2)reasons.push('detalle-técnico-solo-correcta');
    if(distractors.some(text=>/\b(nunca|siempre|exactamente lo mismo|ninguna diferencia|ninguna de las anteriores)\b/i.test(text)))reasons.push('distractor-absoluto-o-débil');
    const letter='ABCDE'[question.correct];if(letter)distribution[letter]++;
    if(reasons.length)flagged.push({id:question.id,reasons,correctLength:correct.length,averageDistractorLength:Math.round(average)});
  });
  return {total:scoped.length,multipleChoice:multipleChoice.length,distribution,flagged};
}

window.STUDY_HUB_LEGACY_QUESTIONS=Q;
window.STUDY_HUB_NORMALIZE_MORPH_ROLE=normalizeMorphRole;
window.STUDY_HUB_AUDIT_QUESTION_OPTIONS=auditQuestionOptions;

const REVIEW_CARDS = [
 {topic:'gramatica', title:'Gramática', def:'Disciplina que estudia la estructura de una lengua: la forma de las palabras, cómo se organizan y cómo se relacionan.', example:'Incluye la relación entre morfología y sintaxis.'},
 {topic:'gramatica', title:'Morfología', def:'Estudia la estructura interna de las palabras, su formación y sus variaciones.', example:'Ej: analizar "niñas" en lexema + morfemas.'},
 {topic:'gramatica', title:'Sintaxis', def:'Estudia cómo las palabras se combinan y organizan para formar frases y oraciones.', example:'Ej: identificar sujeto y predicado.'},
 {topic:'morfologia', title:'Lexema o raíz', def:'Parte fundamental de la palabra; contiene el significado principal.', example:'pan, panadero, panadería → lexema: pan'},
 {topic:'morfologia', title:'Morfema derivativo', def:'Forma una palabra nueva o modifica el significado del lexema. Puede ser prefijo o sufijo.', example:'casa → casita (sufijo -ita)'},
 {topic:'morfologia', title:'Morfema flexivo', def:'No crea una palabra nueva; expresa género, número, persona, tiempo o modo.', example:'niñ-a-s: -a género, -s número'},
 {topic:'morfologia', title:'MDP (prefijo)', def:'Morfema Derivativo Prefijo. Aparece antes del lexema y modifica el significado.', example:'ilegal → i- + legal'},
 {topic:'morfologia', title:'MDS (sufijo)', def:'Morfema Derivativo Sufijo. Aparece después del lexema; puede formar palabras nuevas.', example:'casita → cas + ita'},
 {topic:'morfologia', title:'Interfijo', def:'Morfema derivativo que aparece entre el lexema y el sufijo; funciona como enlace y normalmente no aporta un significado propio importante.', example:'panecillo → pan + ec + illo'},
 {topic:'morfologia', title:'Palabra derivada', def:'Se forma añadiendo uno o más morfemas derivativos a un lexema.', example:'casa → casita'},
 {topic:'morfologia', title:'Parasíntesis', def:'Formación de palabras donde intervienen simultáneamente distintos elementos, típicamente prefijo + lexema + sufijo.', example:'des + tornill + ador'},
 {topic:'narrativa', title:'Género narrativo', def:'Cuenta acontecimientos, reales o ficticios, con personajes que actúan y participan en conflictos.', example:'Puede usar diálogo, metáfora, descripción.'},
 {topic:'narrativa', title:'Narrador protagonista', def:'Cuenta una historia en la que él mismo es el personaje principal; normalmente en primera persona.', example:'"Yo caminaba pensando en la carta..."'},
 {topic:'narrativa', title:'Narrador testigo', def:'Cuenta acontecimientos que vio o presenció; puede aparecer en la historia sin ser el protagonista.', example:'"Vi a Marcela entrar corriendo..."'},
 {topic:'cronica', title:'Crónica', def:'Texto narrativo que relata acontecimientos siguiendo una secuencia temporal, combinando hechos reales con una forma narrativa.', example:'El cronista puede presenciar, investigar o entrevistar.'},
 {topic:'cronica', title:'Autor testigo', def:'El cronista puede haber presenciado directamente los acontecimientos.', example:'"Yo llegué al lugar minutos después..."'},
 {topic:'cronica', title:'Exactitud y veracidad', def:'La información corresponde a hechos reales y presenta precisión: fechas, horas, lugares, nombres, circunstancias.', example:'"El sábado a las once y media de la noche..."'},
 {topic:'cronica', title:'Afán descriptivo', def:'Describe lugares, personas, ambiente, circunstancias y acciones para imaginar mejor lo ocurrido.', example:'Descripciones sensoriales detalladas.'},
 {topic:'cronica', title:'Intención narrativa', def:'Los datos no se presentan como una lista; se organizan como una narración con secuencia y desarrollo temporal.', example:'Orden cronológico de los hechos.'},
 {topic:'cronica', title:'Recursos retóricos y literarios', def:'Uso de lenguaje figurado y expresivo: metáforas, símiles, personificación, imágenes.', example:'"El fuego avanzaba como una lengua hambrienta."'},
 {topic:'figuras', title:'Símil', def:'Comparación explícita, usa como/parece/semejante a/cual.', example:'"Tus ojos son como universos vivos."'},
 {topic:'figuras', title:'Metáfora', def:'Relaciona directamente una cosa con otra sin comparación explícita.', example:'"Su alma es una mina de carbón."'},
 {topic:'figuras', title:'Personificación', def:'Atribuye características humanas a objetos, animales, naturaleza o ideas.', example:'"El sol sonrió a lo lejos."'},
 {topic:'figuras', title:'Hipérbole', def:'Exageración intencional.', example:'"Te esperé una eternidad."'},
 {topic:'figuras', title:'Antítesis', def:'Presenta ideas opuestas o contrastantes.', example:'"Hielo abrasador, fuego helado."'},
 {topic:'figuras', title:'Anáfora', def:'Repetición de palabras al comienzo de frases o versos.', example:'"Quiero verte. Quiero escucharte."'},
 {topic:'figuras', title:'Retruécano', def:'Repite palabras o estructuras invirtiendo su orden.', example:'"Viví para amar y amé para vivir."'},
 {topic:'figuras', title:'Aliteración', def:'Repetición intencional de sonidos.', example:'"Mi mamá me mima."'},
 {topic:'figuras', title:'Asíndeton', def:'Elimina conjunciones.', example:'"Llegué, vi, vencí."'},
 {topic:'figuras', title:'Polisíndeton', def:'Repite conjunciones.', example:'"Y corre, y salta, y grita, y ríe."'},
 {topic:'figuras', title:'Onomatopeya', def:'Representa o imita sonidos.', example:'boom, tic-tac, miau'},
 {topic:'figuras', title:'Hipérbaton', def:'Altera el orden normal de una oración.', example:'"Sobre el mar brillaba la luna."'},
 {topic:'figuras', title:'Redundancia', def:'Repite una idea o información contenida en otra expresión.', example:'"Subir arriba", "entrar adentro".'},
 {topic:'figuras', title:'Encabalgamiento', def:'Una idea comienza en un verso y continúa en el siguiente sin pausa completa.', example:'Se ve en poesía, entre el final de un verso y el inicio del otro.'},
 {topic:'figuras', title:'Oxímoron', def:'Une términos aparentemente contradictorios.', example:'"Silencio ensordecedor", "dulce amargura."'},
 {topic:'figuras', title:'Paradoja', def:'Presenta una idea aparentemente contradictoria que contiene un significado lógico o profundo.', example:'"Mientras más aprendo, más comprendo lo poco que sé."'},
 {topic:'figuras', title:'Alegoría', def:'Utiliza una serie de imágenes o elementos para representar otra idea de manera más extensa.', example:'Una novela donde cada personaje representa un pecado capital.'},
];

function morphVisual(parts){
  return `<div class="morph-example">${parts.map((p,i)=>`
    ${i?'<span class="morph-plus">+</span>':''}
    <div class="morph-piece ${p.kind||''}">
      <span class="morph-word">${p.text}</span>
      <span class="morph-label">${p.label}</span>
    </div>`).join('')}</div>`;
}
function studyExample(content,note){
  return `<div class="study-example">
    <span class="study-example-label">Ejemplo visual</span>
    ${content}
    ${note?`<div class="study-note">${note}</div>`:''}
  </div>`;
}
window.STUDY_HUB_LEGACY_REVIEW_CARDS=REVIEW_CARDS;
window.STUDY_HUB_STUDY_EXAMPLE=studyExample;
window.STUDY_HUB_MORPH_VISUAL=morphVisual;
})();
