# Community Platform

## Alcance actual

Community permite a usuarios autenticados crear aportes, confirmarlos una vez, comentarlos y reportarlos. Todo aporte nace como `community`; las confirmaciones pueden llevarlo a `confirmed`, pero nunca a `official`. Los textos se limitan y escapan antes de renderizarse.

## Persistencia

| Store | Propósito | Ownership | Ciclo de vida |
| --- | --- | --- | --- |
| `study-hub-community-v1` | Aportes y estado de moderación | Autor; moderación Admin+ | Soft delete; conservar procedencia |
| `study-hub-community-comments-v1` | Comentarios por recurso | Autor; moderación Admin+ | Soft delete |
| `study-hub-community-confirmations-v1` | Una confirmación por usuario/aporte | Usuario confirmante | Inmutable |
| `study-hub-reports-v1` | Reportes sociales | Reportante; visible a moderación | Resolver con auditoría |

Cada fila nueva declara `schemaVersion: 1`. `classGroupId`, `schoolYearId` y `termId` son opcionales; un aporte de grupo no entra en el feed general y solo miembros o Admin+ pueden leerlo o interactuar con él. Backend rechaza relaciones grupo–materia–año–trimestre incompatibles.

## Moderación y contenido oficial

El pipeline es `Contribution → revisión → admin_verified → segunda aprobación → official`. Convertir a oficial requiere dos acciones explícitas y se registra en `study-hub-admin-audit-v1`. Un borrador generado en el futuro tendrá procedencia `generated_draft` y nunca será oficial automáticamente.

Adjuntos de foto/PDF solo tienen contrato de metadata en esta fase. No hay upload remoto, chat global ni mensajes directos.

La UI local ofrece feed, “Lo que dieron hoy” por materia, Hoy/Ayer/fecha, filtros de materia/tipo/grupo, detalle, confirmaciones, comentarios, reportes y favoritos. `limit`/`cursor` paginan la respuesta; la lectura sigue acotada a 1000 filas y requiere un índice para mayor escala.
