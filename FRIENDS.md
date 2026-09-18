# Friends and Privacy

## Flujos implementados

Usuarios autenticados pueden enviar, aceptar, rechazar y cancelar solicitudes; eliminar amistades; y bloquear o desbloquear usuarios. Se impiden auto-solicitudes, solicitudes duplicadas y solicitudes entre usuarios bloqueados. Las solicitudes generan notificaciones privadas.

## Privacidad

Las preferencias admiten `friendRequests: everyone | members | nobody` y `profileVisibility: limited | private`. Las respuestas sociales muestran solo username, nombre visible, rango y badge Veterano; nunca email, IP, sesiones, IDs internos innecesarios ni progreso privado.

El bloqueo se guarda en `study-hub-friends-v1` y se aplica a Friends, comentarios, feed comunitario y búsqueda. La actividad futura de amigos será opt-in, privada por defecto y controlada mediante Feature Flag.

`GET friends?action=profile&username=...` ofrece displayName, rango, badge Veterano y relación. Un perfil `private` solo se muestra a sí mismo o a amistades; se rechazan perfiles bloqueados o suspendidos. No devuelve email, userId, sesiones ni progreso.

## Persistencia

Solicitudes, amistades y bloqueos tienen `schemaVersion: 1`. Una eliminación cambia el estado de la relación; no borra cuentas ni progreso. No existen chat global ni mensajes directos.
