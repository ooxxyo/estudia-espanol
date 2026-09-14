# Arquitectura del Study Hub

## Estado actual

`public/index.html` contiene estilos, catálogo, datos académicos, renderizado, navegación, Study Engine y persistencia local. El estado se guarda bajo claves estables de `localStorage`, con respaldo en IndexedDB, y se sincroniza mediante `account.mjs`. Las Functions de cuenta, administración, leaderboard y presencia usan Netlify Blobs; autenticación y rate limiting compartidos viven en `netlify/functions/_shared/`.

La navegación sigue la jerarquía `Hub → Día → Materia → Tema`. `SUBJECT_CATALOG` es la fuente única de metadata (`id`, nombre, emoji, día, estado, disponibilidad y clave de contenido). `activeSubjectId` es metadata opcional de interfaz: datos antiguos que abren una vista de estudio se asocian automáticamente con Español.

La identidad de cuenta se normaliza en backend en seis dimensiones independientes: `username`, `displayName`, `securityRole`, `visibleRank`, entitlement y privacidad. Campos ausentes usan defaults seguros; una cuenta antigua no se reescribe ni duplica para poder mostrarse. `Veterano` representa entitlement gratuito y nunca eleva el rol.

`feedback.mjs` conserva reportes privados en `study-hub-feedback-v1`; su lectura global y cambio de estado requieren rol administrativo. `features.mjs` centraliza Early Access en `study-hub-feature-flags-v1`; las flags `hidden` no se devuelven a usuarios normales. Ambos reutilizan sesiones existentes y el audit log. Los nombres de todos los stores anteriores permanecen intactos.

## Límites que deben conservarse

- El backend decide identidad y roles; el frontend solo presenta capacidades recibidas.
- Los IDs de preguntas, claves locales y nombres de Blob stores son contratos de compatibilidad.
- Una sesión guarda cola, posición real, respuestas y estado del intento. Revisar preguntas nunca modifica esa posición ni estadísticas.
- Español sigue disponible durante cualquier migración al hub.
- Una materia no disponible solo se muestra como `Próximamente`; nunca abre una vista sin motor o contenido.
- Presence guarda únicamente contexto general saneado, nunca tokens, respuestas, cookies ni IP completa; un heartbeat vence a los 90 segundos.
- Acciones de rol, Veteranía, suspensión, sesiones y borrado se autorizan otra vez en backend. Super Dev es inmutable para roles inferiores.

## Adaptador actual

Español usa `contentKey: legacy-espanol-v1`. `subjectContent()` expone sus `TOPICS`, `REVIEW_CARDS` y `Q` al Hub sin moverlos, renombrarlos o duplicarlos. Sus cinco áreas actuales pertenecen a la colección `espanol-v2`; `topicGroups.previous` queda preparado para colecciones futuras que seguirán accesibles.

Para activar otra materia se debe añadir su metadata al catálogo, registrar temas, tarjetas y preguntas bajo una nueva `contentKey`, y hacer que el mismo Study Engine resuelva ese contenido. No se debe copiar el shell ni crear otra aplicación.

El flujo estándar de contenido es `material del maestro → materia → tema → contenido aprobado → repaso → banco → práctica → examen → explicaciones → errores/guardadas/historial → progreso`. Las extensiones específicas se incorporarán como tipos de actividad del motor: vocabulary/listening para Inglés, pasos y fórmulas para Matemáticas, diagramas para Ciencia y cronologías para Historia.

La IA y Design Lab existen solo como flags futuras. Una IA real deberá recibir exclusivamente el material aprobado de la materia y tema activos.

## Evolución recomendada

Extraer gradualmente módulos ES, manteniendo primero un único punto de entrada:

1. `public/js/storage.js`: normalización, migraciones, localStorage e IndexedDB.
2. `public/js/api.js`: cuenta, sync, leaderboard, presencia y admin.
3. `public/js/study-engine.js`: sesiones, intentos, navegación y resultados independientes de la materia.
4. `public/js/catalog.js`: materias, temas y resolución de IDs.
5. `public/js/settings.js`: apariencia y preferencias.
6. `public/js/views/`: renderizadores pequeños para panel, práctica, cuenta y administración.

El catálogo futuro debería referenciar `subjectId/topicId/questionId`. No se deben mover datos de usuario hasta que exista lectura dual y una prueba de ida/vuelta; el adaptador actual es la frontera compatible durante esa transición.

## Deuda y riesgos

Las funciones extensas de renderizado mezclan HTML, listeners y mutaciones. Se repiten guardado/renderizado, construcción de feedback y manejo de controles. Una extracción masiva elevaría el riesgo de perder listeners, reanudar en un estado incorrecto o sobrescribir progreso cloud. Conviene extraer una frontera por fase, añadir pruebas de regresión y mantener los formatos anteriores durante al menos una versión compatible.
