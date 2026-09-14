# Decisiones permanentes

## Organización académica

- Día 1 contiene: Inglés, Salud e Historia.
- Día 2 contiene: Ciencia, Matemáticas y Español.
- Español pertenece a Día 2 y no se archiva como materia.
- Cada materia tendrá un menú o listado de temas.
- Los temas anteriores permanecen accesibles; añadir material no reemplaza ni oculta el histórico.
- Todas las materias reutilizan el motor de estudio actualmente usado por Español.
- No se crean aplicaciones independientes por materia.

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

## Registro de decisiones

Las decisiones anteriores son restricciones del producto. Si una propuesta futura entra en conflicto, debe documentarse aquí con motivo, impacto de migración y aprobación explícita antes de implementarse.
