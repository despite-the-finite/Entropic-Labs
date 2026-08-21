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
   warning         a line, or an array of lines, telling the reader what
                   they are walking into: blood, grief, an argument still
                   running. Printed above the telling, because a warning
                   that arrives late is not one.
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
                     { kind: 'figure', alt: 'What the chart shows.',
                       caption: 'What it is called.',
                       svg: '<svg viewBox="0 0 320 190">…</svg>' }
                         a drawing the room cannot compute — a chart, a
                         diagram, a joke with axes. `alt` is what it says
                         to somebody who cannot see it, and is required
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

                   Also inside any paragraph, [[story-id]] links to another
                   memory and titles itself from the archive, and
                   [[story-id|in my own words]] does the same while saying
                   it your way. For a memory that refers to another one
                   mid-sentence; an unknown id prints as plain text.

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
      id: 'trestle',
      name: 'Trestle Bike Park',
      region: 'Winter Park, Colorado',
      country: 'United States',
      lat: 39.87,
      lon: -105.77
    },
    {
      id: 'emerald-mountain',
      name: 'Emerald Mountain',
      region: 'Steamboat Springs, Colorado',
      country: 'United States',
      lat: 40.48,
      lon: -106.85
    },
    {
      id: 'ken-caryl',
      name: 'Ken-Caryl',
      region: 'Colorado',
      country: 'United States',
      lat: 39.57,
      lon: -105.13
    },
    {
      id: 'chatfield',
      name: 'Chatfield State Park',
      region: 'Littleton, Colorado',
      country: 'United States',
      lat: 39.54,
      lon: -105.07
    },
    {
      id: 'lusaka',
      name: 'Lusaka',
      country: 'Zambia',
      lat: -15.42,
      lon: 28.28
    },
    {
      id: 'livingstone',
      name: 'Livingstone',
      region: 'Southern Province',
      country: 'Zambia',
      lat: -17.85,
      lon: 25.87
    },
    {
      id: 'avani',
      name: 'Avani Victoria Falls Resort',
      region: 'Mosi-oa-Tunya National Park, Livingstone',
      country: 'Zambia',
      lat: -17.925,
      lon: 25.852
    },
    {
      id: 'livingstone-island',
      name: 'Livingstone Island',
      region: 'Victoria Falls',
      country: 'Zambia',
      lat: -17.9245,
      lon: 25.8545
    },
    {
      /* The one place in this archive that belongs to two countries at
         once, so it is given neither: it spans the Second Gorge with a
         border post at each end. `country` only ever builds a search
         string, so leaving it off costs nothing and claims nothing. */
      id: 'victoria-falls-bridge',
      name: 'Victoria Falls Bridge',
      region: 'Zambia–Zimbabwe border',
      lat: -17.9247,
      lon: 25.8567
    },
    {
      id: 'kolkata',
      name: 'Kolkata',
      region: 'West Bengal',
      country: 'India',
      lat: 22.57,
      lon: 88.36
    },
    {
      id: 'bradley',
      name: 'Bradley University',
      region: 'Peoria, Illinois',
      country: 'United States',
      lat: 40.70,
      lon: -89.62
    },
    {
      id: 'lucknow',
      name: 'Lucknow',
      region: 'Uttar Pradesh',
      country: 'India',
      lat: 26.85,
      lon: 80.95
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
          label: 'The 300 building, Denver',
          note: 'His floor was the 12th. Mine was the 14th.',
          url: 'https://www.google.com/maps/search/?api=1&query=300+E+17th+Ave+Denver+CO'
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
      landmark: {
        name: 'The 300 building',
        query: '300 E 17th Ave Denver CO'
      },
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
    },

    {
      id: 'the-storm',
      title: 'The Storm Is What Calms Me',
      hook: 'Some decisions take weeks of planning. This one was made at a bar.',
      year: 2014,
      approximateDate: '2014',
      strand: 'karsh',
      location: 'Denver, Colorado',
      place: 'denver',
      landmark: {
        name: 'Colfax Avenue',
        query: 'Colfax Avenue Denver Colorado'
      },
      journey: [
        {
          id: 'williams',
          place: 'denver',
          flag: '🍺',
          label: 'Williams Tavern',
          note: 'Where the idea was had',
          url: 'https://www.google.com/maps/search/?api=1&query=Williams+Tavern+Denver+Colorado'
        },
        {
          id: 'colfax',
          place: 'denver',
          flag: '🛹',
          label: 'Colfax Avenue',
          note: 'Late, and somebody was still open',
          url: 'https://www.google.com/maps/search/?api=1&query=Colfax+Avenue+Denver+Colorado'
        },
        {
          id: 'still-true',
          arrival: true,
          flag: '✦',
          label: 'More than a decade later',
          note: 'The storm keeps changing. The words do not.'
        }
      ],
      category: 'adventure',
      tags: [
        'denver', 'colorado', 'tattoo', 'colfax', 'skateboarding',
        'friends', 'structural engineering', 'nights out', 'the 300 building'
      ],
      people: [
        { name: 'Karsh', relation: 'me, three tattoos in' },
        { name: 'Kyle Stookey', relation: 'bartender at Williams, and a good friend' }
      ],
      story: [
        'There are some decisions you make after weeks of careful planning.',
        'And then there are decisions you make late at night with a friend, after hanging out at a bar, before grabbing your skateboard and heading toward Colfax Avenue.',
        'This is one of those stories.',
        {
          text: 'In 2014, I was living downtown Denver at the 300 building. By then, Williams Tavern had become one of my regular spots. It was close to home, unpretentious, and filled with characters who gradually became friends.',
          at: 'williams'
        },
        'One of them was Kyle Stookey.',
        'Kyle was a bartender at Williams, but he was also a good friend of mine at the time. We had a lot in common — similar interests, similar views on things, and, perhaps most importantly for this particular story, a shared appreciation for having a very good time.',
        'One night, while Kyle was working and I was hanging out at Williams, we came up with an idea.',
        'We were getting tattoos tonight.',
        'Not tomorrow.',
        'Not after making appointments.',
        'Tonight.',
        'Of course, Kyle still had a shift to finish, so our brilliant plan had to wait until he got off work.',
        'By then it was late.',
        'And we’d been having fun.',
        'The kind of fun that does not traditionally improve a person’s decision-making abilities.',
        'But the plan had been made.',
        { text: 'So we grabbed our skateboards and headed out into downtown Denver.', at: 'colfax' },
        'Our destination was Colfax Avenue.',
        'Anyone who has spent enough time in Denver knows that Colfax has always had a certain reputation. It’s a street where something is always happening. And late at night, when most respectable tattoo shops had long since closed, Colfax seemed like exactly the sort of place where two guys might still find someone willing to permanently alter their bodies.',
        'Eventually, we found one.',
        'Kyle apparently had already reached deep into his soul and determined what permanent symbol best represented his existence on Earth.',
        { kind: 'reveal', text: 'The Miller High Life logo.' },
        'Why?',
        'I genuinely have no idea.',
        'But while Kyle’s inspiration apparently came from the Champagne of Beers, mine had been sitting in my head for quite a while.',
        'Because underneath the ridiculous circumstances of that night, I actually knew exactly what I wanted.',
        'At that point in my life, I was working toward my SE — my Structural Engineering license. It was a serious goal and a difficult one. There was studying ahead of me, pressure ahead of me, and a challenge that I knew wasn’t going to be easy.',
        'People sometimes talk about preparing for difficult things by appreciating the calm before the storm.',
        'I’ve never really understood that.',
        'Waiting makes me restless.',
        'Knowing that something difficult is coming doesn’t make me want to sit peacefully and enjoy the quiet. I’d rather *begin*. I’d rather be moving. I’d rather be solving the problem, climbing the mountain, taking the test — whatever the challenge happens to be.',
        'The anticipation is often worse than the thing itself.',
        'Once I’m actually in it, something changes.',
        'The noise disappears.',
        'There is only the problem in front of me.',
        'And strangely, that’s where I tend to find my calm.',
        'That idea had been circling around in my head long before that night at Williams. The SE was simply the storm immediately in front of me.',
        'So somewhere on Colfax Avenue, ridiculously late at night, after skateboarding across downtown Denver with a bartender who had just permanently pledged allegiance to Miller High Life, I finally put the thought into words.',
        'And then I put those words permanently on myself:',
        {
          kind: 'found',
          items: ['“How can I enjoy the calm before the storm, when the storm is what calms me?”']
        },
        'That became my third tattoo.',
        { text: 'More than a decade later, I still wear it proudly.', at: 'still-true' },
        'Not because of the ridiculous night that produced it.',
        'Not because of Williams Tavern, the skateboards, Colfax, or even the SE.',
        'Because the storm keeps changing.',
        'There is always another difficult thing somewhere ahead.',
        'And all these years later, the words are still true.',
        { kind: 'landing', text: 'The storm is what calms me.' }
      ],
      artifact: {
        label: 'Memory artifact',
        title: 'A third tattoo, somewhere on Colfax',
        lines: [
          { label: 'What it says', text: '“How can I enjoy the calm before the storm, when the storm is what calms me?”' },
          { label: 'Why it is still there', text: 'The storm keeps changing. The words do not.' }
        ]
      },
      source: 'Karsh',
      relatedStories: ['dont-haggle', 'gin-joints'],
      dateAdded: '2026-08-19'
    },

    {
      id: 'sunil',
      title: 'Sunil — The Friend Who Made Me',
      hook: 'A village boy who had just failed Anatomy, and the classmate who decided that was nothing.',
      year: 1973,
      approximateDate: '1973, and everything after',
      strand: 'dad',
      location: 'Lucknow, India',
      place: 'lucknow',
      landmark: {
        name: 'King George’s Medical University',
        query: "King George's Medical University Lucknow"
      },
      journey: [
        {
          id: 'kgmu',
          place: 'lucknow',
          flag: '🇮🇳',
          label: 'King George’s Medical University, Lucknow',
          note: '1973. A failed Anatomy viva.',
          url: 'https://www.google.com/maps/search/?api=1&query=King+George%27s+Medical+University+Lucknow'
        },
        {
          id: 'zambia',
          place: 'zambia',
          flag: '🇿🇲',
          label: 'Zambia',
          note: 'The same sentence, to a boy off his bicycle'
        },
        {
          id: 'america',
          place: 'america',
          flag: '🇺🇸',
          label: 'America',
          note: 'The same sentence, to a young man out of work'
        },
        {
          id: 'still-saying-it',
          arrival: true,
          flag: '✦',
          label: 'Fifty years of saying it',
          note: 'They think the sentence is mine'
        }
      ],
      category: 'triumphs',
      chaosEvent: true,
      tags: [
        'india', 'lucknow', 'medical school', 'friendship', 'poetry',
        'zambia', 'america', 'immigration', 'grief', 'hindi', 'fathers'
      ],
      people: [
        { name: 'Dad', relation: 'the writer, then a first-year student' },
        { name: 'Sunil Saxena', relation: 'his friend, from 1973' }
      ],
      story: [
        {
          text: 'I met Sunil Saxena in 1973, and I have been living inside the consequences ever since.',
          at: 'kgmu'
        },
        'I came to medical college as a village bum. That is the only honest way to say it. A scared, shy, timid, unpolished boy from a village, who did not know how to speak in a city college.',
        'Then I failed my very first stage viva in MBBS. Anatomy.',
        'I thought I was finished. I thought I did not belong there.',
        'That is when Sunil took me under his wings.',
        'He was intellectually generous in a way very few people are. He did not give me sympathy. He gave me confidence. He helped me realize who I was, and who I could become.',
        'He helped me discover myself.',
        'Whenever I shook, he would give that big, unforgettable smile of his and say:',
        {
          kind: 'verse',
          lang: 'hi-Latn',
          text: 'Arre yaar, ye toh tumhare liye kuch nahi hai.',
          meaning: 'This is nothing for you.'
        },
        'He said it so often that it stopped being encouragement and became a fact about the world.',
        'My entire journey, from failing that first Anatomy viva to winning the Gold Medal in Pediatrics, is his.',
        'And there was a second thing, which I had told nobody. I wrote poems, and I hid them. Sunil is the one who told me my inner poet should be allowed to bloom. I let it bloom, and at Medifest I won the Gold Medal in Hindi Poetry.',
        'He shaped a village bum into a gold medalist.',

        { kind: 'heading', text: 'Everything After Was Leaving' },
        {
          text: 'First the house is left behind, then the family, then the neighborhood, then childhood, then the city. Then rozi roti, our work, or call it prarabdha, our destiny, drags many of us out of our own country altogether.',
          at: 'zambia'
        },
        {
          kind: 'verse',
          lang: 'hi-Latn',
          text: 'Jaise jaise hum zindagi ki raah mein aage jaate hain, kuch na kuch peeche chhoot jaata hai. Kuch nahi, hamari aatma ke tukde peeche chhoot jaate hain.',
          meaning: 'As we move forward on the road of life, we leave behind chunks of our own soul.'
        },
        'I became an immigrant. My sons were too small in India to remember it, grew up in Zambia, and are men in America now.',
        'And every 15th August I am still a boy in a white shirt my mother ironed the night before, standing on a dusty school ground while the PT teacher shouts and the Tiranga goes up and all of us sing Jana Gana Mana with everything we have.',
        'We all left that same ground and got scattered.',

        { kind: 'heading', text: 'Two Days Ago' },
        'Sunil died this year. I am 70.',
        'With him, a part of my life and a part of my soul has been cut off. I am crying a very silent cry.',
        'And I have learned the most painful line of my own reflection:',
        {
          kind: 'verse',
          lang: 'hi-Latn',
          text: 'Dost bhi peeche chhoot jaate hain.',
          meaning: 'Friends, too, get left behind.'
        },

        { kind: 'heading', text: 'What He Actually Gave Me' },
        'For more than fifty years I have been handing out his sentence without telling anyone whose it was.',
        {
          text: 'In Zambia, to a boy who had come off his bicycle. In America, to a young man who could not find work. Arre yaar, ye toh tumhare liye kuch nahi hai.',
          at: 'america'
        },
        { text: 'My sons think it is *mine*.', at: 'still-saying-it' },
        'It is not. It is Sunil’s. It has crossed three countries and two generations on its way to people he never met, and it started in 1973, with a village bum who had just failed Anatomy and a boy who decided that was nothing.',
        { kind: 'landing', text: 'He shaped a village bum into a gold medalist. I have been giving his sentence away ever since.' }
      ],
      artifact: {
        label: 'Memory artifact',
        title: 'Two gold medals',
        lines: [
          { label: 'Pediatrics', text: 'Won by a boy who failed his first Anatomy viva.' },
          { label: 'Hindi Poetry, Medifest', text: 'Won by a boy who used to hide his poems.' }
        ]
      },
      source: 'Dad — drawn from his letter of 15th August',
      consequences: ['my-dearest-sons'],
      relatedStories: ['helen'],
      dateAdded: '2026-08-19'
    },

    {
      id: 'no-futon',
      title: 'No Futon, No Microwave',
      hook: 'Money for a futon and a microwave, and a decision I did not tell my parents about.',
      year: 2005,
      approximateDate: '2005',
      strand: 'karsh',
      location: 'Peoria, Illinois',
      place: 'bradley',
      landmark: {
        name: 'Bradley University',
        query: 'Bradley University Peoria Illinois'
      },
      journey: [
        {
          id: 'zambia',
          place: 'chingola',
          flag: '🇿🇲',
          label: '54 9th Street, Chingola',
          note: 'Larry’s CD. A guitar that existed only in my imagination.'
        },
        {
          id: 'india',
          place: 'kolkata',
          flag: '🇮🇳',
          label: 'Kolkata · 2003',
          note: 'A guitar store we never got to'
        },
        {
          id: 'illinois',
          place: 'bradley',
          flag: '🇺🇸',
          label: 'Bradley University, Peoria',
          note: 'The futon money, spent',
          url: 'https://www.google.com/maps/search/?api=1&query=Bradley+University+Peoria+Illinois'
        },
        {
          id: 'zambia-again',
          place: 'chingola',
          flag: '🇿🇲',
          label: 'Home again, that summer',
          note: 'Carrying the guitar. No hiding it anymore.'
        },
        {
          id: 'indra',
          arrival: true,
          flag: '❤',
          label: 'Twenty-one years later',
          note: 'Indra reaches for the guitars'
        }
      ],
      category: 'beginnings',
      chaosEvent: true,
      tags: [
        'zambia', 'chingola', 'kolkata', 'peoria', 'guitar', 'music', 'nu metal',
        'parents', 'growing up', 'grief', 'indra', 'colleen'
      ],
      people: [
        { name: 'Karsh', relation: 'me, eighteen' },
        { name: 'Amma' },
        { name: 'Dad' },
        { name: 'Kush', relation: 'my brother' },
        { name: 'Neelabh', relation: 'my cousin' },
        { name: 'Larry', relation: 'our American friend, who brought the CD' },
        { name: 'Colleen' },
        { name: 'Indra', relation: 'my daughter' }
      ],
      story: [
        { text: 'Before I ever owned a guitar, I was obsessed with them.', at: 'zambia' },
        'Growing up in Zambia, getting my hands on an electric guitar wasn’t exactly easy. But somewhere along the way, Western music had started finding its way into my life. Tony Hawk’s Pro Skater introduced me to one corner of it. Hollywood movies and the radio introduced me to others. Zambia had a big R&B scene at the time, so I knew plenty of that too.',
        'Then our American friend Larry brought us a CD.',
        {
          kind: 'found',
          items: ['Chocolate Starfish and the Hot Dog Flavored Water.', 'Limp Bizkit.']
        },
        'It sounds ridiculous now, but that album genuinely changed the trajectory of my life.',
        'Suddenly there was this entire world I hadn’t known existed. Limp Bizkit led to Linkin Park, P.O.D., Korn, System of a Down, and everything surrounding alternative rock and nu metal. I became obsessed with the musicians — the clothes, the attitude, the whole “Jatayu” aesthetic we associated with that era — but especially the guitars.',
        'Those huge, heavy guitars hanging absurdly low.',
        'I wanted one.',
        'Badly.',
        'The problem was that wanting an electric guitar in Zambia and actually getting one were two very different things.',
        'So for a while, the guitar existed mostly in my imagination.',
        { text: 'Then, in 2003, music became tangled up with something much heavier.', at: 'india' },
        'My grandfather was very sick. He had suffered a heart attack followed by organ failure, and my family traveled to Kolkata to see him.',
        'During that trip, my brother and I reconnected with our cousin Neelabh. Music became one of the things that bonded us. He was into Dr. Dre, Eminem and Black Sabbath, along with some of the nu metal my brother and I loved.',
        'And somewhere in that strange intersection of family, music, adolescence and grief, the three of us discovered Evanescence together.',
        'My obsession with guitars went into overdrive.',
        'Near the end of the trip, there was finally a plan.',
        'We were going to a guitar store.',
        'I was going to buy my first guitar.',
        'The day we were supposed to go was the day my grandfather died.',
        'Naturally, we never went.',
        'And suddenly this little dream of mine didn’t seem very important anymore.',
        'The guitar would have to wait.',

        {
          text: 'Two years later, in 2005, I was eighteen years old and a freshman at Bradley University.',
          at: 'illinois'
        },
        {
          kind: 'plan',
          lead: 'During winter break, my parents had me come home to Zambia. Before I returned to the United States for my second semester, they gave me some money for a couple of things I needed for my dorm life:',
          items: ['A futon.', 'A microwave.']
        },
        'Very sensible purchases.',
        'I returned to America and promptly bought neither.',
        'Instead, I took the money my parents had given me, walked into a guitar store, and bought an Epiphone Les Paul starter guitar and a tiny little practice amp.',
        'No futon.',
        'No microwave.',
        'I could sit on the floor.',
        'I could eat cold food.',
        'But now I had a guitar.',
        'And it remains one of the best financial decisions I have ever made.',
        'I practiced constantly.',
        'At first, of course, I was terrible. There is no graceful way to learn guitar. Your fingers hurt. Chords buzz. Notes die halfway through. Your hands seem physically incapable of doing what your brain is asking them to do.',
        'But I kept playing.',
        'And playing.',
        'And playing.',
        'Eventually, I became pretty good.',
        'That cheap Epiphone became one of my treasures.',
        'There was just one problem.',
        'I hadn’t told my parents.',
        'For some reason, eighteen-year-old me had convinced himself that they would be furious. They had given me money for useful things, and I had blown it on a guitar and amplifier.',
        'So I hid my great act of financial rebellion from them for an entire semester.',
        'Then summer came.',
        'It was time to go home.',
        'Normally, I traveled with my skateboard. But this time there was something more important coming with me.',
        'The guitar took the skateboard’s place as my carry-on priority, and through some feat of teenage engineering, I managed to creatively pack the double-kick skateboard into my large checked bag.',
        { text: 'I arrived home in Zambia carrying my guitar.', at: 'zambia-again' },
        'There wasn’t really any hiding it anymore.',
        'So I finally confessed.',
        'I didn’t have a futon.',
        'I didn’t have a microwave.',
        'I had an Epiphone Les Paul.',
        'I waited for the reaction I had spent months imagining.',
        'And my parents surprised me.',
        'They weren’t angry.',
        { kind: 'reveal', text: 'They were proud.' },
        'If anything, they seemed more concerned that I had thought I needed to hide it from them.',
        'That summer, I played constantly. I was still mediocre, stumbling my way through songs and techniques I hadn’t mastered yet.',
        'But I remember my parents listening.',
        'And I remember the pride on their faces.',
        'Something clicked for me then.',
        'I had spent months believing that becoming my own person meant hiding parts of myself from my parents. Maybe that is something a lot of eighteen-year-olds believe. Independence feels like secrecy. You think adulthood means making decisions without anyone knowing.',
        'But watching them listen to me play, I realized I had misunderstood them.',
        'They weren’t disappointed that I had chosen something different.',
        'They were happy that I had chosen something I loved.',
        'That guitar became an inflection point in my life.',
        'Not just because it taught me how to play music.',
        'It taught me something about my parents.',
        'And it taught me something about myself.',
        'From then on, I became a little more willing to let them see who I actually was.',

        'That cheap Epiphone ended up having an absurdly large impact on my life.',
        'The guitar became part of my identity. It gave me countless memories, friendships, jam sessions and creative outlets.',
        'I would even argue that knowing how to play guitar played a nontrivial role in convincing Colleen that dating me might be a good idea.',
        'So, really, that futon money turned out to be an excellent investment.',
        'Today, things are a little different.',
        'I own several beautiful guitars, including a PRS Hollowbody II — a spectacular instrument that costs about as much as an entry-level car.',
        'Eighteen-year-old me would lose his mind if he saw it.',
        'I love that guitar. I’ve worked hard, and I feel like I’ve earned the privilege of owning something like it.',
        'But these days the challenge isn’t finding a guitar.',
        'It’s finding the time to play one.',
        'And lately I’ve been reminded that I should.',
        { text: 'Because when I pick up a guitar, Indra watches.', at: 'indra' },
        'She loves hearing me play. She gravitates toward the guitars and the ukulele. She wants to touch them, strum them, make noise with them and figure out what these strange wooden things can do.',
        'And when I watch her, I recognize something.',
        'That fascination.',
        'That pull toward an instrument before you have any idea what you’re doing with it.',
        'I know that feeling.',
        'I was that kid once.',
        'And now I find myself watching her with the same quiet pride I once saw on my parents’ faces while their eighteen-year-old son played his secretly purchased guitar for them in Zambia.',
        'I thought buying that Epiphone was an act of defiance.',
        'It wasn’t.',
        'It was one of the first decisions I made entirely because something inside me said, *This matters to you.*',
        'Twenty-one years later, I finally understand why my parents smiled.',
        'And if Indra someday spends the money I give her for something sensible on a guitar instead?',
        { kind: 'landing', text: 'I suppose I’ll have absolutely no right to complain.' }
      ],
      artifact: {
        label: 'Memory artifact',
        title: 'An Epiphone Les Paul and a tiny practice amp',
        lines: [
          { label: 'What it cost', text: 'A futon and a microwave.' },
          { label: 'What it bought', text: 'Twenty-one years of playing, and one conversation with my parents.' }
        ]
      },
      source: 'Karsh',
      relatedStories: ['beatbox', 'my-dearest-sons'],
      dateAdded: '2026-08-19'
    },

    {
      id: 'damn-google',
      title: 'Damn Google',
      hook: 'The time we accidentally left Zambia.',
      year: 2023,
      approximateDate: '2023',
      strand: 'karsh',
      location: 'Livingstone, Zambia',
      place: 'livingstone',
      landmark: {
        name: 'Victoria Falls Bridge',
        query: 'Victoria Falls Bridge'
      },
      journey: [
        {
          id: 'lusaka',
          place: 'lusaka',
          flag: '🇿🇲',
          label: 'Lusaka',
          note: 'Landed. A few days with my parents.'
        },
        {
          id: 'livingstone',
          place: 'livingstone',
          flag: '🇿🇲',
          label: 'Livingstone',
          note: 'Dancers at the airport. Indra preferred the bus.'
        },
        {
          id: 'avani',
          place: 'avani',
          flag: '🦓',
          label: 'Avani Victoria Falls Resort',
          note: 'Inside Mosi-oa-Tunya. Zebras on the lawn.'
        },
        {
          id: 'bridge',
          place: 'victoria-falls-bridge',
          flag: '🇿🇼',
          label: 'Victoria Falls Bridge',
          note: 'One direction Zambia. The other Zimbabwe.',
          url: 'https://www.google.com/maps/search/?api=1&query=Victoria+Falls+Bridge'
        },
        {
          id: 'immigration',
          place: 'victoria-falls-bridge',
          flag: '🛂',
          label: 'Back through immigration',
          note: 'Fifteen minutes. Amma negotiating.',
          url: 'https://www.google.com/maps/search/?api=1&query=Victoria+Falls+Bridge'
        },
        {
          id: 'devils-pool',
          place: 'livingstone-island',
          flag: '🌊',
          label: 'Livingstone Island · Devil’s Pool',
          note: 'High tea at the lip of the Falls',
          url: 'https://www.google.com/maps/search/?api=1&query=Livingstone+Island+Victoria+Falls+Zambia'
        },
        {
          id: 'mukuni',
          place: 'livingstone',
          flag: '🦁',
          label: 'Mukuni Big 5 Safaris',
          note: 'Mukuni Road. The lions.',
          url: 'https://www.google.com/maps/search/?api=1&query=Mukuni+Big+5+Safaris+Mukuni+Road+Livingstone+Zambia'
        }
      ],
      category: 'adventure',
      tags: [
        'zambia', 'zimbabwe', 'livingstone', 'victoria falls', 'lusaka',
        'family', 'travel', 'borders', 'google maps', 'indra', 'colleen',
        'amma', 'funny memories'
      ],
      people: [
        { name: 'Karsh', relation: 'me' },
        { name: 'Colleen', relation: 'my wife' },
        { name: 'Indra', relation: 'my daughter, aged two' },
        { name: 'Amma', relation: 'the negotiator, again' },
        { name: 'Dad' },
        { name: 'Kush', relation: 'my brother' },
        { name: 'Carole', relation: 'Kush’s wife' }
      ],
      story: [
        { text: 'In 2023, we went back to Zambia.', at: 'lusaka' },
        'Colleen, two-year-old Indra, and I flew to Zambia to visit my parents, with Kush and Carole joining us on the trip. We traveled through Qatar on the way and eventually arrived in Lusaka.',
        'We spent a few days in Lusaka with my parents before setting off on the part of the trip I had been especially excited about:',
        'Livingstone. Victoria Falls.',
        'I hadn’t been to the Falls in decades. And I’d certainly never experienced them as an adult who could fully appreciate all the adrenaline-fueled activities surrounding them.',
        'This time, I wasn’t going there as the kid who had grown up in Zambia.',
        'I was going back with my wife, my two-year-old daughter, and my family.',
        'And I was unbelievably excited.',

        { kind: 'heading', text: 'Welcome to Livingstone' },
        {
          text: 'The trip from Lusaka to Livingstone was a relatively short one, and when we arrived, we were greeted by traditional dancers dressed in colorful local attire, singing, dancing, and welcoming visitors to the area.',
          at: 'livingstone'
        },
        { text: 'From there, we headed to the Avani Victoria Falls Resort.', at: 'avani' },
        'Avani is ridiculous in the best possible way. It sits inside Mosi-oa-Tunya National Park, a few minutes’ walk from the Falls themselves.',
        'Zebras wander across the lawns. Impala graze between buildings. Baboons and vervet monkeys appear wherever they damn well please. Giraffes roam nearby.',
        'It felt less like a hotel and more like someone had built a resort in the middle of a wildlife documentary.',
        'And naturally, surrounded by one of the greatest natural wonders on Earth, exotic African wildlife, and adventures we’d been talking about for months, the most exciting part of the entire journey for two-year-old Indra was…',
        'the bus ride from the Livingstone airport to the hotel.',
        'Of course it was.',

        { kind: 'heading', text: 'Let’s Do Something Stupid' },
        'Once we settled in, everyone started choosing activities.',
        'And I wanted adrenaline.',
        'We booked several adventures, including walking with lions at Mukuni Big Five and the Livingstone Island Devil’s Pool high-tea experience.',
        'Walking next to actual lions?',
        'Sure.',
        'Swimming at the edge of one of the largest waterfalls on Earth?',
        'Absolutely.',
        'These were supposed to be the dangerous parts of the vacation.',
        'They weren’t.',
        'The most adrenaline-filled experience of the entire trip happened because we made one simple mistake:',
        'We followed Google Maps.',

        { kind: 'heading', text: 'A Very Short Geography Lesson' },
        {
          text: 'Victoria Falls sits right along the border between Zambia and Zimbabwe, with the mighty Zambezi River separating the two countries.',
          at: 'bridge'
        },
        'Livingstone sits on the Zambian side.',
        'Victoria Falls town sits across the border in Zimbabwe.',
        'And just downstream from the Falls, spanning the enormous gorge carved by the Zambezi, is the Victoria Falls Bridge. It was thrown across the Second Gorge in 1905, and it has a border post at each end.',
        'One direction:',
        'Zambia.',
        'The other:',
        'Zimbabwe.',
        'This fact will become important shortly.',

        { kind: 'heading', text: 'Damn Google' },
        'The Devil’s Pool high-tea excursion was just for Colleen and me, with Amma coming along for the ride before we headed out to Livingstone Island.',
        'And we were running a little late.',
        'So naturally, we opened Google Maps.',
        'Google gave us a route.',
        'We followed it.',
        'Eventually we arrived at a strange gate with a guard.',
        'This should have been Clue Number One.',
        'The guard looked at us.',
        'We looked at the guard.',
        'The guard seemed confused about why we were there.',
        'We were confused about why the guard was confused.',
        'But we were late.',
        'We explained that we were trying to get to our activity and were in a hurry. Somehow, despite maintaining an expression that clearly said these people have absolutely no idea what they’re doing, he let us through.',
        'Excellent.',
        'Google knew what it was doing.',
        'We continued.',
        'Then the road started looking… different.',
        'And ahead of us appeared a rather large bridge.',
        'We called our travel agent.',
        'She confirmed that we had gone the wrong way.',
        'Then she said something along the lines of:',
        '“Don’t panic.”',
        'Except she sounded panicked.',
        'Which, as everyone knows, is the fastest possible way to make someone panic.',
        'We kept going.',
        'And then came the realization.',
        'We were in…',
        { kind: 'reveal', text: 'ZIMBABWE.' },
        'Oh.',
        'Shit.',
        'Somewhere along this little Google Maps adventure, we had crossed an international border.',
        'By accident.',
        'And then came the second realization.',
        'Our passports were back at the hotel.',
        { kind: 'beat', text: 'Fuck.' },

        { kind: 'heading', text: 'Turn Around. TURN AROUND.' },
        'Before we crossed the bridge, we spotted somewhere we could turn the car around.',
        'So we did.',
        'Quickly.',
        'Nobody seemed to notice.',
        'For approximately thirty glorious seconds, we believed the crisis might be over.',
        'We had accidentally wandered across an international border.',
        'We had realized our mistake.',
        'We had turned around.',
        'No harm done.',
        'Right?',
        'Wrong.',
        'Because between us and getting comfortably back into Zambia was something we had somehow forgotten existed:',
        { text: 'Border security.', at: 'immigration' },
        'Goddammit, Google.',
        'You really screwed us.',

        { kind: 'heading', text: 'Amma Goes to Work' },
        'We pulled up to the immigration checkpoint.',
        'Now, there’s something you need to understand about Amma.',
        'She is a confident woman.',
        'Sometimes extraordinarily confident.',
        'Possibly, on occasion, too confident.',
        'But on this particular afternoon, that was exactly the person you wanted sitting in the car.',
        'She looked at Colleen and me and essentially said:',
        'Stay here.',
        'Then Amma walked into the immigration office to negotiate with government officials about allowing three people who had somehow crossed an international border without their passports back into Zambia.',
        'Colleen and I sat in the car.',
        'Waiting.',
        'And panicking.',
        'Our brains immediately began doing what brains do in situations like this.',
        'Are we getting arrested?',
        'Deported?',
        'Are we stuck here?',
        'How are we going to get our passports?',
        'What happens to the vacation?',
        'What about Indra?',
        'Are we seriously going to have to explain to our two-year-old that Mommy and Daddy disappeared because Google Maps told them to drive into another country?',
        'This was bad.',

        { kind: 'heading', text: 'The Baboon' },
        'And then, because this situation apparently wasn’t surreal enough, we noticed a baboon.',
        'He was hanging around the border checkpoint with everyone else.',
        'Wild — or at least wild-adjacent — but clearly very accustomed to humans.',
        'And this baboon looked comfortable.',
        'Well fed.',
        'Relaxed.',
        'Almost human.',
        'At one point he was basically lounging around, half asleep, completely unconcerned with international law.',
        'Meanwhile, a few feet away, Colleen and I were contemplating our potential deportation.',
        'I remember looking around and thinking:',
        'Where the hell are we?',
        'And then…',
        'a bus arrived.',
        'A full tourist bus.',
        'And off came a group of very confused Belgian tourists.',
        'They had made…',
        'the exact same mistake.',
        'Google Maps had apparently decided that afternoon to conduct an unauthorized international exchange program.',
        'And for reasons I cannot fully explain, seeing those Belgians gave us enormous hope.',
        'Because suddenly we weren’t the idiots who had accidentally crossed the border.',
        'We were merely the *first* idiots who had accidentally crossed the border.',
        'And more importantly, there were now dozens of them.',
        'The busload of bewildered Belgians had arrived.',
        'Excellent.',
        'Maybe the government would deal with them instead.',

        { kind: 'heading', text: 'The Return of Amma' },
        'After what felt like an eternity — but was probably fifteen minutes — the immigration office door opened.',
        'And out walked Amma.',
        'She had a look on her face.',
        'Not concern.',
        'Not uncertainty.',
        'Triumph.',
        'She’d done it.',
        'Amma had somehow negotiated our way through.',
        'There may have been some… financial diplomacy involved.',
        'And the sudden arrival of an entire busload of Belgian tourists suffering from the exact same Google Maps problem certainly hadn’t hurt our case. They had become a much larger and more interesting problem than our little party of three.',
        'But none of that mattered anymore.',
        'Amma had the passes.',
        'The gate opened.',
        'We drove through.',
        'And just like that…',
        'we were back in Zambia.',
        'No passports.',
        'No deportation.',
        'No international incident.',
        'No explaining to Indra why her parents now lived at a border checkpoint.',
        'We were free.',

        { kind: 'heading', text: 'Devil’s Pool' },
        'And somehow — somehow — we still made our high-tea reservation.',
        {
          text: 'We continued toward Livingstone Island, which sits out in the Zambezi at the very lip of the Falls, on the Zambian side.',
          at: 'devils-pool'
        },
        'Eventually, Colleen and I climbed into Devil’s Pool.',
        'There we were.',
        'Swimming in the Zambezi River at the edge of Victoria Falls, only feet from an enormous drop.',
        'Tiny fish nibbled at us in the water, adding their own little contribution to the experience.',
        'The roar of the Falls surrounded us.',
        'Beyond the edge was nothing but mist, gorge, and gravity.',
        'It should have been terrifying.',
        'And strangely…',
        'I wasn’t even slightly scared.',
        'I was swimming at the edge of Victoria Falls, feet away from what felt like certain doom, and somehow it barely registered.',
        'Because I’d already experienced something far more terrifying on the way there.',
        'I’d accidentally crossed an international border without a passport.',
        'I’d sat in a car wondering whether I was going to be arrested or deported while my mother negotiated with border officials.',
        'I’d watched a baboon casually nap through my international crisis.',
        'I’d witnessed the arrival of a busload of bewildered Belgians who had apparently fallen into the same Google Maps trap.',
        'And somehow…',
        'we’d made it back.',
        'So now?',
        'A waterfall?',
        'Easy.',
        'We swam to the edge.',
        'We looked down.',
        'We laughed.',
        'We survived.',
        'And somewhere back at the hotel, our two-year-old daughter was probably still thinking about how awesome that bus ride from the airport had been.',

        { kind: 'heading', text: 'P.S.' },
        { text: 'Walking with the lions?', at: 'mukuni' },
        'That scared the absolute shit out of me.',
        'Apparently my courage has limits.',
        'Accidentally crossing an international border without a passport and swimming at the edge of Victoria Falls?',
        'Fine.',
        'Large cats?',
        { kind: 'landing', text: 'Fuck that.' }
      ],
      artifact: {
        label: 'Memory artifact',
        title: 'A border pass, negotiated',
        lines: [
          { label: 'What it cost', text: 'Fifteen minutes, and some financial diplomacy.' },
          { label: 'What it bought', text: 'Three people, no passports, back into Zambia.' }
        ]
      },
      source: 'Karsh',
      relatedStories: ['dont-haggle', 'hi-guys'],
      dateAdded: '2026-08-20'
    },

    {
      id: 'confidence-curve',
      title: 'The Confidence Curve',
      hook: 'A brief history of gravity repeatedly reminding me who is in charge.',
      warning: [
        'This story contains descriptions of blood, broken bones, dislocations, surgery, and other assorted consequences of poor decision-making on two wheels. Some of it may be a little graphic.',
        'Pun intended.'
      ],
      year: 2017,
      approximateDate: '2017 onward',
      strand: 'karsh',
      location: 'Colorado',
      place: 'trestle',
      landmark: {
        name: 'Trestle Bike Park',
        query: 'Trestle Bike Park Winter Park Colorado'
      },
      journey: [
        {
          id: 'chingola',
          place: 'chingola',
          flag: '🇿🇲',
          label: 'Chingola, Zambia',
          note: 'The first blood. A bicycle.',
          url: 'https://maps.app.goo.gl/Q4QPpb8x3roUPrM86'
        },
        {
          id: 'trestle',
          place: 'trestle',
          flag: '🦃',
          label: 'Trestle Bike Park · 2017',
          note: 'Rainmaker. Two fingers.',
          url: 'https://www.google.com/maps/search/?api=1&query=Trestle+Bike+Park+Winter+Park+Colorado'
        },
        {
          id: 'steamboat',
          place: 'emerald-mountain',
          flag: '🏔',
          label: 'Emerald Mountain, Steamboat Springs · 2021',
          note: 'The Epic. Beat my own expectations.',
          url: 'https://www.google.com/maps/search/?api=1&query=Emerald+Mountain+Steamboat+Springs+Colorado'
        },
        {
          id: 'ken-caryl',
          place: 'ken-caryl',
          flag: '🚲',
          label: 'Columbine and Cathy Johnson, Ken-Caryl · 2021',
          note: 'A blind corner. A rotator cuff.',
          url: 'https://www.google.com/maps/search/?api=1&query=Columbine+Trail+Ken+Caryl+Colorado'
        },
        {
          id: 'chatfield',
          place: 'chatfield',
          flag: '🦵',
          label: 'Chatfield State Park · 2023',
          note: 'A new bike. A wheelie. A pop.',
          url: 'https://www.google.com/maps/search/?api=1&query=Chatfield+State+Park+Littleton+Colorado'
        },
        {
          id: 'still-riding',
          arrival: true,
          flag: '✦',
          label: 'Still riding',
          note: 'Maybe slower. Definitely smarter.'
        }
      ],
      category: 'triumphs',
      tags: [
        'colorado', 'mountain biking', 'crashes', 'surgery', 'recovery',
        'perseverance', 'colleen', 'friends', 'bicycles'
      ],
      people: [
        { name: 'Karsh', relation: 'me, repeatedly airborne' },
        { name: 'Colleen', relation: 'sympathy: historically zero' },
        { name: 'Adam Bradley', relation: 'witness to the turkey' },
        { name: 'Dr. James Genuario', relation: 'Steadman Hawkins, twice' },
        { name: 'Carole', relation: 'who set the precedent in a sling' },
        { name: 'Indra' }
      ],
      story: [
        'I have crashed a lot of bicycles in my life.',
        'Before anyone draws the obvious conclusion, I would like to clarify something:',
        'It is not because I suck at riding.',
        'At least, that’s my official position.',
        'The real reason is that I have ridden a lot in my life, and I have always had a tendency to push my own physical boundaries. Faster. Steeper. Harder. One more run. One more jump. One more mile.',
        'There is probably a personality trait buried somewhere in there.',
        'This is the story of what happens when perseverance occasionally collides with gravity.',
        'Repeatedly.',

        { kind: 'heading', text: 'The First Blood' },
        {
          text: 'My first truly serious bicycle injury has already earned its own Butterfly Trail: [[hi-guys|“Hi Guys.”]]',
          at: 'chingola'
        },
        'You can read the full story there, but the abbreviated version is that a childhood bicycle crash in Zambia left me with a wound so large that it couldn’t be stitched or stapled. It required a hospital visit, special wound care, and a long healing process.',
        'It was also the most blood I had ever seen leave my own body.',
        'At least while I was conscious.',
        'Apparently this experience did absolutely nothing to discourage me from bicycles.',
        'Which brings us to adulthood.',

        { kind: 'heading', text: 'The Turkey Incident' },
        { text: 'Trestle Bike Park — Winter Park, Colorado · 2017', at: 'trestle' },
        'There was a period of my life when downhill mountain biking became part of my identity.',
        'I rode black diamonds.',
        'I rode double black diamonds.',
        'Was I a professional?',
        'No.',
        'Semi-professional?',
        'Absolutely not.',
        'Quarter-professional?',
        'Still probably no.',
        'But I was good. I could ride technical downhill trails better than most normal Colorado mountain bikers, and I was confident enough to know it.',
        'Unfortunately, confidence has a complicated relationship with fatigue.',
        'There is a point during any long day of riding where those two lines cross.',
        {
          kind: 'figure',
          alt: 'A chart against time riding. Confidence rises steadily from low to high. Actual physical ability starts high and declines with fatigue. The two cross partway through the day, and everything after that crossing is marked THE DANGER ZONE — confidence stays high while ability keeps falling.',
          caption: 'The Confidence Curve. The dangerous part is not the low point. It is everything after the crossing.',
          svg: '<svg viewBox="0 0 320 196" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cc-zone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF3FA0" stop-opacity="0.18"/><stop offset="1" stop-color="#FF3FA0" stop-opacity="0"/></linearGradient></defs><rect x="167" y="26" width="129" height="136" fill="url(#cc-zone)"/><line x1="30" y1="162" x2="300" y2="162" stroke="#9C93B8" stroke-opacity="0.45" stroke-width="1"/><line x1="30" y1="26" x2="30" y2="162" stroke="#9C93B8" stroke-opacity="0.45" stroke-width="1"/><path d="M30 144 C 100 136, 150 100, 292 30" fill="none" stroke="#FFC46B" stroke-width="2"/><path d="M30 44 C 110 52, 180 104, 292 156" fill="none" stroke="#9C93B8" stroke-width="2" stroke-dasharray="5 4"/><line x1="167" y1="26" x2="167" y2="162" stroke="#FF3FA0" stroke-opacity="0.55" stroke-dasharray="3 3"/><circle cx="167" cy="89" r="4.5" fill="#FF3FA0"/><circle cx="167" cy="89" r="9" fill="none" stroke="#FF3FA0" stroke-opacity="0.4"/><g font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="8.5" letter-spacing="1.1"><text x="232" y="22" fill="#FF3FA0" text-anchor="middle">THE DANGER ZONE</text><text x="292" y="44" fill="#FFC46B" text-anchor="end">CONFIDENCE</text><text x="292" y="172" fill="#9C93B8" text-anchor="end">ACTUAL ABILITY</text><text x="34" y="182" fill="#9C93B8">TIME RIDING \u2192</text></g></svg>'
        },
        'I crossed directly into the Danger Zone one day at Trestle while riding with my friend Adam Bradley.',
        'We’d had a fantastic, long day of downhill riding. Toward the end of Rainmaker, we approached one of the final wooden features before the big descent toward the end of the trail.',
        'I hit the jump.',
        'And undershot it.',
        'Badly.',
        'I plowed into the landing and started tumbling across the wooden structure. Somewhere during the chaos, two fingers on my left hand — my ring finger and little finger — got caught.',
        'They snapped.',
        'And dislocated.',
        'Thankfully, I was wearing basically every piece of protective equipment available. Full-face helmet. Body armor. Pads. I looked less like a cyclist and more like a medieval knight who had somehow acquired a mountain bike.',
        'So somehow, after a violent crash on a downhill trail, the major casualties were two fingers.',
        'Bike Patrol happened to be immediately behind me. They rushed over, got my wedding band off before the swelling trapped it there, immobilized my arm, walked me to an emergency access road, and eventually got me into a truck headed for medical care.',
        'But Adam remembers something else.',
        'The noise.',
        'Apparently, while crashing, I emitted a very specific high-pitched sound.',
        'Something resembling:',
        { kind: 'sound', text: 'GOBBLEGOBBLEGOBBLE.' },
        'A turkey.',
        'To this day, Adam and I still laugh about the fact that when confronted with imminent bodily destruction, my nervous system apparently chose Thanksgiving poultry as its distress signal.',
        'At the hospital, my fingers were reset and immobilized in an absolutely ridiculous-looking splint.',
        'Meanwhile, Colleen was in San Francisco visiting a friend.',
        'Her sympathy level was approximately:',
        '0%.',
        'Her position was essentially that I had voluntarily spent the day launching myself down a mountain on a bicycle, and therefore the universe had rendered a fair verdict.',
        'Thanks for the reminder, Colleen.',
        'The injury lingered longer than I expected. My ring finger joint remained swollen enough that my wedding band wouldn’t fit properly for more than a year. Eventually, I had to have the ring resized.',
        'I even attended my brother’s wedding with my hand still immobilized, so the cast is permanently documented in the wedding photographs.',
        'Which felt strangely appropriate.',
        'Because Carole had attended our wedding in a sling after breaking her elbow.',
        'Revenge.',
        'Balance had been restored.',
        'Then came finger physical therapy, which is every bit as ridiculous as it sounds.',
        'Tiny weights.',
        'For fingers.',
        'Imagine going to the gym and watching someone intensely train their pinky.',
        'That was me.',
        'I eventually recovered, although that crash marked the beginning of the end of my dedicated downhill mountain biking days.',
        'Notice that I said dedicated downhill.',
        'I did not say mountain biking.',
        'I hadn’t learned that much.',

        { kind: 'heading', text: 'Sendsday' },
        { text: 'Steamboat Springs, Colorado · 2021', at: 'steamboat' },
        'By 2021, I was probably in some of the best mountain biking shape of my life.',
        'I had endurance.',
        'I had experience.',
        'And, most importantly, I had a group of riding friends called Sendsday.',
        'Which is exactly the kind of group name that should have warned everyone involved about future orthopedic expenses.',
        'We convinced each other to enter the Emerald Mountain Epic in Steamboat Springs.',
        'I trained hard.',
        'This was life before kids. Colleen was pregnant with Indra, but we still possessed that mythical resource that parents eventually discover has vanished from the Earth:',
        'free time.',
        'I used mine to ride.',
        'A lot.',
        'When race day came, I finished successfully and beat my own expectations. I was proud of myself.',
        'We even saw brown bears near our Airbnb during the trip.',
        'Great race.',
        'Great adventure.',
        'Great memories.',
        'And then, approximately one week later, I injured myself practically in my own backyard.',

        { kind: 'heading', text: 'Complacency' },
        {
          text: 'I went riding on the Columbine and Cathy Johnson trails around Ken-Caryl — trails so familiar to me that I could ride to them directly from my doorstep.',
          at: 'ken-caryl'
        },
        'And familiarity creates its own version of the Confidence Curve.',
        'Complacency.',
        'I was flying downhill toward a blind corner.',
        'I came around it and suddenly saw an elderly couple standing in the shade of a tree.',
        'In the middle of the trail.',
        'WHAT ARE YOU DOING?!',
        'There was no time.',
        'At the speed I was traveling, I wasn’t just going to hit them.',
        'I was going to disintegrate them.',
        'I slammed on the brakes.',
        'It wasn’t enough.',
        'So I made the only decision available to me:',
        'I pointed the bike off the mountain.',
        'You’re welcome, random elderly couple.',
        'My front wheel caught in the uneven ground and I Superman’d over the handlebars.',
        { kind: 'sound', text: 'WHOOSH.' },
        'I hit hard.',
        'But I had protective equipment on, and when I stood up, everything appeared surprisingly intact.',
        'Dusty.',
        'Bruised.',
        'Embarrassed.',
        'Mostly I thought my ego had sustained the worst injury.',
        'So naturally, I rode home.',
        'It wasn’t until I tried taking my shirt off that I noticed something strange.',
        'My right arm wouldn’t go above my head.',
        'Hmm.',
        'I gave it a few weeks.',
        'Because apparently my personal medical philosophy at the time was:',
        'Maybe ignore it and see what happens.',
        'Nothing happened.',
        'My arm still didn’t work.',
        'Eventually, I went to see sports medicine physician Dr. James Genuario at Steadman Hawkins.',
        'It was our first meeting.',
        'Neither of us knew yet that we were beginning a long-term professional relationship.',
        'An MRI revealed that I had torn my rotator cuff badly enough to require surgery.',
        'Excellent timing.',
        'We were about to have a baby.',
        'I eventually had the surgery and started the long process of rebuilding my shoulder.',
        'I am eternally grateful to Colleen for her patience during the recovery.',
        'Her sympathy?',
        'Again, somewhat limited.',
        'Because once again, the evidence suggested that I had done this entirely to myself.',
        'Fair.',

        { kind: 'heading', text: 'The Big One' },
        { text: 'Chatfield State Park · Summer 2023', at: 'chatfield' },
        'In 2023, we bought a kayak.',
        'And I bought a new mountain bike.',
        'A Canyon Neuron.',
        'A beautiful machine.',
        'It cost approximately the same amount as an entry-level car, which is a completely reasonable amount of money to spend on something whose primary function is transporting you toward increasingly creative injuries.',
        'We met Colleen’s parents at Chatfield Reservoir for a family kayaking day.',
        'There weren’t enough kayak spots for everyone, so while Colleen, Indra, and her parents were out on the water, I decided to take my brand-new bike for a ride.',
        'It was incredible.',
        'Smooth.',
        'Responsive.',
        'Fast.',
        'And somewhere during this ride, a man in his mid-thirties made the rational decision to start practicing wheelies like he was twenty-two.',
        'I pulled up.',
        'Higher.',
        'Higher.',
        'Too high.',
        'I overshot the wheelie.',
        'The bike came down onto uneven ground.',
        'My knee twisted.',
        'And then I heard it.',
        { kind: 'beat', text: 'POP.' },
        'There are noises your body makes that you immediately understand are not supposed to happen.',
        'This was one of them.',
        'I went down.',
        'And stayed down.',
        'The pain was enormous.',
        'I tried calling Colleen.',
        'No answer.',
        'She was kayaking.',
        'I called her dad.',
        'Thankfully, he answered.',
        'Unfortunately, explaining your exact location on an unfamiliar trail while lying on the ground in severe pain is not particularly easy.',
        'Eventually, some hikers found me and helped me make my way toward the trailhead, where my father-in-law was waiting.',
        'Rescue complete.',
        'And soon enough, I found myself returning to an old friend:',
        'Dr. Genuario.',
        'Hello again.',
        'Another MRI.',
        'Another conversation.',
        'This one came with an impressive list:',
        {
          kind: 'found',
          items: ['Complete ACL rupture.', 'Meniscus tear.', 'Segond avulsion fracture.']
        },
        'Ouch.',
        'This time, Colleen actually had some sympathy for me.',
        'Mostly, I suspect, because the diagnosis provided medical confirmation of something she had believed for years:',
        'I had several screws loose.',
        'Unfortunately, none of them were in my knee yet.',
        'Surgery followed.',
        'The reconstruction was extensive, including use of my quadriceps tendon as graft material as part of rebuilding the damaged structures around my knee. The Segond fracture complicated things because the avulsed piece of bone was too small to simply anchor with a titanium screw.',
        'It was not fun.',
        'Coming out of surgery, I felt horrible.',
        'Then came recovery.',
        'And recovery.',
        'And more recovery.',
        'Strength disappeared astonishingly quickly.',
        'Building it back took astonishingly long.',
        'Even now, years later, I don’t know that my knee will ever feel exactly like it did before that afternoon at Chatfield.',
        'But I can walk.',
        'I can hike.',
        'I can ride a bicycle.',
        'I can run short distances.',
        'Those things stopped feeling ordinary after I temporarily lost them.',
        'And I learned something about myself during that recovery.',
        'Not that I am indestructible.',
        'Quite the opposite.',
        'I learned just how destructible I actually am.',
        'But I also learned that I rebuild.',

        { kind: 'heading', text: 'Apparently We Needed an Epilogue' },
        'You would think that would be the end of this story.',
        'It should have been.',
        'Last year, after a long mountain bike ride, I was riding home and stopped at a red light.',
        'When the pedestrian signal changed, I started across.',
        'One hand on the handlebars.',
        'The other checking my phone.',
        'Yes.',
        'I already know.',
        'A car came toward the crossing hot before stopping short of me.',
        'It didn’t hit me.',
        'But it startled the hell out of me.',
        'I instinctively grabbed the brake.',
        'Unfortunately, the brake underneath my available hand happened to be the front brake.',
        'Physics immediately took over.',
        'For what was now becoming a recurring performance in my life, I launched over the handlebars.',
        'Superman.',
        'Again.',
        'I landed directly on my arm, compressing my elbow.',
        'It hurt like a…',
        'Well.',
        'Remember the warning at the beginning?',
        'Colleen came to rescue me, and we went to the ER.',
        'X-rays revealed a hairline fracture of the radial head.',
        'And once again:',
        'Steadman Hawkins.',
        'At this point I should probably have a punch card.',
        'Fortunately, this injury was relatively minor. No surgery. No cast. Just a splint, sling, and recovery.',
        'Colleen’s sympathy returned to its historically normal level.',
        'Approximately zero.',
        'I recovered quickly, although my elbow still clicks strangely and occasionally reminds me that it, too, remembers.',

        { kind: 'heading', text: 'Keep Riding' },
        'After all of this, people might reasonably ask:',
        'Why do you still ride?',
        'And the answer is complicated.',
        'I ride much less aggressively now.',
        'I don’t spend my weekends bombing double-black downhill trails.',
        'I don’t need every ride to test the boundary of what I can physically do.',
        'I’ve learned that there is a difference between perseverance and recklessness.',
        'That lesson only required several hospitals, multiple MRIs, broken bones, dislocated fingers, a reconstructed shoulder, a reconstructed knee, physical therapy for body parts I didn’t know could have physical therapy, and approximately seventeen thousand reminders from my wife.',
        'But I still ride.',
        'Because buried underneath all these ridiculous stories is something that has followed me through my entire life.',
        'When I fall, I get back up.',
        'Sometimes immediately.',
        'Sometimes after surgery.',
        'Sometimes after months of physical therapy.',
        'Sometimes after years of rebuilding strength.',
        'But eventually:',
        'I get back up.',
        'That isn’t really a mountain biking trait.',
        'It’s just *me*.',
        { text: 'I am approaching forty as I write this, and I genuinely hope I have another forty years of riding bicycles ahead of me.', at: 'still-riding' },
        'Maybe slower.',
        'Definitely smarter.',
        'Hopefully with both wheels remaining on the ground considerably more often.',
        'And I sincerely hope that my collection of orthopedic adventures is now complete.',
        'That part, fortunately, is increasingly under my control.',
        'Because perseverance doesn’t mean refusing to change.',
        'Sometimes perseverance means learning enough from the crashes that you can keep doing the things you love.',
        'So I’ll keep riding.',
        'I’ll keep exploring.',
        'I’ll keep pushing myself — just perhaps not directly over the handlebars anymore.',
        'And if I do something monumentally stupid on a bicycle again, I already know exactly what will happen.',
        'I’ll drag myself home.',
        'I’ll rebuild.',
        'I’ll get back on the bike.',
        'And Colleen will have absolutely no sympathy for me whatsoever.',
        'In fact, I’ll probably get my ass kicked.',
        'And honestly?',
        { kind: 'landing', text: 'At that point, I’ll deserve it.' }
      ],
      artifact: {
        label: 'Memory artifact',
        title: 'A wedding band, resized',
        lines: [
          { label: 'Why', text: 'The ring finger never went back to the size it was.' },
          { label: 'Also on the record', text: 'The splint, in my brother’s wedding photographs.' }
        ]
      },
      source: 'Karsh',
      relatedStories: ['hi-guys', 'someone-dumped-my-bike'],
      dateAdded: '2026-08-20'
    },

    {
      id: 'the-gto',
      title: '190 km/h to Reality',
      hook: 'A missed gear shift, a roundabout, and a mother’s flawless radar.',
      year: 2008,
      approximateDate: '2008',
      strand: 'kush',
      location: 'Chingola, Zambia',
      place: 'chingola',
      landmark: {
        name: 'Kabundi Road',
        query: 'Kabundi Road Chingola Zambia'
      },
      journey: [
        {
          id: 'protea',
          place: 'chingola',
          flag: '🏨',
          label: 'Protea Hotel, Kabundi Road',
          note: 'Where the gauntlet was thrown',
          url: 'https://www.google.com/maps/search/?api=1&query=Protea+Hotel+Chingola+Kabundi+Road+Zambia'
        },
        {
          id: 'kabundi',
          place: 'chingola',
          flag: '🏎',
          label: 'Kabundi Road, toward the roundabout',
          note: 'Three honks. Five thousand revs.',
          url: 'https://www.google.com/maps/search/?api=1&query=Kabundi+Road+Chingola+Zambia'
        },
        {
          id: 'home',
          place: 'chingola',
          flag: '🇿🇲',
          label: 'Our front gate',
          note: 'The truck was already in the driveway.'
        },
        {
          id: 'peoria',
          place: 'bradley',
          flag: '🇺🇸',
          label: 'Bradley University, Peoria',
          note: 'A few months later. The lesson came too.',
          url: 'https://www.google.com/maps/search/?api=1&query=Bradley+University+Peoria+Illinois'
        }
      ],
      category: 'chaos',
      chaosEvent: true,
      tags: [
        'zambia', 'chingola', 'cars', 'driving', 'teenagers', 'growing up',
        'amma', 'adrenaline', 'shame', 'bradley university'
      ],
      people: [
        { name: 'Kush', relation: 'the driver, aged seventeen' },
        { name: 'Amma', relation: 'the radar' },
        { name: 'Dad', relation: 'whose pediatric work connected the families' }
      ],
      story: [
        { kind: 'heading', text: 'The Countdown to Peoria' },
        {
          text: 'It was 2008, and the clock was ticking. In just a few months, I’d be trading the vast, warm skies of Zambia for the icy winters of Peoria, Illinois, to start my freshman year at Bradley University. This was my grand farewell tour — my last hurrah with my friends, my youth, and most importantly, my 1994 Mitsubishi GTO Twin Turbo.',
          at: 'protea'
        },
        'It was a quintessential, beautiful Zambian afternoon. We were all hanging out near the Protea Hotel, soaking in the sun, when the inevitable happened. My buddy, sitting smugly behind the wheel of his Toyota Aristo — packing that legendary Supra 2JZ-GTE engine — threw down the gauntlet. A drag race.',
        'In the passenger seat of my GTO sat a girl. Naturally. I was seventeen, single, and operating entirely on hormones and high-octane fuel. There was absolutely zero chance I was backing down.',

        { kind: 'heading', text: '5,000 RPM and a Prayer' },
        {
          text: 'We rolled onto Kabundi Road, pointing the cars toward the roundabout. The rules were unspoken but understood: three honks, and we launch.',
          at: 'kabundi'
        },
        { kind: 'sound', text: 'Honk. Honk. Honk.' },
        'I brought the revs to 5,000 RPM and dumped the clutch. The Mitsubishi’s all-wheel-drive system bit into the tarmac with violent precision, instantly hooking up. Next to me, my buddy was putting on a smoke show, completely roasting his rear tires as I catapulted forward. I was pulling away gracefully — a flawless victory in the making.',
        'And then, the infamous third-to-fourth gear shift. I completely missed it.',
        'My engine roared in protest, and in that split second of automotive fumbling, the Aristo came screaming up beside me. Panic and ego took the wheel. I finally shoved the shifter into fourth and simply buried the pedal into the floor mat.',
        'By the time the twin turbos fully spooled up, I was leaving him in the dust again. But the thrill blinded me to the speedometer. I was pushing *180 to 190 kilometers per hour* down a small dual carriageway right in the middle of Chingola. I felt untouchable. I felt like Brian O’Conner.',
        'Then, the roundabout materialized.',

        { kind: 'heading', text: 'The Physics of Teenage Stupidity' },
        'Time didn’t just slow down; it froze. At nearly 190 km/h, the roundabout wasn’t just an intersection; it was a concrete wall rapidly filling my windshield. I slammed on the brakes, the tires howling in protest, but the laws of physics were not on my side.',
        'Already navigating the roundabout was a pickup truck, just minding its own business.',
        'What followed was a desperate, panicked dance. They saw me rocketing toward them and swerved. I yanked the wheel, the GTO’s suspension loading up as I prayed for grip. We missed each other by millimeters. As I fought to keep the GTO on the asphalt, I watched in my rearview mirror as the pickup truck plowed off the road, coming to a halt deep in the landscaping foliage atop the roundabout.',
        'I managed a clean exit and kept driving. My heart was trying to hammer its way out of my ribs. The girl next to me was wide-eyed, gasping, and — to my absolute shock — incredibly impressed. We drove around aimlessly, laughing with that hysterical, breathless relief that only comes from cheating disaster.',
        '“I can’t believe we just pulled that off!”',
        '“Did you see that?! Straight out of a movie!”',

        { kind: 'heading', text: 'The Smallest Town in the World' },
        'The Hollywood fantasy shattered the second my cell phone rang.',
        'It was Amma.',
        'I answered, expecting a question about dinner. Instead, I got a voice colder than ice. “Come home right now.” Click.',
        'The adrenaline evaporated. Suddenly, I wasn’t Brian O’Conner anymore; I was a seventeen-year-old kid about to face the wrath of his mother. My mind raced the entire drive back. Chingola is small, but it’s not THAT small, right? Did someone recognize the car? Did they call her?',
        { text: 'I pulled up to our front gate, my stomach in knots. The security guard slowly rolled the gate open, revealing our driveway.', at: 'home' },
        'My heart dropped to the floorboards.',
        {
          kind: 'reveal',
          text: 'Parked right there, plain as day, was the exact same pickup truck I had just run off the road twenty minutes earlier.'
        },
        'How? How did they know where I lived? How did they know my mom?',

        { kind: 'heading', text: 'The Living Room Verdict' },
        'My hands were shaking so badly I could barely pull the key from the ignition. My legs felt like lead as I walked through the front door, fully accepting my doom.',
        'Sitting in our living room were three of my parents’ younger friends — folks who worked at the mines, good people whose lives were intertwined with our family through my dad’s pediatric work. They were the ones in the truck. They looked pale. They looked terrified.',
        'And right there, in front of guests, Amma delivered the most devastating, earth-shattering lecture of my life. In my family, reprimands were always handled privately. Being dressed down in public, in front of the very people I had nearly killed, brought a level of shame I had never known existed.',
        'I looked at their faces. They weren’t nameless extras in my personal action movie. They were real people, innocently going about their day, whose lives I had carelessly endangered for the sake of a girl’s smile and a drag race. The teenage invincibility cracked, and a heavy, serious reality poured in. I vowed right then and there to leave the antics on the track and respect the machine I was driving.',

        { kind: 'heading', text: 'The Legacy of the GTO' },
        'Looking back, the duality of that day still haunts me. I am deeply ashamed of the danger I caused. But if I am being completely honest with myself? For that minute and a half, as I watched that Aristo disappear in my rearview mirror, I had never felt more alive. That was the exact moment I realized I had a dangerous addiction to the adrenaline of the wheel — a beast I’d have to learn to tame.',
        {
          text: 'It’s a lesson that stuck with me all the way to America. And maybe that’s why the memory of that car is so hard to let go of. It wasn’t just a piece of metal, and it wasn’t just a machine. That twin-turbo monster was the ultimate symbol of my youth —',
          at: 'peoria'
        },
        {
          kind: 'landing',
          text: 'a roaring, terrifying, beautiful reminder of the day I finally had to grow up, courtesy of a missed gear shift, a roundabout, and a mother’s flawless radar.'
        }
      ],
      artifact: {
        label: 'Memory artifact',
        title: 'A 1994 Mitsubishi GTO Twin Turbo',
        lines: [
          { label: 'What it was', text: 'The ultimate symbol of my youth.' },
          { label: 'What it taught me', text: 'That I had an addiction to the wheel, and a beast to tame.' }
        ]
      },
      source: 'Kush',
      relatedStories: ['confidence-curve', 'no-futon'],
      dateAdded: '2026-08-20'
    },

    {
      id: 'suspicious-photograph',
      title: 'The Most Suspicious Photograph in Zambia',
      hook: 'Two teenagers, a television station, and a man with an AK-47.',
      year: 2005,
      approximateDate: 'circa 2005',
      strand: 'karsh',
      location: 'Kitwe, Zambia',
      place: 'kitwe',
      landmark: {
        name: 'ZNBC, Kitwe',
        query: 'ZNBC Zambia National Broadcasting Corporation Kitwe'
      },
      journey: [
        {
          id: 'chingola',
          place: 'chingola',
          flag: '🇿🇲',
          label: 'Chingola',
          note: 'No car, and forty kilometres to go.'
        },
        {
          id: 'kitwe',
          place: 'kitwe',
          flag: '🇿🇲',
          label: 'Kitwe',
          note: 'Slipping back into my old life for a day'
        },
        {
          id: 'znbc',
          place: 'kitwe',
          flag: '📺',
          label: 'The ZNBC building',
          note: 'Two teenagers and a digital camera',
          url: 'https://www.google.com/maps/search/?api=1&query=ZNBC+Kitwe+Zambia'
        },
        {
          id: 'still-friends',
          arrival: true,
          flag: '✦',
          label: 'More than twenty years later',
          note: 'Still friends. Still laughing about it.'
        }
      ],
      category: 'chaos',
      tags: [
        'zambia', 'kitwe', 'chingola', 'friendship', 'teenagers',
        'television', 'znbc', 'funny memories', 'growing up'
      ],
      people: [
        { name: 'Karsh', relation: 'me, home for the summer' },
        { name: 'Swathin', relation: 'one of my oldest friends' }
      ],
      story: [
        {
          text: 'In 2005, during one of my summer breaks from school in the United States, I went back home to Zambia.',
          at: 'chingola'
        },
        'It was a strange time in my life because I had left Zambia about a year earlier than most of my friends. They had stayed behind to finish their full A-levels, while I had completed my AS-levels and moved to the U.S. So whenever I came back, there was this wonderful feeling of slipping into my old life again — seeing people I had grown up with and, for a little while, pretending I had never really left.',
        'One of the people I especially wanted to see was my friend Swathin.',
        'Swathin is one of my oldest and closest friends. Somehow, despite different countries, careers, families, and all the other things that happen as you get older, we’re still friends today.',
        'And we still laugh about this particular day.',
        'Getting from Chingola to Kitwe wasn’t exactly convenient for me. I didn’t have a car, and the two towns were more than forty kilometers apart. That’s not an enormous distance by American standards, but this wasn’t an American interstate where you set the cruise control at 80 mph and magically appear at your destination half an hour later.',
        'It took some effort.',
        {
          text: 'But I made it to Kitwe, met up with Swathin, caught up with a bunch of old friends, and spent the day wandering around town.',
          at: 'kitwe'
        },
        {
          text: 'At some point, our wandering took us past the ZNBC building — the Zambia National Broadcasting Corporation.',
          at: 'znbc'
        },
        'ZNBC was the television station of my childhood. Before satellite television became common, this was what we watched. Later, our family got DStv, which suddenly opened up this enormous universe of South African and international channels — MTV, KTV, movies, music, and all kinds of Western television.',
        'But ZNBC was still ZNBC.',
        'And Swathin had a special relationship with it.',
        'He and his mother had appeared on a cooking show there.',
        'His mother was extremely proud of this fact.',
        'Swathin was…',
        'less enthusiastic.',
        'Actually, he was completely embarrassed by it.',
        'Which, naturally, made it significantly more interesting to me.',
        'As we walked past the building, I wanted to see where this legendary television career had taken place. So we stopped outside and took a photograph of ourselves in front of ZNBC.',
        'That’s it.',
        'Two teenagers taking a picture outside a television station.',
        'Completely harmless.',
        'We took the picture and started walking away.',
        'There were plenty of pedestrians around us, and we hadn’t gone very far when we suddenly heard someone shouting behind us.',
        { kind: 'shout', text: 'Hey! You guys! Stop right there!' },
        'We looked around.',
        'There were lots of people on the street, so surely this had nothing to do with us.',
        'We continued walking.',
        'Then we heard it again.',
        '“HEY! YOU GUYS! WHERE ARE YOU GOING? STOP RIGHT NOW!”',
        'We turned around again.',
        'This time people were moving out of the way.',
        'And running directly toward us was a security guard.',
        { kind: 'reveal', text: 'Carrying an AK-47.' },
        'Oh.',
        'Those guys.',
        'We stopped.',
        'The guard caught up with us and ordered us to follow him back to the security office.',
        'Naturally, we attempted the standard teenage legal defense.',
        '“What did we do?”',
        '“We didn’t do anything!”',
        'Then he told us.',
        'He had seen us taking photographs of the building.',
        'We needed to come with him.',
        'Now, I don’t remember exactly what the official photography policy of ZNBC was in 2005, but I do remember one important principle of international diplomacy:',
        'When the person you’re debating is carrying an AK-47, you let him win the argument.',
        'So we followed him.',
        'At the guard shack, the interrogation began.',
        'Why were we taking photographs?',
        'What were we photographing?',
        'Why were we interested in the building?',
        'Let me see the pictures.',
        'This was 2005, so there was no pulling an iPhone out of your pocket and opening the Photos app. Swathin had an actual digital camera — the kind you carried around separately, then plugged into a computer later to transfer your photographs.',
        'He pulled it out.',
        'We showed the guard the pictures.',
        'It was exactly what we had said it was: a completely uninteresting photograph of two kids standing outside ZNBC.',
        'The guard announced that this needed to be shown to his leadership.',
        'Now both of us were getting nervous.',
        'Our palms were sweating.',
        'And then Swathin made a decision.',
        'He deleted the photograph.',
        'Right there.',
        'In front of the guard.',
        'This did not improve the situation.',
        { kind: 'shout', text: 'No! I need to see those photos!' },
        'The guard became even more upset.',
        'Swathin tried explaining the perfectly logical teenage reasoning behind his decision.',
        '“You said the photo was a problem, so I deleted it.”',
        'Which, from our perspective, made perfect sense.',
        'From the perspective of an armed security guard investigating two suspicious young men photographing a broadcasting facility, deleting the evidence probably looked…',
        'not great.',
        'The argument escalated.',
        'There was nothing to see.',
        'Yes, there was.',
        'No, I deleted it.',
        'Why did you delete it?',
        'Because you said we weren’t supposed to have it!',
        'Eventually, we explained the entire ridiculous reason we had taken the photograph in the first place.',
        'Swathin had been on a television show there with his mother.',
        'We were visiting.',
        'It was a memory.',
        'That was it.',
        'Apparently this explanation was not sufficient for our new friend.',
        'He decided to escalate the matter to someone higher up at ZNBC.',
        'So now our innocent photograph had progressed from:',
        'Take picture.',
        'to:',
        'Man with AK-47.',
        'to:',
        'Potential meeting with the head of broadcasting.',
        'We were escorted inside and told to wait in an office while someone important was summoned.',
        'I can only imagine what this poor man was told.',
        'Sir, we have apprehended two young men photographing the facility.',
        'He eventually arrived.',
        'He looked at us.',
        'He listened to the story.',
        'He asked us a few questions.',
        'Presumably, somewhere in his mental checklist was:',
        'Are these two terrorists?',
        'The answer became fairly obvious.',
        'No.',
        'They are *idiots*.',
        'He seemed mostly confused about why he had been dragged into this situation in the first place. Once he understood what had happened, he was irritated — not with us, but with the security guard for turning the whole thing into an international espionage investigation.',
        'He told us we could leave.',
        'Relief.',
        'We started walking out.',
        'The security guard, however, did not look particularly happy about the outcome.',
        'Looking back on it, I suspect there may have been another ending he had hoped for. Perhaps a little pocket change would make the whole terrible misunderstanding disappear. That sort of thing wasn’t exactly unheard of.',
        'But now his supervisor had gotten involved.',
        'There was no money.',
        'There were no terrorists.',
        'There wasn’t even a photograph anymore.',
        'His entire investigation had produced absolutely nothing.',
        'Still, as we were leaving, he made one final attempt to get something out of the experience.',
        'He looked at us and said:',
        '“Haha… at least give me a smoke.”',
        'We didn’t.',
        'We walked away.',
        'Calmly.',
        'Very calmly.',
        'Because when someone with an AK-47 has just spent the last hour accusing you of suspicious activity, you do not immediately sprint away from him.',
        'We waited.',
        'We walked farther.',
        'A little farther.',
        'And when we were finally out of sight…',
        'we ran like hell.',
        'At the time, it was genuinely terrifying.',
        'We were young, we didn’t really understand what was happening, and suddenly an innocent photograph had turned into being detained by an armed guard and questioned inside the national broadcasting corporation.',
        'But that’s the strange thing about memories.',
        'Some of the moments that scare the absolute hell out of you while they’re happening eventually become the stories you laugh hardest about.',
        {
          text: 'More than twenty years later, Swathin and I are still friends.',
          at: 'still-friends'
        },
        'We’ve ended up living very different lives in different parts of the world, but whenever this story comes up, we’re teenagers in Kitwe again — walking down the street, thinking we’d done absolutely nothing wrong, while somewhere behind us an increasingly angry man with an AK-47 is yelling:',
        '“HEY! YOU GUYS!”',
        {
          kind: 'landing',
          text: 'And somewhere, lost forever on a deleted memory card, is apparently the most dangerous photograph ever taken in Zambia.'
        }
      ],
      artifact: {
        label: 'Memory artifact',
        title: 'A photograph of two teenagers outside a television station',
        lines: [
          { label: 'Where it is', text: 'Deleted, in front of the guard, in 2005.' },
          { label: 'What it proved', text: 'Nothing at all. That turned out to be the problem.' }
        ]
      },
      source: 'Karsh',
      relatedStories: ['no-futon', 'hi-guys'],
      dateAdded: '2026-08-20'
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
      /* a figure carries neither items nor text — it carries a drawing */
      (s.story || []).forEach(function (p, pi) {
        if (!p || p.kind !== 'figure') return;
        if (!p.svg) out.push(at + ': paragraph ' + pi + ' is a figure with no svg');
        if (!p.alt) out.push(at + ': paragraph ' + pi + ' is a figure with no alt text');
      });
      /* kinds whose content is `text` */
      var SPOKEN = ['shout', 'beat', 'landing', 'heading', 'sound', 'reveal',
                    'dedication', 'verse'];
      (s.story || []).forEach(function (p, pi) {
        if (typeof p === 'string' || !p) return;
        var where = at + ': paragraph ' + pi;
        if (p.kind === 'figure') return;
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
