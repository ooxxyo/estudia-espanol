# 7C — inspección de solo lectura

Preparación local sobre el parent QA publicado; sin aplicar ni desplegar. Esta revisión no incorpora el panel de reset anterior: puede revisarse/publicarse de forma separada y no reactiva su autorización.

## Opción elegida y seguridad

Function pequeña independiente `GET /.netlify/functions/qa-inspect`, sin UI de mutación. Evita acoplar observabilidad a formularios de registro/reset. No instala dependencias ni crea un sistema de auth. Reutiliza `authenticateRequest`, `hasQaToolsCapability`, roles e identidad actuales, y exporta la función de baseline existente sin cambiarla.

Solo `STUDY_HUB_ENV=qa` exacto y `QA_TOOLS_ENABLED=true`; otros entornos/flag deshabilitado: 404 antes de leer datos. Sesión real vigente: 401 si falta/revocada/suspendida y 403 para Member/Admin o SuperDev sin su flag autenticado. Se revalida la sesión después de las lecturas. No CORS abierto, no-store, nosniff, CSP y prohibición de frames; errores genéricos sin contenido, claves ni logs.

Consulta vacía devuelve siete cuentas. Únicamente se admite un `username` exacto de qa-student-new, qa-student, qa-admin, qa-owner, qa-suspended, superdev o testmem. Selector duplicado, mayúsculas, nombre externo, parámetro store/key o cualquier campo adicional: 400. Todo método distinto de GET: 405. El filtro limita las filas de cuentas devueltas; el inventario sigue leyendo el alcance técnico completo y validando todas las identidades.

## Lecturas técnicas justificadas

Para cada nombre: índice username, objeto user referenciado y clave legacy user/nombre; progreso user/ID. Se compara el ID almacenado contra el índice, nombres normalizados, IDs duplicados, aliases externos e identidades sin índice para evitar confundir datos previos con cuentas nuevas. SessionVersion ausente devuelve stored=null/effective=1, igual que auth; versiones corruptas producen 409.

SuperDev/testmem reciben únicamente identidad, versión, status, rol y digests de user/índice/legacy/progreso. Su baseline/progress resumen es null: no se exponen respuestas, ajustes, emails ni contenido académico ajeno.

La autenticación lee además el objeto de sesión del solicitante y su user/ID aunque ese Owner autorizado no esté entre los siete objetivos. Es indispensable para validar la capability; esos tokens/objetos no se devuelven.

Para detectar usuarios adicionales y datos ajenos se necesita el inventario interno del sitio, no basta mirar siete filas. Se enumeran nombres de stores y se rechaza cualquier nombre fuera de estos nueve previamente observados:

- study-hub-users-v1
- study-hub-progress-v1
- study-hub-sessions-v1
- study-hub-admin-audit-v1
- study-hub-rate-limit-v1
- study-hub-presence-v1
- study-hub-feedback-v1
- study-hub-bug-reports-v1
- study-hub-feature-flags-v1

Se lee JSON y metadata de todos los objetos de esos stores. Para otros usuarios solo se devuelven referencias opacas y huellas, nunca nombres, IDs, claves ni contenido. Esto es un inventario de integridad limitado, no una API genérica de usuarios. Si aparece otro store, se detiene sin leer su contenido; ampliar el alcance requeriría revisión. Los stores son los del sitio de ejecución: no se recibe siteID/token ni hay override de sitio. La publicación futura debe limitarse al proyecto QA aprobado.

## Contrato 200

```text
{
  schemaVersion: 1,
  environment: "qa",
  accounts: Account[],
  integrity: {
    algorithm: "sha256-canonical-json-v1",
    scope: "fixed-nine-project-stores",
    observation: "two-equal-strong-read-passes-not-a-transaction",
    complete: true,
    presentStores: KnownStoreName[],
    stores: [{ name, objectCount, digest, objects: [{ ref, digest }] }]
  }
}

Account ausente = { username: AllowedName, exists: false }
Account existente = {
  username: AllowedName, exists: true, id: string,
  sessionVersion: { stored: integer|null, effective: integer },
  status: "active"|"suspended",
  role: { configured: Role, effective: Role|null, sessionVerified: boolean },
  baseline: { expected: "new"|"progress"|"empty", matches: boolean, canonicalProfile: boolean }|null,
  progress: {
    present: boolean,
    totalAnswered: number|null, totalCorrect: number|null,
    currentStreak: number|null, bestStreak: number|null, studySeconds: number|null,
    statsCount: integer|null, errorsCount: integer|null, savedCount: integer|null,
    historyCount: integer|null, sessionPresent: boolean
  }|null,
  integrity: {
    userRef: Digest, userDigest: Digest,
    indexRef: Digest|null, indexDigest: Digest|null,
    legacyRef: Digest|null, legacyDigest: Digest|null,
    progressRef: Digest|null, progressDigest: Digest|null
  }
}
Role = "member"|"admin"|"owner"|"superdev"
Digest = 64 caracteres hexadecimales minúsculos
```

Baselines: new/empty requieren ausencia de objeto de progreso; student exige igualdad profunda con el baseline existente completo, incluyendo timestamps fijos, colecciones vacías y session=null. El resumen numérico no sustituye matches. canonicalProfile exige también el status canónico. Suspended devuelve effective=null. Para Member/Admin/Owner activos, effective es el rol que backend aplicaría a una sesión válida; no certifica la existencia de otra sesión. Para SuperDev solo se afirma effective=superdev cuando el solicitante es esa cuenta con la sesión real autorizada; con otro solicitante effective=null y configured=superdev. sessionVerified indica si la fila corresponde a la sesión solicitante ya validada.

