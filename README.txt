CUADERNO · EXAMEN DE ESPAÑOL — v2.0 FINAL

Contenido del proyecto:
- public/index.html: sitio completo.
- netlify/functions/account.mjs: registro, login, sesión persistente, sincronización y recuperación de contraseña.
- netlify/functions/leaderboard.mjs: leaderboard compartido ligado a cuentas.
- package.json: dependencia de Netlify Blobs.
- netlify.toml: configuración de deploy.

NOVEDADES v2.0
- Cuentas con username + contraseña y email opcional.
- Username único; una cuenta = una identidad del leaderboard.
- Sesión recordada mediante cookie segura HttpOnly.
- Código de recuperación entregado una sola vez al registrarse.
- Todo el progreso del hub se sincroniza a la cuenta: estadísticas, historial, errores, guardadas y configuración.
- Al iniciar sesión en otro dispositivo se carga el progreso guardado en la cuenta.
- El leaderboard muestra de forma compacta la mejor nota, número de preguntas, temas usados y si fue examen completo.
- Configuración de color, modo claro/oscuro/automático y preferencias de examen/práctica también se sincronizan.
- El almacenamiento local e IndexedDB siguen funcionando como respaldo y modo offline/local.

DEPLOY EN NETLIFY
- Branch: main
- Base directory: vacío
- Build command: vacío
- Publish directory: public
- Functions directory: netlify/functions

SEGURIDAD
- Las contraseñas se transforman con scrypt y sal aleatoria antes de guardarse; nunca se almacenan como texto normal.
- La cookie de sesión es HttpOnly, Secure y SameSite=Lax.
- No se permite restablecer una contraseña solo con saber el username. Se exige el código de recuperación.
- El email es opcional y actualmente no envía correos; el mecanismo de recuperación es el código mostrado al crear la cuenta.

IMPORTANTE
Conserva el mismo proyecto/dominio de Netlify. Las futuras versiones deben seguir usando las mismas claves de almacenamiento y stores para mantener las cuentas y el progreso.


MEJORAS DE CUENTA v2.0.1
- Registro básico: username + contraseña, email opcional.
- Registro con email: username + email + contraseña.
- Login usando username o email cuando la cuenta tiene email.
- Opción Mantener sesión iniciada.
- Mostrar/ocultar contraseña y medidor simple de fortaleza.
- Recuperación usando username o email + código de recuperación.
- Email único para evitar cuentas duplicadas por el mismo correo.


ACTUALIZACIÓN 2.0.2
- El branding ahora muestra: Cuaderno / Español / versión.
- El Panel separa Temas actuales y Exámenes pasados.
- Exámenes pasados queda vacío hasta que se proporcionen exámenes reales.
- Se mantiene la misma clave estable de progreso y la sincronización de cuentas.
- La estructura SUBJECT queda preparada para añadir más materias en el futuro sin rediseñar la aplicación.


ACTUALIZACIÓN 2.1.0
- Contador aproximado de usuarios conectados (ventana activa de 90 segundos).
- Nueva Netlify Function: netlify/functions/presence.mjs.
- Modo Experimental dentro de Practicar.
- El modo experimental genera variaciones locales de preguntas mediante plantillas.
- Siempre muestra advertencia de posibles errores.
- Las sesiones experimentales NO afectan estadísticas, historial, errores ni leaderboard.
- Se conserva la misma clave estable de progreso y toda la sincronización de cuentas.


VERSIÓN GRANDE 2.0
- La versión pública visible es v2.0.
- Prácticas normales pueden pausarse con “Guardar y salir”.
- Practicar muestra “Continuar práctica” con la pregunta exacta y progreso.
- El Panel también muestra una tarjeta para continuar una práctica pendiente.
- Cerrar/minimizar la página crea un checkpoint automático.
- Una práctica normal pausada puede sincronizarse con la cuenta y recuperarse en otro dispositivo.
- Empezar una práctica nueva avisa antes de descartar la anterior.
- Exámenes incompletos no se convierten en prácticas guardadas.
- Modo Experimental sigue fuera de estadísticas, historial y leaderboard.
- Se conservan cuentas, leaderboard, presencia online, personalización, historial y progreso estable.


VERSIÓN 2.0 GRANDE, REFINADA Y FINAL
- La retroalimentación correcta/incorrecta ahora incluye:
  1) por qué la respuesta es correcta o incorrecta;
  2) definición del concepto relacionado cuando existe en el material de repaso;
  3) un ejemplo relacionado para entenderlo;
  4) una clave para reconocer el concepto la próxima vez.
- La revisión de preguntas saltadas también muestra referencia educativa.
- Las definiciones y ejemplos se toman del material REVIEW_CARDS del propio cuaderno.
- Se corrigió la construcción innecesariamente condicional del texto de segmentación.
- Se limpiaron variables/parámetros menores sin cambiar el comportamiento.
- Se conservan la misma versión pública v2.0, almacenamiento, cuentas, progreso, prácticas pausadas, leaderboard, presencia y modo experimental.
