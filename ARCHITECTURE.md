# Arquitectura del Study Hub

## Estado actual

`public/index.html` conserva el catálogo y Study Engine heredados. `public/history-data.js` contiene Historia; `public/js/` separa cliente API, estado de formularios, migración local, planificación pura y vistas de plataforma. El estado académico conserva claves de `localStorage`, respaldo IndexedDB y sync por `account.mjs`. Community, Calendar, Friends, notificaciones, moderación, búsqueda y Roadmap usan Functions y stores versionados independientes. Autenticación, capabilities, validación académica, utilidades de plataforma y rate limiting viven en `_shared/`.

La navegación académica sigue `Hub → Día → Materia → Unidad/Categoría → Tema`. En teléfono presenta cinco accesos (`Hub`, `Repasar`, `Practicar`, `Cuenta/Entrar`, `Más`); en desktop usa grupos directos de Estudio, Seguimiento, Personal y Gestión sin botón Más. Ambos conservan el contexto y las prácticas pendientes. Las prácticas normales pueden archivarse de forma portable en `settings.pausedPractices` para iniciar otra sin pérdida; la sesión activa continúa en `state.session`. `SUBJECT_CATALOG` conserva metadata de materia y cada entrada declara unidades actuales, anteriores y completadas. Una unidad soporta `id`, `subjectId`, nombre neutral/configurado, tipo y fecha opcionales, estado, orden y topics. Un snapshot antiguo sin contexto se asocia automáticamente con Español y su unidad actual.

La identidad de cuenta se normaliza en backend en seis dimensiones independientes: `username`, `displayName`, `securityRole`, `visibleRank`, entitlement y privacidad. Campos ausentes usan defaults seguros; una cuenta antigua no se reescribe ni duplica para poder mostrarse. `Veterano` representa entitlement gratuito y nunca eleva el rol.

`feedback.mjs` conserva reportes privados en `study-hub-feedback-v1`; `features.mjs` centraliza Early Access. `community.mjs`, `friends.mjs`, `calendar.mjs`, `notifications.mjs`, `moderation.mjs`, `search.mjs` y `roadmap.mjs` forman una base social separada del contenido oficial. `calendar:create` autoriza Admin+ o Veterano sin elevar el rol. Los stores anteriores mantienen sus nombres.

## Límites que deben conservarse

- El backend decide identidad y roles; el frontend solo presenta capacidades recibidas.
- Los IDs de preguntas, claves locales y nombres de Blob stores son contratos de compatibilidad.
- Una sesión guarda cola, posición real, respuestas y estado del intento. Revisar preguntas nunca modifica esa posición ni estadísticas.
- Español e Historia siguen disponibles durante cualquier migración al hub y nunca mezclan bancos ni progreso.
- Una materia no disponible se muestra como `Próximamente`. Matemáticas resuelve su contenido aprobado mediante `math-v1`; no recupera ni crea temas anteriores ajenos al Hub.
- Presence guarda únicamente contexto general saneado, nunca tokens, respuestas, cookies ni IP completa; un heartbeat vence a los 90 segundos.
- Acciones de rol, Veteranía, suspensión, sesiones y borrado se autorizan otra vez en backend. Super Dev es inmutable para roles inferiores.

## Adaptadores actuales

Español usa `contentKey: spanish-v2`. `spanish-vocabulary.js` aporta la unidad actual Competencia en Español, 20 tarjetas y un banco validado; `spanish-legacy-content.js` conserva sin renombrar los 75 IDs anteriores como unidad `test_taken` con fecha 2026-09-14. Historia mantiene `historia-v1` y la unidad `historia-geografia-civilizaciones`. Ciencia mantiene `science-v1` en `science-data.js`, con tres bancos base independientes: Conversiones SI, Densidad y Temperatura. Además conserva snapshots de evaluaciones reales por procedencia; la prueba del 2026-09-24 vive como un snapshot de 20 preguntas reutilizable para repaso sin sustituir ni renombrar los bancos base. Matemáticas usa `math-v1`: `math-data.js` declara exclusivamente el tema DMS aprobado y `math-workspace-config.js` traduce sus ejercicios a pasos A–G. La respuesta `numeric` de Ciencia conserva valor, tolerancia y unidad; la respuesta `math-workspace` guarda grados, minutos y segundos. `math-workspace.js` aporta evaluación, teclado, cálculo DMS, multiplicación vertical y validación por paso sin presentar operaciones futuras como UI. `science-workspace-config.js` y `math-workspace-config.js` son adaptadores sobre ese núcleo. El mismo Study Engine recibe las cinco fuentes. Las sesiones e historial guardan `subjectId` y `unitId`; su ausencia se interpreta como Español para conservar snapshots anteriores. `workspaceByQuestion` persiste los pasos de Ciencia y Matemáticas sin cambiar las claves antiguas. La selección de tema de práctica se persiste por materia en `settings.practiceTopicBySubject`, separada de `activeTopicId`.

