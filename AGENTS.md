# Estudia Español / Study Hub

## Flujo de desarrollo, Git y producción

- Antes de modificar archivos, confirma con `git branch --show-current` que estás en `dev`; si no, detente y avísame.
- Trabaja solamente en `dev` y úsala para desarrollo, pruebas y previews. El proyecto está conectado a Netlify y también puede probarse mediante Deploy Preview.
- `main` despliega a producción y debe contener únicamente versiones aprobadas.
- Nunca hagas commit directamente en `main` sin mi aprobación explícita.
- No hagas push automáticamente; cualquier push a `main` requiere mi autorización.
- No abras ni fusiones Pull Requests a `main` sin mi aprobación. Después del informe de entrega, espera esa aprobación antes de hacer merge.
- No publiques en producción sin mi aprobación.
- Sitio público: <https://estudia-espanol.netlify.app>

## Diseño y calidad

- En flujos académicos, respeta la intención explícita del estudiante: si entra a Practicar, `Practicar` es la acción principal y aparece antes que `Repasar`.
- No uses flechas nativas de `<details>` como patrón principal de navegación. Mantén visible lo importante y agrupa opciones secundarias bajo controles claros como `Más opciones`.
- La navegación normal y el inicio de otra práctica deben guardar automáticamente una práctica normal recuperable cuando sea seguro. Pide confirmación solo si una acción realmente destruye datos.
- Conserva el diseño visual actual. No rediseñes el sitio ni reconstruyas la aplicación desde cero salvo petición explícita.
- Evita duplicar código cuando una función reutilizable sea suficiente y no añadas dependencias externas innecesarias.
- Mantén compatibilidad móvil, especialmente con iPhone, y controles táctiles cómodos.
- No introduzcas errores en modo claro u oscuro ni sacrifiques accesibilidad, contraste visual o usabilidad.

## Compatibilidad y datos

- Conserva las cuentas existentes, el progreso local y sincronizado, historial, errores, guardadas y configuración.
- No borres ni reinicies datos reales durante pruebas o actualizaciones.
- No cambies nombres de stores de Netlify Blobs sin mi autorización.
- Si cambia la estructura de datos, crea una migración compatible con datos antiguos.
- Mantén compatibilidad entre actualizaciones: nunca borres progreso existente y garantiza que las prácticas guardadas sigan siendo recuperables.

## Netlify y backend

- No cambies `netlify.toml`, el publish directory ni el functions directory sin explicar primero por qué.
- Conserva y revisa siempre estas Netlify Functions:
  - `netlify/functions/account.mjs`
  - `netlify/functions/leaderboard.mjs`
  - `netlify/functions/presence.mjs`
  - `netlify/functions/admin.mjs`

## Cuentas, administración y seguridad

- Nunca almacenes contraseñas en texto plano ni pongas secretos, tokens o contraseñas en `public/index.html`.
- No debilites la autenticación ni la recuperación de cuentas.
- Valida Owner/Admin exclusivamente en backend. `OWNER_USERNAME` y `ADMIN_USERNAMES` provienen de variables de entorno de Netlify; nunca escribas sus valores en el repositorio.
- Mantén separados `username`, `displayName`, rol de seguridad, rango visible, acceso/entitlement y privacidad.
- Usa `Veterano` como nombre visible del acceso gratuito por whitelist. Ser Veterano no concede Admin ni otro permiso backend.
- Las cuentas antiguas deben recibir defaults seguros sin duplicarse ni exigir un nuevo registro.
- Impide que usuarios suspendidos inicien sesión o publiquen en el leaderboard.
- Exige confirmación para toda acción destructiva y protege al Owner de acciones administrativas destructivas.
- Registra las acciones administrativas importantes.

## Acceso público, feedback y funciones experimentales

- No actives login obligatorio, pagos, paquetes ni expiraciones hasta que el lanzamiento público sea aprobado explícitamente.
- Mantén `PUBLIC LAUNCH ACCESS` como fase futura; el Hub actual no debe bloquearse por pago o entitlement.
- Early Access contiene únicamente funciones experimentales reales: por ahora UI Beta / Design Lab y Asistente IA.
- En Feature Flags mantén separados `status`, `audience`, `enabled/published` y `availability`; `ready` nunca significa publicada.
- Soporta audiencias `superdev`, `admins`, `veterans`, `selectedUsers` y `members`, con autorización backend para acceso directo.
- No muestres “Probar ahora” si una feature no tiene implementación y ruta reales.
- El feedback de cada usuario es privado salvo para personal autorizado; nunca adjuntes secretos, tokens, contraseñas ni respuestas de examen.
- Protege el envío de feedback con rate limiting server-side.
- Cada materia tendrá su propio asistente futuro: la materia activa es el límite, el tema activo da prioridad y solo se usa contenido académico aprobado.

