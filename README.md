![Entropic Labs](entropic-labs-banner.svg)

# Entropic Labs

Landing page for Entropic Labs, a recording and production studio run by **Despite the Finite**.

**Live site:** https://despite-the-finite.github.io/Entropic-Labs/

## Contents

- `index.html` — the desktop site: markup, styles, and scripts in one file, with images loaded from `img/`.
- `m/` — the mobile build, served automatically to phones (see below).
- `img/` — the site's photography, at two sizes each: full for desktop, `-mobile` for phones.
- `games.html` — the games page: video game design as a minor function of the studio, with links to each project's source.
- `observatory.html` + `observatory/` — the Observatory: an interactive star chart of things worth wondering about. One responsive page rather than a desktop page plus an `m/` twin; see below.
- `play/meridian/` — a hosted copy of *Donnell and McBurns: An EPC Epic*, so it's playable straight from the site. Read-only; see `play/meridian/UPSTREAM.md` for the source commit and how to refresh it.
- `play/wandering-words/` — a hosted copy of *Indra and the Wandering Words*, same arrangement; see `play/wandering-words/UPSTREAM.md`.
- `entropic-labs-banner.svg` — the banner at the top of this README.
- `.nojekyll` — tells GitHub Pages to serve every file as-is, without running the content through Jekyll.

## Editing

Open `index.html` in a browser to preview, or in any editor to make changes. There's no build step — commit and push to `main`, and GitHub Pages picks up the change automatically within a minute or two.

Content lives in two places now, so a copy change to a section usually needs the same
edit in `m/`. Preview the mobile build with a local server (`npx http-server -s .`)
and your browser's device toolbar, since the redirect below keys off the device.
The Observatory is the exception — it is a single responsive page, so its content
is edited once, in `observatory/data/observations.js`.

## Mobile

Phones get `m/` instead of the desktop pages, decided by a short script in the
`<head>` of `index.html` and `games.html`. It treats a visitor as mobile on any of
three signals: `navigator.userAgentData.mobile`, a phone user-agent string, or a
viewport of 820px or less with a coarse pointer. Small tablets match that last one
too, which is intended — the mobile layout suits them. A desktop with a touchscreen
does not, because its viewport is wider than 820px.

- Deep links survive: `index.html#gear` lands on `m/#gear`.
- **Opting out:** the mobile pages link to `?full=1`, which pins the full site in
  `localStorage` for that browser and follows you across pages.
- **Opting back in:** loading anything under `m/` clears the pin. The desktop footer
  has a "Mobile site" link for that.

The mobile build is deliberately not just narrower CSS: the gear list becomes cards
instead of a table that scrolls sideways, the nav becomes a full-screen menu, buttons
are full-width at 52px, the long game write-ups sit behind a "Read more" disclosure,
and it loads the `-mobile` images (191KB for all three, against 640KB).

`m/mobile.css` is shared by both mobile pages rather than inlined, so it's cached
once across them.

## Sections

- Hero — the `ENTROPIC LABS / MUSIC ENGINEERING / STUDIO` backdrop, plus the booking CTA
- Manifesto — studio philosophy
- Behind the board — lead producer bio
- Inside the room — studio photo
- Gear list — recording equipment
- Projects — placeholder catalog for upcoming releases
- Side room — game design as a minor function, linking out to `games.html`
- The observatory — curiosity as the third room, linking out to `observatory.html`
- Contact — booking terms and hours only; see the note below

## Contact details

**No contact details live in this repo — keep it that way.** Anything a browser can
render, a visitor or a scraper can read; encoding a value only hides it from the
person reading the page, not from anyone who looks at the source. The contact
section therefore carries booking terms, hours, and the fact that the location is
shared once a session is confirmed, and nothing else. The "Book a session" buttons
scroll to that section rather than opening a mail client.

To take bookings, add a hosted form (Formspree, Tally, a Google Form) and point the
buttons at it — the form provider holds the address, so the page never publishes one.

## Games page

`games.html` covers the studio's game design work, in order:

