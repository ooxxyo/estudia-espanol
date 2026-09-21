import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';
import { authenticateRequest, canAccessAdmin } from './_shared/auth.mjs';
import { RateLimitError, enforceRateLimit, recordRateLimitFailure } from './_shared/rate-limit.mjs';
import { auditEvent, cleanText, json, listRows, paginateRows, readBody } from './_shared/platform.mjs';

export const BUG_REPORTS = getStore('study-hub-bug-reports-v1');
const STATUSES = new Set(['new','confirmed','in_progress','fixed','cannot_reproduce','closed']);
const SEVERITIES = new Set(['low','medium','high','critical']);
const TYPES = new Set(['ui','navigation','backend','network','study','academic_content','calendar','community','friends','notifications','other']);
const SAFE_SOURCE = new Set(['manual','automatic']);

export function sanitizeDiagnostic(value, max = 500) {
  return cleanText(value, max)
    .replace(/(authorization|cookie|password|token|secret|recovery|session|dev_login_code)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/https?:\/\/[^\s?#]+(?:\?[^\s#]*)?/gi, url => url.split('?')[0])
    .replace(/[A-Za-z0-9_-]{28,}/g, '[redacted]');
}

function publicReport(row, staff = false) {
  const common = { bugReportId: row.bugReportId, section: row.section, view: row.view, errorType: row.errorType, userDescription: row.userDescription, safeErrorMessage: row.safeErrorMessage, createdAt: row.createdAt, updatedAt: row.updatedAt, status: row.status, source: row.source };
  return staff ? { ...common, severity: row.severity, reportedBy: row.reportedBy, subjectId: row.subjectId, unitId: row.unitId, topicId: row.topicId, browser: row.browser, platform: row.platform, viewport: row.viewport, assignedTo: row.assignedTo, resolution: row.resolution, possibleDuplicate: row.possibleDuplicate } : common;
}

export default async req => {
  try {
    const auth = await authenticateRequest(req);
    const staff = auth.ok && canAccessAdmin(auth.role);
    if (req.method === 'GET') {
      if (!auth.ok) return json({ error: 'Inicia sesión para consultar reportes.' }, 401);
      const url = new URL(req.url);
      let rows = await listRows(BUG_REPORTS, 'reports/', 1000);
      rows = rows.filter(row => staff || row.reportedBy === auth.user.id);
      for (const key of ['status','severity','section','source']) { const value = cleanText(url.searchParams.get(key), 80); if (value) rows = rows.filter(row => row[key] === value); }
      rows.sort((a,b)=>b.createdAt-a.createdAt);
      const page = paginateRows(rows, url.searchParams, 20);
      return json({ reports: page.items.map(row=>publicReport(row, staff)), nextCursor: page.nextCursor, limit: page.limit });
    }
    if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
    const body = await readBody(req);
    if (body.action === 'update') {
      if (!staff) return json({ error: 'No tienes permiso para administrar reportes.' }, 403);
      const id = cleanText(body.bugReportId, 80);
      const row = await BUG_REPORTS.get(`reports/${id}`, { type:'json', consistency:'strong' });
      if (!row) return json({ error: 'Reporte no encontrado.' }, 404);
      const previous = { status:row.status, severity:row.severity };
      if (body.status && STATUSES.has(body.status)) row.status=body.status;
      if (body.severity && SEVERITIES.has(body.severity)) row.severity=body.severity;
      row.assignedTo=sanitizeDiagnostic(body.assignedTo,80); row.resolution=sanitizeDiagnostic(body.resolution,1000); row.updatedAt=Date.now();
      await BUG_REPORTS.setJSON(`reports/${id}`,row);
      await auditEvent(auth,'bug-report-update',{bugReportId:id,previousStatus:previous.status,status:row.status,previousSeverity:previous.severity,severity:row.severity});
      return json({ ok:true, report:publicReport(row,true) });
    }
    const rate = await enforceRateLimit(req,'bugReport',auth.ok?auth.user.id:'anonymous',{strict:true});
    const errorType = TYPES.has(body.errorType) ? body.errorType : 'other';
    const userDescription=sanitizeDiagnostic(body.userDescription,2000);
    const safeErrorMessage=sanitizeDiagnostic(body.safeErrorMessage,500);
    if (!userDescription && !safeErrorMessage) { await recordRateLimitFailure(rate); return json({ error:'Describe el problema antes de enviarlo.' },400); }
    const recent = await listRows(BUG_REPORTS,'reports/',1000);
    const normalized=`${cleanText(body.section,80)}|${errorType}|${safeErrorMessage.toLowerCase()}`;
    const possible = recent.find(row=>row.createdAt>Date.now()-7*86400000 && `${row.section}|${row.errorType}|${row.safeErrorMessage.toLowerCase()}`===normalized);
    const now=Date.now(); const id=randomUUID();
    const row={schemaVersion:1,bugReportId:id,reportedBy:auth.ok?auth.user.id:null,section:sanitizeDiagnostic(body.section,80)||'general',view:sanitizeDiagnostic(body.view,80),subjectId:sanitizeDiagnostic(body.subjectId,80),unitId:sanitizeDiagnostic(body.unitId,80),topicId:sanitizeDiagnostic(body.topicId,80),errorType,userDescription,safeErrorMessage,browser:sanitizeDiagnostic(body.browser,120),platform:sanitizeDiagnostic(body.platform,80),viewport:sanitizeDiagnostic(body.viewport,40),createdAt:now,updatedAt:now,status:'new',severity:'medium',source:SAFE_SOURCE.has(body.source)?body.source:'manual',assignedTo:'',resolution:'',possibleDuplicate:possible?.bugReportId||null};
    await BUG_REPORTS.setJSON(`reports/${id}`,row);
    return json({ok:true,report:publicReport(row,false)},201);
  } catch(error) {
    if(error instanceof RateLimitError||error?.status===429)return json({error:error.message},429,{'retry-after':String(error.retryAfterSeconds||60)});
    if(error?.status===503)return json({error:error.message},503);
    console.error('bugs function error',{name:error?.name||'Error'});
    return json({error:'No se pudo procesar el reporte.'},500);
  }
};
