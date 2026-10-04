# Study Hub Roadmap

3T — QA / Test Access Foundation: **Completed**, por decisión de cierre con evidencia acumulada y limitaciones remotas documentadas. Bootstrap 7C completado; qa-inspect, QA-session, personas y diagnóstico de reset listos y publicados en QA privado. Evidencia y límites canónicos: `docs/qa-7c-bootstrap.md`.

Playwright remoto a través de Netlify Private SSO: **Deferred / Non-blocking**. Smoke asistido: **Incomplete / Non-blocking** por limitación del navegador/cliente Work; ninguno se declara PASS ni fallo de producto. QA remoto extensivo queda para pre-beta. CI y SSO automatizado permanente no son requisitos del cierre de 3T.

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
| UI Refresh | In Progress | Design System P0 conectado de forma acotada al shell y Home; Fase 3D pule branding, navegación, Más y temas claro/oscuro mientras las vistas internas conservan el diseño actual. |

## Hub y aprendizaje

| Iniciativa | Estado | Alcance |
| --- | --- | --- |
| Hub general | Testing | Home común con Día 1, Día 2, progreso disponible y accesos rápidos. |
| Materias, unidades y temas | Testing | Español e Historia conservan su material; Ciencia incorpora sus tres bancos y Formula Workspace; Matemáticas incorpora únicamente Grados decimales a DMS con Math Workspace, repaso, práctica y examen de práctica. |
| Navegación simplificada | Testing | Cinco accesos y menú Más en teléfono; grupos principales y Más secundario en desktop; rutas, materia y práctica pendiente se conservan. |
| Seamless UX y jerarquía de práctica | Testing | Practicar como acción principal, disclosures sin flechas nativas, selección persistente, auto-guardado de prácticas normales y recuperación sin modal de conflicto. |
| Dashboard general | Testing | Resumen transversal básico y continuidad de prácticas pendientes. |
| Calendario base | Testing | Eventos, capability Veterano, propuestas moderadas, assignments y detección conservadora de duplicados. |
| Estudio personalizado | In Progress | UI determinista, practicar débiles y preparar 15/30/60 con contenido oficial; falta priorización avanzada y seguimiento temporal. |
| Lo que dieron hoy / Falté hoy | Testing | Aportes y eventos por fecha y grupo; ponerse al día abre repaso oficial, sin generar preguntas desde aportes. |
| Dashboard Hoy y grupos propios | Testing | Vista transversal compacta y lista de membresías/años; gestión avanzada de grupos sigue futura. |
| Flashcards y favoritos | Testing | Primera interacción Lo sé/No lo sé, categorías compatibles de Guardadas y marcadores privados. |
| Novedades | Testing | Changelog estudiantil central, 3–5 entradas recientes y estado visto por dispositivo/cuenta sincronizada. |
| Reportar error / Bug Center | Testing | Reporte saneado, posibles duplicados, estados, severidad administrada y auditoría de cambios. |
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
| Comunidad y moderación | Testing | Feed por materia/fecha/tipo/grupo, aportes, comentarios, reportes, cola filtrable y doble aprobación; sin chat global ni DMs. |
| Personas y privacidad | Testing | Descubrimiento seguro, solicitudes, amistades, bloqueo global y perfil limitado; chat permanece futuro. |
| Notificaciones | Testing | Listado privado, unread, lectura, preferencias y eventos implementados. |
| Roadmap público y búsqueda | Testing | Dataset no sensible, búsqueda académica local y social filtrada por permisos; Roadmap no concede acceso. |
| Paginación social | In Progress | `limit`/`cursor` en cinco endpoints y UI; faltan índices Blob para eliminar scans acotados. |
| Feedback | Testing | Reportes privados, tipos, estados, filtros, gestión autorizada y rate limiting. |
| Public Launch Access | Planned | Login obligatorio, paquetes, expiraciones y acceso público; no se activa durante el desarrollo privado. |
| Pagos futuros | Planned | Integración posterior, aislada de roles y progreso. |
| Easter eggs | Planned | Detalles opcionales accesibles y sin impacto académico. |

La transformación completa del hub no forma parte de esta fase. Cada materia reutilizará el mismo Study Engine; no se crearán aplicaciones independientes.

## Hitos posteriores a la estabilización actual

Estos trabajos permanecen futuros y no forman parte de la fase actual:

