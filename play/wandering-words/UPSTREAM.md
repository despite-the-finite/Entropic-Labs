# Hosted copy — Indra and the Wandering Words

This directory is a copy of the reading game, served from this site so the
**Play it now** button on `games.html` works in a browser with no setup.

- **Source:** https://github.com/despite-the-finite/Learn-to-Read
- **Copied at commit:** `7cf6cb0880b595968ad3bcdea526e774bd6a7c52` (branch `main`)
- **Played at:** https://theentropic.studio/play/wandering-words/

One version ships, unlike the two games next door: upstream has a single
repository and moved `main` forward rather than starting a second one, and the
version this replaces could not unlock its own later chapters, so there is no
earlier build worth keeping playable beside this one.

This copy is the *"playable by a child who cannot read yet"* pass. Chapters 2–5
— Sound Valley, Word Village, Sentence Sea and Story Mountain — used to be
preview postcards and are now real, taking the game to five playable chapters
and around ninety reading interactions; two new minigames cover the two skills
that had none; and the interface no longer requires reading to get anywhere.
Every screen narrates itself on arrival, every button is a picture with the
word underneath, a 👂 ear button repeats the last thing said from the same
corner of every screen, and a pointing hand and idle nudges walk the child to
the next tap. The games room copy is written against this version — refreshing
this directory usually means rereading it.

The game is entirely static — classic `<script>` tags, no frameworks, no build
step, and no network calls of any kind. Every character and prop is inline SVG
and every sound is synthesised, so `assets/` is empty by design and there is
nothing to carry across. The voice is the browser's own speech synthesis, which
will not make a sound before the page has been touched, so the game opens on a
"tap anywhere to wake the book" screen rather than narrating into silence.
Served over HTTP like this, progress saves to `localStorage` on every platform.

`js/dev.js` ships because upstream's `index.html` loads it. It is off by default
and only appears with `?dev=1`, so it is left as upstream has it rather than
patched here.

## Refreshing this copy

Nothing here is edited; treat it as read-only and re-copy when the game changes
upstream:

```bash
git clone --depth 1 https://github.com/despite-the-finite/Learn-to-Read /tmp/ltr
rm -rf play/wandering-words/index.html play/wandering-words/css play/wandering-words/js play/wandering-words/assets
cp -r /tmp/ltr/index.html /tmp/ltr/css /tmp/ltr/js /tmp/ltr/assets play/wandering-words/
```

Then update the commit recorded above.
