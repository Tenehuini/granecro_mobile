'use strict';

// Datos del juego, iguales a granecro/granecro.py.
// level:     nivel del curso (C, B, A, A1, A2; W = cursos de la expansión).
// sanity:    cordura que cuesta inscribirse. thesis: tesis que cuesta inscribirse.
// needLevel: curso previo necesario (A1 o A2).
// needMagic: magia necesaria (B = oscura, W = luz).
// credits:   créditos que da el curso.
// buddy:     efecto del 1er y 2do compañero de estudio ('@' cordura, 'T' tesis, 'C' créditos).
// learns:    magia que enseña (B, W o B/W = cualquiera de las dos).
const course = (img, name, level, thesis, sanity, needLevel, needMagic, credits, b1, b2, learns) => ({
  img, type: 'course', name, level, thesis, sanity, needLevel,
  needMagic: needMagic ? needMagic.split(',') : [], credits,
  buddy: [b1, b2].filter(Boolean), learns,
});
const tired = () => ({ img: 'tired', type: 'tired', name: 'Tired' });
const sanityBoost = () => ({ img: 'sanity_boost', type: 'sanity', name: 'Sanity boost' });

const BASE_CARDS = [
  course('abyssal_language',         'Abyssal language',         'C',  0, 1, '',   '',        2,  '',         '',         'B'),
  course('heraldry_of_the_astrals',  'Heraldry of the Astrals',  'C',  0, 1, '',   '',        2,  '',         '',         ''),
  course('holy_animals',             'Holy animals',             'C',  0, 1, '',   '',        2,  '',         '',         'W'),
  course('history_of_the_void',      'History of the Void',      'A2', 0, 3, '',   '',        10, '2@',       '',         'B'),
  course('advanced_blood_rituals',   'Advanced blood rituals',   'A',  0, 3, '',   '',        10, '1@',       '1C,1T,1@', 'B/W'),
  course('transference_of_life',     'Transference of life',     'A',  0, 3, '',   'W,W,B,B', 12, '3C',       '',         'B/W'),
  course('speaking_with_the_dead',   'Speaking with the dead',   'A1', 0, 3, '',   '',        10, '2C',       '',         'W'),
  course('soul_mending',             'Soul mending',             'B',  0, 2, 'A1', '',        5,  '2@',       '1T,1C',    'W'),
  course('conjuring_spirit_knights', 'Conjuring spirit knights', 'B',  0, 2, '',   'W',       5,  '2C',       '',         'W'),
  course('poison_brewing',           'Poison brewing',           'B',  0, 2, '',   'B',       5,  '1C',       '1C,1T',    'B'),
  course('spellbook_writing',        'Spellbook writing',        'B',  0, 2, '',   '',        5,  '1C',       '1C',       ''),
  course('practice_magic_staffs',    'Practice: Magic staffs',   'B',  0, 2, '',   'W,B',     5,  '1@',       '1C,1@',    'B/W'),
  course('invoking_shadowspawns',    'Invoking shadowspawns',    'B',  0, 2, 'A2', '',        5,  '2@',       '1C',       'B'),
  course('defense_against_curses',   'Defense against curses',   'B',  0, 2, '',   'B,W,W',   7,  '2C',       '',         'W'),
  course('drain_spell_seminar',      'Drain spells seminar',     'B',  0, 2, '',   'B,B,W',   7,  '1C,1T',    '',         'B'),
  course('graveyards_of_the_realm',  'Graveyards of the realm',  'B',  0, 2, '',   '',        5,  '1@',       '',         ''),
  tired(), tired(),
  sanityBoost(), sanityBoost(),
];

const EXPANSION_CARDS = [
  tired(),
  course('sigils_of_power',      'Sigils of power',      'W', 1, 1, '', '', 3, '2@', '', ''),
  course('banishing_the_undead', 'Banishing the undead', 'W', 1, 1, '', '', 3, '2C', '', 'W'),
  course('dream_invasion',       'Dream invasion',       'W', 1, 1, '', '', 3, '2C', '', 'B'),
];

const MAX_SANITY = 5;
const MIN_SANITY = -2;
const START_SANITY = 3;
const MAX_THESIS = 5;
const SEMESTER_BREAK_SANITY = 3;

// Cartas del primer semestre y tope del mazo del segundo semestre.
const SEMESTER_SIZE = { base: 12, expansion: 14 };

const DIFFICULTIES = {
  base: [
    { key: 'easy',   label: 'Easy',    target: 35 },
    { key: 'medium', label: 'Medium', target: 40 },
    { key: 'hard',   label: 'Hard',   target: 45 },
  ],
  expansion: [
    { key: 'easy',   label: 'Easy',    target: 45 },
    { key: 'medium', label: 'Medium', target: 50 },
    { key: 'hard',   label: 'Hard',   target: 52 },
  ],
};

const deckCards = (expansion) => (expansion ? BASE_CARDS.concat(EXPANSION_CARDS) : BASE_CARDS);
