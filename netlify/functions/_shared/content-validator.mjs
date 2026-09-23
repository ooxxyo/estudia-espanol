const VALID_UNIT_STATUSES = new Set(['current', 'previous', 'completed', 'archived']);

export function validateAcademicCatalog(subjects = []) {
  const errors = [];
  if (!Array.isArray(subjects)) return { valid: false, errors: ['subjects debe ser un array.'] };
  const seen = { subject: new Set(), unit: new Set(), topic: new Set(), card: new Set(), question: new Set() };
  const duplicate = (kind, id) => {
    if (!id) errors.push(`${kind} sin id.`);
    else if (seen[kind].has(id)) errors.push(`${kind} duplicado: ${id}.`);
    else seen[kind].add(id);
  };
  for (const subject of subjects) {
    duplicate('subject', subject?.id);
    for (const field of ['units', 'topics', 'reviewCards', 'questions']) if (!Array.isArray(subject?.[field])) errors.push(`${subject?.id || 'subject'}.${field} debe ser un array.`);
    const units = Array.isArray(subject?.units) ? subject.units : [];
    const topics = Array.isArray(subject?.topics) ? subject.topics : [];
    const cards = Array.isArray(subject?.reviewCards) ? subject.reviewCards : [];
    const questions = Array.isArray(subject?.questions) ? subject.questions : [];
    const unitIds = new Set();
    const topicIds = new Set();
    const cardSignatures = new Set();
    const questionSignatures = new Set();
    for (const unit of units) {
      duplicate('unit', unit?.id); unitIds.add(unit?.id);
      if (unit?.subjectId !== subject?.id) errors.push(`unit ${unit?.id || '?'} pertenece a otra materia.`);
      if (!VALID_UNIT_STATUSES.has(unit?.status)) errors.push(`unit ${unit?.id || '?'} tiene status inválido.`);
    }
    for (const topic of topics) {
      duplicate('topic', topic?.id); topicIds.add(topic?.id);
      if (topic?.subjectId && topic.subjectId !== subject?.id) errors.push(`topic ${topic.id} pertenece a otra materia.`);
      if (topic?.unitId && !unitIds.has(topic.unitId)) errors.push(`topic ${topic.id} referencia unit inexistente.`);
    }
    cards.forEach((card, index) => {
      duplicate('card', card?.id || `${subject?.id}:card:${index}`);
      if (!topicIds.has(card?.topicId || card?.topic)) errors.push(`review card ${card?.id || index} huérfana.`);
      if (card?.subjectId && card.subjectId !== subject?.id) errors.push(`review card ${card?.id || index} pertenece a otra materia.`);
      const signature = JSON.stringify([card?.topicId || card?.topic, card?.title, card?.def, card?.example]);
      if (cardSignatures.has(signature)) errors.push(`review card duplicada estructuralmente: ${card?.id || index}.`); else cardSignatures.add(signature);
    });
    questions.forEach((question, index) => {
      duplicate('question', question?.id || `${subject?.id}:question:${index}`);
      if (!topicIds.has(question?.topicId || question?.topic)) errors.push(`question ${question?.id || index} huérfana.`);
      if (question?.subjectId && question.subjectId !== subject?.id) errors.push(`question ${question?.id || index} pertenece a otra materia.`);
      if (question?.type === 'mc' && (!Array.isArray(question.options) || !Number.isInteger(question.correct) || question.correct < 0 || question.correct >= question.options.length)) errors.push(`question ${question?.id || index} tiene respuesta inválida.`);
      if (question?.type === 'tf' && typeof question.correct !== 'boolean') errors.push(`question ${question?.id || index} no tiene respuesta booleana.`);
      if (question?.type === 'numeric' && (!Number.isFinite(question.answer) || typeof question.unitSymbol !== 'string' || !question.unitSymbol)) errors.push(`question ${question?.id || index} no tiene respuesta numérica y unidad válidas.`);
      const signature = JSON.stringify([question?.topicId || question?.topic, question?.type, question?.prompt, question?.options, question?.correct]);
      if (questionSignatures.has(signature)) errors.push(`question duplicada estructuralmente: ${question?.id || index}.`); else questionSignatures.add(signature);
    });
  }
  return { valid: errors.length === 0, errors };
}
