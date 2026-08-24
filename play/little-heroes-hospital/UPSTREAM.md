# Hosted copy — Little Heroes Hospital

This directory is a copy of the game, served from this site so the **Play it now**
button on `games.html` works in a browser with no setup.

- **Source:** https://github.com/despite-the-finite/Doctor-and-vet-game
- **Copied at commit:** `1efebf33684edcc99037c0a3e8f3ea80f88e9a49` (branch `claude/little-heroes-hospital-wniai3`)
- **Played at:** https://despite-the-finite.github.io/Entropic-Labs/play/little-heroes-hospital/

The game is entirely static — no build step and no dependencies. Every
character, room, X-ray plate and microscope slide is drawn as inline SVG and
CSS, and every sound is synthesised, so there are no binary assets to carry
across. `src/main.js` is loaded as an ES module, which needs `http(s)` rather
than `file://`; served off GitHub Pages like this, that is exactly what it
gets, and progress saves to `localStorage`.

The one thing it fetches from the network is its two display faces (Baloo 2 and
Nunito) from Google Fonts. That is a progressive enhancement rather than a
requirement — with the request blocked the game still lays out and plays
correctly in the fallback stack — so it is left as upstream has it rather than
patched here.

It is built for touch first: every interactive target is at least 56 px, every
drag also works as two taps, and Back and Home sit on every screen, so it plays
the same on a phone as on a laptop. Keep the `games.html` control notes in step
with this when refreshing the copy.

Upstream also ships a single-file build at `dist/little-heroes-hospital.html`.
It is not used here — the unbundled source is copied instead, matching the other
hosted games and keeping the diff readable when refreshing.

## Refreshing this copy

Nothing here is edited; treat it as read-only and re-copy when the game changes
upstream:

```bash
git clone --depth 1 https://github.com/despite-the-finite/Doctor-and-vet-game /tmp/lhh
rm -rf play/little-heroes-hospital/index.html play/little-heroes-hospital/src
cp -r /tmp/lhh/index.html /tmp/lhh/src play/little-heroes-hospital/
```

Then update the commit recorded above.
