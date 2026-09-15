(() => {
  'use strict';

  const subjectId = 'historia';
  const unitId = 'historia-geografia-civilizaciones';
  const topics = [
    { id: 'geografia', name: 'Geografía', icon: '🌎' },
    { id: 'civilizaciones', name: 'Civilización y grandes civilizaciones', icon: '🏛️' },
    { id: 'mayas', name: 'Mayas', icon: '◈' },
    { id: 'aztecas', name: 'Aztecas', icon: '◆' },
    { id: 'incas', name: 'Incas', icon: '☀️' },
    { id: 'religion-inca', name: 'Religión inca', icon: '◉' },
    { id: 'mapas-localizacion', name: 'Mapas y localización', icon: '🗺️' },
    { id: 'ciclo-naturaleza', name: 'Ciclo de vida / naturaleza', icon: '🌱' },
  ];

  const unit = {
    id: unitId,
    subjectId,
    name: 'Geografía y grandes civilizaciones',
    type: 'Prueba',
    status: 'current',
    date: null,
    order: 1,
    topicIds: topics.map(topic => topic.id),
  };

  const reviewCards = [
    ['geografia', 'Hidrografía', 'Estudio de los cuerpos de agua.', 'Los cuerpos de agua sirven para consumo, pesca, cultivos, transporte, comercio e industria.'],
    ['geografia', 'Región', 'Área territorial con características históricas y geográficas homogéneas.', 'Noreste, Sureste, Grandes Llanuras, Suroeste y Costa del Pacífico.'],
    ['geografia', 'Climatología', 'Estudia el clima de una zona durante largos períodos de tiempo.', 'Observa condiciones habituales durante muchos años.'],
    ['geografia', 'Tiempo atmosférico y clima', 'El tiempo describe condiciones de corto plazo; el clima, condiciones habituales observadas durante muchos años.', 'Una condición de hoy es tiempo atmosférico; un patrón de muchos años es clima.'],
    ['geografia', 'Geografía humana', 'Estudia las sociedades humanas y su relación con el espacio.', 'Incluye lenguas, culturas, religión, tradiciones, demografía y sistemas económicos y políticos.'],
    ['civilizaciones', 'Civilización', 'Grupo humano que durante algún tiempo histórico dominó una región en conocimiento, socialmente, militarmente y económicamente, sometiendo o influyendo sobre grupos cercanos.', 'Combina organización, poder, economía, cultura, religión y conocimientos.'],
    ['civilizaciones', 'Período precolombino', 'Período anterior a la llegada de los europeos a América.', 'Mayas, aztecas e incas se desarrollaron en este período.'],
    ['civilizaciones', 'Grandes civilizaciones americanas', 'Distintos grupos evolucionaron por América y algunos llegaron a considerarse grandes civilizaciones.', 'Las principales estudiadas son mayas, aztecas e incas.'],
    ['mayas', 'Mesoamérica', 'Región cultural donde se desarrollaron civilizaciones como Maya y Azteca.', 'Incluye México y parte de Centroamérica.'],
    ['mayas', 'Mayas', 'Civilización de Mesoamérica con conocimientos de astronomía, matemáticas, arquitectura, calendarios y escritura.', 'Se localizaron en zonas de México, Centroamérica, Yucatán y Chiapas.'],
    ['mayas', 'Tzolk’in', 'Calendario maya de 260 días.', 'Uno de los calendarios mayas estudiados.'],
    ['mayas', 'Haab', 'Calendario maya de 365 días.', 'Coincide aproximadamente con nuestro año.'],
    ['mayas', 'Popol Vuh', 'Libro del Consejo o Libro de la Comunidad.', 'Incluye explicaciones sobre el origen del mundo.'],
    ['aztecas', 'Aztecas', 'Pueblo guerrero de México que se expandió mediante organización militar, sometimiento y acuerdos políticos.', 'Tomó adelantos astronómicos, arquitectónicos y matemáticos de la cultura maya.'],
    ['aztecas', 'Tenochtitlán', 'Ciudad principal de los aztecas.', 'Se relaciona con la civilización azteca en México.'],
    ['incas', 'Incas', 'Civilización de América del Sur cuya base económica fue la agricultura.', 'Ocupó territorios de Ecuador, Perú, Chile, Bolivia y parte de Argentina.'],
    ['incas', 'Cuzco', 'Centro político del Imperio inca.', 'Cuzco y Machu Picchu son lugares incas.'],
    ['incas', 'Machu Picchu', 'Lugar relacionado con la civilización inca.', 'Se encuentra en la región andina del Imperio inca.'],
    ['incas', 'Gobierno teocrático', 'Sistema político en el que el poder del gobernante está estrechamente relacionado con la religión.', 'El Gran Inca era considerado descendiente del dios Sol.'],
    ['religion-inca', 'Politeísmo', 'Creencia en varios dioses.', 'Los incas eran politeístas.'],
    ['religion-inca', 'Inti', 'Dios Sol y dios supremo.', 'El Gran Inca era considerado descendiente del dios Sol.'],
    ['religion-inca', 'Viracocha', 'Señor o maestro del mundo.', 'Dios de la religión inca.'],
    ['religion-inca', 'Mama Quilla', 'La Luna y esposa de Inti.', 'Diosa de la religión inca.'],
    ['religion-inca', 'Pacha Mama', 'Madre Tierra y fertilidad de los campos.', 'Se relaciona con la tierra y los cultivos.'],
    ['mapas-localizacion', 'Localizaciones principales', 'Mayas: Mesoamérica; aztecas: México; incas: Andes y oeste de América del Sur.', 'Las otras civilizaciones se ubican en África, Asia y el Mediterráneo según el material.'],
    ['mapas-localizacion', 'Ciudades y civilizaciones', 'Cada ciudad debe asociarse con la civilización indicada en el material.', 'Tikal es maya, Tenochtitlán es azteca, Cuzco es inca, Roma es romana y Atenas es griega.'],
    ['ciclo-naturaleza', 'Ciclo de vida / naturaleza', 'Relación general: Sol → agua/nubes → lluvia → plantas → seres vivos.', 'El material incluye Sol, nubes, lluvia, plantas, árboles y seres humanos.'],
  ].map(([topic, title, def, example]) => ({ topic, title, def, example }));

  let optionIndex = 0;
  function mc(id, topic, prompt, answer, distractors, exp, dif = 'medio') {
    const correct = optionIndex++ % 4;
    const options = distractors.slice(0, 3);
    options.splice(correct, 0, answer);
    return { id: `hist-${id}`, subjectId, unitId, topic, type: 'mc', dif, prompt, options, correct, hints: [], exp };
  }
  function tf(id, topic, prompt, correct, exp, dif = 'facil') {
    return { id: `hist-${id}`, subjectId, unitId, topic, type: 'tf', dif, prompt, correct, hints: [], exp };
  }

  const questions = [
    mc('geo-01', 'geografia', '¿Qué estudia la hidrografía?', 'Los cuerpos de agua', ['Las formas de gobierno', 'Las lenguas de una región', 'Los calendarios antiguos'], 'La hidrografía es el estudio de los cuerpos de agua.', 'facil'),
    mc('geo-02', 'geografia', '¿Cuál es un uso de los cuerpos de agua mencionado en el material?', 'Transporte', ['Escritura jeroglífica', 'Organización militar', 'Elaboración de calendarios'], 'El transporte es uno de los usos indicados para los cuerpos de agua.', 'facil'),
    mc('geo-03', 'geografia', 'Además del consumo y la pesca, ¿qué actividad agrícola depende de los cuerpos de agua?', 'Cultivos', ['Astronomía', 'Demografía', 'Arquitectura'], 'Los cultivos aparecen entre los usos de los cuerpos de agua.'),
    mc('geo-04', 'geografia', '¿Qué función territorial pueden cumplir los ríos y lagos?', 'Servir como fronteras', ['Definir calendarios', 'Elegir emperadores', 'Crear sistemas numéricos'], 'Los ríos y lagos pueden servir como fronteras.'),
    mc('geo-05', 'geografia', '¿Qué es una región?', 'Un área territorial con características históricas y geográficas homogéneas', ['Una condición atmosférica de corto plazo', 'Un cuerpo de agua usado para transporte', 'Un sistema político unido a la religión'], 'Una región comparte características históricas y geográficas homogéneas.'),
    mc('geo-06', 'geografia', '¿Cuál de estos nombres corresponde a una región o dirección del material?', 'Grandes Llanuras', ['Mesoamérica maya', 'Valle del Indo', 'Mar Mediterráneo'], 'Grandes Llanuras forma parte de la lista de regiones o direcciones presentada.'),
    mc('geo-07', 'geografia', '¿Qué estudia la climatología?', 'El clima de una zona durante largos períodos', ['Los cuerpos de agua de una zona', 'Las ciudades de una civilización', 'Las decisiones militares de un pueblo'], 'La climatología estudia el clima durante períodos largos.'),
    mc('geo-08', 'geografia', '¿Qué describe el tiempo atmosférico?', 'Condiciones atmosféricas de corto plazo', ['Condiciones habituales de muchos años', 'Características políticas homogéneas', 'Relaciones económicas precolombinas'], 'El tiempo atmosférico se refiere al corto plazo.'),
    mc('geo-09', 'geografia', '¿Qué describe el clima?', 'Condiciones habituales observadas durante muchos años', ['El estado atmosférico de una sola tarde', 'La ubicación de una ciudad', 'El curso de un río específico'], 'El clima se establece observando condiciones habituales durante muchos años.'),
    mc('geo-10', 'geografia', '¿Qué estudia la geografía humana?', 'Las sociedades humanas y su relación con el espacio', ['Solo los cuerpos de agua', 'Solo el clima de largo plazo', 'Los movimientos de la Luna'], 'La geografía humana estudia sociedades y espacio.'),
    mc('geo-11', 'geografia', '¿Cuál pertenece a la geografía humana?', 'Demografía', ['Fases de la Luna', 'Canales de riego', 'Calendario Haab'], 'La demografía está incluida en la geografía humana.'),
    mc('geo-12', 'geografia', '¿Cuál par aparece entre los sistemas estudiados por la geografía humana?', 'Económicos y políticos', ['Numéricos y calendáricos', 'Astronómicos y arquitectónicos', 'Fluviales y montañosos'], 'La geografía humana incluye sistemas económicos y políticos.'),
    mc('geo-13', 'geografia', '¿Cuál ciudad está incluida en la lista geográfica proporcionada?', 'Washington D. C.', ['Tikal', 'Cuzco', 'Babilonia'], 'Washington D. C. aparece junto con Nueva York, Los Ángeles, Chicago y Miami.'),
    mc('geo-14', 'geografia', '¿Cuál grupo contiene solo ciudades de la lista geográfica proporcionada?', 'Nueva York, Chicago y Miami', ['Tikal, Palenque y Roma', 'Cuzco, Atenas y Tebas', 'Ur, Anyang y Esparta'], 'Nueva York, Chicago y Miami están en la lista de ciudades de geografía.'),
    mc('geo-15', 'geografia', '¿Qué factor ayuda a explicar diferencias climáticas según el material?', 'La ubicación', ['El nombre de una ciudad', 'El sistema numérico', 'La forma de escritura'], 'El material relaciona la ubicación con diferencias climáticas.'),
    tf('geo-16', 'geografia', 'El tiempo atmosférico y el clima describen exactamente el mismo período.', false, 'El tiempo es de corto plazo; el clima se observa durante muchos años.'),
    tf('geo-17', 'geografia', 'Comercio e industria aparecen entre los usos de los cuerpos de agua.', true, 'Ambos usos están incluidos en el material.'),
    tf('geo-18', 'geografia', 'La geografía humana incluye lenguas, culturas, religión y tradiciones.', true, 'Esos elementos forman parte de la geografía humana.'),

    mc('civ-01', 'civilizaciones', 'Según la definición proporcionada, ¿qué es una civilización?', 'Un grupo humano que dominó o influyó una región durante un tiempo histórico', ['Una ciudad aislada sin organización', 'Una condición climática de largo plazo', 'Un sistema dedicado solo a la agricultura'], 'La definición combina dominio o influencia regional con desarrollo histórico.'),
    mc('civ-02', 'civilizaciones', '¿Cuál es una característica de una civilización?', 'Organización política', ['Tiempo atmosférico', 'Luz solar', 'Fase de la Luna'], 'La organización política es una de las características dadas.'),
    mc('civ-03', 'civilizaciones', '¿Qué conjunto reúne dimensiones de una civilización?', 'Cultura, religión y conocimientos', ['Lluvia, nubes y árboles', 'Ríos, lagos y fronteras', 'Norte, sur y costa'], 'Cultura, religión y conocimientos forman parte de las características.'),
    mc('civ-04', 'civilizaciones', '¿Cuáles son las tres grandes civilizaciones americanas trabajadas?', 'Mayas, aztecas e incas', ['Egipcios, griegos y romanos', 'China, India y Mesopotamia', 'Mayas, romanos y egipcios'], 'El material trabaja mayas, aztecas e incas como principales civilizaciones americanas.'),
    mc('civ-05', 'civilizaciones', '¿Qué significa período precolombino en este material?', 'Antes de la llegada de los europeos a América', ['Después de la fundación de Roma', 'Durante la expansión industrial', 'Antes del desarrollo de la agricultura'], 'El período precolombino es anterior a la llegada europea a América.'),
    mc('civ-06', 'civilizaciones', '¿Cuál aparece como otra gran civilización no americana?', 'Mesopotamia', ['Tenochtitlán', 'Machu Picchu', 'Mesoamérica'], 'Mesopotamia aparece junto a China Antigua, Roma, Grecia, Egipto y Valle del Indo.'),
    tf('civ-07', 'civilizaciones', 'Existe una teoría completamente certera sobre el poblamiento de América.', false, 'El material afirma que hasta hoy no existe una teoría certera.'),
    tf('civ-08', 'civilizaciones', 'Distintos grupos crearon culturas propias a través del continente americano.', true, 'El material indica que los grupos se desarrollaron, evolucionaron y crearon su cultura.'),

    mc('maya-01', 'mayas', '¿Dónde se localizaron los mayas?', 'Mesoamérica', ['Andes', 'Noreste de África', 'Región del Mediterráneo'], 'Los mayas se localizaron en Mesoamérica.'),
    mc('maya-02', 'mayas', '¿Cuál zona se relaciona con los mayas?', 'Yucatán', ['Bolivia', 'Asia oriental', 'Valle del Indo'], 'Yucatán forma parte de las zonas mayas indicadas.'),
    mc('maya-03', 'mayas', '¿Cuál fue una ciudad maya?', 'Chichén Itzá', ['Tenochtitlán', 'Cuzco', 'Roma'], 'Chichén Itzá fue una ciudad maya.'),
    mc('maya-04', 'mayas', '¿Qué grupo contiene únicamente ciudades mayas?', 'Chichén Itzá, Palenque y Tikal', ['Tenochtitlán, Cuzco y Tikal', 'Roma, Atenas y Esparta', 'Menfis, Tebas y Ur'], 'Las tres ciudades se relacionan con los mayas.'),
    mc('maya-05', 'mayas', '¿Cuál fue un conocimiento desarrollado por los mayas?', 'Astronomía', ['Demografía moderna', 'Industria contemporánea', 'Transporte ferroviario'], 'La astronomía aparece entre sus conocimientos.'),
    mc('maya-06', 'mayas', '¿Qué estudiaron los mayas?', 'Las fases de la Luna y los astros', ['Solo fronteras entre ríos', 'Sistemas políticos modernos', 'Únicamente rutas comerciales'], 'El material menciona fases de la Luna, astros y paso del tiempo.'),
    mc('maya-07', 'mayas', '¿Qué rango corresponde al sistema numérico maya presentado?', 'Del 0 al 20', ['Del 1 al 10', 'Del 0 al 100', 'Del 1 al 365'], 'El sistema numérico indicado va del 0 al 20.'),
    mc('maya-08', 'mayas', '¿Cuántos días tiene el Tzolk’in?', '260 días', ['365 días', '20 días', '4 días'], 'Tzolk’in es el calendario maya de 260 días.'),
    mc('maya-09', 'mayas', '¿Cuántos días tiene el Haab?', '365 días', ['260 días', '20 días', '90 días'], 'Haab tiene 365 días.'),
    mc('maya-10', 'mayas', '¿Qué calendario coincide aproximadamente con nuestro año?', 'Haab', ['Tzolk’in', 'Popol Vuh', 'Mesoamérica'], 'Haab tiene 365 días y coincide aproximadamente con nuestro año.'),
    mc('maya-11', 'mayas', '¿Qué es el Popol Vuh?', 'El Libro del Consejo o Libro de la Comunidad', ['Un calendario de 260 días', 'La ciudad principal azteca', 'El centro político inca'], 'El Popol Vuh recibe esos dos nombres.'),
    tf('maya-12', 'mayas', 'Mesoamérica incluye México y parte de Centroamérica.', true, 'Esa es la extensión indicada para la región cultural.'),

    mc('azt-01', 'aztecas', '¿Dónde se localizaron los aztecas?', 'México', ['Perú', 'Noreste de África', 'Asia oriental'], 'Los aztecas se localizaron en México.'),
    mc('azt-02', 'aztecas', '¿Cuál fue la ciudad principal de los aztecas?', 'Tenochtitlán', ['Tikal', 'Cuzco', 'Palenque'], 'Tenochtitlán fue la ciudad principal azteca.'),
    mc('azt-03', 'aztecas', '¿Cómo eran los aztecas en sus inicios según el material?', 'Una tribu de poco desarrollo', ['Un imperio dividido en cuatro regiones', 'Una cultura asentada en el Valle del Indo', 'Un pueblo dedicado solo a calendarios'], 'El material los presenta inicialmente como una tribu de poco desarrollo.'),
    mc('azt-04', 'aztecas', '¿Qué facilitó la expansión azteca?', 'Su gran organización militar', ['Sus terrazas de cultivo', 'Su calendario Haab', 'Su ubicación en los Andes'], 'La organización militar impulsó su expansión.'),
    mc('azt-05', 'aztecas', 'Además del sometimiento, ¿qué estrategia usaron los aztecas?', 'Acuerdos políticos', ['Canales de riego', 'Estudio del clima', 'Comercio por el Indo'], 'Los acuerdos políticos aparecen como parte de su expansión.'),
    mc('azt-06', 'aztecas', '¿Qué adelantos tomaron los aztecas de la cultura maya?', 'Astronómicos, arquitectónicos y matemáticos', ['Agrícolas, industriales y marítimos', 'Lingüísticos, demográficos y políticos', 'Climáticos, fluviales y comerciales'], 'Esos tres tipos de adelantos están indicados en el material.'),
    mc('azt-07', 'aztecas', '¿Qué característica describe a los aztecas?', 'Pueblo guerrero', ['Pueblo sin organización militar', 'Sociedad ubicada en los Andes', 'Civilización del noreste africano'], 'El material los caracteriza como pueblo guerrero.'),
    tf('azt-08', 'aztecas', 'Los aztecas se expandieron sin organización militar ni acuerdos políticos.', false, 'Ambos elementos contribuyeron a su expansión.'),

    mc('inca-01', 'incas', '¿Dónde se localizaron los incas?', 'América del Sur', ['Mesoamérica', 'Noreste de África', 'Asia oriental'], 'Los incas se localizaron en América del Sur.'),
    mc('inca-02', 'incas', '¿Cuál territorio formó parte del espacio inca?', 'Perú', ['México', 'Egipto', 'China'], 'Perú aparece entre los territorios incas.'),
    mc('inca-03', 'incas', '¿Qué ciudad fue el centro político inca?', 'Cuzco', ['Tenochtitlán', 'Tikal', 'Babilonia'], 'Cuzco fue el centro político.'),
    mc('inca-04', 'incas', '¿Cuál lugar se relaciona con los incas?', 'Machu Picchu', ['Palenque', 'Menfis', 'Anyang'], 'Machu Picchu es un lugar inca.'),
    mc('inca-05', 'incas', '¿Cuál fue la base económica inca?', 'Agricultura', ['Pesca oceánica', 'Industria', 'Escritura'], 'La agricultura fue su base económica.'),
    mc('inca-06', 'incas', '¿Cuáles fueron productos agrícolas incas mencionados?', 'Papa y maíz', ['Trigo y arroz', 'Cacao y café', 'Oliva y uva'], 'Papa y maíz aparecen expresamente en el material.'),
    mc('inca-07', 'incas', '¿Para qué servían las terrazas de cultivo?', 'Para aprovechar terrenos montañosos', ['Para observar los astros', 'Para dividir el imperio', 'Para formar fronteras fluviales'], 'Las terrazas permitían aprovechar terrenos montañosos.'),
    mc('inca-08', 'incas', '¿Qué función cumplían los canales de riego?', 'Llevar agua a los cultivos', ['Definir acuerdos políticos', 'Medir el paso del tiempo', 'Separar cuatro calendarios'], 'Los canales llevaban agua a los cultivos.'),
    mc('inca-09', 'incas', '¿Cómo era el gobierno inca?', 'Teocrático', ['Democrático', 'Sin autoridad política', 'Exclusivamente militar'], 'El gobierno se describe como teocrático.'),
    mc('inca-10', 'incas', '¿Cómo se llamaba el emperador inca?', 'El Gran Inca', ['Viracocha', 'Inti', 'Pacha Mama'], 'El emperador recibía el nombre de Gran Inca.'),
    mc('inca-11', 'incas', '¿En cuántas regiones se dividía política y económicamente el Imperio inca?', 'Cuatro', ['Dos', 'Tres', 'Cinco'], 'El imperio estaba dividido en cuatro regiones.'),
    tf('inca-12', 'incas', 'El Gran Inca era considerado descendiente del dios Sol.', true, 'Esa relación unía el poder del gobernante con la religión.'),

    mc('rel-01', 'religion-inca', '¿Qué significa politeísmo?', 'Creencia en varios dioses', ['Creencia en un solo gobernante', 'Estudio del clima', 'División en cuatro regiones'], 'El politeísmo es la creencia en varios dioses.'),
    mc('rel-02', 'religion-inca', '¿Quién era Inti?', 'El dios Sol y dios supremo', ['El señor del mundo', 'La Luna y esposa de Inti', 'La Madre Tierra'], 'Inti era el dios Sol y dios supremo.'),
    mc('rel-03', 'religion-inca', '¿Quién era Viracocha?', 'El señor o maestro del mundo', ['El dios Sol', 'La Madre Tierra', 'La esposa de Inti'], 'Viracocha era el señor o maestro del mundo.'),
    mc('rel-04', 'religion-inca', '¿Quién era Mama Quilla?', 'La Luna y esposa de Inti', ['El dios supremo', 'El emperador inca', 'La Madre Tierra'], 'Mama Quilla representaba la Luna y era esposa de Inti.'),
    mc('rel-05', 'religion-inca', '¿Con qué se relaciona Pacha Mama?', 'Madre Tierra y fertilidad de los campos', ['Sol y poder supremo', 'Luna y paso del tiempo', 'Organización militar y expansión'], 'Pacha Mama es la Madre Tierra y se relaciona con la fertilidad.'),
    mc('rel-06', 'religion-inca', '¿Qué aparece en el mundo de arriba según el material?', 'Sol, Luna y astros', ['Todos los seres vivos', 'Solo ciudades y regiones', 'Canales y terrazas'], 'El mundo de arriba incluye Sol, Luna y astros.'),
    mc('rel-07', 'religion-inca', '¿Qué aparece aquí en la Tierra según el material?', 'Todos los seres vivos', ['Solo el Sol y la Luna', 'Únicamente los gobernantes', 'Los calendarios mayas'], 'El material sitúa aquí en la Tierra a todos los seres vivos.'),
    tf('rel-08', 'religion-inca', 'El material proporcionado explica completamente el tercer mundo inca.', false, 'El material menciona tres mundos, pero la información sobre el tercero está incompleta.'),

    mc('map-01', 'mapas-localizacion', '¿Dónde se ubican los mayas?', 'Mesoamérica, sur de México y Centroamérica', ['Andes y oeste de América del Sur', 'Noreste de África', 'Región del Mediterráneo'], 'Esa es la localización maya proporcionada.'),
    mc('map-02', 'mapas-localizacion', '¿Dónde se ubican los incas?', 'Andes y oeste de América del Sur', ['México', 'Sur de Asia', 'Asia oriental'], 'Los incas se relacionan con los Andes y el oeste sudamericano.'),
    mc('map-03', 'mapas-localizacion', '¿Dónde se ubicaron los egipcios?', 'Noreste de África', ['Mesoamérica', 'Asia oriental', 'Región del Mediterráneo'], 'La civilización egipcia se ubica en el noreste de África.'),
    mc('map-04', 'mapas-localizacion', '¿Dónde se ubicaron los mesopotámicos?', 'Entre los ríos Tigris y Éufrates', ['En los Andes', 'En el sur de México', 'En la Costa del Pacífico'], 'Mesopotamia se localiza entre los ríos Tigris y Éufrates.'),
    mc('map-05', 'mapas-localizacion', '¿Dónde se ubicó la civilización del Valle del Indo?', 'Sur de Asia', ['Noreste de África', 'Mesoamérica', 'Oeste de América del Sur'], 'El Valle del Indo se ubica en el sur de Asia.'),
    mc('map-06', 'mapas-localizacion', '¿Dónde se ubicó China Antigua?', 'Asia oriental', ['Región del Mediterráneo', 'Noreste de África', 'Centroamérica'], 'China Antigua se localiza en Asia oriental.'),
    mc('map-07', 'mapas-localizacion', '¿Qué civilizaciones se relacionan con la región del Mediterráneo?', 'Griega y romana', ['Maya y azteca', 'Inca y egipcia', 'China e Indo'], 'Griegos y romanos se ubican en la región del Mediterráneo.'),
    mc('map-08', 'mapas-localizacion', '¿Qué ciudad pertenece a la civilización romana?', 'Roma', ['Tikal', 'Cuzco', 'Tebas'], 'Roma es la ciudad romana indicada.'),
    mc('map-09', 'mapas-localizacion', '¿Qué par corresponde a ciudades griegas?', 'Atenas y Esparta', ['Menfis y Tebas', 'Harappa y Mohenjo-Daro', 'Babilonia y Ur'], 'Atenas y Esparta son las ciudades griegas proporcionadas.'),
    mc('map-10', 'mapas-localizacion', '¿Qué par corresponde a ciudades egipcias?', 'Menfis y Tebas', ['Anyang y Xi’an', 'Roma y Esparta', 'Tikal y Palenque'], 'Menfis y Tebas son ciudades egipcias.'),
    mc('map-11', 'mapas-localizacion', '¿Qué par corresponde a ciudades mesopotámicas?', 'Babilonia y Ur', ['Cuzco y Machu Picchu', 'Atenas y Roma', 'Harappa y Anyang'], 'Babilonia y Ur son ciudades mesopotámicas.'),
    mc('map-12', 'mapas-localizacion', '¿Qué par corresponde al Valle del Indo?', 'Harappa y Mohenjo-Daro', ['Anyang y Chang’an', 'Menfis y Tebas', 'Chichén Itzá y Tikal'], 'Harappa y Mohenjo-Daro pertenecen al Valle del Indo.'),

    mc('nat-01', 'ciclo-naturaleza', '¿Qué secuencia general coincide con el ciclo proporcionado?', 'Sol → agua/nubes → lluvia → plantas → seres vivos', ['Lluvia → Sol → ciudades → calendarios', 'Plantas → imperio → agua → astros', 'Nubes → gobierno → comercio → Luna'], 'La secuencia usa únicamente los elementos y relaciones proporcionados.'),
    mc('nat-02', 'ciclo-naturaleza', '¿Qué elemento aparece después de agua/nubes en la relación general?', 'Lluvia', ['Gobierno', 'Calendario', 'Ciudad'], 'La lluvia sigue a agua/nubes en la secuencia.'),
    mc('nat-03', 'ciclo-naturaleza', '¿Qué grupo contiene únicamente elementos presentes en el ciclo?', 'Sol, nubes y plantas', ['Ríos, emperadores y escritura', 'Calendarios, ciudades y fronteras', 'Ejércitos, comercio y regiones'], 'Sol, nubes y plantas aparecen en el ciclo natural proporcionado.'),
    tf('nat-04', 'ciclo-naturaleza', 'Los seres humanos aparecen entre los elementos del ciclo natural proporcionado.', true, 'Los seres humanos están incluidos junto con Sol, nubes, lluvia, plantas y árboles.'),
  ];

  window.HISTORY_CONTENT = Object.freeze({ subjectId, unit, topics, reviewCards, questions });
})();
