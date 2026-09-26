# Decisiones permanentes

## Organización académica

- Día 1 contiene: Inglés, Salud e Historia.
- Día 2 contiene: Ciencia, Matemáticas y Español.
- Español pertenece a Día 2 y no se archiva como materia.
- Cada materia organiza su contenido como Unidad/Categoría → Tema.
- Las unidades anteriores y completadas permanecen accesibles; añadir material no reemplaza ni oculta el histórico.
- El nombre y propósito de una unidad provienen de metadata o material real; no se inventan automáticamente.
- Todas las materias reutilizan el motor de estudio actualmente usado por Español.
- No se crean aplicaciones independientes por materia.

## Identidad y navegación del Hub

- El nombre general provisional es `Study Hub`; la versión visible permanece en `v2.0`.
- La jerarquía del producto es `Hub → Día → Materia → Unidad/Categoría → Tema`.
- Existe un único catálogo de materias como fuente de nombre, emoji, día, estado y disponibilidad.
- Español e Historia son implementaciones reales del mismo Study Engine. Historia usa la unidad `Geografía y grandes civilizaciones` (`Prueba`, `current`).
- Inglés y Salud permanecen como `Próximamente`. Ciencia y Matemáticas están activas como contenedores del Study Engine, pero muestran un estado vacío hasta recibir contenido real; no inventan unidades, temas ni preguntas.
- En teléfono, la navegación primaria tiene exactamente cinco destinos: Hub, Repasar, Practicar, Cuenta/Entrar y Más. Cuenta nunca se oculta dentro de Más.
- Más es exclusivo del layout móvil; contiene Examen, Errores, Progreso, Leaderboard, Comunidad, Calendario, Personas, Notificaciones, Roadmap, Buscar, Configuración, Guardadas, Historial, Feedback y Reportar error, con Administración solo para Admin, Owner y Super Dev.
- `activeTopicId` representa solo una selección explícita actual. `lastVisitedTopicBySubject` conserva memoria para la tarjeta Continuar, pero nunca reactiva un tema automáticamente.
- En desktop no existe Más: las herramientas se muestran directamente en grupos de Estudio, Seguimiento, Personal y Gestión.
- Entrar o salir de una materia no elimina una práctica ni modifica su progreso.
- `topicStatus` (`current/previous/completed/archived`) y `assessment.status` (`pending/scheduled/taken/cancelled`) son independientes. Un tema puede mantener varias evaluaciones sin cerrar su ciclo.
- Navegar o iniciar otra práctica guarda automáticamente la práctica normal anterior cuando es seguro. No se muestra un modal de conflicto por defecto. Las prácticas guardadas siguen recuperables; solo se pide confirmación al descartar datos de forma destructiva.
- La metadata nueva es opcional; las claves e IDs históricos conservan su significado.

## Identidad, permisos y acceso

Los siguientes conceptos permanecen separados tanto en datos como en interfaz:

- `username`: identificador estable para login y referencias internas.
- nombre visible: etiqueta pública configurable.
- rol: permisos backend.
- rango: progreso o reconocimiento, sin conceder permisos.
- acceso/paquete: funciones o contenido habilitado y sus condiciones.
- privacidad: visibilidad elegida por el usuario dentro de los límites de seguridad.

La jerarquía de roles backend es:

`superdev > owner > admin > member`

Los rangos, paquetes, whitelist o pagos futuros nunca deben elevar un rol. Cualquier cambio de esquema debe conservar cuentas, progreso, sesiones recuperables, entradas del leaderboard y datos antiguos mediante lectura compatible o migración explícita.

## Plataforma, acceso y administración

