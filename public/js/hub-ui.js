(() => {
  'use strict';
  const api=(path,options={})=>window.StudyHubApi.requestJson(`/.netlify/functions/${path}`,options);
  const updates=Object.freeze([
    {updateId:'spanish-vocabulary',title:'Competencia en Español',summary:'El vocabulario ya está listo para estudiar con tarjetas, práctica y examen.',category:'Académico',publishedAt:'2026-09-19',target:'espanol'},
    {updateId:'people-discovery',title:'Personas',summary:'Ahora puedes encontrar estudiantes descubribles y enviar solicitudes.',category:'Nuevo',publishedAt:'2026-09-19',target:'friends'},
    {updateId:'calendar-signals',title:'Calendario más claro',summary:'El Hub resume fechas de hoy, mañana y esta semana.',category:'Mejorado',publishedAt:'2026-09-19',target:'calendar'},
    {updateId:'safe-bug-reports',title:'Reportar un error',summary:'Ya puedes informar problemas y consultar su estado de forma segura.',category:'Nuevo',publishedAt:'2026-09-19',target:'bugReport'},
    {updateId:'topic-context',title:'Navegación de estudio',summary:'El tema activo ya no se reactiva sin que lo selecciones.',category:'Corregido',publishedAt:'2026-09-19',target:'practica'},
  ]);
  const style=document.createElement('style');
  style.textContent=`:root{--motion-fast:140ms;--motion-normal:240ms;--motion-slow:420ms;--ease-standard:cubic-bezier(.2,0,0,1);--ease-emphasized:cubic-bezier(.2,.8,.2,1)}.motion-card{animation:hub-enter var(--motion-normal) var(--ease-standard) both}.motion-card:nth-child(2){animation-delay:45ms}.motion-card:nth-child(3){animation-delay:90ms}.new-pill{animation:badge-pop var(--motion-slow) var(--ease-emphasized) both}.soft-pulse{animation:soft-pulse 2.2s ease-in-out infinite}@keyframes hub-enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes badge-pop{from{opacity:0;transform:scale(.75)}to{opacity:1;transform:scale(1)}}@keyframes soft-pulse{50%{transform:scale(1.035)}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}.soft-pulse{animation:none!important}}`;
  document.head.appendChild(style);
  const localDate=offset=>{const value=new Date();value.setDate(value.getDate()+offset);return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;};
  async function mountHub(root,context){
    const panel=root.querySelector('#hubSignals');if(!panel)return;
    if(!context.user){panel.innerHTML='';return;}
    panel.innerHTML='<div class="empty-state"><span class="ic">…</span>Cargando anuncios…</div>';
    try{
      const [calendar,notifications]=await Promise.all([api('calendar?limit=50'),api('notifications?limit=10')]);if(!panel.isConnected)return;
      const today=localDate(0),tomorrow=localDate(1),week=localDate(7);const events=calendar.events||[],assignments=calendar.assignments||[];
      const buckets=[['Hoy',events.filter(row=>row.date===today)],['Mañana',events.filter(row=>row.date===tomorrow)],['Esta semana',events.filter(row=>row.date>tomorrow&&row.date<=week)]];
      const due=assignments.filter(row=>!['completed','submitted'].includes(row.personalStatus)&&row.dueDate&&row.dueDate<=week);
      const upcoming=buckets.filter(([,rows])=>rows.length);
      panel.innerHTML=`<section class="card motion-card"><h2>Próximos eventos</h2>${upcoming.length?`<div class="grid grid-3">${upcoming.map(([label,rows])=>`<div><h3>${label}</h3>${rows.slice(0,3).map(row=>`<p><b>${context.escape(row.title)}</b><br><span class="meta">${context.escape(row.date)}</span></p>`).join('')}</div>`).join('')}</div>`:'<p class="cloud-note">No hay eventos próximos en esta página de la agenda.</p>'}${due.length?`<h3>Mis pendientes</h3>${due.slice(0,4).map(row=>`<p>${context.escape(row.title)} · ${context.escape(row.dueDate)}</p>`).join('')}`:''}${notifications.unreadCount?`<button class="icon-btn" data-signal-view="notifications">${notifications.unreadCount} notificaciones nuevas</button>`:''}</section>`;
      panel.querySelectorAll('[data-signal-view]').forEach(button=>button.addEventListener('click',()=>context.goto(button.dataset.signalView)));
    }catch{panel.innerHTML='<div class="empty-state"><span class="ic">○</span>Los anuncios sincronizados estarán disponibles al recuperar la conexión.</div>';}
  }
  function renderUpdates(main,context){
    const seen=new Set(context.updatesSeen());const unread=updates.filter(item=>!seen.has(item.updateId));
    main.innerHTML=`<div class="pagehead"><h1>Novedades ${unread.length?`<span class="new-pill">${unread.length} nuevas</span>`:''}</h1><p>Cambios útiles para estudiantes.</p></div><div class="platform-list">${updates.map(item=>`<article class="card update-item motion-card"><span class="status-badge">${item.category}</span><h2>${context.escape(item.title)}</h2><p>${context.escape(item.summary)}</p><div class="meta">${item.publishedAt}</div>${item.target?`<button class="icon-btn" data-update-target="${item.target}">Abrir</button>`:''}</article>`).join('')}</div>`;
    context.markUpdatesSeen(updates.map(item=>item.updateId));
    main.querySelectorAll('[data-update-target]').forEach(button=>button.addEventListener('click',()=>button.dataset.updateTarget==='espanol'?context.openSubject('espanol'):context.goto(button.dataset.updateTarget)));
  }
  window.StudyHubHubUI=Object.freeze({mountHub,renderUpdates,updates});
})();
