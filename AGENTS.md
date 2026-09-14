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
- Impide que usuarios suspendidos inicien sesión o publiquen en el leaderboard.
- Exige confirmación para toda acción destructiva y protege al Owner de acciones administrativas destructivas.
- Registra las acciones administrativas importantes.

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

## Académico

- No cambies definiciones del material sin mi permiso.
- No añadas contenido de monólogo.
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
