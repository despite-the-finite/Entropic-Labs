// The walkable overworld — renders whichever floor it's told to (GFS or
// CDB, see FLOORS in floorplan.js). Nothing else in this file needs to
// change if a floor's layout changes, as long as the legend holds.
//
// Battles no longer trigger from random tiles: every conference room and
// every former "solid landmark" room has one battleObject inside it —
// walk up and hit SPACE, same interaction as talking to an NPC. A few
// NPCs also trigger a battle when their dialogue ends (coworker.triggersBattle).

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
    this.floorTexKey = this.floor.theme ? `tile_floor_${this.floor.theme}` : "tile_floor";

    this.solids = this.physics.add.staticGroup();

    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        const ch = this.grid[y][x];
        const px = x * T + T / 2;
        const py = y * T + T / 2;

        if (ch === "1") {
          this.solids.create(px, py, this.wallTextureKey(x, y)).setSize(T, T).refreshBody();
        } else if (ch === "2") {
          this.add.image(px, py, this.floorTexKey);
          this.solids.create(px, py, "tile_desk").setSize(T, T).refreshBody();
        } else if (ch === "3") {
          this.add.image(px, py, this.floorTexKey);
          this.solids.create(px, py, "tile_plant").setSize(T * 0.6, T * 0.6).refreshBody();
        } else if (ch === "6") {
          this.add.image(px, py, "tile_break");
        } else {
          this.add.image(px, py, this.floorTexKey);
        }
      }
    }

    // Landmark rooms (huddles, restrooms, print/copy, etc) — fully walkable
    // now; each one has a battleObject inside (see below). The one
    // exception is a room labeled "STAIRS": that's a real functional room,
    // with its own physical trigger point instead of a battleObject — walk
    // up and hit SPACE to pick a floor from this.floor.stairs.
    this.stairsGroup = this.physics.add.staticGroup();
    this.stairsData = [];
    (this.floor.landmarks || []).forEach((lm) => {
      for (let y = lm.r0; y <= lm.r1; y++) {
        for (let x = lm.c0; x <= lm.c1; x++) {
          const px = x * T + T / 2;
          const py = y * T + T / 2;
          this.add.image(px, py, "tile_landmark");
        }
      }
      const cx = ((lm.c0 + lm.c1 + 1) / 2) * T;
      const cy = ((lm.r0 + lm.r1 + 1) / 2) * T;
      const isStairs = lm.label === "STAIRS";
      // The stairs icon sits at room-center, so its label floats above the
      // icon (matching how battleObjects/homeBase label themselves) instead
      // of overlapping it the way a plain landmark's centered text would.
      this.add
        .text(cx, isStairs ? cy - T * 0.9 : cy, lm.label, {
          fontSize: "13px",
          fontFamily: "Courier New",
          color: "#c9d2f0",
          align: "center",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);

      if (isStairs) {
        const spr = this.stairsGroup.create(cx, cy, "tile_stairs");
        spr.setSize(T * 0.9, T * 0.9).refreshBody();
        this.stairsData.push({ sprite: spr });
      }
    });

    // Decorative-only props — no gameplay effect, just make the floor feel
    // more lived-in.
    (this.floor.decor || []).forEach((d) => {
      const px = d.x * T + T / 2;
      const py = d.y * T + T / 2;
      if (d.type === "watercooler") {
        this.add.image(px, py, this.floorTexKey);
        this.solids.create(px, py, "tile_watercooler").setSize(T * 0.6, T * 0.6).refreshBody();
      } else if (d.type === "wallart") {
        this.add.image(px, py, this.floorTexKey);
        this.add.image(px, py, "tile_wallart");
      }
    });

    // Conference room / break room labels
    (this.floor.roomLabels || []).forEach((rl) => {
      this.add
        .text(rl.x * T, rl.y * T, rl.text, {
          fontSize: "13px",
          fontFamily: "Courier New",
          color: "#ffe9a8",
          align: "center",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);
    });

    // Player — resume-from-battle position wins if set, then a cross-floor
    // stairs arrival point, then the floor's normal spawn.
    const returnPos = this.registry.get("returnPos");
    const start = returnPos || this.arrivePos || this.floor.playerStart;
    const startPx = returnPos ? start.x : start.x * T + T / 2;
    const startPy = returnPos ? start.y : start.y * T + T / 2;
    this.player = this.physics.add.sprite(startPx, startPy, "player");
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(T * 0.6, T * 0.4);
    this.player.body.setOffset(T * 0.075, T * 0.55);
    this.physics.add.collider(this.player, this.solids);
    this.registry.remove("returnPos");

    // NPCs — a few wander a small waypoint loop instead of standing still.
    this.npcGroup = this.physics.add.staticGroup();
    this.npcData = [];
    this.wanderers = [];
    (this.floor.npcs || []).forEach((def) => {
      const cw = COWORKERS[def.coworkerId];
      const px = def.x * T + T / 2;
      const py = def.y * T + T / 2;
      const texKey = this.textures.exists(`npc_${def.coworkerId}`)
        ? `npc_${def.coworkerId}`
        : "npc_default";

      let spr;
      if (def.wander) {
        spr = this.physics.add.sprite(px, py, texKey);
        this.physics.add.collider(spr, this.solids);
        this.physics.add.collider(this.player, spr);
        this.wanderers.push({
          sprite: spr,
          waypoints: def.wander.map((w) => ({ x: w.x * T + T / 2, y: w.y * T + T / 2 })),
          index: 0,
          state: "idle",
          timer: Phaser.Math.Between(500, 2000),
        });
      } else {
        spr = this.npcGroup.create(px, py, texKey);
        spr.setSize(T * 0.6, T * 0.5).refreshBody();
      }
      this.npcData.push({ sprite: spr, coworker: cw, lineIndex: 0 });
      this.add
        .text(px, py - T * 0.9, cw.name, {
          fontSize: "12px",
          fontFamily: "Courier New",
          color: "#ffe9a8",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);
    });
    this.physics.add.collider(this.player, this.npcGroup);

    // Battle objects — every conference room and former-landmark room has
    // one. Walk up and press SPACE to fight.
    this.battleObjectGroup = this.physics.add.staticGroup();
    this.battleObjectData = [];
    (this.floor.battleObjects || []).forEach((def) => {
      const px = def.x * T + T / 2;
      const py = def.y * T + T / 2;
      const spr = this.battleObjectGroup.create(px, py, "tile_battle_object");
      spr.setSize(T * 0.7, T * 0.7).refreshBody();
      this.battleObjectData.push({ sprite: spr, def });
      this.add
        .text(px, py - T * 0.8, def.label, {
          fontSize: "12px",
          fontFamily: "Courier New",
          color: "#ff9d9d",
          align: "center",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);
    });
    this.physics.add.collider(this.player, this.battleObjectGroup);

    // Home base — only GFS has one; mode selection lives at the player's
    // own desk, not duplicated per floor. Reset explicitly so switching
    // from a floor that has one to a floor that doesn't can't leave a
    // stale reference to the previous (destroyed) sprite behind.
    this.homeBaseSprite = null;
    this.homeBaseGroup = null;
    if (this.floor.homeBase) {
      const hb = this.floor.homeBase;
      this.homeBaseGroup = this.physics.add.staticGroup();
      const hbPx = hb.x * T + T / 2;
      const hbPy = hb.y * T + T / 2;
      this.homeBaseSprite = this.homeBaseGroup.create(hbPx, hbPy, "tile_cubicle");
      this.homeBaseSprite.setSize(T, T).refreshBody();
      this.add
        .text(hbPx, hbPy - T * 0.9, hb.label, {
          fontSize: "13px",
          fontFamily: "Courier New",
          color: "#ffe9a8",
          align: "center",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);
      this.physics.add.collider(this.player, this.homeBaseGroup);
    }

    // Physics collider for the stairs trigger points created inside
    // "STAIRS" landmark rooms above (this.stairsGroup/this.stairsData were
    // populated by the landmarks loop, since that's where those rooms — and
    // now their real function — live).
    this.physics.add.collider(this.player, this.stairsGroup);

    // Camera / world bounds
    const worldW = this.floor.width * T;
    const worldH = this.floor.height * T;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.interactKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
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

    this.refreshHud();

    if (this.ptoResult) this.applyPtoResult();
  }

  // Picks the wall texture variant so a run of wall tiles reads as one
  // continuous architectural line instead of a stack of disconnected
  // dashes: horizontal band if the run goes left/right, vertical if it
  // goes up/down, both bands (a cross) at a corner or junction.
  wallTextureKey(x, y) {
    const isWall = (gx, gy) =>
      this.grid[gy] !== undefined && this.grid[gy][gx] === "1";
    const horizontal = isWall(x - 1, y) || isWall(x + 1, y);
    const vertical = isWall(x, y - 1) || isWall(x, y + 1);
    const suffix = this.floor.theme ? `_${this.floor.theme}` : "";
    if (horizontal && vertical) return `tile_wall${suffix}_x`;
    if (vertical) return `tile_wall${suffix}_v`;
    return `tile_wall${suffix}_h`;
  }

  buildHud() {
    this.hudBg = this.add
      .rectangle(4, 4, 240, 62, 0x14161c, 0.75)
      .setOrigin(0, 0)
      .setScrollFactor(0);
    this.hudText = this.add
      .text(10, 8, "", {
        fontSize: "13px",
        fontFamily: "Courier New",
        color: "#dff0ff",
        wordWrap: { width: 220 },
      })
      .setScrollFactor(0);
    // Floats over the game world in the top-right corner (outside hudBg's
    // backing panel), so it needs its own stroke for contrast.
    this.floorLabel = this.add
      .text(636, 8, this.floorId, {
        fontSize: "12px",
        fontFamily: "Courier New",
        color: "#c9d2e0",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);
    // Also unbacked (bottom-left, over the game world) — same treatment.
    this.helpText = this.add
      .text(4, 460, "Arrows/WASD move  |  SPACE talk/interact  |  H cubicle", {
        fontSize: "12px",
        fontFamily: "Courier New",
        color: "#c9d2e0",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setScrollFactor(0);
  }

  refreshHud() {
    const p = PLAYER_STATE;
    const wellFedNote = p.wellFedBattles > 0 ? `  (Well Fed x${p.wellFedBattles})` : "";
    const pendingNote = p.levelUpPending
      ? "\nPending promotion — approve a change order on-site to apply it"
      : "";
    this.hudText.setText(
      `${getRankTitle(p.level, p.executiveUnlocked)} (Lv.${p.level})\n` +
        `HP ${p.hp}/${p.maxHp}  MP ${p.mp}/${p.maxMp}\n` +
        `Bonus: ${p.bonusPotential}/100 — ${getBonusLabel(p.bonusPotential)}${wellFedNote}${pendingNote}`
    );
    this.hudBg.height = p.levelUpPending ? 96 : 62;
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

  // Blocks movement and plays beach ambience (see audio.js) until SPACE
  // dismisses it — a real "you're on the beach for a minute" beat instead
  // of a banner that just times out on its own underneath normal play.
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

    const bg = this.add.rectangle(320, 240, 640, 480, 0x0a3a4a, 0.88).setScrollFactor(0);
    const banner = this.add
      .text(
        320,
        210,
        `Colleen and Indra pulled off a long weekend away. HP/MP fully restored.\nBonus Potential -${before - p.bonusPotential} (now ${p.bonusPotential}/100 — ${getBonusLabel(p.bonusPotential)}).`,
        {
          fontSize: "13px",
          fontFamily: "Courier New",
          color: "#ffe9a8",
          align: "center",
          wordWrap: { width: 480 },
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0);
    const prompt = this.add
      .text(320, 280, "[SPACE] head back to the office", {
        fontSize: "12px",
        fontFamily: "Courier New",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });

    this.ptoElements = [bg, banner, prompt];
  }

  closePto() {
    this.ptoActive = false;
    this.ptoElements.forEach((el) => el.destroy());
    this.ptoElements = null;
    AMBIENT.start("office");
  }

  buildDialogueBox() {
    this.dialogueContainer = this.add.container(0, 0).setScrollFactor(0);
    const bg = this.add
      .rectangle(320, 420, 600, 90, 0x14161c, 0.92)
      .setStrokeStyle(2, 0x4a90d9);
    const nameText = this.add.text(40, 385, "", {
      fontSize: "13px",
      fontFamily: "Courier New",
      color: "#ffe9a8",
    });
    const bodyText = this.add.text(40, 405, "", {
      fontSize: "13px",
      fontFamily: "Courier New",
      color: "#ffffff",
      wordWrap: { width: 560 },
    });
    const hint = this.add.text(500, 455, "[SPACE]", {
      fontSize: "11px",
      fontFamily: "Courier New",
      color: "#b8c0d0",
    });
    this.dialogueContainer.add([bg, nameText, bodyText, hint]);
    this.dialogueContainer.setVisible(false);
    this.dialogueNameText = nameText;
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
      // reginaldDefeated, not executiveUnlocked — beating him no longer
      // grants Executive by itself (see BattleScene.onEnemyDefeated); it
      // just confirms you're past this checkpoint.
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
    this.dialogueNameText.setText(npc.coworker.name);
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

  buildModeMenu() {
    this.modeMenuContainer = this.add.container(0, 0).setScrollFactor(0);
    const bg = this.add
      .rectangle(320, 240, 320, 190, 0x14161c, 0.95)
      .setStrokeStyle(2, 0x4a90d9);
    const title = this.add
      .text(320, 165, "YOUR CUBICLE", {
        fontSize: "13px",
        fontFamily: "Courier New",
        color: "#ffe9a8",
      })
      .setOrigin(0.5);
    this.modeMenuCursor = this.add.text(0, 0, ">", {
      fontSize: "12px",
      fontFamily: "Courier New",
      color: "#ffe9a8",
    });
    this.modeMenuContainer.add([bg, title, this.modeMenuCursor]);
    this.modeMenuContainer.setVisible(false);
    this.modeMenuTexts = [];
    this.selectedMenuIndex = 0;
  }

  // Expands the "site_visit_list" placeholder into one "travel" entry per
  // SITE_VISITS id that's unlocked (no unlockedBy, or that site's id is
  // marked complete in PLAYER_STATE.completedSites) — everything else in
  // homeBase.options passes through untouched.
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
      this.add.text(200, 190 + i * 22, opt.label, {
        fontSize: "13px",
        fontFamily: "Courier New",
        color: "#ffffff",
      })
    );
    this.modeMenuTexts.forEach((t) => this.modeMenuContainer.add(t));
    this.modeMenuContainer.setVisible(true);
    this.updateModeMenuCursor();
  }

  updateModeMenuCursor() {
    const target = this.modeMenuTexts[this.selectedMenuIndex];
    this.modeMenuCursor.setPosition(target.x - 18, target.y);
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

  // Floor-select menu opened from a STAIRS room — same look/pattern as the
  // cubicle's mode menu, just a separate instance so cubicle actions and
  // stairs destinations never share state.
  buildStairsMenu() {
    this.stairsMenuContainer = this.add.container(0, 0).setScrollFactor(0);
    const bg = this.add
      .rectangle(320, 240, 280, 150, 0x14161c, 0.95)
      .setStrokeStyle(2, 0xffb454);
    const title = this.add
      .text(320, 180, "TAKE THE STAIRS TO...", {
        fontSize: "13px",
        fontFamily: "Courier New",
        color: "#ffb454",
      })
      .setOrigin(0.5);
    this.stairsMenuCursor = this.add.text(0, 0, ">", {
      fontSize: "12px",
      fontFamily: "Courier New",
      color: "#ffb454",
    });
    this.stairsMenuContainer.add([bg, title, this.stairsMenuCursor]);
    this.stairsMenuContainer.setVisible(false);
    this.stairsMenuTexts = [];
    this.selectedStairsIndex = 0;
  }

  openStairsMenu() {
    this.selectedStairsIndex = 0;
    this.currentStairsOptions = this.floor.stairs;
    this.stairsMenuTexts.forEach((t) => t.destroy());
    this.stairsMenuTexts = this.currentStairsOptions.map((opt, i) =>
      this.add.text(220, 205 + i * 22, opt.label, {
        fontSize: "13px",
        fontFamily: "Courier New",
        color: "#ffffff",
      })
    );
    this.stairsMenuTexts.forEach((t) => this.stairsMenuContainer.add(t));
    this.stairsMenuContainer.setVisible(true);
    this.updateStairsMenuCursor();
  }

  updateStairsMenuCursor() {
    const target = this.stairsMenuTexts[this.selectedStairsIndex];
    this.stairsMenuCursor.setPosition(target.x - 18, target.y);
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
    // No returnPos here (unlike travelTo/startBattle) — this is a real
    // cross-floor move, so the destination should use dest.arriveAt, not
    // snap back to the pixel position the player is standing at right now.
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

  startBossFight(enemyId) {
    this.encounterLocked = true;
    this.player.setVelocity(0, 0);
    this.registry.set("returnPos", { x: this.player.x, y: this.player.y });
    this.scene.start("BattleScene", { enemyId, isBoss: true });
  }

  startBattle(enemyId) {
    this.encounterLocked = true;
    this.player.setVelocity(0, 0);
    this.registry.set("returnPos", { x: this.player.x, y: this.player.y });
    this.scene.start("BattleScene", { enemyId });
  }

  findNearbyNpc() {
    const T = this.tileSize;
    for (const npc of this.npcData) {
      const d = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        npc.sprite.x,
        npc.sprite.y
      );
      if (d < T * 1.2) return npc;
    }
    return null;
  }

  findNearbyBattleObject() {
    const T = this.tileSize;
    for (const obj of this.battleObjectData) {
      const d = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        obj.sprite.x,
        obj.sprite.y
      );
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

  // Returns true if the player is next to a STAIRS trigger point — the
  // destination list itself always comes from this.floor.stairs (every
  // STAIRS room on a floor offers the same set of reachable floors).
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

  // "H" shortcut — warps to the tile just east of the cubicle (the same
  // spot the player spawns at) rather than opening the menu outright.
  warpToHomeBase() {
    if (!this.homeBaseSprite) return;
    const T = this.tileSize;
    this.player.setPosition(this.homeBaseSprite.x + T, this.homeBaseSprite.y);
    this.player.setVelocity(0, 0);
  }

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

  updateWanderers(delta) {
    const speed = 42;
    this.wanderers.forEach((w) => {
      if (w.state === "idle") {
        w.sprite.setVelocity(0, 0);
        w.timer -= delta;
        if (w.timer <= 0) {
          w.index = (w.index + 1) % w.waypoints.length;
          w.state = "moving";
        }
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
      }
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
      const floatText = this.add
        .text(this.player.x, this.player.y - 20, "+coffee", {
          fontSize: "12px",
          fontFamily: "Courier New",
          color: "#8fd0ff",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);
      this.tweens.add({
        targets: floatText,
        y: floatText.y - 16,
        alpha: 0,
        duration: 800,
        onComplete: () => floatText.destroy(),
      });
    }
  }
}