Los módulos `hub-ui.js`, `bug-report-ui.js` y `platform-ui.js` contienen Novedades/anuncios, reportes de error y vistas sociales. `index.html` conserva el shell y el Study Engine. Los reportes usan `study-hub-bug-reports-v1`, schema 1, saneamiento doble (cliente/servidor), lectura privada por autor y administración backend para Admin+. El motor mantiene separados el estado del tema, sus evaluaciones y el estado personal de estudio; las sesiones descartadas se registran de forma compacta sin entrar en estadísticas ni historial completado.

Para activar otra materia se debe añadir metadata de materia y unidad, y registrar temas, tarjetas y preguntas bajo una nueva `contentKey`. El mismo Study Engine resuelve el contenido; no se copia el shell ni se inventan ejemplos antes de recibir material real.

El flujo estándar es `material del maestro → materia → unidad → tema → contenido aprobado → repaso → banco → práctica → examen → explicaciones → errores/guardadas/historial → progreso`. Las extensiones específicas se registrarán como capacidades del motor, nunca como forks completos.

## Early Access e IA

Los estados `development`, `experimental`, `preview` y `ready` describen madurez; no publican. Las audiencias `superdev`, `admins`, `veterans`, `selectedUsers` y `members` se evalúan por separado, y usuarios no Super Dev requieren además `enabled=true`. `availability` y `location` vienen del catálogo de código: solo una implementación real puede mostrar “Probar ahora”. Las entradas antiguas `staff/all/state` se leen de forma compatible.

UI Beta y Asistente IA continúan con `availability=unavailable`; no hay botones ni rutas falsas. `approvedAssistantContext()` y `_shared/study-context.mjs` preparan `subjectId`, `subjectName`, `unitId`, `unitName`, `topicId`, `topicName` y contenido aprobado. La materia es el límite máximo, el tema solo prioriza, y una petición de otra materia debe rechazarse. Contenido generado futuro se mantiene separado del material oficial.

## Evolución recomendada

Extraer gradualmente módulos ES, manteniendo primero un único punto de entrada:

1. `public/js/storage.js`: parseo, validación y migración de schema ya extraídos; localStorage e IndexedDB se moverán después.
2. `public/js/api-client.js`: cliente JSON y errores comunes ya extraídos; los adaptadores de cuenta, sync, leaderboard, presencia y admin se migrarán gradualmente.
3. `public/js/study-engine.js`: sesiones, intentos, navegación y resultados independientes de la materia.
4. `public/js/catalog.js`: materias, unidades, temas y resolución de IDs.
5. `public/js/settings.js`: apariencia y preferencias.
6. `public/js/views/`: renderizadores pequeños para panel, práctica, cuenta y administración.

El catálogo futuro debería referenciar `subjectId/topicId/questionId`. No se deben mover datos de usuario hasta que exista lectura dual y una prueba de ida/vuelta; el adaptador actual es la frontera compatible durante esa transición.

## Contratos futuros y bases actuales

- `study-planner.js` calcula niveles y planes 15/30/60 con métricas reales; su integración completa en Dashboard continúa futura.
- Calendar ya referencia materia/unidad/tema, admite propuestas y assignments; grupos, recordatorios y automatización avanzados continúan futuros.
- Community vive separada del banco oficial y pasa por moderación, deduplicación conservadora y doble aprobación para llegar a `official`.
- Contenido generado por IA siempre conservará procedencia y estado de borrador. Solo una aprobación administrativa explícita podrá convertirlo en material oficial.

## Deuda y riesgos

`public/js/platform-ui.js` concentra las vistas sociales y `public/js/platform-extras.js` añade Hoy, grupos propios, Favoritos y Qué estudiar hoy sin mover el Study Engine académico. Favoritos, categorías de Guardadas y estado de tarjetas se guardan dentro de `settings`; snapshots anteriores siguen legibles. System Health es una lectura técnica de stores restringida a Super Dev, no un indicador de salud funcional integral.

Community, Calendar, Notifications, Search y Moderation devuelven `limit`/`cursor`. La paginación limita el payload, pero los listados siguen escaneando hasta 1000 filas; antes de crecer se necesitan índices y cursores nativos de Blob.

Las vistas académicas todavía mezclan HTML, listeners y mutaciones dentro de `index.html`. La plataforma nueva ya está aislada, pero listados Blob realizan scans acotados y necesitarán índices/paginación al crecer. Grupos aplica membresía backend y valida conjuntamente `classGroupId`, materia, `schoolYearId` y `termId`; Admin+ puede administrar grupos sin omitir esas relaciones. Los cambios de año vigente archivan metadata anterior sin borrar grupos, trimestres ni contenido. Conviene mantener extracción por fases, pruebas de regresión y lectura compatible durante al menos una versión.
