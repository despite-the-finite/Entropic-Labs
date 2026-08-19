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
                   'together', 'karsh', 'kush', 'colleen', 'carole', 'us',
                   'kush-carole', 'indra'. Leave it out and the story sits on
                   the centre line at its year, which is right for anything
                   belonging to the family rather than to one person in it.
   location        free text: 'Bombay', 'The train to Lusaka'.
   place           a PLACES id, if this happened somewhere already listed.
                   Gives the story map coordinates without repeating them.
   landmark        { name, url, query } — the particular house, school or
                   corner this happened at, inside the wider place. Shown as
                   a line under the title, with the name linking out to a map:
                     📍 One Nchanga · Chingola, Zambia · ~2002
                   `url` is a map link you have already found and checked, and
                   is used as given — always the better option where you have
                   one. Without it a search is built from `query`, or failing
                   that from the name and the location. Nothing is embedded:
                   the map is a link out, not an iframe.
   artifact        one object the memory left behind, printed like a museum
                   caption — or an array of them where a memory left more
                   than one:
                     { label: 'Memory artifact', title: 'A scar on my knee',
                       line: 'Still there. Still funny.' }
                   `lines: [{ label, text }]` sets out a couple of labelled
                   readings of the same object, for an artifact that meant
                   one thing and came to mean another.
   journey         for a memory that travels: an ordered list of the places
                   it passed through. Each stop is
                     { id, place, label, note, flag, url, arrival }
                   `place` is a PLACES id and is what puts the leg on the
                   map; `label` and `note` are what the reader sees; `url`
                   is a checked map link. A stop with `arrival: true` and no
                   place is a destination that is not a location at all — a
                   person, a habit, a noise you can still make — which is how
                   a trail ends somewhere that isn't on a map. The legs
                   between stops that do have places are drawn on the map
                   view automatically.
                   Any paragraph can name the stop it happens at with
                   `at: '<stop id>'`; the indicator at the top of the story
                   follows the reading, so a memory that pulls the telling
                   back across the world shows it doing that.
   coordinates     {lat, lon} — only if this story needs a point of its own
                   that isn't in PLACES. `place` is usually the better call.
   people          array of names or {name, relation} objects.
                   [{ name: 'Ba', relation: 'grandmother' }, 'Amma']
   category        a CATEGORIES id — which butterfly carries this one.
   tags            array of free-text tags. Cheap, searchable, no schema.
   story           array of paragraphs. A string is an ordinary paragraph,
                   which is what almost every line should be. Where the
                   telling needs a beat, an entry can instead be an object:

                     { kind: 'plan',    lead: 'The plan was simple:',
                       items: ['One.', 'Two.', 'Three.'] }
                         a confidently numbered list, for the idea that is
                         about to go wrong
                     { kind: 'shout',   text: 'Hiiii guyyyyys!' }
                         a line said far too loudly
                     { kind: 'beat',    text: 'CRASH.' }
                         the moment it lands. Jolts once, when read
                     { kind: 'landing', text: 'Hi guys.' }
                         a quiet line, given room to sit
                     { kind: 'sound',   text: 'Bmm. Tss. Pff.' }
                         a noise, transcribed. Set in the mono face and
                         split on the spaces, so the syllables land in
                         order rather than all at once
                     { kind: 'verse', lang: 'hi-Latn',
                       text: 'Dost bhi peeche chhoot jaate hain.',
                       meaning: 'Friends, too, get left behind.' }
                         a line in another language, with what it means
                         underneath rather than instead of it. `lang`
                         is set on the line so a screen reader does not
                         read it as English. `meaning` is optional
                     { kind: 'dedication', text: 'For Helen.',
                       line: 'One of the finest minds I ever knew.' }
                         the closing line that stands outside the
                         telling — a dedication, or the sign-off of a
                         letter. Set apart under a rule at the end.
                         `line` is optional
                     { kind: 'reveal',  text: 'That guy was Amr.' }
                         the line the story turns on. Arrives out of
                         focus and resolves as it is reached
                     { kind: 'found',   items: ['Momo.', 'Veggie momo.'] }
                         words as they were seen — a menu, a sign, a
                         letter, a line everybody knows
                     { kind: 'heading', text: 'The Plan' }
                         a chapter break inside a long story

                   Any entry can also be an object with just `text`, which
                   is an ordinary paragraph that wanted one of the extra
                   fields — `at`, usually.

                   Inside any paragraph, *asterisks* give a word the room's
                   warm emphasis. Once or twice a story, for a word the
                   whole thing turns on.

                   Use all of it sparingly. These are punctuation, not
                   decoration, and the writing carries the rest.
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
   The first memory has landed. The room still knows how to be empty — take
   everything out of STORIES and the beginning-state comes back on its own —
   but from here on it is a matter of appending.
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

     The trail is not one line. Lives run alongside each other, become one
     when they marry, and divide again each time somebody is born — and then
     the new lines do it all over again. That shape is the archive's spine,
     and it is drawn entirely from here.

     Every strand is described by three things: where it sits, how it starts,
     and how it ends.

     id       slug. A story's `strand` field points at one of these.
     label    the name. Drawn once, at whichever end of the line is open.
     tone     hex. The strand's own light.
     base     the strand this one measures its distance from, or null for the
              centre line. Offsets are relative, which is what lets a whole
              second generation hang off the first without any absolute
              positions being worked out by hand.
     side     how many lanes off the base it sits. Fractions are fine and are
              how two lines make room for the one they become.

     start    { kind: 'origin' }             runs in from before the record
              { kind: 'born',   year: 1987 } branches out of its base that year
              { kind: 'begins', year: 1991 } a life that starts here, whose own
                                             parents are not in this archive
              { kind: 'union',  year: 2016 } the line two others become
     end      { kind: 'open' }               runs on
              { kind: 'joins', year: 2016, into: 'us' }
                                             converges into another strand

     A year of `null` anywhere means "this happened, nobody has written down
     when" — the geometry still holds, the confluence simply carries no date.

     To add somebody: one more object. A new child is a `born` strand off
     whichever line it comes from; a new partner is a `begins` strand that
     `joins` at the wedding year, plus the strand they become. Nothing else
     in the room needs editing.
     ------------------------------------------------------------------------ */
  var STRANDS = [
    /* --- the first generation --- */
    {
      id: 'together', label: 'Amma & Dad', tone: '#FFC46B',
      base: null, side: 0,
      start: { kind: 'union', year: null }, end: { kind: 'open' }
    },
    {
      id: 'amma', label: 'Amma', tone: '#FF6B9A',
      base: 'together', side: -1,
      start: { kind: 'origin' }, end: { kind: 'joins', year: null, into: 'together' }
    },
    {
      id: 'dad', label: 'Dad', tone: '#6FE3B8',
      base: 'together', side: 1,
      start: { kind: 'origin' }, end: { kind: 'joins', year: null, into: 'together' }
    },

    /* --- the second --- */
    {
      id: 'karsh', label: 'Karsh', tone: '#FFC46B',
      base: 'together', side: -1,
      start: { kind: 'born', year: 1987 }, end: { kind: 'joins', year: 2016, into: 'us' }
    },
    {
      id: 'kush', label: 'Kush', tone: '#FF9D5C',
      base: 'together', side: 1,
      start: { kind: 'born', year: 1990 }, end: { kind: 'joins', year: 2017, into: 'kush-carole' }
    },
    {
      id: 'colleen', label: 'Colleen', tone: '#A78BFF',
      base: 'together', side: -1.9,
      start: { kind: 'begins', year: 1991 }, end: { kind: 'joins', year: 2016, into: 'us' }
    },
    {
      id: 'carole', label: 'Carole', tone: '#2FE0C7',
      base: 'together', side: 1.9,
      start: { kind: 'begins', year: 1990 }, end: { kind: 'joins', year: 2017, into: 'kush-carole' }
    },
    {
      id: 'us', label: 'Colleen & Karsh', tone: '#FFC46B',
      base: 'together', side: -1.45,
      start: { kind: 'union', year: 2016 }, end: { kind: 'open' }
    },
    {
      id: 'kush-carole', label: 'Kush & Carole', tone: '#FF9D5C',
      base: 'together', side: 1.45,
      start: { kind: 'union', year: 2017 }, end: { kind: 'open' }
    },

    /* --- the third --- */
    {
      id: 'indra', label: 'Indra', tone: '#FFE9B8',
      base: 'us', side: -0.75,
      start: { kind: 'born', year: 2021 }, end: { kind: 'open' }
    }
  ];

  /* The braid's own words, and the one date nobody has supplied.

     Amma and Dad's wedding year is deliberately absent: putting a number
     there would be inventing one. Left out, their strands still converge —
     the confluence simply sits before the first birth carrying no date,
     which is the honest drawing of "this happened, we haven't written down
     when". Give the `together` strand a start year and the whole braid
     re-times itself around it. */
  var BRAID = {
    marriedLabel: 'Married',
    undatedNote: 'Two trails become one. The year has not been written down yet.'
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

     `region` is optional and is for the record rather than the map. Keep the
     coordinates at town level — the map here says "these things happened far
     apart", not "here is the house".

     MIGRATIONS draws the long arcs between places — the crossings, not the
     trips. Each is { from: <place id>, to: <place id>, year, label }.
     ------------------------------------------------------------------------ */
  var PLACES = [
    {
      id: 'chingola',
      name: 'Chingola',
      region: 'Copperbelt Province',
      country: 'Zambia',
      lat: -12.53,
      lon: 27.85
    },
    {
      id: 'nainital',
      name: 'Nainital',
      region: 'Uttarakhand',
      country: 'India',
      lat: 29.38,
      lon: 79.45
    },
    {
      id: 'denver',
      name: 'Denver',
      region: 'Colorado',
      country: 'United States',
      lat: 39.74,
      lon: -104.99
    },
    {
      id: 'mauritius',
      name: 'Mauritius',
      country: 'Mauritius',
      lat: -20.28,
      lon: 57.55
    },
    {
      /* Three countries, at country level. A letter that says India,
         Zambia and America and does not say where in them gets exactly
         that much precision and no more. */
      id: 'india',
      name: 'India',
      country: 'India',
      lat: 22.0,
      lon: 79.0
    },
    {
      id: 'zambia',
      name: 'Zambia',
      country: 'Zambia',
      lat: -13.1,
      lon: 27.9
    },
    {
      id: 'america',
      name: 'United States',
      country: 'United States',
      lat: 39.0,
      lon: -98.0
    },
    {
      id: 'lookout-mountain',
      name: 'Lookout Mountain',
      region: 'Golden, Colorado',
      country: 'United States',
      lat: 39.73,
      lon: -105.24
    },
    {
      id: 'lakewood',
      name: 'Lakewood',
      region: 'Colorado',
      country: 'United States',
      lat: 39.70,
      lon: -105.08
    },
    {
      id: 'kitwe',
      name: 'Kitwe',
      country: 'Zambia',
      lat: -12.80,
      lon: 28.21
    },
    {
      id: 'haverford',
      name: 'Haverford',
      region: 'Pennsylvania',
      country: 'United States',
      lat: 40.01,
      lon: -75.31
    },
    {
      /* The country, and no finer: the story says China and does not say
         where in it. */
      id: 'china',
      name: 'China',
      country: 'China',
      lat: 35.0,
      lon: 104.0
    },
    {
      id: 'centennial',
      name: 'Centennial',
      region: 'Colorado',
      country: 'United States',
      lat: 39.58,
      lon: -104.88
    },
    {
      /* The state, and no finer: the story says Illinois and does not say
         where in it, so neither does the archive. */
      id: 'illinois',
      name: 'Illinois',
      country: 'United States',
      lat: 40.0,
      lon: -89.2
    },
    {
      id: 'pereybere',
      name: 'Péreybère',
      country: 'Mauritius',
      lat: -20.03,
      lon: 57.59
    },
    {
      id: 'chamarel',
      name: 'Chamarel',
      country: 'Mauritius',
      lat: -20.43,
      lon: 57.37
    }
  ];
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
  var STORIES = [
    {
      id: 'hi-guys',
      title: 'Hi Guys',
      hook: 'The bike went one way. I went another.',
      year: 2002,
      approximateDate: '~2002',
      strand: 'karsh',
      location: 'Chingola, Zambia',
      place: 'chingola',
      landmark: {
        name: 'One Nchanga',
        url: 'https://maps.app.goo.gl/Q4QPpb8x3roUPrM86'
      },
      category: 'family-lore',
      tags: ['childhood', 'zambia', 'family', 'growing up', 'funny memories'],
      people: [
        { name: 'Karsh', relation: 'me, on the bicycle' },
        { name: 'Kush', relation: 'my brother' },
        { name: 'Stefan', relation: 'Kush’s friend' },
        { name: 'Amma' },
        { name: 'Penny', relation: 'Amma’s friend' }
      ],
      story: [
        'There are some childhood memories that survive because something important happened.',
        'And then there are the ones that survive because you fell off a bicycle while yelling “Hi guys!”',
        'This is one of those.',
        'Back when we lived in Chingola, Amma was close friends with Penny, whose family lived at One Nchanga, the KCM CEO’s residence at the time.',
        'To us kids, One Nchanga was less of a house and more of a kingdom.',
        'The property was enormous, with sprawling grounds that seemed designed for wandering around and getting into harmless trouble. Inside was one of our favorite places: a billiards suite reached by taking a passageway that actually crossed over the entrance carport. Naturally, this made getting there feel like we were accessing some secret wing of a mansion.',
        'While Amma and Penny disappeared into their world of arts and crafts, we disappeared into ours.',
        'One afternoon, my brother Kush, his friend Stefan, and I were roaming around the property. Kush and Stefan were walking. I was on my bike.',
        'And I was feeling pretty cool.',
        'I came riding toward them and decided that simply riding a bicycle normally wasn’t going to cut it. So, as kids with questionable risk-assessment skills tend to do, I took my hands off the handlebars.',
        {
          kind: 'plan',
          lead: 'The plan was simple:',
          items: [
            'Cruise effortlessly past them.',
            'Casually say: “Hi guys.”',
            'Continue riding into the distance looking incredibly cool.'
          ]
        },
        'Instead, just as I reached them, my front wheel hit a bump.',
        'The bike went one way.',
        'I went another.',
        'But apparently, my brain was already fully committed to the greeting.',
        'So somewhere between being upright and hitting the ground, instead of screaming or yelling—',
        'I said:',
        { kind: 'shout', text: 'Hiiii guyyyyys!' },
        { kind: 'beat', text: 'CRASH.' },
        'I absolutely destroyed my knee.',
        'Kush and Stefan absolutely lost it.',
        'The knee took quite a while to heal, and it left me with a scar that I still have today. But somehow the pain has disappeared from the memory entirely.',
        'What survived was “Hi Guys.”',
        'Kush and I still talk about it all these years later. And every once in a while, I’ll notice that scar on my knee and laugh.',
        'It’s funny how something so small can become a doorway to an entire time in your life.',
        'For a moment I’m back at One Nchanga. Amma is somewhere inside doing arts and crafts with Penny. Kush and Stefan are walking down the road. I’m a kid on a bicycle, hands off the handlebars, convinced I’m much cooler than I actually am.',
        'And around us is Chingola—the place where we got to grow up, explore, get hurt, laugh about it, and live with the kind of freedom you don’t realize is special until many years later.',
        'All it takes to bring it back is one little scar.',
        'And two words.',
        { kind: 'landing', text: 'Hi guys.' }
      ],
      artifact: {
        title: 'A scar on my knee',
        line: 'Still there. Still funny.'
      },
      source: 'Karsh',
      relatedStories: ['momo'],
      dateAdded: '2026-08-17'
    },

    {
      id: 'momo',
      title: 'Momo',
      hook: 'A dumpling found its way from a mountain school to my daughter’s name.',
      /* "About twelve years old", and born in 1987 — so the first momo is
         somewhere around 1999. Approximate, and the record says so. */
      year: 1999,
      approximateDate: '~1999 onward',
      strand: 'karsh',
      location: 'Nainital, India',
      place: 'nainital',
      landmark: {
        name: 'Birla Vidya Mandir',
        url: 'https://www.google.com/maps/search/?api=1&query=Birla+Vidya+Mandir+Nainital+Uttarakhand+India'
      },
      journey: [
        {
          id: 'zambia-start',
          place: 'chingola',
          flag: '🇿🇲',
          label: 'Chingola, Zambia',
          note: 'Where the journey began',
          url: 'https://www.google.com/maps/search/?api=1&query=Chingola+Zambia'
        },
        {
          id: 'nainital',
          place: 'nainital',
          flag: '🇮🇳',
          label: 'Birla Vidya Mandir · Nainital, India',
          note: 'Boarding school · First momo',
          url: 'https://www.google.com/maps/search/?api=1&query=Birla+Vidya+Mandir+Nainital+Uttarakhand+India'
        },
        {
          id: 'zambia-home',
          place: 'chingola',
          flag: '🇿🇲',
          label: 'Chingola, Zambia',
          note: 'Home again',
          url: 'https://www.google.com/maps/search/?api=1&query=Chingola+Zambia'
        },
        {
          id: 'denver',
          place: 'denver',
          flag: '🇺🇸',
          label: 'Denver, Colorado · 2011',
          note: 'Momo rediscovered',
          url: 'https://www.google.com/maps/search/?api=1&query=Denver+Colorado'
        },
        {
          id: 'indra',
          arrival: true,
          flag: '❤',
          label: 'Years later',
          note: '“Momo” becomes Indra’s nickname'
        }
      ],
      category: 'beginnings',
      chaosEvent: true,
      tags: [
        'childhood', 'india', 'zambia', 'boarding school', 'immigration',
        'food', 'family', 'indra', 'memory', 'serendipity'
      ],
      people: [
        { name: 'Karsh', relation: 'me, aged about twelve' },
        { name: 'Colleen', relation: 'my wife' },
        { name: 'Indra', relation: 'my daughter' }
      ],
      story: [
        'There are foods you remember because they tasted good.',
        'And then there are foods that somehow follow you through your entire life.',
        'For me, that food is *momo*.',
        {
          text: 'I grew up in Chingola, Zambia, and when I was about twelve years old, I was sent thousands of miles away to boarding school in India.',
          at: 'zambia-start'
        },
        {
          text: 'My school was Birla Vidya Mandir in Nainital, high in the Himalayan foothills of Uttarakhand.',
          at: 'nainital'
        },
        'It was a massive transition.',
        'I had gone from growing up in Zambia to suddenly living at a boarding school in the mountains of northern India, far away from everything that had been familiar.',
        'Somewhere during those boarding-school years, I tried momo for the first time.',
        'I remember eating them at a small, simple restaurant that was almost completely open to the outside. Nothing fancy. Just a little place in the mountains, the outside air, and these strange dumplings I had never really encountered before.',
        'And I loved them.',
        'At the time, momo felt like something that belonged entirely to that world.',
        'Nainital.',
        'The mountains.',
        'Birla Vidya Mandir.',
        'Boarding school.',
        'Being twelve years old and very far from home.',
        'Eventually, life moved on.',
        { text: 'I returned to Zambia.', at: 'zambia-home' },
        'Later I moved to the United States.',
        'And for years, momo disappeared from my life.',
        {
          text: 'Then, in 2011, after moving to Denver, I went to a restaurant called India Nepal Oven.',
          at: 'denver'
        },
        'I opened the menu.',
        'And there it was.',
        { kind: 'found', items: ['Momo.', 'Veggie momo.', 'Meat momo.'] },
        'Just seeing the word stopped me.',
        { text: 'Suddenly I wasn’t sitting in Denver anymore.', at: 'nainital' },
        'I was back in Nainital.',
        'Back in the mountains.',
        'Back at that little open restaurant.',
        'Back at Birla Vidya Mandir.',
        'Back at twelve years old.',
        {
          text: 'It hit me much harder than I expected. I remember getting emotional — actually tearing up a little — because this tiny dumpling had somehow opened a door to an entire part of my childhood that I hadn’t visited in years.',
          at: 'denver'
        },
        'And then, many years later, momo found its way into my life again.',
        'When Colleen was pregnant, one of the pregnancy apps compared the size of our unborn baby to a dumpling.',
        'That was all it took.',
        'Because of the history that word already carried for me, I started calling the baby:',
        { kind: 'landing', text: 'Momo.', at: 'indra' },
        'Before she had a name, before we had met her, she was Momo.',
        'That baby became our daughter, Indra.',
        'And somehow the story managed to complete one more loop.',
        'As Indra grew older, momo became one of her favorite foods.',
        'She had no idea, of course, that decades before she was born, her dad had been a twelve-year-old kid at Birla Vidya Mandir in the mountains of India, discovering a dumpling that would eventually become her nickname.',
        'That’s what I love about memory.',
        'You never know which tiny moments are going to matter.',
        'A boarding school.',
        'A little restaurant in the mountains.',
        'A plate of dumplings.',
        'A word on a menu in Denver.',
        'A pregnancy app.',
        'A little girl eating one of her favorite foods.',
        'Sometimes the trail between the important moments in your life only becomes visible when you look backward.',
        'For me, one of those trails begins with a dumpling.',
        { kind: 'landing', text: 'Momo.' }
      ],
      artifact: [
        {
          label: 'Butterfly effect',
          title: 'A dumpling discovered at boarding school in Nainital eventually became my unborn daughter’s nickname decades later.'
        },
        {
          label: 'Memory artifact',
          title: 'Momo',
          lines: [
            { label: 'First meaning', text: 'A dumpling discovered in the mountains of India.' },
            { label: 'Later meaning', text: 'My daughter’s nickname before she was born.' }
          ]
        }
      ],
      source: 'Karsh',
      dateAdded: '2026-08-17'
    },

    {
      id: 'dont-haggle',
      title: 'Don’t Haggle With a Tattoo Artist',
      hook: 'Twenty years old, the last day of the holiday, and no appointment.',
      year: 2007,
      approximateDate: '2007',
      strand: 'karsh',
      location: 'Mauritius',
      place: 'mauritius',
      landmark: {
        name: 'Allan Tattoo',
        url: 'https://maps.app.goo.gl/VndPLrKmiusVq6MK7'
      },
      category: 'chaos',
      tags: [
        'mauritius', 'family', 'travel', 'tattoo', 'growing up',
        'india', 'zambia', 'souvenirs', 'funny memories'
      ],
      people: [
        { name: 'Karsh', relation: 'me, aged exactly twenty' },
        { name: 'Amma', relation: 'the negotiator' },
        { name: 'Dad' },
        { name: 'Kush', relation: 'my brother' }
      ],
      story: [
        'In 2007, when I had just turned twenty, my family took a vacation to Mauritius.',
        'I was twenty years old, in some of the best shape of my life, on a tropical island, and apparently operating with exactly the amount of confidence and foresight you’d expect from a twenty-year-old.',
        'I wanted a tattoo.',
        'The trip itself was incredible. Mauritius was beautiful, and we made memories all over the island — my parents, my brother Kush, and me.',
        'Then we went to Île aux Cerfs.',
        'Somewhere there, I saw a guy with a tattoo.',
        'That was it.',
        'I became obsessed.',
        'I was getting a tattoo in Mauritius.',

        { kind: 'heading', text: 'The Plan' },
        'I did, however, have enough sense to know that a fresh tattoo and days of swimming in the ocean weren’t particularly compatible.',
        {
          kind: 'plan',
          lead: 'So I developed what I considered a very sophisticated strategy:',
          items: [
            'Wait until the last day.',
            'Maximum Mauritius beach time.',
            'Minimum post-tattoo vacation restrictions.'
          ]
        },
        'Perfect.',
        'On our final day, we planned to spend our time shopping for souvenirs.',
        'For everyone else, that meant souvenirs they could pack into a suitcase.',
        'I had apparently decided to bring mine home permanently attached to my body.',

        { kind: 'heading', text: 'Allan Tattoo' },
        'We found a place called Allan Tattoo and walked in.',
        'No appointment.',
        'No prior consultation.',
        'No careful research into the artist’s portfolio.',
        'Just a twenty-year-old walking into a tattoo shop on a foreign island and saying, essentially:',
        'I’d like something *permanent*, please.',
        'There was also one minor scheduling requirement.',
        'It needed to be finished that day.',
        'Because we were flying home the next day.',
        'Again: excellent planning.',
        'I looked through the catalogue and found what I wanted — a graffiti-style, interweaving tribal band.',
        'And despite the spontaneity of everything surrounding it, the tattoo itself actually meant something to me.',
        'The intertwining design represented the two cultures that had shaped my life up to that point: India and Zambia.',
        'India was where I was born.',
        'Zambia was where I grew up.',
        'Two places. Two cultures. Woven together.',
        'At twenty, that felt like the right thing to permanently put on my body.',
        'There was just one problem.',
        'I wasn’t exactly financially self-sufficient yet.',
        'My parents were paying.',
        'Which meant my mother was involved.',
        'Which meant —',

        { kind: 'heading', text: 'Amma Negotiated the Tattoo' },
        'If you know anything about Indian mothers, you probably know where this is going.',
        'Amma looked at the price of this permanent piece of artwork that was about to be injected into her son’s skin…',
        '…and started haggling with the tattoo artist.',
        'The artist named his price.',
        'Amma countered.',
        'There was negotiation.',
        'And somehow, incredibly —',
        'he agreed.',
        'In retrospect, there are many things in life worth negotiating.',
        'Cars.',
        'Furniture.',
        'Souvenirs.',
        'Hotel rooms.',
        'Perhaps even coconuts.',
        'But I have since developed one fairly firm rule:',
        'Don’t haggle with the person who is about to permanently draw on your body with needles.',

        { kind: 'heading', text: 'The Curtains' },
        'At some point while I was getting tattooed, the artist asked me a question.',
        'Would I mind if he opened the curtains so people outside could watch?',
        'I don’t remember exactly why I agreed.',
        'Maybe I was trying to be cool.',
        'Maybe twenty-year-old me didn’t know how to say no.',
        'Maybe I was already committed to the entire questionable chain of decisions that had brought me here.',
        'But the curtains went up.',
        'And suddenly my tattoo session became a public performance.',
        'People could see me sitting there getting tattooed.',
        'I was embarrassed.',
        'And somewhere in the back of my mind I couldn’t help wondering:',
        'Was this because Amma negotiated the price?',
        'I’ll never know.',

        { kind: 'heading', text: 'The Permanent Souvenir' },
        'The tattoo was finished.',
        'And, well…',
        'It wasn’t exactly a masterpiece.',
        'Looking at it now, I’d describe the execution as mediocre.',
        'I’ve thought about eventually adding more artwork around it or incorporating it into something larger.',
        'But I’ve never regretted it.',
        'In fact, over time, I’ve learned to love it.',
        'Not because it’s a perfect tattoo.',
        'Because it’s a perfect memory.',
        'I can look at it today and instantly travel back to being twenty years old in Mauritius.',
        'I remember the beaches.',
        'Île aux Cerfs.',
        'Exploring a beautiful country with Kush and my parents.',
        'Being young, fit, confident and wonderfully naive.',
        'Walking into a tattoo shop without an appointment.',
        'Picking permanent artwork from a catalogue.',
        'Telling the artist we had a flight the next day.',
        'And, of course, watching Amma negotiate the price of something that was about to become part of my body forever.',
        'Maybe someday I’ll add to the tattoo.',
        'But I don’t think I’d ever want to erase the original.',
        'The imperfections are part of the story.',
        'It’s funny how souvenirs work.',
        'Most of the things we bought that day are probably long gone.',
        'Mine is still here.',
        'And every time I look at it, Mauritius comes back with it.',
        'Although the trip also left me with one piece of wisdom I’ve carried ever since:',
        { kind: 'landing', text: 'Don’t haggle with a tattoo artist.' }
      ],
      artifact: {
        label: 'Memory artifact',
        title: 'A graffiti-style tribal band',
        lines: [
          { label: 'What it means', text: 'India and Zambia — where I was born and where I grew up, woven together.' },
          { label: 'Execution', text: 'Mediocre. Never regretted. Still there.' }
        ]
      },
      source: 'Karsh',
      relatedStories: ['hi-guys', 'momo'],
      dateAdded: '2026-08-17'
    },

    {
      id: 'beatbox',
      title: 'The Day My Family Regretted Letting Me Learn to Beatbox',
      hook: 'You’re welcome, family.',
      year: 2007,
      approximateDate: '2007',
      strand: 'karsh',
      location: 'Mauritius',
      place: 'chamarel',
      landmark: {
        name: 'Chamarel',
        query: 'Chamarel Mauritius'
      },
      journey: [
        {
          id: 'coast',
          place: 'pereybere',
          flag: '🏖',
          label: 'Péreybère, Mauritius',
          note: 'Beaches, warm water, the Indian Ocean'
        },
        {
          id: 'chamarel',
          place: 'chamarel',
          flag: '⛰',
          label: 'The road to Chamarel',
          note: 'Sugarcane, winding roads, mountains'
        },
        {
          id: 'coast-again',
          place: 'pereybere',
          flag: '🏖',
          label: 'Back toward Péreybère',
          note: 'The day trip ended. The noises did not.'
        },
        {
          id: 'today',
          arrival: true,
          flag: '♪',
          label: 'Almost twenty years later',
          note: 'A skill, rather than a place'
        }
      ],
      category: 'triumphs',
      chaosEvent: true,
      tags: [
        'mauritius', 'family', 'travel', 'road trip', 'beatboxing',
        'music', 'stubbornness', 'growing up', 'mountains'
      ],
      people: [
        { name: 'Karsh', relation: 'me, aged twenty' },
        { name: 'Amma' },
        { name: 'Dad' },
        { name: 'Kush', relation: 'my brother' }
      ],
      story: [
        { text: 'In 2007, my family took a vacation to Mauritius.', at: 'coast' },
        'We were staying near Péreybère, surrounded by exactly what we’d come to Mauritius for: beaches, warm water, and the Indian Ocean.',
        'Then one day, we decided to do something different.',
        'We rented a car and made a day trip inland to Chamarel.',
        'The plan was to get away from the coast for a while and see another side of Mauritius — the mountains, sugarcane plantations, winding roads, and the interior of the island.',
        'At twenty years old, I wasn’t particularly excited about this plan.',
        'We were in Mauritius.',
        'There were beaches.',
        'Why were we driving away from them?',
        'Which is pretty ironic now.',
        'These days, give me a choice between mountains and beaches and I’ll probably gravitate toward the mountains.',
        'Twenty-year-old me had apparently not discovered that part of himself yet.',

        { kind: 'heading', text: 'The Road to Chamarel' },
        'It was going to be a long day in the car.',
        {
          text: 'And somewhere along the drive to Chamarel, I decided I needed something to occupy my time.',
          at: 'chamarel'
        },
        'For reasons I can no longer explain, I chose that particular moment to learn a new skill.',
        '*Beatboxing.*',
        'I couldn’t beatbox.',
        'I had no teacher.',
        'I had no lesson.',
        'I just decided I was going to figure it out.',
        'There was only one problem.',
        'I was trapped in a car with my family.',
        'Which meant my family was trapped in a car with me.',
        'So I started practicing.',
        { kind: 'sound', text: 'Bmm. Tss. Pff.' },
        'Again.',
        { kind: 'sound', text: 'Bmm. Tss. Pff.' },
        'Again.',
        'And again.',
        'And again.',
        'There is an important distinction between listening to someone beatbox and listening to someone *learn* how to beatbox.',
        'The first can be impressive.',
        'The second is essentially being trapped in a moving vehicle with someone making the same collection of terrible mouth noises for hours.',
        'My family began to lose patience.',
        'I did not.',

        { kind: 'heading', text: 'The Problem With Determination' },
        'Once I decide I want to learn something, I can become a little obsessive.',
        'So as we drove farther into Mauritius, the noises continued.',
        'Past sugarcane fields.',
        'Up winding roads.',
        'Into the mountains.',
        'Toward Chamarel.',
        { kind: 'sound', text: 'Bmm. Tss. Pff.' },
        'Kush had had enough.',
        'My parents had had enough.',
        'Probably everyone in that car had had enough.',
        'Except me.',
        'Because somewhere inside all those terrible noises, every once in a while —',
        'one started sounding right.',
        'So naturally, I practiced more.',
        {
          text: 'We explored Chamarel, saw a completely different side of Mauritius, and eventually made our way back toward Péreybère.',
          at: 'coast-again'
        },
        'The day trip ended.',
        'Unfortunately for my family —',
        'the beatboxing did not.',

        { kind: 'heading', text: 'It Followed Us Home' },
        'I kept practicing for the rest of the trip.',
        { text: 'Then I kept practicing after Mauritius.', at: 'today' },
        'And practicing.',
        'And practicing.',
        'Whatever hope my family had that this was simply an annoying Chamarel road-trip phase was quickly extinguished.',
        'But eventually something unexpected happened.',
        'I actually got pretty good at it.',

        { kind: 'heading', text: 'The Long-Term Payoff' },
        'Today, I’m a decent beatboxer.',
        'It’s one of those completely random skills people don’t expect me to have.',
        'Every once in a while, the opportunity presents itself and I’ll start beatboxing. There’s usually a moment when someone looks at me like:',
        'Wait. You can do that?',
        'Yep.',
        'And I can trace the whole thing back to one family day trip to Chamarel in 2007.',
        'A rental car.',
        'Sugarcane fields.',
        'Mauritian mountains.',
        'A family slowly losing its collective sanity.',
        'And one extremely determined twenty-year-old making terrible noises with his mouth.',
        'There’s another part of that day that makes me smile now.',
        'At twenty, I couldn’t understand why we’d voluntarily leave the beaches to drive around the mountains.',
        'Today, the mountains are probably exactly where I’d want to go.',
        'I went to Chamarel thinking we were wasting a perfectly good beach day.',
        'Instead, I came back with a skill I’ve kept for almost twenty years.',
        'So to Amma, Dad, and Kush:',
        'Thank you for enduring the hundreds — probably thousands — of awful noises required for me to eventually become a decent beatboxer.',
        'Although…',
        'The more I think about it, you’re welcome.',
        'You had front-row seats to the origin story.',
        'And every time I surprise someone by beatboxing today, somewhere deep down I like to think that long, noisy drive to Chamarel was worth it.',
        { kind: 'landing', text: 'At least for me.' }
      ],
      artifact: {
        label: 'Memory artifact',
        title: 'Bmm. Tss. Pff.',
        lines: [
          { label: 'Learned', text: 'In a rental car, somewhere between Péreybère and Chamarel.' },
          { label: 'Still works', text: 'Almost twenty years later, and it still surprises people.' }
        ]
      },
      source: 'Karsh',
      relatedStories: ['dont-haggle'],
      dateAdded: '2026-08-17'
    },

    {
      id: 'gin-joints',
      title: 'Of All the Gin Joints',
      hook: 'Some people you meet once. Some you meet twice, years apart, without noticing.',
      year: 2012,
      approximateDate: 'Circa 2012',
      strand: 'karsh',
      location: 'Denver, Colorado',
      place: 'denver',
      landmark: {
        name: 'Williams Tavern',
        query: 'Williams Tavern Denver Colorado'
      },
      journey: [
        {
          id: 'wedding',
          place: 'illinois',
          flag: '✦',
          label: 'Ryan’s wedding, Illinois',
          note: 'Ten minutes with a stranger. Years earlier.',
          url: 'https://share.google/45S83cvUTrV48ePO0'
        },
        {
          id: 'denver',
          place: 'denver',
          flag: '🏔',
          label: 'Denver, Colorado',
          note: 'A building called 300. Two floors apart.'
        },
        {
          id: 'tavern',
          place: 'denver',
          flag: '🍺',
          label: 'Williams Tavern',
          note: 'The seat next to mine',
          url: 'https://www.google.com/maps/search/?api=1&query=Williams+Tavern+Denver+Colorado'
        },
        {
          id: 'together',
          arrival: true,
          flag: '❤',
          label: 'More than a decade later',
          note: 'Two families, rather than two strangers'
        }
      ],
      category: 'beginnings',
      chaosEvent: true,
      tags: [
        'denver', 'colorado', 'illinois', 'friendship', 'coincidence',
        'music', 'hiking', 'chance', 'families'
      ],
      people: [
        { name: 'Karsh', relation: 'me, on the 14th floor' },
        { name: 'Amr', relation: 'the guy at the bar, on the 12th' },
        { name: 'Ashley', relation: 'Amr’s friend from Illinois' },
        { name: 'Ryan', relation: 'a friend from university' },
        { name: 'Lindsey', relation: 'a friend from university' }
      ],
      story: [
        'There are some people you meet once and never see again. There are others you meet twice, years apart, without realizing until much later that somehow you’ve already crossed paths.',
        'Amr was one of those people.',
        {
          text: 'I was living in downtown Denver at the time, in an apartment building called 300. Not far away was Williams Tavern, our neighborhood drinking hole — the kind of place you could wander into for a drink without making any plans.',
          at: 'denver'
        },
        { text: 'One night, that’s exactly what I did.', at: 'tavern' },
        'I was sitting at the bar and struck up a conversation with the guy next to me. His name was Amr, an Egyptian-American guy who had recently moved to Colorado from Illinois.',
        'As we talked, we discovered something funny: he lived in my building.',
        'Then it got even stranger.',
        'He lived on the 12th floor. I lived on the 14th floor.',
        'And we lived in essentially the same apartment, just two floors apart.',
        'We kept talking and realized we had a lot more in common than our floor plans. We both loved music. We both loved getting outside and exploring Colorado. We had similar interests and just got along easily.',
        'So we exchanged information and decided we’d hang out again.',
        'And unlike a lot of random bar conversations, we actually did.',
        'Over the next few months, Amr and I became good friends. We went hiking, played music together, explored Colorado and did all the things two relatively new Denverites do when they’re discovering the city and the mountains around it.',
        'Then one of Amr’s friends from Illinois came to visit.',
        'Her name was Ashley.',
        'Naturally, we took her to Williams Tavern.',
        'We had a fun night, and afterward Ashley and I added each other on Facebook. Amr wasn’t really a Facebook person, so until then we’d never had that weird moment where social media suddenly reveals that two completely separate parts of your life are connected.',
        'Ashley and I did.',
        'I noticed that we had mutual friends: Ryan and Lindsey, friends of mine from university.',
        'So Ashley and I started figuring out how everyone knew everyone.',
        'Eventually I mentioned Ryan to Amr.',
        'And Amr casually told me that, years earlier, he had dated Ryan’s sister.',
        { kind: 'beat', text: 'Something clicked.' },
        { text: 'I remembered Ryan’s wedding.', at: 'wedding' },
        'I remembered meeting an Egyptian guy there who was dating Ryan’s sister.',
        'And then I realized:',
        { kind: 'reveal', text: 'That guy was Amr.' },
        'We started comparing memories and confirmed it. Amr and I had actually met before. We’d hung out, briefly, at Ryan’s wedding in Illinois years earlier.',
        'Neither of us remembered the other well enough to recognize each other when we met again.',
        'Which isn’t surprising. Weddings are full of people you meet for ten minutes, have a conversation with, maybe share a drink with, and then assume you’ll probably never see again.',
        'And apparently, that’s what both of us thought.',
        {
          text: 'Except several years later, hundreds of miles away, we both somehow ended up in Colorado.',
          at: 'denver'
        },
        'In the same city.',
        'In the same apartment building.',
        'In practically the same apartment.',
        {
          text: 'And then, out of all the bars in Denver, we happened to sit next to each other at Williams Tavern.',
          at: 'tavern'
        },
        'There’s a little bit of *Casablanca* in that:',
        { kind: 'found', items: ['Of all the gin joints in all the towns in all the world…'] },
        'Except in our version, neither of us had any idea we’d already met.',
        'We didn’t become friends because of Ryan. Or because of the wedding. Or because somebody introduced us again.',
        'We independently became friends — and only afterward discovered that life had already introduced us once before.',
        { text: 'That was more than a decade ago.', at: 'together' },
        'Today, Amr is married and has a daughter. I’m married and have a daughter too. Our wives became great friends — arguably even better at it than Amr and I were — and our daughters adore each other.',
        'What started as two strangers talking over drinks has turned into two families sharing their lives.',
        'And that’s probably my favorite part of the story.',
        'That first meeting at the wedding seemed completely insignificant at the time. The second meeting at Williams Tavern seemed completely random.',
        'Neither was.',
        'Because sometimes a person crosses your trail once and disappears.',
        'And then, years later, somehow the trail loops back around.',
        { kind: 'landing', text: 'This time, you keep walking it together.' }
      ],
      artifact: {
        label: 'Memory artifact',
        title: 'The seat next to mine',
        lines: [
          { label: 'The first time', text: 'A wedding in Illinois. Ten minutes. Neither of us remembered it.' },
          { label: 'The second time', text: 'Williams Tavern, Denver. This one stuck.' }
        ]
      },
      source: 'Karsh',
      relatedStories: ['momo'],
      dateAdded: '2026-08-18'
    },

    {
      id: 'helen',
      title: 'Helen — The Friend Who Understood',
      hook: 'She could finish the mental arithmetic before anyone else. Then she helped me catch up.',
      year: 1997,
      approximateDate: '1997, and all the years after',
      strand: 'karsh',
      location: 'Kitwe, Zambia',
      place: 'kitwe',
      landmark: {
        name: 'Lechwe School',
        query: 'Lechwe School Kitwe Zambia'
      },
      journey: [
        {
          id: 'lechwe',
          place: 'kitwe',
          flag: '🇿🇲',
          label: 'Lechwe School, Kitwe',
          note: 'A harder math class. 1997.'
        },
        {
          id: 'india',
          place: 'nainital',
          flag: '🇮🇳',
          label: 'Boarding school, India',
          note: 'We lost contact.',
          url: 'https://www.google.com/maps/search/?api=1&query=Birla+Vidya+Mandir+Nainital+Uttarakhand+India'
        },
        {
          id: 'lechwe-again',
          place: 'kitwe',
          flag: '🇿🇲',
          label: 'Back at Lechwe',
          note: 'And Helen was there.'
        },
        {
          id: 'bradley',
          place: 'illinois',
          flag: '🇺🇸',
          label: 'Bradley University, Illinois',
          note: 'An ocean away, and it did not matter',
          url: 'https://www.google.com/maps/search/?api=1&query=Bradley+University+Illinois'
        },
        {
          id: 'haverford',
          place: 'haverford',
          flag: '🇺🇸',
          label: 'Haverford College, Pennsylvania',
          note: 'Fall break. South Park. Nothing grand.',
          url: 'https://www.google.com/maps/search/?api=1&query=Haverford+College+Pennsylvania'
        },
        {
          id: 'china',
          place: 'china',
          flag: '🇨🇳',
          label: 'China',
          note: 'Russian, Chinese, and a part of herself'
        },
        {
          id: 'denver',
          place: 'denver',
          flag: '🇺🇸',
          label: 'Denver, Colorado',
          note: 'Garden of the Gods. She met the life I had built.'
        },
        {
          id: 'peakview',
          place: 'centennial',
          flag: '🇺🇸',
          label: 'Centennial, Colorado',
          note: 'Peakview Place. A post on a screen.'
        },
        {
          id: 'remains',
          arrival: true,
          flag: '✦',
          label: 'Wherever the traces are kept',
          note: 'I hope some trace of her remains'
        }
      ],
      category: 'beginnings',
      chaosEvent: true,
      tags: [
        'zambia', 'kitwe', 'school', 'friendship', 'mathematics',
        'india', 'china', 'college', 'grief', 'mental health', 'loss'
      ],
      people: [
        { name: 'Helen Xiao Yi Huang', relation: 'my friend' },
        { name: 'Karsh', relation: 'me' }
      ],
      story: [
        { text: 'I first met Helen Xiao Yi Huang because I got moved up in math.', at: 'lechwe' },
        'It was around 1997. I had just transferred from Nchanga Upper Trust School in Chingola to Lechwe School in Kitwe. At Lechwe, the math classes were divided roughly by ability, and new students generally started in the lower group until the teachers figured out where they belonged.',
        'After a little while, I was moved into the higher class.',
        'That was where I met Helen.',
        'And one of the first things I learned about her was that she was ridiculously intelligent.',
        'We started math class with mental arithmetic. The teacher would give us problems to work through quickly, and everyone would race to finish.',
        'I was completely unfamiliar with it.',
        'Coming from the other class and a different school, I didn’t have the practice everyone else had. For the first few weeks, I struggled.',
        'Helen didn’t.',
        'She would finish before everyone else. Not just before me — before almost everybody, and often by a ridiculous margin.',
        'I remember being immediately impressed by her.',
        'But what mattered much more was what happened after she finished.',
        'She helped me.',
        'There was never any arrogance about how intelligent she was. She didn’t make me feel stupid because I was struggling with something that came easily to her. She would simply help me understand it.',
        'Looking back, that was Helen in miniature.',
        'Brilliant, yes.',
        'But *kind*.',

        { kind: 'heading', text: 'Losing Touch' },
        'Not long afterward, my life changed again.',
        {
          text: 'I left Zambia for boarding school in India, and Helen and I lost contact. Those were the years when the mines in Zambia were being privatized and there was uncertainty around my family’s life there. Eventually, when things stabilized, my parents brought me back to Zambia to finish high school.',
          at: 'india'
        },
        { text: 'And Helen was there.', at: 'lechwe-again' },
        'This time, our friendship became something entirely different.',
        'We instantly connected again, but now we were old enough to really talk — to question things, argue about things, joke about things and try to make sense of the world.',
        'We passed notes.',
        'We made up rhymes.',
        'We had long, strange, intelligent conversations about whatever happened to be occupying our minds.',
        'And somewhere along the way, Helen became one of my closest friends.',
        'There was never really a romantic story hiding underneath it. That is actually one of the things that made our friendship so special.',
        'Helen and I were genuinely, completely platonic.',
        'Our friendship wasn’t built on attraction or the possibility that someday it might become something else. We simply liked each other’s minds.',
        'Through high school, other relationships came and went, but somehow we never allowed those relationships to interfere with ours.',
        'Helen was just Helen.',
        'And I was just me.',
        'There was an unusual freedom in that.',
        'I could tell her things.',
        'Really tell her things.',
        'And she could listen without making the conversation about herself, without judging me, and without simply telling me what she thought I wanted to hear.',
        'She was pragmatic.',
        'Sometimes brutally pragmatic.',
        'But she cared.',

        { kind: 'heading', text: 'An Ocean Away' },
        'Eventually, high school ended.',
        {
          text: 'I finished my A-levels and left Zambia for Bradley University in Illinois. Helen eventually went to Haverford College in Pennsylvania.',
          at: 'bradley'
        },
        'Once again, geography put thousands of miles between us.',
        'Once again, it didn’t really matter.',
        {
          text: 'During my first year at Bradley, I went to visit her at Haverford over fall break. I stayed with her, met the new friends she had made there, and we spent an absurd amount of time binge-watching South Park.',
          at: 'haverford'
        },
        'It wasn’t some grand adventure.',
        'And maybe that’s why I remember it so fondly.',
        'It was just two old friends from Zambia, now somehow sitting together at a college in Pennsylvania, laughing at something stupid on television as if all the enormous changes in our lives were perfectly normal.',
        'Our friendship became even stronger.',
        'Helen became something like a spiritual guide for me — not in a religious sense, but as one of those rare people whose perspective you trust when your own becomes cloudy.',
        'And yet, beneath that extraordinary mind, Helen was carrying things of her own.',
        'She struggled.',
        'There were parts of her internal world that even the people who loved her didn’t fully understand.',
        { text: 'At one point she stepped away from Haverford and went to China.', at: 'china' },
        'This was Helen, though, so taking time away from college apparently meant doing things like learning Russian.',
        'She improved her Chinese.',
        'She explored another part of herself and the world.',
        'And we kept talking.',
        'She was one of the smartest people I had ever known. The kind of person who could earn a perfect SAT score seemingly without trying and then casually decide to learn another language.',
        'But intelligence doesn’t protect a person from pain.',
        'I understand that much better now than I did then.',

        { kind: 'heading', text: 'Denver' },
        { text: 'Years later, I moved to Denver.', at: 'denver' },
        'By then Helen had returned to Haverford to finish what she had started.',
        'During that period, she came out to visit me.',
        'I got to show her my new life.',
        'We drove down to Garden of the Gods. We explored Colorado. We talked.',
        'Mostly, I just remember being happy that she was there.',
        'There is something strange about friendships that survive different countries and different versions of yourself. Someone who knew you as a kid in Zambia suddenly appears in the life you’ve constructed as an adult in Colorado.',
        'They connect the pieces.',
        'Helen knew versions of me that almost nobody in my current life knew.',
        'And after that visit, I felt closer to her than ever.',
        { text: 'Eventually she graduated and returned to China.', at: 'china' },
        'We continued talking, but gradually something changed.',
        'Her messages became shorter.',
        'Sometimes there was no response at all.',
        'I knew she had struggled with seasonal depression and other mental-health issues. I could tell that something wasn’t right, even though I didn’t know exactly what was happening.',
        'So I kept reaching out.',
        'I tried to stay positive.',
        'I tried to remind her that I was there.',
        'Sometimes I received a little back.',
        'Sometimes almost nothing.',

        { kind: 'heading', text: 'The Notification' },
        'By then, my own life had moved forward again.',
        {
          text: 'I was engaged and living at Peakview Place in Centennial, Colorado.',
          at: 'peakview'
        },
        'One day, I opened Facebook.',
        'There were posts from mutual friends.',
        { kind: 'found', items: ['Rest in peace, Helen Xiao Yi.'] },
        'I stared at the screen.',
        'It didn’t make sense.',
        'I called friends.',
        'I hoped I had misunderstood something.',
        'I hadn’t.',
        'Helen was gone.',
        'I never received a clear explanation of exactly what happened. Her mother told us that there had been no autopsy, and the circumstances of her death were never fully explained to me.',
        'Over the years, I have had my own thoughts about what might have happened.',
        'But they are only thoughts.',
        'I don’t know.',
        'And I don’t want the mystery of how Helen died to become more important than the truth of how she lived.',

        { kind: 'heading', text: 'The Friend I Still Miss' },
        'Helen genuinely cared about people.',
        'That is what I want to remember.',
        'She was extraordinarily intelligent, but that isn’t really what I miss most.',
        'I miss having someone who understood me.',
        'There are people in my life today whom I love more deeply than I could have understood when Helen and I were kids. I can share my struggles with my wife in a way I share them with no one else.',
        'But friendship occupies a different place.',
        'Sometimes you need someone standing slightly outside your life.',
        'Someone who knows you intimately but isn’t entangled in the consequences of your decisions.',
        'Helen could do that.',
        'She could listen to whatever mess I had created, examine it from every direction and give me an answer that was thoughtful, pragmatic and completely Helen.',
        'I don’t think I will ever have that exact kind of friendship again.',
        'For a long time, that realization made her absence feel even larger.',
        'It still does sometimes.',
        'I wish I could message her.',
        'I wish I could tell her about the strange directions my life has gone.',
        'I wish I could hear what she would make of the person I became.',
        'I wish she could meet the people who are now the center of my world.',
        'And sometimes I simply wish I could ask:',
        { kind: 'found', items: ['“Helen, what do you think?”'] },
        'Because I know she would have thought about it.',
        'Really thought about it.',
        'And then she would have told me.',

        { kind: 'heading', text: 'What We Don’t See' },
        'There is something else I want Helen’s story to say.',
        'Some of the strongest, funniest, kindest and most intelligent people we know are fighting battles that are almost completely invisible to us.',
        'Being brilliant doesn’t make you immune.',
        'Being loved doesn’t make you immune.',
        'Being the person everyone else comes to for advice doesn’t mean you aren’t struggling yourself.',
        'We are often embarrassed to admit when our own minds are hurting. We convince ourselves that we should be able to reason our way out of it, endure it quietly, or avoid burdening the people around us.',
        'But asking for help is not an intellectual failure or a personal weakness.',
        'If something inside you is becoming too heavy to carry alone, tell someone.',
        'And if someone you care about begins disappearing behind shorter messages, cancelled plans, silence or distance, keep reaching toward them.',
        'You may not understand what they are carrying.',
        'You don’t have to.',
        'Just remind them that they don’t have to carry it entirely alone.',
        'I don’t know whether anything could have changed what happened to Helen.',
        'I won’t pretend that I do.',
        'What I do know is that I am grateful that, for a portion of my life, our paths crossed.',
        'A boy transferred schools in Zambia and got moved into a harder math class.',
        'There was a girl sitting there who could finish the mental arithmetic before everyone else.',
        'She helped him catch up.',
        'And somehow, from that tiny moment came a friendship that crossed Zambia, India, America, China and decades of change.',
        'Helen helped me through much more than math.',
        'She understood me.',
        'I miss her.',
        'I still think about her.',
        {
          text: 'And wherever this strange universe keeps the traces of the people who have passed through our lives, I hope some trace of her remains.',
          at: 'remains'
        },
        {
          kind: 'dedication',
          text: 'For Helen Xiao Yi Huang.',
          line: 'My friend, my guide, and one of the finest minds I ever knew.'
        }
      ],
      artifact: {
        label: 'Memory artifact',
        title: 'A mental arithmetic problem',
        lines: [
          { label: '1997', text: 'She finished first. Then she helped me catch up.' },
          { label: 'Since', text: 'She helped me through much more than math.' }
        ]
      },
      source: 'Karsh',
      relatedStories: ['momo', 'hi-guys'],
      dateAdded: '2026-08-18'
    },

    {
      id: 'someone-dumped-my-bike',
      title: 'Someone Dumped My Bike',
      hook: 'My first motorcycle, my first mountain road, and a trade that seemed fair at the time.',
      year: 2011,
      approximateDate: '2011',
      strand: 'karsh',
      location: 'Colorado',
      place: 'lookout-mountain',
      landmark: {
        name: 'Lookout Mountain',
        query: 'Lookout Mountain Golden Colorado'
      },
      journey: [
        {
          id: 'denver',
          place: 'denver',
          flag: '🏍',
          label: 'Denver, Colorado',
          note: 'A 2007 Kawasaki ZZR600, red and black'
        },
        {
          id: 'lookout',
          place: 'lookout-mountain',
          flag: '⛰',
          label: 'Lookout Mountain',
          note: 'The first real ride'
        },
        {
          id: 'waterfront',
          place: 'lakewood',
          flag: '🏠',
          label: 'Waterfront Apartments, Lakewood',
          note: 'Jewell and Kipling. Thirty minutes of pacing.'
        },
        {
          id: 'remembered',
          arrival: true,
          flag: '✦',
          label: 'Fifteen years later',
          note: 'The scratches turn out to be the best part'
        }
      ],
      category: 'chaos',
      tags: [
        'colorado', 'denver', 'lakewood', 'motorcycle', 'friends',
        'mountains', 'first job', 'growing up', 'funny memories'
      ],
      people: [
        { name: 'Karsh', relation: 'me, newly licensed' },
        { name: 'Josh', relation: 'gearhead, and the reason for all this' },
        { name: 'Dane', relation: 'a rider, and a prankster' },
        { name: 'Mike' }
      ],
      story: [
        {
          text: 'When I moved to Colorado in 2011, I had just started my first real job. For the first time, I was earning a paycheck, building up some savings, and getting a little taste of independence.',
          at: 'denver'
        },
        'And naturally, I decided to spend some of those first few paychecks on something extremely practical.',
        '*A motorcycle.*',
        'I’d wanted one for years.',
        'This wasn’t completely impulsive, though. Before buying anything, I’d done my homework. I researched motorcycles obsessively, learned the basics of riding, took a motorcycle riding course, practiced whenever I could, and eventually earned my motorcycle endorsement.',
        'Still, “licensed to ride a motorcycle” and “actually knows what he’s doing on a motorcycle” are two slightly different things.',
        'I was definitely still in the learning phase.',
        'After searching around Denver for quite a while, I finally found the bike.',
        'A 2007 Kawasaki ZZR600, red and black.',
        'It was beautiful.',
        'For me, it hit the perfect balance — affordable enough for someone spending his first real savings, but fast enough to be genuinely exciting. It was a proper sport bike, but comfortable enough that I could actually imagine riding it regularly.',
        'My buddy Dane helped me through the buying process. Dane was already a motorcycle rider and knew considerably more about bikes than I did, so having him there gave me some confidence.',
        'Then came the day I had been waiting for.',
        'My first real ride.',
        'Until then, most of my riding had been confined to parking lots and practice areas. I had only ridden a handful of times, so I was extremely cautious. But eventually, you have to leave the parking lot.',
        { text: 'A few of us decided to head up toward Lookout Mountain.', at: 'lookout' },
        'There was Dane, Mike, my buddy Josh, and me.',
        'Josh deserves his own Butterfly Trail someday because the story of how we met and became such good friends is another adventure entirely. But for this story, the important thing to know is that Josh was a gearhead.',
        'He had a Subaru WRX STI that he absolutely loved. He was particular about that car, protective of it, and very much into anything involving engines and speed.',
        'So we headed into the mountains.',
        'For me, it was incredible.',
        'I was finally riding my motorcycle on an actual Colorado mountain road. Every mile made me a little more comfortable. The nervousness started fading, the movements became more natural, and I began experiencing exactly what I’d imagined when I’d dreamed about owning a bike.',
        'On the way back, Josh mentioned that he’d grown up riding dirt bikes.',
        'Naturally, he wanted to try mine.',
        'And then he made me an offer.',
        'He would ride my motorcycle back to the apartments, and I could drive his STI.',
        'Considering how protective Josh was of that car — and considering how much I loved it — that seemed like a pretty good trade.',
        'So we swapped.',
        {
          text: 'At the time, we lived at the Waterfront Apartments in Lakewood, near Jewell and Kipling. That apartment complex was where I’d met my first real group of friends after moving to Colorado, and it became the center of a lot of memories from those early years.',
          at: 'waterfront'
        },
        'I drove Josh’s STI back.',
        'Dane rode his motorcycle.',
        'Mike rode his.',
        'And Josh rode my beautiful, newly purchased, red-and-black ZZR600.',
        'Somewhere along the way, traffic separated us.',
        'We got back to the apartments.',
        'Josh didn’t.',
        'At first, nobody thought much of it.',
        'A few minutes passed.',
        'Then a few more.',
        'Then ten.',
        'Then twenty.',
        'Eventually, I started pacing.',
        'Where the hell is this guy?',
        'The excitement of the day was slowly being replaced by a much worse feeling.',
        'I started imagining possibilities.',
        'Had he crashed?',
        'Was he hurt?',
        'Was my bike destroyed?',
        'And honestly, probably in exactly that order.',
        'Mostly.',
        'After what felt like forever — probably around thirty minutes — I finally saw the last two members of our group coming toward the apartments.',
        'Dane was in front.',
        'Josh was behind him.',
        'Relief.',
        'Then Dane pulled up.',
        'Now, Dane has always been a prankster, so when he looked at me and casually said,',
        '“Well… someone dumped your bike.”',
        'I laughed.',
        'Very funny.',
        'Then Josh rolled in behind him.',
        'Slowly.',
        'And I noticed blood on his elbow.',
        'Oh.',
        { kind: 'beat', text: 'Dane wasn’t joking.' },
        'Josh had actually crashed my motorcycle.',
        'The motorcycle I had just bought.',
        'The motorcycle I had spent my first savings on.',
        'The motorcycle that, until that day, had barely even experienced the outside world.',
        'My bike had been dumped before I had even gotten the opportunity to dump it *myself*.',
        'Fortunately, the most important thing was immediately obvious: Josh was okay. He’d gotten scraped up, but there were no serious injuries.',
        'The bike was okay too.',
        'Mostly.',
        'The damage was cosmetic.',
        'But something about seeing my brand-new-to-me motorcycle scratched up on its very first adventure made one lesson extremely clear:',
        'Motorcycles are no joke.',
        'You can take the classes. You can get the endorsement. You can research everything. You can be confident. You can have experience.',
        'And things can still go wrong very quickly.',
        'It gave me a new respect for riding — and probably made me a more cautious rider afterward.',
        'As for Josh?',
        'He’s still one of my great friends.',
        'I forgave him.',
        'Eventually.',
        'Mostly.',
        'And yes, over the years that followed, I dropped the bike myself a few times. I eventually sold the ZZR600, and that chapter of my life came to an end.',
        'But there is still one tiny injustice that remains unresolved.',
        'I really wish I’d gotten to dump my own motorcycle before Josh did.',
        'At the time, seeing those scratches made me furious.',
        {
          text: 'Fifteen years later, they are part of what makes the memory so good.',
          at: 'remembered'
        },
        'The first motorcycle I ever owned.',
        'My first real ride into the Colorado mountains.',
        'One of my first groups of friends in my new home.',
        'And the day I learned that sometimes the things that go wrong become the parts of the story you remember best.',
        'These days, I can tell it with a big smile instead of an angry face.',
        'Although, Josh…',
        { kind: 'landing', text: 'I’m still counting that one.' }
      ],
      artifact: {
        label: 'Memory artifact',
        title: 'Scratches on a red-and-black ZZR600',
        lines: [
          { label: 'At the time', text: 'Furious.' },
          { label: 'Fifteen years later', text: 'Part of what makes the memory good.' }
        ]
      },
      source: 'Karsh',
      relatedStories: ['momo', 'gin-joints'],
      dateAdded: '2026-08-19'
    },

    {
      id: 'my-dearest-sons',
      title: 'My Dearest Sons',
      hook: 'A letter from your father, with a brave face but without hiding the truth.',
      year: 2026,
      approximateDate: 'The morning of 15th August',
      strand: 'dad',
      location: 'A foreign land',
      place: 'america',
      journey: [
        {
          id: 'india',
          place: 'india',
          flag: '🇮🇳',
          label: 'India',
          note: 'A village, a medical college, a Tiranga going up'
        },
        {
          id: 'zambia',
          place: 'zambia',
          flag: '🇿🇲',
          label: 'Zambia',
          note: 'Where you actually grew up'
        },
        {
          id: 'america',
          place: 'america',
          flag: '🇺🇸',
          label: 'America',
          note: 'A foreign land. Where the letter is written from.'
        },
        {
          id: 'moved',
          arrival: true,
          flag: '✦',
          label: 'It has moved into you',
          note: 'Not a place. Two pillars standing tall.'
        }
      ],
      category: 'love',
      tags: [
        'india', 'zambia', 'america', 'family', 'fathers', 'friendship',
        'grief', 'independence day', 'medical school', 'poetry', 'ageing',
        'immigration', 'hindi'
      ],
      people: [
        { name: 'Dad', relation: 'the writer' },
        { name: 'Sunil Saxena', relation: 'his best friend' },
        { name: 'Karsh' },
        { name: 'Kush' }
      ],
      story: [
        {
          text: 'My Dearest Sons,',
          at: 'india'
        },
        'You were so small when you lived in India that you hardly remember it. You grew up mostly in Zambia, and now you are building your own lives in America. You have lived in three countries, but you have known your father in only one form. Strong. A pillar. That is why I am writing you this one long letter today, with all the facts of my life put together, tenderly and truly, with a brave face but without hiding the truth.',
        'At 70, I can say one thing with absolute certainty, you both are extremely loving, sensitive and very, very intelligent, and you love me and respect me genuinely. At my age, I cannot be wrong about this. That knowledge is my final gold medal.',
        'I want to start this letter from where this whole storm started in my heart this morning.',
        'I was writing in Hindi to myself, a line that has been haunting me for days:',
        {
          kind: 'verse',
          lang: 'hi-Latn',
          text: 'Jaise jaise hum zindagi ki raah mein aage jaate hain, kuch na kuch peeche chhoot jaata hai. Kuch nahi, hamari aatma ke tukde peeche chhoot jaate hain.',
          meaning: 'As we move forward on the road of life, we leave behind chunks of our own soul.'
        },
        'First the house is left behind, then the family, then the neighborhood, then childhood, then the city. Then rozi roti, our work, or call it prarabdha, our destiny, drags many of us out of our own country. We become immigrants in a foreign land. And now, at this age, even memories are slowly leaving me. Slowly, quietly, they are saying goodbye.',
        'Today that pain is sharper because today is 15th August, India’s Independence Day. I am an Indian by birth. That is why this storm is so strong today. For you it may be just a date on the American calendar, because you were too small to remember it. For me it is the day my chest used to swell. I remember the white shirt ironed by my mother the night before, the dusty school ground, the PT teacher shouting, and the Tiranga going up slowly while we all sang Jana Gana Mana with all our strength. I wrote about all this yesterday for my old batchmates group, and they said it touched their hearts. Because we all left that same ground and got scattered.',
        'But today there is not one storm in my heart, there are two storms colliding. The second storm came two days ago.',
        'Two days ago, I lost my best friend, Sunil Saxena. With him, a part of my life and a part of my soul has been cut off. I am crying a very silent cry.',
        'I have never told you fully how much I owe to Sunil. I want you to know him, because you carry his gift inside you.',
        'I entered medical school as a village bum. A scared, shy, timid, unpolished boy from a village who did not know how to speak in a city college.',
        'I failed my very first stage viva in MBBS, in Anatomy.',
        'I thought I was finished. I thought I did not belong there.',
        'That is when Sunil took me under his wings. He was intellectually generous in a way very few people are. He did not give me sympathy, he gave me confidence. He helped me realize who I was, and who I could become.',
        'He helped me discover myself.',
        'Whenever I shook, he would give that big, unforgettable smile of his and say,',
        {
          kind: 'verse',
          lang: 'hi-Latn',
          text: 'Arre yaar, ye toh tumhare liye kuch nahi hai.',
          meaning: 'This is nothing for you.'
        },
        {
          text: 'My sons, you have heard me say that exact line to you your whole life, in Zambia when you fell from your cycle, in America when you were struggling for a job. Now you know where your father got it from. I got it from Sunil.',
          at: 'zambia'
        },
        'My entire journey, from failing my first examination — Anatomy viva — to winning the Gold Medal in Pediatrics, that journey is his.',
        'My journey from hiding my poems to winning the Gold Medal in Hindi Poetry at Medifest, that journey is also his.',
        'He is the one who told me my inner poet should be allowed to bloom. He shaped a village bum into a gold medalist.',
        'And now he is gone. And I have learned the most painful line of my original reflection:',
        {
          kind: 'verse',
          lang: 'hi-Latn',
          text: 'Dost bhi peeche chhoot jaate hain.',
          meaning: 'Friends, too, get left behind.'
        },
        'I told you I have two storms. One is the joy of Independence Day, the memory of my Tiranga.',
        'The other is the grief of losing Sunil, a loss of a part of my soul.',
        {
          text: 'Between these two storms, I am standing on a foreign land, remembering a country you hardly remember, remembering a friend you never met but who made your father.',
          at: 'america'
        },
        'And that brings me to my third and deepest fear, which is about you both.',
        'I love you both so much that I am scared. Really, really scared.',
        'I feel my power declining. I feel my steps becoming slower. I feel I am nearing my final station, where one day I will have to leave the train.',
        'My fear is not about leaving the train. My fear is about how you will see your father leaving it. You have always seen me as a strong pillar in your life. How will you see that pillar gradually eroding? How will you see your father, who you always saw as strong, getting older, repeating a story, searching for a name, holding your hand a little tighter for balance?',
        'I can go on and on, but you get the idea. I have spent my life protecting you from every storm. I want to keep a brave face. I do not want my fear to become your burden.',
        'But please always remember a brave face is not a false face.',
        'A brave face is a face that tells the truth *tenderly*.',
        'So here is the tender and real truth:',
        'Yes, I am getting older. That is real. I will not hide it.',
        'But no, my love for you is not eroding. My pride in you is not eroding.',
        'You lived in India when you were too small to remember, you lived in Zambia where you actually grew up, and now you live in America where you are becoming men I am so proud of.',
        'You too have left behind so much yourselves, just like me. You know what leaving means.',
        'And still, you carry your father with love and respect.',
        'That is why I know my strength has not disappeared.',
        { text: 'It has just moved. It has moved into you.', at: 'moved' },
        'So when you see my steps slow down, do not see a pillar eroding.',
        'See a pillar that has successfully transferred its strength into two other pillars, which are now standing tall in America.',
        'My heart today is full of three songs that I have been humming since morning. Let me give them to you with their meaning, so you remember them even if you hardly remember India:',
        {
          kind: 'verse',
          lang: 'hi-Latn',
          text: 'Koi lauta de mere beete hue din.',
          meaning: 'Someone, please bring back my bygone days.'
        },
        {
          kind: 'verse',
          lang: 'hi-Latn',
          text: 'Zindagi ke safar mein guzar jaate hain jo mukaam, woh phir nahi aate.',
          meaning: 'The milestones we pass on the journey of life never come again.'
        },
        {
          kind: 'verse',
          lang: 'hi-Latn',
          text: 'Main jahan rahun, main kahin bhi hun, teri yaad saath hai.',
          meaning: 'Wherever I am, wherever I live, your memory is with me.'
        },
        'That memory is my house, my village, my India, my Zambia, my batchmates, and Sunil Saxena. And that memory is you both.',
        'My body is in a foreign land, yours is in America, but my soul today is in India, hoisting the flag, and right next to Sunil, who is still smiling and saying, “Arre yaar, ye toh tumhare liye kuch nahi hai.”',
        'Take this letter as my whole life combined. The boy who left his home, the student who failed and then won gold medals because of a friend, the Indian who still cries on 15th August, the friend who lost a part of his soul two days ago, and the father who is scared because he loves his sons so much, but who is keeping a brave face because he loves you even more.',
        { kind: 'landing', text: 'If you ever see tears in my eyes, do not think the pillar has fallen. Think that your father loves you so much that his eyes could not hold it anymore.' },
        { kind: 'dedication', text: 'Always yours,', line: 'Dad' }
      ],
      artifact: {
        label: 'Memory artifact',
        title: '“Arre yaar, ye toh tumhare liye kuch nahi hai.”',
        lines: [
          { label: 'Sunil said it to Dad', text: 'A village boy who had just failed his first viva.' },
          { label: 'Dad said it to us', text: 'In Zambia, off a bicycle. In America, out of work.' }
        ]
      },
      source: 'Dad',
      relatedStories: ['helen'],
      dateAdded: '2026-08-19'
    },

    {
      id: 'the-big-secret',
      title: 'The Big Secret Under the Pool',
      hook: 'Three in the morning, and they had found something that could not wait.',
      year: 2013,
      approximateDate: '2013',
      strand: 'karsh',
      location: 'Denver, Colorado',
      place: 'denver',
      category: 'family-lore',
      tags: [
        'denver', 'colorado', 'brothers', 'roommates', 'friends',
        'funny memories', 'the 300 building'
      ],
      people: [
        { name: 'Karsh', relation: 'me, asleep' },
        { name: 'Kush', relation: 'my brother, visiting' },
        { name: 'Josh', relation: 'my roommate' }
      ],
      story: [
        'In 2013, I was living in downtown Denver with my roommate Josh at the 300 building.',
        'That year, my brother Kush came to visit me in Colorado. We had a great time while he was there, and one weekend the three of us decided to go out and party.',
        'It had been a stressful week for me, though, and at some point my body decided it was done.',
        'I went home and went to bed.',
        'Kush and Josh, apparently, were nowhere near done.',
        'Sometime around 3:00 in the morning, I was abruptly woken up by the two of them.',
        'They were extremely excited.',
        'They had discovered something.',
        'Something important.',
        'A big secret.',
        'I was half asleep, completely disoriented, and had absolutely no idea what they were talking about. But they insisted that I get up because I had to see what they had found.',
        'So, against my better judgment, I followed them.',
        'They led me down toward the apartment’s swimming pool.',
        'At this point I’m probably imagining that they’ve found some hidden rooftop access, a secret room, an underground tunnel — something that might remotely justify waking a sleeping person at three in the morning.',
        'No.',
        'Their incredible discovery was…',
        { kind: 'reveal', text: 'the pool equipment room.' },
        'Somehow, Kush and Josh had discovered the chlorine and chemical storage and pump area underneath the apartment swimming pool.',
        'And they were absolutely fascinated by it.',
        'Pumps.',
        'Pipes.',
        'Pool chemicals.',
        'This was the big secret that apparently could not wait until morning.',
        'I stood there, barely conscious, trying to understand why two grown men had dragged me out of bed at 3:00 a.m. to proudly show me the *mechanical infrastructure* of our apartment swimming pool.',
        'They thought it was hilarious.',
        'I did not.',
        'At the time, I hated them for waking me up. I thought the entire thing was one of the stupidest things I’d ever experienced.',
        'Which, of course, is exactly why I remember it.',
        'More than a decade later, we still laugh about the night Kush and Josh made the archaeological discovery of the century beneath a downtown Denver swimming pool.',
        'To this day, I have no idea how long those two were hanging around down there — or how many chemical fumes they inhaled.',
        { kind: 'landing', text: 'But considering the people they became, I can’t completely rule out a connection.' }
      ],
      artifact: {
        label: 'Memory artifact',
        title: 'A pool equipment room, 300 building',
        lines: [
          { label: 'At 3:00 a.m.', text: 'The archaeological discovery of the century.' },
          { label: 'In daylight', text: 'Pumps. Pipes. Pool chemicals.' }
        ]
      },
      source: 'Karsh',
      relatedStories: ['gin-joints', 'someone-dumped-my-bike'],
      dateAdded: '2026-08-19'
    }
  ];

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

    /* The braid only holds together if every reference resolves and every
       line knows when it starts. A year of null is allowed and means the
       date is unknown; a missing year is a mistake. */
    STRANDS.forEach(function (s) {
      var at = 'strand ' + s.id;
      if (s.base && !strandIds[s.base]) out.push(at + ': unknown base "' + s.base + '"');
      if (s.base === s.id) out.push(at + ': is its own base');

      var start = s.start || {};
      if (['origin', 'born', 'begins', 'union'].indexOf(start.kind) < 0) {
        out.push(at + ': start.kind must be origin, born, begins or union');
      }
      if (start.kind !== 'origin' && !('year' in start)) {
        out.push(at + ': a ' + start.kind + ' strand needs a start year (null if unknown)');
      }
      if (start.kind === 'born' && !s.base) {
        out.push(at + ': a born strand needs a base to branch out of');
      }

      var end = s.end || {};
      if (['open', 'joins'].indexOf(end.kind) < 0) {
        out.push(at + ': end.kind must be open or joins');
      }
      if (end.kind === 'joins') {
        if (!strandIds[end.into]) out.push(at + ': joins unknown strand "' + end.into + '"');
        if (end.into === s.id) out.push(at + ': joins itself');
        if (!('year' in end)) out.push(at + ': a joining strand needs a year (null if unknown)');
      }
    });

    /* A base chain that loops would send the geometry round for ever. */
    STRANDS.forEach(function (s) {
      var seen = {}, cur = s, hops = 0;
      while (cur && cur.base && hops++ < 24) {
        if (seen[cur.id]) { out.push('strand ' + s.id + ': base chain loops'); break; }
        seen[cur.id] = true;
        cur = STRANDS.filter(function (x) { return x.id === cur.base; })[0];
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
      var stopIds = {};
      (s.journey || []).forEach(function (stop, si) {
        if (!stop.id) out.push(at + ': journey stop ' + si + ' has no id');
        if (stopIds[stop.id]) out.push(at + ': journey has two stops called "' + stop.id + '"');
        stopIds[stop.id] = true;
        if (!stop.label) out.push(at + ': journey stop "' + stop.id + '" has no label');
        if (stop.place && !placeIds[stop.place]) {
          out.push(at + ': journey stop "' + stop.id + '" is at unknown place "' + stop.place + '"');
        }
        if (!stop.place && !stop.arrival) {
          out.push(at + ': journey stop "' + stop.id +
            '" has no place and is not marked as an arrival');
        }
      });

      var LISTED = ['plan', 'found'];        /* kinds whose content is `items` */
      /* kinds whose content is `text` */
      var SPOKEN = ['shout', 'beat', 'landing', 'heading', 'sound', 'reveal',
                    'dedication', 'verse'];
      (s.story || []).forEach(function (p, pi) {
        if (typeof p === 'string' || !p) return;
        var where = at + ': paragraph ' + pi;
        if (p.kind && LISTED.indexOf(p.kind) < 0 && SPOKEN.indexOf(p.kind) < 0) {
          out.push(where + ' has an unknown kind "' + p.kind + '"');
        }
        if (LISTED.indexOf(p.kind) >= 0 && !(p.items && p.items.length)) {
          out.push(where + ' is a ' + p.kind + ' with nothing in it');
        }
        if (SPOKEN.indexOf(p.kind) >= 0 && !p.text) {
          out.push(where + ' is a ' + p.kind + ' with no text');
        }
        if (!p.kind && !p.text) out.push(where + ' is an object with no text');
        if (p.at && !stopIds[p.at]) {
          out.push(where + ' happens at "' + p.at + '", which is not a stop on this journey');
        }
      });

      var artifacts = Array.isArray(s.artifact) ? s.artifact : (s.artifact ? [s.artifact] : []);
      artifacts.forEach(function (a, ai) {
        if (!a.title && !a.line && !(a.lines && a.lines.length)) {
          out.push(at + ': artifact ' + ai + ' has nothing in it');
        }
      });
      if (s.landmark && !s.landmark.name) out.push(at + ': landmark needs a name');
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
