/* =============================================================================
   src/art/palette.js — the one place colors, fonts and text styles live
   -----------------------------------------------------------------------------
   Derived from the Industry design system: a steel-blue accent (#5980a6) and
   near-black ink (#16181c) on technical greys, with hi-vis yellow/orange
   reserved for construction and brass/gold reserved for the executive floor.
   Nothing in the game should hard-code a color that isn't here.
   ========================================================================== */

const C = {
  ink: 0x16181c,
  inkSoft: 0x2b2f36,
  panel: 0x12151a,
  paper: 0xf2f2f3,
  paperDim: 0xd9dadd,

  steel: 0x5980a6,
  steelDk: 0x3c5c7d,
  steelLt: 0x8fb0cd,
  steelPale: 0xc3d3e2,

  hiVis: 0xf2c53d,
  orange: 0xe8701a,
  gold: 0xd8b45a,
  green: 0x5f9a57,
  red: 0xc2453f,
  purple: 0x7d6f9c,
  amber: 0xe2a13a,

  screenGlow: 0x7fd3e8,
  metal: 0x8d939c,
  metalDk: 0x5f656e,
  sky: 0xb9d3e0,
};

// Hex strings for Phaser text styles
const CS = {
  paper: "#f2f2f3",
  paperDim: "#d9dadd",
  steel: "#5980a6",
  steelLt: "#8fb0cd",
  steelPale: "#c3d3e2",
  hiVis: "#f2c53d",
  gold: "#d8b45a",
  amber: "#e2a13a",
  green: "#8cc57f",
  red: "#ef8b85",
  ink: "#16181c",
  inkSoft: "#2b2f36",
};

// Barlow Condensed for anything that reads as a heading or a label on a
// drawing; Courier for readouts, logs and numbers (it aligns on the pixel
// grid and keeps the drafting-table feel). Both degrade gracefully offline.
const FONT_HEAD = "'Barlow Condensed', 'Oswald', 'Arial Narrow', sans-serif";
const FONT_BODY = "'Courier New', Courier, monospace";

// Per-floor accent, used by HUD chrome, room labels and menu trim so each
// floor's UI belongs to that floor.
const FLOOR_ACCENT = {
  gfs: { key: 0x5980a6, str: "#5980a6", lite: "#8fb0cd" },
  cdb: { key: 0xe8701a, str: "#e8701a", lite: "#f2a86a" },
  exec: { key: 0xd8b45a, str: "#d8b45a", lite: "#eccf92" },
};

// Text styles — functions, so every caller gets its own object and Phaser
// can't mutate a shared one.
const TS = {
  title: (size = 30, color = CS.paper) => ({
    fontFamily: FONT_HEAD,
    fontSize: size + "px",
    color,
    align: "center",
  }),
  label: (color = CS.steelPale, size = 12) => ({
    fontFamily: FONT_HEAD,
    fontSize: size + "px",
    color,
    stroke: "#0c0e12",
    strokeThickness: 4,
    align: "center",
  }),
  body: (color = CS.paper, size = 13, wrap = 0) => {
    const s = { fontFamily: FONT_BODY, fontSize: size + "px", color };
    if (wrap) s.wordWrap = { width: wrap };
    return s;
  },
  readout: (color = CS.steelPale, size = 12) => ({
    fontFamily: FONT_BODY,
    fontSize: size + "px",
    color,
  }),
  menu: (color = CS.paper, size = 14) => ({
    fontFamily: FONT_HEAD,
    fontSize: size + "px",
    color,
  }),
  tiny: (color = CS.steelPale, size = 10) => ({
    fontFamily: FONT_BODY,
    fontSize: size + "px",
    color,
  }),
};
