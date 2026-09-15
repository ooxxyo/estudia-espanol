import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';
import { authenticateRequest, canAccessAdmin, resolveUser } from './_shared/auth.mjs';
import { SUBJECTS, auditEvent, cleanText, json, listRows, readBody, validDate } from './_shared/platform.mjs';

export const CLASS_GROUPS = getStore('study-hub-class-groups-v1');
export const SCHOOL_YEARS = getStore('study-hub-school-years-v1');

export async function canAccessGroup(auth, classGroupId) {
  if (!classGroupId) return true;
  if (!auth?.ok) return false;
  if (!await CLASS_GROUPS.get(`groups/${classGroupId}`, { type: 'json', consistency: 'strong' })) return false;
  if (canAccessAdmin(auth.role)) return true;
  return Boolean(await CLASS_GROUPS.get(`memberships/${classGroupId}/${auth.user.id}`, { type: 'json', consistency: 'strong' }));
}

export async function validateAcademicScope(auth, input = {}) {
  const classGroupId = cleanText(input.classGroupId, 80);
  let schoolYearId = cleanText(input.schoolYearId, 80);
  const termId = cleanText(input.termId, 80);
  const subjectId = cleanText(input.subjectId, 40);
  let group = null;
  if (classGroupId) {
    group = await CLASS_GROUPS.get(`groups/${classGroupId}`, { type: 'json', consistency: 'strong' });
    if (!group) return { ok: false, status: 404, error: 'Grupo no encontrado.' };
    if (!await canAccessGroup(auth, classGroupId)) return { ok: false, status: 403, error: 'No tienes acceso a este grupo.' };
    if (subjectId && group.subjectId !== subjectId) return { ok: false, status: 400, error: 'La materia no corresponde al grupo.' };
    if (schoolYearId && group.schoolYearId !== schoolYearId) return { ok: false, status: 400, error: 'El año escolar no corresponde al grupo.' };
    schoolYearId = group.schoolYearId;
  }
  if (termId && !schoolYearId) return { ok: false, status: 400, error: 'El trimestre requiere un año escolar.' };
  const schoolYear = schoolYearId ? await SCHOOL_YEARS.get(`years/${schoolYearId}`, { type: 'json', consistency: 'strong' }) : null;
  if (schoolYearId && !schoolYear) return { ok: false, status: 404, error: 'Año escolar no encontrado.' };
  const term = termId ? (Array.isArray(schoolYear.terms) ? schoolYear.terms : []).find(item => item.termId === termId) : null;
  if (termId && !term) return { ok: false, status: 404, error: 'Trimestre no encontrado en este año escolar.' };
  return { ok: true, classGroupId, schoolYearId, termId, group, schoolYear, term };
}

function publicGroup(row) { return { classGroupId: row.classGroupId, name: cleanText(row.name, 100), subjectId: row.subjectId, schoolYearId: row.schoolYearId, period: cleanText(row.period, 60), teacherLabel: cleanText(row.teacherLabel, 80), visibility: row.visibility, createdAt: row.createdAt }; }
function publicYear(row) { return { schoolYearId: row.schoolYearId, label: cleanText(row.label, 40), startDate: row.startDate, endDate: row.endDate, status: row.status, terms: Array.isArray(row.terms) ? row.terms.map(term => ({ termId: cleanText(term.termId, 80), label: cleanText(term.label, 60), startDate: validDate(term.startDate), endDate: validDate(term.endDate) })) : [] }; }

