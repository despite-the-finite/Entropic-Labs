// Visitor Day — low-stakes bonus mode. No combat, no gating. Family members
// give a free heal plus a one-time Bonus Potential bump (tracked permanently
// so it can't be farmed). Vendors give a free heal plus a repeatable
// "Well Fed" battle buff.
//
// GAMEPLAY IS UNCHANGED from V1. V2 moves it onto the shared art: the lot is
// paved rather than carpeted, each food truck is drawn once as a whole
// vehicle instead of a tiled row of stamps, visitors are animated characters
// whose names appear as you approach, and the HUD is the standard panel.

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

    this.proxLabels = [];
    this.solids = this.physics.add.staticGroup();

    // Everything static goes into one texture, same approach as the office.
    const rt = this.add
      .renderTexture(0, 0, site.width * T, site.height * T)
      .setOrigin(0, 0)
      .setDepth(-100);

    const truckBlocks = [];
    const claimed = new Set();

    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        const ch = this.grid[y][x];
        const px = x * T;
        const py = y * T;
        const cx = px + T / 2;
        const cy = py + T / 2;

        // Paved lot, not office carpet — this half of the game happens
        // outside, and the surface is most of what says so.
        rt.drawFrame("site", ch === "7" ? `smud_process` : `sconcrete_process_${TILES.hash(x, y, 5) % 2}`, px, py);

        if (ch === "1") {
          rt.drawFrame("world", `wall_gfs_${this.wallOrientation(x, y)}`, px, py);
          this.solids.create(cx, cy, "world", "ao_n").setVisible(false).setSize(T, T).refreshBody();
        } else if (ch === "2") {
          rt.drawFrame("world", "conf_table_gfs", px, py);
          this.solids.create(cx, cy, "world", "ao_n").setVisible(false).setSize(T, T).refreshBody();
        } else if (ch === "3") {
          rt.drawFrame("world", "plant_tall_gfs", px, py);
          this.solids.create(cx, cy, "world", "ao_n").setVisible(false).setSize(T * 0.6, T * 0.6).refreshBody();
        } else if (ch === "5") {
          this.solids.create(cx, cy, "world", "ao_n").setVisible(false).setSize(T, T).refreshBody();
          if (!claimed.has(`${x},${y}`)) {
            // Walk the run of truck tiles right and down, claim the whole
            // block, and draw ONE vehicle scaled to fill it.
            let w = 0;
            while (this.grid[y][x + w] === "5") w++;
            let h = 0;
            while (this.grid[y + h] && this.grid[y + h][x] === "5") h++;
            for (let dy = 0; dy < h; dy++)
              for (let dx = 0; dx < w; dx++) claimed.add(`${x + dx},${y + dy}`);
            truckBlocks.push({ x, y, w, h });
          }
        } else if (ch === "7") {
          rt.drawFrame("world", "flowerbed_gfs", px, py);
        }
      }
    }

    truckBlocks.forEach((b) => {
      const img = this.add
        .image(b.x * T, b.y * T, "world", "foodtruck_gfs")
        .setOrigin(0, 0)
        .setDisplaySize(b.w * T, b.h * T)
        .setDepth((b.y + b.h) * T);
      // serving-window glow + a wisp of steam, so the lot has some life
      FX.steam(this, b.x * T + b.w * T * 0.3, b.y * T + 6, { depth: img.depth + 1 });
    });

    (site.landmarks || []).forEach((lm) => {
      const cx = ((lm.c0 + lm.c1 + 1) / 2) * T;
      const cy = ((lm.r0 + lm.r1 + 1) / 2) * T;
      UI.roomSign(this, cx, cy, lm.label.replace("\n", " "), C.amber);
    });
    if (site.receptionLabel) {
      const rl = site.receptionLabel;
      UI.roomSign(this, rl.x * T, rl.y * T, rl.text, C.steel);
    }

    // Player
    const start = site.playerStart;
    this.player = this.physics.add.sprite(start.x * T + T / 2, start.y * T + T / 2, CHARART.KEY, "player_0");
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(T * 0.6, T * 0.4);
    this.player.body.setOffset(T * 0.075, T * 0.55);
    this.physics.add.collider(this.player, this.solids);
    this.playerFacing = "down";
    CHARART.play(this.player, "player", "down", false);

    // Visitors
    this.visitorGroup = this.physics.add.staticGroup();
    this.visitorData = [];
    site.visitorPlacements.forEach((def) => {
      const visitor = VISITORS.find((v) => v.id === def.visitorId);
      const px = def.x * T + T / 2;
      const py = def.y * T + T / 2;
      const charId = `visitor_${visitor.id}`;
      const spr = this.visitorGroup.create(px, py, CHARART.KEY, `${charId}_0`);
      spr.setSize(T * 0.6, T * 0.5).refreshBody();
      spr.setDepth(py);
      CHARART.play(spr, charId, "down", false);
      this.visitorData.push({ sprite: spr, visitor });
      const tint = { family: CS.amber, vendor: CS.green, subcontractor: "#f2a86a", client: CS.gold }[visitor.type];
      this.addProxLabel(UI.worldLabel(this, px, py - T * 0.9, visitor.name, tint || CS.paper), px, py);
    });
    this.physics.add.collider(this.player, this.visitorGroup);

    // Exit portal
    const exitPos = site.exitPortal;
    this.exitSprite = this.add
      .image(exitPos.x * T + T / 2, exitPos.y * T + T / 2, "site", "sprop_portal_process")
      .setDepth(exitPos.y * T);
    this.addProxLabel(
      UI.worldLabel(this, exitPos.x * T + T / 2, exitPos.y * T + T / 2 - T * 0.9, "BACK TO THE OFFICE", CS.hiVis),
      exitPos.x * T + T / 2,
      exitPos.y * T + T / 2,
      T * 5
    );

    // Camera / world bounds
    const worldW = site.width * T;
    const worldH = site.height * T;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setBackgroundColor("#8a887e");
    this.cameras.main.fadeIn(260, 0, 0, 0);

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

  // Same continuous-line rule the office uses, so a run of wall tiles draws
  // as one wall instead of a stack of disconnected dashes.
  wallOrientation(x, y) {
    const isWall = (gx, gy) => this.grid[gy] !== undefined && this.grid[gy][gx] === "1";
    const horizontal = isWall(x - 1, y) || isWall(x + 1, y);
    const vertical = isWall(x, y - 1) || isWall(x, y + 1);
    if (horizontal && vertical) return "x";
    if (vertical) return "v";
    return "h";
  }

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

  buildHud() {
    UI.panel(this, 6, 6, 250, 72, {
      title: "VISITOR DAY",
      stamp: "BADGES REQUIRED",
      accent: C.amber,
      titleColor: CS.amber,
    })
      .setScrollFactor(0)
      .setDepth(20000);

    this.hpBar = UI.bar(this, 46, 34, 130, 9, C.green);
    this.mpBar = UI.bar(this, 46, 47, 130, 9, C.steel);
    [this.hpBar, this.mpBar].forEach((b) => b.g.setScrollFactor(0).setDepth(20001));
    this.add.text(14, 33, "HP", TS.readout(CS.steelPale, 10)).setScrollFactor(0).setDepth(20001);
    this.add.text(14, 46, "MP", TS.readout(CS.steelPale, 10)).setScrollFactor(0).setDepth(20001);
    this.hpText = this.add.text(182, 33, "", TS.readout(CS.paper, 10)).setScrollFactor(0).setDepth(20001);
    this.mpText = this.add.text(182, 46, "", TS.readout(CS.paper, 10)).setScrollFactor(0).setDepth(20001);
    this.hudText = this.add.text(14, 60, "", TS.readout(CS.gold, 10)).setScrollFactor(0).setDepth(20001);

    this.add
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

  refreshHud() {
    const p = PLAYER_STATE;
    const wellFedNote = p.wellFedBattles > 0 ? `  ·  WELL FED x${p.wellFedBattles}` : "";
    this.hpBar.setValue(Phaser.Math.Clamp(p.hp / p.maxHp, 0, 1), true);
    this.mpBar.setValue(Phaser.Math.Clamp(p.mp / p.maxMp, 0, 1), true);
    this.hpText.setText(`${p.hp}/${p.maxHp}`);
    this.mpText.setText(`${p.mp}/${p.maxMp}`);
    this.hudText.setText(`BONUS ${p.bonusPotential}/100${wellFedNote}`);
  }

  buildDialogueBox() {
    this.dialogueContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(22000);
    const panel = UI.panel(this, 20, 372, 600, 98, { title: "", stamp: "", accent: C.amber, titleColor: CS.amber });
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

    this.openMessage(v.name, lines, () => {
      this.refreshHud();
      const color = { family: C.amber, vendor: C.green, subcontractor: C.orange, client: C.gold }[v.type] || C.steel;
      FX.burst(this, entry.sprite.x, entry.sprite.y - 10, color, 12, { spread: 60 });
      FX.float(this, this.player.x, this.player.y - 24, "RECHARGED", CS.green, { size: 14 });
      if (v.type === "vendor") FX.float(this, this.player.x, this.player.y - 42, "WELL FED +3 ATK", CS.amber, { size: 13, rise: 30 });
    });
  }

  update() {
    if (this.dialogue) {
      this.player.setVelocity(0, 0);
      CHARART.play(this.player, "player", this.playerFacing, false);
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
    const moving = vx !== 0 || vy !== 0;
    if (moving) this.playerFacing = CHARART.dirFromVec(vec.x, vec.y, this.playerFacing);
    CHARART.play(this.player, "player", this.playerFacing, moving);
    this.player.setDepth(this.player.y);
    this.updateProxLabels();

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      const entry = this.findNearbyVisitor();
      if (entry) {
        this.handleVisitorInteract(entry);
      } else if (this.nearExit()) {
        this.cameras.main.fadeOut(220, 0, 0, 0);
        this.time.delayedCall(240, () => this.scene.start("OfficeScene"));
      }
    }
  }
}
