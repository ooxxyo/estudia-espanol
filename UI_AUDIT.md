# Fase 3D — Visual Audit + Foundation Polish

## Alcance y etiquetas

Esta auditoría registra el producto existente sin cambiar rutas, contratos, datos ni permisos. Las etiquetas significan:

- **KEEP:** estructura o función válida que debe preservarse.
- **REDESIGN:** necesita la dirección visual aprobada en una fase posterior.
- **REMOVE VISUAL LEGACY:** conserva la función, pero sustituye presentación obsoleta.
- **AUTH REQUIRED:** depende de una cuenta o permiso real para QA completo.
- **NEEDS MOTION:** necesita continuidad o feedback intencional.
- **NEEDS MOBILE PASS:** requiere revisión específica en pantalla pequeña.
- **NEEDS DARK PASS:** requiere ajuste específico en modo oscuro.

## Inventario del producto real

| Vista | Clasificación | Nota de próxima fase |
| --- | --- | --- |
| Home | KEEP | Foundation P0 aplicada; continuar QA de estados reales. |
| Más | KEEP | Agrupación aprobada y filas editoriales; vigilar crecimiento futuro. |
| Login | REDESIGN · AUTH REQUIRED · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 3E. |
| Registro | REDESIGN · AUTH REQUIRED · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 3E. |
| Recuperar contraseña | REDESIGN · AUTH REQUIRED · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 3E. |
| Cuenta | REDESIGN · AUTH REQUIRED · NEEDS MOTION · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 3E; conservar contratos de sesión y sync. |
| Configuración | REDESIGN · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 3E; conservar preferencias compatibles. |
| Materia | REDESIGN · REMOVE VISUAL LEGACY · NEEDS MOTION · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 4. |
| Unidad | REDESIGN · REMOVE VISUAL LEGACY · NEEDS MOTION · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 4. |
| Tema | REDESIGN · REMOVE VISUAL LEGACY · NEEDS MOTION · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 4. |
| Repasar | REDESIGN · REMOVE VISUAL LEGACY · NEEDS MOTION · NEEDS MOBILE PASS · NEEDS DARK PASS | Fases 4–5; conservar intención académica. |
| Practicar | REDESIGN · REMOVE VISUAL LEGACY · NEEDS MOTION · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 5; Practicar continúa como acción principal. |
| Examen | REDESIGN · REMOVE VISUAL LEGACY · NEEDS MOTION · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 5; sin feedback anticipado. |
| Resultados | REDESIGN · REMOVE VISUAL LEGACY · NEEDS MOTION · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 5; SUCCESS/MILESTONE solo con mérito real. |
| Progreso | REDESIGN · NEEDS MOTION · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 6. |
| Historial | REDESIGN · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 6; preservar disclosures y snapshots. |
| Errores | REDESIGN · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 6. |
| Guardadas | REDESIGN · NEEDS MOTION · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 6; conservar feedback satisfactorio P0. |
| Favoritos | REDESIGN · NEEDS MOTION · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 6; futura presentación unificada con Biblioteca personal, sin fusionar datos todavía. |
| Buscar | REDESIGN · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 6. |
| Hoy | REDESIGN · NEEDS MOBILE PASS · NEEDS DARK PASS | Mantener ruta; futura presentación de Planificación diaria. |
| Qué estudiar hoy | REDESIGN · NEEDS MOBILE PASS · NEEDS DARK PASS | Mantener ruta; futura presentación de Planificación diaria. |
| Calendario | REDESIGN · NEEDS MOBILE PASS · NEEDS DARK PASS | Calendar 1.0 posterior. |
| Comunidad | REDESIGN · AUTH REQUIRED · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 7; mantener contenido oficial separado. |
| Grupos | REDESIGN · AUTH REQUIRED · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 7. |
| Personas | REDESIGN · AUTH REQUIRED · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 7; privacidad y bloqueo intactos. |
| Notificaciones | REDESIGN · AUTH REQUIRED · NEEDS MOTION · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 7. |
| Leaderboard | REDESIGN · AUTH REQUIRED · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 7; conservar compatibilidad de entradas. |
| Novedades | KEEP · NEEDS MOBILE PASS · NEEDS DARK PASS | Mantener actualización aprobada y estado visto. |
| Roadmap | KEEP · NEEDS MOBILE PASS · NEEDS DARK PASS | Informativo; nunca concede acceso. |
| Feedback | REDESIGN · AUTH REQUIRED · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 7; datos privados. |
| Reportar error | REDESIGN · AUTH REQUIRED · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 7; futura presentación bajo Ayuda sin fusionar contratos. |
| Owner/Admin | REDESIGN · AUTH REQUIRED · NEEDS MOBILE PASS · NEEDS DARK PASS | Fase 7; autorización exclusivamente backend. |
| Analytics | REDESIGN · AUTH REQUIRED | Fase 7; aún no implementado. |
| System Health | REDESIGN · AUTH REQUIRED · NEEDS DARK PASS | Fase 7; exclusivo de Super Dev interno. |

