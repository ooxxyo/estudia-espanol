export const OTHER_SUBJECT_MESSAGE = 'Esta pregunta pertenece a otra materia. Abre esa materia para usar su asistente.';

function clean(value, max = 120) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

// Contrato futuro para cualquier proveedor de IA. El contenido generado nunca
// se mezcla con esta colección oficial ni reemplaza sus definiciones.
export function normalizeAssistantContext(input = {}) {
  const approvedContent = Array.isArray(input.approvedContent)
    ? input.approvedContent.filter(item => item && typeof item === 'object').slice(0, 200)
    : [];
  return {
    subjectId: clean(input.subjectId, 40),
    subjectName: clean(input.subjectName, 80),
    unitId: clean(input.unitId, 80),
    unitName: clean(input.unitName, 120),
    topicId: clean(input.topicId, 80),
    topicName: clean(input.topicName, 120),
    approvedContent,
    source: 'approved',
  };
}

export function authorizeAssistantSubject(context, requestedSubjectId) {
  const active = normalizeAssistantContext(context);
  const requested = clean(requestedSubjectId, 40);
  if (!active.subjectId || !requested || requested !== active.subjectId) {
    return { allowed: false, message: OTHER_SUBJECT_MESSAGE, context: active };
  }
  return { allowed: true, message: '', context: active };
}
