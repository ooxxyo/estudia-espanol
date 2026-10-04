# Study Hub Roadmap

3T — QA / Test Access Foundation: **Completed**, por decisión de cierre con evidencia acumulada y limitaciones remotas documentadas. Bootstrap 7C completado; qa-inspect, QA-session, personas y diagnóstico de reset listos y publicados en QA privado. Evidencia y límites canónicos: `docs/qa-7c-bootstrap.md`.

Playwright remoto a través de Netlify Private SSO: **Deferred / Non-blocking**. Smoke asistido: **Incomplete / Non-blocking** por limitación del navegador/cliente Work; ninguno se declara PASS ni fallo de producto. QA remoto extensivo queda para pre-beta. CI y SSO automatizado permanente no son requisitos del cierre de 3T.

## Ruta canónica FAST-RELEASE

3T está CLOSED. Este roadmap define el orden siguiente; 3F-C permanece Planned y no comienza con su aprobación documental. Cada implementación conserva su propio Gate de alcance y ejecución.

Objetivo: cerrar el núcleo utilizable, incorporar contenido real, completar el loop, probar temprano con 11-3 y mejorar con evidencia antes de público. RELEASE-CRITICAL identifica el mínimo necesario para esa salida; RELEASE-TRACK conserva trabajo estratégico recomendado o condicional; POST-LAUNCH / EXPANSION conserva mejoras mayores sin convertirlas en prerrequisitos del primer release.

