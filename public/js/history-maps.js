(() => {
  'use strict';
  const maps = [
    {
      id: 'america-colonial', title: 'América en el siglo XVIII', subtitle: 'Territorios colonizados por las potencias europeas',
      description: 'Relaciona las potencias y los territorios del mapa de clase. La Española distingue su parte occidental francesa de su parte oriental española.',
      questionIds: ['hist-eu-com-01', 'hist-eu-com-02', 'hist-eu-com-03', 'hist-eu-com-04'],
      elements: [
        { id: 'espana', name: 'España', power: 'España', relation: 'Nueva España, Florida, Cuba, Puerto Rico, parte oriental de La Española, Nueva Granada, Perú y Río de la Plata.' },
        { id: 'portugal', name: 'Portugal', power: 'Portugal', relation: 'Brasil.' },
        { id: 'inglaterra', name: 'Inglaterra', power: 'Inglaterra', relation: 'Trece Colonias y Jamaica. También figura junto a Francia y Países Bajos en Antillas Menores y Guayanas.' },
        { id: 'francia', name: 'Francia', power: 'Francia', relation: 'Nueva Francia y parte occidental de La Española. Antillas Menores y Guayanas aparecen junto a Inglaterra y Países Bajos.' },
        { id: 'paises-bajos', name: 'Países Bajos (Holanda)', power: 'Países Bajos', relation: 'Antillas Menores y Guayanas, indicadas junto a Francia e Inglaterra.' },
        { id: 'rusia', name: 'Rusia', power: 'Rusia', relation: 'Alaska.' },
        { id: 'dinamarca', name: 'Dinamarca', power: 'Dinamarca', relation: 'Groenlandia.' },
        { id: 'indigenas', name: 'Territorios indígenas no colonizados', relation: 'La leyenda distingue estos territorios de las posesiones europeas; no eran tierras sin habitantes.' },
        { id: 'disputa', name: 'Territorios en disputa', relation: 'El rayado distingue zonas en disputa. No se atribuyen automáticamente a una sola potencia.' },
        { id: 'guayanas', name: 'Guayanas', relation: 'El mapa menciona Países Bajos (Holanda), Francia e Inglaterra en las Guayanas. Esta relación reúne varias potencias.' },
        { id: 'antillas-menores', name: 'Antillas Menores', relation: 'El documento señala presencia de Francia, Inglaterra y Países Bajos en las Antillas Menores.' },
      ],
    },
    {
      id: 'tordesillas', title: 'Tratado de Tordesillas (1494)', subtitle: 'División de territorios entre España y Portugal',
      description: 'En 1494, España y Portugal acordaron una línea imaginaria situada a 370 leguas al oeste de las islas de Cabo Verde, según el material. Oeste para España; este para Portugal.',
      questionIds: ['hist-eu-tor-01', 'hist-eu-tor-02', 'hist-eu-tor-03', 'hist-eu-tor-04'],
      elements: [
        { id: 'linea', name: 'Línea del tratado', relation: 'Línea imaginaria del Tratado de Tordesillas (1494), a 370 leguas al oeste de las islas de Cabo Verde.' },
        { id: 'oeste', name: 'Oeste → España', power: 'España', relation: 'Las tierras al oeste de la línea correspondían a España, según el material.' },
        { id: 'este', name: 'Este → Portugal', power: 'Portugal', relation: 'Las tierras al este de la línea correspondían a Portugal, según el material.' },
        { id: 'cabo-verde', name: 'Islas de Cabo Verde', relation: 'Las islas de Cabo Verde, portuguesas en el mapa, son la referencia desde la que se sitúa la línea 370 leguas hacia el oeste.' },
      ],
    },
    {
      id: 'asentamientos', title: 'Primeros asentamientos en Norteamérica', subtitle: 'Lugar, potencia y fecha',
      description: 'Relaciona los cinco asentamientos del mapa con su potencia y año. La secuencia de clase es 1565 → 1607 → 1608 → 1610 → 1620.',
      questionIds: ['hist-eu-ase-01', 'hist-eu-ase-02', 'hist-eu-ase-03', 'hist-eu-ase-04'],
      elements: [
        { id: 'san-agustin', name: 'San Agustín', power: 'España', year: 1565, relation: 'San Agustín — España — 1565. Es el primer asentamiento de la secuencia de cinco fechas del material.' },
        { id: 'jamestown', name: 'Jamestown', power: 'Inglaterra', year: 1607, relation: 'Jamestown — Inglaterra — 1607. El material lo sitúa en Virginia como primer asentamiento inglés permanente.' },
        { id: 'quebec', name: 'Quebec', power: 'Francia', year: 1608, relation: 'Quebec — Francia — 1608. El material relaciona su fundación con Samuel Champlain y un puesto comercial.' },
        { id: 'santa-fe', name: 'Santa Fe', power: 'España', year: 1610, relation: 'Santa Fe — España — 1610. Comparte potencia con San Agustín, pero corresponde a una fecha posterior.' },
        { id: 'plymouth', name: 'Plymouth', power: 'Inglaterra', year: 1620, relation: 'Plymouth — Inglaterra — 1620. El material lo relaciona con los peregrinos y el Mayflower.' },
      ],
    },
  ];
  const settlements = maps[2].elements;
  const hints = [
    'Compara los dos lugares españoles y su orden entre el siglo XVI y el XVII.',
    'Distingue la colonia inglesa comercial del asentamiento posterior de los peregrinos.',
    'Relaciona la fundación francesa con el puesto comercial del material.',
    'Compara las dos fechas españolas; esta es posterior a la primera inglesa.',
    'Relaciona el asentamiento inglés posterior con el viaje de los peregrinos.',
  ];
  const questions = settlements.map((item, index) => ({
    id: `hm-asentamientos-${item.id}`, subjectId: 'historia', unitId: 'historia-europeos', topic: 'euro-asentamientos',
    type: 'mc', dif: 'Identificación', prompt: `Selecciona en el mapa el asentamiento de ${item.power} correspondiente a ${item.year}.`,
    options: settlements.map(place => place.name), correct: index, hints: [hints[index]], exp: item.relation,
    mapId: 'asentamientos', mapElementId: item.id,
  }));
  const colonial = [
    ['alaska','Alaska','Rusia','rusia'], ['brasil','Brasil','Portugal','portugal'],
    ['espanola-occidental','la parte occidental de La Española','Francia','francia'],
    ['espanola-oriental','la parte oriental de La Española','España','espana'],
    ['nueva-espana','Nueva España','España','espana'], ['nueva-francia','Nueva Francia','Francia','francia'],
    ['trece-colonias','las Trece Colonias','Inglaterra','inglaterra'], ['groenlandia','Groenlandia','Dinamarca','dinamarca'],
    ['florida','Florida','España','espana'], ['cuba','Cuba','España','espana'],
    ['puerto-rico','Puerto Rico','España','espana'], ['jamaica','Jamaica','Inglaterra','inglaterra'],
    ['virreinatos','Nueva Granada, Perú y Río de la Plata','España','espana'],
  ];
  const powerOptions = ['España','Portugal','Inglaterra','Francia','Rusia','Dinamarca','Países Bajos'];
  for (const [id, place, power, elementId] of colonial) questions.push({
    id:`hm-america-${id}`,subjectId:'historia',unitId:'historia-europeos',topic:'euro-competencia',
    type:'mc',dif:'Identificación',prompt:`¿Qué potencia controlaba ${place} según el mapa?`,
    options:powerOptions,correct:powerOptions.indexOf(power),mapId:'america-colonial',mapElementId:elementId,
    hints:[id.startsWith('espanola-')?'Distingue el oeste y el este de la isla; sus asociaciones son diferentes.':'Relaciona el lugar con la potencia indicada en el mapa y en su leyenda.'],
    exp:`Según el mapa, ${place} corresponde a ${power}.${id.startsWith('espanola-')?' La parte occidental corresponde a Francia y la oriental a España.':''}`,
  });
  for (const [id, place] of [['guayanas','las Guayanas'],['antillas-menores','las Antillas Menores']]) questions.push({
    id:`hm-america-${id}`,subjectId:'historia',unitId:'historia-europeos',topic:'euro-competencia',
    type:'mc',dif:'Asociación',prompt:`¿Qué potencias aparecen en ${place} según el mapa?`,
    options:['Países Bajos, Francia e Inglaterra','España, Portugal y Rusia','Dinamarca, España y Portugal','Rusia, Dinamarca y Francia'],correct:0,
    hints:['El documento menciona tres potencias en esta región.'],exp:`En ${place} aparecen Países Bajos (Holanda), Francia e Inglaterra. La región no se atribuye entera a una sola potencia.`,mapId:'america-colonial',
  });
  function normalizeContext(value = {}) {
    value = value && typeof value === 'object' ? value : {};
    const map = maps.find(item => item.id === value.mapId) || maps[0];
    return { schema: 1, mapId: map.id, mode: value.mode === 'identify' ? 'identify' : 'study',
      selectedId: map.elements.some(item => item.id === value.selectedId) ? value.selectedId : null,
      zoom: Number.isFinite(value.zoom) ? Math.max(1, Math.min(2.5, value.zoom)) : 1 };
  }
  const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const powerColors = {España:'espana',Portugal:'portugal',Inglaterra:'inglaterra',Francia:'francia','Países Bajos':'paises-bajos',Rusia:'rusia',Dinamarca:'dinamarca'};
  const labels = {
    'america-colonial':[[192,350,'Nueva España'],[363,265,'Nueva Francia'],[735,850,'Brasil'],[625,105,'Groenlandia'],[115,85,'Alaska'],[535,405,'Trece Colonias'],[490,705,'Nueva Granada'],[450,885,'Perú'],[575,1030,'Río de la Plata'],[735,590,'Antillas Menores']],
    tordesillas:[[245,205,'América del Norte'],[390,590,'América del Sur'],[810,185,'Europa'],[790,450,'África']],
    asentamientos:[],
  };
  function figureHtml(map, answer = false) {
    const geo = window.StudyHubHistoryMapGeometry?.[map.id];
    const attribute = answer ? 'data-map-answer' : 'data-map-pin';
    const exam = answer === 'exam';
    const interactive = !exam && answer !== 'none';
    const prefix = `hm-${map.id}`;
    const defs = `<defs><pattern id="${prefix}-indigenas" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="var(--hm-indigenas)"/><circle cx="5" cy="5" r="1.6" fill="var(--shds-color-ink-soft)"/></pattern><pattern id="${prefix}-disputa" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="var(--hm-disputa)"/><path d="M-3,3L3,-3M0,14L14,0M11,17L17,11" stroke="var(--shds-color-ink-soft)" stroke-width="2"/></pattern></defs>`;
    const attrs = (id, name) => interactive && id ? `${attribute}="${id}" role="button" tabindex="0" aria-pressed="false" aria-label="${escape(name)}"` : '';
    let shapes = (geo?.layers || []).map(layer => {
      const key = powerColors[layer.power] || layer.elementId;
      const pattern = ['indigenas','disputa'].includes(key);
      const fill = exam ? 'var(--shds-color-recess)' : pattern ? `url(#${prefix}-${key})` : layer.power ? `var(--hm-${key})` : 'var(--shds-color-surface)';
      return `<path d="${layer.d}" class="hm-region ${layer.elementId ? '' : 'hm-land'}" style="fill:${fill};" ${!exam?`data-territory="${layer.id}" ${layer.power ? `data-power="${escape(layer.power)}"` : ''} ${layer.group ? `data-map-group="${layer.group}"` : ''}`:''} ${attrs(layer.elementId,`${layer.name}${layer.power?` · ${layer.power}`:''}`)}/>`;
    }).join('');
    if (geo?.lineX) shapes += `<g class="hm-treaty" ${attrs('linea','Línea de Tordesillas')}><rect class="hm-treaty-hit" x="${geo.lineX-24}" y="10" width="48" height="${geo.height-20}"/><path d="M${geo.lineX},10V${geo.height-12}"/></g>`;
    const pins = (geo?.points || []).map((point,index) => {
      const place = map.elements.find(item=>item.id===point.id);
      return `<g class="hm-marker" ${attrs(point.id,answer?`Marcador ${index+1}: ${place.name}`:`${place.name}, ${place.power}, ${place.year}`)}><circle class="hm-halo" cx="${point.x}" cy="${point.y}" r="43"/><circle cx="${point.x}" cy="${point.y}" r="31"/><text x="${point.x}" y="${point.y}">${index+1}</text>${!answer?`<text class="hm-place-label" x="${point.x+48}" y="${point.y+9}">${escape(place.name)}</text>`:''}</g>`;
    }).join('');
    const placeLabels = labels[map.id].map(([x,y,name])=>`<text class="hm-map-name" x="${x}" y="${y}">${name}</text>`).join('');
    const insetLabels = [[422,510,'Cuba'],[448,595,'Jamaica'],[570,522,'Puerto Rico'],[530,605,'La Española']].map(([x,y,name])=>`<text class="hm-inset-label" x="${x}" y="${y}">${name}</text>`).join('');
    const inset = !exam && geo?.inset ? `<div class="history-map-inset"><p>Detalle del Caribe</p><svg role="group" aria-label="Caribe: La Española occidental francesa y oriental española" viewBox="${geo.inset.join(' ')}">${shapes.replaceAll('tabindex="0"','tabindex="-1"')}${insetLabels}</svg><p class="hm-island-caption">La Española: <span>oeste · Francia</span> / <span>este · España</span></p></div>` : '';
    return `<figure class="history-map-figure"><div class="history-map-viewport" id="mapViewport" role="region" tabindex="0" aria-label="Mapa ampliable; flechas para desplazarte al ampliar"><svg id="historyMapSvg" role="group" aria-label="${escape(exam?'Mapa de referencia sin asociaciones':map.title)}" viewBox="0 0 ${geo?.width||900} ${geo?.height||1201}">${defs}<g id="mapStage">${shapes}${placeLabels}${pins}</g></svg><span class="hm-north" aria-hidden="true">N<br>│</span></div>${inset}<div class="btn-row history-map-zoom"><button class="icon-btn" id="mapZoomOut" aria-label="Reducir mapa">−</button><output id="mapZoomLabel" aria-live="polite">100 %</output><button class="icon-btn" id="mapZoomIn" aria-label="Ampliar mapa">+</button><button class="icon-btn" id="mapResetView">Restablecer vista</button></div><p class="history-map-error" role="status" ${geo?'hidden':''}>No se pudo cargar el mapa. Puedes seguir con la leyenda y las opciones de texto.</p></figure>`;
  }
  function wireFigure(root, map, zoom = 1, onZoom = () => {}, onPick = () => {}) {
    const stage=root.querySelector('#mapStage'),viewport=root.querySelector('#mapViewport'),svg=root.querySelector('#historyMapSvg');
    const geo=window.StudyHubHistoryMapGeometry?.[map.id] || {width:900,height:1201};
    let panX=0,panY=0,drag=null;
    const update=()=>{
      panX=Math.max(-geo.width*(zoom-1)/2,Math.min(geo.width*(zoom-1)/2,panX));
      panY=Math.max(-geo.height*(zoom-1)/2,Math.min(geo.height*(zoom-1)/2,panY));
      stage.setAttribute('transform',`translate(${geo.width/2+panX} ${geo.height/2+panY}) scale(${zoom}) translate(${-geo.width/2} ${-geo.height/2})`);
      svg.style.touchAction=zoom>1?'none':'pan-y';
      root.querySelector('#mapZoomLabel').textContent=`${Math.round(zoom*100)} %`;
      root.querySelector('#mapZoomOut').disabled=zoom<=1;root.querySelector('#mapZoomIn').disabled=zoom>=2.5;
    };
    const reset=()=>{zoom=1;panX=panY=0;update();onZoom(zoom);};
    for(const [id,step] of [['mapZoomIn',.25],['mapZoomOut',-.25]])root.querySelector(`#${id}`).addEventListener('click',()=>{zoom=Math.max(1,Math.min(2.5,zoom+step));update();onZoom(zoom);});
    root.querySelector('#mapResetView').addEventListener('click',reset);
    const pickId=target=>target.closest('[data-map-pin],[data-map-answer]')?.getAttribute('data-map-pin')||target.closest('[data-map-answer]')?.getAttribute('data-map-answer');
    viewport.addEventListener('pointerdown',event=>{if(event.button!==0)return;drag={x:event.clientX,y:event.clientY,panX,panY,id:pickId(event.target),moved:false};svg.setPointerCapture(event.pointerId);});
    svg.addEventListener('pointermove',event=>{if(!drag||zoom===1)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.hypot(dx,dy)>5)drag.moved=true;const scale=Math.min(svg.clientWidth/geo.width,svg.clientHeight/geo.height);panX=drag.panX+dx/scale;panY=drag.panY+dy/scale;update();});
    svg.addEventListener('pointerup',event=>{if(drag&&!drag.moved&&drag.id)onPick(drag.id);drag=null;if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);});
    svg.addEventListener('pointercancel',()=>{drag=null;});
    root.querySelector('.history-map-inset')?.addEventListener('click',event=>{const id=pickId(event.target);if(id)onPick(id);});
    root.querySelectorAll('.history-map-viewport,.history-map-inset').forEach(surface=>surface.addEventListener('keydown',event=>{
      const id=pickId(event.target);
      if(id&&['Enter',' '].includes(event.key)){event.preventDefault();onPick(id);return;}
      if(surface===viewport&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key)){event.preventDefault();if(event.key==='Home')reset();else if(zoom>1){panX+=event.key==='ArrowLeft'?40:event.key==='ArrowRight'?-40:0;panY+=event.key==='ArrowUp'?40:event.key==='ArrowDown'?-40:0;update();}}
    }));
    update();
  }
  function updateFigure(root,selectedId,attribute='data-map-pin') {
    root.querySelectorAll(`[${attribute}]`).forEach(shape=>{const active=selectedId!=null&&(shape.getAttribute(attribute)===selectedId||shape.dataset.mapGroup===selectedId);shape.classList.toggle('selected',active);shape.setAttribute('aria-pressed',String(active));});
  }
  function optionIndex(question,item) {
    if(!item)return -1;
    const index=question.options.indexOf(item.name);
    return index>=0?index:question.options.indexOf(item.power);
  }
  function render(main, api) {
    let context=normalizeContext(api.context);
    const map=maps.find(item=>item.id===context.mapId);
    let revealed=context.mode==='study',legendOpen=false;
    const save=patch=>{context=normalizeContext({...context,...patch});api.setContext(context);};
    const rerender=(patch,focusId)=>{save(patch);render(main,{...api,context});main.querySelector(`#${focusId}`)?.focus();};
    const chronology=map.id==='asentamientos'?`<section class="hm-chronology" aria-label="Cronología"><h3>Cinco lugares, una secuencia.</h3><div>${settlements.map(item=>`<button class="icon-btn" data-map-element="${item.id}" aria-pressed="false"><strong>${item.year}</strong><span>${item.name}</span><small>${item.power}</small></button>`).join('')}</div></section>`:'';
    main.innerHTML=`<section class="study-flow history-maps" data-study-surface="history-maps"><div class="study-toolbar"><button class="icon-btn" id="historyMapsBack">${escape(api.backLabel||'Volver a Repasar')}</button></div><header class="pagehead study-flow-head"><p class="study-overline">Historia / Europeos / Repasar / Mapas</p><h1>Una mirada al territorio.</h1><p>Lugares, potencias y fechas. Explora el mapa y relaciona sus historias.</p></header><div class="hm-tabs" role="tablist" aria-label="Elegir mapa">${maps.map(item=>`<button class="icon-btn" role="tab" id="hm-tab-${item.id}" data-history-map="${item.id}" aria-controls="hmMapPanel" aria-selected="${item.id===map.id}" tabindex="${item.id===map.id?0:-1}">${item.id==='america-colonial'?'América colonial':item.id==='tordesillas'?'Tordesillas · 1494':'Primeros asentamientos'}</button>`).join('')}</div><section class="hm-layout" id="hmMapPanel" role="tabpanel" aria-labelledby="hm-tab-${map.id}"><div class="hm-map-column"><header class="hm-map-heading"><h2>${escape(map.title)}</h2><p>${escape(map.subtitle)}</p></header>${figureHtml(map)}<button class="icon-btn hm-legend-toggle" id="mapLegendToggle" aria-expanded="false" aria-controls="historyMapLegend">Leyenda +</button><section id="historyMapLegend" class="hm-legend" hidden aria-label="Leyenda y regiones">${map.elements.map(item=>`<button class="icon-btn" data-map-element="${item.id}" aria-pressed="false"><span class="hm-swatch ${item.id}" style="--hm-swatch:var(--hm-${powerColors[item.power]||item.id},var(--shds-color-surface));" aria-hidden="true"></span>${escape(item.name)}</button>`).join('')}</section><p class="hm-map-help">Selecciona por mapa o leyenda · Tab y Enter · Arrastra al ampliar</p></div><aside class="hm-context" aria-label="Información y estudio"><div class="history-map-modes"><button class="icon-btn" id="mapStudy" aria-pressed="${context.mode==='study'}">Estudiar</button><button class="icon-btn" id="mapIdentify" aria-pressed="${context.mode==='identify'}">Identificar</button></div><div class="history-map-detail" id="historyMapDetail" aria-live="polite"></div><div class="btn-row history-map-reveal">${context.mode==='identify'?'<button class="icon-btn" id="mapReveal">Revelar respuesta</button><button class="icon-btn" id="mapResetActivity">Reiniciar actividad</button>':''}</div><div class="hm-practice-actions"><button class="btn" id="mapPractice">${context.mode==='identify'?'Practicar identificación':'Practicar asociaciones'}</button>${api.canResume?'<button class="icon-btn" id="mapResume">Continuar práctica guardada</button><button class="icon-btn" id="mapRestartPractice">Reiniciar práctica</button>':''}</div><p>${escape(map.description)}</p></aside></section>${chronology}</section>`;
    const detail=()=>{
      const item=map.elements.find(element=>element.id===context.selectedId);
      main.querySelector('#historyMapDetail').innerHTML=!item?'<p>Selecciona un territorio, marcador o elemento de la leyenda.</p>':revealed?`<p class="study-overline">EN EL MAPA</p><h3>${escape(item.name)}</h3><p>${escape(item.relation)}</p>`:'<p>Respuesta de la actividad oculta. Pulsa Revelar respuesta para consultar la relación histórica.</p>';
      main.querySelectorAll('[data-map-element]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mapElement===context.selectedId)));
      updateFigure(main,context.selectedId);
      const reveal=main.querySelector('#mapReveal');if(reveal){reveal.disabled=!item;reveal.textContent=revealed?'Ocultar respuesta':'Revelar respuesta';}
    };
    const select=id=>{if(!map.elements.some(item=>item.id===id))return;save({selectedId:id});revealed=context.mode==='study';detail();};
    main.querySelector('#historyMapsBack').addEventListener('click',api.back);
    main.querySelectorAll('[data-history-map]').forEach(button=>button.addEventListener('click',()=>rerender({mapId:button.dataset.historyMap,selectedId:null,zoom:1},button.id)));
    main.querySelector('.hm-tabs').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=maps.indexOf(map),next=event.key==='Home'?maps[0]:event.key==='End'?maps.at(-1):maps[(index+(event.key==='ArrowRight'?1:2))%3];rerender({mapId:next.id,selectedId:null,zoom:1},`hm-tab-${next.id}`);});
    main.querySelector('#mapStudy').addEventListener('click',()=>rerender({mode:'study'},'mapStudy'));
    main.querySelector('#mapIdentify').addEventListener('click',()=>rerender({mode:'identify'},'mapIdentify'));
    main.querySelectorAll('[data-map-element]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.mapElement)));
    main.querySelector('#mapLegendToggle').addEventListener('click',event=>{legendOpen=!legendOpen;main.querySelector('#historyMapLegend').hidden=!legendOpen;event.currentTarget.setAttribute('aria-expanded',String(legendOpen));event.currentTarget.textContent=`Leyenda ${legendOpen?'−':'+'}`;});
    main.querySelector('#mapReveal')?.addEventListener('click',()=>{revealed=!revealed;detail();});
    main.querySelector('#mapResetActivity')?.addEventListener('click',()=>{save({selectedId:null});revealed=false;detail();});
    main.querySelector('#mapPractice').addEventListener('click',()=>{api.startPractice(map.id,questionIdsForMap(map.id,context.mode==='identify'));});
    main.querySelector('#mapRestartPractice')?.addEventListener('click',()=>main.querySelector('#mapPractice').click());
    main.querySelector('#mapResume')?.addEventListener('click',api.resume);
    wireFigure(main,map,context.zoom,zoom=>save({zoom}),select);detail();
  }
  function renderSessionMap(box,mapId,question,selected,onPick) {
    const map=maps.find(item=>item.id===mapId);if(!map)return;
    const region=document.createElement('div');region.className='history-map-session';region.innerHTML=figureHtml(map,question.mapElementId?true:'none');
    box.querySelector('.opt-list').before(region);
    const select=id=>{const item=map.elements.find(item=>item.id===id);const index=optionIndex(question,item);if(index>=0)onPick(index);};
    wireFigure(region,map,1,()=>{},select);
    updateFigure(region,map.elements.find(item=>optionIndex(question,item)===selected)?.id,'data-map-answer');
  }
  function questionIdsForMap(mapId,identify=false,exam=false){
    const map=maps.find(map=>map.id===mapId);if(!map)return [];
    const supplemental=questions.filter(q=>q.mapId===mapId).map(q=>q.id);
    if(identify&&supplemental.length)return supplemental;
    return [...map.questionIds,...(exam||mapId==='america-colonial'?supplemental:[])];
  }
  function renderExamSetup(main,api){
    main.innerHTML=`<section class="study-flow study-flow--exam-setup" data-study-surface="map-exam"><div class="study-toolbar"><button class="icon-btn" id="historyMapsBack">${escape(api.backLabel)}</button></div><header class="pagehead study-flow-head"><p class="study-overline">Historia / Europeos / Examen</p><h1>Examen de mapas</h1><p>Sin pistas ni respuestas anticipadas. Revisa y entrega para ver los resultados.</p></header><section class="study-panel"><fieldset class="study-fieldset"><legend>Mapas que quieres incluir</legend><div class="check-list study-check-list" id="historyMapExamChoices">${maps.map(map=>`<label class="check-line"><input type="checkbox" value="${map.id}" checked> ${escape(map.title)}</label>`).join('')}</div></fieldset><p class="cloud-note" id="historyMapExamCount" aria-live="polite"></p><button class="btn" id="startHistoryMapExam">Comenzar examen de mapas</button></section></section>`;
    const selected=()=>[...main.querySelectorAll('#historyMapExamChoices input:checked')].map(input=>input.value);
    const update=()=>{const ids=selected();main.querySelector('#startHistoryMapExam').disabled=!ids.length;main.querySelector('#historyMapExamCount').textContent=ids.length?`${ids.flatMap(id=>questionIdsForMap(id,false,true)).length} preguntas de los mapas seleccionados.`:'Selecciona al menos un mapa.';};
    main.querySelectorAll('#historyMapExamChoices input').forEach(input=>input.addEventListener('change',update));
    main.querySelector('#historyMapsBack').addEventListener('click',api.back);
    main.querySelector('#startHistoryMapExam').addEventListener('click',()=>{const ids=selected();if(ids.length)api.start(ids);});update();
  }
  function renderExamMap(box,mapId){
    const map=maps.find(map=>map.id===mapId);if(!map)return;
    const region=document.createElement('div');region.className='history-map-session history-map-exam';region.innerHTML=figureHtml(map,'exam');
    box.querySelector('.q-prompt').after(region);wireFigure(region,map);
  }
  window.StudyHubHistoryMaps={maps,questions,normalizeContext,optionIndex,questionIdsForMap,render,renderSessionMap,renderExamSetup,renderExamMap};
})();