## Integridad y comparación

SHA-256 de JSON canónico con claves ordenadas y arrays en su orden original. La huella de un objeto cubre `{data, metadata}` completos, incluidos campos sensibles internamente, sin devolverlos. No se entregan los hashes de password/recovery ni valores env. ref es SHA-256 de `[storeName, key]`, evita devolver claves de otros usuarios; el digest de store cubre la lista ordenada de ref/digest. presentStores detecta aparición/desaparición de stores permitidos. Una igualdad demuestra igualdad semántica del contenido observado, no ausencia histórica de escrituras ni identidad de quien lo modificó.

Dos pasadas strong, exactamente dos, deben coincidir. Study Hub no añade reintentos, wrappers de retry ni bucles de estabilización. Se permiten exclusivamente los reintentos internos, acotados y transparentes del SDK Blobs en lecturas; en la versión instalada 10.7.13, hasta cinco ante HTTP 429/5xx o errores de red. Si el SDK rechaza finalmente una lectura, la operación termina inmediatamente, sin repetirla desde Study Hub. No se permite extrapolar esta excepción a escrituras, bootstrap, seed o reset.

Strong se solicita en `listStores({consistency:'strong'})`, en cada uno de los nueve `getStore({name,consistency:'strong'})` (incluye sus listados) y en `getWithMetadata(key,{type:'json',consistency:'strong'})`. Las lecturas de sesión/user de `authenticateRequest` ya solicitan strong por operación. No se cambia auth ni la configuración global de otros consumidores. Si el entorno/SDK no permite completar una lectura strong, no se degrada a eventual: fallo seguro.

Revocación, fallo final de lectura, desaparición de objeto, respuesta SDK con estructura inválida, diferencia, JSON inválido, store desconocido o límite producen 409/401/403 sin snapshot parcial. Un envelope debe ser objeto, contener data definida (JSON null sí es válido) y metadata objeto no nulo/no array. Un fallo en la segunda pasada descarta también la primera. Límites por pasada: 512 objetos en total, 1.000.000 bytes de JSON canónico por objeto y 8.000.000 total. Los límites de bytes se comprueban después de la lectura/deserialización; no garantizan un límite duro de memoria frente a objetos enormes. No truncar y afirmar complete.

El guard de tests registra y bloquea `set`, `setJSON`, `delete` y `deleteAll` antes de modificar datos. El registro del intento permanece aunque se capture su error; el harness comprueba cero intentos y compara todos los objetos antes/después. La prueba con el SDK instalado sustituye solo el transporte externo: un 503 recuperable permite 200 tras el retry interno; seis fallos de transporte agotados producen 409, una única invocación SDK desde Study Hub y solo error genérico. No usa red, datos reales ni credenciales reales.

No se excluyen automáticamente objetos QA, sesiones, auditoría, rate limiting o presencia. Guardar BEFORE/AFTER fuera de Git; comparar todas las referencias previas y examinar cada cambio/alta/baja. Las referencias nombradas permiten identificar user/índice/progreso de las cinco personas. Cambios técnicos por actividad autorizada deben justificarse explícitamente en el Gate operativo; un digest distinto jamás se ignora ni significa automáticamente éxito o modificación ajena.

## Integración posterior y condiciones pendientes

Publicar observabilidad y disponer de una sesión Study Hub Owner/SuperDev vigente antes del primer BEFORE. Netlify autenticado no basta. No crear un inspector ni iniciar sesión en cuentas heredadas automáticamente: el login/Dev Login existente escribe lastActivityAt/updatedAt, y puede activar sync/presencia desde el Hub. Si no hay sesión privilegiada existente, hay que resolver esa precondición en un Gate explícito; esta revisión no la elude.

El GET normal de presence limpia registros viejos: esta inspección nunca lo llama. Las pestañas normales del Hub pueden escribir presencia y eliminar otros heartbeats vencidos. Antes del bootstrap hay que decidir en su Gate cómo evitar o autorizar esa actividad; no es posible garantizar que un registro desde el Hub no la active usando solo esta nueva Function. Por eso la inspección permite detectar diferencias, pero no elimina por sí sola toda condición del bloqueo operativo.

Si luego se aprueba la integración: capturar BEFORE; verificar después de cada cuenta ID estable, username, status/rol según la fase, versión inicial y baseline registrado/importado; tras reset exigir mismo ID, sessionVersion anterior+1, status/rol esperado, matches y canonicalProfile. Owner última, reautenticación y nueva inspección. Ante diferencia o resultado incompleto: detenerse sin reintentos. Ninguno de esos registros/resets/logins se ejecuta en esta revisión.

## Riesgos y rollback

No hay snapshot transaccional; cambios concurrentes/ABA entre lecturas pueden escapar a dos observaciones iguales. Las huellas son datos internos de comparación y pueden revelar conteos o permitir adivinar claves predecibles; solo se entregan a una sesión privilegiada y no se publican. JSON equivalente con distinto orden de propiedades tiene igual huella; cambios de valores/arrays/metadata sí la alteran.

Rollback futuro: retirar/revertir exclusivamente la Function/helper y su export de baseline, o volver al deploy QA previo con aprobación. No necesita rollback de datos porque el endpoint no escribe. No eliminar snapshots/credenciales ni tocar main/producción. DEV_LOGIN_CODE/QA_SEED_TOKEN siguen intactos; esta lectura no depende de sus valores ni los utiliza.