## Super Dev

- Existe un rol especial `superdev` con jerarquía:
  `superdev > owner > admin > member`.
- El acceso Super Dev debe validarse exclusivamente en backend.
- El código de acceso proviene únicamente de la variable de entorno `DEV_LOGIN_CODE` de Netlify.
- Nunca escribas el valor de `DEV_LOGIN_CODE` en Git, HTML, JavaScript público, logs, README o respuestas de API.
- La cuenta Super Dev usa el username interno `superdev`.
- Owner y Admin nunca pueden suspender, borrar, cerrar sesiones ni modificar permisos de Super Dev.
- Super Dev puede administrar Owner, Admin y miembros normales.
- Super Dev no debe poder borrarse o suspenderse accidentalmente desde el panel.
- El Dev Login debe reutilizar el sistema normal de sesiones y sincronización; no crees un sistema de autenticación paralelo.
- Protege Dev Login con rate limiting server-side.
- Nunca registres contraseñas, códigos de recuperación, tokens de sesión ni `DEV_LOGIN_CODE` en el audit log.

## Leaderboard

- Mantén compatibilidad con las entradas existentes y no borres sus datos al actualizar código.
- Vincula las notas a cuentas.
- Guarda de forma compacta los temas utilizados, número de preguntas, si fue examen completo y mejor nota.

## Comunidad, calendario y privacidad

- Mantén Community separada del material oficial; las confirmaciones nunca publican contenido automáticamente.
- Conserva `Veterano` como entitlement. Solo su capability `calendar:create` está autorizada; no concede moderación ni permisos Admin.
- Aplica el bloqueo social en Friends, perfiles, Community, comentarios y búsqueda, sin exponer emails, sesiones, IP o progreso privado.
- Los aportes, comentarios y eventos usan soft delete cuando corresponda. Acciones de moderación importantes deben quedar auditadas.
- No renombres los stores sociales versionados. Todo modelo persistente nuevo debe declarar schema y migración compatible.
- Roadmap público informa estado, pero nunca concede Feature Access.
- Las vistas sociales deben filtrar y paginar en backend; conocer un `classGroupId` no sustituye la comprobación de membresía.
- Favoritos, categorías de Guardadas y progreso de tarjetas deben conservar snapshots antiguos y seguir siendo privados.

## Académico

- No cambies definiciones del material sin mi permiso.
- No inventes unidades, categorías, vocabulario ni ejercicios; el contenido nuevo debe provenir de material real proporcionado.
- No añadas contenido de monólogo.
- Usa siempre `Interfijo`, nunca `infijo`; su abreviatura es `MDI = Morfema Derivativo Interfijo`.
- Crónica tiene exactamente:
  1. Autor testigo
  2. Exactitud y veracidad
  3. Afán descriptivo
  4. Intención narrativa
  5. Recursos retóricos y literarios

## Versiones

- La versión visible actual es `v2.0`; no cambies el número sin mi autorización.
- Añade cada actualización aprobada a Novedades / Update Log.
- Identifica claramente como experimentales los cambios experimentales.

## Documentación del proyecto

- La jerarquía de contenido es `Hub → Día → Materia → Unidad/Categoría → Tema`; conserva unidades anteriores y completadas.
- No uses el conteo bruto de temas como información principal de una materia; muestra su unidad, propósito configurado y estado.
- `Estudio Hub` y el slug `estudio-hub` son el rebranding futuro; no renombres repositorio, remote ni dominio sin autorización.
- Usa “dispositivo” en textos genéricos y no asumas iPhone salvo que la instrucción sea específica de esa plataforma.
- Consulta `DECISIONS.md` antes de cambiar materias, roles, identidad, acceso o privacidad.
- Mantén `ROADMAP.md` con estados `Planned`, `In Progress`, `Testing` o `Completed`.
- Actualiza `ARCHITECTURE.md` cuando cambien límites entre frontend, motor de estudio, persistencia o backend.
- Registra en `TESTING.md` la matriz mínima y las pruebas de regresión aplicables.
- No marques trabajo como `Completed` hasta que sus pruebas relevantes hayan pasado.

## Pruebas y entrega

Antes de terminar cualquier cambio:

- valida el JavaScript de `public/index.html`;
- valida todas las Netlify Functions;
- revisa `git diff` y `git status`;
- prueba login, progreso, leaderboard, admin y guardar/reanudar práctica cuando el cambio pueda afectarlos;
- reporta cualquier problema pendiente.

Entrega un resumen con:

1. archivos modificados;
2. funciones añadidas o eliminadas;
3. pruebas ejecutadas;
4. resultado de las pruebas;
5. `git status`;
6. cualquier riesgo pendiente;
7. URL de preview, si existe.
