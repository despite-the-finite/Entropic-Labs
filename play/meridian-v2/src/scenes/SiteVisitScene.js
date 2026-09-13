// A site visit: a small separate map reached from the cubicle menu. Clear all
// three checkpoints (Safety, Schedule, Quality), then the client trailer
// unlocks the change-order negotiation. Hazard zones roll random fights.
//
// GAMEPLAY IS UNCHANGED from V1: same grid legend (1 fence, 2 structure,
// 3 equipment, 4 hazard), same collisions, same 20%-on-zone-entry encounter
// roll, same checkpoint/trailer/exit interactions, same saved progress across
// hazard fights. What changed is that each site now looks like the kind of
// project it actually is — see SITE_THEME for the mapping — with layered
// equipment, depth, and atmosphere.

const SITE_THEME = {
  meridian_phase2: "process",
  ashgrove_foods: "food",
  meridian_grid_td: "power",
  blackwater_refinery: "refinery",
  route9_bridge: "bridge",
  cedar_falls_wtp: "water",
};

const CHECKPOINT_LOOK = {
  safety: { accent: 0xe8701a, str: "#f2a86a", tag: "SAFETY" },
  schedule: { accent: 0x5980a6, str: "#8fb0cd", tag: "SCHEDULE" },
  quality: { accent: 0x5f9a57, str: "#8cc57f", tag: "QUALITY" },
};

class SiteVisitScene extends Phaser.Scene {
  constructor() {
    super("SiteVisitScene");
  }

  init(data) {
    this.siteId = data.siteId || Object.keys(SITE_VISITS)[0];
    this.site = SITE_VISITS[this.siteId];
    this.theme = SITE_THEME[this.siteId] || "process";
  }

