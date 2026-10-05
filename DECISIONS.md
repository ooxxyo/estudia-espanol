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

- La identidad visible es `Study Hub`; durante el desarrollo/rediseño usa un tile compacto `S` y la versión secundaria `v0.8.0` en el branding del shell, Más y Configuración. La versión nunca compite con la tarea principal de Home.
- La jerarquía del producto es `Hub → Día → Materia → Unidad/Categoría → Tema`.
- Existe un único catálogo de materias como fuente de nombre, emoji, día, estado y disponibilidad.
- Español e Historia son implementaciones reales del mismo Study Engine. Historia usa la unidad `Geografía y grandes civilizaciones` (`Prueba`, `current`).
- Inglés permanece sin banco habilitado, pero muestra `Memoir` como material actual confirmado. Salud permanece como `Próximamente`. Español muestra `Pendiente de confirmación` como tema actual sin inventar contenido. Ciencia usa su contenido aprobado y Matemáticas contiene únicamente el tema aprobado `Grados decimales a grados, minutos y segundos (DMS)`; no se incorporan temas matemáticos anteriores que nunca estuvieron en el Hub.
- En teléfono, la navegación primaria tiene exactamente cinco destinos y este orden: Hub → Repasar → Más → Practicar → Cuenta/Entrar. Más ocupa el centro y Cuenta nunca se oculta dentro de Más.
- Home ofrece además una acción compacta de contexto `Entrar` o `Cuenta` en su encabezado. Es un atajo visible, no un sexto destino móvil ni una ruta duplicada.
- La navegación iniciada explícitamente por el usuario usa motion corto de salida/entrada y dirección espacial cuando la plataforma lo soporta. Reload, autosave, restauración y re-renders silenciosos no activan ENTER; movimiento reducido llega casi de inmediato al estado final.
- En desktop, Principal contiene Hub/Hoy; Estudio contiene Repasar/Practicar/Examen; Tu estudio contiene Resumen/Historial/Errores/Guardado; Más queda en Accesos secundarios; Configuración y Cuenta/Entrar cierran la navegación en Cuenta. Tu estudio es un grupo, no una página agregadora. Resumen abre el dashboard existente de la materia activa, sin estadísticas globales.
- Más conserva Planificación, Estudio, Comunidad, Producto y ayuda y Gestión condicional. En teléfono añade Tu estudio y Preferencias; no duplica Cuenta ni destinos visibles del rail desktop. Administración mantiene sus guards existentes y la autorización backend.
- Guardado es la entrada visible canónica a `guardadas`. Durante Batch 1 ofrece acceso contextual a `favorites` y vuelta a Guardado; la presentación integrada pertenece a Batch 5. Hoy conserva acceso contextual a `studyToday` y vuelta a Hoy hasta su integración en Batch 3. Los destinos legacy permanecen funcionales y no se fusionan ni migran datos.
- `activeTopicId` representa solo una selección explícita actual. `lastVisitedTopicBySubject` conserva memoria para la tarjeta Continuar, pero nunca reactiva un tema automáticamente.
- Las capacidades secundarias conservan sus rutas, dentro de Más o mediante los accesos contextuales aprobados, sin duplicarse como destinos principales. La selección visual asocia `favorites` con Guardado y `studyToday` con Hoy sin reescribir `state.view`; `progreso → dashboard` conserva su compatibilidad existente.
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

