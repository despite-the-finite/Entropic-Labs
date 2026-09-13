// The walkable overworld — renders whichever floor it's told to (GFS, CDB or
// EXEC, see FLOORS in floorplan.js).
//
// GAMEPLAY IS UNCHANGED from V1: same grid legend, same collision footprints,
// same interaction radius, same battle objects, same stairs/cubicle menus,
// same break-room healing. What changed is how it's drawn:
//
//   * every static tile (floor, wall, wall elevation, furniture, baked desk
//     workers) is composited ONCE into a single RenderTexture, so a 72x26
//     floor costs one draw call per frame instead of ~1900
//   * walls whose south face looks into a room are drawn as full elevations
//     (windows, whiteboards, pinned drawings, artwork, doors)
//   * floors get variants + an ambient-occlusion edge where they meet walls
//   * furniture is picked per floor theme, so GFS reads engineering, CDB reads
//     construction and EXEC reads executive
//   * characters are animated 4-direction sprites from the character atlas
//   * a small budget of live ambient detail (typing coworkers, monitor glow,
//     steam, blinking equipment) sits on top

class OfficeScene extends Phaser.Scene {
  constructor() {
    super("OfficeScene");
  }

  init(data) {
    this.floorId = (data && data.floorId) || "GFS";
    this.floor = FLOORS[this.floorId];
    this.arrivePos = data && data.arrivePos;
    this.ptoResult = !!(data && data.ptoResult);
  }

  create() {
    AMBIENT.start("office");
    const T = this.floor.tileSize;
    this.tileSize = T;
    this.grid = this.floor.layout.map((row) => row.split(""));
    this.theme = TILES.themeOf(this.floor);
    this.accent = FLOOR_ACCENT[this.theme] || FLOOR_ACCENT.gfs;
    this.liveDeskBudget = 8;
    this.glowBudget = 14;

    this.proxLabels = [];
    this.hudMasked = [];
    this.solids = this.physics.add.staticGroup();
    this.renderStaticArt();
    this.buildCollision();

    // Landmark rooms (huddles, restrooms, print/copy, stairs...) — walkable,
    // each with a battleObject inside, exactly as V1. A room labeled "STAIRS"
    // instead carries the floor-select trigger.
    this.stairsGroup = this.physics.add.staticGroup();
    this.stairsData = [];
    this.rooms = [];
    (this.floor.landmarks || []).forEach((lm, i) => this.dressLandmark(lm, i));

    (this.floor.decor || []).forEach((d) => this.dressDecor(d));

    (this.floor.roomLabels || []).forEach((rl) => {
      this.maskBehindHud(UI.roomSign(this, rl.x * T, rl.y * T, rl.text, this.accent.key));
    });

    // Player — resume-from-battle position wins if set, then a cross-floor
    // stairs arrival point, then the floor's normal spawn.
    const returnPos = this.registry.get("returnPos");
    const start = returnPos || this.arrivePos || this.floor.playerStart || this.fallbackArrival();
    const startPx = returnPos ? start.x : start.x * T + T / 2;
    const startPy = returnPos ? start.y : start.y * T + T / 2;
    this.player = this.physics.add.sprite(startPx, startPy, CHARART.KEY, "player_0");
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(T * 0.6, T * 0.4);
    this.player.body.setOffset(T * 0.075, T * 0.55);
    this.physics.add.collider(this.player, this.solids);
    this.playerFacing = "down";
    CHARART.play(this.player, "player", "down", false);
    this.registry.remove("returnPos");

    // NPCs — a few wander a small waypoint loop instead of standing still.
    this.npcGroup = this.physics.add.staticGroup();
    this.npcData = [];
    this.wanderers = [];
    (this.floor.npcs || []).forEach((def) => this.spawnNpc(def));
    this.physics.add.collider(this.player, this.npcGroup);

    // Battle objects — every conference room and former-landmark room has one.
    this.battleObjectGroup = this.physics.add.staticGroup();
    this.battleObjectData = [];
    (this.floor.battleObjects || []).forEach((def) => this.spawnBattleObject(def));
    this.physics.add.collider(this.player, this.battleObjectGroup);

    // Home base — only GFS has one.
    this.homeBaseSprite = null;
    this.homeBaseGroup = null;
    if (this.floor.homeBase) this.spawnHomeBase();

    this.physics.add.collider(this.player, this.stairsGroup);

    // Camera / world bounds
    const worldW = this.floor.width * T;
    const worldH = this.floor.height * T;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    // Floors are narrower than the viewport in places (EXEC especially) —
    // fill the letterbox with the floor's own shadow tone instead of the
    // game's default near-black, so it reads as depth rather than a hole.
    this.cameras.main.setBackgroundColor(
      { gfs: "#5f666d", cdb: "#6b6353", exec: "#241e21" }[this.theme] || "#5f666d"
    );
    this.cameras.main.fadeIn(260, 0, 0, 0);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.homeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);

    if (this.floor.hasBreakRoom !== false) {
      this.time.addEvent({ delay: 1500, loop: true, callback: this.healTick, callbackScope: this });
    }

    this.buildHud();
    this.buildDialogueBox();
    if (this.floor.homeBase) this.buildModeMenu();
    this.buildStairsMenu();

    this.encounterLocked = false;
    this.activeDialogueNpc = null;
    this.currentRoom = null;

    this.refreshHud();

