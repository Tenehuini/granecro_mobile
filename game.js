'use strict';

// ================= Lógica del juego (sin DOM) =================
// Reglas iguales a granecro/granecro.py. Las cartas de la partida se identifican por su
// índice en deckCards(expansion). Los mazos son arrays: se roba del final (pop).
// Todos los textos que ve el jugador están en inglés (idioma original del juego).

const MAGIC_WORD = { B: 'dark', W: 'light', 'B/W': 'dark or light' };
const MAGIC_ICON = { B: '▼', W: '○', 'B/W': '▼○' };
const LEVEL_COURSE = { A1: 'Speaking with the dead', A2: 'History of the Void' };
const EFFECT_WORD = { '@': ['sanity', 'sanity'], T: ['thesis', 'thesis'], C: ['credit', 'credits'] };
const ORDINAL = ['1st', '2nd', '3rd'];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const cardOf = (g, id) => deckCards(g.expansion)[id];
const semesterSize = (g) => SEMESTER_SIZE[g.expansion ? 'expansion' : 'base'];
const currentCard = (g) => (g.current == null ? null : cardOf(g, g.current));

function newGame(expansion, target) {
  const ids = shuffle(deckCards(expansion).map((_, i) => i));
  const n = SEMESTER_SIZE[expansion ? 'expansion' : 'base'];
  const g = {
    expansion, target,
    s1: ids.slice(0, n), s2: ids.slice(n),
    current: null, semester: 1,
    sanity: START_SANITY, thesis: 0, credits: 0,
    magic: [],   // magia aprendida: 'B', 'W' o 'B/W'
    levels: [],  // niveles de los cursos aprobados (para A1 / A2)
    courses: { 1: [], 2: [] }, // { id, buddies }
    over: false,
  };
  draw(g);
  return g;
}

function draw(g) {
  if (g.s1.length) g.current = g.s1.pop();
  else if (g.s2.length) g.current = g.s2.pop();
  else { g.current = null; g.over = true; }
}

// '1C,1T' -> [{ n: 1, k: 'C' }, { n: 1, k: 'T' }]
function parseEffect(s) {
  return s ? s.split(',').map((e) => ({ n: parseInt(e, 10), k: e.trim().slice(-1) })) : [];
}
function describeEffect(s) {
  return parseEffect(s).map(({ n, k }) => `+${n} ${EFFECT_WORD[k][n === 1 ? 0 : 1]}`).join(', ');
}

// ¿Alcanza la magia aprendida para cubrir lo que pide el curso? Cada magia aprendida
// cubre un solo requisito; 'B/W' cubre cualquiera de los dos (se prueba toda combinación).
function magicOk(needs, learned) {
  const used = learned.map(() => false);
  const go = (k) => {
    if (k === needs.length) return true;
    for (let i = 0; i < learned.length; i++) {
      if (!used[i] && learned[i].includes(needs[k])) {
        used[i] = true;
        if (go(k + 1)) return true;
        used[i] = false;
      }
    }
    return false;
  };
  return go(0);
}

// Motivos por los que no te podés inscribir (vacío = podés).
function enrollProblems(g, c) {
  const out = [];
  if (g.sanity - c.sanity < MIN_SANITY) out.push(`Not enough sanity: you would drop to ${g.sanity - c.sanity} and the minimum is ${MIN_SANITY}.`);
  if (c.thesis > 0 && g.thesis < c.thesis) out.push(`It costs ${c.thesis} thesis and you have ${g.thesis}.`);
  if (c.needLevel && !g.levels.includes(c.needLevel)) out.push(`You must take ${c.needLevel} (${LEVEL_COURSE[c.needLevel]}) first.`);
  if (!magicOk(c.needMagic, g.magic)) {
    const have = g.magic.length ? g.magic.map((m) => MAGIC_WORD[m]).join(', ') : 'nothing so far';
    out.push(`Requires ${c.needMagic.map((m) => MAGIC_WORD[m]).join(', ')} magic. You learned: ${have}.`);
  }
  return out;
}

function buddySlots(c) { return c.buddy.length; }

