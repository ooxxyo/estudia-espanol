# Reportes de errores

## Modelo y almacenamiento

`study-hub-bug-reports-v1` conserva documentos `schemaVersion: 1` con contexto académico opcional, tipo, descripción, diagnóstico saneado, estado, severidad, fuente, asignación, resolución y posible duplicado. No almacena cookies, cabeceras Authorization, contraseñas, códigos de recuperación, tokens ni IDs completos de sesión.

## Privacidad y flujo

Un miembro puede crear reportes y leer únicamente los propios. Admin, Owner y Super Dev pueden filtrar y cambiar estado/severidad; esos cambios se registran en el audit log. Los estados son `new`, `confirmed`, `in_progress`, `fixed`, `cannot_reproduce` y `closed`. El detector solo propone duplicados por sección, tipo y mensaje saneado reciente; nunca los cierra automáticamente.

La captura de `error` y `unhandledrejection` envía únicamente el diagnóstico saneado, sujeto a rate limiting, y lo conserva temporalmente para prellenar el formulario. Esto no pretende detectar todos los errores.
