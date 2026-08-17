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
                     { id, place, label, note, flag, url, person }
                   `place` is a PLACES id and is what puts the leg on the
                   map; `label` and `note` are what the reader sees; `url`
                   is a checked map link. A stop with `person: true` and no
                   place is a destination that is not a location at all —
                   which is how a trail ends by arriving at somebody rather
                   than somewhere. The legs between stops that do have
                   places are drawn on the map view automatically.
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
                     { kind: 'found',   items: ['Momo.', 'Veggie momo.'] }
                         words read off a page — a menu, a sign, a letter

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
          person: true,
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
        if (!stop.place && !stop.person) {
          out.push(at + ': journey stop "' + stop.id + '" is neither a place nor a person');
        }
      });

      var LISTED = ['plan', 'found'];        /* kinds whose content is `items` */
      var SPOKEN = ['shout', 'beat', 'landing'];   /* kinds whose content is `text` */
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
