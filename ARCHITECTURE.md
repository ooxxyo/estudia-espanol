# Arquitectura del Study Hub

## Estado actual

`public/index.html` contiene estilos, datos académicos, renderizado, navegación, Study Engine y persistencia local. El estado se guarda bajo claves estables de `localStorage`, con respaldo en IndexedDB, y se sincroniza mediante `account.mjs`. Las Functions de cuenta, administración, leaderboard y presencia usan Netlify Blobs; autenticación y rate limiting compartidos viven en `netlify/functions/_shared/`.

## Límites que deben conservarse

- El backend decide identidad y roles; el frontend solo presenta capacidades recibidas.
- Los IDs de preguntas, claves locales y nombres de Blob stores son contratos de compatibilidad.
- Una sesión guarda cola, posición real, respuestas y estado del intento. Revisar preguntas nunca modifica esa posición ni estadísticas.
- Español sigue disponible durante cualquier migración al hub.

## Evolución recomendada

Extraer gradualmente módulos ES, manteniendo primero un único punto de entrada:

1. `public/js/storage.js`: normalización, migraciones, localStorage e IndexedDB.
2. `public/js/api.js`: cuenta, sync, leaderboard, presencia y admin.
3. `public/js/study-engine.js`: sesiones, intentos, navegación y resultados independientes de la materia.
4. `public/js/catalog.js`: materias, temas y resolución de IDs.
5. `public/js/settings.js`: apariencia y preferencias.
6. `public/js/views/`: renderizadores pequeños para panel, práctica, cuenta y administración.

El catálogo futuro debería referenciar `subjectId/topicId/questionId`; un adaptador debe interpretar los datos actuales de Español como el catálogo inicial. No se deben mover datos de usuario hasta que exista lectura dual y una prueba de ida/vuelta.

## Deuda y riesgos

Las funciones extensas de renderizado mezclan HTML, listeners y mutaciones. Se repiten guardado/renderizado, construcción de feedback y manejo de controles. Una extracción masiva elevaría el riesgo de perder listeners, reanudar en un estado incorrecto o sobrescribir progreso cloud. Conviene extraer una frontera por fase, añadir pruebas de regresión y mantener los formatos anteriores durante al menos una versión compatible.