    if (this.ptoResult) this.applyPtoResult();
  }

  // Upper floors have no playerStart of their own — you always arrive via a
  // staircase, which carries its own arriveAt. If a floor is ever entered
  // without one (a debug jump, a future shortcut), borrow the arrival point
  // some other floor's stairs use for it rather than crashing on undefined.
  fallbackArrival() {
    for (const id of Object.keys(FLOORS)) {
      const hop = (FLOORS[id].stairs || []).find((s) => s.toFloor === this.floorId);
      if (hop && hop.arriveAt) return hop.arriveAt;
    }
    return { x: 2, y: 2 };
  }

  /* ---- static art ------------------------------------------------------- */

  // Everything that never moves goes into one texture. Order per tile is
  // floor -> ambient occlusion -> baked desk worker -> furniture, so a seated
  // coworker is correctly tucked behind their own desk.
  renderStaticArt() {
    const T = this.tileSize;
    const theme = this.theme;
    const W = this.floor.width * T;
    const H = this.floor.height * T;
    const rt = this.add.renderTexture(0, 0, W, H).setOrigin(0, 0).setDepth(-100);
    this.staticArt = rt;

    const seatPool = CHARART.ids(this).filter((id) => id.startsWith("npc_"));
    const liveDesks = [];

    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        const ch = this.grid[y][x];
        const px = x * T;
        const py = y * T;

        if (ch === "1") {
          rt.drawFrame("world", TILES.wallFrame(this.grid, theme, x, y), px, py);
          continue;
        }

        rt.drawFrame("world", ch === "6" ? TILES.breakFrame(theme) : TILES.floorFrame(theme, x, y), px, py);
        TILES.aoFrames(this.grid, x, y).forEach((f) => rt.drawFrame("world", f, px, py));

        if (ch === "2") {
          const deskFrame = TILES.deskFrame(this.grid, theme, x, y);
          const seated = TILES.seatedAt(this.grid, theme, x, y) && seatPool.length > 0;
          const wantsLive = seated && liveDesks.length < this.liveDeskBudget && TILES.hash(x, y, 71) % 3 === 0;
          if (seated && !wantsLive) {
            const id = seatPool[TILES.hash(x, y, 53) % seatPool.length];
            rt.drawFrame("chars", `${id}_9`, px + 4, py - 7);
          }
          rt.drawFrame("world", deskFrame, px, py);
          if (wantsLive) liveDesks.push({ x, y, deskFrame, id: seatPool[TILES.hash(x, y, 53) % seatPool.length] });
          // monitor glow on a budget — the screens that are "on"
          if (/desk_dual|desk_laptop|desk_cdb/.test(deskFrame) && this.glowBudget > 0 && TILES.hash(x, y, 67) % 4 === 0) {
            this.glowBudget--;
            FX.monitorGlow(this, px + T / 2, py + 12, 22, 10, { depth: -90 });
          }
        } else if (ch === "3") {
          rt.drawFrame("world", TILES.plantFrame(theme, x, y), px, py);
        }
      }
    }

    // A handful of desks get a live typing coworker, with their desk redrawn
    // on top so the animation sits behind the desk edge.
    liveDesks.forEach((d) => {
      const px = d.x * T;
      const py = d.y * T;
      const spr = this.add.sprite(px + T / 2, py + T / 2 - 7, CHARART.KEY, `${d.id}_9`).setDepth(py + 1);
      CHARART.type(spr, d.id);
      this.add.image(px + T / 2, py + T / 2, "world", d.deskFrame).setDepth(py + 2);
    });
  }

  // Invisible static bodies matching V1's collision footprints exactly.
  buildCollision() {
    const T = this.tileSize;
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        const ch = this.grid[y][x];
        if (ch !== "1" && ch !== "2" && ch !== "3") continue;
        const px = x * T + T / 2;
        const py = y * T + T / 2;
        const body = this.solids.create(px, py, "world", "ao_n").setVisible(false);
        const s = ch === "3" ? T * 0.6 : T;
        body.setSize(s, s).refreshBody();
      }
    }
  }

  dressLandmark(lm, index) {
    const T = this.tileSize;
    const rt = this.staticArt;
    const isStairs = lm.label === "STAIRS";
    // Back-of-house rooms get vinyl instead of carpet, which is most of why
    // a print room reads differently from the open floor.
    for (let y = lm.r0; y <= lm.r1; y++) {
      for (let x = lm.c0; x <= lm.c1; x++) {
        rt.drawFrame("world", TILES.breakFrame(this.theme), x * T, y * T);
        TILES.aoFrames(this.grid, x, y).forEach((f) => rt.drawFrame("world", f, x * T, y * T));
      }
    }

    const cx = ((lm.c0 + lm.c1 + 1) / 2) * T;
    const cy = ((lm.r0 + lm.r1 + 1) / 2) * T;
    this.rooms.push({ lm, cx, cy });

    if (isStairs) {
      // Alternating stairwell / elevator lobby, so the two GFS stair rooms
      // aren't the same room twice.
      const useElevator = index % 2 === 1;
      const frame = `${useElevator ? "elevator" : "stairs"}_${this.theme}`;
      const spr = this.stairsGroup.create(cx, cy, "world", frame);
      spr.setDepth(cy);
      spr.setSize(T * 0.9, T * 0.9).refreshBody();
      this.stairsData.push({ sprite: spr });
      if (useElevator) FX.blink(this, cx, cy - T * 0.42, C.amber, { size: 3, depth: cy + 1 });
      this.maskBehindHud(UI.worldLabel(this, cx, cy - T * 0.95, useElevator ? "ELEVATORS" : "STAIRS", this.accent.lite));
    } else {
      // Props that match the sign on the door.
      const props = TILES.landmarkProps(lm.label, this.theme);
      let slot = 0;
      for (let x = lm.c0; x <= lm.c1 && slot < props.length; x++) {
        const frame = `${props[slot]}_${this.theme}`;
        rt.drawFrame("world", frame, x * T, lm.r0 * T);
        if (/printer|plotter/.test(props[slot])) {
          FX.blink(this, x * T + T * 0.75, lm.r0 * T + 11, C.green, { size: 2, depth: -90 });
        }
        slot++;
      }
      this.maskBehindHud(UI.roomSign(this, cx, cy - T * 0.75, lm.label.replace("\n", " "), this.accent.key));
    }
  }

  dressDecor(d) {
    const T = this.tileSize;
    const px = d.x * T;
    const py = d.y * T;
    if (d.type === "watercooler") {
      // Solid in V1 — keep it solid.
      const spr = this.solids.create(px + T / 2, py + T / 2, "world", `water_cooler_${this.theme}`);
      spr.setDepth(py + T / 2);
      spr.setSize(T * 0.6, T * 0.6).refreshBody();
      return;
    }
    // Everything else is drawn into the static art and stays walk-through,
    // same as V1's decorative wall art.
    const map = {
      wallart: { gfs: "whiteboard_free", cdb: "bo_bid_board", exec: "plant_exec" },
      coffee: { gfs: "coffee", cdb: "coffee", exec: "coffee" },
      fridge: { gfs: "fridge", cdb: "fridge", exec: "fridge" },
      microwave: { gfs: "microwave", cdb: "microwave", exec: "microwave" },
      plant: { gfs: "plant_tall", cdb: "plant_tall", exec: "plant_exec" },
      shelf: { gfs: "shelf", cdb: "shelf", exec: "shelf" },
      boxes: { gfs: "boxes", cdb: "boxes", exec: "boxes" },
      chair: { gfs: "chair", cdb: "chair", exec: "chair" },
      plotter: { gfs: "plotter", cdb: "plotter", exec: "plotter" },
      printer: { gfs: "printer", cdb: "printer", exec: "printer" },
      plan_table: { gfs: "plan_table", cdb: "plan_table", exec: "plan_table" },
      exec_desk: { gfs: "desk_exec", cdb: "desk_exec", exec: "desk_exec" },
      whiteboard: { gfs: "whiteboard_free", cdb: "whiteboard_free", exec: "whiteboard_free" },
      filing: { gfs: "filing", cdb: "filing", exec: "filing" },
    }[d.type];
    if (!map) return;
    this.staticArt.drawFrame("world", `${map[this.theme]}_${this.theme}`, px, py);
    if (d.type === "coffee") FX.steam(this, px + T * 0.42, py + T * 0.36, { depth: -90 });
    if (d.type === "printer" || d.type === "plotter") {
      FX.blink(this, px + T * 0.75, py + 11, C.green, { size: 2, depth: -90 });
    }
  }

  /* ---- actors ----------------------------------------------------------- */

  spawnNpc(def) {
    const T = this.tileSize;
    const cw = COWORKERS[def.coworkerId];
    const px = def.x * T + T / 2;
    const py = def.y * T + T / 2;
    const charId = CHARART.has(this, `npc_${def.coworkerId}`) ? `npc_${def.coworkerId}` : "npc_mentor_dave";

    let spr;
    if (def.wander) {
      spr = this.physics.add.sprite(px, py, CHARART.KEY, `${charId}_0`);
      this.physics.add.collider(spr, this.solids);
      this.physics.add.collider(this.player, spr);
      this.wanderers.push({
        sprite: spr,
        charId,
        waypoints: def.wander.map((w) => ({ x: w.x * T + T / 2, y: w.y * T + T / 2 })),
        index: 0,
        state: "idle",
        timer: Phaser.Math.Between(500, 2000),
      });
    } else {
      spr = this.npcGroup.create(px, py, CHARART.KEY, `${charId}_0`);
      spr.setSize(T * 0.6, T * 0.5).refreshBody();
    }
    spr.setDepth(py);
    CHARART.play(spr, charId, "down", false);
    this.npcData.push({ sprite: spr, coworker: cw, lineIndex: 0, charId });

    this.addProxLabel(UI.worldLabel(this, px, py - T * 0.85, cw.name, this.accent.lite), px, py);
  }

  spawnBattleObject(def) {
    const T = this.tileSize;
    const px = def.x * T + T / 2;
    const py = def.y * T + T / 2;
    const spr = this.battleObjectGroup.create(px, py, "world", TILES.battleObjectFrame(def.label, this.theme));
    spr.setDepth(py);
    spr.setSize(T * 0.7, T * 0.7).refreshBody();
    this.battleObjectData.push({ sprite: spr, def });
    // A red tack over every fight site: the one consistent "this is a problem"
    // signal on the floor.
    const tack = this.add.rectangle(px + T * 0.34, py - T * 0.34, 5, 5, C.red).setDepth(py + 1);
    this.tweens.add({ targets: tack, alpha: { from: 1, to: 0.35 }, scale: { from: 1, to: 1.25 }, duration: 750, yoyo: true, repeat: -1 });
    // The label is long and there are a lot of these — only show it when the
    // player is close enough for it to be an actual choice.
    this.addProxLabel(UI.worldLabel(this, px, py - T * 0.8, def.label, "#ef8b85"), px, py);
  }

  spawnHomeBase() {
    const T = this.tileSize;
    const hb = this.floor.homeBase;
    this.homeBaseGroup = this.physics.add.staticGroup();
    const hbPx = hb.x * T + T / 2;
    const hbPy = hb.y * T + T / 2;
    this.homeBaseSprite = this.homeBaseGroup.create(hbPx, hbPy, "world", `cubicle_home_${this.theme}`);
    this.homeBaseSprite.setDepth(hbPy);
    this.homeBaseSprite.setSize(T, T).refreshBody();
    FX.monitorGlow(this, hbPx - T * 0.15, hbPy - T * 0.12, 20, 10, { depth: hbPy + 1 });
    this.maskBehindHud(UI.roomSign(this, hbPx + T * 0.5, hbPy - T * 0.85, hb.label, this.accent.key));
    this.physics.add.collider(this.player, this.homeBaseGroup);
  }

  // Room signs live in the world and scroll with the floor, so one can slide
  // underneath the fixed HUD panel and simply vanish (the EXEC floor's office
  // signs sit high enough to do this often). Anything registered here fades
  // out while it is behind the HUD instead of being swallowed by it.
  maskBehindHud(obj) {
    this.hudMasked.push(obj);
    return obj;
  }

  updateHudMasking() {
    const view = this.cameras.main.worldView;
    // HUD footprint in screen space, plus the pending-promotion strip when shown.
    const w = 286;
    const h = PLAYER_STATE.levelUpPending ? 124 : 96;
    this.hudMasked.forEach((o) => {
      // Test the sign's own box, not just its centre — these are wide plates,
      // and a centre-only test leaves half a sign poking out from under the HUD.
      const halfW = (o.panelWidth || o.width || 80) / 2;
      const sx = o.x - view.x;
      const sy = o.y - view.y;
      const behind = sx - halfW < w && sy - 14 < h;
      const target = behind ? 0 : 1;
      if (o.hudAlphaTarget === target) return;
      o.hudAlphaTarget = target;
      this.tweens.add({ targets: o, alpha: target, duration: 160 });
    });
  }

  // World labels are hidden until the player is near. A floor this dense
  // turns into unreadable soup otherwise.
  addProxLabel(label, x, y, range) {
    label.setVisible(false);
    this.proxLabels.push({ label, x, y, range: range || this.tileSize * 3.4 });
    return label;
  }

  updateProxLabels() {
    this.proxLabels.forEach((e) => {
      const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) < e.range;
      if (near !== e.label.visible) e.label.setVisible(near);
    });
  }

  // A single prompt that follows whatever is currently actionable, so the
  // player never has to guess whether SPACE will do anything.
  updateActionPrompt() {
    const npc = this.findNearbyNpc();
    const battleObj = this.findNearbyBattleObject();
    const homeBase = this.findNearbyHomeBase();
    const stairs = this.findNearbyStairs();
    let target = null;
    let verb = "";
    if (npc) {
      target = npc.sprite;
      verb = "TALK";
    } else if (battleObj) {
      target = battleObj.sprite;
      verb = "RESOLVE";
    } else if (homeBase) {
      target = this.homeBaseSprite;
      verb = "WORK";
    } else if (stairs) {
      target = this.stairsData.find(
        (st) => Phaser.Math.Distance.Between(this.player.x, this.player.y, st.sprite.x, st.sprite.y) < this.tileSize * 1.2
      ).sprite;
      verb = "FLOORS";
    }
    if (!target) {
      if (this.actionPrompt.visible) this.actionPrompt.setVisible(false);
      return;
    }
    if (this.promptVerb !== verb) {
      this.promptVerb = verb;
      this.actionPromptText.setText("SPACE \u2014 " + verb);
      const w = this.actionPromptText.width + 18;
      this.actionPromptBg.clear();
      this.actionPromptBg.fillStyle(C.ink, 0.82);
      this.actionPromptBg.fillRect(-w / 2, -11, w, 22);
      this.actionPromptBg.lineStyle(1, this.accent.key, 1);
      this.actionPromptBg.strokeRect(-w / 2 + 0.5, -10.5, w - 1, 21);
    }
    this.actionPrompt.setPosition(target.x, target.y - this.tileSize * 1.15);
    this.actionPrompt.setVisible(true);
  }

  /* ---- HUD -------------------------------------------------------------- */

  buildHud() {
    const p = PLAYER_STATE;
    this.hudPanel = UI.panel(this, 6, 6, 268, 78, {
      title: getRankTitle(p.level, p.executiveUnlocked).toUpperCase(),
      stamp: this.floorId,
      accent: this.accent.key,
      titleColor: this.accent.lite,
    }).setScrollFactor(0);
    this.hudPanel.setDepth(20000);

    this.hudLevelText = this.add.text(14, 26, "", TS.readout(CS.steelPale, 11)).setScrollFactor(0).setDepth(20001);
    this.hpBar = UI.bar(this, 46, 40, 138, 9, C.green);
    this.mpBar = UI.bar(this, 46, 53, 138, 9, C.steel);
    this.bonusBar = UI.bar(this, 46, 66, 138, 9, C.gold);
    [this.hpBar, this.mpBar, this.bonusBar].forEach((b) => b.g.setScrollFactor(0).setDepth(20001));

    const lab = (y, text) =>
      this.add.text(14, y - 1, text, TS.readout(CS.steelPale, 10)).setScrollFactor(0).setDepth(20001);
    lab(40, "HP");
    lab(53, "MP");
    lab(66, "BONUS");

    this.hpText = this.add.text(190, 39, "", TS.readout(CS.paper, 10)).setScrollFactor(0).setDepth(20001);
    this.mpText = this.add.text(190, 52, "", TS.readout(CS.paper, 10)).setScrollFactor(0).setDepth(20001);
    this.bonusText = this.add.text(190, 65, "", TS.readout(CS.paper, 10)).setScrollFactor(0).setDepth(20001);

    // Pending-promotion strip — only shown when there's a promotion waiting.
    this.pendingPanel = UI.panel(this, 6, 88, 268, 26, { accent: C.gold, alpha: 0.9 })
      .setScrollFactor(0)
      .setDepth(20000);
    this.pendingText = this.add
      .text(16, 101, "PROMOTION PENDING — approve a change order on-site", TS.readout(CS.gold, 10))
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(20001);
    this.pendingPanel.setVisible(false);
    this.pendingText.setVisible(false);

    this.helpText = this.add
      .text(8, 464, "ARROWS/WASD MOVE   SPACE TALK/INTERACT   H CUBICLE", {
        fontFamily: FONT_HEAD,
        fontSize: "12px",
        color: CS.steelPale,
        stroke: "#0b0d10",
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setDepth(20000);

    // Floating action prompt (built once, re-targeted every frame).
    this.actionPromptBg = this.add.graphics();
    this.actionPromptText = this.add.text(0, 0, "", TS.label(CS.paper, 12)).setOrigin(0.5);
    this.actionPrompt = this.add.container(0, 0, [this.actionPromptBg, this.actionPromptText]).setDepth(9500);
    this.actionPrompt.setVisible(false);
    this.promptVerb = null;
    this.tweens.add({ targets: this.actionPrompt, alpha: { from: 1, to: 0.55 }, duration: 620, yoyo: true, repeat: -1 });

    this.roomCaption = this.add
      .text(320, 44, "", { fontFamily: FONT_HEAD, fontSize: "16px", color: CS.paper, stroke: "#0b0d10", strokeThickness: 5 })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20000)
      .setAlpha(0);
  }

  refreshHud() {
    const p = PLAYER_STATE;
    if (this.hudPanel.titleText) {
      this.hudPanel.titleText.setText(getRankTitle(p.level, p.executiveUnlocked).toUpperCase());
    }
    this.hudLevelText.setText(`LV.${p.level}   XP ${p.xp}/${p.xpToNext}`);
    this.hpBar.setValue(p.hp / p.maxHp, true);
    this.hpBar.setColor(p.hp / p.maxHp < 0.34 ? C.red : p.hp / p.maxHp < 0.67 ? C.amber : C.green);
    this.mpBar.setValue(p.mp / p.maxMp, true);
    this.bonusBar.setValue(p.bonusPotential / 100, true);
    this.hpText.setText(`${p.hp}/${p.maxHp}`);
    this.mpText.setText(`${p.mp}/${p.maxMp}`);
    const wellFed = p.wellFedBattles > 0 ? ` +FED x${p.wellFedBattles}` : "";
    this.bonusText.setText(`${p.bonusPotential}${wellFed}`);
    this.bonusBar.setColor(p.bonusPotential < 25 ? C.red : p.bonusPotential < 50 ? C.amber : C.gold);
    this.pendingPanel.setVisible(!!p.levelUpPending);
    this.pendingText.setVisible(!!p.levelUpPending);
  }

  showRoomCaption(text) {
    this.roomCaption.setText(text);
    this.tweens.killTweensOf(this.roomCaption);
    this.roomCaption.setAlpha(0).setScale(0.9);
    this.tweens.add({ targets: this.roomCaption, alpha: 1, scale: 1, duration: 200, ease: "Back.easeOut" });
    this.time.delayedCall(1400, () => {
      this.tweens.add({ targets: this.roomCaption, alpha: 0, duration: 400 });
    });
  }

  // Used on gated floors (EXEC) — a stand-in "NPC" so the rebuff message
  // reuses the same dialogue box/advance flow instead of a new system.
  showGateMessage(message) {
    this.activeDialogueNpc = {
      coworker: { name: "Security", dialogue: [message] },
      lineIndex: 0,
      activeLines: [message],
      readyForBoss: false,
    };
    this.dialogueContainer.setVisible(true);
    this.showDialogueLine();
  }

  applyPtoResult() {
    const p = PLAYER_STATE;
    const cost = 15;
    const before = p.bonusPotential;
    p.hp = p.maxHp;
    p.mp = p.maxMp;
    p.bonusPotential = Phaser.Math.Clamp(p.bonusPotential - cost, 0, 100);
    this.refreshHud();

    AMBIENT.start("pto");
    this.ptoActive = true;

    const bg = this.add.rectangle(320, 240, 640, 480, 0x0d2f3c, 0.9).setScrollFactor(0).setDepth(25000);
    const panel = UI.panel(this, 70, 150, 500, 180, {
      title: "TIME OFF APPROVED",
      stamp: "PTO",
      accent: C.steelLt,
    })
      .setScrollFactor(0)
      .setDepth(25001);
    const banner = this.add
      .text(
        320,
        220,
        `Colleen and Indra pulled off a long weekend away.\nHP/MP fully restored.\nBonus Potential -${before - p.bonusPotential} (now ${p.bonusPotential}/100 — ${getBonusLabel(p.bonusPotential)}).`,
        { fontFamily: FONT_BODY, fontSize: "13px", color: CS.paper, align: "center", wordWrap: { width: 440 } }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(25002);
    const prompt = UI.prompt(this, 320, 300, "[SPACE] BACK TO THE OFFICE").setScrollFactor(0).setDepth(25002);

    this.ptoElements = [bg, panel, banner, prompt];
  }

  closePto() {
    this.ptoActive = false;
    this.ptoElements.forEach((el) => el.destroy());
    this.ptoElements = null;
    AMBIENT.start("office");
  }

  /* ---- dialogue --------------------------------------------------------- */

  buildDialogueBox() {
    this.dialogueContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(22000);
    const panel = UI.panel(this, 20, 372, 600, 98, {
      title: "",
      stamp: "",
      accent: this.accent.key,
      titleColor: this.accent.lite,
    });
    const bodyText = this.add.text(34, 404, "", TS.body(CS.paper, 13, 560));
    const hint = this.add.text(596, 452, "[SPACE]", TS.tiny(CS.steelPale, 10)).setOrigin(1, 0.5);
    this.dialogueContainer.add([panel, bodyText, hint]);
    this.dialogueContainer.setVisible(false);
    this.dialoguePanel = panel;
    this.dialogueBodyText = bodyText;
  }

  openDialogue(npc) {
    this.activeDialogueNpc = npc;
    npc.lineIndex = 0;
    npc.activeLines = this.resolveDialogueLines(npc);
    this.dialogueContainer.setVisible(true);
    this.showDialogueLine();
  }

  resolveDialogueLines(npc) {
    const cw = npc.coworker;
    npc.readyForBoss = false;
    if (cw.isBoss) {
      if (PLAYER_STATE.reginaldDefeated) {
        return cw.dialogueCleared || cw.dialogue;
      }
      if (PLAYER_STATE.level >= 9) {
        npc.readyForBoss = true;
        return cw.dialogueReady || cw.dialogue;
      }
    }
    return cw.dialogue;
  }

  showDialogueLine() {
    const npc = this.activeDialogueNpc;
    const line = npc.activeLines[npc.lineIndex];
    const cw = npc.coworker;
    if (this.dialoguePanel.titleText) {
      this.dialoguePanel.titleText.setText(cw.title ? `${cw.name}  —  ${cw.title}` : cw.name);
    }
    this.dialogueBodyText.setText(line);
  }

  advanceDialogue() {
    const npc = this.activeDialogueNpc;
    npc.lineIndex++;
    if (npc.lineIndex >= npc.activeLines.length) {
      npc.lineIndex = 0;
      this.dialogueContainer.setVisible(false);
      const shouldFightBoss = npc.readyForBoss;
      const bossEnemyId = npc.coworker.bossEnemyId;
      const triggersBattle = npc.coworker.triggersBattle;
      const battleEnemyId = npc.coworker.battleEnemyId;
      this.activeDialogueNpc = null;
      if (shouldFightBoss) {
        this.startBossFight(bossEnemyId);
      } else if (triggersBattle) {
        this.startBattle(battleEnemyId);
      }
    } else {
      this.showDialogueLine();
    }
  }

  /* ---- menus ------------------------------------------------------------ */

  buildModeMenu() {
    this.modeMenuContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(23000);
    const panel = UI.panel(this, 160, 150, 320, 200, {
      title: "YOUR CUBICLE",
      stamp: "TASK SELECT",
      accent: this.accent.key,
      titleColor: this.accent.lite,
    });
    this.modeMenuCursor = this.add.text(0, 0, "\u25B8", TS.menu(this.accent.str, 14));
    this.modeMenuContainer.add([panel, this.modeMenuCursor]);
    this.modeMenuContainer.setVisible(false);
    this.modeMenuTexts = [];
    this.selectedMenuIndex = 0;
  }

  buildMenuOptions() {
    const options = [];
    this.floor.homeBase.options.forEach((opt) => {
      if (opt.action !== "site_visit_list") {
        options.push(opt);
        return;
      }
      Object.keys(SITE_VISITS).forEach((siteId) => {
        const site = SITE_VISITS[siteId];
        if (site.unlockedBy && !PLAYER_STATE.completedSites[site.unlockedBy]) return;
        options.push({
          label: `Site Visit: ${site.name}`,
          action: "travel",
          sceneKey: "SiteVisitScene",
          payload: { siteId },
          transitionMessage: `Travelling to ${site.name}...`,
        });
      });
    });
    return options;
  }

  openModeMenu() {
    this.selectedMenuIndex = 0;
    this.currentMenuOptions = this.buildMenuOptions();
    this.modeMenuTexts.forEach((t) => t.destroy());
    this.modeMenuTexts = this.currentMenuOptions.map((opt, i) =>
      this.add.text(196, 186 + i * 24, opt.label, TS.menu(CS.paper, 14))
    );
    this.modeMenuTexts.forEach((t) => this.modeMenuContainer.add(t));
    this.modeMenuContainer.setVisible(true);
    this.updateModeMenuCursor();
  }

  updateModeMenuCursor() {
    const target = this.modeMenuTexts[this.selectedMenuIndex];
    this.modeMenuCursor.setPosition(target.x - 16, target.y);
    this.modeMenuTexts.forEach((t, i) =>
      t.setColor(i === this.selectedMenuIndex ? this.accent.lite : CS.paper)
    );
  }

  closeModeMenu() {
    this.modeMenuContainer.setVisible(false);
  }

  confirmModeMenu() {
    const opt = this.currentMenuOptions[this.selectedMenuIndex];
    this.closeModeMenu();
    if (opt.action === "travel") {
      this.travelTo(opt.sceneKey, opt.payload, opt.transitionMessage);
    } else if (opt.action === "pto") {
      this.takePto(opt.transitionMessage);
    }
  }

  buildStairsMenu() {
    this.stairsMenuContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(23000);
    const panel = UI.panel(this, 180, 165, 280, 160, {
      title: "TAKE THE STAIRS TO",
      stamp: "FLOOR",
      accent: C.gold,
      titleColor: CS.gold,
    });
    this.stairsMenuCursor = this.add.text(0, 0, "\u25B8", TS.menu(CS.gold, 14));
    this.stairsMenuContainer.add([panel, this.stairsMenuCursor]);
    this.stairsMenuContainer.setVisible(false);
    this.stairsMenuTexts = [];
    this.selectedStairsIndex = 0;
  }

  openStairsMenu() {
    this.selectedStairsIndex = 0;
    this.currentStairsOptions = this.floor.stairs;
    this.stairsMenuTexts.forEach((t) => t.destroy());
    this.stairsMenuTexts = this.currentStairsOptions.map((opt, i) =>
      this.add.text(216, 205 + i * 24, opt.label, TS.menu(CS.paper, 14))
    );
    this.stairsMenuTexts.forEach((t) => this.stairsMenuContainer.add(t));
    this.stairsMenuContainer.setVisible(true);
    this.updateStairsMenuCursor();
  }

  updateStairsMenuCursor() {
    const target = this.stairsMenuTexts[this.selectedStairsIndex];
    this.stairsMenuCursor.setPosition(target.x - 16, target.y);
    this.stairsMenuTexts.forEach((t, i) => t.setColor(i === this.selectedStairsIndex ? CS.gold : CS.paper));
  }

  closeStairsMenu() {
    this.stairsMenuContainer.setVisible(false);
  }

  confirmStairsMenu() {
    const dest = this.currentStairsOptions[this.selectedStairsIndex];
    this.closeStairsMenu();
    this.takeStairs(dest);
  }

  takeStairs(dest) {
    this.scene.start("TransitionScene", {
      message: dest.transitionMessage,
      nextScene: "OfficeScene",
      nextPayload: { floorId: dest.toFloor, arrivePos: dest.arriveAt },
    });
  }

  takePto(message) {
    this.scene.start("TransitionScene", {
      message,
      nextScene: "OfficeScene",
      nextPayload: { floorId: this.floorId, ptoResult: true },
      holdMs: 1100,
    });
  }

  /* ---- battles ---------------------------------------------------------- */

  startBossFight(enemyId) {
    this.encounterLocked = true;
    this.player.setVelocity(0, 0);
    this.registry.set("returnPos", { x: this.player.x, y: this.player.y });
    this.battleWipe(() => this.scene.start("BattleScene", { enemyId, isBoss: true }), C.gold);
  }

  startBattle(enemyId) {
    this.encounterLocked = true;
    this.player.setVelocity(0, 0);
    this.registry.set("returnPos", { x: this.player.x, y: this.player.y });
    this.battleWipe(() => this.scene.start("BattleScene", { enemyId }), C.red);
  }

  // Short, deliberate encounter transition — zoom punch, shake, flash — so a
  // fight starting feels like a fight starting.
  battleWipe(then, color) {
    FX.shake(this, 220, 0.006);
    FX.flash(this, color, 0.5, 260);
    FX.ring(this, this.player.x, this.player.y, color, { to: 90, duration: 380 });
    this.cameras.main.zoomTo(1.35, 320, "Quad.easeIn");
    this.time.delayedCall(340, then);
  }

  /* ---- proximity -------------------------------------------------------- */

  findNearbyNpc() {
    const T = this.tileSize;
    for (const npc of this.npcData) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.sprite.x, npc.sprite.y);
      if (d < T * 1.2) return npc;
    }
    return null;
  }

  findNearbyBattleObject() {
    const T = this.tileSize;
    for (const obj of this.battleObjectData) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, obj.sprite.x, obj.sprite.y);
      if (d < T * 1.2) return obj;
    }
    return null;
  }

  findNearbyHomeBase() {
    if (!this.homeBaseSprite) return null;
    const T = this.tileSize;
    const d = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.homeBaseSprite.x,
      this.homeBaseSprite.y
    );
    return d < T * 1.2 ? this.floor.homeBase : null;
  }

  findNearbyStairs() {
    const T = this.tileSize;
    for (const st of this.stairsData) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, st.sprite.x, st.sprite.y);
      if (d < T * 1.2) return true;
    }
    return false;
  }

  travelTo(sceneKey, payload, transitionMessage) {
    this.registry.set("returnPos", { x: this.player.x, y: this.player.y });
    if (transitionMessage) {
      this.scene.start("TransitionScene", {
        message: transitionMessage,
        nextScene: sceneKey,
        nextPayload: payload || {},
      });
    } else {
      this.scene.start(sceneKey, payload || {});
    }
  }

  warpToHomeBase() {
    if (!this.homeBaseSprite) return;
    const T = this.tileSize;
    this.player.setPosition(this.homeBaseSprite.x + T, this.homeBaseSprite.y);
    this.player.setVelocity(0, 0);
    FX.ring(this, this.player.x, this.player.y, this.accent.key, { to: 46 });
  }

  /* ---- loop ------------------------------------------------------------- */

  update(time, delta) {
    if (this.ptoActive) {
      this.player.setVelocity(0, 0);
      this.updateWanderers(delta);
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this.closePto();
      }
      return;
    }

    if (this.dialogueContainer.visible) {
      this.player.setVelocity(0, 0);
      CHARART.play(this.player, "player", this.playerFacing, false);
      this.updateWanderers(delta);
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this.advanceDialogue();
      }
      return;
    }

    if (this.floor.homeBase && this.modeMenuContainer.visible) {
      this.player.setVelocity(0, 0);
      this.updateWanderers(delta);
      const optionCount = this.currentMenuOptions.length;
      if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.wasd.up)) {
        this.selectedMenuIndex = (this.selectedMenuIndex - 1 + optionCount) % optionCount;
        this.updateModeMenuCursor();
      } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.wasd.down)) {
        this.selectedMenuIndex = (this.selectedMenuIndex + 1) % optionCount;
        this.updateModeMenuCursor();
      } else if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this.confirmModeMenu();
      }
      return;
    }

    if (this.stairsMenuContainer.visible) {
      this.player.setVelocity(0, 0);
      this.updateWanderers(delta);
      const optionCount = this.currentStairsOptions.length;
      if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.wasd.up)) {
        this.selectedStairsIndex = (this.selectedStairsIndex - 1 + optionCount) % optionCount;
        this.updateStairsMenuCursor();
      } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.wasd.down)) {
        this.selectedStairsIndex = (this.selectedStairsIndex + 1) % optionCount;
        this.updateStairsMenuCursor();
      } else if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this.confirmStairsMenu();
      }
      return;
    }

    if (this.encounterLocked) {
      this.player.setVelocity(0, 0);
      this.updateWanderers(delta);
      return;
    }

    const speed = 130;
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) vy += 1;

    const vec = new Phaser.Math.Vector2(vx, vy).normalize().scale(speed);
    this.player.setVelocity(vec.x, vec.y);

    // Facing + walk cycle (cosmetic).
    const moving = vx !== 0 || vy !== 0;
    if (moving) this.playerFacing = CHARART.dirFromVec(vec.x, vec.y, this.playerFacing);
    CHARART.play(this.player, "player", this.playerFacing, moving);
    this.player.setDepth(this.player.y);

    this.updateRoomCaption();
    this.updateProxLabels();
    this.updateActionPrompt();
    this.updateHudMasking();

    if (Phaser.Input.Keyboard.JustDown(this.homeKey)) {
      this.warpToHomeBase();
      this.updateWanderers(delta);
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      const npc = this.findNearbyNpc();
      const battleObj = this.findNearbyBattleObject();
      const homeBase = this.findNearbyHomeBase();
      const stairs = this.findNearbyStairs();
      const gate = this.floor.accessGate;
      const gateBlocks = gate && PLAYER_STATE.level < gate.minLevel && (npc || battleObj);
      if (gateBlocks) {
        this.showGateMessage(gate.message);
      } else if (npc) {
        FX.ring(this, npc.sprite.x, npc.sprite.y - 8, this.accent.key, { to: 26, duration: 260 });
        this.openDialogue(npc);
      } else if (battleObj) {
        const enemyId = battleObj.def.enemyId || Phaser.Utils.Array.GetRandom(ENEMIES).id;
        this.startBattle(enemyId);
      } else if (homeBase) {
        this.openModeMenu();
      } else if (stairs) {
        if (this.floor.stairs.length > 1) {
          this.openStairsMenu();
        } else {
          this.takeStairs(this.floor.stairs[0]);
        }
      }
    }

    this.updateWanderers(delta);
  }

  // Announces a room the first time you step into it — cheap orientation cue
  // on a floor this wide.
  updateRoomCaption() {
    const T = this.tileSize;
    const tx = Math.floor(this.player.x / T);
    const ty = Math.floor(this.player.y / T);
    let found = null;
    for (const r of this.rooms) {
      const lm = r.lm;
      if (tx >= lm.c0 - 1 && tx <= lm.c1 + 1 && ty >= lm.r0 - 1 && ty <= lm.r1 + 1) {
        found = lm.label.replace("\n", " ");
        break;
      }
    }
    if (found !== this.currentRoom) {
      this.currentRoom = found;
      if (found) this.showRoomCaption(found);
    }
  }

  updateWanderers(delta) {
    const speed = 42;
    this.wanderers.forEach((w) => {
      if (w.state === "idle") {
        w.sprite.setVelocity(0, 0);
        CHARART.play(w.sprite, w.charId, w.facing || "down", false);
        w.timer -= delta;
        if (w.timer <= 0) {
          w.index = (w.index + 1) % w.waypoints.length;
          w.state = "moving";
        }
        w.sprite.setDepth(w.sprite.y);
        return;
      }
      const target = w.waypoints[w.index];
      const dx = target.x - w.sprite.x;
      const dy = target.y - w.sprite.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 4) {
        w.sprite.setVelocity(0, 0);
        w.state = "idle";
        w.timer = Phaser.Math.Between(2500, 5000);
      } else {
        w.sprite.setVelocity((dx / dist) * speed, (dy / dist) * speed);
        w.facing = CHARART.dirFromVec(dx, dy, w.facing || "down");
        CHARART.play(w.sprite, w.charId, w.facing, true);
      }
      w.sprite.setDepth(w.sprite.y);
    });
  }

  healTick() {
    const T = this.tileSize;
    const tx = Math.floor(this.player.x / T);
    const ty = Math.floor(this.player.y / T);
    if (this.grid[ty] === undefined || this.grid[ty][tx] !== "6") return;

    const p = PLAYER_STATE;
    let healed = false;
    if (p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + 2);
      healed = true;
    }
    if (p.mp < p.maxMp) {
      p.mp = Math.min(p.maxMp, p.mp + 1);
      healed = true;
    }
    if (healed) {
      this.refreshHud();
      FX.float(this, this.player.x, this.player.y - 18, "+ COFFEE", CS.steelPale, { size: 12 });
      FX.steam(this, this.player.x, this.player.y - 14, { depth: this.player.y + 2 });
    }
  }
}
