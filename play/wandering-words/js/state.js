/* =============================================================================
   state.js — the single source of truth for a player's save.

   Nothing else creates state shapes; screens and minigames call the small
   mutation helpers here, which keep the save consistent and schedule a write.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util;

  var SCHEMA_VERSION = 1;

  /** The seven tracked reading skills. Order matters for the parent dashboard. */
  var SKILL_IDS = [
    'letterRecognition',
    'letterSounds',
    'phonics',
    'sightWords',
    'wordReading',
    'sentenceReading',
    'comprehension'
  ];

  var SKILL_LABELS = {
    letterRecognition: 'Letter recognition',
    letterSounds:      'Letter sounds',
    phonics:           'Blending sounds (phonics)',
    sightWords:        'Sight words',
    wordReading:       'Reading whole words',
    sentenceReading:   'Reading sentences',
    comprehension:     'Understanding stories'
  };

  function freshSkill() {
    return { level: 1, attempts: 0, correct: 0, streak: 0, missStreak: 0, bestStreak: 0 };
  }

  function defaultState() {
    var skills = {};
    SKILL_IDS.forEach(function (id) { skills[id] = freshSkill(); });

    return {
      version: SCHEMA_VERSION,
      createdAt: Date.now(),
      lastPlayed: Date.now(),

      player: {
        name: 'Explorer',
        created: false,
        avatar: {
          skin: 2,
          hair: 'long',
          hairColor: 1,
          outfit: 0,
          hat: 'none',
          backpack: true,
          favColor: 0
        }
      },

      progress: {
        currentChapter: 1,
        nodeIndex: 0,                 // position along the current chapter trail
        unlockedChapters: [1],
        completedChapters: [],
        completedNodes: {},           // { chapterId: [nodeId, ...] }
        secretsFound: [],
        surprisesSeen: [],
        introSeen: false
      },

      power: { points: 0, level: 1 },

      wallet: { stars: 0, gems: 0 },

      /* Collectibles. Words and letters are not listed here: their record of
         record is `mastery` below, which the Adventure Book reads directly. */
      collection: {
        animals: [], characters: [], treasures: [],
        stickers: [], places: []
      },

      skills: skills,

      /** Per-item mastery: { letters:{a:{seen,ok}}, sounds:{...}, words:{...} } */
      mastery: { letters: {}, sounds: {}, words: {}, sight: {} },

      /** Rolling log of finished activities — powers the parent dashboard. */
      activityLog: [],

      settings: { speech: true, sfx: true, autoVoice: true },

      stats: { sessions: 0, totalCorrect: 0, totalAttempts: 0, hintsUsed: 0, playMs: 0 }
    };
  }

  /* ------------------------------------------------------------------------ */

  var S = LTR.state = {
    SKILL_IDS: SKILL_IDS,
    SKILL_LABELS: SKILL_LABELS,
    data: null,
    sessionStart: Date.now(),

    /** Load from storage (or create a new save) and migrate missing fields. */
    init: function () {
      var loaded = LTR.storage.load();
      var fresh = defaultState();
      if (loaded) {
        S.data = U.defaults(loaded, fresh);
        S.data.version = SCHEMA_VERSION;
      } else {
        S.data = fresh;
      }
      S.data.lastPlayed = Date.now();
      S.data.stats.sessions += 1;
      S.sessionStart = Date.now();
      S.save();
      LTR.emit('state-loaded', S.data);
      return S.data;
    },

    isNewPlayer: function () { return !S.data.player.created; },

    save: function () {
      if (!S.data) return;
      S.data.lastPlayed = Date.now();
      LTR.storage.save(S.data);
    },

    flush: function () {
      if (!S.data) return;
      S.data.stats.playMs += Date.now() - S.sessionStart;
      S.sessionStart = Date.now();
      LTR.storage.saveNow(S.data);
    },

    reset: function () {
      LTR.storage.clear();
      S.data = defaultState();
      LTR.storage.saveNow(S.data);
      LTR.emit('state-reset', S.data);
      return S.data;
    },

    /* ------------------------------------------------------------ wallet -- */
    addStars: function (n) {
      S.data.wallet.stars += n;
      LTR.emit('wallet-changed', S.data.wallet);
      S.save();
    },
    addGems: function (n) {
      S.data.wallet.gems += n;
      LTR.emit('wallet-changed', S.data.wallet);
      S.save();
    },

    /* -------------------------------------------------------- collection -- */
    /**
     * Add a collectible. Items are plain data: { id, name, glyph, note }.
     * Returns true when it is newly discovered (so the caller can celebrate).
     */
    collect: function (kind, item) {
      var list = S.data.collection[kind];
      if (!list) list = S.data.collection[kind] = [];
      if (list.some(function (x) { return x.id === item.id; })) return false;
      list.push(Object.assign({ foundAt: Date.now() }, item));
      LTR.emit('collected', { kind: kind, item: item });
      S.save();
      return true;
    },
    has: function (kind, id) {
      var list = S.data.collection[kind] || [];
      return list.some(function (x) { return x.id === id; });
    },
    countAll: function () {
      var c = S.data.collection, n = 0;
      Object.keys(c).forEach(function (k) { n += c[k].length; });
      return n;
    },

    /* ---------------------------------------------------------- progress -- */
    isChapterUnlocked: function (id) {
      return S.data.progress.unlockedChapters.indexOf(id) !== -1;
    },
    unlockChapter: function (id) {
      if (S.isChapterUnlocked(id)) return false;
      S.data.progress.unlockedChapters.push(id);
      S.save();
      LTR.emit('chapter-unlocked', id);
      return true;
    },
    isChapterComplete: function (id) {
      return S.data.progress.completedChapters.indexOf(id) !== -1;
    },
    completeChapter: function (id) {
      if (!S.isChapterComplete(id)) S.data.progress.completedChapters.push(id);
      S.save();
    },
    completedNodes: function (chapterId) {
      return S.data.progress.completedNodes[chapterId] || [];
    },
    isNodeComplete: function (chapterId, nodeId) {
      return S.completedNodes(chapterId).indexOf(nodeId) !== -1;
    },
    completeNode: function (chapterId, nodeId) {
      var map = S.data.progress.completedNodes;
      if (!map[chapterId]) map[chapterId] = [];
      if (map[chapterId].indexOf(nodeId) === -1) map[chapterId].push(nodeId);
      S.save();
    },
    findSecret: function (id) {
      if (S.data.progress.secretsFound.indexOf(id) !== -1) return false;
      S.data.progress.secretsFound.push(id);
      S.save();
      return true;
    },
    hasSecret: function (id) { return S.data.progress.secretsFound.indexOf(id) !== -1; },

    /* ----------------------------------------------------------- mastery -- */
    /**
     * Record one interaction with a specific piece of content.
     * bucket: 'letters' | 'sounds' | 'words' | 'sight'
     */
    recordItem: function (bucket, key, wasCorrect, usedHint) {
      if (!key) return;
      key = String(key).toLowerCase();
      var b = S.data.mastery[bucket] || (S.data.mastery[bucket] = {});
      var rec = b[key] || (b[key] = { seen: 0, ok: 0, streak: 0, mastered: false, last: 0 });
      rec.seen += 1;
      rec.last = Date.now();
      if (wasCorrect) {
        rec.ok += 1;
        // A hinted answer counts as practice, but not toward mastery streaks.
        rec.streak = usedHint ? rec.streak : rec.streak + 1;
        // Two clean, unaided reads with a solid overall record: she owns it.
        if (rec.streak >= 2 && rec.ok / rec.seen >= 0.6) rec.mastered = true;
      } else {
        rec.streak = 0;
        rec.mastered = false;
      }
    },
    masteredList: function (bucket) {
      var b = S.data.mastery[bucket] || {};
      return Object.keys(b).filter(function (k) { return b[k].mastered; }).sort();
    },
    learningList: function (bucket) {
      var b = S.data.mastery[bucket] || {};
      return Object.keys(b).filter(function (k) { return !b[k].mastered && b[k].seen > 0; }).sort();
    },

    /* -------------------------------------------------------------- log --- */
    logActivity: function (entry) {
      S.data.activityLog.unshift(Object.assign({ t: Date.now() }, entry));
      if (S.data.activityLog.length > 60) S.data.activityLog.length = 60;
      S.save();
    },

    /* --------------------------------------------------------- settings --- */
    setSetting: function (k, v) {
      S.data.settings[k] = v;
      S.save();
      LTR.emit('settings-changed', S.data.settings);
    }
  };

  LTR.on('flush-save', function () { S.flush(); });

})(window.LTR);
