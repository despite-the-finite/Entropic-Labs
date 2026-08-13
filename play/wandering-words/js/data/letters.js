/* =============================================================================
   data/letters.js — the alphabet as data.

   `say` is a spelling that makes a text-to-speech engine produce the letter's
   *sound* rather than its name ("buh", not "bee"). `tier` orders introduction:
   tier 1 letters are the high-frequency, visually distinct ones a 4-year-old
   meets first; tier 3 holds the rare/confusable ones.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var D = LTR.data = LTR.data || {};

  D.letters = [
    { char: 'a', say: 'ah',   word: 'apple',     emoji: '🍎', tier: 1, vowel: true },
    { char: 'b', say: 'buh',  word: 'ball',      emoji: '⚽', tier: 1 },
    { char: 'c', say: 'kuh',  word: 'cat',       emoji: '🐱', tier: 1 },
    { char: 'd', say: 'duh',  word: 'dog',       emoji: '🐶', tier: 1 },
    { char: 'e', say: 'eh',   word: 'egg',       emoji: '🥚', tier: 2, vowel: true },
    { char: 'f', say: 'ff',   word: 'fish',      emoji: '🐟', tier: 2 },
    { char: 'g', say: 'guh',  word: 'goat',      emoji: '🐐', tier: 2 },
    { char: 'h', say: 'huh',  word: 'hat',       emoji: '🎩', tier: 1 },
    { char: 'i', say: 'ih',   word: 'igloo',     emoji: '🧊', tier: 2, vowel: true },
    { char: 'j', say: 'juh',  word: 'jam',       emoji: '🍓', tier: 3 },
    { char: 'k', say: 'kuh',  word: 'kite',      emoji: '🪁', tier: 2 },
    { char: 'l', say: 'llll', word: 'leaf',      emoji: '🍃', tier: 2 },
    { char: 'm', say: 'mmm',  word: 'moon',      emoji: '🌙', tier: 1 },
    { char: 'n', say: 'nnn',  word: 'nest',      emoji: '🪺', tier: 2 },
    { char: 'o', say: 'oh',   word: 'octopus',   emoji: '🐙', tier: 2, vowel: true },
    { char: 'p', say: 'puh',  word: 'pig',       emoji: '🐷', tier: 1 },
    { char: 'q', say: 'kwuh', word: 'queen',     emoji: '👑', tier: 3 },
    { char: 'r', say: 'rrr',  word: 'rainbow',   emoji: '🌈', tier: 2 },
    { char: 's', say: 'sss',  word: 'sun',       emoji: '☀️', tier: 1 },
    { char: 't', say: 'tuh',  word: 'tree',      emoji: '🌳', tier: 1 },
    { char: 'u', say: 'uh',   word: 'umbrella',  emoji: '☂️', tier: 3, vowel: true },
    { char: 'v', say: 'vvv',  word: 'van',       emoji: '🚐', tier: 3 },
    { char: 'w', say: 'wuh',  word: 'water',     emoji: '💧', tier: 2 },
    { char: 'x', say: 'kss',  word: 'box',       emoji: '📦', tier: 3 },
    { char: 'y', say: 'yuh',  word: 'yarn',      emoji: '🧶', tier: 3 },
    { char: 'z', say: 'zzz',  word: 'zebra',     emoji: '🦓', tier: 3 }
  ];

  var byChar = {};
  D.letters.forEach(function (l) { byChar[l.char] = l; });

  D.letterByChar = function (ch) { return byChar[String(ch || '').toLowerCase()] || null; };

  D.lettersByTier = function (maxTier) {
    return D.letters.filter(function (l) { return l.tier <= maxTier; });
  };

  D.vowels = D.letters.filter(function (l) { return l.vowel; });

  /**
   * How to *say* a phoneme chunk. Handles single letters plus the digraphs we
   * introduce later (sh, ch, th, ck...), so audio.blend() works for every word
   * in the corpus without special cases at the call site.
   */
  var DIGRAPH_SAY = {
    sh: 'shh', ch: 'chuh', th: 'thh', ck: 'kuh', ng: 'ng', wh: 'wuh',
    ee: 'eee', oo: 'oooh', ai: 'ay', ay: 'ay', ow: 'ow', oa: 'oh', ea: 'eee'
  };

  D.soundSay = function (chunk) {
    var c = String(chunk || '').toLowerCase();
    if (DIGRAPH_SAY[c]) return DIGRAPH_SAY[c];
    var rec = byChar[c];
    return rec ? rec.say : c;
  };

  /** Letters that look or sound confusable — useful as *fair* distractors. */
  D.confusable = {
    b: ['d', 'p'], d: ['b', 'p'], p: ['q', 'b'], q: ['p', 'g'],
    m: ['n', 'w'], n: ['m', 'u'], u: ['n', 'v'], w: ['m', 'v'],
    a: ['e', 'o'], e: ['a', 'c'], o: ['a', 'c'], i: ['l', 'j'],
    s: ['z', 'c'], z: ['s', 'n'], f: ['t', 'l'], t: ['f', 'l'],
    g: ['q', 'j'], j: ['g', 'i'], k: ['x', 'h'], v: ['w', 'u'],
    c: ['e', 'o'], h: ['n', 'k'], l: ['i', 't'], r: ['n', 'h'],
    x: ['k', 'y'], y: ['v', 'x']
  };

})(window.LTR);
