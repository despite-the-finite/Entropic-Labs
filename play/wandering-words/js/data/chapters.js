/* =============================================================================
   data/chapters.js — the adventure itself, as pure data.

   A chapter is a list of nodes walked in order. Node types:

     story     a short scene: characters + speech beats, tap to advance
     activity  one reading minigame, N rounds
     gauntlet  a sequence of different minigames (used for chapter finales)
     discover  a hidden thing to find in the environment
     preview   a "coming soon" postcard for a region not yet built

   Adding Chapter 6 means appending an object here. The engine reads this file
   and never needs to change.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var D = LTR.data = LTR.data || {};

  /* ------------------------------------------------------------ helpers --- */
  function stars(n)   { return { kind: 'stars', n: n }; }
  function gems(n)    { return { kind: 'gems', n: n }; }
  function sticker(id, glyph, name) { return { kind: 'stickers', item: { id: id, glyph: glyph, name: name } }; }
  function animal(id, glyph, name, note) { return { kind: 'animals', item: { id: id, glyph: glyph, name: name, note: note } }; }
  function friend(id) {
    var c = D.characters[id];
    return { kind: 'characters', item: { id: id, glyph: c.glyph, name: c.name, note: c.blurb, art: c.art } };
  }
  function treasure(id, glyph, name, note) { return { kind: 'treasures', item: { id: id, glyph: glyph, name: name, note: note } }; }
  function place(id, glyph, name) { return { kind: 'places', item: { id: id, glyph: glyph, name: name } }; }

  /* ========================================================== CHAPTER 1 === */

  var letterForest = {
    id: 1,
    name: 'The Letter Forest',
    tagline: 'Where the word-lights went to hide',
    emoji: '🌳',
    env: 'forest',
    requiredPower: 0,
    skills: ['letterRecognition', 'letterSounds'],
    mapPos: { x: 20, y: 70 },
    rewardBanner: 'Letter Explorer',

    nodes: [

      /* ---- 1. arrival ---------------------------------------------------- */
      {
        id: 'c1-arrive', type: 'story', env: 'forest', title: 'Into the forest',
        cast: ['player', 'pip'],
        beats: [
          { who: 'pip', text: 'Oh no. Oh no. Oh NO.', mood: 'silly' },
          { who: 'pip', text: 'Hello! I am Pip. I am a fox. I am extremely brave.' },
          { who: 'pip', text: 'Last night, every word flew out of the Great Book and ran into the forest!' },
          { who: 'pip', text: 'Look — they turned into little lights. Nothing works without words!' },
          { who: 'pip', text: 'But YOU can read. Reading is the magic that brings words home.' }
        ],
        rewards: [place('firefly-hollow', '🌲', 'The Letter Forest')]
      },

      /* ---- 2. letter fireflies ------------------------------------------- */
      {
        id: 'c1-fireflies', type: 'activity', env: 'forest', title: 'Catch the word-lights',
        game: 'letterFireflies', skill: 'letterRecognition', rounds: 4,
        intro: { who: 'pip', text: 'Catch the firefly with the right letter. Tap it!' },
        outro: { who: 'pip', text: 'You caught them! I knew you could. I was only a tiny bit worried.' },
        rewards: [stars(3), sticker('st-firefly', '✨', 'Firefly Catcher')]
      },

      /* ---- 3. bramble ---------------------------------------------------- */
      {
        id: 'c1-bramble', type: 'story', env: 'forest', title: 'Bramble the hedgehog',
        cast: ['bramble', 'pip'],
        beats: [
          { who: 'bramble', text: 'Excuse me... have you seen my mushrooms?' },
          { who: 'bramble', text: 'Each big mushroom has a BIG letter. Each baby mushroom has a little letter.' },
          { who: 'pip', text: 'They got all mixed up when the words flew away!', mood: 'silly' },
          { who: 'bramble', text: 'Could you put each baby with its big one? Please?' }
        ]
      },
      {
        id: 'c1-mushrooms', type: 'activity', env: 'forest', title: 'Mushroom families',
        game: 'mushroomMatch', skill: 'letterRecognition', rounds: 4,
        intro: { who: 'bramble', text: 'Tap the little letter that matches the big one!' },
        outro: { who: 'bramble', text: 'Oh, thank you! Every mushroom is with its family again.' },
        rewards: [stars(3), animal('bramble', '🦔', 'Bramble', 'Hedgehog. Loses everything. Finds it later.'), friend('bramble')]
      },

      /* ---- 4. surprise: the butterfly and the secret glade ---------------- */
      {
        id: 'c1-butterfly', type: 'discover', env: 'forest', title: 'Something is glittering',
        find: { kind: 'letter', prompt: 'A butterfly is hiding! Find the leaf with the letter', decoys: 5 },
        intro: { who: 'pip', text: 'Wait... did that leaf just SPARKLE?' },
        outro: { who: 'pip', text: 'A butterfly! It wants us to follow it. Come on!' },
        rewards: [stars(2)],
        secret: 'glade'
      },
      {
        id: 'c1-glade', type: 'activity', env: 'glade', title: 'The Secret Glade',
        game: 'treasureCave', skill: 'letterSounds', rounds: 2,
        intro: { who: 'wanderer', text: 'You found the hidden glade. Few do. Read the clue, open the right chest.' },
        outro: { who: 'wanderer', text: 'Keep it. You will need light where you are going.' },
        rewards: [gems(2), treasure('t-lantern', '🏮', 'Tiny Lantern', 'A gift from the Lantern Wanderer.'), friend('wanderer')]
      },

      /* ---- 5. poppy and the sound river ----------------------------------- */
      {
        id: 'c1-poppy', type: 'story', env: 'river', title: 'Poppy at the river',
        cast: ['poppy', 'player'],
        beats: [
          { who: 'poppy', text: 'Hop hop hop! Oh! Hello!' },
          { who: 'poppy', text: 'I need to cross, but the stones only hold you if you know the SOUND.' },
          { who: 'poppy', text: 'Listen: mmmm... moon. M makes mmmm!' },
          { who: 'poppy', text: 'Tap the stone with the picture that starts with the sound. Then we hop!' }
        ]
      },
      {
        id: 'c1-stones', type: 'activity', env: 'river', title: 'Sound River',
        game: 'soundStones', skill: 'letterSounds', rounds: 4,
        intro: { who: 'poppy', text: 'Which one starts with that sound? Tap the stone!' },
        outro: { who: 'poppy', text: 'We did it! Your ears are as good as a bunny\'s. Nearly.' },
        rewards: [stars(3), animal('poppy', '🐰', 'Poppy', 'Bunny. Hears everything. Especially snacks.'), friend('poppy')]
      },

      /* ---- 6. Luma and spell magic ---------------------------------------- */
      {
        id: 'c1-luma', type: 'story', env: 'night', title: 'The owl with the lantern',
        cast: ['luma', 'pip'],
        beats: [
          { who: 'luma', text: 'Hoo. I am Luma. I look after the Great Book of Everything.' },
          { who: 'luma', text: 'When the words left, the world went quiet. Bridges forgot how to be bridges.' },
          { who: 'pip', text: 'That explains the bridge that turned into a puddle.', mood: 'silly' },
          { who: 'luma', text: 'A word can be built, little one. Put the letters in order and it wakes up.' },
          { who: 'luma', text: 'Try. Build the word, and watch what happens.' }
        ]
      },
      {
        id: 'c1-spell', type: 'activity', env: 'night', title: 'Build the word',
        game: 'magicSpell', skill: 'phonics', rounds: 3,
        config: { maxDifficulty: 1 },
        intro: { who: 'luma', text: 'Tap the letters in order to build the word.' },
        outro: { who: 'luma', text: 'You built real words. The forest heard them. Look how bright it is.' },
        rewards: [stars(4), gems(1), friend('luma'), sticker('st-spell', '🪄', 'Word Builder')]
      },

      /* ---- 7. Grumblewink -------------------------------------------------- */
      {
        id: 'c1-grumble', type: 'story', env: 'gate', title: 'Who took the letters?',
        cast: ['grumblewink', 'pip'],
        beats: [
          { who: 'grumblewink', text: 'Grrmph. Go away. This gate is MINE.', mood: 'grumpy' },
          { who: 'pip', text: 'It\'s the Grumblewink! He\'s the one hiding all the letters!', mood: 'silly' },
          { who: 'grumblewink', text: 'I am NOT hiding them. I am KEEPING them. There is a difference.', mood: 'grumpy' },
          { who: 'grumblewink', text: '...Nobody ever read me a story. So I took the letters instead.', mood: 'grumpy' },
          { who: 'grumblewink', text: 'Fine. FINE. Open my gate and I will give them back. If you can.', mood: 'grumpy' }
        ]
      },
      {
        id: 'c1-gate', type: 'gauntlet', env: 'gate', title: 'The Grumble Gate',
        steps: [
          { game: 'letterFireflies', skill: 'letterRecognition', rounds: 1 },
          { game: 'soundStones',     skill: 'letterSounds',      rounds: 1 },
          { game: 'mushroomMatch',   skill: 'letterRecognition', rounds: 1 },
          { game: 'magicSpell',      skill: 'phonics',           rounds: 1, config: { maxDifficulty: 1 } },
          { game: 'wordBridge',      skill: 'wordReading',       rounds: 1, config: { maxDifficulty: 1 } }
        ],
        intro: { who: 'grumblewink', text: 'Five locks. One for each thing you learned. Hmph.' },
        outro: { who: 'grumblewink', text: '...Oh. The gate is open. You really can read.' },
        rewards: [stars(5), gems(3), treasure('t-key', '🗝️', 'Forest Key', 'Opens the gate at the edge of the forest.')]
      },
      {
        id: 'c1-friend', type: 'story', env: 'gate', title: 'A new friend',
        cast: ['grumblewink', 'player', 'pip'],
        beats: [
          { who: 'grumblewink', text: 'Here. Take your letters back. All of them. I kept them very tidy.', mood: 'happy' },
          { who: 'grumblewink', text: 'Could you... would you... read me something? One day?', mood: 'happy' },
          { who: 'pip', text: 'She read a whole GATE. She can definitely read you a story.', mood: 'silly' },
          { who: 'grumblewink', text: 'Then I shall come along. To carry things. And to listen.', mood: 'happy' },
          { who: 'luma', text: 'Beyond this gate lies Sound Valley, where letters learn to sing together.' }
        ],
        rewards: [friend('grumblewink'), animal('grumblewink', '☁️', 'Grumblewink', 'Not grumpy. Just never been read to.')]
      }
    ],

    completion: {
      title: 'The Letter Forest is awake!',
      text: 'Every letter is back where it belongs. The trees are whispering their own names again.',
      rewards: [stars(10), gems(5), sticker('st-ch1', '🌳', 'Forest Hero')],
      unlocks: 2
    }
  };

  /* ================================================= CHAPTERS 2–5 (soon) === */

  function previewChapter(cfg) {
    return {
      id: cfg.id, name: cfg.name, tagline: cfg.tagline, emoji: cfg.emoji,
      env: cfg.env, requiredPower: cfg.requiredPower, skills: cfg.skills,
      mapPos: cfg.mapPos, preview: cfg.preview, nodes: [], rewardBanner: cfg.rewardBanner
    };
  }

  var soundValley = previewChapter({
    id: 2, name: 'Sound Valley', tagline: 'Where letters learn to sing together',
    emoji: '🏞️', env: 'valley', requiredPower: 3,
    skills: ['phonics', 'letterSounds'], mapPos: { x: 40, y: 46 },
    rewardBanner: 'Sound Detective',
    preview: {
      who: 'poppy',
      lines: [
        'Sound Valley awaits!',
        'Down in the valley the letters hum: c — a — t… CAT!',
        'Bring your ears. Bring Pip. Bring a snack for Grumblewink.'
      ]
    }
  });

  var wordVillage = previewChapter({
    id: 3, name: 'Word Village', tagline: 'Little words that hold everything together',
    emoji: '🏘️', env: 'forest', requiredPower: 6,
    skills: ['sightWords', 'wordReading'], mapPos: { x: 60, y: 68 },
    rewardBanner: 'Word Wizard',
    preview: { who: 'luma', lines: ['Word Village awaits!', 'Some words you never sound out. You simply KNOW them: the, and, my, see.'] }
  });

  var sentenceSea = previewChapter({
    id: 4, name: 'Sentence Sea', tagline: 'Where words hold hands and sail',
    emoji: '⛵', env: 'river', requiredPower: 10,
    skills: ['sentenceReading', 'wordReading'], mapPos: { x: 78, y: 42 },
    rewardBanner: 'Sentence Sailor',
    preview: { who: 'tock', lines: ['Sentence Sea awaits!', 'I will sail you across. Slowly. Very slowly.'] }
  });

  var storyMountain = previewChapter({
    id: 5, name: 'Story Mountain', tagline: 'The top, where whole stories live',
    emoji: '⛰️', env: 'night', requiredPower: 15,
    skills: ['comprehension', 'sentenceReading'], mapPos: { x: 84, y: 74 },
    rewardBanner: 'Story Reader',
    preview: { who: 'wanderer', lines: ['Story Mountain awaits!', 'At the summit is the Great Book itself. It has been waiting for a reader.'] }
  });

  D.chapters = [letterForest, soundValley, wordVillage, sentenceSea, storyMountain];

  D.chapter = function (id) {
    return D.chapters.filter(function (c) { return c.id === Number(id); })[0] || null;
  };

  D.nodeIn = function (chapterId, nodeId) {
    var c = D.chapter(chapterId);
    if (!c) return null;
    return c.nodes.filter(function (n) { return n.id === nodeId; })[0] || null;
  };

})(window.LTR);
