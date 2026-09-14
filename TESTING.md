# Guía de pruebas

## Validación automática mínima

Antes de entregar cambios, extrae el único `<script>` inline de `public/index.html` y ejecútalo con `node --check -`. Valida después cada módulo:

```powershell
Get-ChildItem netlify/functions -Recurse -Filter *.mjs |
  ForEach-Object { node --check $_.FullName }
git diff --check
git status --short --branch
```

No uses datos ni stores reales para pruebas destructivas. Los dobles de Netlify Blobs deben ejecutarse en memoria.

## Matriz de regresión

- **Práctica:** rápida (10), intermedia (25), normal, por tema, errores y guardadas.
- **Respuesta:** selección múltiple, verdadero/falso, texto, segmentación y evidencia; primer error, segundo intento, pista, salto y feedback.
- **Navegación:** Anterior, Siguiente y Volver a pregunta actual sin alterar cola, respuestas ni estadísticas.
- **Persistencia:** pausar antes y después de responder, recargar, reanudar y terminar; comprobar historial, errores, guardadas y configuración.
- **Apariencia:** Claro, Oscuro, Automático y color personalizado en desktop y viewport móvil; recarga y cambio del esquema del sistema.
- **Cuenta/cloud:** login por username/email, remember me, logout/login, sync, resolución de conflicto y usuario antiguo sin campos nuevos.
- **Backend:** permisos `superdev > owner > admin > member`, suspensión, audit log, rate limiting, leaderboard y presencia.

## Evidencia de entrega

Registra comandos, resultado, errores de consola, rutas probadas, navegador/viewport y riesgos pendientes. Una prueba manual no se considera aprobada si altera datos reales o requiere revelar secretos.
