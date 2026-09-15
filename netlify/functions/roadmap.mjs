import { json } from './_shared/platform.mjs';

export const PUBLIC_ROADMAP = Object.freeze([
  ['community', 'Comunidad', 'Comparte apuntes, tareas y anuncios con revisión.', 'testing', 'community'],
  ['calendar', 'Calendario', 'Organiza pruebas, tareas y fechas importantes.', 'testing', 'organization'],
  ['friends', 'Amigos', 'Conecta con compañeros usando controles de privacidad.', 'testing', 'social'],
  ['today', 'Lo que dieron hoy', 'Consulta aportes y eventos del día por materia.', 'testing', 'community'],
  ['missed-today', 'Falté hoy', 'Reúne eventos y materiales de una fecha para ponerse al día.', 'development', 'study'],
  ['notifications', 'Centro de notificaciones', 'Avisos privados sobre solicitudes, aportes y calendario.', 'testing', 'account'],
  ['today-dashboard', 'Dashboard de hoy', 'Prioriza próximos eventos y actividad pendiente.', 'development', 'study'],
  ['groups', 'Clases y grupos', 'Separa contenido por grupo y año escolar.', 'development', 'organization'],
  ['assignments', 'Assignments', 'Seguimiento personal de tareas y entregas.', 'development', 'organization'],
  ['reminders', 'Recordatorios', 'Avisos basados únicamente en fechas reales.', 'development', 'organization'],
  ['study-today', 'Qué estudiar hoy', 'Recomendaciones basadas en progreso real.', 'development', 'study'],
  ['prepare-test', 'Preparar prueba', 'Sesiones de 15, 30 o 60 minutos.', 'coming_soon', 'study'],
  ['weak-practice', 'Practicar débiles', 'Refuerzo con preguntas oficiales existentes.', 'development', 'study'],
  ['flashcards', 'Flashcards inteligentes', 'Marca Lo sé o No lo sé y prepara repetición.', 'coming_soon', 'study'],
  ['cumulative-exams', 'Exámenes acumulativos', 'Combina unidades sin mezclar materias.', 'future', 'study'],
  ['search', 'Búsqueda', 'Encuentra material permitido por materia y tipo.', 'development', 'tools'],
  ['favorites', 'Favoritos', 'Guarda temas, aportes, eventos y materiales.', 'future', 'tools'],
  ['materials', 'Centro de materiales', 'Biblioteca organizada por materia y unidad.', 'future', 'tools'],
  ['shared-material', 'Material compartido', 'Contenido comunitario claramente identificado.', 'development', 'community'],
  ['uploads', 'Fotos y PDF', 'Adjuntos moderados para material escolar.', 'future', 'community'],
  ['offline', 'Modo sin conexión', 'Práctica offline y sincronización posterior.', 'future', 'platform'],
  ['ai-assistant', 'Asistente IA por materia', 'Ayuda restringida al contenido académico aprobado.', 'development', 'experimental'],
  ['profiles', 'Mejoras de perfil', 'Perfil limitado con privacidad y rango visible.', 'coming_soon', 'account'],
  ['friend-activity', 'Actividad de amigos', 'Actividad opt-in y privada por defecto.', 'future', 'social'],
  ['academic-tools', 'Más herramientas académicas', 'Nuevos modos sobre el motor universal.', 'future', 'study'],
].map(([id, title, description, status, category]) => ({ id, title, description, status, category, visible: true, earlyAccessAvailable: false, updatedAt: 0 })));

export default async (req) => {
  if (req.method !== 'GET') return json({ error: 'Método no permitido.' }, 405);
  return json({ items: PUBLIC_ROADMAP.filter(item => item.visible) });
};
