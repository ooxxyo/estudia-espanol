# Feature Access and Rollout

## Separación de conceptos

El Roadmap público informa qué viene y no concede acceso. Feature Flags controlan acceso real con `status`, `audience`, `enabled`, `availability` y `selectedUsers`; `ready` no significa publicada. Las audiencias siguen `superdev → admins → selectedUsers → veterans → members`, sin rollout aleatorio.

## Base disponible localmente

Community, Calendar, Friends, notificaciones, búsqueda permitida y Roadmap tienen endpoints y UI de prueba local. El panel Admin incluye moderación y System Health sin mostrar secretos. La actividad de amigos, PWA, exportación, centro de materiales, uploads e IA continúan futuras o Early Access.

Dashboard Hoy, grupos propios, favoritos y recomendaciones deterministas tienen una primera UI local. System Health exige Super Dev en backend; Roadmap puede mostrar funciones en pruebas sin activarlas mediante Feature Access.

El Asistente IA por materia conserva la frontera `subjectId`, `subjectName`, `unitId`, `unitName`, `topicId`, `topicName`, `approvedContent`. No existe proveedor externo ni publicación automática.

## Recuperación y backups

La estrategia futura debe respaldar contenido académico, calendario y metadata de moderación conservando schema y procedencia. No debe exportar sesiones, secretos, datos de otros usuarios ni auditoría interna. Los cambios destructivos o rollback requieren confirmación.
