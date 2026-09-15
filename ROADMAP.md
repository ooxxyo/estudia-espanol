# Study Hub Roadmap

## Estados

- **Planned:** definido, todavía sin implementación.
- **In Progress:** trabajo activo únicamente en `dev`.
- **Testing:** implementación terminada, pendiente de validación y aprobación.
- **Completed:** validado y publicado con aprobación.

## Base técnica y estabilidad

| Iniciativa | Estado | Alcance |
| --- | --- | --- |
| Documentación permanente | Testing | Reglas, arquitectura, decisiones y matriz de pruebas pendientes de aprobación. |
| Estabilidad de práctica y apariencia | Testing | Respuestas, reanudación, navegación, tema y color. |
| Study Engine reutilizable | Testing | Español e Historia comparten sesión, evaluación, revisión y resultados con contenido aislado por materia. |
| Modularización del frontend | In Progress | API, formularios, storage schema, planificación y vistas de plataforma ya están separados. |
| Migración compatible de datos | Testing | Snapshots locales usan schemaVersion y lectura compatible; los stores nuevos nacen versionados. |
| UI Refresh | Planned | Actualización futura, sin sustituir el diseño actual sin aprobación. |

## Hub y aprendizaje

| Iniciativa | Estado | Alcance |
| --- | --- | --- |
| Hub general | Testing | Home común con Día 1, Día 2, progreso disponible y accesos rápidos. |
| Materias, unidades y temas | Testing | Español conserva su unidad neutral; Historia incorpora Geografía y grandes civilizaciones; las otras cuatro materias siguen Próximamente. |
| Navegación simplificada | Testing | Cinco accesos y menú Más en teléfono; grupos directos sin Más en desktop; no se pierde materia ni práctica pendiente. |
| Dashboard general | Testing | Resumen transversal básico y continuidad de prácticas pendientes. |
| Calendario base | Testing | Eventos, capability Veterano, propuestas moderadas, assignments y detección conservadora de duplicados. |
| Estudio personalizado | In Progress | Métricas y planes puros 15/30/60 preparados; falta experiencia completa de usuario. |
| Lo que dieron hoy / Falté hoy | Testing | Aportes y eventos por fecha; ponerse al día todavía no crea sesión automática. |
| Novedades | In Progress | Registro visible de cambios aprobados y experimentos. |
| Progreso y leaderboard | In Progress | Compatibilidad actual y futura agregación por materia. |

## Identidad, acceso y comunidad

| Iniciativa | Estado | Alcance |
| --- | --- | --- |
| Perfiles y privacidad | Testing | Defaults compatibles para displayName, rol, rango, acceso y privacidad; falta edición propia y perfil público. |
| Rangos | Planned | Progresión visible independiente de permisos backend. |
| Veteranos | Testing | Nombre visible del acceso gratuito por whitelist, separado del rol Admin y revocable sin borrar progreso. |
| Super Dev avanzado | Testing | Resumen, usuarios, conectados, feedback, Early Access, sesiones, sistema y acciones auditadas. |
| Feature Flags / Early Access | Testing | UI Beta e IA únicamente; status, audiencia, publicación y disponibilidad independientes con acceso backend comprobable. |
| Asistente IA por materia | Planned | Contrato de contexto aprobado y límite por materia preparados; sin proveedor, API ni interfaz activa. |
| Creación rápida de estudiantes | Planned | Alta segura y auditable por personal autorizado. |
| Comunidad y moderación | Testing | Aportes, comentarios, reportes, cola central y doble aprobación; sin chat global ni DMs. |
| Amigos y privacidad | Testing | Solicitudes, amistades, bloqueo global y perfil limitado. |
| Notificaciones | Testing | Listado privado, unread, lectura, preferencias y eventos implementados. |
| Roadmap público y búsqueda | Testing | Dataset no sensible y búsqueda filtrada por permisos; Roadmap no concede acceso. |
| Feedback | Testing | Reportes privados, tipos, estados, filtros, gestión autorizada y rate limiting. |
| Public Launch Access | Planned | Login obligatorio, paquetes, expiraciones y acceso público; no se activa durante el desarrollo privado. |
| Pagos futuros | Planned | Integración posterior, aislada de roles y progreso. |
| Easter eggs | Planned | Detalles opcionales accesibles y sin impacto académico. |

La transformación completa del hub no forma parte de esta fase. Cada materia reutilizará el mismo Study Engine; no se crearán aplicaciones independientes.

## Fase actual: base Hub

La jerarquía implementada es `Hub → Día → Materia → Unidad/Categoría → Tema`. Español conserva el motor y los datos históricos mediante `legacy-espanol-v1`; Historia lo reutiliza mediante `historia-v1` con ocho topics, tarjetas y banco aislado. Inglés, Salud, Ciencia y Matemáticas permanecen deshabilitados hasta recibir contenido real.

El rebranding futuro será `Estudio Hub` con slug preferido `estudio-hub`. Repositorio, remote, dominio y nombre visible actual no cambian en esta fase.
