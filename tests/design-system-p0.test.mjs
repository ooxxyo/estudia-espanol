import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function read(relativePath) {
  try {
    return await readFile(new URL(relativePath, import.meta.url), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return '';
    throw error;
  }
}

const [css, shellCss, lab, production] = await Promise.all([
  read('../public/css/design-system-p0.css'),
  read('../public/css/study-hub-shell-p0.css'),
  read('../public/design-system-p0.html'),
  read('../public/index.html'),
]);

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return [0, 2, 4].map(offset => Number.parseInt(value.slice(offset, offset + 2), 16));
}

function luminance(hex) {
  const channels = hexToRgb(hex).map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function createInteractiveNode(initialAttributes = {}) {
  const attributes = new Map(Object.entries(initialAttributes));
  const listeners = new Map();
  const classes = new Set();
  return {
    disabled: false,
    textContent: '',
    style: {},
    classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      toggle: (name, force) => {
        const enabled = force === undefined ? !classes.has(name) : force;
        if (enabled) classes.add(name); else classes.delete(name);
        return enabled;
      },
    },
    addEventListener(type, listener) { listeners.set(type, listener); },
    click() { listeners.get('click')?.({ currentTarget: this }); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    setAttribute(name, value) { attributes.set(name, String(value)); },
  };
}

function mountLabScript() {
  const scripts = [...lab.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  const themeButton = createInteractiveNode({ 'aria-pressed': 'false' });
  const reducedButton = createInteractiveNode({ 'aria-pressed': 'false' });
  const saveButton = createInteractiveNode({ 'aria-pressed': 'false', 'aria-label': 'Guardar' });
  const saveLabel = createInteractiveNode();
  saveLabel.textContent = 'Guardar';
  const saveLive = createInteractiveNode();
  const progress = createInteractiveNode({ 'aria-valuemax': '5', 'aria-valuenow': '3' });
  const progressFill = createInteractiveNode();
  const progressLabel = createInteractiveNode();
  const progressLive = createInteractiveNode();
  const progressButton = createInteractiveNode();
  const nodes = new Map([
    ['[data-theme-toggle]', themeButton], ['[data-reduced-motion]', reducedButton],
    ['[data-save-toggle]', saveButton], ['[data-save-label]', saveLabel], ['[data-save-live]', saveLive],
    ['.shds-progress', progress], ['.shds-progress-fill', progressFill],
    ['[data-progress-label]', progressLabel], ['[data-progress-live]', progressLive], ['[data-progress-next]', progressButton],
  ]);
  const root = {
    dataset: { shdsTheme: 'light', shdsReduced: 'false' },
    querySelector(selector) { return nodes.get(selector) ?? null; },
    querySelectorAll() { return []; },
  };
  vm.runInNewContext(scripts[0], { document: { querySelector: () => root } });
  return { saveButton, saveLabel, saveLive };
}

test('producción comparte solo tokens P0 y carga un adaptador aislado para shell y Home', () => {
  assert.ok(css.length > 1000, 'falta la hoja aislada del Design System');
  assert.ok(shellCss.length > 1000, 'falta el adaptador del shell');
  assert.match(lab, /<link[^>]+href="\.\/css\/design-system-p0\.css"/);
  assert.match(lab, /<main[^>]+data-shds="p0"/);
  assert.match(production, /<link[^>]+href="css\/design-system-p0\.css"/);
  assert.match(production, /<link[^>]+href="css\/study-hub-shell-p0\.css"/);
  assert.match(production, /<body[^>]+data-shds-shell="p0"/);
  assert.doesNotMatch(production, /data-shds="p0"|class="[^"]*\bshds-/);
  assert.match(css, /\[data-shds="p0"\],\s*\[data-shds-shell="p0"\]\s*\{/);
});

test('selectores y variables del sistema están encapsulados en el namespace P0', () => {
  assert.doesNotMatch(css, /(^|\n)\s*:root\s*\{/);
  assert.doesNotMatch(css, /(^|\n)\s*(?:button|input|label|nav|main|body|html)(?:\s|,|\{|:)/);
  const selectorLines = css.split('\n').map(line => line.trim()).filter(line => line.endsWith('{'));
  const selectors = selectorLines.filter(line => !line.startsWith('@') && !/^(?:from|to|[\d%, ]+)\s*\{$/.test(line));
  assert.ok(selectors.length > 20, 'el sistema debe exponer componentes reales');
  for (const selector of selectors) assert.match(selector, /\[data-shds="p0"\]|\[data-shds-shell="p0"\]/, selector);
  const customProperties = [...css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)].map(match => match[1]);
  assert.ok(customProperties.length >= 35);
  for (const property of customProperties) assert.match(property, /^--shds-/);
});

test('el adaptador no cambia tipografía ni contenido de vistas internas', () => {
  const unscopedLines=shellCss.split('\n').filter(line=>!line.includes('[data-shds-shell="p0"]')).join('\n');
  assert.doesNotMatch(unscopedLines, /(^|\n)\s*(?::root|html|body|main|nav|button)(?:\s|,|\{|:)/);
  const selectorLines=shellCss.split('\n').map(line=>line.trim()).filter(line=>line.endsWith('{'));
  const selectors=selectorLines.filter(line=>!line.startsWith('@')&&!/^(?:from|to|[\d%, ]+)\s*\{$/.test(line));
  for(const selector of selectors) assert.match(selector,/\[data-shds-shell="p0"\]/,selector);
  assert.match(shellCss,/body\[data-shds-shell="p0"\]\[data-view="hub"\][\s\S]*?font-family:\s*var\(--shds-font-body\)/);
  assert.doesNotMatch(shellCss,/body\[data-shds-shell="p0"\]\s*\{[^}]*font-family:/s);
  assert.doesNotMatch(shellCss,/\[data-shds-shell="p0"\][^{]*\.(?:subject-view|practice|session|results|workspace)[^{]*\{/i);
});

test('el adaptador usa únicamente tokens P0 definidos', () => {
  const defined = new Set([...css.matchAll(/^\s*(--shds-[a-z0-9-]+)\s*:/gim)].map(match => match[1]));
  const used = new Set([...shellCss.matchAll(/var\((--shds-[a-z0-9-]+)/g)].map(match => match[1]));
  for (const token of used) assert.ok(defined.has(token), `token sin definir: ${token}`);
});

test('el shell usa motion P0 barato y respeta reduced motion', () => {
  for(const timing of ['--shds-motion-press','--shds-motion-exit','--shds-motion-enter','--shds-motion-move','--shds-motion-expand']) {
    assert.match(shellCss,new RegExp(`var\\(${timing}(?:,|\\))`),timing);
  }
  assert.match(shellCss,/::view-transition-old\(study-content\)/);
  assert.match(shellCss,/::view-transition-new\(study-content\)/);
  assert.match(shellCss,/data-navigation-direction="forward"/);
  assert.match(shellCss,/data-navigation-direction="back"/);
  assert.match(shellCss,/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(shellCss,/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?::view-transition-old\(study-content\)[\s\S]*?animation-duration:\s*1ms/s);
  assert.doesNotMatch(shellCss,/transition:\s*(?:width|height|top|left|margin|padding)/);
});

test('la navegación real usa View Transitions progresivamente y no anima renders silenciosos', () => {
  const navigation = production.slice(production.indexOf('function navigationDirection('), production.indexOf('function platformUiContext('));
  assert.match(navigation, /document\.startViewTransition/);
  assert.match(navigation, /prefers-reduced-motion:\s*reduce/);
  assert.match(navigation, /function navigateWithShellMotion/);
  assert.match(navigation, /dataset\.navigationDirection/);
  assert.match(navigation, /delete document\.body\.dataset\.navigationDirection/);
  const renderSource = production.slice(production.indexOf('function render(){'), production.indexOf('DASHBOARD'));
  assert.doesNotMatch(renderSource, /startViewTransition|navigationDirection/);
});

test('la transición separa las capturas vieja y nueva para evitar ghosting de texto', () => {
  assert.match(shellCss,/::view-transition-old\(root\)\s*\{[^}]*opacity:\s*0;[^}]*animation:\s*none/s);
  assert.match(shellCss,/::view-transition-new\(root\)\s*\{[^}]*opacity:\s*1;[^}]*animation:\s*none/s);
  for (const exitName of ['sh-shell-exit-forward','sh-shell-exit-back','sh-shell-exit-lateral']) {
    assert.match(shellCss,new RegExp(`@keyframes ${exitName}\\s*\\{[\\s\\S]*?55%,\\s*100%\\s*\\{\\s*opacity:\\s*0;`));
  }
  for (const enterName of ['sh-shell-enter-forward','sh-shell-enter-back']) {
    assert.match(shellCss,new RegExp(`@keyframes ${enterName}\\s*\\{[\\s\\S]*?0%,\\s*25%\\s*\\{\\s*opacity:\\s*0;`));
  }
  assert.match(shellCss,/::view-transition-image-pair\(study-content\)[\s\S]*?isolation:\s*isolate/);
});

test('la navegación no interpola la geometría de main ni escala filas completas', () => {
  const contentGroup = shellCss.match(/::view-transition-group\(study-content\)\s*\{([^}]*)\}/)?.[1] || '';
  assert.match(contentGroup,/animation:\s*sh-shell-content-frame\s+var\(--shds-motion-enter,\s*260ms\)/);
  assert.match(contentGroup,/overflow:\s*clip/);
  assert.match(shellCss,/::view-transition-old\(study-content\)[^}]*animation:\s*sh-shell-exit-forward\s+var\(--shds-motion-exit,\s*190ms\)\s+var\(--shds-ease-exit,\s*cubic-bezier\(\.4,\s*0,\s*1,\s*1\)\)/s);
  assert.match(shellCss,/::view-transition-new\(study-content\)[^}]*animation:\s*sh-shell-enter-forward\s+var\(--shds-motion-enter,\s*260ms\)\s+var\(--shds-ease-enter,\s*cubic-bezier\(\.16,\s*1,\s*\.3,\s*1\)\)/s);
  assert.match(shellCss,/::view-transition-old\(study-content\),[\s\S]*?object-fit:\s*none;[\s\S]*?object-position:\s*top center/s);
  const subjectPress = shellCss.match(/\.hub-subject-row:active\s*\{([^}]*)\}/)?.[1] || '';
  assert.match(subjectPress,/transform:\s*translateY\(1px\)/);
  assert.doesNotMatch(subjectPress,/scale\(/);
});

test('el contexto del shell reserva geometría y no desplaza la marca ni Conectado', () => {
  assert.match(shellCss,/html:has\(body\[data-shds-shell="p0"\]\)\s*\{[^}]*scrollbar-gutter:\s*stable/s);
  const brand = shellCss.match(/\.rail-brand\s*\{([^}]*)\}/)?.[1] || '';
  assert.match(brand,/block-size:\s*82px/);
  assert.match(brand,/flex:\s*0 0 82px/);
  assert.match(brand,/overflow:\s*hidden/);
  const context = shellCss.match(/\.rail-brand \.rail-context\s*\{([^}]*)\}/)?.[1] || '';
  assert.match(context,/white-space:\s*nowrap/);
  assert.match(context,/overflow:\s*hidden/);
  assert.match(context,/text-overflow:\s*ellipsis/);
  assert.match(context,/max-width:\s*calc\(100% - 43px\)/);
});

test('Más se presenta como superficie secundaria compacta en desktop y bottom sheet en móvil', () => {
  assert.match(shellCss,/\.rail\s*\{[^}]*width:\s*202px/s);
  assert.match(shellCss,/\.more-backdrop\[data-more-scope="desktop"\][\s\S]*?padding-inline-start:\s*220px/s);
  assert.match(shellCss,/\.more-backdrop\[data-more-scope="desktop"\][\s\S]*?\.more-panel\s*\{[^}]*max-width:\s*720px/s);
  assert.match(shellCss,/@media \(max-width: 820px\)[\s\S]*?\.more-backdrop\s*\{[^}]*align-items:\s*flex-end/s);
  assert.match(shellCss,/\.rail-more-button\s*\{/);
  assert.match(shellCss,/\.more-item\s*\{[^}]*border:\s*0[^}]*border-bottom:\s*1px solid/s);
  assert.match(shellCss,/@media \(max-width: 820px\)[\s\S]*?\.more-list\s*\{[^}]*grid-template-columns:\s*1fr/s);
});

test('Home usa filas editoriales, días en dos columnas y los apila en móvil', () => {
  assert.match(shellCss,/\.hub-days\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(shellCss,/\.hub-day\s*\{[^}]*min-width:\s*0/s);
  assert.match(shellCss,/\.hub-subject-row\s*\{[^}]*border-bottom:\s*1px solid/s);
  assert.doesNotMatch(shellCss,/\.hub-subject-card\s*\{/);
  assert.match(shellCss,/@media \(max-width: 620px\)[\s\S]*?\.hub-days\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(shellCss,/@media \(max-width: 820px\)[\s\S]*?\[data-view="hub"\] #main\s*\{[^}]*padding:\s*calc\(52px \+ env\(safe-area-inset-top\)\)/s);
  assert.match(shellCss,/@media \(max-width: 820px\)[\s\S]*?\[data-view="hub"\] #main\s*\{[^}]*padding-bottom:\s*calc\(92px \+ env\(safe-area-inset-bottom\)\)\s*!important/s);
});

test('tokens P0 cubren color, tipografía, espacio, radio, superficies y focus', () => {
  const required = [
    '--shds-color-paper:#f7f4ed', '--shds-color-surface:#fffdf9', '--shds-color-recess:#eeebe4',
    '--shds-color-ink:#302b29', '--shds-color-ink-soft:#6e665f', '--shds-color-line:#ded8ce',
    '--shds-color-action:#862e42', '--shds-color-on-action:#fffaf7', '--shds-color-action-soft:#f1e4e5',
    '--shds-color-success:#3a6754', '--shds-color-success-soft:#e7eee5',
    '--shds-color-warning:#805924', '--shds-color-warning-soft:#f3ead7',
    '--shds-color-info:#41657a', '--shds-color-info-soft:#e7eef1',
    '--shds-font-display:', '--shds-font-body:', '--shds-space-1:4px', '--shds-space-7:48px',
    '--shds-radius-small:6px', '--shds-radius-control:10px', '--shds-radius-surface:16px', '--shds-radius-pill:999px',
  ];
  const compact = css.toLowerCase().replace(/\s+/g, '');
  for (const token of required) assert.ok(compact.includes(token), token);
  assert.match(css, /\.shds-focus-demo:focus-visible|\.shds-button:focus-visible/);
  assert.match(css, /outline:\s*3px solid var\(--shds-color-info\)/);
});

test('la paleta aprobada mantiene contraste AA en sus parejas principales', () => {
  const pairs = [
    ['#302b29', '#f7f4ed'], ['#6e665f', '#fffdf9'], ['#fffaf7', '#862e42'],
    ['#3a6754', '#e7eee5'], ['#805924', '#f3ead7'], ['#41657a', '#e7eef1'],
    ['#f3ebe2', '#211e1e'], ['#bdb0a7', '#2b2727'], ['#341f26', '#e3a0ae'],
    ['#a6c7af', '#293c32'], ['#dfc18d', '#3e3526'], ['#abc7d7', '#2b3941'],
  ];
  for (const [foreground, background] of pairs) {
    assert.ok(contrast(foreground, background) >= 4.5, `${foreground} sobre ${background}`);
  }
});

test('el laboratorio prueba la tipografía con español y notación académica', () => {
  for (const sample of [
    '¿Qué estudiamos hoy?', 'Miércoles, 30 de septiembre', 'práctica', 'evaluación',
    '89.125°', '89° 7′ 30″', '23° 20′ 55″', 'K', 'g/mL',
  ]) assert.ok(lab.includes(sample), sample);
  assert.match(lab, /font-variant-numeric:\s*tabular-nums/);
  assert.match(lab, /Source Sans 3/);
  assert.match(lab, /Fraunces/);
});

test('solo incluye componentes con consumidor P0 conocido', () => {
  for (const component of ['shds-surface', 'shds-button', 'shds-field', 'shds-choice', 'shds-nav-item', 'shds-feedback', 'shds-progress']) {
    assert.ok(lab.includes(component), component);
    assert.ok(css.includes(component), component);
  }
  assert.doesNotMatch(`${lab}\n${css}`, /toast|textarea|particle|confetti/i);
  assert.match(css, /min-height:\s*44px/);
  assert.match(lab, /aria-current="page"/);
  assert.match(lab, /aria-pressed="(?:true|false)"/);
  assert.match(lab, /aria-live="polite"/);
});

test('todos los controles compactos mantienen un objetivo táctil de 44 px', () => {
  const segmented = css.slice(css.indexOf('[data-shds="p0"] .shds-segmented .shds-button {'), css.indexOf('}', css.indexOf('[data-shds="p0"] .shds-segmented .shds-button {')) + 1);
  assert.match(segmented, /min-height:\s*44px/);
  const icon = css.slice(css.indexOf('[data-shds="p0"] .shds-button--icon {'), css.indexOf('}', css.indexOf('[data-shds="p0"] .shds-button--icon {')) + 1);
  assert.match(icon, /min-width:\s*44px/);
  assert.match(icon, /min-height:\s*44px/);
});

test('guardar y quitar de Guardadas actualiza estado, nombre y confirmación', () => {
  const { saveButton, saveLabel, saveLive } = mountLabScript();

  saveButton.click();
  assert.equal(saveButton.getAttribute('aria-pressed'), 'true');
  assert.equal(saveButton.getAttribute('aria-label'), 'Quitar de Guardadas');
  assert.equal(saveLabel.textContent, 'Guardada');
  assert.equal(saveLive.textContent, 'Pregunta guardada.');

  saveButton.click();
  assert.equal(saveButton.getAttribute('aria-pressed'), 'false');
  assert.equal(saveButton.getAttribute('aria-label'), 'Guardar');
  assert.equal(saveLabel.textContent, 'Guardar');
  assert.equal(saveLive.textContent, 'Pregunta quitada de Guardadas.');
});

test('el patrón Guardadas cubre estados, tacto, movimiento y reduced motion sin layout', () => {
  assert.match(lab, /FAVORITO \/ GUARDADO/);
  assert.match(lab, /data-save-toggle[^>]+aria-pressed="false"[^>]+aria-label="Guardar"/);
  assert.match(lab, /data-save-toggle[^>]+disabled/);
  for (const state of [':hover', ':active', '[aria-pressed="true"]', ':focus-visible', ':disabled']) {
    assert.ok(css.includes(`.shds-save-toggle${state}`), state);
  }
  assert.match(css, /--shds-motion-save:\s*200ms/);
  assert.match(css, /--shds-motion-unsave:\s*170ms/);
  assert.match(css, /\.shds-save-toggle\[aria-pressed="true"\][\s\S]*?\.shds-save-icon[\s\S]*?fill:\s*currentColor/);
  assert.match(css, /data-shds-reduced="true"[^\n]*\.shds-save-toggle[\s\S]*?animation:\s*none/);
  assert.doesNotMatch(css, /transition:\s*(?:inline-size|width|height)/);
});

test('el progreso se mueve con transform sin animar dimensiones', () => {
  assert.match(lab, /class="shds-progress" role="progressbar"[^>]+aria-valuenow="3"/);
  assert.match(lab, /class="shds-progress-fill"/);
  const fill = css.slice(css.indexOf('[data-shds="p0"] .shds-progress-fill {'), css.indexOf('}', css.indexOf('[data-shds="p0"] .shds-progress-fill {')) + 1);
  assert.match(fill, /transform:\s*scaleX\(\.6\)/);
  assert.match(fill, /transition:\s*transform var\(--shds-motion-move\)/);
  assert.doesNotMatch(css, /transition:\s*(?:inline-size|width|height)/);
});

test('motion implementa las siete categorías, milestone breve y reduced motion', () => {
  for (const category of ['press', 'enter', 'exit', 'move', 'expand', 'success', 'milestone']) {
    assert.match(lab, new RegExp(`data-motion-demo="${category}"`));
    assert.match(css, new RegExp(`--shds-motion-${category}`));
  }
  assert.match(css, /--shds-motion-milestone:\s*600ms/);
  assert.doesNotMatch(css, /720ms/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(lab, /data-reduced-motion/);
});

test('el script del Design Lab es sintácticamente válido y no usa datos de la aplicación', () => {
  const scripts = [...lab.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new vm.Script(scripts[0]));
  assert.doesNotMatch(scripts[0], /localStorage|sessionStorage|fetch\s*\(|indexedDB|netlify|Blob/i);
});