| Iniciativa | Estado | Alcance |
| --- | --- | --- |
| Rediseño grande / Figma / Design System | In Progress | Dirección, Motion System y Design System mínimo P0 aprobados; Fase 3D estabiliza la foundation sin migrar todavía Materia, Tema, Practicar ni Resultados. |
| Calendar 1.0 | Planned | Evolucionar la base de calendario ya disponible con una experiencia completa y validada. |
| Community / Progress | Planned | Consolidar la experiencia comunitaria y el progreso transversal sin mezclar contenido oficial con aportes. |
| Owner Command Center | Planned | Centro operativo futuro para Owner, separado de los permisos y herramientas actuales. |
| Analytics | Planned | Medición futura con alcance, privacidad y proveedor todavía por definir; no incluye PostHog en esta fase. |
| Prioridades de Hoy | Planned | Permitir control explícito de prioridad `Urgente`, `Normal` u `Oculto`. |
| QA profundo | Planned | Revisión integral de flujos, datos compatibles, accesibilidad, responsive y regresiones antes de beta. |
| Beta 0.9 | Planned | Hito de estabilización previo al lanzamiento, condicionado a QA profundo y aprobación. |
| Study Hub 1.0 | Planned | Lanzamiento estable posterior a Beta 0.9, sin fecha ni activación automática. |

## Versionado de producto

- **0.8.x:** desarrollo y rediseño actual.
- **0.9.0:** primera Beta.
- **0.9.x:** refinamiento y correcciones de Beta.
- **1.0.0:** primer release oficial aprobado.

## Quality of Life aprobado

| ID | Estado | Requisito |
| --- | --- | --- |
| QOL-01 | Planned | Autosave discreto: `Guardando…` → `Guardado`, sin toast o popup constante. |
| QOL-02 | Planned | Regreso inteligente que preserve origen lógico, selección, scroll, filtros y contexto cuando sea seguro. |
| QOL-03 | Planned | Confirmar únicamente acciones destructivas o con pérdida real de trabajo. |
| QOL-04 | Planned | Usar badges solo cuando aporten información accionable; evitar “Nuevo”, “Disponible” o “Tema actual” si la jerarquía ya lo comunica. |
| QOL-05 | Planned | Empty states útiles que expliquen la siguiente acción. |
| QOL-06 | Planned | Loading y restauración sin layout jumps. |
| QOL-07 | Planned | Conservar la microinteracción satisfactoria de Guardadas/Favoritos definida en Design System P0. |
| QOL-08 | Planned | Tooltips únicamente para iconos o acciones ambiguas. |
| QOL-09 | Planned | Si Más crece demasiado, evaluar búsqueda rápida o command menu en una fase futura. |
| QOL-10 | Planned | Estados consistentes: hover, pressed, selected, focus, disabled y loading cuando aplique. |
| QOL-11 | Planned | Pocas decisiones visibles mediante agrupación y progressive disclosure. |

## Dirección futura de presentación

Sin fusionar todavía rutas, datos, persistencia ni funcionalidad:

- Hoy + Qué estudiar hoy → **Planificación diaria**.
- Guardadas + Favoritos → **Biblioteca personal**.
- Feedback + Reportar error → **Ayuda**.

## Procedure Workspace futuro

| Iniciativa | Estado | Alcance |
| --- | --- | --- |
| Núcleo compartido de procedimientos | Planned | Reutilizar persistencia, política de calculadora, teclado/móvil, Deshacer, Limpiar paso actual y reglas de Práctica/Examen entre Matemáticas y Ciencia, con plantillas especializadas y sin forzar workspace en preguntas que no lo necesiten. |
| Matemáticas | Planned | Multiplicación vertical, acarreos, productos parciales, decimal cuando corresponda y suma sexagesimal futura. División larga espera material de clase; resta sexagesimal sigue sin confirmar. |
| Ciencia | Planned | Integrar el Formula Workspace existente con el núcleo común, sin crear un Scratch Paper separado y preservando `Datos → Fórmula → Sustitución → Operación → Resultado → Unidad`. |
| Examen y Práctica | Planned | Examen prioriza papel y ofrece workspace digital opcional sin pistas ni validación previa; calculadora controlada por evaluación/tema. Práctica puede ofrecer pistas, `Comprobar paso` y feedback localizado. |
| Persistencia y descubrimiento | Planned | Guardar y salir conserva el workspace completo; la estructura conocida y las herramientas importantes permanecen descubribles. |

## QA y tooling futuros

