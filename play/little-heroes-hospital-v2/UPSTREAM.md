# Hosted copy — Little Heroes Hospital, Version 2

This directory is a copy of the game, served from this site so the **Play Version 2**
button on `games.html` works in a browser with no setup.

Version 1 is preserved, untouched, alongside this one in
`play/little-heroes-hospital/`. Both are independently playable and neither
redirects to the other; the games room offers both and leads with this one.

- **Source:** https://github.com/despite-the-finite/Doctor-and-vet-game-2
- **Copied at commit:** `4582652` (branch `main`)
- **Played at:** https://theentropic.studio/play/little-heroes-hospital-v2/

This is the redraw. `Doctor-and-vet-game` is the first pass and still ships as
Version 1 next door; `-2` carries the same fifty cases and the same engine
under a full art direction — a design-token
sheet, an icon set, a parts library, a four-plane scene system and drawn
artwork for all thirty-three tools and every room prop, so nothing in the
rendered game is an emoji or an icon font any more. The authored data still
names props and tools with emoji; those strings are now lookups into artwork
rather than anything a child sees.

The game is entirely static — no build step and no dependencies. Every
character, room, X-ray plate and microscope slide in the game is drawn as
inline SVG and CSS, and every sound is synthesised, so there are no binary
assets to carry across. `src/main.js` is loaded as an ES module, which needs
`http(s)` rather than `file://`; served off GitHub Pages like this, that is
exactly what it gets, and progress saves to `localStorage`.

Upstream now reads its dialogue aloud from pre-generated ElevenLabs clips in
`public/audio/`, written by a Node script that needs an API key. **No clips are
carried across** — that would be roughly two thousand MP3s, and it would be the
first binary asset on the site. Upstream commits `public/audio/voice-index.json`
empty precisely so a copy without them has nothing to 404 on, and the game then
speaks every line through the browser's own speech synthesis, which is what it
did before the clips existed and what this copy does now. That empty index is
copied along with `index.html` and `src/`; `src/core/voicePlayback.js` looks for
it next to the game, finds it, sees no recordings and falls back for good.
Nothing here ever calls ElevenLabs, and no key is involved in serving it.

The one thing it fetches from the network is its two display faces (Grandstander
and Nunito), pulled from Google Fonts by the `@import` at the top of
`src/styles/tokens.css`. That is a progressive enhancement rather than a
requirement — with the request blocked the game still lays out and plays
correctly in the fallback stack — so it is left as upstream has it rather than
patched here.

It is built for touch first: every interactive target is at least 56 px, every
drag also works as two taps, and Back and Home sit on every screen, so it plays
the same on a phone as on a laptop. Keep the `games.html` control notes in step
with this when refreshing the copy.

Upstream also ships a single-file build at `dist/little-heroes-hospital.html`
and a `<head>`-less fragment at `dist/artifact.html`. Neither is used here —
the unbundled source is copied instead, matching the other hosted games and
keeping the diff readable when refreshing. Its `package.json`, `tools/`, `docs/`
and `.env.example` are the voice-generation and validation side of the project
and play no part in serving the game, so they are not copied either.

## Refreshing this copy

Nothing here is edited; treat it as read-only and re-copy when the game changes
upstream:

```bash
git clone --depth 1 https://github.com/despite-the-finite/Doctor-and-vet-game-2 /tmp/lhh
rm -rf play/little-heroes-hospital-v2/index.html play/little-heroes-hospital-v2/src \
       play/little-heroes-hospital-v2/public
cp -r /tmp/lhh/index.html /tmp/lhh/src /tmp/lhh/public play/little-heroes-hospital-v2/
```

Then update the commit recorded above. If upstream has started committing the
generated MP3s, `public/audio/` will arrive heavy — drop everything under it
except `voice-index.json` and `manifest.json`, or decide deliberately that the
site now carries audio.