| Orden | Gate canónico | Clase | Estado |
| --- | --- | --- | --- |
| 0 | 3T — QA / Test Access Foundation | Fundación cerrada; evidencia en docs/qa-7c-bootstrap.md | Completed |
| 1 | [3F-C — UI / IA Cleanup + Deep Legacy Migration](#3f-c--ui--ia-cleanup--deep-legacy-migration) | RELEASE-CRITICAL | Planned |
| 2 | [Content & Data Foundation](#content--data-foundation) | RELEASE-CRITICAL | Planned |
| 3 | [Real Academic Content Slice](#real-academic-content-slice) | RELEASE-CRITICAL | Planned |
| 4 | [Complete Study Loop](#complete-study-loop) | RELEASE-CRITICAL | Planned |
| 5 | [Motion + SFX](#motion--sfx) | RELEASE-CRITICAL | Planned |
| 6 | [Pre-Launch Optimization & Codebase Consolidation](#pre-launch-optimization--codebase-consolidation) | RELEASE-CRITICAL | Planned |
| 7 | [Analytics / Tracking Readiness](#analytics--tracking-readiness) | RELEASE-CRITICAL | Planned |
| 8 | [Final Beta Readiness QA](#final-beta-readiness-qa) | RELEASE-CRITICAL | Planned |
| 9 | [Private Beta — 11-3](#private-beta--11-3) | RELEASE-CRITICAL | Planned |
| 10 | [Pilot Feedback + Release Fixes](#pilot-feedback--release-fixes) | RELEASE-CRITICAL | Planned |
| 11 | [Pitch / School Demonstration](#pitch--school-demonstration) | RELEASE-TRACK / RECOMMENDED PRE-PUBLIC | Planned |
| 12 | [Monetization Foundation](#monetization-foundation) | RELEASE-TRACK / CONDITIONAL | Planned |
| 13 | [Public Readiness](#public-readiness) | RELEASE-CRITICAL | Planned |
| 14 | [Public Release](#public-release) | RELEASE-CRITICAL | Planned |
| 15 | [Post-Launch Expansion](#post-launch--expansion) | POST-LAUNCH / EXPANSION | Planned |

El orden representa la ruta recomendada. Pitch y Monetization permanecen antes de público como trabajo estratégico, pero su posición no los convierte en prerrequisitos técnicos universales.

**Qué bloquea beta:** mínimo aprobado de 3F-C; Content & Data Foundation necesaria; slice académico real; Complete Study Loop con Basic Study Commitment básico; Motion/SFX mínimo aprobado; optimization/consolidation necesaria para riesgos reales; analytics/tracking mínimo necesario; Final Beta Readiness; aprobación visual/humana requerida de los Gates UI y cualquier P0 o blocker de seguridad, privacidad o datos.
**Qué no bloquea beta:** expansiones, analytics avanzado, todas las materias, Comunidad completa, administración avanzada, monetización completa ni pitch final.
**Qué bloquea público:** core loop sólido; contenido release-ready; pilot blockers resueltos; datos/timestamps coherentes; seguridad, privacidad, accesibilidad, performance y responsive/mobile; loading/skeleton/error/empty states; analytics/tracking mínimo aprobado; legal/trust requerido; Public Readiness; regresión final incluida la visual; aprobación humana requerida y aprobación explícita del release.
**Qué no bloquea un primer release Free:** pitch final, Monetization Foundation completa ni payments/automated billing. Si el release incluye ofertas pagadas, el modelo y los requisitos aplicables se deciden en su Gate.
**Qué puede esperar:** capacidades ampliadas del catálogo Post-Launch. Una vulnerabilidad, problema de privacidad, accesibilidad, integridad de datos o riesgo real de una superficie publicada nunca se difiere por esa etiqueta.

### 3F-C — UI / IA Cleanup + Deep Legacy Migration

Arquitectura de información: Hoy absorbe Qué estudiar hoy; Tu estudio agrupa resumen, historial, errores y Guardado; Guardado absorbe Favoritos + Guardadas; Comunidad y Producto y ayuda funcionan como grupos. Conservar rutas, contenido y persistencia compatibles durante la migración.
Mobile conserva cinco destinos: Hub en el extremo izquierdo, Más centrado y Cuenta/Entrar en el extremo derecho; Repasar y Practicar permanecen accesibles. Desktop coloca Hub primero y Cuenta cerca del final.
Inventariar las superficies existentes y su árbol completo. Una pantalla solo se considera migrada cuando sus componentes, subcomponentes, templates y estados nested legacy también lo estén. No ampliar features para llenar grupos nuevos.

**No Emoji UI:** inventario recursivo de HTML, JS, CSS, pseudo-elements, templates y componentes nested. La iconografía de UI usa SVG consistente, currentColor, tamaños típicos 16/20/24 y nombres accesibles cuando correspondan; no depende de emoji ni glyph Unicode. Excepciones: contenido del usuario, ejemplos académicos, comunidad y logos oficiales. Una librería nueva requiere Dependency Gate. El catálogo sigue siendo único; conservar compatibilidad de metadata antigua al sustituir su representación visual.

**Skeleton loading y estados:** usar skeleton si se conoce la estructura y falta información, especialmente en Hub/dashboard, Subjects/Areas, Units, Topics, progreso, historial, Guardado, Comunidad, Analytics, listas/cards remotas y Account/settings. Aplicarlo a superficies existentes; no implementar una expansión para demostrar un skeleton.
Definir loading, loaded, empty, error, disabled y offline cuando aplique. No sustituir empty/error por skeleton ni usarlo para operaciones instantáneas, estructura desconocida o feedback corto de submit. Evitar layout shift y flashes; transición suave y reduced motion respetado.
Salida: inventario de migración verificable, agrupaciones coherentes, iconografía y estados completos en el alcance aprobado. Aplicar [Canonical Story Visual QA + Human Approval](#canonical-story-visual-qa--human-approval) al story/navigation completo del alcance, con nested legacy audit, Desktop/Mobile, Light/Dark, capturas comparables, Work visual inspection, user screenshot review, user manual test y aprobación humana explícita. Automated tests solos no cierran 3F-C. Actualizar DECISIONS.md dentro del Gate de implementación para reconciliar nombres/posiciones y metadata visual anteriores; no cambia en este Gate documental.

### Content & Data Foundation

Definir el modelo canónico antes de escalar contenido: Subject/Area, Unit, Topic, Subtopic, Study Material, Practice Set, Exam/Exam Template y otras entidades necesarias, sin duplicar el mismo concepto.
Entidades académicas nuevas: createdAt, updatedAt, publishedAt y archivedAt cuando apliquen; estados draft, published y archived o un equivalente único. Definir representación temporal, zona horaria, ausencia de valores y lectura/migración compatible; no inventar fechas para datos antiguos.
Trazabilidad del estudiante según aplique: firstSeenAt, startedAt, lastStudiedAt, completedAt, último intento y timestamps de práctica, examen, actividad e historial. El schema formal sirve a progreso, analytics, debugging, administración y recomendaciones futuras, sin convenciones paralelas.
Salida: schema, fuente canónica por concepto y estrategia compatible aprobados antes de producir más datos.

### Real Academic Content Slice

Seleccionar material académico real aprobado y construir un slice completo: Tema → Repasar → Practicar → Examen → Resultado → Qué estudiar después. Priorizar calidad, coherencia y corrección; no esperar a llenar toda la plataforma.
Reducir fake/demo donde exista material real; no inventar bancos, temas, evaluaciones ni fechas. Mantener el material e IDs ya aprobados y el motor compartido por materias.
Salida: un recorrido académico real que pueda probarse de principio a fin y sirva al piloto.

### Complete Study Loop

Materia → unidad/tema → estudiar → practicar → feedback → guardar/salir → continuar exactamente donde estaba → completar → examen → resultado → entender errores → qué estudiar después.
Guardar preguntas respondidas, current index, attempts, hints, mode/topics, workspace y demás estado relevante. Exponer Guardar y salir y Continuar práctica; auto-save al salir/cerrar cuando sea seguro, sin prometer persistencia que no pueda garantizarse.
Conservar las reglas de Práctica/Examen: sin pistas ni feedback de respuestas antes de entregar el examen; calculadora y workspace dependen del contrato académico.
Salida: continuidad y recuperación sin pérdida, resultados comprensibles y siguiente paso útil con el contenido real del slice, incluyendo el compromiso básico aprobado para la experiencia mínima de beta.

#### Basic Study Commitment Gate

Subcontrato de Complete Study Loop, no un Gate principal adicional. Cuando esté habilitado, aparece inmediatamente antes de iniciar la sesión/experiencia real del Tema: Tema → Basic Study Commitment → Repasar → Practicar → Examen → Resultado → Qué estudiar después. Su implementación corresponde al Study Loop/polish; no comienza en esta edición ni retrasa 3F-C con diseño prematuro.

Primera versión deliberadamente breve: heading tipo Antes de empezar, explicación corta, UNA confirmación consciente no preseleccionada y CTA principal tipo Comenzar tema, inicialmente disabled hasta la confirmación. Copy final pendiente. Cerrar/reabrir no cuenta como aceptación: la acción debe ser explícita. Sin cuestionario, tres o más checkboxes, texto largo, confirmaciones repetitivas, countdown, castigos, culpa ni mensajes manipulativos/dark patterns. Un error técnico no debe bloquear permanentemente el acceso al Tema.

UI canónica paper + wine editorial notebook: reutilizar sin reinterpretar las paletas light/dark, Fraunces para headings y Source Sans 3 para UI/body, spacing 4/8/12/16/24/32/48 y radii 6/10/16/999 definidos en [tokens P0](public/css/design-system-p0.css); contexto de integración en [ARCHITECTURE.md](ARCHITECTURE.md). Targets táctiles ~44px mínimo y acción principal ~48px. Experiencia plana, integrada, calmada, académica y clara; evitar modal enorme innecesario, cards dentro de cards, glassmorphism, gradients decorativos, sombras fuertes, exceso de borders/pills y decoración sin función.

Aplicar [No Emoji UI y reglas de 3F-C](#3f-c--ui--ia-cleanup--deep-legacy-migration). Si hace falta icono, reutilizar SVG existente con currentColor, 16/20/24 y nombre accesible cuando corresponda. SEARCH FIRST para Button, checkbox/choice, panel, heading, motion primitive y status component; ONE CANONICAL SOURCE PER CONCEPT, sin crear variantes paralelas si el componente canónico cumple el contrato.

Mobile-first: panel y texto breves, controles cómodos, sin precisión innecesaria ni CTA fuera del viewport sin razón. Keyboard usable, focus visible, contraste correcto, labels programáticos, semántica de screen reader, orden lógico de tab y disabled comprensible. La confirmación no depende solo de color.

Estados relevantes: ready, selected/accepted, disabled y error cuando aplique. Información local/inmediata no necesita skeleton decorativo; si después depende de datos remotos, aplicar la regla global de 3F-C para estructura conocida y contenido pendiente, nunca sobre empty/error. Motion/SFX se concreta en [su Gate](#motion--sfx).

Sin persistencia compleja obligatoria. Content & Data Foundation y Analytics / Tracking Readiness decidirán si hace falta commitmentAcceptedAt o evento equivalente, con una fuente temporal canónica, sin tracking invasivo, texto escrito ni comportamiento innecesario. Frecuencia pendiente de evidencia de 11-3: no fijar ahora cada tema, cada sesión, una vez al día ni solo la primera vez. La primera versión no debe alargar significativamente el camino a beta ni expandirse a Focus completo.

### Motion + SFX

Una vez estable el loop, completar motion antes de beta/público con PRESS120, ENTER260, EXIT190, MOVE280, EXPAND220, SUCCESS420 y MILESTONE600.
Navegación Apple-smooth; completion, milestones y success feedback Duolingo-satisfying. Cubrir interacción, correct/incorrect cuando corresponda, continuidad espacial de Materia/Unidad, selección, disclosures, progreso, práctica completada, mejora comprobada, resultados, loading, success/error, paneles y transiciones mobile. Reload, autosave y re-render silencioso conservan las reglas existentes.
SFX cortos, útiles, moderados y no intrusivos; setting Efectos de sonido y modo Examen más discreto. Reduced motion cercano a cero cuando corresponda; no introducir lag ni CLS.
[Basic Study Commitment](#basic-study-commitment-gate) recibe implementación/polish discreto: PRESS120, ENTER260, EXIT190, MOVE280 y EXPAND220 cuando apliquen; entrada calmada, selección clara, CTA habilitado suavemente y transición natural hacia Tema. No requiere SUCCESS420/MILESTONE600 por aceptar salvo decisión posterior; sin dramatización, CLS ni flashes y movimiento casi cero con reduced motion. No necesita sonido propio obligatorio. Cualquier SFX futuro respeta Efectos de sonido, es muy discreto, evita contextos quiet/reduced cuando corresponda y mantiene Examen más discreto.
Aplicar [Canonical Story Visual QA + Human Approval](#canonical-story-visual-qa--human-approval); el Story QA comprueba transitions, continuity, reduced motion, ausencia de flashes/CLS y estados antes/después de animar. Screenshots validan estados visuales; interacciones/motion que no puedan juzgarse con capturas pueden requerir evidencia adicional, sin eliminar la matriz Light/Dark.
Salida: feedback coherente y controles de sonido/movimiento probados, sin convertir polish global futuro en requisito de beta.

### Pre-Launch Optimization & Codebase Consolidation

Proceso obligatorio y acotado: MEASURE → INVENTORY → PROPOSAL → APPROVAL → SMALL BATCH REFACTOR → TEST → BEFORE/AFTER. No ejecutar un refactor entire app.
Auditar funciones/helpers duplicados o casi iguales, dead/unreachable code, paths legacy, archivos grandes con frontera real, CSS/componentes/API/modelos/estado/config duplicados, permisos, flags, dependencias, reads/writes backend, races, idempotencia, requests innecesarios, coste API y bottlenecks.
ONE CANONICAL SOURCE PER CONCEPT. Código generado/modificado con AI: SEARCH FIRST; comprobar si existe helper/componente/modelo adecuado antes de crear otro.
Medir initial load, JS/CSS, assets, fonts, requests, rendering, layout shifts, mobile, stores/queries costosos, rerenders y caching cuando tenga sentido. Skeleton es perceived performance y no reemplaza esas mediciones.
Salida: riesgos relevantes del release corregidos o mitigados con evidencia before/after, preservando seguridad, accesibilidad, responsive y tests. Mejoras sin beneficio medido quedan en backlog; no optimizar por intuición.

### Analytics / Tracking Readiness

Después de estabilizar modelo de datos y loop, definir eventos útiles: content opened, study started, practice started, question answered, practice resumed/completed, exam started/completed, result viewed, topic completed y recommendation followed cuando apliquen.
Reutilizar los timestamps canónicos; evitar otra fuente de historial. Minimizar datos y tracking, definir acceso/retención/consentimiento aplicables; sin vigilancia invasiva ni session replay. Analytics inicial Owner/SuperDev según permisos existentes.
Salida: contrato de eventos y medición mínima del loop, sin exigir una suite avanzada ni elegir proveedor/dependencia sin su Gate.

### Final Beta Readiness QA

Validar loop crítico, auth/roles, mobile, accesibilidad básica, teclado, loading/skeleton/empty/error, reduced motion, sound toggle, regresiones obvias de performance, blockers de privacidad/seguridad y corrección del slice.
Reutilizar la fundación 3T y sus pruebas. Playwright por Private SSO permanece diferido/no bloqueante; el smoke asistido incompleto no se convierte en PASS. QA de riesgos actuales sigue requerido sin reabrir los intentos de 3T.
Verificar específicamente [Basic Study Commitment](#basic-study-commitment-gate): comprensible, accesible, mobile y keyboard usables, reduced motion respetado, confirmación explícita y no preseleccionada, cierre/reapertura sin aceptación implícita, sin bloqueo del Tema por error, dark patterns ni fricción excesiva; conserva el flow del Tema.
Sobre el build candidato, recorrer nuevamente el story RELEASE-CRITICAL con [Canonical Story Visual QA + Human Approval](#canonical-story-visual-qa--human-approval), capturando cada pantalla/estado relevante en Desktop Light, Desktop Dark, Mobile Light y Mobile Dark cuando aplique. No revisar expansiones Post-Launch fuera de beta.
Salida: slice y núcleo aptos para 11-3, sin blockers críticos; no QA de toda expansión futura.

### Private Beta — 11-3

Primer grupo: 11-3. Recoger evidencia de navegación, estudio sin ayuda, claridad de Practice, Continue Practice, Exam/Results, qué estudiar después, motion/SFX, mobile, confusión y errores reales.
Recoger evidencia de [Basic Study Commitment](#basic-study-commitment-gate): qué entendieron que aceptaban, rapidez y ausencia de confusión, intención/foco, molestia o repetición, deseo de saltarlo y demora innecesaria al entrar al Tema. Preguntar si conviene que aparezca siempre o con menor frecuencia; decidir la frecuencia después del piloto.
Salida: evidencia concreta del piloto. Expandir a 11-2 o 11-1 solo por decisión posterior basada en esa evidencia; nunca automáticamente.

### Pilot Feedback + Release Fixes

Clasificar P0 blocker, P1 important, P2 polish y future. Priorizar blockers, confusión, loop roto, mobile, accesibilidad severa, regresiones de performance y feedback engañoso.
Salida: riesgos del piloto resueltos/verificados y backlog controlado; no inflar el scope con expansiones.

### Pitch / School Demonstration

RELEASE-TRACK / RECOMMENDED PRE-PUBLIC. Después de evidencia real del piloto: demo Tema → Repasar → Practicar → Examen → Resultado → Qué estudiar después; pitch de 3–5 minutos.
Material: one-pager/PDF, screenshots seguros, problema, solución, beneficios, seguridad, privacidad, resultados iniciales y ask concreto.
Salida: demostración reproducible y propuesta basada en lo observado, sin promesas de features futuras como si estuvieran listas. Acompaña adopción escolar/promoción; no es un blocker técnico universal del Public Release.

### Monetization Foundation

RELEASE-TRACK / CONDITIONAL. Definir el modelo Free, Premium y School cuando corresponda al alcance del release. Premium inicialmente mensual/semestral; anual solo después de evidencia.
Payments / automated billing son una integración distinta del modelo y no son requisito de un primer Public Release Free. Investigar posteriormente card, Apple Pay, Google Pay, ATH Móvil/ATH Business y flujos manuales/cash confirmados por Owner cuando apliquen, con Gates propios. No implementar pagos ni activar login obligatorio/paquetes/expiraciones por aprobar este roadmap.
Salida: modelo y alcance de monetización decididos cuando apliquen. Monetización no bloquea un release Free técnicamente listo, no eleva roles backend ni debilita permisos.

### Public Readiness

Checklist explícito sobre las superficies que se publicarán:

- Legal/trust: Privacy Policy, Terms, soporte/contacto, FAQ cuando aplique y cookie/tracking consent cuando corresponda.
- Web/SEO: robots.txt, sitemap.xml, title/meta descriptions, canonical URLs, favicon, Open Graph/social sharing y custom 404 en superficies públicas/indexables; no indexar privadas.
- UX: CTAs, responsive, loading/skeleton/empty/error, teclado, formularios, accesibilidad, dark/light, reduced motion y sound settings.
- QA: links, forms, navegación, mobile, loading/errors, accesibilidad, contenido y regresión final.
- Security/privacy: auth/roles y enforcement backend, rate limits, protección de gasto API, timeouts, duplicate submissions, upload limits si aplican, patrones DB, backups/recovery, retención, privacidad, consentimiento y consideraciones de escuela/menores aplicables.
- Performance: revalidar mediciones después de fixes del piloto; mobile, requests, assets/fonts, caching y eficiencia DB/API, usando el Gate de optimización como referencia.

Aplicar [Canonical Story Visual QA + Human Approval](#canonical-story-visual-qa--human-approval) a la regresión visual final de las superficies públicas/release-critical afectadas desde la última aprobación. Light/Dark siguen siendo obligatorios, Desktop/Mobile cuando aplique y aprobación humana explícita antes del cierre.
Salida: evidencia de readiness y cierre de los blockers canónicos de público; publicación o cambios de acceso sensibles requieren aprobación explícita. Pitch y payments no son blockers técnicos universales de un release Free.

### Public Release

Publicar solo tras cerrar los blockers canónicos de público definidos arriba, con core loop sólido, seguro, usable, medible y mantenible; no exigir terminar las expansiones, el pitch final ni monetización completa para un release Free. Versión de producto y lanzamiento mantienen su aprobación explícita.
Salida: primer release aprobado; mejoras posteriores continúan con el mismo criterio de datos, calidad y seguridad. Este roadmap no autoriza beta ni publicación.

## Canonical Story Visual QA + Human Approval

Disciplina transversal obligatoria para Gates con cambios UI/UX visibles, incluidos los futuros. No es otro Gate principal. Tests, Playwright, accesibilidad automatizada o la afirmación de Work de que se ve bien no sustituyen ver lo que el usuario realmente verá ni su aprobación explícita.

**Full Story Walkthrough:** definir el story real dentro del alcance, comenzar en su entry point real, recorrerlo en orden, inspeccionar cada pantalla y estado relevante y terminar en el resultado/salida real. No revisar pantallas sueltas sin contexto. Ejemplo futuro del Study Loop: Hub → Materia → Unidad → Tema → Basic Study Commitment → Repasar → Practicar → Guardar/Continuar cuando aplique → Examen → Resultado → Qué estudiar después. Este ejemplo no autoriza implementarlo durante el Gate documental.

**Matriz por pantalla/estado relevante:** LIGHT y DARK son obligatorios. Si la superficie es responsive, usar Desktop Light → Desktop Dark → Mobile Light → Mobile Dark. Mobile requiere viewport aprobado/realista; no sustituirlo con una ventana desktop apenas reducida. Una variante realmente no aplicable se marca NOT APPLICABLE con justificación, nunca con evidencia inventada.

**Capturas comparables:** sacar screenshots de cada pantalla/estado relevante, al menos Light/Dark y las cuatro variantes cuando aplique responsive. Mantener cuando sea posible la misma persona QA, contenido, data, estado y punto del flow, con viewport consistente para cada formato. No alterar datos para conseguir una captura bonita. Agrupar y presentar las capturas al usuario en el orden del story, por STEP/pantalla, estado y variante; evitar duplicados sin valor sin omitir estados importantes.

**Estados y nested legacy:** revisar cuando existan en el alcance loading, skeleton, loaded, empty, error, offline, disabled, selected, expanded/collapsed, focus, validation, success, results, modal/panel abierto y navigation states. Inspeccionar también buttons, icons, cards, panels, dropdowns, dialogs, tooltips, inputs, badges, progress, navigation, headers, footers y nested components. Un shell nuevo con legacy visible no pasa Visual QA; especialmente obligatorio en 3F-C.

**Work visual inspection:** inspeccionar activamente las capturas, no solo producirlas. Buscar spacing/alignment, typography, overflow/clipping, scroll inesperado, layout shifts, responsive breaks, radii/tokens incorrectos, colores hardcoded/legacy, superficies/borders, contraste/texto, iconografía inconsistente o emoji/glyph UI, tamaños de controles, jerarquía, CTAs duplicados, focus, disabled/selected, overlays, empty/error incómodos, skeleton/loader mismatch, theme flashes, bugs exclusivos de Light/Dark, motion artifacts y regresiones visuales.

**Reporte por pantalla/estado:** PASS o ISSUE FOUND solo después de inspección. Si hay un issue, registrar problema, severidad, pantalla, componente, Light/Dark, Desktop/Mobile y estado relevante. Presentar findings junto a sus capturas en orden del story. No ocultar errores ni marcar PASS una variante no inspeccionada.

**Human Visual Approval:** después de presentar story, screenshots y findings, DETENERSE para revisión del usuario. El Gate UI sigue abierto. El usuario puede aprobar, señalar errores, pedir fixes, nuevas capturas, comparaciones Light/Dark, otra resolución o revisar otro estado.

**User Manual Test:** tras aceptar la revisión visual, cuando el Gate lo requiera, indicar READY FOR USER MANUAL TEST y permitir que el usuario pruebe el flow. Playwright, screenshots y automated QA no sustituyen esa prueba ni su aprobación. El cierre de 3F-C exige también el test manual.

Secuencia canónica de cierre UI/UX:

IMPLEMENT → AUTOMATED TESTS → ACCESSIBILITY / TECHNICAL QA → FULL STORY WALKTHROUGH → LIGHT + DARK SCREENSHOT MATRIX → DESKTOP + MOBILE WHEN APPLICABLE → WORK VISUAL INSPECTION → USER SCREENSHOT REVIEW → USER MANUAL TEST → EXPLICIT HUMAN APPROVAL → GATE CLOSED.

No cerrar un Gate visible antes de aprobación humana explícita. La matriz y el recorrido cubren el alcance del Gate, no expansiones futuras ajenas a él.

**Screenshot privacy:** usar personas QA o datos seguros y sanear antes de capturar cuando corresponda. Nunca incluir passwords, recovery values, tokens, cookies, auth codes, signed callback URLs, secretos privados ni información sensible innecesaria.

## Post-Launch / Expansion

Estas fases mayores se conservan. Su alcance ampliado no bloquea beta ni primer release público; el mínimo del núcleo y cualquier riesgo de una superficie expuesta pertenecen a los Gates anteriores.

| Referencia anterior / iniciativa | Alcance ampliado conservado |
| --- | --- |
| Fase 4 / Subjects + Units; referencia 4R | Más materias, unidades, temas/subtemas y herramientas, tras validar el slice inicial. |
| Fase 5 / Practice + Exam + Results; referencia 5R | Más modalidades y Procedure Workspace especializado; el loop mínimo se cierra antes del release. |
| Fase 6 / Personal Study Tools; referencias 6A-R/6B-R/6C-R | Progreso avanzado, historial, errores, Guardado, favoritos, búsqueda y priorización avanzada. |
| Calendar 1.0 / Tasks / Exam Prep / Focus | Evolución de la base actual, automatización y control explícito de Prioridades de Hoy Urgente/Normal/Oculto. |
| Strict Study Commitment / Focus integration | Solo si la evidencia de 11-3 lo justifica: 2–3 compromisos, session goal, estimated session duration, modo estricto configurable, integración con Focus, reglas de frecuencia y métricas ampliadas. Ideas no aprobadas para implementación; conservar accesibilidad, control claro, privacidad, UI canónica y ausencia de dark patterns. No asumir que será necesario. |
| Fase 7 / Community; referencias 7A-R/7B-R/7C-R | Consolidación comunitaria, moderación y progreso transversal sin convertir aportes en material oficial automáticamente. |
| Owner/Admin / Owner Command Center | Operación avanzada, alta rápida segura, grupos y administración ampliada, con permisos actuales preservados. |
| Analytics expansion | Paneles/análisis avanzados posteriores a la medición mínima; proveedor y alcance aún requieren decisión. |
| Fase 8 / Global visual/performance polish | Refinamiento global posterior al motion y performance mínimos del release. |
| Fase 9 / Extended staging QA | Cobertura ampliada de plataforma en staging aislado de producción; regresiones de riesgos reales no esperan a esta fase. |
| Security/privacy hardening adicional | Profundidad extra según crecimiento/riesgo, sin diferir blockers del release. |
| Asistente IA por materia, rangos, pagos ampliados y easter eggs | Expansiones separadas; conservar contexto académico, privacidad y permisos. |
| Producto nativo, widgets/hápticos y expansión de grupos | Solo tras evidencia y aprobación específica; ninguna app nativa está confirmada. |

## Inventario existente y decisiones conservadas

Las tablas siguientes preservan el estado registrado y alcance del roadmap anterior. No constituyen otra ruta de Gates ni obligan a completar cada fila antes de beta/público. El mínimo RELEASE-CRITICAL se define únicamente arriba; las mejoras restantes se asignan al catálogo Post-Launch. Conservar una feature existente no autoriza ampliarla, eliminar datos o habilitar acceso nuevo.

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

## Correspondencia de hitos anteriores

Calendar 1.0, Community/Progress, Owner Command Center, Analytics avanzado y Prioridades de Hoy quedan en el catálogo Post-Launch. La dirección Figma/Design System P0 ya aprobada guía 3F-C y Motion + SFX; no exige rehacer el sistema antes del slice. QA profundo se acota al release en Final Beta Readiness QA y Public Readiness; cobertura ampliada permanece futura. Beta 0.9 y Study Hub 1.0 conservan el versionado siguiente, sin fechas ni activación automática.

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
| QOL-06 | Planned | Loading y restauración sin layout jumps; definición única de skeleton y estados en 3F-C. |
| QOL-07 | Planned | Conservar en Guardado la microinteracción satisfactoria aprobada en Design System P0; motion se valida en Motion + SFX. |
| QOL-08 | Planned | Tooltips únicamente para iconos o acciones ambiguas. |
| QOL-09 | Planned | Si Más crece demasiado, evaluar búsqueda rápida o command menu en una fase futura. |
| QOL-10 | Planned | Estados consistentes: hover, pressed, selected, focus, disabled y loading cuando aplique. |
| QOL-11 | Planned | Pocas decisiones visibles mediante agrupación y progressive disclosure. |

## Nombres y agrupaciones de presentación

La definición canónica vive en 3F-C: Hoy, Tu estudio, Guardado, Comunidad y Producto y ayuda. Sustituye los nombres de presentación anteriores Planificación diaria/Biblioteca personal; Feedback y Reportar error conservan su acceso bajo Producto y ayuda. Las rutas, datos y persistencia no se fusionan por aprobar el roadmap.

## Procedure Workspace futuro

| Iniciativa | Estado | Alcance |
| --- | --- | --- |
| Núcleo compartido de procedimientos | Planned | Reutilizar persistencia, política de calculadora, teclado/móvil, Deshacer, Limpiar paso actual y reglas de Práctica/Examen entre Matemáticas y Ciencia, con plantillas especializadas y sin forzar workspace en preguntas que no lo necesiten. |
| Matemáticas | Planned | Multiplicación vertical, acarreos, productos parciales, decimal cuando corresponda y suma sexagesimal futura. División larga espera material de clase; resta sexagesimal sigue sin confirmar. |
| Ciencia | Planned | Integrar el Formula Workspace existente con el núcleo común, sin crear un Scratch Paper separado y preservando `Datos → Fórmula → Sustitución → Operación → Resultado → Unidad`. |
| Examen y Práctica | Planned | Examen prioriza papel y ofrece workspace digital opcional sin pistas ni validación previa; calculadora controlada por evaluación/tema. Práctica puede ofrecer pistas, `Comprobar paso` y feedback localizado. |
| Persistencia y descubrimiento | Planned | Guardar y salir conserva el workspace completo; la estructura conocida y las herramientas importantes permanecen descubribles. |

## QA y tooling: base existente y opciones futuras

| Iniciativa | Estado | Alcance |
| --- | --- | --- |
| Playwright + accesibilidad | Completed | Fundación local 3T con Playwright y Axe existentes; cada bug reproducible importante recibe la regresión más barata adecuada. Más cobertura se prioriza por riesgo, sin reabrir SSO remoto de 3T. |
| Documentación y lint | Planned | Base Oxlint gradual ya disponible; ampliación futura sin autofix masivo. Context7 bajo demanda sin dependencia de producto. |
| Flujo de ingeniería | Planned | Superpowers continúa como flujo estructurado; Ponytail protege YAGNI sin sacrificar mantenibilidad, accesibilidad, seguridad, pruebas ni UX; Astra sigue como referencia principal de QA visual. |
| Conocimiento del repositorio | Planned | Graphify continúa como grafo actual. GitNexus solo se evalúa si Graphify resulta insuficiente; Agent Skills de Addy Osmani se adopta únicamente cuando no duplique los flujos existentes. |
| Herramientas no prioritarias | Planned | gstack, SkillUI, Claude-Mem y OmniRoute no son prioridades. Strix o pruebas de penetración autorizadas pertenecen a la etapa posterior de ciberseguridad y pre-lanzamiento. |
| Lanzamiento y producto nativo | Planned | La preparación de lanzamiento público permanece separada de cualquier app nativa no confirmada; widgets y hápticos solo se evalúan si ese producto se aprueba. |

## Hitos de diseño ya registrados

La ruta FAST-RELEASE anterior sustituye el orden lineal antiguo. Las referencias 3F-B, 4R, 5R, 6A-R/6B-R/6C-R, 7A-R/7B-R/7C-R y fases 8/9/10 se conservan para trazabilidad; no imponen completar sus expansiones antes de beta/público. 3F-C sigue siendo el siguiente Gate de implementación.

| Hito registrado | Estado conservado | Referencia |
| --- | --- | --- |
| Fase 3C | Testing | Shell + Home base; las verificaciones pendientes se priorizan por el alcance de 3F-C. |
| Fase 3D | Completed | Visual Audit + Foundation Polish: branding, Cuenta/Entrar, motion global, Más, light/dark e inventario legacy. |
| Fase 3E | Testing | Auth + Account Foundation: Login, Registro, Recuperación, Cuenta y Configuración con P0; Dev Design Lab local aislado mediante fixtures sin autorización real. |
| Fase 3T | Completed | QA / Test Access Foundation; bootstrap 7C certificado y capacidades QA publicadas. Limitaciones remotas no bloqueantes documentadas en `docs/qa-7c-bootstrap.md`. Context & Integration Discipline sigue definido en `AGENTS.md`. |

Motion por fases anteriores queda referido a la única definición Motion + SFX. Los mínimos del loop ocurren antes de beta; el polish global ampliado de Fase 8 permanece Post-Launch.

## Base Hub existente

La jerarquía implementada es `Hub → Día → Materia → Unidad/Categoría → Tema`. Español conserva `spanish-v2` y muestra su tema actual como pendiente de confirmación; Historia reutiliza el motor mediante `historia-v1`; Ciencia usa `science-v1` con SI, Densidad y Temperatura separados; Matemáticas usa `math-v1` exclusivamente para Grados decimales a DMS. Inglés sigue deshabilitado pero muestra `Memoir` como material confirmado; Salud sigue deshabilitada.

El rebranding futuro será `Estudio Hub` con slug preferido `estudio-hub`. Repositorio, remote, dominio y nombre visible actual no cambian en esta fase.

## 3T / 7C — desbloqueo de sesión QA

**Completed:** QA-session listo y publicado; reutiliza el logout real con verificación de Account sin sincronizar/borrar progreso. Bootstrap 7C cerrado y cinco personas listas. Contrato en `ARCHITECTURE.md`; pruebas en `TESTING.md`; certificaciones y limitaciones en `docs/qa-7c-bootstrap.md`. El cierre no autoriza repetir bootstrap, resets o smoke remoto. La definición de 3F-C vive en la ruta FAST-RELEASE; su implementación requiere un Gate separado.
