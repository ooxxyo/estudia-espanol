# Guía de pruebas

## Historia — Accesos a mapas

Estado **Testing**, Human PASS confirmado; validación de staging/producción pendiente. Contrato en [Historia — Mapas](docs/history-maps.md#accesos-y-evaluación-cartográfica). Pruebas con cuentas y Blobs ficticios en memoria. Gate B1 prepara el index selectivo y Novedades, sin commit, push, merge ni deploy.

- Panel de Europeos: tres accesos secundarios junto a sus modalidades; cada selector ofrece su entrada correspondiente. Explorar abre Estudiar; Practicar inicia el mapa elegido sin desviar a Repasar; Examen abre una selección independiente.
- Práctica: pistas manuales, dos intentos, resultados y guardar/reanudar. Volver restaura el foco del acceso o de la acción del atlas. Intercalar otro acceso no sustituye el origen de la sesión. Prácticas antiguas sin metadata de origen siguen regresando al atlas.
- Examen: recorrer las 32 preguntas de los tres mapas y comprobar SVG neutro, atributos, nombres accesibles, ausencia de pistas, feedback/clases de corrección y resultados previos a entregar. Evaluar selección vacía/parcial, rechazo de abandono, reload antes y después de responder, revisión de pregunta contestada, entrega real y resultado. El examen general sigue con 72 preguntas y sus defaults sin suplementos.
- Matriz visual 1440×900 / 390×844, Light/Dark: panel, accesos, atlas, práctica con pista, selección y pregunta de examen. Sin overflow ni errores de consola. Capturas completas móviles omiten solo la barra fija durante la captura; las capturas adicionales de viewport conservan la navegación real.
- Preservación por hashes contra baseline: banco completo, SVG, metadatos/preguntas cartográficas, unidades anteriores, CSS previo y 14 archivos de Batch 2/configuración. Revisión independiente de origen, snapshots y examen; no hallazgos pendientes tras correcciones.

Resultado del 8 oct 2026: **353/353 Node**; matriz amplia **73 Playwright PASS y 1 omisión prevista**; repetición final de mapas/accesos **28/28 PASS**, incluyendo sesiones antiguas. Tras el último guard para prácticas normales, accesos se repite con **10/10 PASS**. No sumar pasadas como casos independientes. JavaScript inline y 29 módulos Netlify válidos; Oxlint focalizado y diff check. Se reprodujeron antes de corregir el acceso ausente, la referencia de sesión indefinida al restaurar una respuesta de examen y el retorno equivocado de una práctica antigua después de visitar Examen de mapas.

Comandos/evidencia: `node --import ./tests/register-blobs.mjs --test tests/*.test.mjs`; Playwright con `.netlify/history-discoverability/playwright.config.mjs` para `history-map-access`, `history-maps`, `history-europeos`, `history-units-navigation`, `study-hub` y `accessibility`; validación `.netlify/history-final/validate.mjs`; preservación `.netlify/history-discoverability/preservation.mjs`. Logs, screenshots e informe en `.netlify/history-discoverability/`. Preview http://127.0.0.1:8765/. Human PASS confirmado; dispositivo físico y release pendientes. B1 autoriza index selectivo; sin commit/push/merge/deploy.

## Historia — Mapas

Alcance académico, fuentes, geometría, compatibilidad y límites canónicos: [Historia — Mapas](docs/history-maps.md). Estado Testing, Human PASS confirmado y promoción pendiente. El harness usa cuentas/Blobs ficticios en memoria, sin contacto con datos reales.

- Tres mapas nativos sin imágenes raster cargadas. Contrastar capas/leyendas/respuestas de Alaska, Brasil, Groenlandia, Trece Colonias, Jamaica y territorios españoles. La Española occidental/oriental tiene paths y preguntas distintos. Guayanas/Antillas se evalúan colectivamente; no hay categorías o preguntas técnicas.
- Desktop 1440×900 y Mobile 390×844, Light/Dark: selección, tabs, cronología, leyenda, zoom/reset, retorno de foco, Estudiar/Identificar/Practicar, revelado y reload. Teclado y controles táctiles. Sin overflow horizontal; Axe sin violations bloqueantes en mapas y flujos compartidos.
- Práctica: pistas manuales, dos intentos, explicación, resultados; guardar/reload/reanudar conserva respuesta/pista/mapa. Reiniciar guarda la anterior. Enter en zoom/marcador/opción no responde; iniciar sin selección y rechazar cambios de marcador después de responder. Fallo de carga del módulo de geometría conserva opciones textuales y navegación.
- Regresión: 154 preguntas anteriores idénticas; todos los temas y geometría aprobada de Tordesillas/Asentamientos intactos; solo una tarjeta colonial corregida. Examen de Europeos conserva sus 72 preguntas. Progreso, Mayas, Guardadas, sesiones, login, roles/Admin, suspensión y accesibilidad se comprueban con el harness. Batch 2/configuración conserva 14 hashes.

Comandos de esta revisión:

```powershell
node --import ./tests/register-blobs.mjs --test tests/*.test.mjs
node node_modules/@playwright/test/cli.js test --config .netlify/history-final/playwright.config.mjs tests/e2e/history-maps.spec.mjs tests/e2e/history-europeos.spec.mjs tests/e2e/history-units-navigation.spec.mjs tests/e2e/accessibility.spec.mjs tests/e2e/study-hub.spec.mjs
node .netlify/history-final/validate.mjs
node .netlify/history-final/preservation.mjs
node node_modules/oxlint/bin/oxlint public/js/history-maps.js public/js/history-map-geometry.js public/history-data.js tests/history-maps.test.mjs tests/e2e/history-maps.spec.mjs
git diff --check
graphify update .
```

Resultado del 8 oct 2026: **352/352 Node**. Matriz amplia: **63 Playwright PASS y 1 omisión prevista** del caso exclusivo móvil en desktop (Historia/retorno, accesibilidad, Study Hub y 16 casos de mapas). Tras añadir la resolución Países Bajos (Holanda) → Países Bajos, la repetición final focalizada de Mapas pasa **18/18** e incluye la selección desde SVG y opción textual. No se suman ambas ejecuciones como casos independientes. Un script inline, tres módulos de Historia y los 29 módulos Netlify válidos; Oxlint focalizado y diff check válidos. Graphify actualizado con AST, sin extracción LLM. WebKit táctil 390 px comprueba los tres mapas, leyenda, selección y zoom/reset; no sustituye un dispositivo físico.

Los defectos de selección vacía, cambio de resaltado tras responder y ausencia de Antillas se reprodujeron con tests fallidos antes de corregirse. Revisión independiente final: sin hallazgos pendientes. Una ejecución preliminar compartió carpeta de artefactos entre dos procesos Playwright y produjo ENOENT al cerrar una traza de Cuenta/Login; la ejecución final serial, con salida aislada, pasa ese caso sin cambios de auth.

Evidencia: .netlify/history-final/final-node-tests.log, final-browser-tests.log, final-map-tests.log, preservation.json y visual-review.md. El preview http://127.0.0.1:8765/ es exclusivamente local con datos sintéticos. Safari físico, Human PASS, staging y producción siguen pendientes; no hay stage, commit, push ni deploy.

## Historia — Europeos

Alcance, estructura académica y límites canónicos: [Historia — Europeos](docs/history-europeos.md). Estado Testing, Human PASS confirmado y promoción pendiente. Los tests usan datos sintéticos; no borran cuentas, progreso ni stores reales.

- Banco: IDs únicos, cuatro opciones distintas y una correcta, pistas específicas sin copiar la respuesta, explicaciones, referencias de temas/unidades y asociaciones de clase. Comparar con HEAD los objetos académicos anteriores: deben seguir idénticos.
- Desktop 1440×900 y móvil táctil 390×844, Light/Dark: Historia → Europeos → uno/varios/todos los temas → Repasar → Practicar conservando contexto → Pista bajo demanda → acierto con explicación → primer fallo/reintento → segundo fallo con solución → siguiente pregunta. Verificar no overflow, controles táctiles y Axe sin violations serious/critical en selección, repaso, examen y resultados.
- Persistencia: selección vacía sigue vacía tras reload e impide iniciar; preguntas y opciones no cambian al guardar/recargar/reanudar. Empezar otra práctica guarda la anterior y permite recuperarla con respuestas y pistas. Un snapshot antiguo de Mayas conserva unidad, selección, guardadas y progreso. Entrar a Europeos no crea progreso falso.
- Human Review fix: dashboard con dos unidades y sin etiquetas permanentes; grupos colapsados al entrar, expansión por teclado/toque, `aria-expanded` coherente, 18/8 filas y progreso sintético exacto sin mutar estadísticas. Volver y Escape desde Repasar/Practicar/Examen preservan selección y devuelven foco/origen; Escape cierra Más primero. Reentrar permite iniciar práctica/examen, y Guardar y salir → Volver → reanudar conserva respuestas y pistas.
- Examen: un tema, conjunto y todos disponibles; sin Pista ni feedback inmediato; cancelar abandono mantiene respuestas; confirmar entrega revela nota, correctas/incorrectas y explicaciones. Resultados → Practicar lo fallado reutiliza el motor. Leaderboard de Español, login/logout, roles, suspensión, administración y presence se comprueban con el harness existente.

Comandos focalizados:

```powershell
node --import ./tests/register-blobs.mjs --test tests/history-europeos.test.mjs tests/study-continuity.test.mjs tests/practice-discard-hints.test.mjs tests/platform.test.mjs tests/spanish-vocabulary.test.mjs tests/core-study-p0.test.mjs tests/ui-simplification.test.mjs
npx playwright test tests/e2e/history-europeos.spec.mjs tests/e2e/study-hub.spec.mjs tests/e2e/accessibility.spec.mjs
git diff --check
graphify update .
```

Validar además el script inline de `public/index.html` con `vm.Script`, `node --check` para todos los `.mjs` de `netlify/functions/` y Oxlint focalizado. Conservar evidencia final y logs en `.netlify/history-europeos/`. El preview usa `node --import ./tests/register-blobs.mjs ./tests/browser-server.mjs` con `STUDY_HUB_ENV=local-test` y Blobs en memoria. No se considera prueba física de Safari ni prueba remota de Netlify.

Resultado local del 7 oct 2026: **98/98** checks Node; **14/14** escenarios Historia Playwright; **12/12** checks de accesibilidad general y Axe adicional dentro de los flujos de Historia; **13** regresiones Study Hub pasan y **1** caso solo móvil se omite en desktop por diseño. JavaScript inline, banco, 29 módulos Netlify, Oxlint focalizado y `git diff --check` pasan. La regresión de enlaces de Mayas se reprodujo antes de corregirla y pasa después. Se inspeccionaron capturas de repaso, selección, práctica y resultados; se conservaron 24 capturas Desktop/Mobile y Light/Dark. Comparación con HEAD: objetos académicos anteriores idénticos. Manifiesto de Batch 2/configuración: 14 hashes comprobados, cero cambios. HTTP 200 para `/` y `/history-data.js` en el preview local. Sigue pendiente la revisión académica/manual humana y la prueba física de Safari.

Resultado del Human Review fix, 8 oct 2026: **98/98 Node**; **34/34 Playwright** en la pasada final (8 agrupación/retorno de Historia, 12 navegación y 14 QA tools). La pasada de regresión del mismo fix también validó **14/14 Historia**, **12/12 accesibilidad general** y **13 Study Hub**, con **1** omisión desktop prevista para el caso exclusivo móvil. Los dos fallos iniciales de contraste del dashboard dark se corrigieron y los ocho casos focalizados pasaron después con Axe sin violations serious/critical. Revisión independiente sin hallazgos concretos. Evidencia ANTES/DESPUÉS: 16 pares en `.netlify/history-europeos-fix/visual-review.md`. Banco académico idéntico al snapshot previo del fix; 14 hashes Batch 2/configuración local intactos. Permanece pendiente la aprobación humana y Safari físico.

La última repetición focalizada pasó **8/8** e incluye además iniciar Examen completo tras volver a entrar con los dos temas conservados, comprobar sus ocho preguntas y ausencia de pista, salir con confirmación y comenzar luego una práctica con esos temas. Validación final: un script inline y los 29 módulos Netlify válidos; hashes académicos y 14 hashes de Batch 2 intactos; `git diff --check` pasa y Graphify actualizado sin extracción LLM.

Para reutilizar el preview ya abierto se usó una configuración local ignorada que importa la configuración existente y habilita `webServer.reuseExistingServer`; no se modificó `playwright.config.mjs`:

```powershell
npx playwright test --config=.netlify/history-europeos-fix/playwright.config.mjs tests/e2e/history-units-navigation.spec.mjs tests/e2e/history-europeos.spec.mjs tests/e2e/study-hub.spec.mjs tests/e2e/accessibility.spec.mjs
npx playwright test --config=.netlify/history-europeos-fix/playwright.config.mjs tests/e2e/history-units-navigation.spec.mjs tests/e2e/navigation.spec.mjs tests/e2e/qa-tools.spec.mjs
```

## Cierre 3T y límites de evidencia remota


3T está Completed por decisión de alcance basada en 7C previamente certificado, runtime conservado y validación local. La matriz de personas, integridad protegida y evidencia remota saneada vive en `docs/qa-7c-bootstrap.md`. No repetir bootstrap, resets, 6/6 ni smoke remoto para este cierre.

- **VERIFIED:** configuración/deploy QA privado y Home accesible en Work.
- **PREVIOUSLY CERTIFIED:** cinco personas, roles, baselines, versión de sesión, Owner/qa:tools e integridad de 7C.
- **NOT VERIFIED:** en el smoke asistido, Account, navegación crítica completa, desktop/mobile, login Owner, qa:tools, baseline, sessionVersion y logout. No significa FAILED.
- **NOT OBSERVABLE:** conteos completos de consola, red y escrituras académicas del smoke asistido; null no equivale a cero.
- **DEFERRED / NON-BLOCKING:** Playwright remoto por Netlify Private SSO; smoke asistido INCOMPLETE / NON-BLOCKING. No declarar PASS, fallo de producto ni causa raíz determinada.

Pruebas focalizadas finales: `node --import file:///C:/Users/sebas/Documents/estudia-espanol/tests/register-blobs.mjs --test tests/platform.test.mjs tests/qa-remote-seed-reset.test.mjs tests/qa-tools.test.mjs tests/qa-inspect.test.mjs tests/qa-personas-ui.test.mjs tests/qa-personas-ui-client.test.mjs tests/qa-session-ui.test.mjs tests/qa-session-ui-client.test.mjs tests/remote-smoke.test.mjs`. Suite unitaria: el mismo loader con `--test ./tests/*.test.mjs`. Todo usa Blobs ficticios en memoria; importar/probar el runner no ejecuta su smoke remoto.

El checkpoint tiene 21 pruebas en memoria para entrada exacta, orden, mismas instancias, ABORT, cierres, diagnóstico agregado sin secretos, guard intacto y ausencia de persistencia. Las regresiones WIP finales prueban que sin DEV_LOGIN_CODE no nace una sesión Super Dev y sin QA_SEED_TOKEN el seed devuelve 401 sin escrituras, incluso ocultas. Lint, sintaxis y whitespace completan la ronda; no reabrir suites de navegador ya certificadas sin invalidación runtime real. CI, SSO automatizado permanente y QA remoto extensivo quedan fuera de este cierre; el último pertenece a pre-beta.

## Personas QA — bloque 7C

- Unitarias con Blobs en memoria: `node --import ./tests/register-blobs.mjs --test tests/qa-personas-ui.test.mjs tests/qa-personas-ui-client.test.mjs`.
- Navegador local, escritorio y móvil: `node node_modules/@playwright/test/cli.js test --config tests/qa-personas-ui.playwright.config.mjs`. El servidor exige Blobs sintéticos y escucha únicamente en loopback. No ejecuta QA remoto.
- Cubrir 404 fuera de QA exacto/flag deshabilitado, 401/403, SuperDev sin/con su flag de autenticación, allowlist cerrada, índices inconsistentes sin writes, registros normales con IDs nuevos, conservación de credenciales y datos ajenos, baselines, roles y autoinvalidación de Owner.
- UI: confirmación individual, misma procedencia, bloqueo de doble envío, verificación server-side tras reset, detención sin reintentos ante error, login real sin sync y limpieza del campo password. No capturar pantallas, traces ni snapshots de credenciales reales o páginas con recovery visible.
- Matriz operativa, rollback y Approval Gate: `docs/qa-7c-bootstrap.md`. Las credenciales locales cifradas y sus herramientas de entrega quedan fuera del repositorio.

### Diagnóstico mínimo de reset — 7C

El panel autorizado muestra en `#qa-diagnostic` el último intento de esta carga, como JSON saneado mediante `textContent`. No persiste en localStorage/sessionStorage, archivos ni logs; una recarga pierde esta evidencia. Solo registra username de la allowlist, stage/errorCode fijos del cliente, `httpStatus` del reset y `verificationHttpStatus` del GET posterior (enteros 100–599 o null), y los booleanos `requestPrepared`, `fetchStarted`, `responseReceived`, `jsonParsed`, `postVerificationStarted`, `postVerificationFinished`. Los primeros cuatro describen el POST; los últimos dos indican verificación iniciada y completada con baseline/rol válidos. No registra runId, errores originales, payloads, URLs, headers, respuestas completas ni credenciales.

Stages: `prepare_request`, `fetch_started`, `response_received`, `response_non_ok`, `response_parse_failed`, `server_reported_failure`, `post_verify_started`, `post_verify_failed`, `complete`. Los códigos locales distinguen preparación, fetch, HTTP, parsing, resultado inválido y verificación; `SERVER_REPORTED_FAILURE` solo significa que el payload tiene `ok:false`, no identifica una etapa interna del servidor. `complete` con ambos booleanos de verificación false reconoce el reset propio de Owner y exige reautenticación; no certifica su baseline posterior. La capacidad sigue detrás del gate existente QA exacto/flag/capability y no modifica qa-reset, auth, baselines ni stores.

Pruebas cliente: fallo antes de fetch, red, non-2xx sin parsear el cuerpo, JSON inválido, `ok:false`, identidad inesperada, fallo de verificación por red/HTTP/JSON/baseline, éxito, Owner pendiente de reautenticación, concurrencia y exclusión de material sensible ficticio. Todo error oculta el formulario y bloquea siguientes submits en esta carga, sin retry ni continuación. Pruebas del endpoint: diagnóstico únicamente en HTML autorizado; 404 sin interfaz fuera de QA o con flag deshabilitado. Navegador local: diagnóstico visible en escritorio/móvil, fallo HTTP saneado y sin overflow; datos exclusivamente sintéticos en memoria.

## Inspección QA de solo lectura — 7C

`node --import ./tests/register-blobs.mjs --test tests/qa-inspect.test.mjs` usa exclusivamente datos ficticios. El guard registra e impide set/setJSON/delete/deleteAll incluso si se oculta el error; compara todos los objetos antes/después. Cubrir QA exacto/flag, 401/403, Owner/SuperDev real, allowlist/query/métodos, versión e ID, baselines, ausencia de secretos, cambios de contenido/metadatos, stores desconocidos, límites, revocación final, identidades huérfanas y dos lecturas inestables sin reintento propio. Verificar strong en catálogo/stores/listados/objetos y auth existente, fallo final sin segunda invocación SDK, envelope inválido y fallo tardío sin snapshot parcial. Una prueba adicional usa el SDK instalado con transporte simulado sin red: permite un retry interno de lectura y comprueba agotamiento acotado sin retry de Study Hub. No convertir huellas iguales en una garantía transaccional o histórica; revisar cambios de actividad esperada sin ocultarlos. Procedimiento: `docs/qa-7c-readonly.md`.

## Validación automática mínima

Antes de entregar cambios, extrae el único `<script>` inline de `public/index.html` y ejecútalo con `node --check -`. Valida después cada módulo:

```powershell
Get-ChildItem netlify/functions -Recurse -Filter *.mjs |
  ForEach-Object { node --check $_.FullName }
git diff --check
git status --short --branch
```

Ejecuta además las Functions contra Netlify Blobs en memoria:

```powershell
node --import ./tests/register-blobs.mjs --test ./tests/*.test.mjs
```

No uses datos ni stores reales para pruebas destructivas. Los dobles de Netlify Blobs deben ejecutarse en memoria.

## Matriz de regresión

- **Hub:** Día 1 y Día 2, materias como filas editoriales, estados, fecha local, progreso y acceso a Novedades. Próximamente debe separar evaluaciones con fecha oficial de evaluaciones confirmadas cuya fecha exacta sigue pendiente, sin imponerles orden cronológico falso.
- **Materias y unidades:** Hub → Español/Historia/Ciencia/Matemáticas → unidad → tema → herramienta → Hub; Inglés muestra `Memoir` sin habilitar un banco inexistente, Salud sigue `Próximamente` y Español muestra `Pendiente de confirmación` sin inventar tema. Matemáticas contiene solamente Grados decimales a DMS y no recupera temas matemáticos antiguos.
- **Matemáticas:** comprobar los ejemplos aprobados `89.125° → 89° 7′ 30″` y `23.3486° → 23° 20′ 55″`; pasos A–G, valor posicional, dígitos, alineación, acarreos, productos parciales, suma, colocación manual del punto, conteo decimal, redondeo y respuesta final. Validar Aprender (guiado → ayuda → menos ayuda → independiente), práctica normal, examen de práctica, persistencia de `workspaceByQuestion`, aislamiento por materia y fecha de examen `null`.
- **Ciencia:** tres bancos base aislados (SI ≥25, Densidad ≥35, Temperatura ≥35) más snapshot separado e intacto de la prueba real del 2026-09-24 con exactamente 20 preguntas y procedencia `teacher_assessment`. La evaluación del 2026-09-30 contiene únicamente Temperatura; SI y Densidad permanecen como material evaluado disponible. Mantener examen mixto únicamente explícito; tres fórmulas de densidad, seis de temperatura, `K` sin grado, procedimiento detallado, tolerancia numérica y unidad obligatoria. En toda pregunta numérica, comprobar Formula Workspace (objetivo, fórmula/regla, sustitución, operación, resultado y unidad), teclado contextual, corrección por pasos y persistencia al navegar; fórmula/ayuda y calculadora permanecen secundarias sin perder respuesta. Mini examen, Examen y Examen mixto muestran “Examen de práctica” y reutilizan el workspace.
- **Historia:** contenido actual y anterior según [Historia — Europeos](docs/history-europeos.md); matriz actual en [Historia — Europeos](#historia--europeos). Mantener el tercer mundo antiguo como información incompleta. La próxima evaluación está confirmada con `date: null`, `dateStatus: pending` y descripción provisional “Próxima semana”; verificar “Fecha por confirmar”, ausencia de viernes o `YYYY-MM-DD` inventado y sustitución futura de la fecha sin cambiar el ID ni el historial.
- **Contexto:** navegación desktop y móvil conserva materia, unidad, tema, filtros, respuestas y posición al pasar por Hub o Más.
- **Navegación / 3F-C Batch 1:** validar la IA canónica de `DECISIONS.md`: barra mobile Hub → Repasar → Más → Practicar → Cuenta/Entrar; desktop Principal, Estudio, Tu estudio, Accesos secundarios y Cuenta. Cuenta no se duplica dentro de Más, ni Más desktop repite destinos del rail. Resumen identifica conceptualmente la materia activa; no agrega progreso global. Guardado → Favoritos → Guardado y Hoy → Qué estudiar hoy → Hoy conservan acceso para invitado y sesión ficticia; `favorites`/`studyToday` seleccionan visualmente Guardado/Hoy sin migrar estado. Validar `progreso → dashboard`, Administración condicional, `aria-current`, Escape, inert, trampa/retorno de foco, safe areas, targets y ausencia de overflow. Practicar sigue siendo la acción principal cuando compite con Repasar dentro de una pantalla académica.
- **Práctica:** rápida (10), intermedia (25), normal, por tema, errores y guardadas.
- **Respuesta:** selección múltiple, verdadero/falso, texto, segmentación y evidencia; primer error, segundo intento, pista, salto y feedback.
- **Navegación:** Anterior, Siguiente y Volver a pregunta actual sin alterar cola, respuestas ni estadísticas.
- **Persistencia:** pausar antes y después de responder, recargar, reanudar y terminar; al iniciar otra práctica normal comprobar guardado automático sin modal, toast breve, recuperación desde Prácticas guardadas y confirmación solo al descartar. Conservar historial, errores, Guardadas y configuración.
- **Descarte y pistas:** `Guardar y salir` conserva cola, índice, respuestas, selección, intentos, workspace y `hintLevel`; cancelar la confirmación de descarte no cambia la sesión, y confirmar elimina únicamente la sesión incompleta sin tocar historial ni otras prácticas ni dejar `Continuar práctica`. Auditar las 461 preguntas que pueden entrar en Practicar: cada una debe resolver al menos una pista útil, no vacía ni placeholder. Comprobar Pista en selección múltiple, verdadero/falso, texto, numérica y Math Workspace, persistencia tras guardar/reanudar, `aria-expanded`, foco/Escape/targets táctiles del diálogo, EXPAND 220 ms y reduced motion. Examen no muestra ni restaura pistas antes de entregar.
- **Continuidad de examen y resultados:** guardar el tamaño de examen como preferencia opcional por materia, restaurarlo tras navegar o recargar sin mezclar materias, conservar la vista lógica de origen de la sesión y regresar a ella desde Resultados; una sesión antigua sin origen debe usar `Examen` o `Practicar` según su modo.
- **Core Study P0:** comprobar Repasar, Practicar, Examen y Resultados en 1440×900, 430×932, 390×844 y 320×568, claro/oscuro, sin overflow ni movimiento del shell. Mantener `Materia · Tema` durante la sesión, progreso con semántica accesible, opciones como botones de teclado, selección visible, targets ≥44 px y disclosures secundarios. Examen no muestra pistas, feedback ni respuestas antes de entregar; Resultados usa solo nota, aciertos, tiempo, temas y errores reales de la sesión, sin afirmar dominio o readiness. Reduced motion elimina animación de progreso, press y expansión.
- **QoL móvil:** en 320×568, 375×667, 390×844, 430×932 y 1280×720 comprobar métricas de materia en dos columnas compactas, ausencia de overflow horizontal, `Ver` de contraseña con objetivo táctil de 44×44 px y acarreos/punto decimal del Math Workspace cómodos sin alterar su alineación.
- **Historial accesible:** cada respuesta empieza colapsada como `details/summary`, conserva estado correcto/incorrecto/saltado, respuesta, explicación y procedimiento, y puede abrirse con teclado o toque sin cambiar el historial persistido.
- **Selector de examen:** cada tamaño expone `aria-pressed`; la preferencia restaurada y cada selección actualizan a la vez el estado visual y el atributo accesible.
- **Apariencia:** Claro, Oscuro, Automático y color personalizado en desktop y viewport móvil; recarga y cambio del esquema del sistema.
- **Design System P0 y aislamiento:** validar `public/design-system-p0.html` en claro, oscuro, movimiento normal/reducido y forced-colors cuando esté disponible; comprobar namespace `[data-shds="p0"]`, tokens/clases `--shds-*`/`.shds-*`, contraste AA, foco visible, teclado, objetivos táctiles ≥44 px, ausencia de overflow en 320×568, 390×844, 430×932 y 1280×720, las siete categorías PRESS/ENTER/EXIT/MOVE/EXPAND/SUCCESS/MILESTONE con MILESTONE entre 480–600 ms, y ausencia de partículas, toast o textarea sin consumidor P0. La muestra Guardadas debe recorrer guardar → quitar → guardar por teclado, sincronizar icono/texto/`aria-pressed`/nombre accesible y eliminar escala o spring con movimiento reducido. En producción, `[data-shds-shell="p0"]` comparte solo tokens: los componentes `.shds-*` permanecen exclusivos del laboratorio.
- **Shell + Home P0:** comprobar Home con y sin una práctica normal recuperable, orden Continuar → Estudiar → Próximamente → También puedes, Día 1/2 y metadata académica intacta. Validar branding compacto `S` + `Study Hub` + `v0.8.0`, y acceso contextual `Entrar` logged out / `Cuenta` logged in sin alterar los cinco destinos móviles. Source Sans 3 permanece solo en shell/Home e Inter en vistas internas; `aria-current` sigue visible. PRESS 120 ms, EXIT 190 ms, ENTER 260 ms, MOVE 280 ms y EXPAND 220 ms usan `transform`/`opacity`. Verificar transición perceptible y corta en Hub ↔ Historia, Hub ↔ Ciencia, Hub → Matemáticas, Repasar, Cuenta y Más → destino; View Transitions es progresivo y el fallback conserva ENTER. Reload, autosave, restauración y re-render no animan. Revisar claro/oscuro, reduced motion casi inmediato, foco y Escape en Más, retorno del foco al activador correcto, safe areas, objetivos táctiles y ausencia de overflow en 320×568, 375×667, 390×844, 430×932, 1280×720 y 1440×900.
- **Cuenta/cloud:** login por username/email, remember me, logout/login, sync, resolución de conflicto y usuario antiguo sin campos nuevos.
- **Auth + Account P0:** comprobar Entrar, Registro, Recuperación, Cuenta conectada y Configuración en 1440×900, 390×844 y 320×568, claro/oscuro, teclado y movimiento reducido. Mantener IDs, autocompletado, payloads, confirmación de logout, objetivos táctiles ≥44 px, feedback `aria-live`, selección de pestaña/tipo con estado accesible, sin overflow y sin ENTER adicional durante reload o render silencioso.
- **QA Tools server-side:** `STUDY_HUB_ENV` ausente, inválido o distinto de `production|qa|local-test` cae en `production`; `QA_TOOLS_ENABLED` requiere `true` exacto. La Function de capabilities devuelve `404` en producción, `401` sin sesión válida, `403` para Member/Admin/Owner sin opt-in y `200` con únicamente `qa:tools` para Owner o SuperDev autorizado. Una cuenta privilegiada suspendida debe quedar denegada mediante la autenticación existente.
- **Seed/reset QA remoto:** ejecutar las regresiones con Blobs en memoria; `qa-seed` y `qa-reset` deben devolver `404` en producción, entorno ausente/desconocido o QA Tools deshabilitado. Seed acepta solo `POST`, header `X-QA-Seed-Token`, `runId` válido y las cinco cuentas canónicas completas; repetirlo conserva IDs, reemplaza hashes e invalida sesiones sin filtrar credenciales. Reset exige sesión Owner/SuperDev real con `qa:tools`, acepta una sola cuenta allowlisted, restaura únicamente cuenta/progreso, conserva datos ajenos/globales y explicita la reautenticación al resetear al caller. Auditar acción, target, scope, run y resultado sin password, hash, cookie, token o `DEV_LOGIN_CODE`.
- **Browser server local seguro:** iniciar exclusivamente con `$env:STUDY_HUB_ENV='local-test'; node --import ./tests/register-blobs.mjs ./tests/browser-server.mjs`. El servidor aborta antes de cargar Functions si el entorno no es `local-test` o si el loader no expone el sentinel del mock de Blobs en memoria; credenciales Netlify heredadas no cambian ese backend. Cada arranque limpia y regenera `qa-student-new` (sin progreso), `qa-student` (progreso pequeño), `qa-admin`, `qa-owner` y `qa-suspended`. Los E2E obtienen una cookie sintética local mediante `/__test/persona/<username>`; no se guarda `storageState`, no se usa `DEV_LOGIN_CODE` y `/__test/superdev` permanece solo como regresión legacy.
- **Playwright local:** `npm run test:e2e` ejecuta Chromium Desktop 1440×900 y Chromium Mobile 390×844; `npm run test:e2e:headed` conserva la misma matriz con navegador visible. Cubrir carga/Home sin errores fatales, sesión y logout tras reload, límites Student/Admin/Owner/suspended y `qa:tools`, práctica guardada/reanudada y navegación móvil sin overflow. La configuración arranca un browser-server nuevo con `STUDY_HUB_ENV=local-test`, no reutiliza servidores y conserva traces/screenshots solo ante fallos.
- **Owner QA Tools local:** la UI obtiene `qa:tools` exclusivamente desde la Function autorizada y conserva en `sessionStorage` solo la preferencia visual, nunca la capability. Developer / QA aparece únicamente para Owner/SuperDev autorizado y el panel QA únicamente en Practicar; validar ocultación inmediata al cambiar cuenta o perder capability, ausencia en Examen y producción, autorrelleno correcto/incorrecto determinista mediante controles reales, completar ejercicio y práctica por el flujo normal, y cancelación segura al salir, cambiar sesión/pregunta o perder acceso. Los tipos actuales soportados son selección múltiple, verdadero/falso, texto, numérica, segmentación, evidencia y Math Workspace; un tipo futuro sin adaptación segura debe quedar deshabilitado y explicarlo, sin improvisar respuestas ni modificar directamente puntuación, progreso, dominio o historial.
- **Axe + Playwright:** `npm run test:e2e:a11y` revisa Home, Cuenta/Login, Practice y Administración Owner en Chromium Desktop y Mobile; la misma spec también forma parte de `npm run test:e2e`. Fallan todas las violations `critical` y `serious`, además de las reglas `region` y `page-has-heading-one` por ser regresiones estructurales claras. Cada failure resume rule id, impacto, selector, detalle y help URL; hallazgos `moderate/minor` restantes se adjuntan y se reportan sin bloquear. No hay baseline inicial: cualquier excepción futura debe nombrar regla, superficie y justificación, nunca ocultarse globalmente. Axe es una red de regresión, no sustituye QA manual de teclado, lector de pantalla, zoom/text resize, claridad cognitiva, touch targets, motion/reduced motion, contraste visual ni Astra.
- **Oxlint gradual:** `npm run lint:js` revisa `public`, `netlify/functions` y `tests` con la categoría `correctness` en nivel warning. Las categorías `style`, `pedantic`, `perf` y `suspicious` permanecen desactivadas porque su diagnóstico inicial produjo ruido no accionable; no usar autofix masivo. Toda excepción debe ser local, mínima y explicar la intención. `--deny-warnings` queda como endurecimiento futuro cuando el conjunto activo se mantenga estable y limpio.
- **Dev Design Lab local:** servir el repositorio localmente y comprobar `dev/design-lab.html` con estados logged out, nuevo, normal, con progreso y Owner Preview en las cinco pantallas. Fuera de hostname local debe bloquearse; al estar fuera de `public/` no entra en el publish. Las fixtures no usan red, storage, cookies, sesión, claims, permisos ni `dev-login`; Owner Preview nunca habilita controles reales. Owner, Analytics, System Health y Community futuros permanecen desactivados y sin implementación.
- **Identidad:** cuenta antigua/nueva, fallback de displayName, rango, Veterano independiente de Admin y entitlement sin paywall.
- **Branding, versión y rol visible:** `Study Hub` usa tile `S` y `v0.8.0` pequeño en el branding del shell, Más y Configuración; no aparece `v2.0` en Shell/Home. El rol interno `superdev` conserva permisos y contratos, pero su label visible es `Owner` y no aparece “Superdev”, “Super Dev” ni “Super Developer”.
- **Admin:** permisos `superdev > owner > admin > member`, búsqueda, filtros, detalle, Veteranía, alta/baja Admin, suspensión, reactivación, sesiones, borrado fuerte y audit log.
- **Presence:** heartbeat, timeout de 90 segundos, contador, contexto saneado y ausencia de tokens/IP/respuestas.
- **Feedback:** crear, listar propios, privacidad entre usuarios, filtros Admin, estados y rate limiting.
- **Early Access:** solo UI Beta e IA; probar los cuatro status, cinco audiencias, publicación independiente, selectedUsers y migración de `state/staff/all`.
- **Acceso:** Super Dev, Admin, Veterano, Member y usuario seleccionado; `ready + disabled`, audiencia incorrecta y endpoint directo deben quedar bloqueados.
- **Disponibilidad:** una feature sin implementación muestra “Todavía no disponible para pruebas.” y nunca ofrece “Probar ahora”.
- **IA por materia:** contexto Español e Historia con subject/unit/topic y contenido aprobado; una materia distinta devuelve el mensaje de cambio de materia.
- **Sync:** éxito real, fallo sin falso positivo, conflicto y reintento; conservar práctica recuperable.
- **Académico:** 105 IDs en el mismo orden, Interfijo/MDI visible, alias INF solo para compatibilidad y auditoría de longitud/distribución sin reescritura automática.
- **Backend:** suspensión, audit log, rate limiting, leaderboard y protección de Super Dev.
- **Compatibilidad:** cargar un snapshot sin `activeSubjectId`, `activeUnitId`, `subjectId` ni `unitId`, conservar claves/IDs y reanudar una sesión antigua como Español dentro de su unidad por defecto; comprobar progreso separado de Historia.
- **Community:** crear, confirmar una vez, comentar, ownership, bloqueo, reportar, rate limit y doble aprobación antes de `official`.
- **Friends:** self-request y duplicados bloqueados; aceptar, rechazar, cancelar, eliminar, bloquear/desbloquear y guardar privacidad sin emails.
- **Calendar y grupos:** member propone; Veterano publica sin ser Admin; Admin+ aprueba; duplicate flag y assignments con estado personal separado. Verificar miembro/no miembro, acceso directo con `classGroupId`, búsqueda privada, “Lo que dieron hoy”, relaciones grupo–materia–año–trimestre y conservación histórica al cambiar el año vigente.
- **Notificaciones:** cada usuario ve solo las propias; unread, mark read, mark all read y preferencias.
- **Roadmap/Search:** Roadmap no concede acceso; búsqueda excluye contenido restringido o autores bloqueados.
- **Responsive plataforma:** Community, Calendar, Personas, Notificaciones, Roadmap y Bug Center a 1280×720, 390×844 y 320×568, sin overflow ni errores de consola.
- **Competencia:** validar 20 entradas, ≥120 preguntas, cobertura por tipo y significado, distribución A/B/C/D, duplicados, respuestas flexible/estricta, mini exámenes 5/10/15/20 y revisión previa.
- **Contexto:** acceso directo a Repasar/Practicar/Examen no recupera `lastVisitedTopicId`; seleccionar, salir, cambiar materia y continuar requieren acciones explícitas sin borrar progreso ni sesión.
- **Bugs:** reporte normal/automático, saneamiento, privacidad por autor, administración, auditoría y candidato duplicado sin cierre automático.
- **Guest/account:** Hub público, CTA Crear cuenta e Iniciar sesión, selección correcta de pestaña y práctica local sin crear un sistema de auth paralelo.
- **Esta fase local:** paginar Community, Calendar, Notifications, Search y Moderation; probar perfil limitado y bloqueo, filtros de fecha/año/trimestre, Dashboard Hoy, favoritos, flashcards, categorías de Guardadas y System Health exclusivo de Super Dev.

## Evidencia de entrega

Registra comandos, resultado, errores de consola, rutas probadas, navegador/viewport y riesgos pendientes. Una prueba manual no se considera aprobada si altera datos reales o requiere revelar secretos.

## Logout QA — 3T / 7C

Contrato canónico: `ARCHITECTURE.md`, «Cierre de sesión QA automatizable». `node --import ./tests/register-blobs.mjs --test ./tests/qa-session-ui.test.mjs ./tests/qa-session-ui-client.test.mjs` cubre QA/flag exactos, 404 en producción/desconocido, Member/suspended actual, rechazo de targets/origen/query/payload, expiración HttpOnly, sesión actual invalidada y GET account anónimo. Compara todos los stores antes/después permitiendo solo eliminar la sesión actual; preserva otras sesiones y progreso, prueba fallos finales y cliente sin reintentos/doble POST ni exposición de errores sensibles.

`node --import ./tests/register-blobs.mjs --test ./tests/qa-session-ui.browser.mjs` usa Chromium independiente, loopback y el sentinel de Blobs en memoria. Desktop/mobile comprueban cookie eliminada por respuesta del logout real, ausencia de diálogos, GET account anónimo, storage académico/preferencias idénticos, cookie Netlify ficticia en otro host intacta y recarga sin otro logout. No usa el navegador del usuario, datos remotos ni secretos reales. QA-session está publicado y 7C previamente certificado; las verificaciones pendientes del smoke asistido permanecen NOT VERIFIED y no se infieren de estas pruebas locales.

## 3F-C Batch 1 — evidencia local y revisión humana

`tests/ui-simplification.test.mjs` prueba composición, destinos, guards y selección legacy. `tests/e2e/navigation.spec.mjs` recorre la navegación real en Chromium desktop 1440×900 y mobile 390×844, Light/Dark, con el harness `local-test` y Blobs ficticios en memoria. Incluye Más abierto/cerrado, Escape, ciclo de foco y retorno, inert, selección, invitado/Member/Owner, enlaces transitorios y práctica navegada/recargada/reanudada con respuesta y materia intactas. Axe cubre rail/barra y Más; las regresiones existentes conservan cobertura de login, progreso, leaderboard y Admin.

Las capturas usan un contador sintético de presencia idéntico mediante una respuesta de transporte exclusiva del test; no cambian el producto ni el comportamiento de presencia real. La navegación puede marcar visto, sincronizar o producir otros efectos existentes en el backend ficticio; no se presenta como read-only. No se utiliza Netlify/SSO, datos remotos ni storageState persistente.

Secuencia visual: automatización → accesibilidad/técnico → story completo → Desktop Light/Dark y Mobile Light/Dark → inspección activa de Work → findings → revisión de screenshots del usuario. Los artefactos locales quedan fuera de Git. Batch 1 permanece pendiente de aprobación visual; pruebas verdes no autorizan commit/push/deploy ni cierran 3F-C. Integración de Hoy, Guardado final e iconografía completa siguen en lotes 3, 5 y 2.