  create() {
    AMBIENT.start("site");
    const T = this.site.tileSize;
    this.tileSize = T;
    this.grid = this.site.layout.map((row) => row.split(""));
    this.themeMap = SITE_THEME_MAP_RUNTIME[this.theme];

    this.proxLabels = [];
    this.solids = this.physics.add.staticGroup();
    this.encounterTiles = new Set();

    this.renderStaticArt();

    // Labels — the landmark signage now hangs on a plate instead of floating.
    (this.site.landmarks || []).forEach((lm) => {
      const cx = ((lm.c0 + lm.c1 + 1) / 2) * T;
      const cy = ((lm.r0 + lm.r1 + 1) / 2) * T;
      UI.roomSign(this, cx, cy - T * 0.6, lm.label.replace("\n", " "), C.hiVis);
    });
    if (this.site.structureLabel) {
      const sl = this.site.structureLabel;
      this.addProxLabel(UI.roomSign(this, sl.x * T, sl.y * T, sl.text, C.orange), sl.x * T, sl.y * T, T * 6);
    }

    // Player
    const start = this.site.playerStart;
    this.player = this.physics.add.sprite(start.x * T + T / 2, start.y * T + T / 2, CHARART.KEY, "player_0");
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(T * 0.6, T * 0.4);
    this.player.body.setOffset(T * 0.075, T * 0.55);
    this.physics.add.collider(this.player, this.solids);
    this.playerFacing = "down";
    CHARART.play(this.player, "player", "down", false);

    // Checkpoint state — restore if resuming from a hazard fight
    this.resolved = { safety: false, schedule: false, quality: false };
    const savedProgress = this.registry.get("siteProgress");
    if (savedProgress && savedProgress.siteId === this.siteId) {
      this.resolved = savedProgress.resolved;
      this.registry.remove("siteProgress");
    }

    // Checkpoint NPCs — each gets its discipline's color and a marker so
    // Safety, Schedule and Quality are tellable apart from across the site.
    this.checkpointGroup = this.physics.add.staticGroup();
    this.checkpointData = [];
    this.site.checkpoints.forEach((cp) => {
      const px = cp.x * T + T / 2;
      const py = cp.y * T + T / 2;
      const charId = `checkpoint_${this.siteId}_${cp.id}`;
      const look = CHECKPOINT_LOOK[cp.id] || CHECKPOINT_LOOK.safety;
      const spr = this.checkpointGroup.create(px, py, CHARART.KEY, `${charId}_0`);
      spr.setSize(T * 0.6, T * 0.5).refreshBody();
      spr.setDepth(py);
      CHARART.play(spr, charId, "down", false);
      const marker = this.add.container(px, py - T * 1.35).setDepth(9001);
      const g = this.add.graphics();
      g.fillStyle(C.ink, 0.78);
      g.fillRect(-26, -9, 52, 18);
      g.lineStyle(1, look.accent, 1);
      g.strokeRect(-25.5, -8.5, 51, 17);
      g.fillStyle(look.accent, 1);
      g.fillRect(-26, -9, 4, 18);
      marker.add([g, this.add.text(2, 0, look.tag, TS.label(look.str, 11)).setOrigin(0.5)]);
      this.tweens.add({ targets: marker, y: marker.y - 3, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.checkpointData.push({ sprite: spr, cp, marker, look });
      this.addProxLabel(UI.worldLabel(this, px, py - T * 0.85, cp.npcName, look.str), px, py);
    });
    this.physics.add.collider(this.player, this.checkpointGroup);

    // The client, standing outside their trailer.
    const ct = this.site.clientTrailer;
    const client = CLIENTS.find((c) => c.id === ct.clientId);
    const clientPx = ct.interactPoint.x * T + T / 2;
    const clientPy = ct.interactPoint.y * T + T / 2;
    this.clientGroup = this.physics.add.staticGroup();
    const clientId = `client_${this.siteId}`;
    const clientSpr = this.clientGroup.create(clientPx, clientPy, CHARART.KEY, `${clientId}_0`);
    clientSpr.setSize(T * 0.6, T * 0.5).refreshBody();
    clientSpr.setDepth(clientPy);
    CHARART.play(clientSpr, clientId, "down", false);
    this.addProxLabel(
      UI.worldLabel(this, clientPx, clientPy - T * 0.85, client ? client.name : "Client", CS.gold),
      clientPx,
      clientPy
    );
    this.clientMarker = UI.roomSign(this, clientPx, clientPy - T * 1.5, "CHANGE ORDER", C.gold);
    this.clientMarker.setAlpha(0.35);
    this.physics.add.collider(this.player, this.clientGroup);

    // Exit gate
    const exitPos = this.site.exitPortal;
    this.exitSprite = this.add
      .image(exitPos.x * T + T / 2, exitPos.y * T + T / 2, "site", `sprop_portal_${this.theme}`)
      .setDepth(exitPos.y * T);
    this.addProxLabel(
      UI.worldLabel(this, exitPos.x * T + T / 2, exitPos.y * T + T / 2 - T * 0.85, "EXIT SITE", CS.hiVis),
      exitPos.x * T + T / 2,
      exitPos.y * T + T / 2,
      T * 5
    );

    // Resume position after a hazard fight
    if (this.registry.get("siteReturnPos")) {
      const p = this.registry.get("siteReturnPos");
      this.player.setPosition(p.x, p.y);
      this.registry.remove("siteReturnPos");
    }

    const startKey = `${Math.floor(this.player.x / T)},${Math.floor(this.player.y / T)}`;
    this.lastTileKey = startKey;
    this.inEncounterZone = this.encounterTiles.has(startKey);

    const worldW = this.site.width * T;
    const worldH = this.site.height * T;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.fadeIn(280, 0, 0, 0);

    // Site-wide atmosphere: haze drifting across the whole yard.
    FX.drift(this, { x: 0, y: 0, w: worldW, h: worldH }, 0xd8cdb8, 10);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.buildHud();
    this.buildDialogueBox();
    this.refreshChecklist();

    this.encounterLocked = false;
    this.dialogue = null;
  }

  /* ---- static art -------------------------------------------------------- */

  renderStaticArt() {
    const T = this.tileSize;
    const th = this.theme;
    const W = this.site.width * T;
    const H = this.site.height * T;
    const rt = this.add.renderTexture(0, 0, W, H).setOrigin(0, 0).setDepth(-100);

    // Pass 1: ground everywhere, so nothing shows a hole behind equipment.
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        const ch = this.grid[y][x];
        const px = x * T;
        const py = y * T;
        let frame;
        if (ch === "4") frame = `shazard_${th}`;
        else if (ch === "2") frame = `sconcrete_${th}_${TILES.hash(x, y, 5) % 2}`;
        else if (ch === "3") frame = `sconcrete_${th}_0`;
        else if (TILES.hash(x, y, 13) % 29 === 0) frame = `smud_${th}`;
        else frame = `sground_${th}_${TILES.hash(x, y, 7) % 3}`;
        rt.drawFrame("site", frame, px, py);
        if (ch === "4") this.encounterTiles.add(`${x},${y}`);
      }
    }

    // Pass 2: perimeter fence, drawn as a band so it reads as one run.
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        if (this.grid[y][x] !== "1") continue;
        const onEdge = y === 0 || y === this.grid.length - 1;
        rt.drawFrame("site", onEdge ? `sfence_${th}` : `sjersey_${th}`, x * T, y * T);
        const body = this.solids.create(x * T + T / 2, y * T + T / 2, "site", `sfence_${th}`).setVisible(false);
        body.setSize(T, T).refreshBody();
      }
    }

    // Pass 3: the big stuff. A 64x64 piece is anchored to the top-left tile
    // of each 2x2 block of the same character, so equipment towers over the
    // player instead of tiling as 32px stamps.
    const claimed = new Set();
    const bigs = [];
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        const ch = this.grid[y][x];
        if (ch !== "2" && ch !== "3") continue;
        const key = `${x},${y}`;
        if (claimed.has(key)) continue;
        // collision always matches the grid exactly, regardless of art size
        const body = this.solids.create(x * T + T / 2, y * T + T / 2, "site", `sfence_${th}`).setVisible(false);
        body.setSize(T, T).refreshBody();

        const canPair =
          this.grid[y][x + 1] === ch && this.grid[y + 1] && this.grid[y + 1][x] === ch && this.grid[y + 1][x + 1] === ch;
        if (canPair) {
          [`${x + 1},${y}`, `${x},${y + 1}`, `${x + 1},${y + 1}`].forEach((k) => claimed.add(k));
          [
            [x + 1, y],
            [x, y + 1],
            [x + 1, y + 1],
          ].forEach(([bx, by]) => {
            const b = this.solids.create(bx * T + T / 2, by * T + T / 2, "site", `sfence_${th}`).setVisible(false);
            b.setSize(T, T).refreshBody();
          });
          const pool = ch === "2" ? [this.themeMap.structure, this.themeMap.extra] : [this.themeMap.equipment, this.themeMap.extra];
          const pick = pool[TILES.hash(x, y, 23) % pool.length];
          bigs.push({ x, y, frame: `sbig_${pick}_${th}`, kind: pick });
        } else {
          const props = ch === "2" ? ["spool", "barrel", "dumpster"] : ["genset", "spool", "barrel", "lightplant"];
          const pick = props[TILES.hash(x, y, 29) % props.length];
          rt.drawFrame("site", `sprop_${pick}_${th}`, x * T, y * T);
          if (pick === "genset" || pick === "lightplant") {
            FX.blink(this, x * T + T * 0.75, y * T + T * 0.5, C.amber, { size: 2, depth: -90 });
          }
        }
      }
    }

    // Big pieces are real sprites (not baked in) so they can depth-sort
    // against the player and carry their own animated details.
    bigs.forEach((b) => {
      const px = b.x * T + T;
      const py = b.y * T + T;
      const spr = this.add.image(px, py, "site", b.frame).setDepth(py + 12);
      spr.setOrigin(0.5, 0.5);
      this.decorateBig(b, px, py);
    });

    // Pass 4: scattered yard props on open gravel — a site is never tidy.
    // Weighted so cones and barrels (small, plausible anywhere) dominate and
    // the big one-off items stay rare.
    const scatter = ["cone", "cone", "barrel", "cone", "spool", "barrel", "pickup", "signboard", "cone", "dumpster", "barrel", "portapotty"];
    for (let y = 1; y < this.grid.length - 1; y++) {
      for (let x = 1; x < this.grid[y].length - 1; x++) {
        if (this.grid[y][x] !== "0") continue;
        const h = TILES.hash(x, y, 97);
        if (h % 23 !== 0) continue;
        // never block a doorway-ish spot: only place where there's room around
        if (this.grid[y][x + 1] !== "0" || this.grid[y][x - 1] !== "0") continue;
        const pick = scatter[h % scatter.length];
        rt.drawFrame("site", `sprop_${pick}_${this.theme}`, x * T, y * T);
      }
    }
  }

  // Per-equipment ambient life: steam off process vessels, a rotating beacon
  // on the crane, sparks at the steel frame, ripples on a clarifier.
  decorateBig(b, px, py) {
    if (b.kind === "vessel" || b.kind === "column") {
      FX.steam(this, px - 18, py - 58, { depth: py + 14 });
    } else if (b.kind === "crane") {
      FX.beacon(this, px - 4, py - 44, C.amber);
    } else if (b.kind === "steelframe") {
      // welding sparks, in short bursts
      this.time.addEvent({
        delay: Phaser.Math.Between(2600, 5200),
        loop: true,
        callback: () => {
          FX.burst(this, px + Phaser.Math.Between(-18, 18), py - Phaser.Math.Between(10, 40), C.hiVis, 6, { spread: 20 });
        },
      });
    } else if (b.kind === "basin") {
      FX.monitorGlow(this, px, py - 4, 46, 24, { depth: py + 13 });
    } else if (b.kind === "tower") {
      FX.blink(this, px, py - 56, C.red, { size: 3, depth: py + 14, duration: 1400 });
    } else if (b.kind === "skid") {
      FX.blink(this, px - 24, py - 18, C.green, { size: 2, depth: py + 14 });
    }
  }

  // Same proximity rule the office floor uses — a site yard has too many
  // named things to label them all at once.
  addProxLabel(label, x, y, range) {
    label.setVisible(false);
    this.proxLabels.push({ label, x, y, range: range || this.tileSize * 3.6 });
    return label;
  }

  updateProxLabels() {
    this.proxLabels.forEach((e) => {
      const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) < e.range;
      if (near !== e.label.visible) e.label.setVisible(near);
    });
  }

  /* ---- HUD --------------------------------------------------------------- */

  buildHud() {
    this.hudPanel = UI.panel(this, 6, 6, 250, 104, {
      title: "SITE VISIT",
      stamp: "PUNCH LIST",
      accent: C.orange,
      titleColor: "#f2a86a",
    }).setScrollFactor(0);
    this.hudPanel.setDepth(20000);

    this.hudTitle = this.add
      .text(14, 26, this.site.name, TS.readout(CS.paper, 11))
      .setScrollFactor(0)
      .setDepth(20001);
    this.hudTitle.setWordWrapWidth(232);

    // Three checkpoint rows, each with its own color chip — the checklist is
    // the whole objective of a site visit, so it gets real hierarchy.
    this.checkRows = ["safety", "schedule", "quality"].map((id, i) => {
      const y = 62 + i * 15;
      const look = CHECKPOINT_LOOK[id];
      const chip = this.add.rectangle(20, y, 8, 8, look.accent).setScrollFactor(0).setDepth(20001);
      const box = this.add.text(32, y - 6, "[ ]", TS.readout(CS.steelPale, 11)).setScrollFactor(0).setDepth(20001);
      const label = this.add.text(58, y - 6, look.tag, TS.readout(CS.paper, 11)).setScrollFactor(0).setDepth(20001);
      return { id, chip, box, label, look };
    });

    this.helpText = this.add
      .text(8, 464, "ARROWS/WASD MOVE   SPACE INTERACT", {
        fontFamily: FONT_HEAD,
        fontSize: "12px",
        color: CS.steelPale,
        stroke: "#0b0d10",
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setDepth(20000);
  }

  refreshChecklist() {
    this.checkRows.forEach((row) => {
      const done = this.resolved[row.id];
      row.box.setText(done ? "[x]" : "[ ]");
      row.box.setColor(done ? row.look.str : CS.steelPale);
      row.label.setColor(done ? row.look.str : CS.paper);
      row.chip.setAlpha(done ? 1 : 0.35);
    });
    const allClear = this.resolved.safety && this.resolved.schedule && this.resolved.quality;
    if (this.clientMarker) this.clientMarker.setAlpha(allClear ? 1 : 0.35);
  }

  /* ---- dialogue ---------------------------------------------------------- */

  buildDialogueBox() {
    this.dialogueContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(22000);
    const panel = UI.panel(this, 20, 372, 600, 98, { title: "", stamp: "", accent: C.orange, titleColor: "#f2a86a" });
    const bodyText = this.add.text(34, 404, "", TS.body(CS.paper, 13, 560));
    const hint = this.add.text(596, 452, "[SPACE]", TS.tiny(CS.steelPale, 10)).setOrigin(1, 0.5);
    this.dialogueContainer.add([panel, bodyText, hint]);
    this.dialogueContainer.setVisible(false);
    this.dialoguePanel = panel;
    this.dialogueBodyText = bodyText;
  }

  openMessage(title, lines, onComplete) {
    this.dialogue = { title, lines, index: 0, onComplete };
    this.dialogueContainer.setVisible(true);
    this.renderDialogueLine();
  }

  renderDialogueLine() {
    if (this.dialoguePanel.titleText) this.dialoguePanel.titleText.setText(this.dialogue.title);
    this.dialogueBodyText.setText(this.dialogue.lines[this.dialogue.index]);
  }

  advanceMessage() {
    this.dialogue.index++;
    if (this.dialogue.index >= this.dialogue.lines.length) {
      this.dialogueContainer.setVisible(false);
      const cb = this.dialogue.onComplete;
      this.dialogue = null;
      if (cb) cb();
    } else {
      this.renderDialogueLine();
    }
  }

  /* ---- proximity --------------------------------------------------------- */

  findNearbyCheckpoint() {
    const T = this.tileSize;
    for (const entry of this.checkpointData) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, entry.sprite.x, entry.sprite.y);
      if (d < T * 1.2) return entry;
    }
    return null;
  }

  nearExit() {
    const T = this.tileSize;
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exitSprite.x, this.exitSprite.y) < T * 1.2;
  }

  nearClientTrailer() {
    const T = this.tileSize;
    const pt = this.site.clientTrailer.interactPoint;
    return (
      Phaser.Math.Distance.Between(this.player.x, this.player.y, pt.x * T + T / 2, pt.y * T + T / 2) < T * 1.5
    );
  }

  update() {
    if (this.dialogue) {
      this.player.setVelocity(0, 0);
      CHARART.play(this.player, "player", this.playerFacing, false);
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) this.advanceMessage();
      return;
    }

    if (this.encounterLocked) {
      this.player.setVelocity(0, 0);
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
    const moving = vx !== 0 || vy !== 0;
    if (moving) this.playerFacing = CHARART.dirFromVec(vec.x, vec.y, this.playerFacing);
    CHARART.play(this.player, "player", this.playerFacing, moving);
    this.player.setDepth(this.player.y);
    this.updateProxLabels();

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      const cp = this.findNearbyCheckpoint();
      if (cp) {
        this.openMessage(`${cp.cp.npcName} — ${cp.cp.npcTitle || ""}`.trim(), cp.cp.dialogue, () => {
          const wasResolved = this.resolved[cp.cp.id];
          this.resolved[cp.cp.id] = true;
          this.refreshChecklist();
          if (!wasResolved) this.celebrateCheckpoint(cp);
        });
      } else if (this.nearClientTrailer()) {
        this.handleClientTrailer();
      } else if (this.nearExit()) {
        this.exitToOffice();
      }
    }

    this.checkEncounterTile();
  }

  // Clearing a checkpoint is one of the few unambiguously good moments in the
  // game — it gets a stamp, a burst and a banner.
  celebrateCheckpoint(cp) {
    FX.burst(this, cp.sprite.x, cp.sprite.y - 10, cp.look.accent, 14, { spread: 70 });
    FX.ring(this, cp.sprite.x, cp.sprite.y - 10, cp.look.accent, { to: 60, duration: 420 });
    FX.float(this, cp.sprite.x, cp.sprite.y - 30, "CLEARED", cp.look.str, { size: 16, rise: 30 });
    const allClear = this.resolved.safety && this.resolved.schedule && this.resolved.quality;
    FX.banner(this, allClear ? "PUNCH LIST COMPLETE" : `${cp.look.tag} SIGNED OFF`, {
      accent: allClear ? C.gold : cp.look.accent,
      color: allClear ? CS.gold : cp.look.str,
      size: allClear ? 24 : 20,
      y: 120,
    });
    if (allClear) FX.flash(this, C.gold, 0.2, 300);
  }

  handleClientTrailer() {
    const allClear = this.resolved.safety && this.resolved.schedule && this.resolved.quality;
    if (!allClear) {
      this.openMessage("Client Trailer", [this.site.clientTrailer.notReadyLine], null);
      return;
    }
    FX.shake(this, 200, 0.005);
    FX.flash(this, C.gold, 0.4, 260);
    this.cameras.main.fadeOut(260, 0, 0, 0);
    this.time.delayedCall(280, () =>
      this.scene.start("BattleScene", {
        enemyId: this.site.clientTrailer.clientId,
        returnScene: "OfficeScene",
        completesSiteId: this.siteId,
      })
    );
  }

  exitToOffice() {
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.time.delayedCall(240, () => this.scene.start("OfficeScene"));
  }

  checkEncounterTile() {
    const T = this.tileSize;
    const tx = Math.floor(this.player.x / T);
    const ty = Math.floor(this.player.y / T);
    const key = `${tx},${ty}`;
    if (key === this.lastTileKey) return;
    this.lastTileKey = key;

    const onEncounterTile = this.encounterTiles.has(key);
    if (onEncounterTile && !this.inEncounterZone && Phaser.Math.Between(1, 100) <= 20) {
      this.triggerEncounter();
    }
    this.inEncounterZone = onEncounterTile;
  }

  triggerEncounter() {
    this.encounterLocked = true;
    this.player.setVelocity(0, 0);
    this.registry.set("siteReturnPos", { x: this.player.x, y: this.player.y });
    this.registry.set("siteProgress", { siteId: this.siteId, resolved: this.resolved });

    const hazard = Phaser.Utils.Array.GetRandom(SITE_HAZARDS);
    FX.shake(this, 240, 0.007);
    FX.flash(this, C.orange, 0.5, 280);
    FX.ring(this, this.player.x, this.player.y, C.orange, { to: 90, duration: 380 });
    this.cameras.main.zoomTo(1.3, 320, "Quad.easeIn");
    this.time.delayedCall(340, () =>
      this.scene.start("BattleScene", {
        enemyId: hazard.id,
        returnScene: "SiteVisitScene",
        returnSiteId: this.siteId,
      })
    );
  }
}
