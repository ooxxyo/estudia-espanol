# Guía de pruebas

## Validación automática mínima

Antes de entregar cambios, extrae el único `<script>` inline de `public/index.html` y ejecútalo con `node --check -`. Valida después cada módulo:

```powershell
Get-ChildItem netlify/functions -Recurse -Filter *.mjs |
  ForEach-Object { node --check $_.FullName }
git diff --check
git status --short --branch
```

Ejecuta además las Functions contra Netlify Blobs en memoria:

```powershell
node --import ./tests/register-blobs.mjs --test ./tests/*.test.mjs
```

No uses datos ni stores reales para pruebas destructivas. Los dobles de Netlify Blobs deben ejecutarse en memoria.

## Matriz de regresión

- **Hub:** Día 1 y Día 2, seis tarjetas, estados, fecha local, progreso y acceso a Novedades.
- **Materias y unidades:** Hub → Español/Historia → unidad → tema → herramienta → Hub; las otras cuatro materias `Próximamente` permanecen vacías y deshabilitadas.
- **Historia:** ocho topics, 27 tarjetas, 82 preguntas (72 selección múltiple y 10 verdadero/falso), respuestas A/B/C/D balanceadas y tercer mundo marcado como información incompleta.
- **Contexto:** navegación desktop y móvil conserva materia, unidad, tema, filtros, respuestas y posición al pasar por Hub o Más.
- **Navegación:** en teléfono, exactamente Hub, Repasar, Practicar, Cuenta/Entrar y Más; verificar bottom sheet a 390×844, safe area, Escape, foco, scroll, ausencia de overflow y Admin condicional. En desktop, verificar grupos directos y ausencia de Más.
- **Práctica:** rápida (10), intermedia (25), normal, por tema, errores y guardadas.
- **Respuesta:** selección múltiple, verdadero/falso, texto, segmentación y evidencia; primer error, segundo intento, pista, salto y feedback.
- **Navegación:** Anterior, Siguiente y Volver a pregunta actual sin alterar cola, respuestas ni estadísticas.
- **Persistencia:** pausar antes y después de responder, recargar, reanudar y terminar; comprobar historial, errores, guardadas y configuración.
- **Apariencia:** Claro, Oscuro, Automático y color personalizado en desktop y viewport móvil; recarga y cambio del esquema del sistema.
- **Cuenta/cloud:** login por username/email, remember me, logout/login, sync, resolución de conflicto y usuario antiguo sin campos nuevos.
- **Identidad:** cuenta antigua/nueva, fallback de displayName, rango, Veterano independiente de Admin y entitlement sin paywall.
- **Admin:** permisos `superdev > owner > admin > member`, búsqueda, filtros, detalle, Veteranía, alta/baja Admin, suspensión, reactivación, sesiones, borrado fuerte y audit log.
- **Presence:** heartbeat, timeout de 90 segundos, contador, contexto saneado y ausencia de tokens/IP/respuestas.
- **Feedback:** crear, listar propios, privacidad entre usuarios, filtros Admin, estados y rate limiting.
- **Early Access:** solo UI Beta e IA; probar los cuatro status, cinco audiencias, publicación independiente, selectedUsers y migración de `state/staff/all`.
- **Acceso:** Super Dev, Admin, Veterano, Member y usuario seleccionado; `ready + disabled`, audiencia incorrecta y endpoint directo deben quedar bloqueados.
- **Disponibilidad:** una feature sin implementación muestra “Todavía no disponible para pruebas.” y nunca ofrece “Probar ahora”.
- **IA por materia:** contexto Español e Historia con subject/unit/topic y contenido aprobado; una materia distinta devuelve el mensaje de cambio de materia.
- **Sync:** éxito real, fallo sin falso positivo, conflicto y reintento; conservar práctica recuperable.
- **Académico:** 105 IDs en el mismo orden, Interfijo/MDI visible, alias INF solo para compatibilidad y auditoría de longitud/distribución sin reescritura automática.
- **Backend:** suspensión, audit log, rate limiting, leaderboard y protección de Super Dev.
- **Compatibilidad:** cargar un snapshot sin `activeSubjectId`, `activeUnitId`, `subjectId` ni `unitId`, conservar claves/IDs y reanudar una sesión antigua como Español dentro de su unidad por defecto; comprobar progreso separado de Historia.
- **Community:** crear, confirmar una vez, comentar, ownership, bloqueo, reportar, rate limit y doble aprobación antes de `official`.
- **Friends:** self-request y duplicados bloqueados; aceptar, rechazar, cancelar, eliminar, bloquear/desbloquear y guardar privacidad sin emails.
- **Calendar y grupos:** member propone; Veterano publica sin ser Admin; Admin+ aprueba; duplicate flag y assignments con estado personal separado. Verificar miembro/no miembro, acceso directo con `classGroupId`, búsqueda privada, “Lo que dieron hoy”, relaciones grupo–materia–año–trimestre y conservación histórica al cambiar el año vigente.
- **Notificaciones:** cada usuario ve solo las propias; unread, mark read, mark all read y preferencias.
- **Roadmap/Search:** Roadmap no concede acceso; búsqueda excluye contenido restringido o autores bloqueados.
- **Responsive plataforma:** Community, Calendar, Amigos, Notificaciones y Roadmap a 1280×720, 390×844 y 320×568, sin overflow ni errores de consola.

## Evidencia de entrega

Registra comandos, resultado, errores de consola, rutas probadas, navegador/viewport y riesgos pendientes. Una prueba manual no se considera aprobada si altera datos reales o requiere revelar secretos.
