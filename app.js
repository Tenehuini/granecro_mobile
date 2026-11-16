'use strict';

const $ = (sel) => document.querySelector(sel);
const SAVE_KEY = 'granecro.partida';
const PREFS_KEY = 'granecro.expansion';

let game = null;
let toast = '';
let shownCard = null; // última carta dibujada en grande, para animar solo los cambios
let lastStats = null;

// ================= Guardado =================
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(game)); } catch { /* sin storage */ }
}
function loadSaved() {
  try {
    const g = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (g && !g.over && Array.isArray(g.s1) && Array.isArray(g.s2) && g.courses && currentCard(g)) return g;
  } catch { /* nada guardado */ }
  return null;
}
function clearSaved() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* sin storage */ }
}

// ================= Pantallas y diálogos =================
function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.toggleAttribute('data-active', s.id === id));
  window.scrollTo(0, 0);
}
function openDialog(d) { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }
function closeDialog(d) { if (d.close) d.close(); else d.removeAttribute('open'); }

const imgSrc = (c) => `assets/cards/${c.img}.webp`;
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

// ================= Textos de las cartas =================
function cardSummary(c) {
  if (c.type === 'tired') return 'Solo se descarta (o es compañero en un curso W).';
  if (c.type === 'sanity') return '+1 cordura, o tesis, o compañero de estudio.';
  const parts = [`Nivel ${c.level}`, `−${c.sanity} cordura`];
  if (c.thesis) parts.push(`−${c.thesis} tesis`);
  parts.push(`+${c.credits} créditos`);
  if (c.needMagic.length) parts.push('pide ' + c.needMagic.map((m) => MAGIC_ICON[m]).join(''));
  if (c.needLevel) parts.push('pide ' + c.needLevel);
  if (c.learns) parts.push('enseña ' + MAGIC_ICON[c.learns]);
  return parts.join(' · ');
}

function cardFacts(c) {
  if (c.type === 'tired') {
    return ['No sirve para la tesis ni como compañero de estudio: solo se descarta.',
      'Con la expansión, es el único compañero que aceptan los cursos W.'];
  }
  if (c.type === 'sanity') {
    return ['Recupera 1 de cordura (hasta 5).', 'También sirve para trabajar en la tesis o como compañero de estudio.'];
  }
  const out = [`Curso de nivel ${c.level}.`];
  out.push(`Inscribirte cuesta ${c.sanity} de cordura${c.thesis ? ` y ${c.thesis} de tesis` : ''}.`);
  out.push(`Da ${c.credits} créditos.`);
  if (c.needMagic.length) out.push(`Pide magia: ${c.needMagic.map((m) => `${MAGIC_ICON[m]} ${MAGIC_WORD[m]}`).join(', ')}.`);
  if (c.needLevel) out.push(`Pide haber cursado ${c.needLevel} (${LEVEL_COURSE[c.needLevel]}).`);
  out.push(c.learns ? `Enseña magia ${MAGIC_ICON[c.learns]} ${MAGIC_WORD[c.learns]}.` : 'No enseña magia.');
  if (!c.buddy.length) out.push('No tiene lugar para compañeros de estudio.');
  c.buddy.forEach((b, i) => out.push(`${i + 1}° compañero de estudio: ${describeEffect(b)}.`));
  if (c.level === 'W') out.push('Solo acepta Cansancio como compañero de estudio.');
  return out;
}

function openZoom(c) {
  $('#zoom-title').textContent = c.name;
  $('#zoom-img').src = imgSrc(c);
  $('#zoom-info').replaceChildren(...cardFacts(c).map((t) => el('li', '', t)));
  openDialog($('#zoom-dialog'));
}

// ================= Partida =================
function renderStat(id, value, max, label, ratio, state) {
  const box = $(id);
  const v = box.querySelector('.stat-val');
  v.innerHTML = `${value}<small> / ${max}</small>`;
  box.querySelector('.bar i').style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
  box.classList.toggle('is-ok', state === 'ok');
  box.classList.toggle('is-bad', state === 'bad');
  box.setAttribute('aria-label', `${label}: ${value} de ${max}`);
}

function bumpChanged() {
  const now = { sanity: game.sanity, thesis: game.thesis, credits: game.credits };
  if (lastStats) {
    for (const k of Object.keys(now)) {
      if (now[k] !== lastStats[k]) {
        const box = $('#stat-' + k);
        box.classList.remove('bump');
        void box.offsetWidth; // reinicia la animación
        box.classList.add('bump');
      }
    }
  }
  lastStats = now;
}

