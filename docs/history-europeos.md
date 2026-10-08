# Historia — Europeos

**HISTORY FINAL HUMAN PASS confirmado el 8 de octubre de 2026** para Europeos, organización/navegación, los tres mapas SVG y sus accesos. El trabajo sigue en Testing para la promoción a staging. Gate B1 autoriza únicamente preparar el index selectivo de Historia y su entrada en Novedades; commit, push, merge y deploy requieren autorización separada. El contrato de mapas y los gates de release viven en [Mapas](history-maps.md). Batch 2 permanece excluido.

## Contenido y procedencia

Unidad actual: `historia-europeos`, Europeos — Exploración y colonización europea de América. Fuente exclusiva: diapositivas y apuntes de clase pegados por el usuario en esta tarea; sin web ni sustitución por conocimiento general. Se conservan las asociaciones explícitas del curso, incluida Hudson / New Amsterdam en 1625 según la diapositiva, 1637 para Hutchinson y 1654 para la llegada / presencia de judíos.

El banco nuevo contiene **72 preguntas de selección múltiple**, cuatro por tema, con cuatro opciones distintas, una correcta, pista específica y explicación. El repaso contiene **45 tarjetas** que incluyen los detalles de mapas, cronología, personas, lugares, consecuencias y diversidad. Los mapas se representan mediante listas de texto, sin fronteras nuevas. Los datos ejecutables son canónicos en `public/history-data.js`.

| Tema | ID (prefijo `euro-`) |
| --- | --- |
| Vikingos y primeras exploraciones | vikingos |
| Razones de la exploración europea | razones |
| Cambios en Europa | cambios |
| Tratado de Tordesillas | tordesillas |
| Exploradores europeos | exploradores |
| Inglaterra y la colonización | inglaterra |
| Primeros asentamientos | asentamientos |
| Jamestown y Powhatan | jamestown |
| Plymouth y los peregrinos | plymouth |
| Competencia europea y América colonial | competencia |
| Consecuencias de conquista y colonización | consecuencias |
| Las Trece Colonias | colonias |
| Gobierno y autogobierno | gobierno |
| Religión y diversidad | religion |
| Trabajo y esclavitud | trabajo |
| Conflictos y expansión | conflictos |
| Sociedad colonial y legado | legado |
| Cronología, personas, lugares y relaciones críticas | relaciones |

La unidad anterior `historia-geografia-civilizaciones` conserva los ocho temas, 27 tarjetas y 82 preguntas con sus IDs y objetos académicos intactos. Historia tiene 154 preguntas en total. Cambiar la metadata a `previous` no concede `completed`, `mastered`, 100 % ni nuevos intentos. Su acceso permanece en el dashboard existente de Historia como unidad anterior; no hay una sección adicional dentro de Europeos. La evaluación pendiente conserva su ID y fecha por confirmar y acompaña ahora a la unidad actual; la evaluación tomada permanece en la anterior.

## Integración y límites

Se reutilizan `subjectContent`, `unitTopics`, `startSession`, `renderRepasoCards`, `renderSession`, `submitAnswer`, `finishSession`, `renderResults`, práctica de errores y recuperación de sesiones. La selección múltiple usa controles y estilos existentes, comparte selección entre modos, permite seleccionar todos o limpiar y deshabilita el inicio vacío. Practicar mantiene prioridad al entrar en esa herramienta. El repaso conserva el conjunto de temas al pasar a Practicar. Opciones aleatorias mantienen su orden visual al guardar, recargar o reanudar; las preguntas no se duplican dentro de una cola normal. Los handlers compartidos de temas y tarjetas resuelven su unidad real, conservando enlaces anteriores de Favoritos y búsqueda.

La práctica conserva el contrato de **dos intentos**: un primer fallo invita a reintentar; después del segundo muestra solución y explicación. Una respuesta acertada muestra explicación inmediata. Examen no ofrece pistas ni feedback previo; conserva confirmaciones de abandono y entrega y revisión final. Resultados permiten practicar lo fallado.

