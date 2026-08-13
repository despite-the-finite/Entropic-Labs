![Entropic Labs](entropic-labs-banner.svg)

# Entropic Labs

Landing page for Entropic Labs, a recording and production studio run by **Despite the Finite**.

**Live site:** https://despite-the-finite.github.io/Entropic-Labs/

## Contents

- `index.html` — the entire site: markup, styles, and scripts in a single self-contained file (images embedded inline).
- `games.html` — the games page: video game design as a minor function of the studio, with links to each project's source.
- `play/meridian/` — a hosted copy of *Donnell and McBurns: An EPC Epic*, so it's playable straight from the site. Read-only; see `play/meridian/UPSTREAM.md` for the source commit and how to refresh it.
- `play/wandering-words/` — a hosted copy of *Indra and the Wandering Words*, same arrangement; see `play/wandering-words/UPSTREAM.md`.
- `entropic-labs-banner.svg` — the banner at the top of this README.
- `.nojekyll` — tells GitHub Pages to serve every file as-is, without running the content through Jekyll.

## Editing

Open `index.html` in a browser to preview, or in any editor to make changes. There's no build step — commit and push to `main`, and GitHub Pages picks up the change automatically within a minute or two.

## Sections

- Hero — studio wordmark and booking CTA
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
