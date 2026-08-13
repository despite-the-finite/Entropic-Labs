# assets/

Deliberately empty.

Every character, prop and backdrop in the game is drawn as inline SVG
(`js/art.js`) or painted with CSS gradients (`css/styles.css`), and every
sound is synthesised at runtime with WebAudio or spoken by the browser's
speech engine (`js/audio.js`). Nothing loads over the network, nothing has to
be waited for, and there are no missing-image boxes anywhere.

This is where to put real assets when you add them:

- `images/` — if you commission illustrations, drop them here and swap the
  drawing functions in `js/art.js`. Everything else reads `LTR.art.byId()`,
  so the rest of the codebase does not change.
- `audio/` — recorded letter sounds and words are the single biggest quality
  win available. Put them here and reimplement `LTR.audio.letterSound()` and
  `LTR.audio.word()` against an `<audio>` sprite; every caller already goes
  through those two functions.
