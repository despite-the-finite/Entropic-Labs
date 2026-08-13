/* =============================================================================
   readingEngine.js — chooses WHAT to ask.

   Minigames say "give me a letter for letterSounds" or "give me a word plus
   three fair distractors"; this module decides which one, using:
     * the child's current level on that skill (from progression.js)
     * what she has already mastered (spaced review instead of drilling)
     * a short session memory so the same item never appears twice in a row
     * distractors that are *fair*: plausible but clearly different
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util, D = LTR.data;

  /** Rolling memory of the last few items served, per bucket. */
  var recent = { letters: [], words: [], sounds: [] };
  /* Just long enough to stop back-to-back repeats inside one activity, short
     enough that a letter can come round again later in the same session. */
  var RECENT_MAX = 3;

  function remember(bucket, key) {
    var list = recent[bucket] || (recent[bucket] = []);
    list.unshift(String(key).toLowerCase());
    if (list.length > RECENT_MAX) list.length = RECENT_MAX;
  }
  function isRecent(bucket, key) {
    return (recent[bucket] || []).indexOf(String(key).toLowerCase()) !== -1;
  }

  function masteryOf(bucket, key) {
    var b = LTR.state.data.mastery[bucket] || {};
    return b[String(key).toLowerCase()] || null;
  }

  /**
   * Weighted pick. A 4-year-old learns more from meeting eight letters three
   * times than twenty-six letters once, so items she is *part-way* through
   * outrank brand-new ones; mastered items drop to occasional review. Anything
   * served in the last few rounds is heavily damped so nothing repeats twice
   * in a row.
   */
  function weightedPick(candidates, bucket, keyOf) {
    if (!candidates.length) return null;
    var scored = candidates.map(function (c) {
      var key = keyOf(c);
      var m = masteryOf(bucket, key);
      var w;
      if (!m) w = 8;                        // never seen — introduce steadily
      else if (m.mastered) w = 2;           // keep it warm, don't drill it
      else w = 14 - Math.min(6, m.seen);    // actively learning — finish the job
      if (isRecent(bucket, key)) w *= 0.12; // avoid immediate repeats
      return { item: c, w: w };
    });
    var total = scored.reduce(function (a, x) { return a + x.w; }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < scored.length; i++) {
      r -= scored[i].w;
      if (r <= 0) return scored[i].item;
    }
    return scored[scored.length - 1].item;
  }

  var R = LTR.reading = {

    resetSession: function () { recent = { letters: [], words: [], sounds: [] }; },

    /* -------------------------------------------------------- letters ---- */

    /** A letter appropriate for this skill right now. */
    pickLetter: function (skillId, opts) {
      opts = opts || {};
      var tier = opts.tier || LTR.progression.letterTierFor(skillId);
      var pool = D.lettersByTier(tier);
      if (opts.vowelsOnly) pool = pool.filter(function (l) { return l.vowel; });
      if (opts.exclude) {
        var ex = opts.exclude.map(function (x) { return (x.char || x).toLowerCase(); });
        pool = pool.filter(function (l) { return ex.indexOf(l.char) === -1; });
      }
      if (opts.needPictureWord) {
        pool = pool.filter(function (l) {
          return D.query({ type: 'picture', startsWith: l.char }).length > 0;
        });
      }
      if (!pool.length) pool = D.lettersByTier(3);
      var chosen = weightedPick(pool, 'letters', function (l) { return l.char; });
      if (chosen) remember('letters', chosen.char);
      return chosen;
    },

    /**
     * Distractor letters. Mixes one visually/aurally confusable letter with
     * clearly-different ones: enough challenge to be real, never a trap.
     */
    letterDistractors: function (target, n, opts) {
      opts = opts || {};
      var tier = opts.tier || 3;
      var t = (target.char || target).toLowerCase();
      var pool = D.lettersByTier(tier).filter(function (l) { return l.char !== t; });
      var out = [];

      if (n >= 3 && !opts.noConfusable) {
        var conf = (D.confusable[t] || []).filter(function (c) {
          return pool.some(function (l) { return l.char === c; });
        });
        if (conf.length) {
          var pickChar = U.pick(conf);
          out.push(D.letterByChar(pickChar));
          pool = pool.filter(function (l) { return l.char !== pickChar; });
        }
      }
      return out.concat(U.sample(pool, Math.max(0, n - out.length)));
    },

    /* ---------------------------------------------------------- words ---- */

    /** A word appropriate for this skill, honouring the adaptive difficulty. */
    pickWord: function (skillId, opts) {
      opts = opts || {};
      var maxDiff = opts.maxDifficulty || LTR.progression.difficultyFor(skillId);
      var q = {
        types: opts.types || ['cvc'],
        maxDifficulty: maxDiff,
        needEmoji: opts.needEmoji !== false,
        category: opts.category || null,
        exclude: opts.exclude || []
      };
      var pool = D.query(q);
      if (!pool.length) { q.maxDifficulty = 3; pool = D.query(q); }
      if (!pool.length) pool = D.query({ types: ['cvc'], needEmoji: true });
      var chosen = weightedPick(pool, 'words', function (x) { return x.word; });
      if (chosen) remember('words', chosen.word);
      return chosen;
    },

    /**
     * Word distractors for "which word matches this picture".
     * Prefers words of similar shape (same length, or sharing a letter) so the
     * child actually has to read rather than guess by silhouette.
     */
    wordDistractors: function (target, n, opts) {
      opts = opts || {};
      var maxDiff = Math.max(1, opts.maxDifficulty || target.difficulty);
      var pool = D.query({
        types: opts.types || ['cvc', 'cvcc'],
        maxDifficulty: maxDiff + 1,
        needEmoji: opts.needEmoji !== false,
        exclude: [target].concat(opts.exclude || [])
      });
      if (pool.length < n) {
        pool = D.query({ types: ['cvc', 'cvcc'], needEmoji: true, exclude: [target] });
      }

      // Rank by "closeness" so options are similar but never ambiguous.
      var scored = pool.map(function (x) {
        var score = 0;
        if (x.word.length === target.word.length) score += 2;
        if (x.word.charAt(0) === target.word.charAt(0)) score += 1;
        if (x.family && x.family === target.family) score += 2;
        return { x: x, s: score + Math.random() * 2 };
      }).sort(function (a, b) { return b.s - a.s; });

      return scored.slice(0, n).map(function (o) { return o.x; });
    },

    /** A picture word that starts with a given letter (for sound work). */
    pictureFor: function (letterChar, exclude) {
      var pool = D.query({
        type: 'picture', startsWith: letterChar, needEmoji: true, exclude: exclude || []
      });
      if (!pool.length) {
        pool = D.query({ types: ['cvc', 'picture'], startsWith: letterChar, needEmoji: true, exclude: exclude || [] });
      }
      return pool.length ? U.pick(pool) : null;
    },

    /** A picture word that does NOT start with the given letter. */
    pictureNotStartingWith: function (letterChar, n, exclude) {
      var pool = D.query({ types: ['picture', 'cvc'], needEmoji: true, exclude: exclude || [] })
        .filter(function (x) { return x.word.charAt(0).toLowerCase() !== String(letterChar).toLowerCase(); });
      return U.sample(pool, n);
    },

    /* -------------------------------------------------------- stories ---- */
    pickStory: function (opts) {
      opts = opts || {};
      var max = opts.maxDifficulty || LTR.progression.difficultyFor('comprehension');
      var pool = D.storiesFor(max);
      if (!pool.length) pool = D.stories;
      return U.pick(pool);
    },

    pickSentence: function (opts) {
      opts = opts || {};
      var max = opts.maxDifficulty || LTR.progression.difficultyFor('sentenceReading');
      var pool = D.sentences.filter(function (s) { return s.difficulty <= max; });
      if (!pool.length) pool = D.sentences;
      return U.pick(pool);
    }
  };

})(window.LTR);
