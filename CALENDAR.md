# Calendar Platform

## Permisos

`calendar:create` permite publicación directa a Super Dev, Owner, Admin y Veterano. Es una capability: Veterano continúa siendo `member` y no recibe moderación, gestión de usuarios ni acceso Admin. Un member normal crea `CalendarProposal`; solo Admin+ puede aprobarla.

## Persistencia

- `study-hub-calendar-v1`: eventos activos o retirados mediante soft delete.
- `study-hub-calendar-proposals-v1`: propuestas `pending`, `approved`, `rejected`, `needs_info` o `duplicate`.
- `study-hub-assignments-v1`: definición global de assignments.
- `study-hub-assignment-progress-v1`: estado personal por usuario y assignment.

Los modelos tienen `schemaVersion: 1`, relación opcional con materia, unidad, tema, grupo, año escolar y trimestre, además de procedencia. Aprobar una propuesta conserva `proposalId`, `originalAuthor` y `approvedBy`.

## Fechas, grupos y duplicados

Las fechas usan `YYYY-MM-DD` y validación estricta. El detector compara materia, fecha, tipo y título normalizado; solo marca `possibleDuplicate`. Nunca rechaza automáticamente. Los eventos, propuestas y assignments de grupo quedan fuera del listado general y exigen membresía backend. Los filtros de grupo, año y trimestre se validan como una sola relación; cambiar el año vigente no elimina periodos ni datos anteriores.

“Falté hoy” combina localmente eventos, assignments y aportes de una fecha. “Ponerse al día” queda preparado hasta que pueda crear una sesión exclusivamente con contenido oficial.
