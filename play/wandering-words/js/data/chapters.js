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

  /* ========================================================== CHAPTER 2 === */

  var soundValley = {
    id: 2,
    name: 'Sound Valley',
    tagline: 'Where letters learn to sing together',
    emoji: '🏞️',
    env: 'valley',
    requiredPower: 3,
    skills: ['letterSounds', 'phonics'],
    mapPos: { x: 40, y: 46 },
    rewardBanner: 'Sound Detective',

    nodes: [
      {
        id: 'c2-arrive', type: 'story', env: 'valley', title: 'Down into the valley',
        cast: ['pip', 'poppy'],
        beats: [
          { who: 'pip', text: 'Through the gate! Look at it! A whole valley!' },
          { who: 'poppy', text: 'Shh. Listen. Can you hear it humming?' },
          { who: 'poppy', text: 'The stones down here remember sounds. Mmm. Sss. Tuh.' },
          { who: 'pip', text: 'They sound like they are trying to say something.', mood: 'silly' },
          { who: 'poppy', text: 'They are. When sounds hold hands they make a WORD.' }
        ],
        rewards: [place('sound-valley', '🏞️', 'Sound Valley')]
      },

      {
        id: 'c2-stones', type: 'activity', env: 'river', title: 'Listening stones',
        game: 'soundStones', skill: 'letterSounds', rounds: 4,
        intro: { who: 'poppy', text: 'Listen to the sound. Then tap the picture that starts with it!' },
        outro: { who: 'poppy', text: 'Your ears are getting very good. Nearly bunny good.' },
        rewards: [stars(3), sticker('st-ears', '👂', 'Good Ears')]
      },

      {
        id: 'c2-tock', type: 'story', env: 'valley', title: 'Tock the turtle',
        cast: ['tock', 'pip'],
        beats: [
          { who: 'tock', text: 'Hello. I am. Tock.' },
          { who: 'pip', text: 'He talks slowly. Very slowly. It is quite relaxing.', mood: 'silly' },
          { who: 'tock', text: 'Slow. Is. Useful. Watch.' },
          { who: 'tock', text: 'Cuh... aah... tuh. Now faster. C-a-t. CAT!' },
          { who: 'tock', text: 'That. Is. Reading. Try it with me.' }
        ],
        rewards: [friend('tock'), animal('tock', '🐢', 'Tock', 'Turtle. Never hurries. Always arrives.')]
      },

      {
        id: 'c2-spell', type: 'activity', env: 'valley', title: 'Sound them out',
        game: 'magicSpell', skill: 'phonics', rounds: 3,
        config: { maxDifficulty: 2 },
        intro: { who: 'tock', text: 'Tap. The letters. In order. Slowly is fine.' },
        outro: { who: 'tock', text: 'You. Built. Words. I am. Very. Pleased.' },
        rewards: [stars(3), gems(1), sticker('st-blend', '🔗', 'Sound Blender')]
      },

      {
        id: 'c2-hidden', type: 'discover', env: 'valley', title: 'Something in the grass',
        find: { kind: 'letter', prompt: 'Something is hiding! Find the leaf with the letter', decoys: 5 },
        intro: { who: 'pip', text: 'The grass just moved. It definitely moved. I am definitely brave.' },
        outro: { who: 'pip', text: 'A butterfly again! They must live down here.' },
        rewards: [stars(2), gems(1)]
      },

      {
        id: 'c2-rhyme-intro', type: 'story', env: 'glade', title: 'The rhyming flowers',
        cast: ['poppy', 'bramble'],
        beats: [
          { who: 'bramble', text: 'Oh! Hello again. I followed you. I think I am lost.' },
          { who: 'poppy', text: 'Look at these flowers. They only open for rhymes!' },
          { who: 'poppy', text: 'Cat. Hat. Hear it? The END of the word is the same.' },
          { who: 'bramble', text: 'Bramble... sample... shamble... oh, this is fun.' },
          { who: 'poppy', text: 'Find the rhymes and the whole meadow will bloom!' }
        ]
      },

      {
        id: 'c2-rhymes', type: 'activity', env: 'glade', title: 'Rhyme Time',
        game: 'rhymeTime', skill: 'phonics', rounds: 4,
        intro: { who: 'poppy', text: 'Which one rhymes? Listen to the end of the word!' },
        outro: { who: 'poppy', text: 'Look at them all! The meadow is awake!' },
        rewards: [stars(4), sticker('st-rhyme', '🌼', 'Rhyme Finder')]
      },

      {
        id: 'c2-echo', type: 'story', env: 'cave', title: 'The Echo Cave',
        cast: ['luma', 'pip'],
        beats: [
          { who: 'luma', text: 'Hoo. You found the Echo Cave.' },
          { who: 'luma', text: 'Every sound you have learned is sleeping in here.' },
          { who: 'pip', text: 'It is quite dark. I am fine. I am extremely fine.', mood: 'silly' },
          { who: 'luma', text: 'Then wake them, little one. Read, and the cave will light up.' }
        ]
      },

      {
        id: 'c2-cave', type: 'gauntlet', env: 'cave', title: 'Waking the Echo Cave',
        steps: [
          { game: 'soundStones',  skill: 'letterSounds', rounds: 1 },
          { game: 'rhymeTime',    skill: 'phonics',      rounds: 1 },
          { game: 'magicSpell',   skill: 'phonics',      rounds: 1, config: { maxDifficulty: 2 } },
          { game: 'treasureCave', skill: 'wordReading',  rounds: 1, config: { maxDifficulty: 2 } }
        ],
        intro: { who: 'luma', text: 'Four sounds sleep here. Read them all and the cave will shine.' },
        outro: { who: 'luma', text: 'Look up. Every light in the roof is a word you woke.' },
        rewards: [stars(5), gems(3), treasure('t-echo', '🔔', 'Echo Bell', 'Rings once for every word you read.')]
      },

      {
        id: 'c2-done', type: 'story', env: 'valley', title: 'On to the village',
        cast: ['tock', 'poppy', 'pip'],
        beats: [
          { who: 'tock', text: 'You. Can. Blend. Sounds. That is. Most. Of. Reading.' },
          { who: 'poppy', text: 'Some words will not blend though. They are silly words.' },
          { who: 'pip', text: 'Silly words! My favourite kind!', mood: 'silly' },
          { who: 'poppy', text: 'They live in Word Village. You just have to KNOW them.' },
          { who: 'tock', text: 'I will. Meet you. There. Eventually.' }
        ],
        rewards: [sticker('st-valley', '🏞️', 'Valley Walker')]
      }
    ],

    completion: {
      title: 'Sound Valley is singing!',
      text: 'Every stone in the valley is humming its sound again.',
      rewards: [stars(10), gems(5), sticker('st-ch2', '🏞️', 'Sound Hero')],
      unlocks: 3
    }
  };

  /* ========================================================== CHAPTER 3 === */

  var wordVillage = {
    id: 3,
    name: 'Word Village',
    tagline: 'Little words that hold everything together',
    emoji: '🏘️',
    env: 'gate',
    requiredPower: 6,
    skills: ['sightWords', 'wordReading'],
    mapPos: { x: 60, y: 68 },
    rewardBanner: 'Word Wizard',

    nodes: [
      {
        id: 'c3-arrive', type: 'story', env: 'gate', title: 'The village of small words',
        cast: ['pip', 'luma'],
        beats: [
          { who: 'pip', text: 'A village! With little houses! And... no signs?' },
          { who: 'luma', text: 'The signs lost their words when the Great Book emptied.' },
          { who: 'luma', text: 'These are the smallest words of all. The, and, my, you.' },
          { who: 'luma', text: 'You cannot sound them out. You simply learn their shape.' },
          { who: 'luma', text: 'Like faces. You know a face without spelling it.' }
        ],
        rewards: [place('word-village', '🏘️', 'Word Village')]
      },

      {
        id: 'c3-signs', type: 'activity', env: 'gate', title: 'Fixing the signposts',
        game: 'sightSigns', skill: 'sightWords', rounds: 4,
        config: { maxDifficulty: 1 },
        intro: { who: 'luma', text: 'I will say a word. Tap the sign that says it.' },
        outro: { who: 'luma', text: 'The village knows its own name again. Thank you.' },
        rewards: [stars(3), sticker('st-sign', '🪧', 'Sign Reader')]
      },

      {
        id: 'c3-bridge-intro', type: 'story', env: 'river', title: 'The broken bridge',
        cast: ['bramble', 'pip'],
        beats: [
          { who: 'bramble', text: 'Oh dear. Oh dear oh dear. The bridge has a hole in it.' },
          { who: 'pip', text: 'A plank fell out. A plank with a WORD on it.' },
          { who: 'bramble', text: 'Bridges are made of words here. Did nobody tell you?' },
          { who: 'bramble', text: 'Read the right word and the plank comes home.' }
        ]
      },

      {
        id: 'c3-bridge', type: 'activity', env: 'river', title: 'Word Bridge',
        game: 'wordBridge', skill: 'wordReading', rounds: 4,
        config: { maxDifficulty: 2 },
        intro: { who: 'bramble', text: 'Look at the picture. Which word says it?' },
        outro: { who: 'bramble', text: 'The bridge is whole! I shall cross it very carefully.' },
        rewards: [stars(3), gems(1), sticker('st-bridge', '🌉', 'Bridge Builder')]
      },

      {
        id: 'c3-hidden', type: 'discover', env: 'gate', title: 'Behind the bakery',
        find: { kind: 'letter', prompt: 'Something is glowing! Find the leaf with the letter', decoys: 5 },
        intro: { who: 'pip', text: 'Something behind the bakery is glowing. It might be a bun.' },
        outro: { who: 'pip', text: 'Not a bun. Still good though!' },
        rewards: [stars(2), gems(1)],
        secret: 'bakery'
      },

      {
        id: 'c3-chests', type: 'activity', env: 'cave', title: 'The village cellar',
        game: 'treasureCave', skill: 'wordReading', rounds: 3,
        config: { maxDifficulty: 2 },
        intro: { who: 'wanderer', text: 'The cellar keeps what the village forgot. Read the clue. Choose the chest.' },
        outro: { who: 'wanderer', text: 'You read every one. The village owes you a cake.' },
        rewards: [gems(2), treasure('t-bell', '🔔', 'Village Bell', 'Rings when somebody reads out loud.')]
      },

      {
        id: 'c3-gate-intro', type: 'story', env: 'gate', title: 'The word gate',
        cast: ['grumblewink', 'pip'],
        beats: [
          { who: 'grumblewink', text: 'You again! I mean... hello. I was being friendly.', mood: 'happy' },
          { who: 'grumblewink', text: 'I built a gate. Out of words. To practise.', mood: 'happy' },
          { who: 'pip', text: 'He is showing off. Let him. He is trying so hard.', mood: 'silly' },
          { who: 'grumblewink', text: 'Open it and I will carry your bags all the way to the sea.', mood: 'happy' }
        ]
      },

      {
        id: 'c3-gate', type: 'gauntlet', env: 'gate', title: "Grumblewink's word gate",
        steps: [
          { game: 'sightSigns',   skill: 'sightWords',  rounds: 1, config: { maxDifficulty: 2 } },
          { game: 'wordBridge',   skill: 'wordReading', rounds: 1, config: { maxDifficulty: 2 } },
          { game: 'treasureCave', skill: 'wordReading', rounds: 1, config: { maxDifficulty: 2 } },
          { game: 'magicSpell',   skill: 'phonics',     rounds: 1, config: { maxDifficulty: 2 } },
          { game: 'sightSigns',   skill: 'sightWords',  rounds: 1, config: { maxDifficulty: 2 } }
        ],
        intro: { who: 'grumblewink', text: 'Five words. I chose the hard ones. Sorry. Good luck!' },
        outro: { who: 'grumblewink', text: 'It opened. It really opened. I am going to cry a bit.' },
        rewards: [stars(5), gems(3), treasure('t-quill', '🪶', 'Grey Quill', 'Grumblewink made it himself.')]
      },

      {
        id: 'c3-done', type: 'story', env: 'gate', title: 'To the sea',
        cast: ['luma', 'pip', 'grumblewink'],
        beats: [
          { who: 'luma', text: 'You know the small words now. They are the joints of every sentence.' },
          { who: 'pip', text: 'What is a sentence?' },
          { who: 'luma', text: 'Words holding hands, walking in a line, saying something true.' },
          { who: 'grumblewink', text: 'Like: I. Am. Not. Grumpy.', mood: 'happy' },
          { who: 'luma', text: 'Exactly like that. Come. The Sentence Sea is waiting.' }
        ],
        rewards: [sticker('st-village', '🏘️', 'Village Friend')]
      }
    ],

    completion: {
      title: 'Word Village is awake!',
      text: 'Every sign, every door and every shop knows its own word again.',
      rewards: [stars(10), gems(5), sticker('st-ch3', '🏘️', 'Village Hero')],
      unlocks: 4
    }
  };

  /* ========================================================== CHAPTER 4 === */

  var sentenceSea = {
    id: 4,
    name: 'Sentence Sea',
    tagline: 'Where words hold hands and sail',
    emoji: '⛵',
    env: 'river',
    requiredPower: 9,
    skills: ['sentenceReading', 'wordReading'],
    mapPos: { x: 78, y: 42 },
    rewardBanner: 'Sentence Sailor',

    nodes: [
      {
        id: 'c4-arrive', type: 'story', env: 'river', title: 'The sea of sentences',
        cast: ['tock', 'pip'],
        beats: [
          { who: 'tock', text: 'I said. I would. Meet you. Here.' },
          { who: 'pip', text: 'He beat us here. HOW did he beat us here?', mood: 'silly' },
          { who: 'tock', text: 'Slow. But. Early.' },
          { who: 'tock', text: 'Out there. Sentences. Float. Each one. Says. A whole thing.' },
          { who: 'tock', text: 'Climb aboard. We shall. Read. Them.' }
        ],
        rewards: [place('sentence-sea', '⛵', 'Sentence Sea')]
      },

      {
        id: 'c4-match', type: 'activity', env: 'river', title: 'Reading the waves',
        game: 'sentenceMatch', skill: 'sentenceReading', rounds: 3,
        config: { maxDifficulty: 1 },
        intro: { who: 'tock', text: 'Read the sentence. Then tap the picture it talks about.' },
        outro: { who: 'tock', text: 'You read. Whole. Sentences. Remarkable.' },
        rewards: [stars(3), sticker('st-wave', '🌊', 'Wave Reader')]
      },

      {
        id: 'c4-build-intro', type: 'story', env: 'river', title: 'The scattered words',
        cast: ['poppy', 'tock'],
        beats: [
          { who: 'poppy', text: 'Oh no. A wave came and the words fell out of the sentence!' },
          { who: 'tock', text: 'They are. In the wrong. Order. Now.' },
          { who: 'poppy', text: 'Tap them one at a time and put them back in a line!' },
          { who: 'tock', text: 'The first word. Is always. The one. That starts. Big.' }
        ]
      },

      {
        id: 'c4-build', type: 'activity', env: 'river', title: 'Sentence Boat',
        game: 'sentenceBuild', skill: 'sentenceReading', rounds: 3,
        config: { maxDifficulty: 1, maxWords: 5 },
        intro: { who: 'poppy', text: 'Tap the words in order. The boat sails when the sentence is right!' },
        outro: { who: 'poppy', text: 'We are sailing! You built the wind!' },
        rewards: [stars(4), gems(1), sticker('st-boat', '⛵', 'Sentence Sailor')]
      },

      {
        id: 'c4-hidden', type: 'discover', env: 'river', title: 'Something on the sandbank',
        find: { kind: 'letter', prompt: 'Something is shining on the sand! Find the letter', decoys: 5 },
        intro: { who: 'pip', text: 'There! On the sandbank! A shiny thing! I claim it!' },
        outro: { who: 'pip', text: 'Fine. WE claim it. Together. That is nicer anyway.' },
        rewards: [stars(2), gems(1)]
      },

      {
        id: 'c4-longer', type: 'activity', env: 'river', title: 'Longer sentences',
        game: 'sentenceBuild', skill: 'sentenceReading', rounds: 3,
        config: { maxDifficulty: 2, maxWords: 7 },
        intro: { who: 'tock', text: 'These ones. Are longer. Take. Your. Time.' },
        outro: { who: 'tock', text: 'Longer sentences. Same. Reader. Well done.' },
        rewards: [stars(4), gems(1)]
      },

      {
        id: 'c4-storm', type: 'story', env: 'night', title: 'The word storm',
        cast: ['luma', 'tock', 'pip'],
        beats: [
          { who: 'luma', text: 'Hoo. Look at the horizon. The last of the wandering words.' },
          { who: 'pip', text: 'They are all swirling around in a big spinny thing!', mood: 'silly' },
          { who: 'luma', text: 'They cannot find their way home alone. They need a reader.' },
          { who: 'tock', text: 'We have. One. Of those.' },
          { who: 'luma', text: 'Read through the storm, and they will follow you.' }
        ]
      },

      {
        id: 'c4-storm-run', type: 'gauntlet', env: 'night', title: 'Through the word storm',
        steps: [
          { game: 'sentenceMatch', skill: 'sentenceReading', rounds: 1, config: { maxDifficulty: 2 } },
          { game: 'sightSigns',    skill: 'sightWords',      rounds: 1, config: { maxDifficulty: 2 } },
          { game: 'sentenceBuild', skill: 'sentenceReading', rounds: 1, config: { maxDifficulty: 2, maxWords: 6 } },
          { game: 'wordBridge',    skill: 'wordReading',     rounds: 1, config: { maxDifficulty: 3 } },
          { game: 'sentenceMatch', skill: 'sentenceReading', rounds: 1, config: { maxDifficulty: 2 } }
        ],
        intro: { who: 'luma', text: 'Five readings. Hold on to Tock. Here we go.' },
        outro: { who: 'luma', text: 'The storm is quiet. Every word is flying behind you in a line.' },
        rewards: [stars(6), gems(4), treasure('t-compass', '🧭', 'Word Compass', 'Always points at the next word.')]
      },

      {
        id: 'c4-done', type: 'story', env: 'river', title: 'The mountain ahead',
        cast: ['tock', 'luma'],
        beats: [
          { who: 'tock', text: 'Land. Ahead.' },
          { who: 'luma', text: 'Story Mountain. The last climb.' },
          { who: 'luma', text: 'At the top sits the Great Book of Everything, with nothing in it.' },
          { who: 'luma', text: 'It has been waiting a very long time for a reader.' },
          { who: 'tock', text: 'It will. Not. Wait. Much. Longer.' }
        ],
        rewards: [sticker('st-sea', '🌊', 'Sea Crosser')]
      }
    ],

    completion: {
      title: 'The Sentence Sea is calm!',
      text: 'Every sentence sails in a straight line again, saying exactly what it means.',
      rewards: [stars(12), gems(6), sticker('st-ch4', '⛵', 'Sea Hero')],
      unlocks: 5
    }
  };

  /* ========================================================== CHAPTER 5 === */

  var storyMountain = {
    id: 5,
    name: 'Story Mountain',
    tagline: 'The top, where whole stories live',
    emoji: '⛰️',
    env: 'night',
    requiredPower: 12,
    skills: ['comprehension', 'sentenceReading'],
    mapPos: { x: 84, y: 74 },
    rewardBanner: 'Story Reader',

    nodes: [
      {
        id: 'c5-arrive', type: 'story', env: 'night', title: 'The climb begins',
        cast: ['wanderer', 'pip'],
        beats: [
          { who: 'wanderer', text: 'You came. I left you a map once. You kept it.' },
          { who: 'pip', text: 'It was YOU! You leave maps everywhere! Who ARE you?' },
          { who: 'wanderer', text: 'Someone who could not read, once. Someone who learned.' },
          { who: 'wanderer', text: 'Up there, sentences join up and become a STORY.' },
          { who: 'wanderer', text: 'A story is a thing you can understand. Come and see.' }
        ],
        rewards: [place('story-mountain', '⛰️', 'Story Mountain')]
      },

      {
        id: 'c5-detective', type: 'activity', env: 'night', title: 'Story Detective',
        game: 'storyDetective', skill: 'comprehension', rounds: 3,
        config: { maxDifficulty: 2 },
        intro: { who: 'wanderer', text: 'Read the little story. Then answer the question with a picture.' },
        outro: { who: 'wanderer', text: 'You did not just read it. You understood it. That is the whole trick.' },
        rewards: [stars(4), sticker('st-detective', '🔎', 'Story Detective')]
      },

      {
        id: 'c5-ledge', type: 'story', env: 'cave', title: 'The ledge halfway up',
        cast: ['bramble', 'poppy', 'pip'],
        beats: [
          { who: 'bramble', text: 'I climbed up here to help. Then I got tired. Then I sat down.' },
          { who: 'poppy', text: 'He has been sitting here for two days.' },
          { who: 'bramble', text: 'It is a very good rock.' },
          { who: 'pip', text: 'Come on Bramble. She is nearly at the top!', mood: 'silly' },
          { who: 'bramble', text: 'Oh — she is? Then I am definitely coming.' }
        ]
      },

      {
        id: 'c5-sentences', type: 'activity', env: 'cave', title: 'The carved sentences',
        game: 'sentenceBuild', skill: 'sentenceReading', rounds: 3,
        config: { maxDifficulty: 3, maxWords: 7 },
        intro: { who: 'poppy', text: 'Someone carved sentences into the rock. Put the words back in order!' },
        outro: { who: 'poppy', text: 'Every one of them is a step. Look how high we are!' },
        rewards: [stars(4), gems(2)]
      },

      {
        id: 'c5-hidden', type: 'discover', env: 'cave', title: 'A crack in the rock',
        find: { kind: 'letter', prompt: 'Something is glinting in the crack! Find the letter', decoys: 5 },
        intro: { who: 'pip', text: 'There is a crack here. And something INSIDE the crack.' },
        outro: { who: 'pip', text: 'It followed us all the way up! Hello again, butterfly.' },
        rewards: [stars(3), gems(2)],
        secret: 'summit-crack'
      },

      {
        id: 'c5-more-stories', type: 'activity', env: 'night', title: 'Near the summit',
        game: 'storyDetective', skill: 'comprehension', rounds: 3,
        config: { maxDifficulty: 3 },
        intro: { who: 'luma', text: 'The stories up here are longer. Read carefully — you can hear them again.' },
        outro: { who: 'luma', text: 'Hoo. You are reading like someone who has always been able to.' },
        rewards: [stars(5), gems(2), sticker('st-summit', '⛰️', 'Summit Climber')]
      },

      {
        id: 'c5-book-intro', type: 'story', env: 'night', title: 'The Great Book',
        cast: ['luma', 'grumblewink', 'pip'],
        beats: [
          { who: 'luma', text: 'There it is. The Great Book of Everything. Empty.' },
          { who: 'grumblewink', text: 'I am sorry. I did that. I took the words.', mood: 'grumpy' },
          { who: 'grumblewink', text: 'I only wanted someone to read to me.', mood: 'grumpy' },
          { who: 'pip', text: 'Then let us fill it back up. All of us. Together.' },
          { who: 'luma', text: 'Read, little one. Every word you read flies home.' }
        ]
      },

      {
        id: 'c5-finale', type: 'gauntlet', env: 'night', title: 'Filling the Great Book',
        steps: [
          { game: 'letterFireflies', skill: 'letterRecognition', rounds: 1 },
          { game: 'soundStones',     skill: 'letterSounds',      rounds: 1 },
          { game: 'magicSpell',      skill: 'phonics',           rounds: 1, config: { maxDifficulty: 2 } },
          { game: 'sightSigns',      skill: 'sightWords',        rounds: 1, config: { maxDifficulty: 2 } },
          { game: 'wordBridge',      skill: 'wordReading',       rounds: 1, config: { maxDifficulty: 3 } },
          { game: 'sentenceBuild',   skill: 'sentenceReading',   rounds: 1, config: { maxDifficulty: 2, maxWords: 6 } },
          { game: 'storyDetective',  skill: 'comprehension',     rounds: 1, config: { maxDifficulty: 3 } }
        ],
        intro: { who: 'luma', text: 'Seven pages. One for everything you learned. Take your time.' },
        outro: { who: 'luma', text: 'Look at it. Look at the light coming out of it.' },
        rewards: [stars(10), gems(6), treasure('t-book', '📖', 'The Great Book', 'Full again, because of you.')]
      },

      {
        id: 'c5-ending', type: 'story', env: 'glade', title: 'A story for Grumblewink',
        cast: ['grumblewink', 'pip', 'luma'],
        beats: [
          { who: 'grumblewink', text: 'It is full. The whole world has its words back.', mood: 'happy' },
          { who: 'luma', text: 'And every one of them came home because somebody read it.' },
          { who: 'pip', text: 'I said she could do it. I said that on the very first day.', mood: 'silly' },
          { who: 'grumblewink', text: 'You did promise me something, though.', mood: 'happy' },
          { who: 'grumblewink', text: 'A story. One day. Is today a good day?', mood: 'happy' },
          { who: 'luma', text: 'Sit down, everyone. Our reader has a book, and she can read it.' }
        ],
        rewards: [
          sticker('st-ending', '📖', 'Word Keeper'),
          treasure('t-crown', '👑', 'Reader\'s Crown', 'For the one who brought the words home.')
        ]
      }
    ],

    completion: {
      title: 'The Great Book is full!',
      text: 'Every word in the kingdom is home, and every one of them came back because you read it.',
      rewards: [stars(20), gems(10), sticker('st-ch5', '👑', 'Word Keeper')],
      unlocks: null
    }
  };

  /* ========================================================== registry === */

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