| Iniciativa | Estado | Alcance |
| --- | --- | --- |
| Playwright + accesibilidad | In Progress | Reutilizar Playwright ya disponible y añadir Axe para la brecha de accesibilidad automatizada; cada bug reproducible importante recibe la regresión más barata adecuada. |
| Documentación y lint | Planned | Usar Context7 bajo demanda, sin convertirlo en dependencia del proyecto, y evaluar Oxlint de forma gradual, inicialmente diagnóstica y sin autofix masivo. |
| Flujo de ingeniería | Planned | Superpowers continúa como flujo estructurado; Ponytail protege YAGNI sin sacrificar mantenibilidad, accesibilidad, seguridad, pruebas ni UX; Astra sigue como referencia principal de QA visual. |
| Conocimiento del repositorio | Planned | Graphify continúa como grafo actual. GitNexus solo se evalúa si Graphify resulta insuficiente; Agent Skills de Addy Osmani se adopta únicamente cuando no duplique los flujos existentes. |
| Herramientas no prioritarias | Planned | gstack, SkillUI, Claude-Mem y OmniRoute no son prioridades. Strix o pruebas de penetración autorizadas pertenecen a la etapa posterior de ciberseguridad y pre-lanzamiento. |
| Lanzamiento y producto nativo | Planned | La preparación de lanzamiento público permanece separada de cualquier app nativa no confirmada; widgets y hápticos solo se evalúan si ese producto se aprueba. |

## Secuencia de rediseño

Esta tabla resume hitos existentes y no sustituye la numeración canónica: `3F-B` → `3F-C` → `4R` → `5R` → `6A-R/6B-R/6C-R` → `7A-R/7B-R/7C-R` → `8` → `9` → `10`.

| Fase | Estado | Alcance |
| --- | --- | --- |
| Fase 3C | Testing | Shell + Home base; estado actual casi completado. |
| Fase 3D | Completed | Visual Audit + Foundation Polish: branding, Cuenta/Entrar, motion global, Más, light/dark e inventario legacy. |
| Fase 3E | Testing | Auth + Account Foundation: Login, Registro, Recuperación, Cuenta y Configuración con P0; Dev Design Lab local aislado mediante fixtures sin autorización real. |
| Fase 3T | Completed | QA / Test Access Foundation; bootstrap 7C certificado y capacidades QA publicadas. Limitaciones remotas no bloqueantes documentadas en `docs/qa-7c-bootstrap.md`. Context & Integration Discipline sigue definido en `AGENTS.md`. |
| Fase 4 | Planned | Subjects + Units: Materia, Unidad y Tema. |
| Fase 5 | Planned | Practice + Exam + Results, integración del Procedure Workspace compartido y motion SUCCESS / MILESTONE. |
| Fase 6 | Planned | Personal Study Tools: Progreso, Historial, Errores, Guardadas, Favoritos y Buscar. |
| Fase 7 | Planned | Community + Owner + Analytics. |
| Fase 8 | Planned | Motion + Visual Polish global. |
| Fase 9 | Planned | Staging / Testing real, aislado de producción. |
| 0.9.0 | Planned | Beta posterior a QA integral y aprobación. |
| 1.0.0 | Planned | Primer release oficial aprobado. |

## Motion por fases

- **Fase 3:** PRESS, ENTER, MOVE y EXPAND; navegación cotidiana Apple-smooth.
- **Fase 4:** continuidad espacial de Materia/Unidad, selección, disclosures y transiciones refinadas.
- **Fase 5:** SUCCESS y MILESTONE para respuesta correcta, progreso, práctica completada, resultados y mejora comprobada; satisfacción controlada tipo Duolingo.
- **Fase 8:** Motion Polish Pass global.

## Fase actual: base Hub

La jerarquía implementada es `Hub → Día → Materia → Unidad/Categoría → Tema`. Español conserva `spanish-v2` y muestra su tema actual como pendiente de confirmación; Historia reutiliza el motor mediante `historia-v1`; Ciencia usa `science-v1` con SI, Densidad y Temperatura separados; Matemáticas usa `math-v1` exclusivamente para Grados decimales a DMS. Inglés sigue deshabilitado pero muestra `Memoir` como material confirmado; Salud sigue deshabilitada.

El rebranding futuro será `Estudio Hub` con slug preferido `estudio-hub`. Repositorio, remote, dominio y nombre visible actual no cambian en esta fase.

## 3T / 7C — desbloqueo de sesión QA

**Completed:** QA-session listo y publicado; reutiliza el logout real con verificación de Account sin sincronizar/borrar progreso. Bootstrap 7C cerrado y cinco personas listas. Contrato en `ARCHITECTURE.md`; pruebas en `TESTING.md`; certificaciones y limitaciones en `docs/qa-7c-bootstrap.md`. El cierre no autoriza repetir bootstrap, resets o smoke remoto. 3F-C y la actualización del roadmap canónico FAST-RELEASE requieren un Gate separado.
