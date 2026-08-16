/* Entropic Labs — Butterfly Trails archive.
   ==========================================================================
   THIS FILE IS THE WHOLE CONTENT LAYER. Nothing here knows how it is drawn.

   To add a memory: append one object to STORIES. Nothing else needs editing.
   The trail places it, the constellation links it, the map plots it if it has
   coordinates, the era rail picks up its era, the category butterflies learn
   they have somewhere to fly, and every counter in the room updates itself.

   Every field except `id` is optional. A story with nothing but an id and a
   title renders; it just renders quietly. Add what is known, leave out what
   is not, and come back later — an archive that demands complete records
   never gets written.

   ==========================================================================
   STORY FIELDS
   --------------------------------------------------------------------------
   id              'first-letter'. Slug, unique, also the URL hash
                   (butterfly.html#first-letter). Once published, don't change
                   it — other stories and outside links point at it.
   title           the chapter title.
   hook            one line, shown on the node and above the story. The
                   promise, not the summary.
   year            number. Used for ordering and for the era rail. If a story
                   spans years, use the year it turns on.
   approximateDate free text shown to the reader: 'Spring, 1971',
                   'Some time after the monsoon', 'Nobody agrees'.
   era             an ERAS id. Optional — leave it out and the story still
                   sorts by year. Eras are labels, not facts; see ERAS below.
   strand          a STRANDS id — whose line this happened on. 'amma', 'dad',
                   'together', 'me', 'brother'. Leave it out and the story
                   sits on the centre line at its year, which is right for
                   anything that belongs to the family rather than to one
                   person in it.
   location        free text: 'Bombay', 'The train to Lusaka'.
   place           a PLACES id, if this happened somewhere already listed.
                   Gives the story map coordinates without repeating them.
   coordinates     {lat, lon} — only if this story needs a point of its own
                   that isn't in PLACES. `place` is usually the better call.
   people          array of names or {name, relation} objects.
                   [{ name: 'Ba', relation: 'grandmother' }, 'Amma']
   category        a CATEGORIES id — which butterfly carries this one.
   tags            array of free-text tags. Cheap, searchable, no schema.
   story           array of paragraphs (strings). The story itself.
   images          array of {src, alt, caption, year, location}.
                   src is a path like 'img/trails/first-letter.jpg'.
                   alt is required for anything a reader must be able to
                   understand without seeing it. Photographs are shown as
                   found objects; nothing is filtered, aged or cropped.
   audio           {src, label, transcript}. If present the story shows
                   'Hear them tell it'. `transcript` is an array of
                   paragraphs and is what makes the recording accessible.
   source          who told it: 'Amma, at the kitchen table, 2026'.
                   Attribution is content, not metadata — it belongs in the
                   record.
   notes           array of {by, text} — where accounts differ, or where a
                   detail is remembered two ways. Printed as marginalia
                   rather than corrections.
   relatedStories  array of story ids. Sideways links; no causality implied.
   causedBy        array of story ids that led to this one.
   consequences    array of story ids this one led to. Reciprocal links are
                   filled in automatically, so state each edge once, whichever
                   direction reads better.
   alternatePath   an optional branching moment. See ALTERNATE PATHS below.
   disputed        true, or a string: 'Dad's version differs on the year.'
   classified      true, or a string reason: 'Amma has not cleared this one.'
                   A classified story keeps its title and its seal, and shows
                   no story text at all.
   chaosEvent      true — flags a small moment with long consequences. The
                   node keeps a slow pulse and the reader says so.
   featured        true — a story the archive wants read first.
   dateAdded       'YYYY-MM-DD'. Drives 'recently added' ordering.

   --------------------------------------------------------------------------
   ALTERNATE PATHS
   --------------------------------------------------------------------------
   Only for stories that turned on a decision. The reader is asked to guess
   which way it went; guessing wrong walks a stylised hypothetical branch,
   clearly labelled as a life that never happened, and then returns.

     alternatePath: {
       question: 'There were two trains.',
       choices: [
         {
           label: 'Take the first one',
           taken: true,                  // exactly one choice is the real one
           outcome: 'What actually followed, in one or two sentences.'
         },
         {
           label: 'Wait for the second',
           taken: false,
           outcome: 'What that life might have looked like. Written as
                     speculation, in the family’s own words — never
                     presented as history.'
         }
       ]
     }

   Nothing invents the untaken branch. If `outcome` is missing on the
   hypothetical choice, the reader shows a blank plate that says so.

   ==========================================================================
   THE ARCHIVE IS CURRENTLY EMPTY. That is a state, not a bug — the room is
   built for it, and it is meant to look like a beginning rather than a hole.
   The moment the first object lands in STORIES, the empty state stands down
   on its own.
   ========================================================================== */

