import { authenticateRequest, canAccessAdmin } from './_shared/auth.mjs';
import { auditEvent, cleanText, json, listRows, readBody } from './_shared/platform.mjs';
import { COMMUNITY, REPORTS } from './community.mjs';
import { PROPOSALS } from './calendar.mjs';

export default async (req) => {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.ok || !canAccessAdmin(auth.role)) return json({ error: 'No tienes permiso para consultar moderación.' }, 403);
    if (req.method === 'POST') {
      const body = await readBody(req);
      if (body.action !== 'resolve-report') return json({ error: 'Acción desconocida.' }, 400);
      const reports = await listRows(REPORTS, 'reports/'); const report = reports.find(row => row.reportId === cleanText(body.reportId, 80));
      if (!report) return json({ error: 'Reporte no encontrado.' }, 404);
      report.status = 'resolved'; report.resolvedAt = Date.now(); report.resolvedBy = auth.user.id; report.resolution = cleanText(body.resolution, 500);
      await REPORTS.setJSON(`reports/${report.resourceType}/${report.resourceId}/${report.reporterId}`, report);
      await auditEvent(auth, 'report-resolved', { targetReportId: report.reportId, targetResourceType: report.resourceType, targetResourceId: report.resourceId });
      return json({ ok: true });
    }
    if (req.method !== 'GET') return json({ error: 'Método no permitido.' }, 405);
    const url = new URL(req.url); const status = cleanText(url.searchParams.get('status'), 30); const type = cleanText(url.searchParams.get('type'), 40); const subject = cleanText(url.searchParams.get('subject'), 40); const author = cleanText(url.searchParams.get('author'), 80);
    const [contributions, proposals, reports] = await Promise.all([listRows(COMMUNITY, 'contributions/'), listRows(PROPOSALS, 'proposals/'), listRows(REPORTS, 'reports/')]);
    const items = [
      ...contributions.filter(row => ['pending', 'community', 'confirmed', 'admin_verified'].includes(row.status)).map(row => ({ queueType: 'contribution', id: row.contributionId, status: row.status, subjectId: row.subjectId, authorId: row.authorId, title: row.title, date: row.date, createdAt: row.createdAt })),
      ...proposals.filter(row => ['pending', 'needs_info'].includes(row.status)).map(row => ({ queueType: 'calendar_proposal', id: row.proposalId, status: row.status, subjectId: row.subjectId, authorId: row.authorId, title: row.title, date: row.date, createdAt: row.createdAt })),
      ...reports.filter(row => row.status === 'pending').map(row => ({ queueType: 'report', id: row.reportId, status: row.status, subjectId: '', authorId: row.reporterId, title: `${row.reason}: ${row.resourceType}`, date: '', createdAt: row.createdAt })),
    ].filter(row => (!status || row.status === status) && (!type || row.queueType === type) && (!subject || row.subjectId === subject) && (!author || row.authorId === author)).sort((a, b) => b.createdAt - a.createdAt);
    return json({ items, counts: { contributions: contributions.length, proposals: proposals.length, reports: reports.length } });
  } catch (error) {
    console.error('moderation function error', { name: error?.name || 'Error' });
    return json({ error: 'No se pudo cargar la cola de moderación.' }, 500);
  }
};
