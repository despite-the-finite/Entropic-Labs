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
   location        free text: 'Bombay', 'The train to Lusaka'.
   place           a PLACES id, if this happened somewhere already listed.
                   Gives the story map coordinates without repeating them.
   coordinates     {lat, lon} — only if this story needs a point of its own
                   that isn't in PLACES. `place` is usually the better call.
   people          array of names or {name, relation} objects.
                   [{ name: 'Ba', relation: 'grandmother' }, 'Mum']
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
   source          who told it: 'Mum, at the kitchen table, 2026'.
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
   classified      true, or a string reason: 'Mum has not cleared this one.'
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
         audio: { src: '', label: 'Mum, recorded 2026', transcript: [''] },
         source: 'Mum, at the kitchen table',
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
        line: 'Publication currently prohibited by Mom.'
      },
      disputed: {
        label: 'Disputed account',
        line: 'Dad’s recollection of these events differs substantially from Mom’s.'
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

    CATEGORIES.forEach(function (c) { catIds[c.id] = true; });
    ERAS.forEach(function (e) { eraIds[e.id] = true; });
    PLACES.forEach(function (p) { placeIds[p.id] = true; });

    STORIES.forEach(function (s, i) {
      var at = 'story ' + (s.id || '#' + i);
      if (!s.id) { out.push(at + ': missing id'); return; }
      if (ids[s.id]) out.push(at + ': duplicate id');
      ids[s.id] = true;
      if (s.category && !catIds[s.category]) out.push(at + ': unknown category "' + s.category + '"');
      if (s.era && !eraIds[s.era]) out.push(at + ': unknown era "' + s.era + '"');
      if (s.place && !placeIds[s.place]) out.push(at + ': unknown place "' + s.place + '"');
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
    eras: ERAS,
    places: PLACES,
    migrations: MIGRATIONS,
    stories: STORIES,
    archive: ARCHIVE,
    check: check
  };
})(window);
