# Decisiones permanentes

## Organización académica

- Día 1 contiene: Inglés, Salud e Historia.
- Día 2 contiene: Ciencia, Matemáticas y Español.
- Español pertenece a Día 2 y no se archiva como materia.
- Cada materia tendrá un menú o listado de temas.
- Los temas anteriores permanecen accesibles; añadir material no reemplaza ni oculta el histórico.
- Todas las materias reutilizan el motor de estudio actualmente usado por Español.
- No se crean aplicaciones independientes por materia.

## Identidad y navegación del Hub

- El nombre general provisional es `Study Hub`; la versión visible permanece en `v2.0`.
- La jerarquía del producto es `Hub → Día → Materia → Tema`.
- Existe un único catálogo de materias como fuente de nombre, emoji, día, estado y disponibilidad.
- Español es la primera implementación real del Study Engine.
- Inglés, Salud, Historia, Ciencia y Matemáticas permanecen como `Próximamente` hasta tener contenido real.
- Entrar o salir de una materia no elimina una práctica ni modifica su progreso.
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
- Early Access usa una fuente central de Feature Flags con estados `hidden`, `development`, `experimental`, `preview` y `ready`.
- Los reportes de feedback son visibles para su autor y personal autorizado. Cambios de estado y acciones administrativas quedan auditados.
- La navegación normal guarda prácticas recuperables sin pedir confirmación; las acciones irreversibles o administrativas críticas siempre la exigen.
- El término académico correcto es `Interfijo`; su abreviatura es `MDI = Morfema Derivativo Interfijo`. `INF` solo se acepta internamente como alias de sesiones antiguas.
- El Study Engine es universal y admite extensiones por materia sin duplicar la aplicación.
- Una IA futura se limita al material aprobado de la materia y tema activos.
- Design Lab permitirá comparar Classic UI con New UI Beta mediante Early Access; no forma parte de la interfaz estable actual.

## Registro de decisiones

Las decisiones anteriores son restricciones del producto. Si una propuesta futura entra en conflicto, debe documentarse aquí con motivo, impacto de migración y aprobación explícita antes de implementarse.