function renderStats() {
  const g = game;
  renderStat('#stat-sanity', g.sanity, MAX_SANITY, 'Cordura', (g.sanity - MIN_SANITY) / (MAX_SANITY - MIN_SANITY), g.sanity < 0 ? 'bad' : '');
  renderStat('#stat-thesis', g.thesis, MAX_THESIS, 'Tesis', g.thesis / MAX_THESIS, g.thesis >= MAX_THESIS ? 'ok' : '');
  renderStat('#stat-credits', g.credits, g.target, 'Créditos', g.credits / g.target, g.credits >= g.target ? 'ok' : '');
  bumpChanged();

  const magic = $('#magic');
  magic.replaceChildren(...(g.magic.length
    ? g.magic.map((m) => el('span', 'chip', `${MAGIC_ICON[m]} ${MAGIC_WORD[m]}`))
    : [el('span', '', 'Sin magia aprendida')]));
  $('#piles').textContent = g.semester === 1 ? `Mazo 2° sem.: ${g.s2.length}/${semesterSize(g)}` : '';
}

function renderHeader() {
  const g = game;
  $('#semester-title').textContent = `${g.semester}° semestre`;
  const left = g.semester === 1 ? g.s1.length : g.s2.length;
  $('#semester-sub').textContent = g.over ? 'Fin de la partida'
    : left === 0 ? 'Última carta del semestre' : `Quedan ${left} carta${left === 1 ? '' : 's'} después de esta`;
}

function renderCard() {
  const c = currentCard(game);
  $('.stage').hidden = !c;
  if (!c) { shownCard = null; return; }
  const btn = $('#big-card');
  const img = btn.querySelector('img');
  img.src = imgSrc(c);
  img.alt = c.name;
  if (shownCard !== game.current) {
    btn.classList.remove('flip-in');
    void btn.offsetWidth;
    btn.classList.add('flip-in');
  }
  shownCard = game.current;
  $('#card-name').textContent = c.name;
  $('#card-info').textContent = cardSummary(c);
}

function renderActions() {
  const box = $('#actions');
  if (game.over) {
    const again = el('button', 'btn btn-primary', 'Jugar de nuevo');
    again.addEventListener('click', () => startGame(game.expansion, game.target));
    box.replaceChildren(again);
    return;
  }
  box.replaceChildren(...getActions(game).map((a) => {
    const b = el('button', 'action');
    b.type = 'button';
    b.append(el('strong', '', a.title), el('small', '', a.disabled || a.detail));
    b.disabled = !!a.disabled;
    b.addEventListener('click', () => doAction(a.id));
    return b;
  }));
}

function courseRow(sem) {
  const list = game.courses[sem];
  const frag = document.createDocumentFragment();
  const isNow = sem === game.semester && !game.over;
  frag.append(el('h2', '', `Cursos del ${sem}° semestre${isNow ? ' (actual)' : ''}`));
  if (!list.length) {
    frag.append(el('p', 'course-empty', 'Todavía no te inscribiste en ningún curso.'));
    return frag;
  }
  const row = el('div', 'course-row' + (isNow || game.over ? '' : ' is-past'));
  for (const item of list) {
    const c = cardOf(game, item.id);
    const t = el('button', 'thumb');
    t.type = 'button';
    t.setAttribute('aria-label', c.name);
    const img = el('img');
    img.src = imgSrc(c);
    img.alt = '';
    const slots = c.buddy.length;
    const lbl = el('span', item.buddies >= slots && slots ? 'is-full' : '',
      slots ? `👥 ${item.buddies}/${slots}` : '👥 —');
    t.append(img, lbl);
    t.addEventListener('click', () => openZoom(c));
    row.append(t);
  }
  frag.append(row);
  return frag;
}

function renderCourses() {
  const box = $('#my-courses');
  box.replaceChildren(courseRow(1));
  if (game.semester === 2) box.append(courseRow(2));
}

function render() {
  renderHeader();
  renderStats();
  renderCard();
  $('#toast').textContent = toast;
  renderActions();
  renderCourses();
}

function doAction(id) {
  toast = act(game, id);
  // Reiniciar la animación del aviso
  const t = $('#toast');
  t.style.animation = 'none';
  void t.offsetWidth;
  t.style.animation = '';
  render();
  if (game.over) {
    clearSaved();
    setTimeout(showEnd, 600);
  } else {
    save();
  }
}