1. **Donnell and McBurns: An EPC Epic** — playable at [`/play/meridian/`](https://despite-the-finite.github.io/Entropic-Labs/play/meridian/)
2. **Indra and the Wandering Words** — playable at [`/play/wandering-words/`](https://despite-the-finite.github.io/Entropic-Labs/play/wandering-words/)
3. **Live Trivia**

The site no longer links to any game's source. Each hosted copy still records where
it came from in its own `UPSTREAM.md`, which is what a refresh needs.

Each entry is a disclosure: the catalog reads as three concise rows, and picking one
opens its three-paragraph write-up along with its play and source buttons. That's
plain `<details>`/`<summary>`, so it needs no JavaScript and stays keyboard
accessible.

The first two are playable on the site itself: both are entirely static — Meridian
vendors Phaser 3 locally and generates all its art procedurally at boot, and the
reading game is classic script tags with inline SVG art and synthesised audio — so
GitHub Pages serves them with no build step.

**Live Trivia** can't be hosted the same way: its frontend calls `/api/*` with
Postgres behind it, so a static copy would only ever show its offline screen.
Deploying it (Vercel plus a Postgres URL and an Anthropic API key) would give it a
**Play it now** button too — drop the URL into `games.html` in place of the
`play-note` beside its link.

Dirty Bass, the in-house VST3 synth, is listed on the studio side in the gear
table instead of here — it loads in a DAW rather than a browser, so it has no
play link, just a link to its source.

## The Observatory

`observatory.html` is the third room. Studio is what gets made, Games is what
gets played, and the Observatory is what gets wondered about: an interactive
star chart where each star is a catalogued observation, from cities found under
the Amazon to why the galaxy is so quiet.

```
observatory.html            the shell
observatory/
  observatory.css           styles — the site palette, one stop darker
  data/observations.js      ALL the content: categories + observations
  telemetry.js              moon phase, Voyager range, clock — pure functions
  starfield.js              canvas engine: camera, parallax, hit-testing
  observatory.js            controller: state machine, routing, panels
```

**Adding an observation** means appending one object to `OBSERVATIONS` in
`observatory/data/observations.js`. Nothing else needs touching — the star map
places it on its field's ring automatically, the catalogue lists it, the record
view renders whichever fields are present, and the counter in the status panel
picks it up. Adding a whole new field of curiosity means appending to
`CATEGORIES` with a position in chart space. The field list at the top of that
file documents every supported key.

**Routing** is the URL: `#lost-civilizations` opens a field, `#obs-0047` opens
a record, `#unidentified` opens the anomaly. Every record is linkable and the
back button behaves.

**No `m/` twin, on purpose.** The other pages are prose, so a hand-tuned mobile
copy is cheap and worth it. This one is a canvas app whose layout is computed at
runtime from the viewport and pointer type, and a second copy would only ever
drift out of sync. Instead it branches internally: portrait squeezes the chart
horizontally and stretches it vertically rather than scaling it down, panels
become bottom sheets, observation labels are always drawn on touch instead of
on hover, and the panel-clearance maths measures the open panel rather than
assuming a breakpoint. Both `index.html` and `m/index.html` link straight here;
because this page carries no redirect script, it is safe to enter from either.

**Telemetry** is computed in the browser with no network calls. The moon phase
uses the standard low-precision astronomical solution and lands on published
new and full moons to the percentage point. Voyager 1's range is extrapolated
from a dated reference constant at the top of `telemetry.js` — back-extrapolate
it to the 2012 heliopause crossing and it gives 121.8 AU against the published
~121, so it stays right on its own rather than needing manual edits. Each row
is labelled live, computed, or nominal, and the panel says which is which.

**Content rules.** Every record carries a `certainty` block that separates
ESTABLISHED from HYPOTHESIS, CONTESTED, UNRESOLVED and SPECULATION, because the
point of the room is that most of this is unfinished. Source links point at the
publishing journal or institution rather than deep links, so they keep working;
the citation itself names the specific paper.

**Performance.** No frameworks and no dependencies. One pre-rendered glow
sprite instead of per-star gradients, background stars as plain fillRects, and
the loop idles at ~30fps, rises to full rate only while something is moving,
and stops dead when the tab is hidden. Under `prefers-reduced-motion` it drops
drift, twinkle and camera easing entirely and draws on demand only — zero
background frames.

**The anomaly.** There is one unidentified object on the chart, marked `?`. It
opens a deliberately incomplete record pointing at Sublevel −1, which does not
exist yet. That is the intended state: a doorway, not a room. Its presentation
is the `special: 'anomaly'` branch in `observatory.js`.
