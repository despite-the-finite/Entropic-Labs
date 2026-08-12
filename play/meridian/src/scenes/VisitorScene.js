// Visitor Day — low-stakes bonus mode. No combat, no gating. Family
// members give a free heal plus a one-time Bonus Potential bump (tracked
// permanently so it can't be farmed). Vendors give a free heal plus a
// repeatable "Well Fed" battle buff.

class VisitorScene extends Phaser.Scene {
  constructor() {
    super("VisitorScene");
  }

  create() {
    AMBIENT.start("visitor");
    const site = VISITOR_DAY;
    const T = site.tileSize;
    this.tileSize = T;
    this.grid = site.layout.map((row) => row.split(""));

    this.solids = this.physics.add.staticGroup();

    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        const ch = this.grid[y][x];
        const px = x * T + T / 2;
        const py = y * T + T / 2;

        if (ch === "1") {
          this.solids.create(px, py, this.wallTextureKey(x, y)).setSize(T, T).refreshBody();
        } else if (ch === "2") {
          this.add.image(px, py, "tile_floor");
          this.solids.create(px, py, "tile_desk").setSize(T, T).refreshBody();
        } else if (ch === "3") {
          this.add.image(px, py, "tile_floor");
          this.solids.create(px, py, "tile_plant").setSize(T * 0.6, T * 0.6).refreshBody();
        } else if (ch === "5") {
          this.add.image(px, py, "tile_floor");
          this.solids.create(px, py, "tile_foodtruck").setSize(T, T).refreshBody();
        } else if (ch === "7") {
          this.add.image(px, py, "tile_flowerbed");
        } else {
          this.add.image(px, py, "tile_floor");
        }
      }
    }

    (site.landmarks || []).forEach((lm) => {
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
    if (site.receptionLabel) {
      const rl = site.receptionLabel;
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
    }

    // Player
    const start = site.playerStart;
    this.player = this.physics.add.sprite(
      start.x * T + T / 2,
      start.y * T + T / 2,
      "player"
    );
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(T * 0.6, T * 0.4);
    this.player.body.setOffset(T * 0.075, T * 0.55);
    this.physics.add.collider(this.player, this.solids);

    // Visitors
    this.visitorGroup = this.physics.add.staticGroup();
    this.visitorData = [];
    site.visitorPlacements.forEach((def) => {
      const visitor = VISITORS.find((v) => v.id === def.visitorId);
      const px = def.x * T + T / 2;
      const py = def.y * T + T / 2;
      const spr = this.visitorGroup.create(px, py, `visitor_${visitor.id}`);
      spr.setSize(T * 0.6, T * 0.5).refreshBody();
      this.visitorData.push({ sprite: spr, visitor });
      this.add
        .text(px, py - T * 0.9, `${visitor.name}`, {
          fontSize: "12px",
          fontFamily: "Courier New",
          color: "#ffe9a8",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);
    });
    this.physics.add.collider(this.player, this.visitorGroup);

    // Exit portal
    const exitPos = site.exitPortal;
    this.exitSprite = this.add.image(
      exitPos.x * T + T / 2,
      exitPos.y * T + T / 2,
      "tile_portal"
    );
    this.add
      .text(exitPos.x * T + T / 2, exitPos.y * T + T / 2 - T * 0.9, "EXIT", {
        fontSize: "13px",
        fontFamily: "Courier New",
        color: "#ffb454",
        align: "center",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Camera / world bounds
    const worldW = site.width * T;
    const worldH = site.height * T;
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
    this.refreshHud();

    this.dialogue = null;
  }

  // Same orientation-picking as OfficeScene's wallTextureKey — a run of
  // wall tiles reads as one continuous line instead of a stack of dashes.
  wallTextureKey(x, y) {
    const isWall = (gx, gy) => this.grid[gy] !== undefined && this.grid[gy][gx] === "1";
    const horizontal = isWall(x - 1, y) || isWall(x + 1, y);
    const vertical = isWall(x, y - 1) || isWall(x, y + 1);
    if (horizontal && vertical) return "tile_wall_x";
    if (vertical) return "tile_wall_v";
    return "tile_wall_h";
  }

  buildHud() {
    this.add
      .rectangle(4, 4, 220, 48, 0x14161c, 0.75)
      .setOrigin(0, 0)
      .setScrollFactor(0);
    this.hudTitle = this.add
      .text(10, 8, "Visitor Day", {
        fontSize: "12px",
        fontFamily: "Courier New",
        color: "#ffb454",
      })
      .setScrollFactor(0);
    this.hudText = this.add
      .text(10, 24, "", {
        fontSize: "12px",
        fontFamily: "Courier New",
        color: "#dff0ff",
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

  refreshHud() {
    const p = PLAYER_STATE;
    const wellFedNote = p.wellFedBattles > 0 ? `  (Well Fed x${p.wellFedBattles})` : "";
    this.hudText.setText(
      `HP ${p.hp}/${p.maxHp}  MP ${p.mp}/${p.maxMp}${wellFedNote}\n` +
        `Bonus: ${p.bonusPotential}/100 — ${getBonusLabel(p.bonusPotential)}`
    );
  }

  buildDialogueBox() {
    this.dialogueContainer = this.add.container(0, 0).setScrollFactor(0);
    const bg = this.add
      .rectangle(320, 420, 600, 90, 0x14161c, 0.92)
      .setStrokeStyle(2, 0xc25a8a);
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

  findNearbyVisitor() {
    const T = this.tileSize;
    for (const entry of this.visitorData) {
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

  // Some visitors (family) have several full conversations instead of one
  // — pick a random one each visit so repeat trips don't replay the same
  // lines verbatim. Everyone else still just has a flat line list.
  pickDialogueLines(v) {
    if (Array.isArray(v.dialogue[0])) {
      return [...Phaser.Utils.Array.GetRandom(v.dialogue)];
    }
    return [...v.dialogue];
  }

  handleVisitorInteract(entry) {
    const v = entry.visitor;
    const p = PLAYER_STATE;
    const lines = this.pickDialogueLines(v);

    p.hp = p.maxHp;
    p.mp = p.maxMp;

    if (v.type === "family") {
      if (!p.visitorGreeted[v.id]) {
        p.visitorGreeted[v.id] = true;
        lines.push(`(You feel recharged. HP/MP restored. ${applyBonusPotential(3)})`);
      } else {
        lines.push(`(You feel recharged. HP/MP restored.)`);
      }
    } else if (v.type === "vendor") {
      p.wellFedBattles = 3;
      lines.push(`(You feel Well Fed! +3 ATK for your next 3 battles. HP/MP restored.)`);
    } else if (v.type === "subcontractor") {
      lines.push(`(You feel recharged. HP/MP restored. ${applyBonusPotential(2)})`);
    } else if (v.type === "client") {
      if (!p.visitorGreeted[v.id]) {
        p.visitorGreeted[v.id] = true;
        lines.push(`(You feel recharged. HP/MP restored. ${applyBonusPotential(5)})`);
      } else {
        lines.push(`(You feel recharged. HP/MP restored.)`);
      }
    }

    this.openMessage(v.name, lines, () => this.refreshHud());
  }

  update() {
    if (this.dialogue) {
      this.player.setVelocity(0, 0);
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this.advanceMessage();
      }
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
      const entry = this.findNearbyVisitor();
      if (entry) {
        this.handleVisitorInteract(entry);
      } else if (this.nearExit()) {
        this.scene.start("OfficeScene");
      }
    }
  }
}