No se añadieron repetición espaciada de errores dentro de una sesión, otra persistencia, dashboard, analytics ni extensión del leaderboard: el leaderboard existente publica únicamente Español. La incorporación posterior de mapas de clase se documenta en [Historia — Mapas](history-maps.md). Repaso conserva los temas al recargar, pero su índice de tarjeta sigue siendo temporal como en el motor actual. QA móvil usa Chromium táctil a 390×844; no sustituye una prueba física de Safari/iPhone. La matriz y comandos están en [TESTING.md](../TESTING.md#historia--europeos).

## Preservación e integración humana

### Corrección tras Human Review — 8 de octubre de 2026

Estado de ese checkpoint anterior: **HISTORY — EUROPEOS / FIX APPLIED — READY FOR HUMAN REVIEW**. El Human PASS final posterior queda registrado al inicio de este documento; no reanuda 3F-C.

El dashboard existente presenta solo las dos unidades: Europeos — actual, con descripción y 18 temas disponibles; Geografía y grandes civilizaciones — anterior, con ocho temas. Se retiraron las etiquetas permanentes de temas. Cada unidad ofrece Practicar, Repasar y Examen, con Practicar como acción principal conforme a las reglas del proyecto.

Progreso por tema se divide en dos grupos inicialmente colapsados. Mostrar/Ocultar usa botones con `aria-expanded` y `aria-controls`, activables mediante teclado o toque. Al abrir aparecen los 18 u ocho temas respectivos. Cada fila sigue usando `computeMastery()`; no se agrega un porcentaje global ni se modifica el progreso o el estado de la unidad anterior.

Los tres selectores incluyen Volver. Durante la navegación actual se conserva la vista y unidad de origen y se devuelve el foco al control que abrió el selector; si ya no existe, se enfoca el encabezado. Escape cierra primero Más cuando está abierto y, después, permite volver desde el selector. Tras recargar, el origen temporal tiene como fallback el dashboard de Historia. Estos selectores son páginas, sin botón X ni diálogo nuevo. La selección sigue compartida entre modos y el retorno no inicia ni descarta sesiones; Guardar y salir y reanudar siguen en el motor existente.

Se ajustó el contraste de estados y botones del dashboard de Historia para Light/Dark con los tokens existentes. No se modificó `public/history-data.js` durante esta corrección: su SHA-256 coincide con la copia previa. Los 14 archivos del manifiesto de Batch 2 y configuración local continúan intactos.

**Iconos / emojis: DEFERRED para el Icon System SVG de 3F-C Batch 2 y migraciones visuales posteriores.** Incluye emojis de los temas anteriores y glyphs provisionales de Europeos. No se migraron ni se creó un sistema provisional.

Evidencia local de esta corrección: `.netlify/history-europeos-fix/visual-review.md`, con 16 pares ANTES/DESPUÉS de dashboard y selectores en Desktop/Mobile y Light/Dark. Los resultados y comandos viven en [TESTING.md](../TESTING.md#historia--europeos).

Archivos específicos del fix: `public/index.html`, `public/css/study-hub-study-p0.css`; este informe, `ARCHITECTURE.md`, `ROADMAP.md`, `TESTING.md`; `tests/study-continuity.test.mjs`, `tests/spanish-vocabulary.test.mjs`, `tests/e2e/study-hub.spec.mjs`, `tests/e2e/accessibility.spec.mjs`, `tests/e2e/navigation.spec.mjs`, `tests/e2e/qa-tools.spec.mjs` y el nuevo `tests/e2e/history-units-navigation.spec.mjs`. Helpers añadidos: `historyUnitOverviewHtml`, `historyUnitProgressHtml`, `historySelectorFocusSelector`, `historySelectorBackHtml`, `leaveHistorySelector` y `wireHistorySelectorBack`. No se eliminaron funciones del motor.

Estado inicial: rama `dev`, HEAD `4b780025c7df70749adac3deabc99d123dfc8beb`, sin tracked modificados ni staged. Nuevos archivos de Batch 2: `public/js/icons.js`, `public/js/ui-state.js` y `tests/ui-primitives.test.mjs`; además había `.codex/` local.

Se preservaron en su sitio y se creó una copia con manifiesto SHA-256 en `.netlify/history-europeos/batch2-snapshot/`, ignorada por Git. No se editó, descartó ni integró ese trabajo. Graphify generó el grafo AST local mediante `graphify update .`; sus archivos nuevos siguen untracked.

Preview local con el harness existente y Blobs en memoria: `http://127.0.0.1:8765/`. Usa datos sintéticos y no contacta stores reales. La evidencia visual se conserva en `.netlify/history-europeos/evidence/` después de las comprobaciones. No se cambió la versión ni se publicó una entrada de Novedades: el cambio espera aprobación humana.

## Archivos y funciones de la entrega

Producto: `public/history-data.js`, `public/index.html`, `public/css/study-hub-study-p0.css`.

Documentación modificada: `DECISIONS.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `TESTING.md`. Documento nuevo: este informe.

Pruebas modificadas: `tests/platform.test.mjs`, `tests/practice-discard-hints.test.mjs`, `tests/spanish-vocabulary.test.mjs`, `tests/study-continuity.test.mjs`, `tests/ui-simplification.test.mjs`, `tests/e2e/study-hub.spec.mjs`, `tests/e2e/accessibility.spec.mjs`. Nuevas: `tests/history-europeos.test.mjs`, `tests/e2e/history-europeos.spec.mjs`.

Helpers nuevos: `europeMC` (reutiliza `mc`), `setReviewTopicContext`, `historyStudyUnit`, `historySelectedTopics`, `historyTopicPickerHtml`, `bindHistoryTopicPicker`, `renderHistoryStudyHome`. No se elimina ninguna función del motor. Cambios de funciones existentes: selección/filtro múltiple en repaso y examen, unidad real en sesión, orden visual persistido en opciones y lectura de su índice canónico para feedback.

Backend, autenticación, roles, stores, dependencias, versión y configuración Netlify siguen intactos. Los resultados de verificación viven en TESTING.md; no se marcan fases posteriores Completed.
