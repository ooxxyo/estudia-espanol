CUADERNO · EXAMEN DE ESPAÑOL — v1.7 FINAL

Contenido:
- public/index.html: sitio completo.
- netlify/functions/leaderboard.mjs: leaderboard compartido.
- package.json: dependencia de Netlify Blobs.
- netlify.toml: configuración del deploy.

IMPORTANTE:
Para que el leaderboard compartido funcione, este proyecto debe desplegarse con el sistema de builds de Netlify (por ejemplo, conectando un repositorio de GitHub o usando Netlify CLI). Un simple Drag & Drop de index.html publica el sitio, pero no compila/despliega la función del leaderboard.

El resto del sitio (progreso local, práctica, examen, historial, colores, etc.) funciona aunque el leaderboard todavía no esté conectado.
