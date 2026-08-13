/* =============================================================================
   art.js — every character and prop, drawn as inline SVG.

   No image files: the whole cast is vector art built here, so the game is one
   folder of text and scales perfectly on any screen. Word pictures use emoji
   (see data/words.js) because they are instantly readable to a 4-year-old.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var A = LTR.art = {};

  function svg(inner, vb, cls) {
    return '<svg viewBox="' + (vb || '0 0 100 120') + '" xmlns="http://www.w3.org/2000/svg" ' +
           'class="' + (cls || '') + '" role="img" aria-hidden="true">' + inner + '</svg>';
  }

  /** Big friendly eyes with a highlight — the single most important detail. */
  function eyes(cx1, cx2, cy, r, look) {
    var dx = look === 'left' ? -r * 0.18 : look === 'right' ? r * 0.18 : 0;
    function one(cx) {
      return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + r + '" ry="' + (r * 1.1) + '" fill="#fff"/>' +
             '<circle cx="' + (cx + dx) + '" cy="' + (cy + r * 0.1) + '" r="' + (r * 0.62) + '" fill="#33283f"/>' +
             '<circle cx="' + (cx + dx + r * 0.24) + '" cy="' + (cy - r * 0.3) + '" r="' + (r * 0.24) + '" fill="#fff"/>';
    }
    return one(cx1) + one(cx2);
  }

  function blush(cx1, cx2, cy, r, color) {
    return '<ellipse cx="' + cx1 + '" cy="' + cy + '" rx="' + r + '" ry="' + (r * .62) + '" fill="' + (color || '#ff9db8') + '" opacity=".55"/>' +
           '<ellipse cx="' + cx2 + '" cy="' + cy + '" rx="' + r + '" ry="' + (r * .62) + '" fill="' + (color || '#ff9db8') + '" opacity=".55"/>';
  }

  function smile(cx, cy, w, d, color, sw) {
    return '<path d="M' + (cx - w) + ' ' + cy + ' Q' + cx + ' ' + (cy + d) + ' ' + (cx + w) + ' ' + cy +
           '" fill="none" stroke="' + (color || '#33283f') + '" stroke-width="' + (sw || 2.4) + '" stroke-linecap="round"/>';
  }

  /* ======================================================== PLAYER AVATAR == */

  A.SKINS      = ['#ffdcc0', '#f6c69a', '#d99a6c', '#a9683f', '#7a4525', '#ffd0b0'];
  A.HAIRCOLORS = ['#2f2a33', '#5b3a22', '#a5622c', '#e8b04b', '#c94f7c', '#5f4bd6'];
  A.OUTFITS    = ['#6bb6f0', '#7fd694', '#ff9db8', '#ffcf5c', '#a58cff', '#ff8a5b'];
  A.HAIRSTYLES = ['short', 'long', 'curly', 'buns'];
  A.HATS       = ['none', 'wizard', 'cap', 'flowers', 'crown'];

  /**
   * The player character. cfg = { skin, hair, hairColor, outfit, hat, backpack }
   * Indices are stored in the save, so unlocking new colours later is just a
   * matter of appending to the arrays above.
   */
  A.avatar = function (cfg, cls) {
    cfg = cfg || {};
    var skin = A.SKINS[cfg.skin % A.SKINS.length] || A.SKINS[0];
    var hair = A.HAIRCOLORS[cfg.hairColor % A.HAIRCOLORS.length] || A.HAIRCOLORS[0];
    var fit  = A.OUTFITS[cfg.outfit % A.OUTFITS.length] || A.OUTFITS[0];
    var style = cfg.hair || 'long';
    var hat = cfg.hat || 'none';
    var s = '';

    // backpack (behind body)
    if (cfg.backpack) {
      s += '<rect x="16" y="66" width="22" height="28" rx="8" fill="#c9743e"/>' +
           '<rect x="16" y="72" width="22" height="6" fill="#8f4f26"/>';
    }

    // long hair behind head
    if (style === 'long' || style === 'curly') {
      s += '<ellipse cx="50" cy="46" rx="27" ry="30" fill="' + hair + '"/>';
      s += '<path d="M24 44 Q18 78 26 94 L74 94 Q82 78 76 44Z" fill="' + hair + '" opacity=".95"/>';
    }

    // body
    s += '<path d="M31 96 Q30 70 50 68 Q70 70 69 96 Q69 106 60 106 L40 106 Q31 106 31 96Z" fill="' + fit + '"/>';
    s += '<path d="M31 96 Q50 102 69 96 L69 104 Q50 110 31 104Z" fill="rgba(0,0,0,.12)"/>';
    // arms
    s += '<circle cx="28" cy="86" r="7.5" fill="' + skin + '"/><circle cx="72" cy="86" r="7.5" fill="' + skin + '"/>';

    // head
    s += '<ellipse cx="50" cy="46" rx="23" ry="24" fill="' + skin + '"/>';
    s += '<path d="M27 40 Q50 8 73 40 Q66 26 50 24 Q34 26 27 40Z" fill="' + hair + '"/>';

    if (style === 'short')  s += '<path d="M27 42 Q28 20 50 19 Q72 20 73 42 Q64 28 50 28 Q36 28 27 42Z" fill="' + hair + '"/>';
    if (style === 'curly')  s += '<g fill="' + hair + '"><circle cx="30" cy="30" r="10"/><circle cx="44" cy="22" r="11"/><circle cx="58" cy="22" r="11"/><circle cx="71" cy="31" r="10"/></g>';
    if (style === 'buns')   s += '<g fill="' + hair + '"><circle cx="24" cy="26" r="9"/><circle cx="76" cy="26" r="9"/><path d="M27 42 Q28 18 50 18 Q72 18 73 42 Q64 28 50 28 Q36 28 27 42Z"/></g>';
    if (style === 'long')   s += '<path d="M27 40 Q26 18 50 18 Q74 18 73 40 Q64 27 50 27 Q36 27 27 40Z" fill="' + hair + '"/>';

    // face
    s += eyes(42, 58, 47, 5);
    s += smile(50, 56, 6, 6);
    s += blush(35, 65, 54, 5.5);

    // hats
    if (hat === 'wizard') {
      s += '<path d="M50 -2 L74 34 L26 34Z" fill="#5f4bd6"/>' +
           '<rect x="20" y="32" width="60" height="8" rx="4" fill="#4a37b5"/>' +
           '<circle cx="56" cy="18" r="3.2" fill="#ffd75e"/><circle cx="44" cy="26" r="2.6" fill="#ffd75e"/>';
    } else if (hat === 'cap') {
      s += '<path d="M26 30 Q28 12 50 12 Q72 12 74 30Z" fill="#ff6f61"/>' +
           '<rect x="24" y="28" width="52" height="6" rx="3" fill="#e0574a"/>' +
           '<path d="M70 28 Q88 30 88 36 L70 34Z" fill="#e0574a"/>';
    } else if (hat === 'flowers') {
      s += '<g><circle cx="32" cy="24" r="6" fill="#ff9db8"/><circle cx="32" cy="24" r="2.4" fill="#ffd75e"/>' +
           '<circle cx="50" cy="17" r="6.5" fill="#ffd75e"/><circle cx="50" cy="17" r="2.6" fill="#ff9db8"/>' +
           '<circle cx="68" cy="24" r="6" fill="#a58cff"/><circle cx="68" cy="24" r="2.4" fill="#fff2b0"/></g>';
    } else if (hat === 'crown') {
      s += '<path d="M28 26 L34 12 L42 22 L50 8 L58 22 L66 12 L72 26Z" fill="#ffd75e" stroke="#e0a51f" stroke-width="1.5" stroke-linejoin="round"/>' +
           '<circle cx="50" cy="20" r="2.6" fill="#ff6f9c"/>';
    }

    // The viewBox starts above y=0 so tall hats are never clipped.
    return svg(s, '0 -14 100 126', cls);
  };

  /* ============================================================ CHARACTERS = */

  /** Pip — the funny acorn-fox companion. Never stops talking. */
  A.pip = function (cls, mood) {
    var s = '';
    // tail
    s += '<path d="M74 92 Q104 84 96 56 Q92 36 74 42 Q88 52 84 70 Q80 84 66 88Z" fill="#f08a3c"/>' +
         '<path d="M92 52 Q98 66 90 78 Q96 62 88 50Z" fill="#ffd0a3"/>';
    // body
    s += '<ellipse cx="50" cy="82" rx="26" ry="26" fill="#f79b4e"/>';
    s += '<ellipse cx="50" cy="88" rx="16" ry="18" fill="#ffe3c4"/>';
    // feet
    s += '<ellipse cx="38" cy="105" rx="9" ry="6" fill="#e07a2e"/><ellipse cx="62" cy="105" rx="9" ry="6" fill="#e07a2e"/>';
    // ears
    s += '<path d="M26 44 L20 16 L44 32Z" fill="#f79b4e"/><path d="M28 40 L26 24 L40 33Z" fill="#ffc79b"/>';
    s += '<path d="M74 44 L80 16 L56 32Z" fill="#f79b4e"/><path d="M72 40 L74 24 L60 33Z" fill="#ffc79b"/>';
    // head
    s += '<ellipse cx="50" cy="48" rx="27" ry="24" fill="#f79b4e"/>';
    s += '<path d="M32 52 Q50 44 68 52 Q60 70 50 70 Q40 70 32 52Z" fill="#fff0dd"/>';
    s += eyes(40, 60, 45, 6);
    s += '<ellipse cx="50" cy="58" rx="4.4" ry="3.4" fill="#33283f"/>';
    s += mood === 'silly'
      ? '<path d="M44 63 Q50 70 56 63" fill="none" stroke="#33283f" stroke-width="2.4" stroke-linecap="round"/>' +
        '<ellipse cx="50" cy="68" rx="3.4" ry="4.6" fill="#ff6f8f"/>'
      : smile(50, 63, 6, 5);
    s += blush(30, 70, 56, 6, '#ff9d7a');
    // acorn hat
    s += '<path d="M36 26 Q50 12 64 26Z" fill="#8a5a37"/><ellipse cx="50" cy="26" rx="15" ry="4" fill="#a8703f"/>';
    return svg(s, '0 0 110 112', cls);
  };

  /** Luma — the wise lantern owl. Speaks slowly, always kind. */
  A.luma = function (cls) {
    var s = '';
    s += '<ellipse cx="50" cy="72" rx="30" ry="34" fill="#6f7fd6"/>';
    s += '<ellipse cx="50" cy="80" rx="20" ry="24" fill="#c9d4ff"/>';
    // wings
    s += '<path d="M22 60 Q10 80 24 98 Q22 78 30 66Z" fill="#5a68be"/>';
    s += '<path d="M78 60 Q90 80 76 98 Q78 78 70 66Z" fill="#5a68be"/>';
    // star speckles
    s += '<g fill="#ffe98a"><circle cx="34" cy="60" r="1.8"/><circle cx="66" cy="66" r="1.6"/><circle cx="42" cy="98" r="1.5"/><circle cx="60" cy="92" r="1.6"/></g>';
    // feet
    s += '<path d="M40 104 l-6 6 M40 104 l0 7 M40 104 l6 6" stroke="#ffb648" stroke-width="3" stroke-linecap="round" fill="none"/>';
    s += '<path d="M62 104 l-6 6 M62 104 l0 7 M62 104 l6 6" stroke="#ffb648" stroke-width="3" stroke-linecap="round" fill="none"/>';
    // head + tufts
    s += '<path d="M24 34 L20 14 L38 26Z" fill="#6f7fd6"/><path d="M76 34 L80 14 L62 26Z" fill="#6f7fd6"/>';
    s += '<ellipse cx="50" cy="40" rx="30" ry="26" fill="#7f8fe0"/>';
    // big spectacle-like eye discs
    s += '<circle cx="38" cy="38" r="13" fill="#f4f6ff"/><circle cx="62" cy="38" r="13" fill="#f4f6ff"/>';
    s += '<circle cx="38" cy="38" r="7" fill="#33283f"/><circle cx="62" cy="38" r="7" fill="#33283f"/>';
    s += '<circle cx="41" cy="35" r="2.6" fill="#fff"/><circle cx="65" cy="35" r="2.6" fill="#fff"/>';
    s += '<circle cx="38" cy="38" r="13.5" fill="none" stroke="#ffd75e" stroke-width="2"/>';
    s += '<circle cx="62" cy="38" r="13.5" fill="none" stroke="#ffd75e" stroke-width="2"/>';
    s += '<path d="M50 44 L44 52 L56 52Z" fill="#ffb648"/>';
    // lantern
    s += '<g><path d="M88 54 L88 44" stroke="#8a5a37" stroke-width="2"/>' +
         '<rect x="80" y="54" width="16" height="18" rx="4" fill="#ffd75e" opacity=".95"/>' +
         '<rect x="80" y="54" width="16" height="18" rx="4" fill="none" stroke="#c98a1e" stroke-width="2"/>' +
         '<circle cx="88" cy="63" r="4" fill="#fff6c9"/></g>';
    return svg(s, '0 0 104 116', cls);
  };

  /** Bramble — small worried hedgehog who loses things. */
  A.bramble = function (cls) {
    var s = '';
    s += '<path d="M14 92 Q10 46 50 40 Q90 46 86 92Z" fill="#8a6242"/>';
    for (var i = 0; i < 11; i++) {
      var x = 16 + i * 6.6, y = 92 - Math.sin(i / 10 * Math.PI) * 44;
      s += '<path d="M' + x + ' ' + (y + 8) + ' L' + (x + 3.4) + ' ' + (y - 8) + ' L' + (x + 6.8) + ' ' + (y + 8) + 'Z" fill="#6d4a30"/>';
    }
    s += '<ellipse cx="50" cy="92" rx="38" ry="14" fill="#a97b52"/>';
    // face
    s += '<ellipse cx="50" cy="86" rx="22" ry="18" fill="#ffe3c4"/>';
    s += eyes(42, 58, 84, 5);
    s += '<ellipse cx="50" cy="95" rx="4" ry="3" fill="#33283f"/>';
    s += smile(50, 99, 5, 4);
    s += blush(32, 68, 92, 5, '#ffb6a0');
    return svg(s, '0 0 100 112', cls);
  };

  /** Poppy — bouncy bunny who loves sounds. */
  A.poppy = function (cls) {
    var s = '';
    s += '<ellipse cx="50" cy="86" rx="24" ry="24" fill="#fff4f6"/>';
    s += '<ellipse cx="50" cy="92" rx="15" ry="16" fill="#ffe3ea"/>';
    s += '<ellipse cx="34" cy="106" rx="11" ry="7" fill="#fff4f6"/><ellipse cx="66" cy="106" rx="11" ry="7" fill="#fff4f6"/>';
    s += '<circle cx="76" cy="86" r="8" fill="#fff"/>';
    // ears
    s += '<ellipse cx="36" cy="24" rx="8" ry="24" fill="#fff4f6" transform="rotate(-10 36 24)"/>';
    s += '<ellipse cx="36" cy="26" rx="4" ry="17" fill="#ffb9cb" transform="rotate(-10 36 26)"/>';
    s += '<ellipse cx="64" cy="24" rx="8" ry="24" fill="#fff4f6" transform="rotate(10 64 24)"/>';
    s += '<ellipse cx="64" cy="26" rx="4" ry="17" fill="#ffb9cb" transform="rotate(10 64 26)"/>';
    // head
    s += '<ellipse cx="50" cy="56" rx="25" ry="22" fill="#fff4f6"/>';
    s += eyes(41, 59, 53, 5.6);
    s += '<path d="M46 63 L54 63 L50 68Z" fill="#ff8fae"/>';
    s += '<path d="M50 68 L50 71 M50 71 Q44 76 40 71 M50 71 Q56 76 60 71" fill="none" stroke="#33283f" stroke-width="2" stroke-linecap="round"/>';
    s += blush(32, 68, 64, 6, '#ffa8c0');
    return svg(s, '0 0 100 116', cls);
  };

  /** Tock — an extremely slow, extremely polite turtle. */
  A.tock = function (cls) {
    var s = '';
    s += '<ellipse cx="52" cy="82" rx="40" ry="26" fill="#4f9b6d"/>';
    s += '<ellipse cx="52" cy="76" rx="36" ry="24" fill="#6fbe86"/>';
    s += '<g fill="#3f8a5c" opacity=".8"><circle cx="52" cy="70" r="9"/><circle cx="30" cy="80" r="7"/><circle cx="74" cy="80" r="7"/><circle cx="42" cy="88" r="6"/><circle cx="64" cy="88" r="6"/></g>';
    s += '<ellipse cx="14" cy="86" rx="14" ry="12" fill="#8fd0a0"/>';
    s += eyes(10, 20, 82, 4);
    s += smile(14, 90, 4, 3);
    s += '<ellipse cx="30" cy="102" rx="9" ry="5" fill="#8fd0a0"/><ellipse cx="72" cy="102" rx="9" ry="5" fill="#8fd0a0"/>';
    return svg(s, '0 0 100 116', cls);
  };

  /** Grumblewink — hoards letters because he cannot read them yet. Not a villain. */
  A.grumblewink = function (cls, mood) {
    var happy = mood === 'happy';
    var s = '';
    s += '<g opacity=".55"><circle cx="26" cy="72" r="18" fill="#9aa6c9"/><circle cx="74" cy="72" r="18" fill="#9aa6c9"/></g>';
    s += '<path d="M18 78 Q10 44 34 34 Q44 16 62 26 Q86 26 84 54 Q96 70 80 84 Q50 96 18 78Z" fill="#aab6da"/>';
    s += '<path d="M24 76 Q18 50 38 42 Q46 30 60 36 Q78 38 76 58 Q86 70 72 80 Q48 88 24 76Z" fill="#c3cdea"/>';
    s += eyes(38, 62, 56, 7, happy ? 'right' : 'left');
    if (happy) {
      s += smile(50, 70, 9, 8, '#4a4368', 3);
      s += blush(28, 72, 68, 6, '#ffa8c0');
    } else {
      s += '<path d="M40 74 Q50 68 60 74" fill="none" stroke="#4a4368" stroke-width="3" stroke-linecap="round"/>';
      s += '<path d="M30 44 L46 50 M70 44 L54 50" stroke="#7d88ad" stroke-width="3" stroke-linecap="round"/>';
    }
    // letters he is clutching
    s += '<g font-family="inherit" font-weight="900" font-size="13" fill="#6b46d6">' +
         '<text x="16" y="92">A</text><text x="80" y="90">M</text><text x="48" y="98">S</text></g>';
    return svg(s, '0 0 100 108', cls);
  };

  /** The Lantern Wanderer — mysterious, warm, never frightening. */
  A.wanderer = function (cls) {
    var s = '';
    s += '<ellipse cx="50" cy="104" rx="30" ry="7" fill="rgba(255,215,94,.25)"/>';
    s += '<path d="M50 18 Q80 30 78 104 L22 104 Q20 30 50 18Z" fill="#3a3f87"/>';
    s += '<path d="M50 18 Q72 28 72 104 L58 104 Q62 40 50 18Z" fill="#4b52a8" opacity=".7"/>';
    s += '<g fill="#ffe98a"><circle cx="36" cy="52" r="1.8"/><circle cx="60" cy="44" r="1.5"/><circle cx="66" cy="72" r="2"/><circle cx="32" cy="82" r="1.6"/><circle cx="48" cy="92" r="1.4"/></g>';
    s += '<path d="M28 34 Q50 8 72 34 Q50 24 28 34Z" fill="#2c3170"/>';
    s += '<ellipse cx="50" cy="44" rx="18" ry="14" fill="#1d2150"/>';
    s += '<circle cx="43" cy="44" r="3.4" fill="#ffe98a"/><circle cx="57" cy="44" r="3.4" fill="#ffe98a"/>';
    s += '<g><path d="M84 60 L84 46" stroke="#c9a24a" stroke-width="2"/>' +
         '<rect x="76" y="60" width="16" height="18" rx="4" fill="#ffd75e"/>' +
         '<circle cx="84" cy="69" r="4.5" fill="#fff8d0"/></g>';
    return svg(s, '0 0 104 112', cls);
  };

  /* ================================================================= PROPS = */

  /** A treasure chest. Pass open:true for the reveal. */
  A.chest = function (open, cls) {
    var s = '';
    if (open) {
      s += '<path d="M12 46 Q50 20 88 46 L88 58 L12 58Z" fill="#a8703f" transform="rotate(-16 50 52)"/>';
      s += '<g><circle cx="50" cy="44" r="16" fill="#ffe98a" opacity=".5"/></g>';
    }
    s += '<rect x="12" y="56" width="76" height="44" rx="8" fill="#b57a4c"/>';
    s += '<rect x="12" y="56" width="76" height="10" fill="#8a5a37"/>';
    s += '<rect x="42" y="62" width="16" height="20" rx="4" fill="#ffd75e" stroke="#c98a1e" stroke-width="2"/>';
    s += '<circle cx="50" cy="72" r="3" fill="#8a5a37"/>';
    if (!open) s += '<path d="M12 56 Q50 26 88 56Z" fill="#a8703f"/><path d="M12 52 Q50 24 88 52" stroke="#8a5a37" stroke-width="5" fill="none"/>';
    return svg(s, '0 0 100 108', cls);
  };

  /** A stone door with a word carved into it. */
  A.door = function (word, cls) {
    var s = '';
    s += '<path d="M14 108 L14 48 Q50 8 86 48 L86 108Z" fill="#8f9bb5"/>';
    s += '<path d="M20 108 L20 52 Q50 18 80 52 L80 108Z" fill="#b4c0d6"/>';
    s += '<rect x="28" y="56" width="44" height="26" rx="6" fill="#fff8e9" opacity=".9"/>';
    s += '<text x="50" y="76" text-anchor="middle" font-family="inherit" font-weight="900" font-size="19" fill="#5b3fbd" letter-spacing="1">' +
         String(word || '').toUpperCase() + '</text>';
    s += '<circle cx="70" cy="94" r="5" fill="#ffd75e"/>';
    return svg(s, '0 0 100 112', cls);
  };

  /** Glowing firefly carrying a letter. */
  A.firefly = function (letter, cls) {
    var s = '';
    s += '<circle cx="50" cy="52" r="30" fill="#ffe066" opacity=".28"/>';
    s += '<circle cx="50" cy="52" r="21" fill="#fff3b0" opacity=".55"/>';
    s += '<ellipse cx="34" cy="40" rx="14" ry="9" fill="#ffffff" opacity=".65" transform="rotate(-24 34 40)"/>';
    s += '<ellipse cx="66" cy="40" rx="14" ry="9" fill="#ffffff" opacity=".65" transform="rotate(24 66 40)"/>';
    s += '<circle cx="50" cy="54" r="17" fill="#ffd75e"/>';
    s += '<text x="50" y="61" text-anchor="middle" font-family="inherit" font-weight="900" font-size="19" fill="#5b3fbd">' +
         (letter || '') + '</text>';
    return svg(s, '0 0 100 100', cls);
  };

  /** Forest mushroom with a letter on the cap. */
  A.mushroom = function (letter, color, cls) {
    var c = color || '#ff7a7a';
    var s = '';
    s += '<path d="M32 62 Q30 96 38 100 L62 100 Q70 96 68 62Z" fill="#fff0dd"/>';
    s += '<path d="M8 62 Q14 20 50 20 Q86 20 92 62Z" fill="' + c + '"/>';
    s += '<g fill="#fff" opacity=".75"><circle cx="28" cy="46" r="6"/><circle cx="70" cy="42" r="5"/><circle cx="52" cy="32" r="4"/></g>';
    s += '<text x="50" y="60" text-anchor="middle" font-family="inherit" font-weight="900" font-size="26" fill="#5b3fbd">' +
         (letter || '') + '</text>';
    return svg(s, '0 0 100 104', cls);
  };

  /** River stepping stone that a word can sit on. */
  A.stone = function (label, cls) {
    var s = '';
    s += '<ellipse cx="50" cy="58" rx="46" ry="30" fill="#8f9bb5"/>';
    s += '<ellipse cx="50" cy="52" rx="44" ry="28" fill="#b8c4d8"/>';
    s += '<ellipse cx="36" cy="42" rx="12" ry="7" fill="#d3dcea" opacity=".8"/>';
    if (label) {
      s += '<text x="50" y="60" text-anchor="middle" font-family="inherit" font-weight="900" font-size="24" fill="#3b3350">' +
           label + '</text>';
    }
    return svg(s, '0 0 100 90', cls);
  };

  /** A flower at one of four growth stages — used by the reward garden. */
  A.flower = function (stage, color, cls) {
    var c = color || '#ff9db8';
    var s = '<ellipse cx="50" cy="96" rx="22" ry="6" fill="rgba(0,0,0,.12)"/>';
    if (stage <= 0) {
      s += '<path d="M50 96 q-14 -6 -18 -16 q14 0 18 16Z" fill="#6fbe86"/>';
    } else {
      var h = [0, 34, 54, 70][Math.min(3, stage)];
      s += '<path d="M50 96 L50 ' + (96 - h) + '" stroke="#4f9b6d" stroke-width="6" stroke-linecap="round"/>';
      s += '<path d="M50 ' + (96 - h * .5) + ' q-18 -4 -20 -16 q16 0 20 16Z" fill="#6fbe86"/>';
      if (stage >= 2) {
        var cy = 96 - h;
        for (var i = 0; i < 6; i++) {
          var ang = i * Math.PI / 3;
          s += '<ellipse cx="' + (50 + Math.cos(ang) * 13) + '" cy="' + (cy + Math.sin(ang) * 13) + '" rx="9" ry="7" fill="' + c + '"/>';
        }
        s += '<circle cx="50" cy="' + cy + '" r="8" fill="#ffd75e"/>';
      }
    }
    return svg(s, '0 0 100 104', cls);
  };

  /** Bridge plank with an optional word carved on it (gap when word is null). */
  A.plank = function (word, cls) {
    var s = '';
    if (word !== null && word !== undefined) {
      s += '<rect x="4" y="26" width="92" height="34" rx="8" fill="#b57a4c"/>';
      s += '<rect x="4" y="26" width="92" height="10" rx="5" fill="#c98f5c"/>';
      s += '<text x="50" y="52" text-anchor="middle" font-family="inherit" font-weight="900" font-size="20" fill="#fff8e9">' +
           String(word).toUpperCase() + '</text>';
    } else {
      s += '<rect x="4" y="26" width="92" height="34" rx="8" fill="none" stroke="#8a5a37" stroke-width="3" stroke-dasharray="7 7" opacity=".8"/>';
      s += '<text x="50" y="52" text-anchor="middle" font-size="20" fill="#8a5a37" opacity=".7">?</text>';
    }
    return svg(s, '0 0 100 80', cls);
  };

  /* Named lookup so data files can reference characters as strings. */
  A.byId = function (id, cls, mood) {
    switch (id) {
      case 'pip':         return A.pip(cls, mood);
      case 'luma':        return A.luma(cls);
      case 'bramble':     return A.bramble(cls);
      case 'poppy':       return A.poppy(cls);
      case 'tock':        return A.tock(cls);
      case 'grumblewink': return A.grumblewink(cls, mood);
      case 'wanderer':    return A.wanderer(cls);
      case 'player':      return A.avatar(LTR.state.data ? LTR.state.data.player.avatar : {}, cls);
      default:            return A.pip(cls);
    }
  };

})(window.LTR);
