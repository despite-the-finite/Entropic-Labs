/* =============================================================================
   progression.js — Reading Power, ranks, and the quiet adaptive engine.

   Two jobs:
     1. Turn every answer into progress the child can SEE (Reading Power,
        new ranks, unlocked regions).
     2. Turn every answer into a difficulty adjustment the child never sees.

   Rule of the house: the child is never told she is struggling. When she
   misses twice in a row on a skill we simply hand her easier content and
   fewer choices next time, and let her succeed her way back up.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util;

  /* ------------------------------------------------------------- ranks ---- */
  var RANKS = [
    { from: 1,  id: 'letter-explorer',  name: 'Letter Explorer',  glyph: '🌱' },
    { from: 3,  id: 'sound-detective',  name: 'Sound Detective',  glyph: '🔎' },
    { from: 6,  id: 'word-wizard',      name: 'Word Wizard',      glyph: '🪄' },
    { from: 10, id: 'sentence-sailor',  name: 'Sentence Sailor',  glyph: '⛵' },
    { from: 15, id: 'story-reader',     name: 'Story Reader',     glyph: '📖' },
    { from: 22, id: 'word-keeper',      name: 'Word Keeper',      glyph: '👑' }
  ];

  /** Points needed to go from `level` to `level + 1`. Gently increasing. */
  function costOf(level) { return 8 + level * 4; }

  /* -------------------------------------------------- adaptive parameters -- */
  /* skill level (1–5) → what the content picker is allowed to serve          */
  var DIFF_BY_LEVEL   = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 3 };
  var CHOICES_BY_LEVEL= { 1: 2, 2: 3, 3: 3, 4: 4, 5: 4 };
  var TIER_BY_LEVEL   = { 1: 1, 2: 2, 3: 2, 4: 3, 5: 3 };

  var P = LTR.progression = {

    RANKS: RANKS,

    /* ----------------------------------------------------------- power ---- */
    get level() { return LTR.state.data.power.level; },
    get points() { return LTR.state.data.power.points; },

    rank: function (level) {
      var lv = level === undefined ? P.level : level;
      var r = RANKS[0];
      RANKS.forEach(function (x) { if (lv >= x.from) r = x; });
      return r;
    },

    /** 0…1 progress toward the next Reading Power level (for the HUD meter). */
    levelProgress: function () {
      var pw = LTR.state.data.power;
      return U.clamp(pw.points / costOf(pw.level), 0, 1);
    },

    /**
     * Award Reading Power. Returns { levelsGained, newRank } so the caller can
     * celebrate at the right moment (never mid-question).
     */
    addPower: function (n) {
      var pw = LTR.state.data.power;
      var beforeRank = P.rank().id;
      var gained = 0;
      pw.points += n;
      while (pw.points >= costOf(pw.level)) {
        pw.points -= costOf(pw.level);
        pw.level += 1;
        gained += 1;
      }
      LTR.state.save();
      LTR.emit('power-changed', { level: pw.level, progress: P.levelProgress() });
      var afterRank = P.rank();
      return {
        levelsGained: gained,
        newRank: (gained && afterRank.id !== beforeRank) ? afterRank : null
      };
    },

    /* ------------------------------------------------------- adaptivity --- */
    skill: function (id) {
      var s = LTR.state.data.skills[id];
      if (!s) s = LTR.state.data.skills[id] = { level: 1, attempts: 0, correct: 0, streak: 0, missStreak: 0, bestStreak: 0 };
      return s;
    },

    skillLevel: function (id) { return P.skill(id).level; },

    /** Max content difficulty this child should meet on this skill right now. */
    difficultyFor: function (id) { return DIFF_BY_LEVEL[P.skillLevel(id)] || 1; },

    /** How many options to show. Fewer choices when she needs a win. */
    choiceCountFor: function (id, cap) {
      var n = CHOICES_BY_LEVEL[P.skillLevel(id)] || 2;
      return Math.min(n, cap || 4);
    },

    /** Which slice of the alphabet is fair game. */
    letterTierFor: function (id) { return TIER_BY_LEVEL[P.skillLevel(id)] || 1; },

    accuracy: function (id) {
      var s = P.skill(id);
      return s.attempts ? s.correct / s.attempts : 0;
    },

    overallAccuracy: function () {
      var st = LTR.state.data.stats;
      return st.totalAttempts ? st.totalCorrect / st.totalAttempts : 0;
    },

    /**
     * The single entry point every minigame calls after an answer.
     *   { skill, correct, hintLevel, bucket, key, powerValue }
     * Returns { power } describing what was awarded, for the caller's cheer.
     */
    recordAnswer: function (a) {
      var st = LTR.state.data;
      var s = P.skill(a.skill);
      var usedHint = (a.hintLevel || 0) > 0;

      s.attempts += 1;
      st.stats.totalAttempts += 1;
      if (usedHint) st.stats.hintsUsed += 1;

      if (a.correct) {
        s.correct += 1;
        st.stats.totalCorrect += 1;
        s.missStreak = 0;
        if (!usedHint) {
          s.streak += 1;
          if (s.streak > s.bestStreak) s.bestStreak = s.streak;
          // Three clean answers in a row → quietly raise the ceiling.
          if (s.streak >= 3 && s.level < 5) { s.level += 1; s.streak = 0; U.log('skill up', a.skill, s.level); }
        }
      } else {
        s.streak = 0;
        s.missStreak += 1;
        // Two misses in a row → quietly make the next ones easier.
        if (s.missStreak >= 2 && s.level > 1) { s.level -= 1; s.missStreak = 0; U.log('skill down', a.skill, s.level); }
      }

      if (a.bucket && a.key) LTR.state.recordItem(a.bucket, a.key, !!a.correct, usedHint);

      var res = { power: 0, levelsGained: 0, newRank: null };
      if (a.correct) {
        // Hinted answers still earn — help must never feel like a penalty —
        // just a little less than an independent read.
        var pts = a.powerValue !== undefined ? a.powerValue : (usedHint ? 1 : 2);
        var up = P.addPower(pts);
        res.power = pts;
        res.levelsGained = up.levelsGained;
        res.newRank = up.newRank;
      }
      LTR.state.save();
      return res;
    },

    /* ---------------------------------------------------------- unlocks --- */
    /**
     * A region opens when the previous one is finished AND the child has the
     * Reading Power for it. Returns the list of chapters newly unlocked.
     */
    checkUnlocks: function () {
      var opened = [];
      LTR.data.chapters.forEach(function (ch) {
        if (LTR.state.isChapterUnlocked(ch.id)) return;
        var prevDone = ch.id === 1 || LTR.state.isChapterComplete(ch.id - 1);
        if (prevDone && P.level >= ch.requiredPower) {
          if (LTR.state.unlockChapter(ch.id)) opened.push(ch);
        }
      });
      return opened;
    },

    /**
     * Parent-facing summary: which skills would benefit from more practice.
     * Deliberately phrased as suggestions, never as failure.
     */
    suggestions: function () {
      var out = [];
      LTR.state.SKILL_IDS.forEach(function (id) {
        var s = P.skill(id);
        if (s.attempts < 5) return;
        var acc = s.correct / s.attempts;
        if (acc < 0.7) {
          out.push({
            skill: id,
            label: LTR.state.SKILL_LABELS[id],
            accuracy: acc,
            note: 'Coming along — the game is already serving easier examples here.'
          });
        }
      });
      return out;
    }
  };

})(window.LTR);
