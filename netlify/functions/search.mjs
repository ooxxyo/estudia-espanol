import { authenticateRequest } from './_shared/auth.mjs';
import { cleanText, isBlockedBetween, json, listRows, paginateRows, validDate } from './_shared/platform.mjs';
import { COMMUNITY } from './community.mjs';
import { CALENDAR, ASSIGNMENTS } from './calendar.mjs';
import { PUBLIC_ROADMAP } from './roadmap.mjs';
import { validateAcademicScope } from './groups.mjs';

const SUBJECTS = Object.freeze([
  { id: 'ingles', title: 'Inglés' }, { id: 'salud', title: 'Salud' }, { id: 'historia', title: 'Historia' },
  { id: 'ciencia', title: 'Ciencia' }, { id: 'matematicas', title: 'Matemáticas' }, { id: 'espanol', title: 'Español' },
]);

function matches(row, query) { return `${row.title || ''} ${row.description || ''} ${row.text || ''}`.toLowerCase().includes(query); }

export default async (req) => {
  try {
    if (req.method !== 'GET') return json({ error: 'Método no permitido.' }, 405);
    const url = new URL(req.url); const query = cleanText(url.searchParams.get('q'), 120).toLowerCase();
    if (query.length < 2) return json({ error: 'Escribe al menos dos caracteres.' }, 400);
    const auth = await authenticateRequest(req);
    const classGroupId = cleanText(url.searchParams.get('classGroupId'), 80); const schoolYearId = cleanText(url.searchParams.get('schoolYearId'), 80); const termId = cleanText(url.searchParams.get('termId'), 80);
    const subjectId = cleanText(url.searchParams.get('subject'), 40); const type = cleanText(url.searchParams.get('type'), 40); const date = validDate(url.searchParams.get('date'));
    if (classGroupId && !auth.ok) return json({ error: 'Inicia sesión para buscar dentro de un grupo.' }, 401);
    if (classGroupId || schoolYearId || termId) { const scope = await validateAcademicScope(auth, { classGroupId, schoolYearId, termId }); if (!scope.ok) return json({ error: scope.error }, scope.status); }
    const results = [
      ...SUBJECTS.filter(item => item.title.toLowerCase().includes(query)).map(item => ({ type: 'subject', id: item.id, title: item.title, description: 'Materia del Study Hub' })),
      ...PUBLIC_ROADMAP.filter(item => item.visible && matches(item, query)).map(item => ({ type: 'roadmap', id: item.id, title: item.title, description: item.description })),
    ];
    if (auth.ok) {
      const contributions = await listRows(COMMUNITY, 'contributions/', 1000);
      for (const row of contributions) {
        if (row.removed || (row.classGroupId && row.classGroupId !== classGroupId) || (!row.classGroupId && classGroupId) || (schoolYearId && row.schoolYearId !== schoolYearId) || (termId && row.termId !== termId) || (subjectId && row.subjectId !== subjectId) || (date && row.date !== date) || ['rejected', 'duplicate'].includes(row.status) || !matches(row, query) || (row.authorId !== auth.user.id && await isBlockedBetween(auth.user.id, row.authorId))) continue;
        results.push({ type: 'community', id: row.contributionId, title: cleanText(row.title, 140), description: 'Aporte comunitario', subjectId: row.subjectId, date: row.date });
      }
      const [events, assignments] = await Promise.all([listRows(CALENDAR, 'events/', 1000), listRows(ASSIGNMENTS, 'assignments/', 1000)]);
      results.push(...events.filter(row => !row.removed && (!(row.classGroupId) ? !classGroupId : row.classGroupId === classGroupId) && (!schoolYearId || row.schoolYearId === schoolYearId) && (!termId || row.termId === termId) && (!subjectId || row.subjectId === subjectId) && (!date || row.date === date) && matches(row, query)).map(row => ({ type: 'calendar', id: row.eventId, title: cleanText(row.title, 140), description: 'Evento del calendario', subjectId: row.subjectId, date: row.date })));
      results.push(...assignments.filter(row => !row.removed && (!(row.classGroupId) ? !classGroupId : row.classGroupId === classGroupId) && (!schoolYearId || row.schoolYearId === schoolYearId) && (!termId || row.termId === termId) && (!subjectId || row.subjectId === subjectId) && (!date || row.dueDate === date || row.assignedDate === date) && matches(row, query)).map(row => ({ type: 'assignment', id: row.assignmentId, title: cleanText(row.title, 140), description: 'Asignación', subjectId: row.subjectId, date: row.dueDate || row.assignedDate })));
    }
    const filtered = results.filter(row => (!type || row.type === type) && (!subjectId || row.subjectId === subjectId || (row.type === 'subject' && row.id === subjectId)) && (!date || row.date === date));
    const page = paginateRows(filtered, url.searchParams);
    return json({ results: page.items, nextCursor: page.nextCursor, limit: page.limit, authenticated: auth.ok });
  } catch (error) {
    console.error('search function error', { name: error?.name || 'Error' });
    return json({ error: 'No se pudo completar la búsqueda.' }, 500);
  }
};
