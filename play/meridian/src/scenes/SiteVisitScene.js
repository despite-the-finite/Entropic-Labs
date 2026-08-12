// A site visit: a small separate map reached via a portal in the office.
// Clear all three checkpoints (Safety, Schedule, Quality), then the client
// trailer unlocks a negotiation fight. Hazard zones trigger random fights
// against SITE_HAZARDS, same mechanic as office encounter tiles.

class SiteVisitScene extends Phaser.Scene {
  constructor() {
    super("SiteVisitScene");
  }

  init(data) {
    this.siteId = data.siteId || Object.keys(SITE_VISITS)[0];
    this.site = SITE_VISITS[this.siteId];
  }

  create() {
    AMBIENT.start("site");
    const T = this.site.tileSize;
    this.tileSize = T;
    this.grid = this.site.layout.map((row) => row.split(""));

    this.solids = this.physics.add.staticGroup();
    this.encounterTiles = new Set();

    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        const ch = this.grid[y][x];
        const px = x * T + T / 2;
        const py = y * T + T / 2;

        if (ch === "1") {
          this.solids.create(px, py, "tile_fence").setSize(T, T).refreshBody();
        } else if (ch === "2") {
          this.add.image(px, py, "tile_gravel");
          this.solids.create(px, py, "tile_structure").setSize(T, T).refreshBody();
        } else if (ch === "3") {
          this.add.image(px, py, "tile_gravel");
          this.solids.create(px, py, "tile_equipment").setSize(T, T).refreshBody();
        } else if (ch === "4") {
          this.add.image(px, py, "tile_hazard");
          this.encounterTiles.add(`${x},${y}`);
        } else {
          this.add.image(px, py, "tile_gravel");
        }
      }
    }

    // Labels
    (this.site.landmarks || []).forEach((lm) => {
      const cx = ((lm.c0 + lm.c1 + 1) / 2) * T;
      const cy = ((lm.r0 + lm.r1 + 1) / 2) * T;
      this.add
        .text(cx, cy, lm.label, {
          fontSize: "13px",
          fontFamily: "Courier New",
          color: "#1a1a1a",
          align: "center",
          stroke: "#ffffff",
          strokeThickness: 2,
        })
        .setOrigin(0.5);
    });
    if (this.site.structureLabel) {
      const sl = this.site.structureLabel;
      this.add
        .text(sl.x * T, sl.y * T, sl.text, {
          fontSize: "13px",
          fontFamily: "Courier New",
          color: "#ffe9a8",
          align: "center",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);
    }

    // Player
    const start = this.site.playerStart;
    this.player = this.physics.add.sprite(
      start.x * T + T / 2,
      start.y * T + T / 2,
      "player"
    );
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(T * 0.6, T * 0.4);
    this.player.body.setOffset(T * 0.075, T * 0.55);
    this.physics.add.collider(this.player, this.solids);

    // Checkpoint state — restore if resuming from a hazard fight
    this.resolved = { safety: false, schedule: false, quality: false };
    const savedProgress = this.registry.get("siteProgress");
    if (savedProgress && savedProgress.siteId === this.siteId) {
      this.resolved = savedProgress.resolved;
      this.registry.remove("siteProgress");
    }

    // Checkpoint NPCs
    this.checkpointGroup = this.physics.add.staticGroup();
    this.checkpointData = [];
    this.site.checkpoints.forEach((cp) => {
      const px = cp.x * T + T / 2;
      const py = cp.y * T + T / 2;
      const texKey = `checkpoint_${this.siteId}_${cp.id}`;
      const spr = this.checkpointGroup.create(px, py, texKey);
      spr.setSize(T * 0.6, T * 0.5).refreshBody();
      this.checkpointData.push({ sprite: spr, cp });
      this.add
        .text(px, py - T * 0.9, cp.npcName, {
          fontSize: "12px",
          fontFamily: "Courier New",
          color: "#ffe9a8",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);
    });
    this.physics.add.collider(this.player, this.checkpointGroup);

    // The client — walk up and hit SPACE once all three checkpoints are
    // clear to start the change-order negotiation (handleClientTrailer
    // below gates on that; before then it's just a "come back later" line).
    const ct = this.site.clientTrailer;
    const client = CLIENTS.find((c) => c.id === ct.clientId);
    const clientPx = ct.interactPoint.x * T + T / 2;
    const clientPy = ct.interactPoint.y * T + T / 2;
    this.clientGroup = this.physics.add.staticGroup();
    const clientSpr = this.clientGroup.create(clientPx, clientPy, `client_${this.siteId}`);
    clientSpr.setSize(T * 0.6, T * 0.5).refreshBody();
    this.add
      .text(clientPx, clientPy - T * 0.9, client ? client.name : "Client", {
        fontSize: "12px",
        fontFamily: "Courier New",
        color: "#ffe9a8",
        align: "center",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.physics.add.collider(this.player, this.clientGroup);

    // Exit portal
    const exitPos = this.site.exitPortal;
    this.exitSprite = this.add.image(
      exitPos.x * T + T / 2,
      exitPos.y * T + T / 2,
      "tile_portal"
    );
    this.add
      .text(exitPos.x * T + T / 2, exitPos.y * T + T / 2 - T * 0.9, "EXIT SITE", {
        fontSize: "13px",
        fontFamily: "Courier New",
        color: "#ffb454",
        align: "center",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Resume position after a hazard fight
    if (this.registry.get("siteReturnPos")) {
      const p = this.registry.get("siteReturnPos");
      this.player.setPosition(p.x, p.y);
      this.registry.remove("siteReturnPos");
    }

    // Prime encounter tracking from wherever the player actually ended up
    // so landing back on a hazard tile doesn't immediately re-roll another fight.
    const startKey = `${Math.floor(this.player.x / T)},${Math.floor(this.player.y / T)}`;
    this.lastTileKey = startKey;
    this.inEncounterZone = this.encounterTiles.has(startKey);

    // Camera / world bounds
    const worldW = this.site.width * T;
    const worldH = this.site.height * T;
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

    this.buildHud();
    this.buildDialogueBox();
    this.refreshChecklist();

    this.encounterLocked = false;
    this.dialogue = null;
  }

  buildHud() {
    this.add
      .rectangle(4, 4, 200, 4 + 16 * 4, 0x14161c, 0.75)
      .setOrigin(0, 0)
      .setScrollFactor(0);
    this.hudTitle = this.add
      .text(10, 8, this.site.name, {
        fontSize: "12px",
        fontFamily: "Courier New",
        color: "#dff0ff",
        wordWrap: { width: 190 },
      })
      .setScrollFactor(0);
    this.checklistText = this.add
      .text(10, 40, "", {
        fontSize: "13px",
        fontFamily: "Courier New",
        color: "#ffe9a8",
      })
      .setScrollFactor(0);
    // Unbacked — floats over the game world at the bottom of the screen.
    this.add
      .text(4, 460, "Arrows/WASD move  |  SPACE interact", {
        fontSize: "12px",
        fontFamily: "Courier New",
        color: "#c9d2e0",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setScrollFactor(0);
  }

  refreshChecklist() {
    const mark = (v) => (v ? "x" : " ");
    this.checklistText.setText(
      `Safety   [${mark(this.resolved.safety)}]\n` +
        `Schedule [${mark(this.resolved.schedule)}]\n` +
        `Quality  [${mark(this.resolved.quality)}]`
    );
  }

  buildDialogueBox() {
    this.dialogueContainer = this.add.container(0, 0).setScrollFactor(0);
    const bg = this.add
      .rectangle(320, 420, 600, 90, 0x14161c, 0.92)
      .setStrokeStyle(2, 0xd97b2e);
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

  openMessage(title, lines, onComplete) {
    this.dialogue = { title, lines, index: 0, onComplete };
    this.dialogueContainer.setVisible(true);
    this.renderDialogueLine();
  }

  renderDialogueLine() {
    this.dialogueNameText.setText(this.dialogue.title);
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

  findNearbyCheckpoint() {
    const T = this.tileSize;
    for (const entry of this.checkpointData) {
      const d = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        entry.sprite.x,
        entry.sprite.y
      );
      if (d < T * 1.2) return entry;
    }
    return null;
  }

  nearExit() {
    const T = this.tileSize;
    return (
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.exitSprite.x,
        this.exitSprite.y
      ) <
      T * 1.2
    );
  }

  nearClientTrailer() {
    const T = this.tileSize;
    const pt = this.site.clientTrailer.interactPoint;
    return (
      Phaser.Math.Distance.Between(this.player.x, this.player.y, pt.x * T + T / 2, pt.y * T + T / 2) <
      T * 1.5
    );
  }

  update() {
    if (this.dialogue) {
      this.player.setVelocity(0, 0);
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this.advanceMessage();
      }
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

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      const cp = this.findNearbyCheckpoint();
      if (cp) {
        this.openMessage(cp.cp.npcName, cp.cp.dialogue, () => {
          this.resolved[cp.cp.id] = true;
          this.refreshChecklist();
        });
      } else if (this.nearClientTrailer()) {
        this.handleClientTrailer();
      } else if (this.nearExit()) {
        this.exitToOffice();
      }
    }

    this.checkEncounterTile();
  }

  handleClientTrailer() {
    const allClear = this.resolved.safety && this.resolved.schedule && this.resolved.quality;
    if (!allClear) {
      this.openMessage("Client Trailer", [this.site.clientTrailer.notReadyLine], null);
      return;
    }
    this.scene.start("BattleScene", {
      enemyId: this.site.clientTrailer.clientId,
      returnScene: "OfficeScene",
      completesSiteId: this.siteId,
    });
  }

  exitToOffice() {
    this.scene.start("OfficeScene");
  }

  // Rolls only on the step that crosses INTO a hazard zone from outside
  // it, not on every tile crossed while still inside — see OfficeScene's
  // checkEncounterTile for why.
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
    this.scene.start("BattleScene", {
      enemyId: hazard.id,
      returnScene: "SiteVisitScene",
      returnSiteId: this.siteId,
    });
  }
}
