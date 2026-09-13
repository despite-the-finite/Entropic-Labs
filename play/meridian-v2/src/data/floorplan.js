// Two floors, two departments:
//   GFS — Engineering (the original floor plan, modeled on a real EPC
//         office layout: desk pods, conference rooms, a break room).
//   CDB — Construction (estimators, schedulers, construction managers).
// Both are plain FLOORS entries sharing the same grid legend, so
// OfficeScene just picks whichever one it's told to render.
//
// Legend:
//   0 = open floor
//   1 = wall (solid)
//   2 = desk / conference table (solid)
//   3 = plant (solid, decorative)
//   6 = break room floor (walkable, slowly restores HP/MP — coffee break)
//
// Office battles are no longer random-tile encounters. Every conference
// room and every former "solid landmark" room (restrooms, huddle rooms,
// utility, etc.) is walkable, and each has one battleObject inside it —
// walk up and hit SPACE to fight, same interaction pattern as talking to
// an NPC. See OfficeScene.js's findNearbyBattleObject(). The one exception
// is any landmark labeled "STAIRS" — that's a real functional room: walk
// up and hit SPACE to open a floor-select menu instead (see
// OfficeScene.js's openStairsMenu()).

const FLOORS = {
  GFS: {
    tileSize: 32,
    width: 72,
    height: 26,
    layout: [
      "111111111111111111111111111111111111111111111111111111111111111111111111",
      "122002200220022002200011111111011111111011111111000220022002200220022001",
      "122002200220022002200010000001010000001010000001000220022002200220022001",
      "100000000000000000000010022001010022001010022001000000000000000000000001",
      "122002200220022002200010000001010000001010000001000220022002200220022001",
      "122002200220022002200011100111011100111011100111000220022002200220022001",
      "100000000000000000000000000000000000000000000000000000000000000000000001",
      "100002200220022002200000000000000000000000000000000220022002200220022001",
      "122002200220022002200000000000000000000000000000000220022002200220022001",
      "100000000000000000000000000000000000000000000000000000000000000000000001",
      "100002200220022002200111111111111166611111111111111220022002200220022001",
      "122002200220022002200100011666666666666666666660001220022002200220022001",
      "100000000000000000000100011666226666666666666660001000000000000000000001",
      "122002200220022002200002001666666666666666666100200220022002200220022001",
      "122002200220022002200100011666666666666226666110001220022002200220022001",
      "100000000000000000000100011666666666666666666110001000000000000000000001",
      "122002200220022002200111111111111166611111111111111220022002200220022001",
      "122002200220022002200000000000000000000000000000000220022002200220022001",
      "100000000000000000000000000000000000000000000000000000000000000000000001",
      "122002200220022002200000000000000000000000000000000220022002200220022001",
      "122002200220022002200000000000000000000000000000000220022002200220022001",
      "100000000000000000000000000000000000000000000000000000000000000000000001",
      "122002200220022002200000000000000000000000000000000220022002200220022001",
      "122002200220022002200000000000000000000000000000000220022002200220022001",
      "100000000000000000000000000000000000000000000000000000000000000000000001",
      "111111111111111111111111111111111111111111111111111111111111111111111111",
    ],

    // Non-walkable landmark rooms have all become walkable — see
    // battleObjects below for what's now inside each of them.
    landmarks: [
      { r0: 6, c0: 30, r1: 7, c1: 32, label: "STAIRS" },
      { r0: 6, c0: 35, r1: 7, c1: 37, label: "RESTROOMS" },
      { r0: 8, c0: 30, r1: 9, c1: 33, label: "PRINT/COPY" },
      { r0: 17, c0: 23, r1: 18, c1: 26, label: "HUDDLE\nEVANS" },
      { r0: 19, c0: 23, r1: 20, c1: 26, label: "QUIET ROOM" },
      { r0: 17, c0: 44, r1: 18, c1: 47, label: "HUDDLE\nSHERMAN" },
      { r0: 19, c0: 44, r1: 20, c1: 47, label: "MOTHER'S\nROOM" },
      { r0: 22, c0: 32, r1: 23, c1: 35, label: "UTILITY" },
      { r0: 22, c0: 40, r1: 23, c1: 43, label: "STAIRS" },
    ],

    roomLabels: [
      { x: 25.5, y: 1.5, text: "CONF: LA PLATA" },
      { x: 34.5, y: 1.5, text: "CONF: LONGS" },
      { x: 43.5, y: 1.5, text: "CONF: GRAYS" },
      { x: 23, y: 10.5, text: "CONF: PIKES" },
      { x: 48, y: 10.5, text: "CONF: QUANDARY" },
      { x: 35.5, y: 10.5, text: "BREAK ROOM" },
    ],

    // Decorative-only props (no gameplay effect) to make the floor feel
    // more lived-in.
    decor: [
      { x: 20, y: 6, type: "watercooler" },
      { x: 55, y: 6, type: "watercooler" },
      { x: 15, y: 18, type: "wallart" },
      { x: 58, y: 18, type: "wallart" },
    ],

    // Every battle in the office overworld starts here — walk up to one
    // of these and press SPACE. enemyId fixed = always that fight;
    // omitted = a random pick from ENEMIES, same variety the old random
    // encounters had.
    battleObjects: [
      { x: 24, y: 3, label: "Whiteboard (LA PLATA)" },
      { x: 33, y: 3, label: "Conference Phone (LONGS)" },
      { x: 42, y: 3, label: "AV Remote (GRAYS)" },
      { x: 48, y: 13, label: "Conference Table (QUANDARY)" },
      { x: 24, y: 13, label: "Conference Table (PIKES)" },
      { x: 36, y: 7, label: "Restroom Line" },
      { x: 31, y: 9, label: "Jammed Printer" },
      { x: 24, y: 18, label: "Huddle Room Whiteboard" },
      { x: 24, y: 20, label: "Quiet Room Phone" },
      { x: 45, y: 18, label: "Huddle Room Whiteboard" },
      { x: 45, y: 20, label: "Sign-Up Sheet" },
      { x: 33, y: 23, label: "Supply Cabinet" },
    ],

    // Player starting tile position (col, row) — right next to the home
    // base cubicle, so every session starts at the mode-select hub.
    playerStart: { x: 2, y: 9 },

    // NPC placements: tile position + which coworker data entry to use.
    // Wander gives a small waypoint loop (all on clear straight corridor
    // lines, so no pathfinding/collision-avoidance is needed) — the NPC
    // walks between them at a slow, steady pace instead of standing still.
    npcs: [
      { x: 10, y: 9, coworkerId: "mentor_dave" },
      { x: 5, y: 3, coworkerId: "renata_osei" },
      { x: 42, y: 2, coworkerId: "chip_wexford" },
      { x: 33, y: 2, coworkerId: "marla_voss" },
      { x: 65, y: 2, coworkerId: "trent_okafor" },
      {
        x: 24,
        y: 6,
        coworkerId: "deb_halverson",
        wander: [
          { x: 24, y: 6 },
          { x: 36, y: 6 },
        ],
      },
      {
        x: 27,
        y: 6,
        coworkerId: "gary_buffer",
        wander: [
          { x: 27, y: 6 },
          { x: 45, y: 6 },
        ],
      },
      { x: 61, y: 5, coworkerId: "wanda_price" },
      { x: 13, y: 18, coworkerId: "ottoline_cruz" },
      { x: 58, y: 12, coworkerId: "sanjay_bhatt" },
      { x: 35, y: 13, coworkerId: "lou" },
      { x: 25, y: 2, coworkerId: "reginald_cho" },
      { x: 49, y: 17, coworkerId: "marisol_fenwick" },
      {
        x: 35,
        y: 9,
        coworkerId: "priya_nair",
        wander: [
          { x: 35, y: 9 },
          { x: 35, y: 13 },
        ],
      },
      { x: 63, y: 9, coworkerId: "owen_baptiste" },
    ],

    // Home base — the player's own cubicle, and the single hub for every
    // mode (office / site visit / visitor day / PTO). Sits on the west
    // exterior wall (the main east-west corridor dead-ends there, so it
    // can't pinch any through-route).
    homeBase: {
      x: 1,
      y: 9,
      label: "YOUR CUBICLE",
      options: [
        { label: "Work the Office Floor", action: "close" },
        // Expanded at menu-open time into one entry per unlocked
        // SITE_VISITS id — see OfficeScene.buildSiteVisitOptions().
        { action: "site_visit_list" },
        {
          label: "Visitor Day",
          action: "travel",
          sceneKey: "VisitorScene",
          payload: {},
          transitionMessage: "Heading to Visitor Day...",
        },
        {
          label: "Take PTO",
          action: "pto",
          transitionMessage: "Requesting Time Off...",
        },
      ],
    },

    // Floors reachable from this one — every landmark room labeled "STAIRS"
    // (see landmarks above) is a physical trigger point that offers this
    // whole list as a floor-select menu (see OfficeScene.openStairsMenu).
    stairs: [
      {
        label: "CDB",
        toFloor: "CDB",
        arriveAt: { x: 22, y: 12 },
        transitionMessage: "Taking the stairs to CDB...",
      },
      {
        label: "EXEC",
        toFloor: "EXEC",
        arriveAt: { x: 20, y: 6 },
        transitionMessage: "Taking the stairs to EXEC...",
      },
    ],
  },

  CDB: {
    tileSize: 32,
    width: 42,
    height: 16,
    theme: "cdb",
    layout: [
      "111111111111111111111111111111111111111",
      "122002200220022011111111102200220022002",
      "122002200220022010000000102200220022002",
      "122002200220022010022000102200220022002",
      "122002200220022010000000102200220022002",
      "122002200220022011100111102200220022002",
      "100000000000000000000000000000000000000",
      "122002200220022000000000002200220022002",
      "122002200220022000000000002200220022002",
      "100000000000000000000000000000000000000",
      "122002200220022000000000002200220022002",
      "122002200220022000000000002200220022002",
      "100000000000000000000000000000000000000",
      "100000000000000000000000000000000000000",
      "100000000000000000000000000000000000000",
      "111111111111111111111111111111111111111",
    ],

    landmarks: [{ r0: 12, c0: 19, r1: 12, c1: 22, label: "STAIRS" }],

    roomLabels: [{ x: 20.5, y: 1.5, text: "CONF: FOUNDATION" }],

    battleObjects: [{ x: 19, y: 3, label: "Bid Board (FOUNDATION)" }],

    npcs: [
      { x: 7, y: 3, coworkerId: "frankie_dellucci" },
      { x: 33, y: 3, coworkerId: "wren_castellano" },
      { x: 7, y: 8, coworkerId: "bram_okonkwo" },
      { x: 33, y: 8, coworkerId: "sal_marchetti" },
      {
        x: 12,
        y: 12,
        coworkerId: "deja_marsh",
        wander: [
          { x: 12, y: 12 },
          { x: 28, y: 12 },
        ],
      },
    ],

    // No home base here — mode selection lives on GFS, at the player's
    // own desk. This floor is just somewhere else to work and fight.
    stairs: [
      {
        label: "GFS",
        toFloor: "GFS",
        arriveAt: { x: 34, y: 9 },
        transitionMessage: "Taking the stairs to GFS...",
      },
    ],
  },

  EXEC: {
    tileSize: 32,
    width: 41,
    height: 8,
    theme: "exec",
    // Matches GFS's EXEC stairs arriveAt — only used as a fallback if this
    // floor is ever entered without going through the stairs.
    playerStart: { x: 20, y: 6 },
    layout: [
      "11111111111111111111111111111111111111111",
      "11111111110111111111011111111101111111111",
      "11000000010100000001010000000101000000011",
      "11000000010100000001010000000101000000011",
      "11110011110111001111011100111101110011111",
      "10000000000000000000000000000000000000001",
      "10000000000000000000000000000000000000001",
      "11111111111111111111111111111111111111111",
    ],

    landmarks: [{ r0: 5, c0: 19, r1: 6, c1: 22, label: "STAIRS" }],

    roomLabels: [
      { x: 5, y: 0.5, text: "COO OFFICE" },
      { x: 15, y: 0.5, text: "CFO OFFICE" },
      { x: 25, y: 0.5, text: "COUNSEL OFFICE" },
      { x: 35, y: 0.5, text: "BOARDROOM" },
    ],

    // No random enemies up here — the three executives trigger a fight
    // via dialogue (see coworkers.js triggersBattle); the boardroom is the
    // only battle object, since nobody "is" the board individually.
    battleObjects: [{ x: 35, y: 2, label: "The Boardroom Table", enemyId: "board_review" }],

    npcs: [
      { x: 5, y: 2, coworkerId: "vance_holloway" },
      { x: 15, y: 2, coworkerId: "odette_fairweather" },
      { x: 25, y: 2, coworkerId: "marcus_windham" },
      { x: 4, y: 5, coworkerId: "priscilla_wynn" },
      { x: 14, y: 5, coworkerId: "desmond_cole" },
      { x: 24, y: 5, coworkerId: "yui_tanaka" },
    ],

    // Nobody on this floor will give you the time of day — NPC dialogue
    // and battle objects alike — until you've made Director (Lv.6+, see
    // ranks.js). Stairs and the floor itself stay reachable; only
    // interaction is gated.
    accessGate: {
      minLevel: 6,
      message:
        "A security guard blocks the hall. \"Directors and above only past this point. Come back when you've made rank.\"",
    },

    stairs: [
      {
        label: "GFS",
        toFloor: "GFS",
        arriveAt: { x: 38, y: 9 },
        transitionMessage: "Taking the stairs to GFS...",
      },
    ],
  },
};
