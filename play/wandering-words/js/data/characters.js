/* =============================================================================
   data/characters.js — the recurring cast.

   `art` maps to a drawing function in art.js. `voice` tweaks speech synthesis
   so each character sounds a little different when they speak.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var D = LTR.data = LTR.data || {};

  D.characters = {
    pip: {
      id: 'pip', name: 'Pip', art: 'pip',
      role: 'Your companion',
      blurb: 'A very small fox who is very sure he is very brave.',
      glyph: '🦊',
      voice: { pitch: 1.5, rate: .95 }
    },
    luma: {
      id: 'luma', name: 'Luma', art: 'luma',
      role: 'Keeper of the Great Book',
      blurb: 'A wise owl with a lantern full of old, patient light.',
      glyph: '🦉',
      voice: { pitch: .85, rate: .72 }
    },
    bramble: {
      id: 'bramble', name: 'Bramble', art: 'bramble',
      role: 'Forest friend',
      blurb: 'A hedgehog who loses things roughly once every ten minutes.',
      glyph: '🦔',
      voice: { pitch: 1.3, rate: .85 }
    },
    poppy: {
      id: 'poppy', name: 'Poppy', art: 'poppy',
      role: 'Forest friend',
      blurb: 'A bunny who hears every sound in the whole forest.',
      glyph: '🐰',
      voice: { pitch: 1.45, rate: 1 }
    },
    tock: {
      id: 'tock', name: 'Tock', art: 'tock',
      role: 'Forest friend',
      blurb: 'A turtle who is never in a hurry, not even a little.',
      glyph: '🐢',
      voice: { pitch: .8, rate: .6 }
    },
    grumblewink: {
      id: 'grumblewink', name: 'Grumblewink', art: 'grumblewink',
      role: 'Letter collector',
      blurb: 'He took the letters because nobody ever read him a story.',
      glyph: '☁️',
      voice: { pitch: .7, rate: .8 }
    },
    wanderer: {
      id: 'wanderer', name: 'The Lantern Wanderer', art: 'wanderer',
      role: 'Mysterious traveller',
      blurb: 'Leaves maps. Says little. Always turns up when you need a path.',
      glyph: '🏮',
      voice: { pitch: .95, rate: .68 }
    }
  };

  D.character = function (id) { return D.characters[id] || null; };

})(window.LTR);