(function (global) {
  'use strict';

  /* ------------------------------------------------------------------------
     CATEGORIES — the butterflies.
     id     slug, also the follow route (#follow-love)
     name   shown on the chip and in the record
     glyph  one character drawn beside the name. Kept to a mark, not an emoji
            zoo — the room is dark and warm, not a sticker sheet.
     tone   hex. Warm-dominant, drawn from the studio palette.
     line   what this butterfly is for. Shown when it has nowhere to fly.
     ------------------------------------------------------------------------ */
  var CATEGORIES = [
    {
      id: 'love',
      name: 'Love',
      glyph: '❤',
      tone: '#FF6B9A',
      line: 'The ones that begin with someone noticing someone.'
    },
    {
      id: 'adventure',
      name: 'Adventure',
      glyph: '⌖',
      tone: '#2FE0C7',
      line: 'Journeys, crossings, and the day the map ran out.'
    },
    {
      id: 'chaos',
      name: 'Chaos',
      glyph: '⚡',
      tone: '#7C4DFF',
      line: 'The ones nobody planned and everybody remembers.'
    },
    {
      id: 'beginnings',
      name: 'Beginnings',
      glyph: '✦',
      tone: '#6FE3B8',
      line: 'First days. First rooms. The start of something unrecognised at the time.'
    },
    {
      id: 'triumphs',
      name: 'Triumphs',
      glyph: '△',
      tone: '#FFC46B',
      line: 'The ones that took years and are told in a minute.'
    },
    {
      id: 'family-lore',
      name: 'Family Lore',
      glyph: '☺',
      tone: '#FF9D5C',
      line: 'Told at every gathering. Improved slightly each time.'
    }
  ];

  /* ------------------------------------------------------------------------
     STRANDS — the braid.

     The trail is not one line. Two lives run alongside each other before they
     meet, become one when they marry, and divide again each time somebody is
     born. That shape is the archive's spine, and it is drawn from here.

     id       slug. A story's `strand` field points at one of these.
     label    drawn at the open end of the strand.
     tone     hex. The strand's own light.
     side     which way it sits off the centre line: -1, 0 or +1.
     role     'parent'  runs in from before the record and converges at the union
              'union'   the single line the parents become
              'child'   branches off the union in the year it begins
     begins   for a child, the year the strand starts. This is the branch point.
     ends     optional year a strand stops. Leave it out and it runs on.

     Add a third child and it gets its own branch; the sides just need
     spreading (-1, 0, +1 and so on outward). Nothing else needs editing.
     ------------------------------------------------------------------------ */
  var STRANDS = [
    { id: 'amma',     label: 'Amma',        tone: '#FF6B9A', side: -1, role: 'parent' },
    { id: 'dad',      label: 'Dad',         tone: '#6FE3B8', side:  1, role: 'parent' },
    { id: 'together', label: 'Together',    tone: '#FFC46B', side:  0, role: 'union' },
    { id: 'me',       label: 'Me',          tone: '#FFC46B', side: -1, role: 'child', begins: 1987 },
    { id: 'brother',  label: 'My brother',  tone: '#FF9D5C', side:  1, role: 'child', begins: 1990 }
  ];

  /* Where the two parent strands become one.

     `unionYear` is deliberately null: nobody has supplied the year yet, and
     putting a number here would be inventing one. Left null, the strands
     still converge — the confluence simply sits before the first birth with
     no date on it, which is the honest drawing of "this happened, we haven't
     written down when". Fill the year in and the whole braid re-times itself
     around it. */
  var BRAID = {
    unionYear: null,
    unionLabel: 'Married',
    unionNote: 'Two trails become one. The year has not been written down yet.',
    birthLabel: 'Born'
  };

  /* ------------------------------------------------------------------------
     ERAS — the time rail.

     Deliberately empty. Eras are a family's own way of dividing its life and
     they have to come from the stories, not from a template: naming periods
     before the stories exist would be inventing the shape of a life.

     Add them when the stories suggest them:
       { id: 'zambia', label: 'Zambia', from: 1974, to: 1990,
         line: 'optional one-liner' }

     Leave this empty and the rail derives its own bands from the years
     present in STORIES, labelled by decade. Either way the rail works.
     ------------------------------------------------------------------------ */
  var ERAS = [];

  /* ------------------------------------------------------------------------
     PLACES — the map.

     Also empty, and for the same reason: a place belongs here once a story
     happens in it. `lat` and `lon` are decimal degrees, north and east
     positive.

       { id: 'lusaka', name: 'Lusaka', country: 'Zambia',
         lat: -15.39, lon: 28.32 }

     MIGRATIONS draws the long arcs between places — the crossings, not the
     trips. Each is { from: <place id>, to: <place id>, year, label }.
     ------------------------------------------------------------------------ */
  var PLACES = [];
  var MIGRATIONS = [];

  /* ------------------------------------------------------------------------
     STORIES — the archive.

     Append objects here. One story, one object. A working template:

       {
         id: 'the-letter',
         title: 'The Letter',
         hook: 'It was not addressed to her.',
         year: 1971,
         approximateDate: 'Some time in the spring',
         era: null,
         strand: 'amma',
         location: 'Bombay',
         place: null,
         people: [{ name: '', relation: '' }],
         category: 'love',
         tags: ['letters'],
         story: [
           'First paragraph.',
           'Second paragraph.'
         ],
         images: [{ src: '', alt: '', caption: '', year: '', location: '' }],
         audio: { src: '', label: 'Amma, recorded 2026', transcript: [''] },
         source: 'Amma, at the kitchen table',
         notes: [{ by: 'Dad', text: 'Remembers the month differently.' }],
         relatedStories: [],
         causedBy: [],
         consequences: [],
         alternatePath: null,
         disputed: false,
         classified: false,
         chaosEvent: false,
         featured: false,
         dateAdded: '2026-01-01'
       }

     Copy it, fill in what is known, delete the rest.
     ------------------------------------------------------------------------ */
  var STORIES = [];

  /* ------------------------------------------------------------------------
     ARCHIVE — the room's own words. Copy lives here so it can be edited
     without going near the interface.
     ------------------------------------------------------------------------ */
  var ARCHIVE = {
    title: 'Butterfly Trails',
    tagline: 'Small moments. Different choices. Entirely different lives.',

    /* The intro, in order. Shown once in full; a returning visitor gets the
       short version. */
    openingLines: [
      'Every family is the result of thousands of improbable moments.'
    ],
    enter: 'Follow the trail',

    /* The mark in the corner of the way in. */
    beforeTheFinite: 'Before the finite',

    /* Shown while STORIES is empty. */
    empty: {
      heading: 'The trail is just beginning.',
      body: [
        'Some stories are remembered instantly.',
        'Others return slowly — in conversations, photographs, jokes, arguments, and the things families repeat for decades.',
        'We’re collecting them.'
      ],
      note: 'Stories coming soon.'
    },

    /* Shown when a butterfly is asked to fly somewhere that doesn't exist. */
    noStory: [
      'This butterfly hasn’t found its story yet.',
      'Check back after another memory finds its way home.'
    ],
    searching: 'They’re still gathering stories.',

    /* The flags, in the archive's own voice. */
    flags: {
      classified: {
        label: 'Classified family history',
        line: 'Publication currently prohibited by Amma.'
      },
      disputed: {
        label: 'Disputed account',
        line: 'Dad’s recollection of these events differs substantially from Amma’s.'
      },
      chaos: {
        label: 'Chaos event',
        line: 'This seemingly insignificant event becomes important later.'
      }
    },

    /* The causal mechanic. */
    because: 'Because of this…',
    becauseEmpty: 'Nothing has been traced forward from here yet.',
    alternate: {
      prompt: 'A decision had to be made.',
      guess: 'Which way did it go?',
      hypothetical: 'A life that never happened.',
      correction: 'But that’s not what happened.'
    }
  };

  /* ------------------------------------------------------------------------
     THE ESSAY — the room explaining its own premise.

     Opened from "What is the butterfly effect?" and linkable at
     butterfly.html#butterfly-effect. Kept here with the rest of the writing
     rather than inside the interface.
     ------------------------------------------------------------------------ */
  var ESSAY = {
    id: 'butterfly-effect',
    trigger: 'What is the butterfly effect?',
    title: 'The Butterfly Effect',
    standfirst: 'A weather model, a rounding error, and the most misquoted idea in science.',
    sections: [
      {
        heading: 'It started with a shortcut',
        paragraphs: [
          'In 1961 Edward Lorenz, a meteorologist at MIT, was re-running a weather simulation and did not want to start it from the beginning. He typed in the numbers from a printout partway through the previous run and went to get coffee.',
          'The printout had rounded the values to three decimal places. The machine had been working to six. He had entered 0.506 where the computer had been holding 0.506127 — a difference of about one part in a thousand, the sort of error that no measurement of the real atmosphere could ever avoid.',
          'The new forecast tracked the old one for a while, drifted, and then had nothing to do with it at all. Lorenz had expected a small difference to stay small. Instead the two weathers had become strangers.'
        ]
      },
      {
        heading: 'The talk that named it',
        paragraphs: [
          'Lorenz published the mathematics in 1963, in a paper about a simplified model of convection. Plotted, its solutions trace a shape that never repeats and never escapes — and which happens to look like a pair of wings.',
          'The name arrived later and almost by accident. In 1972 Lorenz was down to speak at a meeting of the American Association for the Advancement of Science and had not supplied a title, so the session organiser, Philip Merilees, wrote one for him: "Does the Flap of a Butterfly’s Wings in Brazil Set Off a Tornado in Texas?"',
          'Lorenz had used a seagull in earlier talks. The butterfly is the version that stuck.'
        ]
      },
      {
        heading: 'What it actually says',
        paragraphs: [
          'The idea is sensitive dependence on initial conditions: in some systems, differences too small to measure grow until they dominate. Such a system can be entirely deterministic — every step following exactly from the last — and still be unpredictable in practice, because you can never specify the starting point precisely enough.',
          'What it does not say is that one butterfly causes one tornado. In a system like that, every tiny difference matters equally and none of them is special. Picking out a single flap and calling it the cause is not physics; it is storytelling, done backwards, from an outcome we already know.',
          'Which is worth admitting up front in a room like this one, because that backwards storytelling is exactly what an archive does.'
        ]
      },
      {
        heading: 'And then there is the film',
        paragraphs: [
          'For most people the phrase does not come from Lorenz at all. It comes from The Butterfly Effect, the 2004 film written and directed by Eric Bress and J. Mackye Gruber, in which Ashton Kutcher plays a young man who discovers he can return to moments in his own past and change them.',
          'He keeps going back to put things right. Every repair costs something somewhere else, each new present worse than the one he was trying to fix, until the only decent move left is to undo himself.',
          'That is not really chaos theory — it is a film about regret, and about wanting a second run at a handful of specific days. Lorenz’s point was almost the opposite: not that you could go back and adjust one thing, but that you could never know which thing to adjust. Still, the film is why the phrase is in everybody’s mouth, and it is honest to say so.'
        ]
      },
      {
        heading: 'Why this room is built on it',
        paragraphs: [
          'A family is a system of exactly this kind. A decision that took an afternoon, a train that was late, a letter that went to the wrong house — and two generations later somebody exists who otherwise would not, in a country nobody had heard of at the time.',
          'The trails here run forward only. Where a story led somewhere, the archive traces the line and shows it. Where somebody wonders what the other choice would have done, that branch is drawn dashed, labelled a life that never happened, and then taken back — because it is a thing the family imagines, not a thing the record knows.'
        ]
      }
    ],
    sources: [
      { label: 'Lorenz, E. N. (1963). "Deterministic Nonperiodic Flow." Journal of the Atmospheric Sciences 20(2), 130–141.', url: 'https://journals.ametsoc.org/view/journals/atsc/20/2/1520-0469_1963_020_0130_dnf_2_0_co_2.xml' },
      { label: 'Lorenz, E. N. (1972). "Predictability: Does the Flap of a Butterfly’s Wings in Brazil Set Off a Tornado in Texas?" Address to the American Association for the Advancement of Science, Washington DC.', url: 'https://www.aaas.org/' },
      { label: 'Lorenz, E. N. (1993). The Essence of Chaos. University of Washington Press — where Lorenz tells the 1961 story himself.', url: 'https://uwapress.uw.edu/' },
      { label: 'The Butterfly Effect (2004). Written and directed by Eric Bress and J. Mackye Gruber.', url: null }
    ],
    footnote: 'Citations name the specific work. Links point at the publishing journal or institution rather than a deep link, because those keep working.'
  };
  ARCHIVE.essay = ESSAY;

  /* ------------------------------------------------------------------------
     A read-only sanity check. The controller runs it once and logs anything
     it finds; it never throws, because a typo in one story should not take
     the room down. Returns an array of strings.
     ------------------------------------------------------------------------ */
  function check() {
    var out = [];
    var ids = {};
    var catIds = {};
    var eraIds = {};
    var placeIds = {};
    var strandIds = {};

    CATEGORIES.forEach(function (c) { catIds[c.id] = true; });
    ERAS.forEach(function (e) { eraIds[e.id] = true; });
    PLACES.forEach(function (p) { placeIds[p.id] = true; });
    STRANDS.forEach(function (s) { strandIds[s.id] = true; });

    /* The braid only holds together if it has somewhere to converge and the
       children know when they start. */
    if (!STRANDS.some(function (s) { return s.role === 'union'; })) {
      if (STRANDS.some(function (s) { return s.role === 'parent'; })) {
        out.push('braid: parent strands exist with no union strand to meet at');
      }
    }
    STRANDS.forEach(function (s) {
      if (s.role === 'child' && typeof s.begins !== 'number') {
        out.push('strand ' + s.id + ': a child strand needs the year it begins');
      }
    });

    STORIES.forEach(function (s, i) {
      var at = 'story ' + (s.id || '#' + i);
      if (!s.id) { out.push(at + ': missing id'); return; }
      if (ids[s.id]) out.push(at + ': duplicate id');
      ids[s.id] = true;
      if (s.category && !catIds[s.category]) out.push(at + ': unknown category "' + s.category + '"');
      if (s.era && !eraIds[s.era]) out.push(at + ': unknown era "' + s.era + '"');
      if (s.place && !placeIds[s.place]) out.push(at + ': unknown place "' + s.place + '"');
      if (s.strand && !strandIds[s.strand]) out.push(at + ': unknown strand "' + s.strand + '"');
      if (s.alternatePath) {
        var taken = (s.alternatePath.choices || []).filter(function (c) { return c.taken; });
        if (taken.length !== 1) {
          out.push(at + ': alternatePath needs exactly one choice marked taken');
        }
      }
    });

    ['causedBy', 'consequences', 'relatedStories'].forEach(function (key) {
      STORIES.forEach(function (s) {
        (s[key] || []).forEach(function (ref) {
          if (!ids[ref]) out.push('story ' + s.id + ': ' + key + ' points at unknown "' + ref + '"');
        });
      });
    });

    MIGRATIONS.forEach(function (m, i) {
      if (!placeIds[m.from] || !placeIds[m.to]) {
        out.push('migration #' + i + ': references an unknown place');
      }
    });

    return out;
  }

  global.BUTTERFLY_DATA = {
    categories: CATEGORIES,
    strands: STRANDS,
    braid: BRAID,
    eras: ERAS,
    places: PLACES,
    migrations: MIGRATIONS,
    stories: STORIES,
    archive: ARCHIVE,
    check: check
  };
})(window);