## Auditoría de iconos

El UI mezcla emojis académicos, símbolos Unicode, pictogramas de navegación y controles que parecen nativos del navegador. Los grupos más visibles son: emojis de materias y modos, `⌂`, `▤`, `▶`, `▦`, `▥`, `▣`, `★`, `●`, `⚙`, flechas de texto, corazones y símbolos de estado. Los lettermarks académicos `H`, `Ci`, `°` y `Aa` sí encajan con la dirección editorial y pueden mantenerse como identidad de materia.

**Recomendación futura: Lucide.** Su cuadrícula y stroke son consistentes, ofrece buena cobertura de utilidades, resulta fácil de servir como SVG accesible y permite importar solo los iconos usados. Phosphor es una alternativa visualmente cálida y ofrece pesos útiles, pero añade más decisiones de variantes y hace más fácil mezclar estilos. No se instala ninguna librería en Fase 3D. Antes de migrar se definirá un mapa semántico único, tamaño/stroke estándar, `aria-hidden` para decoración y nombre accesible en botones sin texto.

## Recomendación de motion

La base recomendada es **CSS + View Transitions API progresiva**. CSS cubre PRESS, transiciones de estado, Más y fallback; View Transitions aporta continuidad de salida/entrada sin clonar el DOM ni animar layout. En navegadores sin soporte se usa un ENTER corto con `transform` y `opacity`. `prefers-reduced-motion` elimina desplazamiento y reduce la transición prácticamente a un frame.

Motion/Motion One solo debe evaluarse en Fases 5 u 8 si SUCCESS, MILESTONE, FLIP o coreografías interrumpibles justifican una dependencia. No aporta valor suficiente a la navegación corta actual para instalarlo ahora.

## Fase 3E — Local Design / QA Mode

Debe existir únicamente en desarrollo local, con banner inequívoco y datos falsos aislados. Permitirá previsualizar: logged out, usuario nuevo, usuario normal, usuario con progreso y Owner. Las fixtures no reutilizarán sesiones, stores ni cuentas reales; la simulación de Owner será de presentación y nunca desbloqueará endpoints ni permisos backend. La activación exigirá contexto local y una bandera de desarrollo eliminada del build productivo.

## Staging / Testing real y Demo Access futuro

Staging será un entorno posterior separado de `main` y producción, con cuentas de prueba reales, variables, funciones y almacenamiento propios. Debe permitir QA de auth/sync sin tocar datos productivos.

Demo Access es otra capacidad futura para presidente, maestros, beta testers y demostraciones. Requiere validación backend, expiración, revocación, rate limiting, audit log, permisos mínimos, cero elevación administrativa automática y cero acceso a datos privados reales. No comparte el bypass visual del QA local.
