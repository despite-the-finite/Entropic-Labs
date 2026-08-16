/* Entropic Labs — Observatory telemetry.
   ==========================================================================
   Everything on the status panel is computed here, in the browser, from the
   clock. There are no network calls and no API keys: a panel that needs a
   server to show the time is not instrumentation, it is decoration.

   Three kinds of value appear:

     LIVE        read from the system clock every tick (local time, UTC).
     COMPUTED    derived from the date by an actual algorithm (moon phase,
                 Voyager range and its signal delay).
     NOMINAL     a published constant that does not meaningfully change on
                 the timescale anyone will have this page open (ISS altitude
                 band, the size of the observable universe).

   Each row carries its kind so the panel can be honest about which is which.
   Anything approximate is derived from a dated reference constant below, so
   it stays right on its own rather than needing a human to edit a number.
   ========================================================================== */

(function (global) {
  'use strict';

  var AU_KM = 149597870.7;
  var C_KM_S = 299792.458;

  /* --- Reference constants. Update the epoch and value together, or not at
     all — the rates are good for decades. -------------------------------- */
  var VOYAGER_1 = {
    epoch: Date.UTC(2025, 0, 1),   // 2025-01-01T00:00:00Z
    au: 166.0,                     // heliocentric range at the epoch
    auPerYear: 3.58                // ~17.0 km/s, effectively constant now
  };

  var ISS_ALTITUDE_KM = 418;       // operating band is roughly 410–420 km
  var ISS_SPEED_KM_S = 7.66;
  var OBSERVABLE_UNIVERSE_GLY = 93; // comoving diameter, billions of light years

  var MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;
  var DEG = Math.PI / 180;

  function julianDay(date) {
    return date.getTime() / 86400000 + 2440587.5;
  }

  /* Moon illumination and phase, following the standard low-precision
     solution (Meeus, Astronomical Algorithms, ch. 48). Good to a fraction of
     a percent — far better than the naive "days since a known new moon"
     method, which drifts by up to a day because the Moon's orbit is not a
     circle. */
  function moon(date) {
    var T = (julianDay(date) - 2451545.0) / 36525;

    // mean elongation of the Moon from the Sun
    var D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T
          + (T * T * T) / 545868 - (T * T * T * T) / 113065000;
    // Sun's mean anomaly
    var M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T
          + (T * T * T) / 24490000;
    // Moon's mean anomaly
    var Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T
          + (T * T * T) / 69699 - (T * T * T * T) / 14712000;

    // phase angle of the Moon (Sun–Moon–Earth), degrees
    var i = 180 - D
          - 6.289 * Math.sin(Mp * DEG)
          + 2.100 * Math.sin(M * DEG)
          - 1.274 * Math.sin((2 * D - Mp) * DEG)
          - 0.658 * Math.sin(2 * D * DEG)
          - 0.214 * Math.sin(2 * Mp * DEG)
          - 0.110 * Math.sin(D * DEG);

    var illuminated = (1 + Math.cos(i * DEG)) / 2;

    // 0 = new, 0.5 = full. Elongation tells us which side of the cycle.
    var elong = ((D % 360) + 360) % 360;
    var cycle = elong / 360;

    var name;
    if (cycle < 0.02 || cycle > 0.98)      name = 'NEW';
    else if (cycle < 0.23)                 name = 'WAXING CRESCENT';
    else if (cycle < 0.27)                 name = 'FIRST QUARTER';
    else if (cycle < 0.48)                 name = 'WAXING GIBBOUS';
    else if (cycle < 0.52)                 name = 'FULL';
    else if (cycle < 0.73)                 name = 'WANING GIBBOUS';
    else if (cycle < 0.77)                 name = 'LAST QUARTER';
    else                                   name = 'WANING CRESCENT';

    return {
      illuminated: illuminated,
      percent: Math.round(illuminated * 100),
      cycle: cycle,
      name: name
    };
  }

  /* Voyager 1's range, extrapolated from a dated reference. The probe is on
     a hyperbolic escape trajectory far beyond any meaningful solar
     deceleration, so linear extrapolation is accurate to well under one
     percent over decades. */
  function voyager1(date) {
    var years = (date.getTime() - VOYAGER_1.epoch) / MS_PER_YEAR;
    var au = VOYAGER_1.au + VOYAGER_1.auPerYear * years;
    var km = au * AU_KM;
    return {
      au: au,
      km: km,
      billionKm: km / 1e9,
      lightHours: km / C_KM_S / 3600
    };
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function clock(date) {
    return {
      local: pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds()),
      localShort: pad(date.getHours()) + ':' + pad(date.getMinutes()),
      utc: pad(date.getUTCHours()) + ':' + pad(date.getUTCMinutes()) + ' UTC'
    };
  }

  /* The unknown meter. Catalogued objects are divided by an absurd
     denominator, so adding an observation moves it by almost nothing — which
     is both the joke and, as far as anyone can tell, the situation. */
  function unknownFraction(catalogued) {
    var known = (catalogued || 0) / 1000000;
    return Math.max(0, 1 - known);
  }

  function meter(fraction, cells) {
    cells = cells || 16;
    var filled = Math.min(cells, Math.max(0, Math.round(fraction * cells)));
    /* Never let it read completely full. Almost is the whole point, and a
       bar with no gap left in it stops being funny and starts being wrong. */
    if (fraction < 1 && filled >= cells) filled = cells - 1;
    var out = '';
    for (var i = 0; i < cells; i++) out += (i < filled ? '█' : '░');
    return out;
  }

  /* Builds the rows the panel renders. `catalogued` is the number of
     observations currently in the archive. */
  function read(date, catalogued) {
    date = date || new Date();
    var t = clock(date);
    var m = moon(date);
    var v = voyager1(date);
    var unknown = unknownFraction(catalogued);

    return [
      { key: 'LOCAL TIME', value: t.local, sub: t.utc, kind: 'live' },
      { key: 'EARTH', value: 'NOMINAL', kind: 'nominal' },
      { key: 'MOON', value: m.percent + '% ILLUMINATED', sub: m.name, kind: 'computed' },
      { key: 'ISS', value: ISS_ALTITUDE_KM + ' KM', sub: ISS_SPEED_KM_S.toFixed(2) + ' KM/S', kind: 'nominal' },
      { key: 'VOYAGER 1', value: v.billionKm.toFixed(1) + 'B KM', sub: Math.round(v.au) + ' AU', kind: 'computed' },
      { key: 'SIGNAL DELAY', value: v.lightHours.toFixed(1) + ' HR', sub: 'ONE WAY', kind: 'computed' },
      { key: 'KNOWN UNIVERSE', value: '~' + OBSERVABLE_UNIVERSE_GLY + 'B LY', kind: 'nominal' },
      { key: 'CATALOGUED', value: catalogued + ' OBJECTS', kind: 'live' },
      {
        key: 'UNKNOWN',
        value: meter(unknown),
        sub: (unknown * 100).toFixed(3) + '%',
        kind: 'computed',
        meter: true
      }
    ];
  }

  global.OBSERVATORY_TELEMETRY = {
    read: read,
    moon: moon,
    voyager1: voyager1,
    clock: clock,
    meter: meter,
    constants: {
      AU_KM: AU_KM,
      C_KM_S: C_KM_S,
      ISS_ALTITUDE_KM: ISS_ALTITUDE_KM,
      OBSERVABLE_UNIVERSE_GLY: OBSERVABLE_UNIVERSE_GLY
    }
  };
})(window);