El identificador interno `superdev`, sus permisos, checks, auth y datos persistidos se conservan. En la interfaz visible, tanto `superdev` como `owner` se presentan con el label `Owner`; nunca se expone “Superdev”, “Super Dev” o “Super Developer” como etiqueta de rol.

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
- La prueba tomada de Historia y la próxima prueba confirmada conviven con el tema en progreso. Mientras el día exacto siga pendiente, la evaluación usa `status: scheduled`, `confirmed: true`, `date: null`, `dateStatus: pending` y una descripción temporal provisional; esa descripción nunca se convierte en una fecha oficial ni se inventa viernes.
- El término académico correcto es `Interfijo`; su abreviatura es `MDI = Morfema Derivativo Interfijo`. `INF` solo se acepta internamente como alias de sesiones antiguas.
- El Study Engine es universal y admite extensiones por materia sin duplicar la aplicación.
- Cada materia tendrá un asistente propio, nunca un chatbot general. La materia activa limita la respuesta; el tema activo da prioridad y solo se usa material aprobado de esa materia.
- Ciencia contiene únicamente tres bloques aprobados: Conversiones SI, Densidad y Temperatura. La prueba real del 2026-09-24 ya fue tomada y se conserva como snapshot de 20 preguntas proporcionadas por el usuario: Densidad, Sistema Internacional y una pregunta conceptual de Temperatura; no incluyó conversiones de temperatura. La próxima prueba confirmada del 2026-09-30 cubre únicamente Temperatura; Conversiones SI y Densidad permanecen como material ya evaluado e histórico sin borrar preguntas, progreso ni resultados.
- En respuestas numéricas de Ciencia se acepta redondeo razonable, pero el valor y la unidad se validan por separado. Kelvin se escribe `K`, sin símbolo de grado.
- Las preguntas numéricas de Ciencia usan un Formula Workspace guiado con configuración por materia sobre un núcleo matemático reutilizable. Los bancos e IDs no cambian; la calculadora sigue siendo una ayuda secundaria y Matemáticas no recibe contenido hasta contar con material aprobado.
- Matemáticas usa `math-v1` y el Math Workspace reutilizable. El estudiante completa el procedimiento DMS, la multiplicación por columnas, los acarreos, los productos parciales y el punto decimal; la herramienta valida cada paso sin autorrellenar los valores variables. La fecha de examen permanece vacía mientras no esté confirmada.
- Matemáticas y Ciencia compartirán en una fase futura un Procedure Workspace Engine para persistencia, política de calculadora, teclado/móvil, deshacer, limpiar el paso actual y diferencias entre Práctica y Examen. Cada materia podrá conservar plantillas especializadas y ninguna pregunta recibirá workspace si no lo necesita.
- Los datos explícitos del enunciado pueden prepararse o rellenarse automáticamente; un valor no se autorrellena cuando identificarlo forma parte del razonamiento del estudiante.
- Las plantillas futuras de Matemáticas contemplan multiplicación vertical con acarreos, productos parciales y colocación decimal cuando corresponda. División larga espera fotos o ejemplos del procedimiento de clase; suma sexagesimal queda futura y resta sexagesimal permanece sin confirmar.
- Ciencia no tendrá un “Scratch Paper” separado: su Formula Workspace avanzado reutilizará el núcleo común sin perder el flujo `Datos → Fórmula → Sustitución → Operación → Resultado → Unidad`.
- En Examen, el proceso escrito se realiza por defecto en cuaderno o papel; una acción opcional `No tengo papel · Hacerlo aquí` podrá revelar el workspace digital sin hacerlo académicamente más fácil. Antes de entregar no habrá pistas, comprobación de pasos, validación de respuesta ni feedback correcto/incorrecto. El workspace no concede calculadora: su disponibilidad y operaciones dependen de la evaluación o tema.
- En Práctica se permiten pistas, `Comprobar paso` y feedback localizado por paso, fila o columna cuando sea posible.
- La dirección futura de QoL preserva el workspace completo al guardar y salir, añade Deshacer y Limpiar paso actual y mantiene visibles las herramientas importantes y la estructura conocida.
- La estructura futura de contenido podrá llegar a `Materia → Unidad → Tema → Subtema`; ampliar contenido tendrá un bloque propio y no exigirá reconstruir Practicar.
- La preparación para lanzamiento público es independiente de un posible producto nativo. Ninguna app nativa está confirmada; widgets y hápticos solo pertenecen a ese producto si se aprueba. Seguridad, privacidad y revisión previa al lanzamiento siguen siendo obligatorias.
- Community, Calendario, “Lo que dieron hoy” y “Falté hoy” usan bases separadas que referencian materia/unidad/tema sin duplicar el motor; automatización avanzada continúa futura.
- Los aportes comunitarios permanecen separados del contenido oficial; requieren verificación y una segunda aprobación para ser oficiales. Las confirmaciones de estudiantes no equivalen a publicación.
- `calendar:create` es una capability explícita de Admin+, Owner, Super Dev o Veterano; nunca convierte Veteranía en rol ni concede moderación.
- Roadmap público informa estado y nunca sustituye una Feature Flag ni concede acceso.
- Favoritos de temas, tarjetas, aportes y eventos viven en configuración sincronizada; las preguntas Guardadas conservan sus IDs y estructura anterior. Las tarjetas guardan `known/unknown`, `lastReviewed` y `reviewCount` sin modificar el contenido académico.
- System Health se consulta solo con rol Super Dev validado en backend; una lectura de store muestra disponibilidad técnica, no una prueba funcional completa.
- Design Lab permitirá comparar Classic UI con New UI Beta mediante Early Access; no forma parte de la interfaz estable actual.
- Dev Design Lab es una herramienta local fuera de `public/`: usa únicamente fixtures descartables y nunca crea sesiones, claims, roles, permisos ni datos persistidos. `Owner Preview` es presentación visual y no invoca `dev-login` ni endpoints privilegiados.
- Dev Design Lab, Staging y Demo Access son tres conceptos separados. El laboratorio local no sustituye QA con backend real; Staging y Demo Access requieren diseños y aprobaciones posteriores.
- El nombre futuro es `Estudio Hub` y el slug preferido `estudio-hub`; repositorio, remote, dominio y nombre actual no cambian sin autorización.
- El copy genérico usa “dispositivo”, no “iPhone”, salvo instrucciones específicas de compatibilidad.

## Registro de decisiones

Las decisiones anteriores son restricciones del producto. Si una propuesta futura entra en conflicto, debe documentarse aquí con motivo, impacto de migración y aprobación explícita antes de implementarse.
