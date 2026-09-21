(() => {
  'use strict';
  const api = (path, options = {}) => window.StudyHubApi.requestJson(`/.netlify/functions/${path}`, options);
  const busy = (target, label, task) => window.StudyHubForms.run(target, label, task);
  const TODAY = () => new Date().toISOString().slice(0, 10);
  const typeLabels = { class_notes: 'Apuntes', assignment: 'Tarea', quiz: 'Quiz', test: 'Prueba', announcement: 'Anuncio', study_material: 'Material de estudio', other: 'Otro', homework: 'Tarea', project: 'Proyecto', presentation: 'Presentación', study: 'Estudio' };
  const roadmapLabels = { development: 'En desarrollo', testing: 'En pruebas', coming_soon: 'Próximamente', future: 'Futuro', released: 'Disponible' };
  const contributionLabels = { pending: 'Pendiente', community: 'Aporte comunitario', confirmed: 'Confirmado', admin_verified: 'Verificado por Admin', official: 'Oficial', rejected: 'Rechazado', duplicate: 'Duplicado' };
  const searchTypeLabels = { subject: 'Materia', unit: 'Unidad', topic: 'Tema', community: 'Comunidad', calendar: 'Calendario', assignment: 'Asignación', roadmap: 'Roadmap' };
  const dateLocal = (offset = 0) => { const value = new Date(); value.setDate(value.getDate() + offset); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; };
  const pageButton = cursor => cursor ? `<button class="icon-btn" data-next-page="${cursor}">Cargar más</button>` : '';
  async function groupOptions(context) {
    try {
      const data = await api('groups');
      const years = new Map((data.schoolYears || []).map(row => [row.schoolYearId, row]));
      return `<option value="">General (sin grupo)</option>${(data.groups || []).map(group => `<option value="${context.escape(group.classGroupId)}">${context.escape(group.name)} · ${context.escape(years.get(group.schoolYearId)?.label || '')}</option>`).join('')}`;
    } catch { return '<option value="">General (sin grupo)</option>'; }
  }

  function requireAccount(main, context, title) {
    if (context.user) return true;
    main.innerHTML = `<div class="pagehead"><h1>${context.escape(title)}</h1><p>Inicia sesión para usar esta sección.</p></div><div class="card"><button class="btn" id="platformLogin">Ir a Cuenta</button></div>`;
    main.querySelector('#platformLogin').addEventListener('click', () => context.goto('cuenta'));
    return false;
  }
  function subjectOptions(context, includeEmpty = false) {
    return `${includeEmpty ? '<option value="">Todas</option>' : ''}${context.subjects.map(subject => `<option value="${subject.id}">${subject.emoji} ${context.escape(subject.name)}</option>`).join('')}`;
  }
  function errorBox(error) {
    window.StudyHubBugs?.diagnostic(error, 'ui');
    return `<div class="empty-state"><span class="ic">!</span>${window.StudyHubContext.escape(error.message)}<div style="margin-top:10px"><button class="icon-btn" data-report-this-error>Reportar este error</button></div></div>`;
  }
  function whenMounted(main, fn) { if (main.isConnected) fn(); }
  function reportResource(button, resourceType, resourceId, context) {
    const choices = { '1': 'spam', '2': 'incorrect', '3': 'duplicate', '4': 'inappropriate', '5': 'private_information', '6': 'other' };
    const selected = prompt('Motivo del reporte: 1 Spam, 2 Incorrecto, 3 Duplicado, 4 Inapropiado, 5 Información privada, 6 Otro');
    if (selected === null) return;
    if (!choices[selected.trim()]) { context.toast('Elige un número entre 1 y 6.', true); return; }
    busy(button, 'Reportando…', async () => { try { await api('community', { method: 'POST', body: { action: 'report', resourceType, resourceId, reason: choices[selected.trim()] } }); context.toast('Reporte enviado para revisión.'); } catch (error) { context.toast(error.message, true); } });
  }
  document.addEventListener('click', event => { const button = event.target.closest('[data-report-this-error]'); if (button) window.StudyHubContext?.goto('bugReport'); });

  async function renderCommunity(main, context) {
    if (!requireAccount(main, context, 'Comunidad')) return;
    window.StudyHubContext = context;
    main.innerHTML = `<div class="pagehead"><h1>Comunidad</h1><p>Aportes de estudiantes, separados claramente del material oficial.</p></div>
      <div class="platform-tabs"><button class="chip active" data-community-tab="today">Lo que dieron hoy</button><button class="chip" data-community-tab="all">Feed completo</button><button class="chip" data-community-tab="create">Añadir aporte</button></div>
      <details class="ui-disclosure"><summary>Filtros de comunidad</summary><form class="card platform-filters" id="communityFilters"><label>Materia<select name="subject">${subjectOptions(context, true)}</select></label><label>Fecha<input name="date" type="date" value="${dateLocal()}"></label><label>Tipo<select name="type"><option value="">Todos</option>${['class_notes','assignment','quiz','test','announcement','study_material','other'].map(type => `<option value="${type}">${typeLabels[type]}</option>`).join('')}</select></label><label>Grupo<select name="classGroupId" id="communityGroup"><option value="">General</option></select></label><div class="btn-row"><button class="icon-btn" type="button" data-date-offset="0">Hoy</button><button class="icon-btn" type="button" data-date-offset="-1">Ayer</button><button class="icon-btn" type="submit">Aplicar</button></div></form></details>
      <section id="communityPanel" aria-live="polite"><div class="empty-state"><span class="ic">…</span>Cargando aportes…</div></section>`;
    const panel = main.querySelector('#communityPanel');
    const filters = main.querySelector('#communityFilters');
    main.querySelector('#communityGroup').innerHTML = await groupOptions(context);
    let currentToday = true;
    const showList = async todayOnly => {
      currentToday = todayOnly;
      panel.innerHTML = '<div class="empty-state"><span class="ic">…</span>Cargando aportes…</div>';
      try {
        const values = new FormData(filters); const query = new URLSearchParams({ limit: '20' });
        if (values.get('date')) query.set('date', values.get('date'));
        if (values.get('subject')) query.set('subject', values.get('subject'));
        if (values.get('type')) query.set('type', values.get('type'));
        if (values.get('classGroupId')) query.set('classGroupId', values.get('classGroupId'));
        const data = await api(`community?${query}`); if (!panel.isConnected) return;
        const rows = Array.isArray(data.contributions) ? data.contributions : [];
        const card = row => `<article class="card platform-card"><span class="community-label ${row.status === 'official' ? 'official' : ''}">${context.escape(contributionLabels[row.status] || 'Aporte comunitario')}</span><h3>${context.escape(row.title)}</h3><div class="meta">${context.escape(row.authorDisplayName)} · ${context.escape(typeLabels[row.type] || 'Otro')} · ${context.escape(row.date)} · ${context.subjectName(row.subjectId)}</div><p class="platform-copy">${context.escape(row.text.length>360?`${row.text.slice(0,360)}…`:row.text)}</p>${row.text.length>360?`<details class="ui-disclosure"><summary>Leer aporte completo</summary><p class="platform-copy">${context.escape(row.text)}</p></details>`:''}<div class="btn-row"><button class="icon-btn" data-confirm="${row.contributionId}" ${row.own ? 'disabled' : ''}>También lo vimos · ${row.confirmationsCount}</button><button class="icon-btn" data-comments="${row.contributionId}">Comentarios · ${row.commentsCount}</button></div><details class="ui-disclosure"><summary>Más acciones</summary><div class="btn-row"><button class="icon-btn" data-report="${row.contributionId}">Reportar</button><button class="icon-btn" data-favorite="${row.contributionId}" data-title="${context.escape(row.title)}">♡ Favorito</button></div></details><div data-comment-panel="${row.contributionId}"></div></article>`;
        const cards = items => todayOnly ? context.subjects.filter(subject => items.some(row => row.subjectId === subject.id)).map(subject => `<section><h2>${context.escape(subject.name)}</h2>${items.filter(row => row.subjectId === subject.id).map(card).join('')}</section>`).join('') : items.map(card).join('');
        panel.innerHTML = rows.length ? `<div class="platform-list">${cards(rows)}</div>${pageButton(data.nextCursor)}` : '<div class="empty-state"><span class="ic">○</span>No hay aportes para este filtro.</div>';
        const bindCards = () => {
          panel.querySelectorAll('[data-confirm]:not([data-bound])').forEach(button => { button.dataset.bound = 'true'; button.addEventListener('click', () => busy(button, 'Confirmando…', async () => { try { await api('community', { method: 'POST', body: { action: 'confirm', contributionId: button.dataset.confirm } }); await showList(todayOnly); } catch (error) { context.toast(error.message, true); } })); });
          panel.querySelectorAll('[data-comments]:not([data-bound])').forEach(button => { button.dataset.bound = 'true'; button.addEventListener('click', () => showComments(button.dataset.comments, button.closest('article').querySelector('[data-comment-panel]'), context)); });
          panel.querySelectorAll('[data-report]:not([data-bound])').forEach(button => { button.dataset.bound = 'true'; button.addEventListener('click', () => reportResource(button, 'contribution', button.dataset.report, context)); });
          panel.querySelectorAll('[data-favorite]:not([data-bound])').forEach(button => { button.dataset.bound = 'true'; button.addEventListener('click', () => { const added = context.toggleFavorite({ type: 'contribution', id: button.dataset.favorite, title: button.dataset.title }); context.toast(added ? 'Añadido a Favoritos' : 'Quitado de Favoritos'); }); });
        };
        bindCards();
        panel.querySelector('[data-next-page]')?.addEventListener('click', async event => { const button = event.currentTarget; button.disabled = true; query.set('cursor', button.dataset.nextPage); try { const next = await api(`community?${query}`); panel.querySelector('.platform-list')?.insertAdjacentHTML('beforeend', cards(next.contributions || [])); bindCards(); button.dataset.nextPage = next.nextCursor || ''; if (next.nextCursor) button.disabled = false; else button.remove(); } catch (error) { button.disabled = false; context.toast(error.message, true); } });
      } catch (error) { whenMounted(panel, () => { panel.innerHTML = errorBox(error); }); }
    };
    const showCreate = () => {
      panel.innerHTML = `<div class="card"><form class="platform-form" id="communityForm"><label>Materia<select name="subjectId" required>${subjectOptions(context)}</select></label><label>Fecha<input name="date" type="date" value="${dateLocal()}" required></label><label>Tipo<select name="type">${['class_notes','assignment','quiz','test','announcement','study_material','other'].map(type => `<option value="${type}">${typeLabels[type]}</option>`).join('')}</select></label><label>Título<input name="title" minlength="4" maxlength="140" required></label><label>Notas<textarea name="text" minlength="5" maxlength="5000" required></textarea></label><label>Unidad opcional<input name="unitId" maxlength="80"></label><label>Tema opcional<input name="topicId" maxlength="80"></label><label>Grupo opcional<select name="classGroupId">${main.querySelector('#communityGroup').innerHTML}</select></label><p class="cloud-note">Fotos y PDF quedan preparados como metadata; no se suben archivos en esta fase local.</p><button class="btn" type="submit">Publicar aporte comunitario</button></form></div>`;
      const form = panel.querySelector('#communityForm');
      form.addEventListener('submit', event => { event.preventDefault(); busy(form, 'Publicando…', async () => { try { const values = Object.fromEntries(new FormData(form)); await api('community', { method: 'POST', body: { action: 'create', ...values, attachments: [] } }); context.toast('Aporte comunitario creado ✓'); await showList(true); } catch (error) { context.toast(error.message, true); } }); });
    };
    main.querySelectorAll('[data-community-tab]').forEach(button => button.addEventListener('click', () => { main.querySelectorAll('[data-community-tab]').forEach(item => item.classList.toggle('active', item === button)); if (button.dataset.communityTab === 'all') filters.elements.date.value = ''; if (button.dataset.communityTab === 'today' && !filters.elements.date.value) filters.elements.date.value = dateLocal(); button.dataset.communityTab === 'create' ? showCreate() : showList(button.dataset.communityTab === 'today'); }));
    filters.addEventListener('submit', event => { event.preventDefault(); showList(currentToday); });
    filters.querySelectorAll('[data-date-offset]').forEach(button => button.addEventListener('click', () => { filters.elements.date.value = dateLocal(Number(button.dataset.dateOffset)); showList(true); }));
    await showList(true);
  }

  async function showComments(resourceId, panel, context, resourceType = 'contribution') {
    panel.innerHTML = '<div class="empty-state"><span class="ic">…</span>Cargando comentarios…</div>';
    try {
      const data = await api(`community?action=comments&resourceType=${resourceType}&resourceId=${encodeURIComponent(resourceId)}`); if (!panel.isConnected) return;
      panel.innerHTML = `<div class="comment-list">${(data.comments || []).map(row => `<div class="comment"><b>${context.escape(row.authorDisplayName)}</b><p>${row.status === 'removed' ? 'Comentario retirado.' : context.escape(row.text)}</p></div>`).join('') || '<p class="cloud-note">Sin comentarios.</p>'}</div><form class="inline-form" data-comment-form><label>Comentario<input name="text" maxlength="2000" minlength="2" placeholder="Añadir comentario" required></label><button class="icon-btn" type="submit">Comentar</button></form>`;
      const form = panel.querySelector('[data-comment-form]'); form.addEventListener('submit', event => { event.preventDefault(); busy(form, 'Enviando…', async () => { try { await api('community', { method: 'POST', body: { action: 'comment', resourceType, resourceId, text: new FormData(form).get('text') } }); await showComments(resourceId, panel, context, resourceType); } catch (error) { context.toast(error.message, true); } }); });
    } catch (error) { panel.innerHTML = errorBox(error); }
  }

  async function renderCalendar(main, context) {
    if (!requireAccount(main, context, 'Calendario')) return; window.StudyHubContext = context;
    main.innerHTML = `<div class="pagehead"><h1>Calendario</h1><p>Eventos de la comunidad y seguimiento personal.</p></div><div class="platform-tabs"><button class="chip active" data-calendar-tab="events">Agenda</button><button class="chip" data-calendar-tab="create">Añadir</button><button class="chip" data-calendar-tab="missed">Falté hoy</button></div><details class="ui-disclosure"><summary>Filtros de calendario</summary><form class="card platform-filters" id="calendarFilters"><label>Materia<select name="subject">${subjectOptions(context, true)}</select></label><label>Tipo<select name="type"><option value="">Todos</option>${['test','quiz','homework','project','presentation','announcement','study','other'].map(type => `<option value="${type}">${typeLabels[type]}</option>`).join('')}</select></label><label>Fecha<input name="date" type="date"></label><label>Grupo<select name="classGroupId" id="calendarGroup"><option value="">General</option></select></label><button class="icon-btn" type="submit">Filtrar</button></form></details><section id="calendarPanel" aria-live="polite"><div class="empty-state"><span class="ic">…</span>Cargando…</div></section>`;
    const panel = main.querySelector('#calendarPanel'); const filters = main.querySelector('#calendarFilters'); let cached = null;
    main.querySelector('#calendarGroup').innerHTML = await groupOptions(context);
    const load = async cursor => {
      panel.innerHTML = '<div class="empty-state"><span class="ic">…</span>Cargando calendario…</div>';
      try {
        const query = new URLSearchParams({ limit: '20' });
        if (cursor) query.set('cursor', cursor);
        for (const [key, value] of new FormData(filters)) if (value) query.set(key, value);
        cached = await api(`calendar?${query}`); if (!panel.isConnected) return;
        const rows = cached.events || [];
        const seen=new Set(context.calendarSeen());const today=dateLocal(),tomorrow=dateLocal(1),week=dateLocal(7);
        const eventCard = row => {const signal=row.date<today?'Pasado':row.date===today?'Hoy':row.date<=week?'Próximo':!seen.has(row.eventId)?'Nuevo':'';return `<article class="card platform-card"><div class="system-row"><div><h3>${context.escape(row.title)}</h3><div class="meta">${context.escape(row.date)} · ${context.escape(typeLabels[row.type] || row.type)} · ${context.subjectName(row.subjectId)}</div></div><div class="btn-row">${signal?`<span class="status-badge">${signal}</span>`:''}</div></div>${row.possibleDuplicate ? '<p class="cloud-note">Posible duplicado</p>' : ''}<details><summary>Ver detalle</summary><p class="cloud-note">${row.source === 'community_proposal' ? 'Propuesta aprobada' : 'Publicado directamente'}</p><p class="platform-copy">${context.escape(row.description || 'Sin descripción.')}</p><div class="btn-row"><button class="icon-btn" data-comments="${row.eventId}">Comentarios</button><button class="icon-btn" data-report-event="${row.eventId}">Reportar</button><button class="icon-btn" data-favorite-event="${row.eventId}" data-title="${context.escape(row.title)}">♡ Favorito</button>${row.topicId ? `<button class="icon-btn" data-open-topic="${row.subjectId}">Ir a materia</button>` : ''}</div><div data-comment-panel="${row.eventId}"></div></details></article>`;};
        const assignments = cached.assignments || [];
        panel.innerHTML = `<section><h2>Comunidad · eventos</h2>${rows.length ? `<div class="platform-list">${rows.map(eventCard).join('')}</div>${pageButton(cached.nextCursor)}` : '<p class="cloud-note">No hay eventos para este filtro.</p>'}</section><section class="card" style="margin-top:18px"><h2>Mis asignaciones</h2>${assignments.map(row => `<div class="assignment-row"><b>${context.escape(row.title)}</b><span class="meta">${context.subjectName(row.subjectId)}${row.dueDate ? ` · Vence ${context.escape(row.dueDate)}` : ''}</span><label>Mi estado<select data-assignment="${row.assignmentId}">${['pending','in_progress','completed','submitted'].map(status => `<option value="${status}" ${status === row.personalStatus ? 'selected' : ''}>${({pending:'Pendiente',in_progress:'En curso',completed:'Completada',submitted:'Entregada'})[status]}</option>`).join('')}</select></label></div>`).join('') || '<p class="cloud-note">No hay asignaciones.</p>'}</section>`;
        context.markCalendarSeen(rows.map(row=>row.eventId));
        panel.querySelectorAll('[data-comments]').forEach(button => button.addEventListener('click', () => showComments(button.dataset.comments, panel.querySelector(`[data-comment-panel="${button.dataset.comments}"]`), context, 'calendar_event')));
        panel.querySelectorAll('[data-report-event]').forEach(button => button.addEventListener('click', () => reportResource(button, 'calendar_event', button.dataset.reportEvent, context)));
        panel.querySelectorAll('[data-favorite-event]').forEach(button => button.addEventListener('click', () => { const added = context.toggleFavorite({ type: 'calendar', id: button.dataset.favoriteEvent, title: button.dataset.title }); context.toast(added ? 'Añadido a Favoritos' : 'Quitado de Favoritos'); }));
        panel.querySelectorAll('[data-open-topic]').forEach(button => button.addEventListener('click', () => context.openSubject(button.dataset.openTopic)));
        panel.querySelectorAll('[data-assignment]').forEach(select => select.addEventListener('change', () => busy(select, 'Guardando…', async () => { try { await api('calendar', { method: 'POST', body: { action: 'set-assignment-status', assignmentId: select.dataset.assignment, status: select.value } }); context.toast('Estado guardado ✓'); } catch (error) { context.toast(error.message, true); } })));
        panel.querySelector('[data-next-page]')?.addEventListener('click', event => load(event.currentTarget.dataset.nextPage));
      } catch (error) { panel.innerHTML = errorBox(error); }
    };
    const create = async () => {
      if (!cached) cached = await api('calendar');
      const direct = cached.capabilities?.create === true;
      panel.innerHTML = `<div class="card"><h2>${direct ? 'Crear evento' : 'Proponer evento'}</h2><form class="platform-form" id="calendarForm"><label>Materia<select name="subjectId" required>${subjectOptions(context)}</select></label><label>Fecha<input name="date" type="date" value="${dateLocal()}" required></label><label>Tipo<select name="type">${['test','quiz','homework','project','presentation','announcement','study','other'].map(type => `<option value="${type}">${typeLabels[type]}</option>`).join('')}</select></label><label>Título<input name="title" minlength="4" maxlength="140" required></label><label>Descripción<textarea name="description" maxlength="3000"></textarea></label><label>Unidad opcional<input name="unitId" maxlength="80"></label><label>Tema opcional<input name="topicId" maxlength="80"></label><label>Grupo opcional<select name="classGroupId">${main.querySelector('#calendarGroup').innerHTML}</select></label><p class="cloud-note">${direct ? 'Publicado directamente por tu capability.' : 'Pendiente de aprobación administrativa.'}</p><button class="btn" type="submit">${direct ? 'Publicar evento' : 'Enviar propuesta'}</button></form></div>`;
      const form = panel.querySelector('#calendarForm');
      form.addEventListener('submit', event => { event.preventDefault(); busy(form, direct ? 'Publicando…' : 'Enviando…', async () => { try { await api('calendar', { method: 'POST', body: { action: direct ? 'create-event' : 'create-proposal', ...Object.fromEntries(new FormData(form)) } }); context.toast(direct ? 'Evento publicado ✓' : 'Propuesta pendiente de aprobación ✓'); await load(); } catch (error) { context.toast(error.message, true); } }); });
    };
    const missed = () => {
      panel.innerHTML = `<div class="card"><h2>Falté hoy</h2><form class="inline-form" id="missedForm"><label>Fecha que faltaste<input name="date" type="date" value="${dateLocal()}" required></label><label>Grupo<select name="classGroupId">${main.querySelector('#calendarGroup').innerHTML}</select></label><button class="btn" type="submit">Consultar</button></form></div><div id="missedResults" aria-live="polite"></div>`;
      const form = panel.querySelector('#missedForm');
      form.addEventListener('submit', event => { event.preventDefault(); busy(form, 'Consultando…', async () => {
        const values = new FormData(form); const query = new URLSearchParams({ date: values.get('date'), limit: '50' }); if (values.get('classGroupId')) query.set('classGroupId', values.get('classGroupId'));
        const results = panel.querySelector('#missedResults');
        try {
          const [calendar, community] = await Promise.all([api(`calendar?${query}`), api(`community?${query}`)]);
          const entries = [...(community.contributions || []).map(row => ({ subjectId: row.subjectId, title: row.title, label: 'Aporte comunitario' })), ...(calendar.events || []).map(row => ({ subjectId: row.subjectId, title: row.title, label: typeLabels[row.type] || 'Evento' })), ...(calendar.assignments || []).map(row => ({ subjectId: row.subjectId, title: row.title, label: 'Asignación' }))];
          const catchUpSubject = entries.find(row => context.subjects.find(item => item.id === row.subjectId)?.available);
          results.innerHTML = `<div class="card"><h2>Resumen de ${context.escape(values.get('date'))}</h2>${context.subjects.filter(subject => entries.some(row => row.subjectId === subject.id)).map(subject => `<h3>${context.escape(subject.name)}</h3><ul>${entries.filter(row => row.subjectId === subject.id).map(row => `<li>${context.escape(row.label)} · ${context.escape(row.title)}</li>`).join('')}</ul>`).join('') || '<p class="cloud-note">No hay información para esa fecha y grupo.</p>'}<button class="icon-btn" data-catch-up ${catchUpSubject ? '' : 'disabled'}>Ponerse al día</button><p class="cloud-note">Se abre el material oficial de la materia; los aportes comunitarios no se convierten en preguntas.</p></div>`;
          if (catchUpSubject) results.querySelector('[data-catch-up]').addEventListener('click', () => context.openSubject(catchUpSubject.subjectId, 'repaso'));
        } catch (error) { results.innerHTML = errorBox(error); }
      }); });
    };
    filters.addEventListener('submit', event => { event.preventDefault(); load(); });
    main.querySelectorAll('[data-calendar-tab]').forEach(button => button.addEventListener('click', () => { main.querySelectorAll('[data-calendar-tab]').forEach(item => item.classList.toggle('active', item === button)); if (button.dataset.calendarTab === 'create') create(); else if (button.dataset.calendarTab === 'missed') missed(); else load(); })); await load();
  }

  async function renderFriends(main, context) {
    if (!requireAccount(main, context, 'Personas')) return; window.StudyHubContext = context;
    main.innerHTML = `<div class="pagehead"><h1>Personas</h1><p>Encuentra estudiantes descubribles sin conocer su username exacto.</p></div><div class="card"><form class="inline-form" id="peopleForm"><label>Filtrar personas<input name="q" maxlength="60" placeholder="Nombre o username"></label><button class="icon-btn" type="submit">Buscar</button></form><div id="peopleResult" aria-live="polite"><div class="empty-state"><span class="ic">…</span>Cargando personas…</div></div></div><div class="card" style="margin-top:14px"><form class="inline-form" id="friendForm"><label>Username (opcional)<input name="username" maxlength="20"></label><button class="btn" type="submit">Enviar solicitud</button></form></div><section id="friendsPanel" aria-live="polite"><div class="empty-state"><span class="ic">…</span>Cargando…</div></section>`;
    const peopleResult=main.querySelector('#peopleResult');
    const loadPeople=async()=>{try{const q=new FormData(main.querySelector('#peopleForm')).get('q')||'';const data=await api(`friends?action=people&limit=20&q=${encodeURIComponent(q)}`);peopleResult.innerHTML=data.people.length?`<div class="platform-list">${data.people.map(row=>`<div class="friend-row"><div><b>${context.escape(row.displayName)}</b><span class="meta">@${context.escape(row.username)} · ${context.escape(row.visibleRank||'Estudiante')}${row.veteran?' · Veterano':''}</span></div><button class="icon-btn" data-person-request="${context.escape(row.username)}">${row.relationship==='friend'?'Amigos':row.relationship==='pending'?'Solicitud pendiente':'Añadir amigo'}</button></div>`).join('')}</div>`:'<div class="empty-state"><span class="ic">○</span>No hay personas disponibles con este filtro.</div>';peopleResult.querySelectorAll('[data-person-request]').forEach(button=>{if(['Amigos','Solicitud pendiente'].includes(button.textContent)){button.disabled=true;return;}button.addEventListener('click',()=>busy(button,'Enviando…',async()=>{try{await api('friends',{method:'POST',body:{action:'request',username:button.dataset.personRequest}});context.toast('Solicitud enviada ✓');await Promise.all([loadPeople(),load()]);}catch(error){context.toast(error.message,true);}}));});}catch(error){peopleResult.innerHTML=errorBox(error);}};
    main.querySelector('#peopleForm').addEventListener('submit',event=>{event.preventDefault();loadPeople();});
    const panel = main.querySelector('#friendsPanel'); const load = async () => { try { const data = await api('friends'); if (!panel.isConnected) return; const profile = row => `<div class="friend-row"><div><b>${context.escape(row.user?.displayName || row.displayName)}</b><span class="meta">@${context.escape(row.user?.username || row.username)}${(row.user?.veteran || row.veteran) ? ' · Veterano' : ''}</span></div></div>`; panel.innerHTML = `<div class="grid grid-2"><div class="card"><h2>Recibidas</h2>${data.received.map(row => `${profile(row)}<div class="btn-row"><button class="icon-btn" data-friend-action="accept" data-request="${row.requestId}">Aceptar</button><button class="icon-btn" data-friend-action="reject" data-request="${row.requestId}">Rechazar</button></div>`).join('') || '<p class="cloud-note">Sin solicitudes.</p>'}</div><div class="card"><h2>Enviadas</h2>${data.sent.map(row => `${profile(row)}<button class="icon-btn" data-friend-action="cancel" data-request="${row.requestId}">Cancelar</button>`).join('') || '<p class="cloud-note">Sin solicitudes.</p>'}</div><div class="card"><h2>Amigos</h2>${data.friends.map(row => `${profile(row)}<div class="btn-row"><button class="icon-btn" data-remove-friend="${row.username}">Eliminar</button><button class="icon-btn" data-block-friend="${row.username}">Bloquear</button></div>`).join('') || '<p class="cloud-note">Todavía no añadiste amigos.</p>'}</div><div class="card"><h2>Privacidad</h2><form class="platform-form" id="privacyForm"><label>Solicitudes<select name="friendRequests"><option value="everyone" ${data.privacy.friendRequests === 'everyone' ? 'selected' : ''}>Todos</option><option value="members" ${data.privacy.friendRequests === 'members' ? 'selected' : ''}>Miembros</option><option value="nobody" ${data.privacy.friendRequests === 'nobody' ? 'selected' : ''}>Nadie</option></select></label><label>Perfil<select name="profileVisibility"><option value="private" ${data.privacy.profileVisibility === 'private' ? 'selected' : ''}>Privado</option><option value="limited" ${data.privacy.profileVisibility === 'limited' ? 'selected' : ''}>Limitado</option></select></label><button class="icon-btn" type="submit">Guardar privacidad</button></form></div></div>`;
        panel.insertAdjacentHTML('beforeend', `<div class="card" style="margin-top:14px"><h2>Bloqueados</h2>${data.blocked.map(row => `<div class="friend-row"><span>@${context.escape(row.username)}</span><button class="icon-btn" data-unblock="${context.escape(row.username)}">Desbloquear</button></div>`).join('') || '<p class="cloud-note">No hay usuarios bloqueados.</p>'}</div>`);
        panel.querySelectorAll('[data-unblock]').forEach(button => button.addEventListener('click', () => busy(button, 'Desbloqueando…', async () => { try { await api('friends', { method: 'POST', body: { action: 'unblock', username: button.dataset.unblock } }); await load(); } catch (error) { context.toast(error.message, true); } })));
        panel.querySelectorAll('[data-friend-action]').forEach(button => button.addEventListener('click', () => busy(button, 'Procesando…', async () => { try { await api('friends', { method: 'POST', body: { action: button.dataset.friendAction, requestId: button.dataset.request } }); await load(); } catch (error) { context.toast(error.message, true); } })));
        panel.querySelectorAll('[data-remove-friend],[data-block-friend]').forEach(button => button.addEventListener('click', () => { const action = button.dataset.blockFriend ? 'block' : 'remove'; const username = button.dataset.blockFriend || button.dataset.removeFriend; if (!confirm(`¿Confirmas ${action === 'block' ? 'bloquear' : 'eliminar'} a ${username}?`)) return; busy(button, 'Procesando…', async () => { try { await api('friends', { method: 'POST', body: { action, username } }); await load(); } catch (error) { context.toast(error.message, true); } }); }));
        panel.querySelector('#privacyForm').addEventListener('submit', event => { event.preventDefault(); busy(event.currentTarget, 'Guardando…', async () => { try { await api('friends', { method: 'POST', body: { action: 'set-privacy', ...Object.fromEntries(new FormData(event.currentTarget)) } }); context.toast('Privacidad guardada ✓'); } catch (error) { context.toast(error.message, true); } }); });
      } catch (error) { panel.innerHTML = errorBox(error); } };
    const form = main.querySelector('#friendForm'); form.addEventListener('submit', event => { event.preventDefault(); busy(form, 'Enviando…', async () => { try { const username=new FormData(form).get('username');if(!username)throw new Error('Escribe un username o usa la lista de Personas.');await api('friends', { method: 'POST', body: { action: 'request', username } }); form.reset(); context.toast('Solicitud enviada ✓'); await Promise.all([load(),loadPeople()]); } catch (error) { context.toast(error.message, true); } }); }); await Promise.all([load(),loadPeople()]);
  }

  async function renderNotifications(main, context) {
    if (!requireAccount(main, context, 'Notificaciones')) return; window.StudyHubContext = context;
    main.innerHTML = `<div class="pagehead"><h1>Centro de notificaciones</h1><p>Avisos privados de tu cuenta.</p></div><div class="btn-row"><button class="btn ghost" id="markAllRead">Marcar todas como leídas</button><button class="icon-btn" data-go-settings>Preferencias</button></div><section id="notificationsPanel" aria-live="polite"><div class="empty-state"><span class="ic">…</span>Cargando…</div></section>`;
    const panel = main.querySelector('#notificationsPanel');
    const load = async cursor => {
      try {
        const data = await api(`notifications?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`); if (!panel.isConnected) return;
        const cards = data.notifications.map(row => `<article class="card notification-card ${row.readAt ? '' : 'unread'}"><span class="status-badge">${row.readAt ? 'Leída' : 'Nueva'}</span><h3>${context.escape(row.title)}</h3><p>${context.escape(row.message)}</p><div class="meta">${new Date(row.createdAt).toLocaleString('es-ES')}</div><div class="btn-row">${row.readAt ? '' : `<button class="icon-btn" data-read="${row.notificationId}">Marcar leída</button>`}${row.resourceType ? `<button class="icon-btn" data-open-resource="${context.escape(row.resourceType)}">Abrir recurso</button>` : ''}</div></article>`).join('');
        if (!cursor) panel.innerHTML = `<p class="section-title">${data.unreadCount} sin leer</p><div class="platform-list">${cards || '<div class="empty-state"><span class="ic">○</span>No tienes notificaciones.</div>'}</div>${pageButton(data.nextCursor)}`;
        else { panel.querySelector('.platform-list')?.insertAdjacentHTML('beforeend', cards); panel.querySelector('[data-next-page]')?.remove(); panel.insertAdjacentHTML('beforeend', pageButton(data.nextCursor)); }
        panel.querySelectorAll('[data-read]').forEach(button => { if (button.dataset.bound) return; button.dataset.bound = 'true'; button.addEventListener('click', () => busy(button, 'Guardando…', async () => { try { await api('notifications', { method: 'POST', body: { action: 'mark-read', notificationId: button.dataset.read } }); await load(); } catch (error) { context.toast(error.message, true); } })); });
        panel.querySelectorAll('[data-open-resource]').forEach(button => { if (button.dataset.bound) return; button.dataset.bound = 'true'; button.addEventListener('click', () => context.goto(({ friend_request: 'friends', profile: 'friends', contribution: 'community', calendar_event: 'calendar', calendar_proposal: 'calendar' })[button.dataset.openResource] || 'today')); });
        panel.querySelector('[data-next-page]')?.addEventListener('click', event => load(event.currentTarget.dataset.nextPage));
      } catch (error) { panel.innerHTML = errorBox(error); }
    };
    main.querySelector('#markAllRead').addEventListener('click', event => busy(event.currentTarget, 'Guardando…', async () => { try { await api('notifications', { method: 'POST', body: { action: 'mark-all-read' } }); await load(); } catch (error) { context.toast(error.message, true); } }));
    main.querySelector('[data-go-settings]').addEventListener('click', () => context.goto('ajustes'));
    await load();
  }

  async function renderRoadmap(main, context) {
    window.StudyHubContext = context; main.innerHTML = '<div class="pagehead"><h1>Roadmap</h1><p>Lo que viene al Study Hub. Mostrarlo aquí no concede acceso.</p></div><section id="roadmapPanel"><div class="empty-state"><span class="ic">…</span>Cargando…</div></section>'; const panel = main.querySelector('#roadmapPanel');
    try { const data = await api('roadmap'); if (!panel.isConnected) return; panel.innerHTML = `<div class="grid grid-2">${data.items.map(item => `<article class="card roadmap-card"><span class="status-badge">${context.escape(roadmapLabels[item.status] || item.status)}</span><h3>${context.escape(item.title)}</h3><p>${context.escape(item.description)}</p></article>`).join('')}</div>`; } catch (error) { panel.innerHTML = errorBox(error); }
  }

  async function renderSearch(main, context) {
    window.StudyHubContext = context;
    main.innerHTML = `<div class="pagehead"><h1>Búsqueda</h1><p>Busca únicamente contenido que puedes consultar.</p></div><div class="card"><form class="platform-filters" id="searchForm"><label>Buscar<input name="q" minlength="2" maxlength="120" required></label><label>Materia<select name="subject">${subjectOptions(context, true)}</select></label><label>Tipo<select name="type"><option value="">Todos</option>${['subject','unit','topic','community','calendar','assignment','roadmap'].map(type => `<option value="${type}">${searchTypeLabels[type]}</option>`).join('')}</select></label><label>Fecha<input name="date" type="date"></label><label>Grupo<select name="classGroupId" id="searchGroup"><option value="">General</option></select></label><button class="btn" type="submit">Buscar</button></form></div><section id="searchResults" aria-live="polite"></section>`;
    const form = main.querySelector('#searchForm'); const results = main.querySelector('#searchResults');
    if (context.user) main.querySelector('#searchGroup').innerHTML = await groupOptions(context);
    const card = row => `<article class="card platform-card"><span class="status-badge">${context.escape(searchTypeLabels[row.type] || row.type)}</span><h3>${context.escape(row.title)}</h3><p>${context.escape(row.description || '')}</p>${['subject','unit','topic'].includes(row.type) ? `<button class="icon-btn" data-academic-subject="${row.subjectId}" data-topic="${row.type === 'topic' ? row.id : ''}">Abrir material</button>` : ['community','calendar','assignment','roadmap'].includes(row.type) ? `<button class="icon-btn" data-open-view="${({community:'community',calendar:'calendar',assignment:'calendar',roadmap:'roadmap'})[row.type]}">Abrir sección</button>` : ''}</article>`;
    form.addEventListener('submit', event => { event.preventDefault(); busy(form, 'Buscando…', async () => {
      try {
        const values = new FormData(form); const query = new URLSearchParams({ q: values.get('q'), limit: '20' });
        for (const key of ['subject','type','date','classGroupId']) if (values.get(key)) query.set(key, values.get(key));
        const term = String(values.get('q')).toLocaleLowerCase('es');
        const local = context.academicEntries().filter(row => row.title.toLocaleLowerCase('es').includes(term) && (!values.get('subject') || row.subjectId === values.get('subject')) && (!values.get('type') || row.type === values.get('type')) && !values.get('date'));
        const data = await api(`search?${query}`); if (!results.isConnected) return;
        const rows = [...local, ...(data.results || []).filter(row => !local.some(item => item.type === row.type && item.id === row.id))];
        results.innerHTML = rows.length ? `<div class="platform-list">${rows.map(card).join('')}</div>${pageButton(data.nextCursor)}` : '<div class="empty-state"><span class="ic">○</span>Sin resultados permitidos.</div>';
        results.querySelectorAll('[data-academic-subject]').forEach(button => button.addEventListener('click', () => button.dataset.topic ? context.reviewTopic(button.dataset.academicSubject, button.dataset.topic) : context.openSubject(button.dataset.academicSubject)));
        const bindSections = () => results.querySelectorAll('[data-open-view]:not([data-bound])').forEach(button => { button.dataset.bound = 'true'; button.addEventListener('click', () => context.goto(button.dataset.openView)); });
        bindSections();
        const bindNext = () => results.querySelector('[data-next-page]')?.addEventListener('click', async event => { const button = event.currentTarget; button.disabled = true; query.set('cursor', button.dataset.nextPage); try { const next = await api(`search?${query}`); results.querySelector('.platform-list')?.insertAdjacentHTML('beforeend', (next.results || []).map(card).join('')); bindSections(); button.remove(); if (next.nextCursor) { results.insertAdjacentHTML('beforeend', pageButton(next.nextCursor)); bindNext(); } } catch (error) { button.disabled = false; context.toast(error.message, true); } });
        bindNext();
      } catch (error) { results.innerHTML = errorBox(error); }
    }); });
  }

  async function renderModeration(main, context) {
    window.StudyHubContext = context;
    main.innerHTML = `<form class="card platform-filters" id="moderationFilters"><label>Estado<select name="status"><option value="">Todos</option>${['pending','community','confirmed','admin_verified','needs_info'].map(status => `<option value="${status}">${context.escape(contributionLabels[status] || status)}</option>`).join('')}</select></label><label>Tipo<select name="type"><option value="">Todos</option><option value="contribution">Comunidad</option><option value="calendar_proposal">Propuesta</option><option value="report">Reporte</option></select></label><label>Materia<select name="subject">${subjectOptions(context, true)}</select></label><label>Fecha<input type="date" name="date"></label><button class="icon-btn" type="submit">Filtrar</button></form><section id="moderationQueue" aria-live="polite"><div class="empty-state"><span class="ic">…</span>Cargando moderación…</div></section>`;
    const filters = main.querySelector('#moderationFilters'); const queue = main.querySelector('#moderationQueue');
    const load = async cursor => {
      try {
        const query = new URLSearchParams({ limit: '20' }); for (const [key, value] of new FormData(filters)) if (value) query.set(key, value); if (cursor) query.set('cursor', cursor);
        const data = await api(`moderation?${query}`); if (!queue.isConnected) return;
        queue.innerHTML = data.items.length ? `<div class="platform-list">${data.items.map(item => `<article class="card"><div class="system-row"><div><span class="status-badge">${context.escape(item.queueType)}</span><h3>${context.escape(item.title)}</h3><div class="meta">${context.escape(item.status)}${item.date ? ` · ${context.escape(item.date)}` : ''}</div></div></div><div class="btn-row">${item.queueType === 'contribution' ? `<button class="icon-btn" data-moderate="community" data-id="${item.id}" data-status="admin_verified">Verificar</button><button class="icon-btn" data-moderate="community" data-id="${item.id}" data-status="rejected">Rechazar</button><button class="icon-btn" data-moderate="community" data-id="${item.id}" data-status="duplicate">Duplicado</button>${item.status === 'admin_verified' ? `<button class="icon-btn" data-moderate="community" data-id="${item.id}" data-status="official">Aprobar como oficial</button>` : ''}` : item.queueType === 'calendar_proposal' ? `<button class="icon-btn" data-moderate="calendar" data-id="${item.id}" data-status="approved">Aprobar</button><button class="icon-btn" data-moderate="calendar" data-id="${item.id}" data-status="needs_info">Pedir información</button><button class="icon-btn" data-moderate="calendar" data-id="${item.id}" data-status="rejected">Rechazar</button><button class="icon-btn" data-moderate="calendar" data-id="${item.id}" data-status="duplicate">Duplicado</button>` : `<button class="icon-btn" data-resolve-report="${item.id}">Resolver reporte</button>`}</div></article>`).join('')}</div>${pageButton(data.nextCursor)}` : '<div class="empty-state"><span class="ic">✓</span>No hay elementos pendientes.</div>';
        queue.querySelectorAll('[data-moderate]').forEach(button => button.addEventListener('click', () => busy(button, 'Procesando…', async () => { try { if (!confirm(`¿Confirmas cambiar este elemento a ${button.dataset.status}?`)) return; const body = button.dataset.moderate === 'community' ? { action: 'moderate', contributionId: button.dataset.id, status: button.dataset.status } : { action: 'moderate-proposal', proposalId: button.dataset.id, status: button.dataset.status }; await api(button.dataset.moderate, { method: 'POST', body }); await load(); } catch (error) { context.toast(error.message, true); } })));
        queue.querySelectorAll('[data-resolve-report]').forEach(button => button.addEventListener('click', () => busy(button, 'Resolviendo…', async () => { try { if (!confirm('¿Confirmas resolver este reporte?')) return; await api('moderation', { method: 'POST', body: { action: 'resolve-report', reportId: button.dataset.resolveReport } }); await load(); } catch (error) { context.toast(error.message, true); } })));
        queue.querySelector('[data-next-page]')?.addEventListener('click', event => load(event.currentTarget.dataset.nextPage));
      } catch (error) { queue.innerHTML = errorBox(error); }
    };
    filters.addEventListener('submit', event => { event.preventDefault(); load(); });
    await load();
  }

  const renderers = Object.freeze({ community: renderCommunity, calendar: renderCalendar, friends: renderFriends, notifications: renderNotifications, roadmap: renderRoadmap, search: renderSearch, moderation: renderModeration });
  window.StudyHubPlatform = Object.freeze({ render(view, main, context) { return renderers[view]?.(main, context); }, supports(view) { return Boolean(renderers[view]); } });
})();
