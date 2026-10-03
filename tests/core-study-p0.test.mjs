import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/css/study-hub-study-p0.css', import.meta.url), 'utf8');
const shellCss = await readFile(new URL('../public/css/study-hub-shell-p0.css', import.meta.url), 'utf8');

function sourceBetween(start, end) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `No se encontró el bloque ${start}`);
  return html.slice(from, to);
}

test('la migración de estudio carga una capa P0 aislada después del shell y cuenta', () => {
  const shell = html.indexOf('css/study-hub-shell-p0.css');
  const account = html.indexOf('css/study-hub-account-p0.css');
  const study = html.indexOf('css/study-hub-study-p0.css');
  assert.ok(shell >= 0 && account > shell && study > account);
  assert.match(css, /body\[data-shds-shell="p0"\] \.study-flow/);
  assert.doesNotMatch(css, /body\[data-shds-shell="p0"\]\s+#main\s*\{/);
  assert.doesNotMatch(css, /\.rail\b|\.mobile-nav\b|\.online-badge\b/);
});

test('Repasar y Practicar usan jerarquía editorial, selección explícita y disclosure progresivo', () => {
  const reviewHome = sourceBetween('function renderRepasoHome(main)', 'function renderRepasoCards(main)');
  const reviewCards = sourceBetween('function renderRepasoCards(main)', 'function renderPracticaHome(main)');
  const practice = sourceBetween('function renderPracticaHome(main)', '/* =========================================================\n   MODO EXPERIMENTAL');

  assert.match(reviewHome, /study-flow study-flow--setup/);
  assert.match(reviewHome, /study-choice-list/);
  assert.match(reviewCards, /study-flow study-flow--review/);
  assert.match(reviewCards, /role="progressbar"/);
  assert.match(reviewCards, /aria-valuenow="\$\{repasoIndex\+1\}"/);
  assert.match(practice, /study-flow study-flow--setup/);
  assert.match(practice, /aria-pressed="\$\{selectedTopic\?\.id===t\.id\}"/);
  assert.match(practice, /study-disclosure/);
});

test('Examen mantiene configuración clara y la sesión limita feedback y ayudas al modo práctica', () => {
  const exam = sourceBetween('function renderExamenHome(main)', '/* =========================================================\n   SESSION ENGINE');
  const session = sourceBetween('function renderSession(main)', 'function renderAnsweredReview(answerIndex)');

  assert.match(exam, /study-flow study-flow--exam-setup/);
  assert.match(exam, /study-check-list/);
  assert.match(exam, /aria-pressed="\$\{chosen===String\(n\)\}"/);
  assert.match(session, /data-study-mode="\$\{isExam\?'exam':'practice'\}"/);
  assert.match(session, /role="progressbar"/);
  assert.match(session, /\$\{!isExam\? 'aria-live="polite"':''\}/);
  assert.match(session, /\$\{!isExam\? `<button class="icon-btn" id="hintBtn"/);
  assert.doesNotMatch(session, /!isExam&&q\.type!=='math-workspace'/);
});

test('las preguntas usan controles de teclado reales y conservan el contexto compacto durante la sesión', () => {
  const question = sourceBetween('function renderQuestionBody(q, isExam)', 'function enableSubmit(');
  const shellContext = sourceBetween('const COMPACT_STUDY_CONTEXT_VIEWS=', 'function renderNav()');
  assert.match(question, /<button type="button" class="opt" data-i=/);
  assert.match(question, /<button type="button" class="opt" data-v="true"/);
  assert.match(question, /<button type="button" class="sent" data-i=/);
  assert.match(shellContext, /'session'/);
  assert.match(shellContext, /state\.session\?\.queue\?\.\[state\.session\.idx\]\?\.topic/);
});

test('Resultados presenta evidencia de la sesión sin convertirla en dominio o readiness', () => {
  const results = sourceBetween('function renderResults(main)', '/* =========================================================\n   ERRORES');
  assert.match(results, /study-flow study-results/);
  assert.match(results, /study-results-score/);
  assert.match(results, /Buen resultado en esta sesión/);
  assert.doesNotMatch(results, /Dominas bien|tema dominado|Estás listo/);
  assert.match(results, /r\.correctCount/);
  assert.match(results, /r\.total/);
  assert.match(results, /fmtTime\(r\.elapsed\)/);
});

test('la capa de estudio cubre mobile, foco, touch y reduced motion sin animar el shell', () => {
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width:\s*430px\)/);
  assert.match(css, /@media \(max-width:\s*340px\)/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /var\(--shds-motion-press\)/);
  assert.match(css, /var\(--shds-motion-expand\)/);
  assert.doesNotMatch(css, /transition:\s*all\b/);
});

test('Repasar conserva ancho flexible y adapta Repaso anterior antes del breakpoint mobile', () => {
  assert.match(shellCss,/body\[data-shds-shell="p0"\] #main\s*\{[^}]*min-width:\s*0/s);
  assert.match(css,/body\[data-shds-shell="p0"\] \.study-flow > \*\s*\{[^}]*min-width:\s*0/s);
  assert.match(css,/body\[data-shds-shell="p0"\] \.review-continue\s*\{[^}]*margin-top:\s*0[^}]*padding:\s*var\(--shds-space-4\)/s);
  assert.match(css,/@media \(max-width:\s*960px\)[\s\S]*?\.review-continue\s*\{[^}]*flex-direction:\s*column/s);
  assert.match(css,/@media \(max-width:\s*960px\)[\s\S]*?\.review-continue \.icon-btn\s*\{[^}]*max-width:\s*100%/s);
});

test('dark mode usa superficies cálidas P0 y acción estable en Repasar', () => {
  assert.match(css,/html\[data-theme="dark"\] body\[data-shds-shell="p0"\] \.review-continue\s*\{[^}]*border-color:\s*var\(--shds-color-line\)[^}]*background:\s*var\(--shds-color-surface\)/s);
  assert.match(css,/html\[data-theme="dark"\] body\[data-shds-shell="p0"\] \.study-example\s*\{[^}]*border-color:\s*var\(--shds-color-line\)[^}]*background:\s*var\(--shds-color-recess\)/s);
  assert.match(css,/html\[data-theme="dark"\] body\[data-shds-shell="p0"\] \.study-flow--review #nextRep\s*\{[^}]*background:\s*var\(--shds-color-action\)[^}]*color:\s*var\(--shds-color-on-action\)/s);
  assert.match(css,/\.study-flow--review #nextRep:hover\s*\{[^}]*var\(--shds-color-action\)/s);
  assert.match(css,/\.study-flow--review #nextRep:disabled\s*\{[^}]*background:\s*var\(--shds-color-recess\)[^}]*color:\s*var\(--shds-color-ink-soft\)/s);
});

test('dark mode normaliza colores decorativos legacy en las superficies core', () => {
  const darkCore = css.match(/html\[data-theme="dark"\] body\[data-shds-shell="p0"\] \.study-flow\s*\{([^}]*)\}/s)?.[1] || '';
  assert.match(darkCore,/--bg-soft:\s*var\(--shds-color-recess\)/);
  assert.match(darkCore,/--card:\s*var\(--shds-color-surface\)/);
  assert.match(darkCore,/--ink-soft:\s*var\(--shds-color-ink-soft\)/);
  assert.match(darkCore,/--line:\s*var\(--shds-color-line\)/);
  assert.match(darkCore,/--accent:\s*var\(--shds-color-action\)/);
  assert.match(darkCore,/--accent-soft:\s*var\(--shds-color-action-soft\)/);
  assert.doesNotMatch(darkCore,/--(?:good|amber|bad):/);
  assert.match(css,/html\[data-theme="dark"\] body\[data-shds-shell="p0"\] \.study-flow :is\(button,input,summary\):focus-visible\s*\{[^}]*outline-color:\s*var\(--shds-color-action\)/s);
  assert.match(css,/html\[data-theme="dark"\] body\[data-shds-shell="p0"\] \.study-flow \.btn:not\(\.ghost\):not\(\.amber\)\s*\{[^}]*background:\s*var\(--shds-color-action\)[^}]*color:\s*var\(--shds-color-on-action\)/s);
  assert.match(css,/html\[data-theme="dark"\] body\[data-shds-shell="p0"\] \.study-results \.pill-progress\s*\{[^}]*background:\s*var\(--shds-color-action-soft\)[^}]*color:\s*var\(--shds-color-action\)/s);
});
