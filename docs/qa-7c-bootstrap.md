# 3T — QA remoto, bloque 7C

Estado: **Completed**. Bootstrap remoto 7C cerrado; cinco personas QA READY. QA-session, qa-inspect v2 y diagnóstico de reset READY / DEPLOYED. 3T — QA / Test Access Foundation: **Completed**, por decisión de cierre con certificaciones acumuladas y limitaciones remotas no bloqueantes.

## Límites

El proyecto QA permanece privado. Producción real y main están fuera del alcance. Ningún commit, push, cambio de roles/variables, registro de cuentas, reset o despliegue se ejecuta sin el Approval Gate humano. Los datos y accesos existentes se conservan.

## Interfaz

Ruta: `/.netlify/functions/qa-personas-ui`. GET exige QA exacto y flag habilitado. Sin sesión válida solo ofrece una entrada para qa-owner usando el login normal; no recibe controles de reset ni resúmenes. Member/Admin quedan excluidos. Owner/SuperDev autorizado recibe cinco opciones y confirmación para una cuenta, sin reset global. El servidor vuelve a validar la sesión y allowlist en qa-reset; ocultar un botón no concede permisos.

El acceso del panel no sincroniza progreso local. Después del registro normal, cerrar las pestañas del Hub antes de normalizar para evitar que tareas de autosync reescriban baselines. No borrar localStorage ni datos previos. Antes de cada registro, verificar que la identidad QA no exista; el endpoint normal también rechaza duplicados.

## Roles y datos

OWNER_USERNAME y ADMIN_USERNAMES admiten conjuntos de usernames separados por espacios, comas o punto y coma, normalizados a minúsculas. Añadir qa-owner y qa-admin únicamente al contexto de publicación QA, conservando todos los nombres anteriores y los valores de otros contextos. No almacenar los valores de despliegue en este documento versionado.

La precedencia backend es superdev, lista Owner, lista Admin, securityRole admin y member. SuperDev necesita además el flag de autenticación propio en la sesión. Rango y entitlement no conceden rol.

qa-reset conserva ID, username, password, recovery y createdAt. Restaura displayName, privacidad, rango, entitlement, status y progreso canónico; incrementa sessionVersion y actualiza updatedAt. Si una persona QA tenía email, elimina su índice email. Restaura su índice username y registra una auditoría saneada. No elimina objetos de sesión: los invalida por versión. No toca datos sociales/feedback/leaderboard ni stores globales; tampoco hay borrado global.

El orden ejecutado y certificado fue qa-student-new, qa-student, qa-admin, qa-suspended y qa-owner. La persona student recibe exactamente 4 respuestas, 3 correctas, rachas 2, 300 segundos y colecciones vacías; las otras cuatro quedan sin objeto de progreso. Suspended queda suspendida; las demás activas. Owner va última, exige reautenticación y comprobación final de todas las personas mediante resúmenes server-side.

## Credenciales y ejecución

Credenciales temporales independientes, aleatorias y exclusivamente QA. Generarlas en memoria en Work; no pegar secretos en chat ni imprimirlos. Respaldar passwords cifrados antes de registrar; capturar cada recovery en memoria mediante lectura focalizada sin snapshots y guardar solo el sobre cifrado. Usar exportación cifrada local verificada y fuera de Git. La clave privada local permanece protegida por Windows DPAPI CurrentUser; Work recibe solo la clave pública. Si se pierde el contexto entre registro y exportación, detenerse sin registrar duplicados ni resetear cuentas desconocidas.

Durante el Gate de bootstrap no se cambiaron QA_SEED_TOKEN ni DEV_LOGIN_CODE ni se ejecutó qa-seed. Después, un Gate separado retiró ambos valores únicamente de QA; deben permanecer ausentes y no se reintroducen. No repetir bootstrap, registros ni resets al cerrar 3T. Toda futura operación sensible requiere su propio Gate sobre QA/staging, conservando producción y datos ajenos.

## Rollback

Código: volver a publicar el último deploy QA aprobado y restaurar configuración de roles, con nueva aprobación. No revertir main ni hacer force-push. El rollback de código no revierte Blobs.

Roles: restaurar los valores anteriores del contexto modificado y desplegar QA para aplicarlos; no revocar usuarios previos. Sesiones nuevas de cuentas QA deben dejar de heredar esos roles tras la restauración.

Cuentas/reset: no borrar cuentas como rollback automático. Un reset de baseline no tiene undo; solo se autoriza para las cinco cuentas recién creadas y comprobadas, cuyos datos son descartables. Si el bootstrap queda parcial, conservar lo creado, documentar el estado y pedir aprobación antes de reintentar operaciones sensibles. No tocar superdev/testmem.

Vault: no borrar automáticamente credenciales o claves; mantenerlas protegidas para recuperación. Su eliminación definitiva requiere aprobación explícita.

## Certificación acumulada de 7C

Certificación final: commit `74027725c6cb937f62ea44c81559eeeda2562dec`, deploy QA `6ac24b460af80200087e8613`. Estado **PREVIOUSLY CERTIFIED**, no reejecutado durante el cierre de 3T.

