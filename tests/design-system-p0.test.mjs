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

const [css, lab, production] = await Promise.all([
  read('../public/css/design-system-p0.css'),
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

test('el laboratorio P0 existe y permanece desconectado de producción', () => {
  assert.ok(css.length > 1000, 'falta la hoja aislada del Design System');
  assert.match(lab, /<link[^>]+href="\.\/css\/design-system-p0\.css"/);
  assert.match(lab, /<main[^>]+data-shds="p0"/);
  for (const forbidden of ['design-system-p0.css', 'design-system-p0.html', 'data-shds=', '--shds-', 'shds-']) {
    assert.doesNotMatch(production, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), forbidden);
  }
});

test('selectores y variables del sistema están encapsulados en el namespace P0', () => {
  assert.doesNotMatch(css, /(^|\n)\s*:root\s*\{/);
  assert.doesNotMatch(css, /(^|\n)\s*(?:button|input|label|nav|main|body|html)(?:\s|,|\{|:)/);
  const selectorLines = css.split('\n').map(line => line.trim()).filter(line => line.endsWith('{'));
  const selectors = selectorLines.filter(line => !line.startsWith('@') && !/^(?:from|to|[\d%, ]+)\s*\{$/.test(line));
  assert.ok(selectors.length > 20, 'el sistema debe exponer componentes reales');
  for (const selector of selectors) assert.match(selector, /\[data-shds="p0"\]/, selector);
  const customProperties = [...css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)].map(match => match[1]);
  assert.ok(customProperties.length >= 35);
  for (const property of customProperties) assert.match(property, /^--shds-/);
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