// Acciones posibles con la carta actual: { id, title, detail, disabled (motivo o '') }.
function getActions(g) {
  const c = currentCard(g);
  if (!c || g.over) return [];
  const acts = [];

  if (c.type === 'sanity') {
    acts.push({ id: 'sanity', title: 'Recover sanity point', detail: '+1 sanity',
      disabled: g.sanity >= MAX_SANITY ? 'Your sanity is already at maximum.' : '' });
  }

  if (c.type === 'course') {
    const probs = enrollProblems(g, c);
    const parts = [`−${c.sanity} sanity`];
    if (c.thesis) parts.push(`−${c.thesis} thesis`);
    parts.push(`+${c.credits} credits`);
    if (c.learns) parts.push(`learn ${MAGIC_WORD[c.learns]} magic`);
    acts.push({ id: 'enroll', title: 'Enroll yourself to the course', detail: parts.join(' · '), disabled: probs.join(' ') });

    if (g.semester === 1) {
      acts.push({ id: 'leave', title: 'Leave for the next semester', detail: `Goes to the Semester 2 deck (${g.s2.length}/${semesterSize(g)})`,
        disabled: g.s2.length >= semesterSize(g) ? 'The Semester 2 deck is full.' : '' });
    }
  }

  // Compañero de estudio: los cursos W (expansión) solo aceptan Tired, y el resto no lo acepta.
  for (const course of g.courses[g.semester]) {
    const cc = cardOf(g, course.id);
    if (course.buddies >= buddySlots(cc)) continue;
    if ((cc.level === 'W') !== (c.type === 'tired')) continue;
    acts.push({ id: 'buddy:' + course.id, title: `Raise Study Buddy for «${cc.name}»`,
      detail: `${ORDINAL[course.buddies]} study buddy: ${describeEffect(cc.buddy[course.buddies])}`, disabled: '' });
  }

  if (c.type !== 'tired' && g.thesis < MAX_THESIS) {
    acts.push({ id: 'thesis', title: 'Work on thesis', detail: '+1 thesis', disabled: '' });
  }

  acts.push({ id: 'discard', title: 'Just discard', detail: 'The card is not used', disabled: '' });
  return acts;
}

function applyEffect(g, s) {
  for (const { n, k } of parseEffect(s)) {
    if (k === '@') g.sanity = Math.min(MAX_SANITY, g.sanity + n);
    else if (k === 'T') g.thesis = Math.min(MAX_THESIS, g.thesis + n);
    else if (k === 'C') g.credits += n;
  }
}

// Ejecuta una acción, pasa a la carta siguiente y devuelve un mensaje para mostrar.
function act(g, id) {
  const a = getActions(g).find((x) => x.id === id);
  if (!a || a.disabled) return '';
  const c = currentCard(g);
  let msg = '';

  if (id === 'enroll') {
    g.courses[g.semester].push({ id: g.current, buddies: 0 });
    g.sanity -= c.sanity;
    g.thesis -= c.thesis;
    g.credits += c.credits;
    g.levels.push(c.level);
    if (c.learns) g.magic.push(c.learns);
    msg = `You enrolled in "${c.name}"`;
  } else if (id === 'leave') {
    g.s2.push(g.current);
    msg = `«${c.name}» is left for the next semester.`;
  } else if (id.startsWith('buddy:')) {
    const courseId = Number(id.slice(6));
    const course = g.courses[g.semester].find((x) => x.id === courseId);
    const cc = cardOf(g, courseId);
    const eff = cc.buddy[course.buddies];
    course.buddies++;
    applyEffect(g, eff);
    msg = `New study buddy for «${cc.name}»: ${describeEffect(eff)}.`;
  } else if (id === 'thesis') {
    g.thesis++;
    msg = 'You worked on your thesis: +1.';
  } else if (id === 'sanity') {
    g.sanity++;
    msg = 'You recovered 1 sanity point.';
  } else if (id === 'discard') {
    msg = 'You discarded the card.';
  }

  if (!g.s1.length && g.semester === 1) {
    g.semester = 2;
    g.sanity = Math.min(MAX_SANITY, g.sanity + SEMESTER_BREAK_SANITY);
    shuffle(g.s2);
    msg += ` Semester 1 is over: +${SEMESTER_BREAK_SANITY} sanity. Semester 2 begins.`;
  }
  draw(g);
  return msg;
}

function result(g) {
  const problems = [];
  if (g.credits < g.target) problems.push(`Insufficient credits: you got ${g.credits} and you need ${g.target}.`);
  if (g.thesis < MAX_THESIS) problems.push(`Your thesis is not finished (${g.thesis} of ${MAX_THESIS}).`);
  if (g.sanity < 0) problems.push(`You are insane (sanity ${g.sanity}).`);
  return { win: problems.length === 0, problems };
}

// Para probar con Node (en el navegador no hace nada).
if (typeof module !== 'undefined') {
  module.exports = { newGame, getActions, act, result, magicOk, enrollProblems, describeEffect, cardOf, currentCard };
}
