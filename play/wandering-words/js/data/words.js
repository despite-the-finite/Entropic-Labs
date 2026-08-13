/* =============================================================================
   data/words.js — the word corpus.

   Every reading activity draws from this list; nothing is hard-coded into a
   minigame. Adding a word here immediately makes it available everywhere.

     word        the spelling
     difficulty  1 (easiest) … 5
     phonemes    the sound chunks, for blending + "sound it out" audio
     category    used for themed activities (animals, nature, home…)
     emoji       the picture. Every word a child must *match to a picture*
                 needs one; abstract words (sight words) do not.
     type        'cvc' | 'sight' | 'picture' | 'cvcc'
     family      rime, for rhyming games (cat → 'at')
   ============================================================================= */
(function (LTR) {
  'use strict';

  var D = LTR.data = LTR.data || {};

  function w(word, diff, phonemes, category, emoji, type, family) {
    return {
      word: word, difficulty: diff, phonemes: phonemes, category: category,
      emoji: emoji, type: type || 'cvc', family: family || null
    };
  }

  D.words = [
    /* ---- CVC, difficulty 1: short-a and the clearest consonants ---------- */
    w('cat', 1, ['c','a','t'], 'animals', '🐱', 'cvc', 'at'),
    w('hat', 1, ['h','a','t'], 'clothes', '🎩', 'cvc', 'at'),
    w('bat', 1, ['b','a','t'], 'animals', '🦇', 'cvc', 'at'),
    w('mat', 1, ['m','a','t'], 'home',    '🧶', 'cvc', 'at'),
    w('map', 1, ['m','a','p'], 'things',  '🗺️', 'cvc', 'ap'),
    w('cap', 1, ['c','a','p'], 'clothes', '🧢', 'cvc', 'ap'),
    w('van', 1, ['v','a','n'], 'things',  '🚐', 'cvc', 'an'),
    w('fan', 1, ['f','a','n'], 'home',    '🪭', 'cvc', 'an'),
    w('bag', 1, ['b','a','g'], 'things',  '🎒', 'cvc', 'ag'),
    w('jam', 1, ['j','a','m'], 'food',    '🍓', 'cvc', 'am'),
    w('ant', 1, ['a','n','t'], 'animals', '🐜', 'cvcc','ant'),

    /* ---- CVC, difficulty 1–2: other short vowels -------------------------- */
    w('dog', 1, ['d','o','g'], 'animals', '🐶', 'cvc', 'og'),
    w('log', 2, ['l','o','g'], 'nature',  '🪵', 'cvc', 'og'),
    w('fox', 2, ['f','o','x'], 'animals', '🦊', 'cvc', 'ox'),
    w('box', 2, ['b','o','x'], 'things',  '📦', 'cvc', 'ox'),
    w('pot', 2, ['p','o','t'], 'home',    '🍲', 'cvc', 'ot'),
    w('mop', 2, ['m','o','p'], 'home',    '🧹', 'cvc', 'op'),
    w('top', 2, ['t','o','p'], 'things',  '🔝', 'cvc', 'op'),
    w('sun', 1, ['s','u','n'], 'nature',  '☀️', 'cvc', 'un'),
    w('bus', 1, ['b','u','s'], 'things',  '🚌', 'cvc', 'us'),
    w('cup', 1, ['c','u','p'], 'home',    '🥤', 'cvc', 'up'),
    w('bug', 1, ['b','u','g'], 'animals', '🐛', 'cvc', 'ug'),
    w('rug', 2, ['r','u','g'], 'home',    '🧶', 'cvc', 'ug'),
    w('nut', 2, ['n','u','t'], 'food',    '🥜', 'cvc', 'ut'),
    w('mud', 2, ['m','u','d'], 'nature',  '🟤', 'cvc', 'ud'),
    w('pig', 1, ['p','i','g'], 'animals', '🐷', 'cvc', 'ig'),
    w('fig', 3, ['f','i','g'], 'food',    '🫐', 'cvc', 'ig'),
    w('pin', 2, ['p','i','n'], 'things',  '📌', 'cvc', 'in'),
    w('fin', 3, ['f','i','n'], 'animals', '🐟', 'cvc', 'in'),
    w('lip', 2, ['l','i','p'], 'body',    '👄', 'cvc', 'ip'),
    w('zip', 3, ['z','i','p'], 'clothes', '🤐', 'cvc', 'ip'),
    w('six', 2, ['s','i','x'], 'numbers', '6️⃣', 'cvc', 'ix'),
    w('bed', 1, ['b','e','d'], 'home',    '🛏️', 'cvc', 'ed'),
    w('hen', 2, ['h','e','n'], 'animals', '🐔', 'cvc', 'en'),
    w('pen', 2, ['p','e','n'], 'things',  '🖊️', 'cvc', 'en'),
    w('ten', 2, ['t','e','n'], 'numbers', '🔟', 'cvc', 'en'),
    w('net', 2, ['n','e','t'], 'things',  '🥅', 'cvc', 'et'),
    w('jet', 3, ['j','e','t'], 'things',  '✈️', 'cvc', 'et'),
    w('web', 2, ['w','e','b'], 'nature',  '🕸️', 'cvc', 'eb'),
    w('leg', 2, ['l','e','g'], 'body',    '🦵', 'cvc', 'eg'),
    w('egg', 1, ['e','g','g'], 'food',    '🥚', 'cvc', 'eg'),

    /* ---- difficulty 3: slightly longer / digraph words -------------------- */
    w('frog', 3, ['f','r','o','g'], 'animals', '🐸', 'cvcc', 'og'),
    w('star', 3, ['s','t','ar'],    'nature',  '⭐', 'cvcc', 'ar'),
    w('moon', 3, ['m','oo','n'],    'nature',  '🌙', 'cvcc', 'oon'),
    w('tree', 3, ['t','r','ee'],    'nature',  '🌳', 'cvcc', 'ee'),
    w('fish', 3, ['f','i','sh'],    'animals', '🐟', 'cvcc', 'ish'),
    w('ship', 3, ['sh','i','p'],    'things',  '🚢', 'cvcc', 'ip'),
    w('chip', 4, ['ch','i','p'],    'food',    '🍟', 'cvcc', 'ip'),
    w('duck', 3, ['d','u','ck'],    'animals', '🦆', 'cvcc', 'uck'),
    w('rock', 3, ['r','o','ck'],    'nature',  '🪨', 'cvcc', 'ock'),
    w('cake', 3, ['c','a','ke'],    'food',    '🍰', 'cvcc', 'ake'),
    w('bee',  2, ['b','ee'],        'animals', '🐝', 'cvcc', 'ee'),
    w('owl',  3, ['ow','l'],        'animals', '🦉', 'cvcc', 'owl'),
    w('key',  3, ['k','ey'],        'things',  '🔑', 'cvcc', 'ey'),
    w('leaf', 3, ['l','ea','f'],    'nature',  '🍃', 'cvcc', 'eaf'),
    w('rain', 4, ['r','ai','n'],    'nature',  '🌧️', 'cvcc', 'ain'),

    /* ---- picture words for beginning-sound work (not for decoding) -------- */
    w('apple',    1, ['a'],  'food',    '🍎', 'picture'),
    w('ball',     1, ['b'],  'things',  '⚽', 'picture'),
    w('goat',     2, ['g'],  'animals', '🐐', 'picture'),
    w('house',    2, ['h'],  'home',    '🏠', 'picture'),
    w('kite',     2, ['k'],  'things',  '🪁', 'picture'),
    w('lion',     2, ['l'],  'animals', '🦁', 'picture'),
    w('nest',     2, ['n'],  'nature',  '🪺', 'picture'),
    w('octopus',  3, ['o'],  'animals', '🐙', 'picture'),
    w('queen',    3, ['q'],  'people',  '👑', 'picture'),
    w('rainbow',  2, ['r'],  'nature',  '🌈', 'picture'),
    w('turtle',   2, ['t'],  'animals', '🐢', 'picture'),
    w('umbrella', 3, ['u'],  'things',  '☂️', 'picture'),
    w('water',    2, ['w'],  'nature',  '💧', 'picture'),
    w('yarn',     3, ['y'],  'things',  '🧶', 'picture'),
    w('zebra',    3, ['z'],  'animals', '🦓', 'picture'),
    w('mouse',    2, ['m'],  'animals', '🐭', 'picture'),
    w('snake',    3, ['s'],  'animals', '🐍', 'picture'),
    w('cloud',    2, ['c'],  'nature',  '☁️', 'picture'),
    w('drum',     2, ['d'],  'things',  '🥁', 'picture'),
    w('feather',  3, ['f'],  'nature',  '🪶', 'picture'),
    w('jelly',    3, ['j'],  'food',    '🍮', 'picture'),
    w('pizza',    1, ['p'],  'food',    '🍕', 'picture'),
    w('violin',   4, ['v'],  'things',  '🎻', 'picture'),
    w('bird',     1, ['b'],  'animals', '🐦', 'picture'),
    w('flower',   2, ['f'],  'nature',  '🌸', 'picture'),
    w('gift',     2, ['g'],  'things',  '🎁', 'picture'),
    w('heart',    1, ['h'],  'things',  '❤️', 'picture'),
    w('monkey',   2, ['m'],  'animals', '🐵', 'picture'),
    w('rocket',   2, ['r'],  'things',  '🚀', 'picture'),
    w('tiger',    2, ['t'],  'animals', '🐯', 'picture'),

    /* ---- high-frequency sight words (Chapter 3+) -------------------------- */
    w('the',   1, ['the'],   'sight', null, 'sight'),
    w('and',   1, ['a','n','d'], 'sight', null, 'sight'),
    w('I',     1, ['I'],     'sight', null, 'sight'),
    w('a',     1, ['a'],     'sight', null, 'sight'),
    w('is',    1, ['i','s'], 'sight', null, 'sight'),
    w('it',    1, ['i','t'], 'sight', null, 'sight'),
    w('my',    1, ['m','y'], 'sight', null, 'sight'),
    w('we',    2, ['w','e'], 'sight', null, 'sight'),
    w('go',    2, ['g','o'], 'sight', null, 'sight'),
    w('see',   2, ['s','ee'],'sight', '👀', 'sight'),
    w('you',   2, ['you'],   'sight', null, 'sight'),
    w('like',  2, ['l','i','ke'], 'sight', null, 'sight'),
    w('look',  2, ['l','oo','k'], 'sight', '👀', 'sight'),
    w('big',   2, ['b','i','g'],  'sight', null, 'sight'),
    w('can',   2, ['c','a','n'],  'sight', null, 'sight'),
    w('up',    1, ['u','p'],  'sight', '⬆️', 'sight'),
    w('down',  3, ['d','ow','n'], 'sight', '⬇️', 'sight'),
    w('here',  3, ['h','ere'],'sight', null, 'sight'),
    w('little',3, ['li','ttle'], 'sight', null, 'sight'),
    w('come',  3, ['c','ome'],'sight', null, 'sight'),
    w('to',    2, ['to'],     'sight', null, 'sight'),
    w('run',   1, ['r','u','n'], 'action', '🏃', 'cvc', 'un'),
    w('sit',   2, ['s','i','t'], 'action', '🪑', 'cvc', 'it'),
    w('hop',   2, ['h','o','p'], 'action', '🐇', 'cvc', 'op'),
    w('dig',   2, ['d','i','g'], 'action', '⛏️', 'cvc', 'ig')
  ];

  /* --------------------------------------------------------------- lookup -- */
  var byWord = {};
  D.words.forEach(function (x) { byWord[x.word.toLowerCase()] = x; });
  D.wordByText = function (t) { return byWord[String(t || '').toLowerCase()] || null; };

  /**
   * The one query the whole game uses to fetch content.
   * opts: { type, types, maxDifficulty, minDifficulty, category, startsWith,
   *         family, needEmoji, exclude:[words], count }
   */
  D.query = function (opts) {
    opts = opts || {};
    var types = opts.types || (opts.type ? [opts.type] : null);
    var ex = (opts.exclude || []).map(function (x) {
      return String(x && x.word ? x.word : x).toLowerCase();
    });

    var out = D.words.filter(function (x) {
      if (types && types.indexOf(x.type) === -1) return false;
      if (opts.maxDifficulty && x.difficulty > opts.maxDifficulty) return false;
      if (opts.minDifficulty && x.difficulty < opts.minDifficulty) return false;
      if (opts.category && x.category !== opts.category) return false;
      if (opts.family && x.family !== opts.family) return false;
      if (opts.needEmoji && !x.emoji) return false;
      if (opts.startsWith && x.word.charAt(0).toLowerCase() !== String(opts.startsWith).toLowerCase()) return false;
      if (ex.indexOf(x.word.toLowerCase()) !== -1) return false;
      return true;
    });

    if (opts.count) out = LTR.util.sample(out, opts.count);
    return out;
  };

  /** Words that rhyme with `word` (same rime family, different spelling start). */
  D.rhymesWith = function (word) {
    var rec = D.wordByText(word);
    if (!rec || !rec.family) return [];
    return D.words.filter(function (x) {
      return x.family === rec.family && x.word !== rec.word && x.emoji;
    });
  };

  /** Words that do NOT rhyme — needed to build fair rhyming distractors. */
  D.notRhymesWith = function (word, opts) {
    var rec = D.wordByText(word);
    var fam = rec && rec.family;
    return D.query(Object.assign({ needEmoji: true, types: ['cvc', 'cvcc'] }, opts || {}))
      .filter(function (x) { return x.family !== fam; });
  };

})(window.LTR);
