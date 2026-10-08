# Historia — Mapas de Europeos

Estado: **Testing · HISTORY FINAL HUMAN PASS confirmado el 8 de octubre de 2026**. Aprobados Europeos, los tres mapas SVG y los accesos desde Repasar, Practicar y Examen. Gate B1 autoriza preparar el index selectivo para revisión; todavía no autoriza commit, push, merge ni deploy. La validación de staging y producción sigue pendiente.

## Fuentes y representación canónica

Las referencias principales son los PDF finales proporcionados: america_siglo_xviii_final_corregido.pdf, tratado_tordesillas_corregido_color.pdf y primeros_asentamientos_en_norteamerica.pdf. Tienen una página rasterizada, sin texto extraíble ni geometría SVG reutilizable. Los originales y sus renders de análisis permanecen privados, fuera de public/. No se usó ImageGen para este candidato.

public/js/history-map-geometry.js contiene las capas nativas derivadas de los píxeles de clase. Se simplifican contornos y se eliminan huecos de impresión. Tordesillas conserva exactamente los paths, dimensiones y posición de línea del prototipo aprobado; Asentamientos conserva paths y centros de los puntos negros, nunca posiciones de los círculos numerados. El manifiesto local compara esas geometrías con el snapshot aprobado.

Los JPEG de la etapa anterior permanecen intactos como archivos locales previos, pero ya no se cargan en los mapas nativos ni en las prácticas. Su inclusión en un futuro commit requiere la auditoría de release; este checkpoint no incorpora material privado ni elimina otros trabajos.

## América: asociaciones y corrección

| Área | Asociación de clase |
| --- | --- |
| Alaska | Rusia |
| Groenlandia | Dinamarca |
| Nueva España | España |
| Nueva Francia | Francia |
| Trece Colonias y Jamaica | Inglaterra |
| Brasil | Portugal |
| Florida, Cuba, Puerto Rico | España |
| La Española occidental | Francia |
| La Española oriental | España |
| Nueva Granada, Perú, Río de la Plata | España |
| Guayanas y Antillas Menores | Países Bajos (Holanda), Francia e Inglaterra, según la asociación colectiva del documento |

La Española tiene paths independientes con data-power Francia/España y un detalle del Caribe para ver ambas partes sin ampliar todo el continente. Seleccionar Francia no selecciona la mitad española. Una sola tarjeta de repaso, América colonial en el siglo XVIII, se corrigió para distinguir las dos partes. Sus identidad/posición se conservan, junto a todos los temas y las 154 preguntas habituales de Historia.

Los indígenas no colonizados se distinguen con patrón de puntos, y la disputa con rayado diagonal. La banda de disputa conserva el trazado visual del prototipo desde el PDF; no se asigna a una sola potencia. La cadena de Antillas Menores se reconstruyó a partir de los pequeños anillos negros impresos y se selecciona colectivamente. No se deduce una potencia por cada punto.

## Límites cartográficos internos

El material de clase es un esquema sin proyección ni coordenadas geográficas. Las costas, pequeñas islas, lagos y fronteras se simplifican. No se certifican exactitud geográfica ni fronteras históricas fuera del nivel del documento.

En las Guayanas, las áreas naranja/azul se asocian con Países Bajos/Inglaterra por la leyenda. La mención de Francia procede del rótulo colectivo. Los fragmentos rosados sin identificación individual inequívoca se conservan neutros dentro de esa región; no se convierten en Rusia ni se adjudican arbitrariamente a Francia. También hay manchas rosadas sin rótulo individual junto a Brasil y al noreste de Norteamérica: sus contornos permanecen neutros, sin atribución evaluable. La frontera española/portuguesa no absorbe esas áreas intermedias. Resolver cada fragmento requiere aclaración académica de la fuente.

Las preguntas de Guayanas y Antillas Menores evalúan únicamente el conjunto explícito de tres potencias. No existen ejercicios de propiedad de una isla o microterritorio ambiguo, de una frontera ilustrativa o de toda La Española como una única posesión. Los límites técnicos viven aquí; no se presentan como categorías académicas, opciones ficticias ni preguntas estudiantiles.

## UI y Study Engine

public/js/history-maps.js conserva su API render/renderSessionMap/normalizeContext y añade optionIndex para vincular nombres visibles y potencias con las opciones del motor, incluyendo Países Bajos (Holanda) → Países Bajos. public/css/history-maps.css aplica los tokens existentes, Fraunces/Source Sans 3 y los rellenos categóricos sobrios Light/Dark. El layout aprobado conserva mapa/panel en escritorio y una columna en móvil. Los tres mapas tienen tabs accesibles, leyenda, selección/resaltado, zoom/reset, desplazamiento con puntero/toque o flechas, estudio, identificación, revelado y práctica. La cronología selecciona los mismos cinco marcadores.

El Practice Engine sigue siendo el único evaluador: pistas manuales, dos intentos, explicaciones, resultados, errores, Guardadas y guardar/reanudar. Hay 20 preguntas suplementarias: las cinco hm-asentamientos-* existentes y 15 hm-america-* nuevas, todas con asociaciones explícitas de clase. América ofrece las 15 en Identificar y las 15 más cuatro preguntas habituales en Practicar asociaciones. Asentamientos conserva sus cinco de identificación y cuatro habituales; Tordesillas conserva sus cuatro preguntas habituales. El examen común mantiene 72 preguntas de Europeos, sin mapa/pistas/feedback anticipado.