| Persona | ID QA certificado | Rol | Status | sessionVersion | Baseline |
| --- | --- | --- | --- | --- | --- |
| qa-student-new | 20bf74a9-33a8-4c5f-955e-cc2428a965b6 | Member | active | 2 | Vacío; objeto de progreso ausente |
| qa-student | fa19c9ef-be36-4f51-a72d-b7b644a9f696 | Member | active | 2 | 4 respuestas, 3 correctas, rachas actual/mejor 2, 300 segundos |
| qa-admin | 4d9b0586-0dde-4e91-b16e-accaf2c65d38 | Admin | active | 2 | Vacío |
| qa-suspended | 92c02dd2-b77b-4f36-bfad-bc5b72305a3f | Member | suspended | 2 | Vacío; login normal rechazado |
| qa-owner | cde6534d-5904-48a6-9280-225951566df3 | Owner | active | 2 | Vacío; progreso ausente tras reautenticación |

Student conserva 0 errors, 0 saved, 0 history y ninguna práctica activa. Owner confirmó qa:tools; su self-reset invalidó la sesión anterior, Account quedó anónimo y la reautenticación normal confirmó Owner + qa:tools. SessionVersion procede de lectura focalizada del objeto de usuario; no se espera ese campo en Account. Las cinco entregas cifradas y el vault DPAPI permanecen fuera de Git.

Integridad protegida **PREVIOUSLY CERTIFIED**: índices username, cuentas y progreso de superdev/testmem coincidieron exactamente con BEFORE, 6/6 digests. No se repitió la comparación para este cierre. Las lecturas del dashboard son evidencia puntual, no una garantía transaccional.

La comparación Git desde el commit certificado hasta `cb3bd410bcf054bf409263b363b1f39821633b45` añade exclusivamente `tests/remote-smoke.mjs` y `tests/remote-smoke.test.mjs`. Los árboles `public` y `netlify`, dependencias y configuración runtime no cambiaron; la certificación de los contratos sigue vigente. El commit final de cierre contiene solo los dos tests WIP autorizados y cuatro documentos, sin cambio runtime.

## Configuración y alcance al cerrar 3T

**VERIFIED** en el preflight asistido: proyecto `rad-cajeta-60f537`, Private, Production branch staging; commit `cb3bd410bcf054bf409263b363b1f39821633b45`, deploy `6ac28b03d2e4cc00085667bf` Published; DEV_LOGIN_CODE y QA_SEED_TOKEN ausentes. STUDY_HUB_ENV=qa y QA_TOOLS_ENABLED=true; conjuntos Owner/Admin conservados con las personas QA sin reemplazar accesos existentes. Ninguna variable se modifica durante este cierre. Los deploys históricos pueden conservar valores anteriores; no se deben usar como prueba de la configuración vigente.

## Limitaciones remotas no bloqueantes

**Automated Remote Playwright through Netlify Private SSO: DEFERRED / NON-BLOCKING.** Incidente canónico local `qa-3t-human-checkpoint-incident.json`, fuera de Git. El intento con checkpoint tuvo result FAIL_STOP, stage netlify_auth, proceso 21532/session 73068, exit 1, commit/deploy anteriores; attemptCount 1, sin retry ni cambio de allowlist. Chromium fue visible/utilizable y el checkpoint pasó. Tras el login normal, el usuario observó Netlify SSO Redirect Page con «Error: Failed to fetch». Root cause: not determined. La interrupción de consola terminó el proceso antes de finalizar el reporte y recuperar los agregados en memoria. errorCode, authRequests, unexpectedRequests, blockedPresenceRequests, criticalBrowserErrors y permittedWrites quedaron null: no equivalen a cero. privateAccess=false era el valor inicial antes de completar auth, no un fallo certificado de Private Access. No se certificaron checks QA posteriores a auth.

**Assisted remote deployment smoke: INCOMPLETE / NON-BLOCKING due to Work browser/client limitation.** Reporte canónico local `qa-3t-assisted-smoke-incomplete.json`, fuera de Git. **VERIFIED:** deployment/configuración privados anteriores, Home real visible y toolbar Private de Netlify, hashes WIP protegidos y refs locales main/dev intactos. La pestaña temporal permaneció en SSO intermedio sin respuesta de Account; la navegación de lectura a Account en la pestaña QA existente fue bloqueada con ERR_BLOCKED_BY_CLIENT. Root cause exacta: not determined.

**NOT VERIFIED** en ese smoke asistido: Account anónimo, navegación crítica completa, desktop/mobile, login qa-owner, Account Owner activo, qa:tools, baseline vacío, lectura sessionVersion=2, QA-session logout y Account anónimo posterior. NOT VERIFIED no significa FAILED; los contratos de persona/cuenta se conservan como PREVIOUSLY CERTIFIED en 7C, no como verificaciones nuevas del smoke. **NOT OBSERVABLE:** conteos completos de consola, red y escrituras académicas; permanecen null, nunca se declaran cero. No se realizaron acciones académicas ni se introdujeron credenciales en el intento asistido.

Ninguno de los dos smokes se presenta como PASS ni fallo de Study Hub. No hay más intentos remotos dentro de 3T, bypass, cookies exportadas, storageState persistente, QA público, allowlist ampliada ni auth especial. CI no es requisito para cerrar 3T; SSO automatizado permanente queda diferido y QA remoto extensivo pertenece a pre-beta. La actualización del roadmap canónico FAST-RELEASE y 3F-C requieren un Gate posterior separado.