- `Veterano` es el único nombre visible para el acceso gratuito por whitelist; no es un rol de seguridad.
- Super Dev puede administrar cuentas antiguas y nuevas, Veteranía y roles inferiores. Ningún rol inferior puede modificar Super Dev.
- El login obligatorio, pagos, paquetes, expiraciones y Preview pública completa pertenecen a `PUBLIC LAUNCH ACCESS` y permanecen desactivados hasta aprobación explícita.
- Early Access contiene únicamente UI Beta / Design Lab y Asistente IA mientras sean experimentales.
- Feature Flags separa estado (`development`, `experimental`, `preview`, `ready`), audiencia, publicación y disponibilidad. `ready` no implica `enabled` ni publicación.
- Las audiencias mínimas son `superdev`, `admins`, `veterans`, `selectedUsers` y `members`; el backend valida también el acceso directo.
- “Probar ahora” solo aparece cuando existe implementación y ubicación reales.
- Los reportes de feedback son visibles para su autor y personal autorizado. Cambios de estado y acciones administrativas quedan auditados.
- La navegación normal guarda prácticas recuperables sin pedir confirmación; las acciones irreversibles o administrativas críticas siempre la exigen.
- En páginas de tema y práctica, `Practicar` es la acción principal cuando el usuario está intentando practicar; `Repasar` permanece accesible pero no debe dominar ni redirigir la intención del usuario.
- Los indicadores nativos de flecha en disclosures no se usan como jerarquía principal. Lo importante queda visible; lo secundario se agrupa bajo controles claros como `Más opciones`, sin cadenas de accordions ambiguos.
- Visitar un tema no cuenta como estudio: `pending_review` solo pasa a `in_progress` por práctica válida y a `reviewed` al terminar el repaso; nunca se marca `mastered` automáticamente.
- La prueba tomada de Historia y su examen pendiente conviven con el tema en progreso. No se inventa una fecha y añadir material aprobado no reinicia sus datos.
- El término académico correcto es `Interfijo`; su abreviatura es `MDI = Morfema Derivativo Interfijo`. `INF` solo se acepta internamente como alias de sesiones antiguas.
- El Study Engine es universal y admite extensiones por materia sin duplicar la aplicación.
- Cada materia tendrá un asistente propio, nunca un chatbot general. La materia activa limita la respuesta; el tema activo da prioridad y solo se usa material aprobado de esa materia.
- Ciencia contiene únicamente tres bloques aprobados: Conversiones SI, Densidad y Temperatura. La prueba real del 2026-09-24 ya fue tomada y se conserva como snapshot de 20 preguntas proporcionadas por el usuario: Densidad, Sistema Internacional y una pregunta conceptual de Temperatura; no incluyó conversiones de temperatura. Para el 2026-09-28 se reutiliza como base el material de esa prueba y se añadirá contenido adicional cuando sea proporcionado; no se inventa material pendiente.
- En respuestas numéricas de Ciencia se acepta redondeo razonable, pero el valor y la unidad se validan por separado. Kelvin se escribe `K`, sin símbolo de grado.
- Las preguntas numéricas de Ciencia usan un Formula Workspace guiado con configuración por materia sobre un núcleo matemático reutilizable. Los bancos e IDs no cambian; la calculadora sigue siendo una ayuda secundaria y Matemáticas no recibe contenido hasta contar con material aprobado.
- Community, Calendario, “Lo que dieron hoy” y “Falté hoy” usan bases separadas que referencian materia/unidad/tema sin duplicar el motor; automatización avanzada continúa futura.
- Los aportes comunitarios permanecen separados del contenido oficial; requieren verificación y una segunda aprobación para ser oficiales. Las confirmaciones de estudiantes no equivalen a publicación.
- `calendar:create` es una capability explícita de Admin+, Owner, Super Dev o Veterano; nunca convierte Veteranía en rol ni concede moderación.
- Roadmap público informa estado y nunca sustituye una Feature Flag ni concede acceso.
- Favoritos de temas, tarjetas, aportes y eventos viven en configuración sincronizada; las preguntas Guardadas conservan sus IDs y estructura anterior. Las tarjetas guardan `known/unknown`, `lastReviewed` y `reviewCount` sin modificar el contenido académico.
- System Health se consulta solo con rol Super Dev validado en backend; una lectura de store muestra disponibilidad técnica, no una prueba funcional completa.
- Design Lab permitirá comparar Classic UI con New UI Beta mediante Early Access; no forma parte de la interfaz estable actual.
- El nombre futuro es `Estudio Hub` y el slug preferido `estudio-hub`; repositorio, remote, dominio y nombre actual no cambian sin autorización.
- El copy genérico usa “dispositivo”, no “iPhone”, salvo instrucciones específicas de compatibilidad.

## Registro de decisiones

Las decisiones anteriores son restricciones del producto. Si una propuesta futura entra en conflicto, debe documentarse aquí con motivo, impacto de migración y aprobación explícita antes de implementarse.
