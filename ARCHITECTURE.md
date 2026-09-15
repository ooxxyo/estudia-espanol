# Arquitectura del Study Hub

## Estado actual

`public/index.html` contiene estilos, catálogo, datos académicos de Español, renderizado, navegación, Study Engine y persistencia local. `public/history-data.js` contiene el paquete académico aprobado de Historia. El estado se guarda bajo claves estables de `localStorage`, con respaldo en IndexedDB, y se sincroniza mediante `account.mjs`. Las Functions de cuenta, administración, leaderboard y presencia usan Netlify Blobs; autenticación y rate limiting compartidos viven en `netlify/functions/_shared/`.

La navegación académica sigue `Hub → Día → Materia → Unidad/Categoría → Tema`. El shell global presenta cinco accesos (`Hub`, `Repasar`, `Practicar`, `Cuenta/Entrar`, `Más`); `Más` agrupa herramientas secundarias sin borrar el contexto ni la práctica pendiente. `SUBJECT_CATALOG` conserva metadata de materia y cada entrada declara unidades actuales, anteriores y completadas. Una unidad soporta `id`, `subjectId`, nombre neutral/configurado, tipo y fecha opcionales, estado, orden y topics. Un snapshot antiguo sin contexto se asocia automáticamente con Español y su unidad actual.

La identidad de cuenta se normaliza en backend en seis dimensiones independientes: `username`, `displayName`, `securityRole`, `visibleRank`, entitlement y privacidad. Campos ausentes usan defaults seguros; una cuenta antigua no se reescribe ni duplica para poder mostrarse. `Veterano` representa entitlement gratuito y nunca eleva el rol.

`feedback.mjs` conserva reportes privados en `study-hub-feedback-v1`; su lectura global y cambio de estado requieren rol administrativo. `features.mjs` centraliza Early Access en `study-hub-feature-flags-v1`. Solo registra UI Beta e IA y separa `status`, `audience`, `enabled`, `availability` y `location`. El endpoint decide acceso también ante consultas directas; ocultar controles nunca sustituye autorización. Ambos reutilizan sesiones y audit log. Los stores mantienen sus nombres.

## Límites que deben conservarse

- El backend decide identidad y roles; el frontend solo presenta capacidades recibidas.
- Los IDs de preguntas, claves locales y nombres de Blob stores son contratos de compatibilidad.
- Una sesión guarda cola, posición real, respuestas y estado del intento. Revisar preguntas nunca modifica esa posición ni estadísticas.
- Español e Historia siguen disponibles durante cualquier migración al hub y nunca mezclan bancos ni progreso.
- Una materia no disponible solo se muestra como `Próximamente`; nunca abre una vista sin motor o contenido.
- Presence guarda únicamente contexto general saneado, nunca tokens, respuestas, cookies ni IP completa; un heartbeat vence a los 90 segundos.
- Acciones de rol, Veteranía, suspensión, sesiones y borrado se autorizan otra vez en backend. Super Dev es inmutable para roles inferiores.

## Adaptadores actuales

Español usa `contentKey: legacy-espanol-v1`. `subjectContent()` expone `TOPICS`, `REVIEW_CARDS` y `Q` sin moverlos, renombrarlos o duplicarlos. Los cinco temas existentes pertenecen a `espanol-unidad-actual`, mostrada como `Unidad actual`; no se le asigna examen, quiz u otro propósito que no venga de metadata oficial. Historia usa `historia-v1` y la unidad `historia-geografia-civilizaciones`, de tipo `Prueba` y estado `current`. El mismo motor recibe sus ocho topics, tarjetas y preguntas. Las sesiones e historial nuevos guardan `subjectId` y `unitId`; su ausencia se interpreta como Español para conservar snapshots anteriores. `subjectUnits()` también interpreta el contrato anterior `topicGroups`.

Para activar otra materia se debe añadir metadata de materia y unidad, y registrar temas, tarjetas y preguntas bajo una nueva `contentKey`. El mismo Study Engine resuelve el contenido; no se copia el shell ni se inventan ejemplos antes de recibir material real.

El flujo estándar es `material del maestro → materia → unidad → tema → contenido aprobado → repaso → banco → práctica → examen → explicaciones → errores/guardadas/historial → progreso`. Las extensiones específicas se registrarán como capacidades del motor, nunca como forks completos.

## Early Access e IA

Los estados `development`, `experimental`, `preview` y `ready` describen madurez; no publican. Las audiencias `superdev`, `admins`, `veterans`, `selectedUsers` y `members` se evalúan por separado, y usuarios no Super Dev requieren además `enabled=true`. `availability` y `location` vienen del catálogo de código: solo una implementación real puede mostrar “Probar ahora”. Las entradas antiguas `staff/all/state` se leen de forma compatible.

UI Beta y Asistente IA continúan con `availability=unavailable`; no hay botones ni rutas falsas. `approvedAssistantContext()` y `_shared/study-context.mjs` preparan `subjectId`, `subjectName`, `unitId`, `unitName`, `topicId`, `topicName` y contenido aprobado. La materia es el límite máximo, el tema solo prioriza, y una petición de otra materia debe rechazarse. Contenido generado futuro se mantiene separado del material oficial.

## Evolución recomendada

Extraer gradualmente módulos ES, manteniendo primero un único punto de entrada:

1. `public/js/storage.js`: normalización, migraciones, localStorage e IndexedDB.
2. `public/js/api.js`: cuenta, sync, leaderboard, presencia y admin.
3. `public/js/study-engine.js`: sesiones, intentos, navegación y resultados independientes de la materia.
4. `public/js/catalog.js`: materias, unidades, temas y resolución de IDs.
5. `public/js/settings.js`: apariencia y preferencias.
6. `public/js/views/`: renderizadores pequeños para panel, práctica, cuenta y administración.

El catálogo futuro debería referenciar `subjectId/topicId/questionId`. No se deben mover datos de usuario hasta que exista lectura dual y una prueba de ida/vuelta; el adaptador actual es la frontera compatible durante esa transición.

## Deuda y riesgos

Las funciones extensas de renderizado mezclan HTML, listeners y mutaciones. Se repiten guardado/renderizado, construcción de feedback y manejo de controles. Una extracción masiva elevaría el riesgo de perder listeners, reanudar en un estado incorrecto o sobrescribir progreso cloud. Conviene extraer una frontera por fase, añadir pruebas de regresión y mantener los formatos anteriores durante al menos una versión compatible.
