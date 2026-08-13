![Entropic Labs](entropic-labs-banner.svg)

# Entropic Labs

Landing page for Entropic Labs, a recording and production studio run by **Despite the Finite**.

**Live site:** https://despite-the-finite.github.io/Entropic-Labs/

## Contents

- `index.html` — the desktop site: markup, styles, and scripts in one file, with images loaded from `img/`.
- `m/` — the mobile build, served automatically to phones (see below).
- `img/` — the site's photography, at two sizes each: full for desktop, `-mobile` for phones.
- `games.html` — the games page: video game design as a minor function of the studio, with links to each project's source.
- `play/meridian/` — a hosted copy of *Donnell and McBurns: An EPC Epic*, so it's playable straight from the site. Read-only; see `play/meridian/UPSTREAM.md` for the source commit and how to refresh it.
- `play/wandering-words/` — a hosted copy of *Indra and the Wandering Words*, same arrangement; see `play/wandering-words/UPSTREAM.md`.
- `entropic-labs-banner.svg` — the banner at the top of this README.
- `.nojekyll` — tells GitHub Pages to serve every file as-is, without running the content through Jekyll.

## Editing

Open `index.html` in a browser to preview, or in any editor to make changes. There's no build step — commit and push to `main`, and GitHub Pages picks up the change automatically within a minute or two.

Content lives in two places now, so a copy change to a section usually needs the same
edit in `m/`. Preview the mobile build with a local server (`npx http-server -s .`)
and your browser's device toolbar, since the redirect below keys off the device.

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
- Contact — email and location shared on request only

## Games page

`games.html` covers the studio's game design work, in order:

1. **Donnell and McBurns: An EPC Epic** ([Work-Video-Game-Meridian](https://github.com/despite-the-finite/Work-Video-Game-Meridian)) — playable at [`/play/meridian/`](https://despite-the-finite.github.io/Entropic-Labs/play/meridian/)
2. **Indra and the Wandering Words** ([Learn-to-Read](https://github.com/despite-the-finite/Learn-to-Read)) — playable at [`/play/wandering-words/`](https://despite-the-finite.github.io/Entropic-Labs/play/wandering-words/)
3. **Live Trivia** ([Trivia-Game](https://github.com/despite-the-finite/Trivia-Game))

Each entry carries a link straight to the project on GitHub plus a three-paragraph
summary of its README.

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
