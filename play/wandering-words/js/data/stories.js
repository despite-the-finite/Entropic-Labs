/* =============================================================================
   data/stories.js — tiny stories for comprehension work (Story Detective).

   Each story is 2–4 very short sentences plus one question with picture
   answers, so a child can answer without having to read the options.
   Used from Chapter 4 onward; the engine already supports them.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var D = LTR.data = LTR.data || {};

  D.stories = [
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
    }
  ];

  D.storiesFor = function (maxDifficulty) {
    return D.stories.filter(function (s) { return s.difficulty <= (maxDifficulty || 5); });
  };

  /** Simple sentences used by Sentence Sea (Chapter 4). */
  D.sentences = [
    { text: 'I see a cat.',        emoji: '🐱', difficulty: 1 },
    { text: 'The dog can run.',    emoji: '🐶', difficulty: 1 },
    { text: 'I like my hat.',      emoji: '🎩', difficulty: 1 },
    { text: 'Look at the big sun.',emoji: '☀️', difficulty: 2 },
    { text: 'The pig is in the mud.', emoji: '🐷', difficulty: 2 },
    { text: 'We see a big fish.',  emoji: '🐟', difficulty: 2 },
    { text: 'The bug is on a leaf.', emoji: '🐛', difficulty: 2 },
    { text: 'My cup is red.',      emoji: '🥤', difficulty: 1 }
  ];

})(window.LTR);
