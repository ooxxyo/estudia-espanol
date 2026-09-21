(() => {
  'use strict';
  const api = (path, options = {}) => window.StudyHubApi.requestJson(`/.netlify/functions/${path}`, options);
  const day = value => { const date = value || new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
  const empty = message => `<div class="empty-state"><span class="ic">○</span>${message}</div>`;
  const loading = '<div class="empty-state"><span class="ic">…</span>Cargando…</div>';
  const safe = (context, value) => context.escape(String(value ?? ''));
  const subjectOptions = (context, all = true) => `${all ? '<option value="">Todas</option>' : ''}${context.subjects.filter(item => item.available).map(item => `<option value="${item.id}">${safe(context, item.name)}</option>`).join('')}`;
  function panelError(panel, context, error) { if (panel.isConnected) panel.innerHTML = empty(safe(context, error.message || 'No se pudo cargar esta sección.')); }

  async function groups(main, context) {
    main.innerHTML = `<div class="pagehead"><h1>Mis grupos</h1><p>Clases y periodos a los que puedes acceder.</p></div><section id="groupsPanel" aria-live="polite">${loading}</section>`;
    const panel = main.querySelector('#groupsPanel');
    if (!context.user) { panel.innerHTML = empty('Inicia sesión para consultar tus grupos.'); return; }
    try {
      const data = await api('groups'); if (!panel.isConnected) return;
      const years = new Map((data.schoolYears || []).map(row => [row.schoolYearId, row]));
      panel.innerHTML = (data.groups || []).length ? `<div class="platform-list">${data.groups.map(group => {
        const year = years.get(group.schoolYearId);
        return `<article class="card platform-card"><span class="status-badge">${safe(context, context.subjects.find(item => item.id === group.subjectId)?.name || group.subjectId)}</span><h2>${safe(context, group.name)}</h2><p>${safe(context, group.period || 'Periodo no especificado')} · ${safe(context, year?.label || 'Año no especificado')}</p>${year?.terms?.length ? `<p class="cloud-note">${year.terms.map(term => safe(context, term.label)).join(' · ')}</p>` : ''}</article>`;
      }).join('')}</div>` : empty('Todavía no perteneces a un grupo. Un administrador puede añadirte; no hay invitaciones públicas.');
    } catch (error) { panelError(panel, context, error); }
  }

  function favorites(main, context) {
    main.innerHTML = `<div class="pagehead"><h1>Favoritos</h1><p>Marcadores personales; tus preguntas Guardadas siguen funcionando por separado.</p></div><section id="favoritesPanel" aria-live="polite"></section>`;
    const panel = main.querySelector('#favoritesPanel');
    const paint = () => {
      const rows = context.favorites();
      panel.innerHTML = rows.length ? `<div class="platform-list">${rows.map((item, index) => `<article class="card platform-card"><span class="status-badge">${safe(context, item.type)}</span><h3>${safe(context, item.title || item.id)}</h3><div class="btn-row">${['topic','reviewCard','contribution','calendar'].includes(item.type) ? `<button class="icon-btn" data-open-favorite="${index}">Abrir</button>` : ''}<button class="icon-btn" data-remove-favorite="${index}" aria-label="Quitar ${safe(context, item.title || item.id)} de favoritos">Quitar</button></div></article>`).join('')}</div>` : empty('Aún no tienes favoritos. Marca temas o recursos desde sus vistas.');
      panel.querySelectorAll('[data-open-favorite]').forEach(button => button.addEventListener('click', () => { const row = rows[Number(button.dataset.openFavorite)]; if (!row) return; if (row.type === 'topic') context.reviewTopic(row.subjectId, row.id); else if (row.type === 'reviewCard') context.reviewCard(row.subjectId, row.id); else context.goto(row.type === 'calendar' ? 'calendar' : 'community'); }));
      panel.querySelectorAll('[data-remove-favorite]').forEach(button => button.addEventListener('click', () => { const row = rows[Number(button.dataset.removeFavorite)]; if (row) { context.toggleFavorite(row); paint(); } }));
    };
    paint();
  }

  async function today(main, context) {
    main.innerHTML = `<div class="pagehead"><h1>Hoy</h1><p>Clases, pendientes y estudio en un solo lugar.</p></div><section id="todayPanel" aria-live="polite">${loading}</section>`;
    const panel = main.querySelector('#todayPanel');
    const todayDate = day();
    const summaries = context.studyData();
    if (!context.user) {
      panel.innerHTML = `<div class="card priority-card"><span class="status-badge">URGENTE</span><h2>Competencia en Español</h2><p>El vocabulario nuevo tiene repaso pendiente. Tu progreso local está disponible.</p><button class="btn" data-review-spanish>Repasar ahora</button></div><div class="card"><p>Inicia sesión para ver Comunidad, Calendario y avisos privados.</p></div>`;
    } else {
      try {
        const [community, calendar, notifications] = await Promise.all([api(`community?date=${todayDate}&limit=5`), api('calendar?limit=20'), api('notifications?limit=5')]);
        if (!panel.isConnected) return;
        const upcoming = (calendar.events || []).filter(row => row.date >= todayDate).slice(0, 3);
        const assignments = (calendar.assignments || []).filter(row => !['completed', 'submitted'].includes(row.personalStatus)).slice(0, 3);
        const current = (calendar.events || []).filter(row => row.date === todayDate).slice(0, 3);
        panel.innerHTML = `<div class="grid grid-2 platform-dashboard"><article class="card"><h2>Lo que dieron hoy</h2><p>${community.contributions?.length || 0} aportes permitidos</p><button class="icon-btn" data-view="community">Ver aportes</button></article><article class="card"><h2>Próximas pruebas y eventos</h2>${upcoming.map(row => `<p>${safe(context, row.date)} · ${safe(context, row.title)}</p>`).join('') || '<p class="cloud-note">No hay eventos próximos.</p>'}<button class="icon-btn" data-view="calendar">Abrir calendario</button></article><article class="card"><h2>Asignaciones pendientes</h2>${assignments.map(row => `<p>${safe(context, row.title)}${row.dueDate ? ` · vence ${safe(context, row.dueDate)}` : ''}</p>`).join('') || '<p class="cloud-note">No hay asignaciones pendientes.</p>'}<button class="icon-btn" data-view="calendar">Ver asignaciones</button></article><article class="card"><h2>Qué estudiar hoy</h2><p>${summaries.reduce((total, row) => total + row.errors, 0)} errores por repasar entre tus materias.</p><button class="icon-btn" data-view="studyToday">Ver plan</button></article><article class="card"><h2>Notificaciones</h2><p>${notifications.unreadCount || 0} sin leer.</p><button class="icon-btn" data-view="notifications">Abrir avisos</button></article><article class="card"><h2>Eventos de hoy</h2>${current.map(row => `<p>${safe(context, row.title)}</p>`).join('') || '<p class="cloud-note">No hay eventos hoy.</p>'}</article></div>`;
      } catch (error) { panelError(panel, context, error); }
    }
    panel.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => context.goto(button.dataset.view)));
    panel.querySelectorAll('[data-review-spanish]').forEach(button => button.addEventListener('click', () => context.reviewTopic('espanol', 'vocabulario')));
  }

  async function studyToday(main, context) {
    main.innerHTML = `<div class="pagehead"><h1>Qué estudiar hoy</h1><p>Recomendaciones deterministas basadas en tu progreso, no generadas por IA.</p></div><section id="studyTodayPanel" aria-live="polite"></section>`;
    const panel = main.querySelector('#studyTodayPanel');
    const data = context.studyData();
    let upcoming = [];
    if (context.user) { try { const calendar = await api('calendar?limit=50'); upcoming = calendar.events || []; } catch { /* el plan local sigue disponible */ } }
    if (!panel.isConnected) return;
    panel.innerHTML = `<div class="platform-list">${data.map(subject => {
      const sorted = [...subject.topics].sort((a, b) => Number(b.priority === 'urgent' && b.studyStatus === 'pending_review') - Number(a.priority === 'urgent' && a.studyStatus === 'pending_review') || (a.attempts ? a.correct / a.attempts : -1) - (b.attempts ? b.correct / b.attempts : -1));
      const weak = sorted[0]; const nextTest = upcoming.find(row => row.subjectId === subject.subjectId && ['test', 'quiz'].includes(row.type) && row.date >= day());
      const urgent=weak?.priority==='urgent'&&weak?.studyStatus==='pending_review';
      const reason = urgent?'Repaso pendiente para la Competencia en Español.':!weak?.attempts ? 'Este tema aún no tiene práctica registrada.' : subject.errors ? `Tienes ${subject.errors} errores guardados en esta materia.` : 'Este tema tiene el menor dominio registrado.';
      return `<article class="card platform-card ${urgent?'priority-card':''}">${urgent?'<span class="status-badge">URGENTE</span>':''}<h2>${safe(context, subject.subjectName)}</h2><p><b>${safe(context, weak?.name || 'Sin temas disponibles')}</b> · ${safe(context, reason)}</p>${nextTest ? `<p class="cloud-note">Próxima prueba: ${safe(context, nextTest.title)} · ${safe(context, nextTest.date)}</p>` : ''}<div class="btn-row"><button class="icon-btn" ${urgent?'data-review-spanish':'data-weak="'+subject.subjectId+'"'}>${urgent?'Repasar ahora':'Practicar débiles'}</button>${[15, 30, 60].map(minutes => `<button class="icon-btn" data-prepare="${subject.subjectId}" data-minutes="${minutes}">Preparar ${minutes} min</button>`).join('')}</div></article>`;
    }).join('')}</div>`;
    panel.querySelectorAll('[data-weak]').forEach(button => button.addEventListener('click', () => context.practiceWeak(button.dataset.weak)));
    panel.querySelectorAll('[data-review-spanish]').forEach(button => button.addEventListener('click', () => context.reviewTopic('espanol', 'vocabulario')));
    panel.querySelectorAll('[data-prepare]').forEach(button => button.addEventListener('click', () => context.prepareTest(button.dataset.prepare, Number(button.dataset.minutes))));
  }

  async function mountNotificationPreferences(panel, context) {
    if (!panel) return;
    panel.innerHTML = '<h2>Preferencias de notificaciones</h2>' + (context.user ? loading : '<p>Inicia sesión para sincronizar estas preferencias.</p>');
    if (!context.user) return;
    const labels = { friendRequests: 'Solicitudes de amistad', comments: 'Comentarios', calendar: 'Calendario', assignments: 'Asignaciones', tests: 'Pruebas', community: 'Comunidad', moderation: 'Moderación', studyReminders: 'Recordatorios de estudio' };
    try {
      const data = await api('notifications?limit=1'); if (!panel.isConnected) return;
      panel.innerHTML = `<h2>Preferencias de notificaciones</h2><p class="cloud-note">Solo avisos dentro de Study Hub; no se envían notificaciones externas.</p><form class="platform-form" id="notificationPrefsForm">${Object.entries(labels).map(([key, label]) => `<label class="check-line"><input type="checkbox" name="${key}" ${data.preferences?.[key] !== false ? 'checked' : ''}> ${label}</label>`).join('')}<button class="btn" type="submit">Guardar preferencias</button><p id="notificationPrefsStatus" role="status"></p></form>`;
      const form = panel.querySelector('form');
      form.addEventListener('submit', event => { event.preventDefault(); window.StudyHubForms.run(form, 'Guardando…', async () => { try { const preferences = Object.fromEntries(Object.keys(labels).map(key => [key, form.elements[key].checked])); await api('notifications', { method: 'POST', body: { action: 'set-preferences', preferences } }); panel.querySelector('#notificationPrefsStatus').textContent = 'Preferencias guardadas ✓'; } catch (error) { panel.querySelector('#notificationPrefsStatus').textContent = error.message; } }); });
    } catch (error) { panelError(panel, context, error); }
  }

  const renderers = Object.freeze({ groups, favorites, today, studyToday });
  window.StudyHubExtras = Object.freeze({ supports: view => Boolean(renderers[view]), render: (view, main, context) => renderers[view]?.(main, context), mountNotificationPreferences, day, subjectOptions, empty });
})();