function showEnd() {
  const r = result(game);
  $('#end-dialog').classList.toggle('is-win', r.win);
  $('#end-emoji').textContent = r.win ? '🎓' : '💀';
  $('#end-title').textContent = r.win ? '¡Te recibiste de nigromante!' : 'No te recibiste';
  $('#end-msg').replaceChildren(...(r.win
    ? [el('li', '', 'Terminaste la tesis, juntaste los créditos y conservaste la cordura.')]
    : r.problems.map((p) => el('li', '', p))));
  $('#end-stats').textContent = `🌀 ${game.sanity} · ✒️ ${game.thesis}/${MAX_THESIS} · 🎓 ${game.credits}/${game.target}`;
  if (!r.win) navigator.vibrate?.([120, 60, 220]);
  openDialog($('#end-dialog'));
}

function startGame(expansion, target) {
  game = newGame(expansion, target);
  toast = '';
  beginGame();
}

function beginGame() {
  shownCard = null;
  lastStats = null;
  show('screen-game');
  render();
  save();
}

$('#big-card').addEventListener('click', () => { const c = currentCard(game); if (c) openZoom(c); });
$('#zoom-ok').addEventListener('click', () => closeDialog($('#zoom-dialog')));

// ================= Nueva partida =================
function buildDifficulties() {
  const exp = $('#expansion').checked;
  $('#difficulty-list').replaceChildren(...DIFFICULTIES[exp ? 'expansion' : 'base'].map((d) => {
    const b = el('button', 'level');
    b.type = 'button';
    b.innerHTML = `
      <span class="level-text"><strong>${d.label}</strong><small>${exp ? 'Con la expansión · 24 cartas' : 'Juego base · 20 cartas'}</small></span>
      <span class="level-meta">${d.target}<small>créditos</small></span>`;
    b.addEventListener('click', () => startGame(exp, d.target));
    return b;
  }));
}
$('#expansion').addEventListener('change', () => {
  try { localStorage.setItem(PREFS_KEY, $('#expansion').checked ? '1' : '0'); } catch { /* sin storage */ }
  buildDifficulties();
});

// ================= Inicio =================
function refreshHome() {
  const saved = loadSaved();
  const btn = $('#continue-btn');
  btn.hidden = !saved;
  if (saved) btn.textContent = `Continuar partida (${saved.semester}° semestre)`;
}

$('#play-btn').addEventListener('click', () => show('screen-setup'));
$('#continue-btn').addEventListener('click', () => {
  const saved = loadSaved();
  if (!saved) return refreshHome();
  game = saved;
  toast = '';
  beginGame();
});
$('#back-home').addEventListener('click', () => { refreshHome(); show('screen-home'); });

// Salir de la partida
const quitDlg = $('#quit-dialog');
const goHome = () => { refreshHome(); show('screen-home'); };
$('#quit-game').addEventListener('click', () => { if (game?.over) goHome(); else openDialog(quitDlg); });
$('#quit-yes').addEventListener('click', () => { closeDialog(quitDlg); goHome(); });
$('#quit-no').addEventListener('click', () => closeDialog(quitDlg));

// Fin de partida
$('#end-again').addEventListener('click', () => { closeDialog($('#end-dialog')); startGame(game.expansion, game.target); });
$('#end-home').addEventListener('click', () => { closeDialog($('#end-dialog')); goHome(); });

// Reglas
const rulesDlg = $('#rules-dialog');
$('#rules-btn').addEventListener('click', () => openDialog(rulesDlg));
$('#game-rules').addEventListener('click', () => openDialog(rulesDlg));
$('#rules-ok').addEventListener('click', () => closeDialog(rulesDlg));

// ---------- Cómo instalar ----------
function setInstallTab(os) {
  document.querySelectorAll('.install-tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.os === os)));
  document.querySelectorAll('.install-panel').forEach((p) => { p.hidden = p.dataset.os !== os; });
}
function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
}
$('#open-install').addEventListener('click', () => {
  // Arranca en la pestaña del celular que se está usando; la otra sigue disponible.
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  setInstallTab(ios ? 'ios' : 'android');
  $('#install-done').hidden = !isStandalone();
  openDialog($('#install-dialog'));
});
document.querySelectorAll('.install-tab').forEach((t) => t.addEventListener('click', () => setInstallTab(t.dataset.os)));
$('#install-ok').addEventListener('click', () => closeDialog($('#install-dialog')));

// Tocar fuera de un diálogo lo cierra (salvo el de fin de partida).
document.querySelectorAll('dialog.sheet:not(.end)').forEach((d) => d.addEventListener('click', (e) => {
  if (e.target === d) closeDialog(d);
}));

// ================= Arranque =================
try { $('#expansion').checked = localStorage.getItem(PREFS_KEY) === '1'; } catch { /* sin storage */ }
buildDifficulties();
refreshHome();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
