# Hosted copy — Indra and the Wandering Words

This directory is a copy of the reading game, served from this site so the
**Play it now** button on `games.html` works in a browser with no setup.

- **Source:** https://github.com/despite-the-finite/Learn-to-Read
- **Copied at commit:** `2041d74` (branch `main`)
- **Played at:** https://despite-the-finite.github.io/Entropic-Labs/play/wandering-words/

The game is entirely static — classic `<script>` tags, no frameworks, no build
step, and no network calls of any kind. Every character and prop is inline SVG
and every sound effect is synthesised. Served over HTTP like this, progress
saves to `localStorage` on every platform.

It opens on the Entropic Labs studio ident — the logo video with its sound,
played full-screen by `js/ident.js` from `assets/video/entropic-ident.mp4` while the game loads underneath.
That one MP4 (about 1.2 MB) is the copy's only binary file, carried across
deliberately. Browsers won't start sound before the player interacts, so on a
first visit it shows "Tap to begin"; a tap or Enter/Space/Escape skips it once
it is playing, and `?noident` on the URL skips it entirely.

## Refreshing this copy

Nothing here is edited; treat it as read-only and re-copy when the game changes
upstream:

```bash
git clone --depth 1 https://github.com/despite-the-finite/Learn-to-Read /tmp/ltr
rm -rf play/wandering-words/index.html play/wandering-words/css play/wandering-words/js play/wandering-words/assets
cp -r /tmp/ltr/index.html /tmp/ltr/css /tmp/ltr/js /tmp/ltr/assets play/wandering-words/
```

Then update the commit recorded above.
