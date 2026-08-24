# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static site for **Entropic Labs** (studio, games, observatory, family archive), served
by GitHub Pages from `main` at https://despite-the-finite.github.io/Entropic-Labs/.
`.nojekyll` means every file is served exactly as committed.

**There is no build step, no package manager, no dependencies, no test suite and no
linter.** Vanilla ES5-style JavaScript in IIFEs, plain CSS, `<script src>` tags.
Adding a framework or a bundler to solve a problem here is almost always the wrong
answer — the constraint is deliberate and the README argues for it repeatedly.

## Working commands

```bash
# preview (must be started from the repo root, or relative asset paths 404)
python3 -m http.server 8123          # then http://localhost:8123/butterfly.html
npx http-server -s .                 # the README's equivalent

# ship: commit and push to main; Pages picks it up in a minute or two
```

Verification is done in a browser, not by tests. Where headless Chromium and
Playwright are available, the useful checks after a data edit are: load the page,
collect `pageerror`/`console` errors, evaluate `window.BUTTERFLY_DATA.check()`
(returns an array of warning strings — `[]` means clean), and read `innerText` off
the rendered panel. A 404 for `/favicon.ico` is expected and means nothing.

`tools-hero-*.py` are one-off image tools kept for the record. They need the
original 4K artwork, which is not in the repo. Do not try to run them.

## Architecture

Four rooms hung off one foyer, each a self-contained page:

| Room | Shell | Directory |
|---|---|---|
| Foyer (entry) | `index.html` | `foyer/` |
| Studio | `studio.html` | `img/`, `hero.js` |
| Games | `games.html` | `play/` |
| Observatory | `observatory.html` | `observatory/` |
| Butterfly Trails | `butterfly.html` | `butterfly/` |

### The data / engine / controller split

The two canvas rooms are built the same way, and the separation is the thing to
preserve:

```
data/*.js       ALL content. Knows nothing about how it is drawn.
<engine>.js     canvas: camera, layouts, hit-testing. Knows nothing about content.
<controller>.js state machine, URL routing, panels. Decides what any of it means.
```

- Observatory: `data/observations.js` → `telemetry.js`, `starfield.js` → `observatory.js`
- Butterfly Trails: `data/stories.js` → `trails.js`, `atlas.js` → `butterfly.js`

Each data file assigns one global (`window.OBSERVATORY_DATA`, `window.BUTTERFLY_DATA`)
and the controller reads it. **Script order in the shell HTML matters** — data first,
engines next, controller last — and each script bails quietly if its dependency is
missing.

The field list at the top of each data file documents every supported key. Read it
before adding content; it is the spec.

### Adding content

Appending one object to `STORIES` or `OBSERVATIONS` is the whole job. Layout,
counters, routing, filters, map plotting and the category butterflies all pick it up.
Every field except `id` is optional and the room degrades quietly.

**Gotcha:** `butterfly.js` copies each story field by field into a normalized node
(the `STORIES.map(...)` near the top of the file). A new *story-level* field that
is not listed there is silently dropped — no error, it just never appears. This has
bitten twice (`strand`, `warning`). Paragraph-level `kind`s are handled separately in
`renderProse`/`setText`.

After editing `butterfly/data/stories.js`, call `BUTTERFLY_DATA.check()` in the
console. It validates ids, category/era/place/strand references, strand `start`/`end`
kinds, base-chain loops and `alternatePath` shape, and returns warnings rather than
throwing.

### Butterfly Trails specifics

- **The trail is a braid.** `STRANDS` define lives; offsets are *relative* (`base` +
  `side`), so generations hang off each other with no absolute position computed by
  hand. `start` is `origin`/`born`/`begins`/`union`, `end` is `open`/`joins`. A story's
  optional `strand` says whose line it happened on. A `year` of `null` means "nobody
  wrote it down" and is handled deliberately, not as missing data.
- **Two lenses, one archive.** `trails` (canvas) and `map` (`atlas.js`, a painted
  country). A *lens* is which experience you are having; a *view* (trail / whole trail
  / places) is a layout inside the trails lens. Filters, the open memory and the URL
  are held by the controller and survive a lens change. A third lens is one entry in
  `LENSES` plus an object answering `setWorld`, `setLights`, `activate`, `deactivate`,
  `focus`, `setEmphasis`, and emitting `select` and `hover`.
- **Routing is the hash.** Story ids resolve before view names, so no route can
  shadow a memory.

### Mobile

`studio.html` and `games.html` redirect phones to hand-built twins in `m/` — so a
copy change to a studio or games section usually needs **the same edit in `m/`**.
The foyer, Observatory and Butterfly Trails are single responsive pages on purpose
(they branch internally on viewport and pointer type); never make `m/` twins of them.

### `play/`

`play/meridian/`, `play/wandering-words/` and `play/little-heroes-hospital/` are
vendored copies of games from other repos. **Treat them as read-only** — fix things
upstream and re-copy per each directory's `UPSTREAM.md`.

## House rules

These come from the standing brief and the README, and they are enforced in review:

- **Nothing is invented.** No fabricated biography, place names, dates, statistics or
  tribes. Verify real-world geography before writing it down. Where a fact is unknown,
  the interface says so rather than guessing — that behaviour is a feature, and the
  empty states are live.
- **The archive's own voice** (journey stop notes, captions, landmarks) may carry
  verified fact; the prose in a story stays the author's words.
- `prefers-reduced-motion` is honoured everywhere: animation stops, canvas loops draw
  on demand only, and beats keep their weight and spacing without moving.
- Maps are links out, never embedded iframes. Photographs are never distressed or
  filtered — the found-object treatment is on the mount, not the picture.
- Canvas loops idle at ~30fps, rise to full rate only while something moves, and stop
  dead when the tab is hidden.
- Do not rewrite unrelated parts of the site to make one change land.

## README

`README.md` is long and is the real design document — it explains the braid geometry,
the atlas, every paragraph `kind`, the journey/scrollspy mechanic, the colour code and
the reasoning behind each. Consult the relevant section before changing that machinery,
and update it when the machinery changes.
