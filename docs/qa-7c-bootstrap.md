# 3T — QA remoto, bloque 7C

Estado: preparado y probado localmente; no publicado ni aprovisionado.

## Límites

El proyecto QA permanece privado. Producción real y main están fuera del alcance. Ningún commit, push, cambio de roles/variables, registro de cuentas, reset o despliegue se ejecuta sin el Approval Gate humano. Los datos y accesos existentes se conservan.

## Interfaz

Ruta: `/.netlify/functions/qa-personas-ui`. GET exige QA exacto y flag habilitado. Sin sesión válida solo ofrece una entrada para qa-owner usando el login normal; no recibe controles de reset ni resúmenes. Member/Admin quedan excluidos. Owner/SuperDev autorizado recibe cinco opciones y confirmación para una cuenta, sin reset global. El servidor vuelve a validar la sesión y allowlist en qa-reset; ocultar un botón no concede permisos.

El acceso del panel no sincroniza progreso local. Después del registro normal, cerrar las pestañas del Hub antes de normalizar para evitar que tareas de autosync reescriban baselines. No borrar localStorage ni datos previos. Antes de cada registro, verificar que la identidad QA no exista; el endpoint normal también rechaza duplicados.

## Roles y datos

OWNER_USERNAME y ADMIN_USERNAMES admiten conjuntos de usernames separados por espacios, comas o punto y coma, normalizados a minúsculas. Añadir qa-owner y qa-admin únicamente al contexto de publicación QA, conservando todos los nombres anteriores y los valores de otros contextos. No almacenar los valores de despliegue en este documento versionado.

La precedencia backend es superdev, lista Owner, lista Admin, securityRole admin y member. SuperDev necesita además el flag de autenticación propio en la sesión. Rango y entitlement no conceden rol.

qa-reset conserva ID, username, password, recovery y createdAt. Restaura displayName, privacidad, rango, entitlement, status y progreso canónico; incrementa sessionVersion y actualiza updatedAt. Si una persona QA tenía email, elimina su índice email. Restaura su índice username y registra una auditoría saneada. No elimina objetos de sesión: los invalida por versión. No toca datos sociales/feedback/leaderboard ni stores globales; tampoco hay borrado global.

El orden será qa-student-new, qa-student, qa-admin, qa-suspended y qa-owner. La persona student recibe exactamente 4 respuestas, 3 correctas, rachas 2, 300 segundos y colecciones vacías; las otras cuatro quedan sin objeto de progreso. Suspended queda suspendida; las demás activas. Owner va última, exige reautenticación y comprobación final de todas las personas mediante resúmenes server-side.

## Credenciales y ejecución

Credenciales temporales independientes, aleatorias y exclusivamente QA. Generarlas en memoria en Work; no pegar secretos en chat ni imprimirlos. Respaldar passwords cifrados antes de registrar; capturar cada recovery en memoria mediante lectura focalizada sin snapshots y guardar solo el sobre cifrado. Usar exportación cifrada local verificada y fuera de Git. La clave privada local permanece protegida por Windows DPAPI CurrentUser; Work recibe solo la clave pública. Si se pierde el contexto entre registro y exportación, detenerse sin registrar duplicados ni resetear cuentas desconocidas.

No cambiar QA_SEED_TOKEN ni DEV_LOGIN_CODE y no ejecutar qa-seed. Toda ejecución real se limita al proyecto QA y al patch aprobado sobre staging. Ante una diferencia de proyecto, parent commit, roles o identidades preexistentes, detenerse antes de modificar datos.

## Rollback

Código: volver a publicar el último deploy QA aprobado y restaurar configuración de roles, con nueva aprobación. No revertir main ni hacer force-push. El rollback de código no revierte Blobs.

Roles: restaurar los valores anteriores del contexto modificado y desplegar QA para aplicarlos; no revocar usuarios previos. Sesiones nuevas de cuentas QA deben dejar de heredar esos roles tras la restauración.

Cuentas/reset: no borrar cuentas como rollback automático. Un reset de baseline no tiene undo; solo se autoriza para las cinco cuentas recién creadas y comprobadas, cuyos datos son descartables. Si el bootstrap queda parcial, conservar lo creado, documentar el estado y pedir aprobación antes de reintentar operaciones sensibles. No tocar superdev/testmem.

Vault: no borrar automáticamente credenciales o claves; mantenerlas protegidas para recuperación. Su eliminación definitiva requiere aprobación explícita.
