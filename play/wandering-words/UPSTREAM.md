# Hosted copy — Indra and the Wandering Words

This directory is a copy of the reading game, served from this site so the
**Play it now** button on `games.html` works in a browser with no setup.

- **Source:** https://github.com/despite-the-finite/Learn-to-Read
- **Copied at commit:** `4f0e8e99c8009f22c4fec61643dc6a309d9e3a0b`
- **Played at:** https://despite-the-finite.github.io/Entropic-Labs/play/wandering-words/

The game is entirely static — classic `<script>` tags, no frameworks, no build
step, and no network calls of any kind. Every character and prop is inline SVG
and every sound is synthesised, so `assets/` is empty by design and there is
nothing to carry across. Served over HTTP like this, progress saves to
`localStorage` on every platform.

## Refreshing this copy

Nothing here is edited; treat it as read-only and re-copy when the game changes
upstream:

```bash
git clone --depth 1 https://github.com/despite-the-finite/Learn-to-Read /tmp/ltr
rm -rf play/wandering-words/index.html play/wandering-words/css play/wandering-words/js play/wandering-words/assets
cp -r /tmp/ltr/index.html /tmp/ltr/css /tmp/ltr/js /tmp/ltr/assets play/wandering-words/
```

Then update the commit recorded above.