settings.historyMapStudy mantiene schema 1 y los mismos defaults, IDs de mapa/selección y zoom. session.historyMapId y los IDs anteriores se conservan en snapshots, prácticas portables y resolución de preguntas. No se añade store ni persistencia paralela. Una práctica nueva inicia sin marcadores seleccionados; la selección visual solo cambia cuando el motor acepta la opción. Tras responder, intentar otro marcador no cambia el mapa ni la respuesta guardada. Volver/Escape conserva retorno de foco y Reiniciar guarda la práctica anterior.

## Accesos y evaluación cartográfica

Europeos presenta accesos secundarios junto a Practicar, Repasar y Examen en el panel de Historia. Cada selector también muestra su acceso correspondiente y una referencia discreta a América colonial, Tordesillas y Primeros asentamientos. Una sola función compone y conecta esos accesos; no se crea navegación global ni tres motores.

- Explorar mapas abre el atlas existente en Estudiar, conserva el mapa seleccionado y permite cambiar entre los tres recursos.
- Practicar mapas inicia directamente la práctica del mapa seleccionado (América por defecto). Mantiene la modalidad de asociaciones/identificación elegida en el atlas y las pistas, dos intentos, explicación, resultados y guardar/reanudar del motor compartido.
- Examen de mapas abre una selección independiente de los tres mapas. Incluye 19 preguntas de América, cuatro de Tordesillas y nueve de asentamientos: 32 si se eligen todos. Reutiliza los 12 IDs habituales y los 20 suplementos aprobados; no crea contenido académico nuevo. El examen general mantiene sus 72 preguntas y selecciones sin cambios. La evaluación cartográfica no se marca como examen general completo.

El examen cartográfico usa mode examen, opciones barajadas persistidas, revisión final y entrega del motor existente. Sin pistas, feedback inmediato ni soluciones antes de entregar. Cada pregunta muestra una proyección neutra de la geometría aprobada: no colores de potencia, leyenda, panel contextual, nombres/fechas de asentamientos, leyenda de La Española, atributos de potencia/territorio/selección ni resaltado de respuesta. Los marcadores conservan solo números; el SVG tiene nombre accesible genérico. Se conservan zoom/reset y posición de la línea, sin asociarla con la respuesta. No es una ruta a Practicar.

El origen se captura como metadata opcional de settings/sesión, conserva el foco del acceso y se copia a prácticas portables/resultados. Regresar al atlas enfoca su acción de práctica. Una sesión antigua sin esa metadata conserva la vuelta al atlas/Repasar. La recarga de un examen cartográfico restaura la sesión, incluyendo respuestas contestadas, sin feedback; abandono/navegación siguen el guard del motor. Se corrigió una referencia de sesión indefinida en restoreFinalizedQuestion que impedía revisar preguntas de examen ya respondidas.

La deuda visual futura tiene una única fuente en [ROADMAP.md](../ROADMAP.md#hitos-de-diseño-ya-registrados). Este fix conserva el dashboard, Repasar, la geometría y Batch 2.

## Evidencia del fix de accesos

La matriz vigente vive en [TESTING.md](../TESTING.md#historia--accesos-a-mapas). Evidencias locales ignoradas en .netlify/history-discoverability/: baseline, preservation.json, visual-review.md, logs y capturas de panel, atlas, práctica y examen. El preview local conserva http://127.0.0.1:8765/ con cuentas/Blobs ficticios en memoria.

## QA anterior, preservación y release gate

Matriz y resultados canónicos: [TESTING.md](../TESTING.md#historia--mapas). Evidencias locales ignoradas: .netlify/history-final/, con 32 capturas completas, 12 figuras y cuatro detalles del Caribe; dos capturas de viewport móvil mantienen la barra real. En las imágenes completas móviles se omite solo la barra fija durante la captura para que no tape el recurso; el producto no cambia su navegación. Preview local: http://127.0.0.1:8765/, con backend y cuentas ficticias en memoria.

Se preservan las 154 preguntas, temas, unidades, tarjetas anteriores, historial y datos. Solo cambia la tarjeta colonial indicada. Los 14 hashes de Batch 2/configuración local coinciden; no se inició Batch 2 ni Workflow / Project Memory. Auth, Functions, stores, permisos, Netlify, dependencias y versión no cambian.

Human PASS y la auditoría de alcance están completos. Gate B1 permite seleccionar exclusivamente Historia y soporte autorizado en el index de dev, reflejar el PASS documental y preparar la entrada de Novedades. Después se requiere autorización separada para el commit; el push tampoco queda autorizado por aprobar ese commit. Batch 1, ya aprobado, es la única dependencia de navegación entre staging y dev (4b78002); su promoción y la del commit de Historia requieren un gate posterior. No se permite incorporar Batch 2, archivos locales, JPG anteriores, PDFs ni fotografías.

La producción mantiene main como frontera de aprobación. Main está detrás de las bases de estudio/P0 existentes en staging; promover staging completo arrastraría cambios de otras fases. Antes de producción debe aprobarse el alcance neto y conservarse la versión pública v2.0: dev/staging aún declaran APP_VERSION 0.8.0 por su base previa, sin modificarla en B1. Validación de staging, autorización de main y smoke posterior son gates separados. El rollback deberá conservar compatibilidad con IDs/progreso/sesiones nuevos, sin resetear stores ni datos. Si el alcance no puede aislarse o aparece una dependencia no aprobada, se detiene la promoción.