export default async (req) => {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.ok) return json({ error: 'Inicia sesión para consultar grupos.' }, 401);
    if (req.method === 'GET') {
      const [groups, years, memberships] = await Promise.all([listRows(CLASS_GROUPS, 'groups/'), listRows(SCHOOL_YEARS, 'years/'), listRows(CLASS_GROUPS, 'memberships/')]);
      const allowed = canAccessAdmin(auth.role) ? groups : groups.filter(group => memberships.some(row => row.classGroupId === group.classGroupId && row.userId === auth.user.id));
      return json({ groups: allowed.map(publicGroup), schoolYears: years.map(publicYear), canManage: canAccessAdmin(auth.role) });
    }
    if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
    if (!canAccessAdmin(auth.role)) return json({ error: 'No tienes permiso para administrar grupos.' }, 403);
    const body = await readBody(req); const action = cleanText(body.action, 30);
    if (action === 'create-year') {
      const label = cleanText(body.label, 40); const startDate = validDate(body.startDate); const endDate = validDate(body.endDate);
      if (label.length < 4 || !startDate || !endDate || startDate > endDate) return json({ error: 'Año escolar inválido.' }, 400);
      const row = { schemaVersion: 1, schoolYearId: randomUUID(), label, startDate, endDate, status: body.status === 'current' ? 'current' : 'archived', terms: [], createdAt: Date.now(), createdBy: auth.user.id };
      await SCHOOL_YEARS.setJSON(`years/${row.schoolYearId}`, row);
      await auditEvent(auth, 'school-year-created', { schoolYearId: row.schoolYearId, status: row.status });
      return json({ ok: true, schoolYear: publicYear(row) }, 201);
    }
    if (action === 'add-term') {
      const schoolYearId = cleanText(body.schoolYearId, 80); const label = cleanText(body.label, 60); const startDate = validDate(body.startDate); const endDate = validDate(body.endDate);
      const year = await SCHOOL_YEARS.get(`years/${schoolYearId}`, { type: 'json', consistency: 'strong' });
      if (!year) return json({ error: 'Año escolar no encontrado.' }, 404);
      if (label.length < 2 || !startDate || !endDate || startDate > endDate || startDate < year.startDate || endDate > year.endDate) return json({ error: 'Trimestre inválido o fuera del año escolar.' }, 400);
      year.terms = Array.isArray(year.terms) ? year.terms : [];
      if (year.terms.some(term => cleanText(term.label, 60).toLowerCase() === label.toLowerCase())) return json({ error: 'Ya existe un trimestre con ese nombre.' }, 409);
      const term = { termId: randomUUID(), label, startDate, endDate, createdAt: Date.now(), createdBy: auth.user.id };
      year.terms.push(term); year.updatedAt = Date.now();
      await SCHOOL_YEARS.setJSON(`years/${schoolYearId}`, year);
      await auditEvent(auth, 'school-term-created', { schoolYearId, termId: term.termId });
      return json({ ok: true, schoolYear: publicYear(year), term: publicYear(year).terms.find(item => item.termId === term.termId) }, 201);
    }
    if (action === 'set-current-year') {
      const schoolYearId = cleanText(body.schoolYearId, 80); const selected = await SCHOOL_YEARS.get(`years/${schoolYearId}`, { type: 'json', consistency: 'strong' });
      if (!selected) return json({ error: 'Año escolar no encontrado.' }, 404);
      const years = await listRows(SCHOOL_YEARS, 'years/');
      await Promise.all(years.map(async year => {
        const nextStatus = year.schoolYearId === schoolYearId ? 'current' : 'archived';
        if (year.status !== nextStatus) { year.status = nextStatus; year.updatedAt = Date.now(); await SCHOOL_YEARS.setJSON(`years/${year.schoolYearId}`, year); }
      }));
      await auditEvent(auth, 'school-year-selected', { schoolYearId });
      return json({ ok: true, schoolYear: publicYear({ ...selected, status: 'current' }) });
    }
    if (action === 'create-group') {
      const name = cleanText(body.name, 100); const subjectId = cleanText(body.subjectId, 40); const schoolYearId = cleanText(body.schoolYearId, 80);
      if (name.length < 3 || !SUBJECTS.has(subjectId) || !schoolYearId || !await SCHOOL_YEARS.get(`years/${schoolYearId}`, { type: 'json', consistency: 'strong' })) return json({ error: 'Grupo inválido.' }, 400);
      const row = { schemaVersion: 1, classGroupId: randomUUID(), name, subjectId, schoolYearId, period: cleanText(body.period, 60), teacherLabel: cleanText(body.teacherLabel, 80), visibility: 'members', createdAt: Date.now(), createdBy: auth.user.id };
      await CLASS_GROUPS.setJSON(`groups/${row.classGroupId}`, row);
      await auditEvent(auth, 'class-group-created', { classGroupId: row.classGroupId, schoolYearId, subjectId });
      return json({ ok: true, group: publicGroup(row) }, 201);
    }
    if (action === 'add-member' || action === 'remove-member') {
      const classGroupId = cleanText(body.classGroupId, 80); const group = await CLASS_GROUPS.get(`groups/${classGroupId}`, { type: 'json', consistency: 'strong' }); const target = await resolveUser(cleanText(body.username, 120));
      if (!group || !target) return json({ error: 'Grupo o usuario no encontrado.' }, 404);
      const key = `memberships/${classGroupId}/${target.id}`;
      if (action === 'add-member') await CLASS_GROUPS.setJSON(key, { schemaVersion: 1, classGroupId, userId: target.id, createdAt: Date.now(), addedBy: auth.user.id }); else await CLASS_GROUPS.delete(key);
      await auditEvent(auth, action === 'add-member' ? 'class-group-member-added' : 'class-group-member-removed', { classGroupId, targetUserId: target.id });
      return json({ ok: true });
    }
    return json({ error: 'Acción desconocida.' }, 400);
  } catch (error) {
    console.error('groups function error', { name: error?.name || 'Error' });
    return json({ error: 'No se pudieron procesar los grupos.' }, 500);
  }
};
