# Hosted copy — Donnell and McBurns: An EPC Epic, Version 2

This directory is a copy of the game, served from this site so the **Play Version 2**
button on `games.html` works in a browser with no setup.

Version 1 is preserved, untouched, alongside this one in `play/meridian/`. Both
are independently playable and neither redirects to the other; the games room
offers both and leads with this one.

- **Source:** https://github.com/despite-the-finite/Work-Video-Game-Meridian-2
- **Copied at commit:** `866d396c9d0a3b9a17144fb4dfd45136f53c1915` (branch `main`)
- **Played at:** https://theentropic.studio/play/meridian-v2/

This is the graphical overhaul. `Work-Video-Game-Meridian` is the first pass and
still ships as Version 1 next door; `-2` carries the same systems — story,
progression, XP, Bonus Potential, job titles, battles, enemies, coworkers, site
visits, change orders, dialogue, controls and touch support are all V1's,
deliberately unchanged — under an entirely new presentation layer: a baked
pixel-art library in place of V1's procedural blocks, four-direction animated
characters, dressed office floors, redesigned corporate monsters, a new battle
presentation, layered construction sites, and one UI kit across every screen.

The game is entirely static — relative paths, no build step, and Phaser 3 is
vendored in `src/vendor/` (MIT) rather than loaded from a CDN — so it runs as-is
off GitHub Pages. Where V1 drew every sprite at boot through Phaser's Graphics
API, V2 bakes its art ahead of time and ships it as data URIs inside
`src/art/atlas_*.js`, so there are still no image files to carry across; the
whole copy is HTML, CSS and JavaScript.

The one thing it fetches from the network is its two display faces (Barlow
Condensed and Barlow) from Google Fonts. That is a progressive enhancement
rather than a requirement — with the request blocked the game still lays out and
plays correctly in the fallback stack named in `src/art/palette.js` — so it is
left as upstream has it rather than patched here.

It plays on touch as well as a keyboard: `src/touch.js` shows an on-screen thumb
pad plus `SPACE` and `H` buttons on a touchscreen, and the canvas scales to fill
the window at 4:3. Keep the `games.html` control notes in step with this when
refreshing the copy.

Upstream also carries `tools/`, the bake-time art pipeline that writes
`src/art/atlas_*.js`. It never runs in a browser and is not copied here; a new
bake happens upstream and arrives through a refresh.

## Refreshing this copy

Nothing here is edited; treat it as read-only and re-copy when the game changes
upstream:

```bash
git clone --depth 1 https://github.com/despite-the-finite/Work-Video-Game-Meridian-2 /tmp/meridian2
rm -rf play/meridian-v2/index.html play/meridian-v2/src
cp -r /tmp/meridian2/index.html /tmp/meridian2/src play/meridian-v2/
```

Then update the commit recorded above.
