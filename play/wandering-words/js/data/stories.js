/* =============================================================================
   data/stories.js — sentences and tiny stories.

   Two kinds of content live here:

     SENTENCES  short, decodable sentences built from words in words.js. Used
                by Sentence Sea to build a sentence word by word, and to match
                a sentence to the picture it describes. Every sentence has its
                own picture, so a child can answer without reading the options.

     STORIES    2–4 sentences plus one question whose answers are pictures.
                Used by Story Detective from Story Mountain onward.

   Both carry a `difficulty` so the adaptive engine can meet the child where
   she is rather than handing a new reader a four-clause sentence.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var D = LTR.data = LTR.data || {};

  /* ------------------------------------------------------------ sentences -- */

  function sent(text, emoji, difficulty) {
    return {
      text: text,
      emoji: emoji,
      difficulty: difficulty,
      /* The words to assemble, punctuation stripped — the sentence-building
         game needs them as separate cards. */
      words: text.replace(/[.!?]$/, '').split(' ')
    };
  }

  D.sentences = [
    sent('I see a cat.',          '🐱', 1),
    sent('The dog can run.',      '🐶', 1),
    sent('I like my hat.',        '🎩', 1),
    sent('My cup is red.',        '🥤', 1),
    sent('The sun is big.',       '☀️', 1),
    sent('I can see a bug.',      '🐛', 1),
    sent('The pig is in the mud.','🐷', 2),
    sent('We see a big fish.',    '🐟', 2),
    sent('The bug is on a leaf.', '🍃', 2),
    sent('Look at the big moon.', '🌙', 2),
    sent('A fox sat on a log.',   '🦊', 2),
    sent('My pup can hop.',       '🐕', 2),
    sent('The hen is on the nest.','🪺', 2),
    sent('I can see a red bus.',  '🚌', 2),
    sent('The frog is on a rock.','🐸', 3),
    sent('We go up the big hill.','⛰️', 3),
    sent('The owl can see at night.','🦉', 3),
    sent('My cake is on the dish.','🍰', 3),
    sent('The duck is in the pond.','🦆', 3),
    sent('I like to look at the stars.','⭐', 3)
  ];

  D.sentencesFor = function (maxDifficulty) {
    var pool = D.sentences.filter(function (s) { return s.difficulty <= (maxDifficulty || 5); });
    return pool.length ? pool : D.sentences;
  };

  /**
   * Pictures that could stand in as wrong answers for a sentence — other
   * sentences' pictures, never the same one twice.
   */
  D.sentenceDistractors = function (target, n) {
    var pool = D.sentences.filter(function (s) { return s.emoji !== target.emoji; });
    return LTR.util.uniqueBy(LTR.util.shuffle(pool), function (s) { return s.emoji; })
      .slice(0, n);
  };

  /* -------------------------------------------------------------- stories -- */

  D.stories = [
    {
      id: 'catnap',
      difficulty: 1,
      lines: ['The cat sat on the mat.', 'The cat had a nap.'],
      question: 'What did the cat do?',
      options: [
        { emoji: '😴', label: 'had a nap', correct: true },
        { emoji: '🏃', label: 'ran away' },
        { emoji: '🍽️', label: 'ate dinner' }
      ],
      hintText: 'Look at the last sentence again.'
    },
    {
      id: 'redhat',
      difficulty: 2,
      lines: ['Mia has a red hat.', 'The wind blows.', 'The hat flies away!'],
      question: 'Where did the hat go?',
      options: [
        { emoji: '🌳', label: 'up in the tree', correct: true },
        { emoji: '🛏️', label: 'under the bed' },
        { emoji: '🍲', label: 'in the pot' }
      ],
      hintText: 'The wind blows things UP high.'
    },
    {
      id: 'wetdog',
      difficulty: 2,
      lines: ['The dog can run.', 'The dog runs to the pond.', 'Now the dog is wet!'],
      question: 'Why is the dog wet?',
      options: [
        { emoji: '💧', label: 'he went in the pond', correct: true },
        { emoji: '🍰', label: 'he ate a cake' },
        { emoji: '🛏️', label: 'he went to bed' }
      ],
      hintText: 'What is in a pond?'
    },
    {
      id: 'sunhot',
      difficulty: 2,
      lines: ['I see the big sun.', 'The sun is hot.', 'I sit in the shade.'],
      question: 'Why did I sit in the shade?',
      options: [
        { emoji: '🥵', label: 'the sun was hot', correct: true },
        { emoji: '🌧️', label: 'it was raining' },
        { emoji: '🌙', label: 'it was night' }
      ],
      hintText: 'The sun is HOT.'
    },
    {
      id: 'lostnut',
      difficulty: 3,
      lines: ['Pip hid a nut in the log.', 'A bug took the nut.', 'Pip looks and looks.'],
      question: 'Who has the nut now?',
      options: [
        { emoji: '🐛', label: 'the bug', correct: true },
        { emoji: '🦊', label: 'Pip' },
        { emoji: '🪵', label: 'the log' }
      ],
      hintText: 'Someone took it from the log.'
    },
    {
      id: 'bramblekey',
      difficulty: 2,
      lines: ['Bramble lost his key.', 'He looks in the nest.', 'The key is in his hat!'],
      question: 'Where was the key?',
      options: [
        { emoji: '🎩', label: 'in his hat', correct: true },
        { emoji: '🪺', label: 'in the nest' },
        { emoji: '🍄', label: 'under a mushroom' }
      ],
      hintText: 'Listen to the very last thing that happens.'
    },
    {
      id: 'poppyhop',
      difficulty: 2,
      lines: ['Poppy can hop very high.', 'She hops over the log.', 'She lands in the mud!'],
      question: 'What did Poppy land in?',
      options: [
        { emoji: '🟤', label: 'the mud', correct: true },
        { emoji: '🌊', label: 'the river' },
        { emoji: '🪺', label: 'a nest' }
      ],
      hintText: 'What was at the end of the hop?'
    },
    {
      id: 'tockslow',
      difficulty: 3,
      lines: ['Tock the turtle is very slow.', 'Poppy hops away fast.', 'Tock gets there at last.'],
      question: 'Who got there first?',
      options: [
        { emoji: '🐰', label: 'Poppy', correct: true },
        { emoji: '🐢', label: 'Tock' },
        { emoji: '🦊', label: 'Pip' }
      ],
      hintText: 'Who was fast, and who was slow?'
    },
    {
      id: 'grumblestory',
      difficulty: 3,
      lines: ['Grumblewink is sad.', 'Nobody read him a story.', 'So you read one to him.',
              'Now he is happy!'],
      question: 'Why is Grumblewink happy?',
      options: [
        { emoji: '📖', label: 'you read him a story', correct: true },
        { emoji: '🍰', label: 'he ate a cake' },
        { emoji: '😴', label: 'he had a nap' }
      ],
      hintText: 'What did you do for him?'
    },
    {
      id: 'lantern',
      difficulty: 3,
      lines: ['It is dark in the cave.', 'Luma lifts her lantern.', 'Now we can see the path.'],
      question: 'What helped them see?',
      options: [
        { emoji: '🏮', label: 'the lantern', correct: true },
        { emoji: '☀️', label: 'the sun' },
        { emoji: '⭐', label: 'a star' }
      ],
      hintText: 'Luma lifted something up.'
    }
  ];

  D.storiesFor = function (maxDifficulty) {
    var pool = D.stories.filter(function (s) { return s.difficulty <= (maxDifficulty || 5); });
    return pool.length ? pool : D.stories;
  };

})(window.LTR);
