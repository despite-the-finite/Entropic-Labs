/* =============================================================================
   src/art/tiles.js — which tile art goes where
   -----------------------------------------------------------------------------
   Pure functions over the existing floor grid. They never change what a tile
   DOES (walls stay solid, desks stay solid, break tiles stay break tiles) —
   they only decide which of the baked variants gets drawn, deterministically
   from (floor, x, y), so a floor looks hand-dressed but identical on every
   reload. Shared by the game and by tools/ so art can be previewed offline.
   ========================================================================== */

const TILES = {
  WALKABLE: { "0": 1, "6": 1 },

  themeOf(floor) {
    return floor && floor.theme ? floor.theme : "gfs";
  },

  hash(a, b, c) {
    let h = 2166136261 ^ (a * 374761393) ^ (b * 668265263) ^ (c * 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  },

  at(grid, x, y) {
    return grid[y] !== undefined ? grid[y][x] : undefined;
  },

  isWall(grid, x, y) {
    return this.at(grid, x, y) === "1";
  },

  isOpen(grid, x, y) {
    const ch = this.at(grid, x, y);
    return ch !== undefined && ch !== "1";
  },

  floorFrame(theme, x, y) {
    return `floor_${theme}_${this.hash(x, y, 3) % 3}`;
  },

  breakFrame(theme) {
    return `break_${theme}`;
  },

  // Same continuous-line rule V1 used (h/v/x by neighbors), except a wall
  // whose south side faces into a room is drawn as a full elevation instead
  // of a plan band — that's what makes rooms feel like rooms.
  wallFrame(grid, theme, x, y) {
    const facesRoom = this.isOpen(grid, x, y + 1) && !this.isWall(grid, x, y + 1);
    if (facesRoom) return this.wallFaceFrame(grid, theme, x, y);
    const horizontal = this.isWall(grid, x - 1, y) || this.isWall(grid, x + 1, y);
    const vertical = this.isWall(grid, x, y - 1) || this.isWall(grid, x, y + 1);
    if (horizontal && vertical) return `wall_${theme}_x`;
    if (vertical) return `wall_${theme}_v`;
    return `wall_${theme}_h`;
  },

  wallFaceFrame(grid, theme, x, y) {
    const h = this.hash(x, y, 11);
    // Exterior wall (nothing but outside above it) gets the windows.
    const exterior = !this.isOpen(grid, x, y - 1) && (y === 0 || this.at(grid, x, y - 1) === undefined || this.isWall(grid, x, y - 1));
    const outerEdge = y === 0 || this.at(grid, x, y - 1) === undefined;
    const table = {
      gfs: ["drawings", "drawings2", "board", "plain", "plain", "tv", "sign", "door"],
      cdb: ["board", "drawings", "sign", "plain", "plain", "tv", "door", "board"],
      exec: ["art", "plain", "plain", "glass", "sign", "art", "door", "plain"],
    }[theme];
    if (outerEdge && h % 10 < 7) return `face_${theme}_${h % 2 ? "window" : "window2"}`;
    if (exterior && h % 10 < 3) return `face_${theme}_window`;
    return `face_${theme}_${table[h % table.length]}`;
  },

  // A desk tile in a small enclosed room is a conference/plan table; out on
  // the open floor it's a workstation. Everything else is picked per floor so
  // GFS reads engineering, CDB reads construction and EXEC reads executive.
  isEnclosed(grid, x, y) {
    const near = (dx, dy) => {
      for (let i = 1; i <= 2; i++) if (this.isWall(grid, x + dx * i, y + dy * i)) return true;
      return false;
    };
    return (near(0, -1) && near(0, 1)) || (near(-1, 0) && near(1, 0));
  },

  deskFrame(grid, theme, x, y) {
    const h = this.hash(x, y, 17);
    if (this.isEnclosed(grid, x, y)) {
      if (theme === "cdb") return h % 3 === 0 ? `plan_table_${theme}` : `conf_table_${theme}`;
      if (theme === "exec") return `bo_boardroom_${theme}`;
      return `conf_table_${theme}`;
    }
    const pods = {
      gfs: ["desk_dual", "desk_dual", "desk_laptop", "desk_drawings", "desk_dual", "desk_laptop", "desk_drawings", "desk_empty", "desk_dual", "filing", "desk_laptop", "desk_dual"],
      cdb: ["desk_cdb", "desk_dual", "plan_table", "desk_laptop", "desk_cdb", "desk_dual", "desk_cdb", "boxes", "desk_laptop", "shelf", "desk_cdb", "desk_empty"],
      exec: ["desk_exec", "desk_exec", "desk_empty", "shelf"],
    }[theme];
    return `${pods[h % pods.length]}_${theme}`;
  },

  // Every desk tile that isn't a workstation-shaped prop also gets a chance
  // at an ambient seated worker (cosmetic only — desks are solid, so the
  // player can never reach them and nothing can be blocked).
  seatedAt(grid, theme, x, y) {
    if (this.isEnclosed(grid, x, y)) return this.hash(x, y, 29) % 7 === 0;
    return this.hash(x, y, 31) % 4 === 0;
  },

  plantFrame(theme, x, y) {
    if (theme === "exec") return `plant_exec_${theme}`;
    return this.hash(x, y, 41) % 2 ? `plant_tall_${theme}` : `plant_small_${theme}`;
  },

  // Ambient occlusion: a dark edge on floor tiles that touch a wall. Cheap
  // (one extra image per edge tile) and it's most of what kills the flat look.
  aoFrames(grid, x, y) {
    const out = [];
    if (this.isWall(grid, x, y - 1)) out.push("ao_n");
    if (this.isWall(grid, x, y + 1)) out.push("ao_s");
    if (this.isWall(grid, x - 1, y)) out.push("ao_w");
    if (this.isWall(grid, x + 1, y)) out.push("ao_e");
    return out;
  },

  // Battle objects keep their data-driven labels; the art is picked off the  // label text so each fight site looks like its own joke.
  battleObjectFrame(label, theme) {
    const l = (label || "").toLowerCase();
    let base = "bo_papers";
    if (/whiteboard/.test(l)) base = "bo_whiteboard";
    else if (/phone/.test(l)) base = "bo_phone";
    else if (/printer|copy/.test(l)) base = "bo_printer";
    else if (/cabinet|supply/.test(l)) base = "bo_cabinet";
    else if (/sign-up|sheet|line/.test(l)) base = "bo_signup";
    else if (/bid board/.test(l)) base = "bo_bid_board";
    else if (/boardroom/.test(l)) base = "bo_boardroom";
    else if (/conference table/.test(l)) base = "conf_table";
    else if (/remote|av/.test(l)) base = "bo_phone";
    return `${base}_${theme}`;
  },

  // Landmark rooms (restrooms, huddles, print/copy, utility, stairs...) get a
  // prop that matches the sign on the door.
  landmarkProps(label, theme) {
    const l = (label || "").toLowerCase();
    if (/print|copy/.test(l)) return ["plotter", "printer", "boxes"];
    if (/huddle/.test(l)) return ["whiteboard_free", "chair"];
    if (/quiet/.test(l)) return ["chair", "plant_small"];
    if (/utility/.test(l)) return ["shelf", "boxes"];
    if (/mother/.test(l)) return ["chair", "plant_small"];
    if (/restroom/.test(l)) return ["filing"];
    return ["chair"];
  },
};

// Which 64x64 equipment piece stands in for each site theme's "structure"
// (grid char 2) and "equipment" (grid char 3). Mirrors SITE_THEME_MAP in
// tools/art/site.js — kept here so SiteVisitScene doesn't need the bake tools.
const SITE_THEME_MAP_RUNTIME = {
  process: { structure: "steelframe", equipment: "vessel", extra: "piperack" },
  food: { structure: "steelframe", equipment: "skid", extra: "piperack" },
  power: { structure: "tower", equipment: "laydown", extra: "tower" },
  refinery: { structure: "column", equipment: "vessel", extra: "piperack" },
  bridge: { structure: "girder", equipment: "crane", extra: "girder" },
  water: { structure: "basin", equipment: "skid", extra: "basin" },
};
