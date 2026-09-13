// Turn-based combat screen, JRPG random-encounter style. Launched from
// OfficeScene/SiteVisitScene with { enemyId }, returns when the fight ends.
//
// MECHANICS ARE UNCHANGED from V1: same six menu slots in the same order,
// same damage formulas, same Guard/Dodge odds, same 60% flee, same XP and
// Bonus Potential rules, same pending-level-up gating, same loss and Game
// Over flows. Everything new here is presentation:
//
//   * enemies are drawn from the baked enemy atlas, two-frame idle, with
//     entrance, hit-reaction and defeat animations
//   * a battle backdrop that matches where the fight is happening
//   * attack effects per menu slot (email barrage, redline, budget blast)
//   * damage numbers, screen shake, bar tweening, action confirmation
//   * one UI grammar (UI.panel) shared with the rest of the game

class BattleScene extends Phaser.Scene {
  constructor() {
    super("BattleScene");
  }

  init(data) {
    const pools = [ENEMIES, EXEC_ENEMIES, BOSSES, CLIENTS, SITE_HAZARDS];
    let template = null;
    for (const pool of pools) {
      template = pool.find((e) => e.id === data.enemyId);
      if (template) break;
    }
    template = template || ENEMIES[0];
    this.enemy = JSON.parse(JSON.stringify(template));
    this.enemy.maxHp = this.enemy.hp;
    this.isBoss = !!(data.isBoss || template.isBoss);
    this.isClientNegotiation = !!template.isClientNegotiation;
    this.isHazard = SITE_HAZARDS.some((h) => h.id === this.enemy.id);
    this.menuOptions = template.menuLabels || [
      "Attack",
      "Overtime Push (5 MP)",
      "Special Attack (8 MP)",
      "Guard",
      "Dodge",
      "Flee",
    ];
    this.returnScene = data.returnScene || "OfficeScene";
    this.returnSiteId = data.returnSiteId || null;
    this.completesSiteId = data.completesSiteId || null;
    this.selectedIndex = 0;
    this.playerGuarding = false;
    this.playerDodging = false;
    this.battleOver = false;
    this.awaitingAdvance = false;
    this.playerLost = false;
    this.lossSelectedIndex = 0;
    this.gameOver = false;
  }

  create() {
    AMBIENT.stop();

    this.accent = this.isBoss ? C.gold : this.isClientNegotiation ? C.amber : this.isHazard ? C.orange : C.steel;
    this.accentStr = this.isBoss ? CS.gold : this.isClientNegotiation ? CS.amber : this.isHazard ? "#f2a86a" : CS.steel;

    this.drawBackdrop();

    // The backdrop can be light or dark depending on the fight, so the intro
    // line gets its own plate rather than relying on the wall behind it.
    const introPlate = this.add.graphics();
    introPlate.fillStyle(0x0b0d10, 0.62);
    introPlate.fillRect(0, 8, 640, 42);
    introPlate.lineStyle(1, this.accent, 0.5);
    introPlate.lineBetween(0, 50, 640, 50);

    this.introText = this.add
      .text(320, 16, this.enemy.flavorIntro, {
        fontFamily: FONT_BODY,
        fontSize: "12px",
        color: CS.paper,
        wordWrap: { width: 560 },
        align: "center",
      })
      .setOrigin(0.5, 0);

    // Enemy — enters from the side with a landing thump.
    this.enemySprite = this.add.sprite(320, 128, "enemies", `${this.enemy.id}_0`).setScale(1.35);
    if (!this.textures.get("enemies").has(`${this.enemy.id}_0`)) {
      this.enemySprite.setTexture("enemies", "scope_creep_0");
    }
    this.registerEnemyIdle();
    this.playEntrance();

    // Contact shadow so the enemy sits in the scene instead of floating.
    this.enemyShadow = this.add.ellipse(320, 204, 104, 16, 0x000000, 0.3);
    this.enemyShadow.setDepth(this.enemySprite.depth - 1);

    this.buildStatusPanels();
    this.buildLogPanel();
    this.buildMenu();
    this.buildLossScreen();
    this.buildGameOverScreen();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.confirmKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.refreshBars(false);
    this.setLog("A wild encounter begins.");
    this.updateCursor();
    this.cameras.main.fadeIn(240, 0, 0, 0);
  }

  /* ---- presentation ------------------------------------------------------ */

  // Backdrop: a vignette plus a hint of where you are. Office fights get a
  // ceiling-grid/carpet room; site fights get sky, hills and gravel.
  drawBackdrop() {
    const g = this.add.graphics();
    if (this.isHazard || this.isClientNegotiation) {
      g.fillStyle(0x9fbdd0, 1);
      g.fillRect(0, 0, 640, 200);
      g.fillStyle(0x8daec3, 1);
      g.fillRect(0, 130, 640, 70);
      // distant plant silhouette
      g.fillStyle(0x6f8ea3, 1);
      [40, 130, 260, 400, 520].forEach((x, i) => {
        g.fillRect(x, 150 - (i % 3) * 18, 54, 60 + (i % 3) * 18);
        g.fillRect(x + 18, 128 - (i % 2) * 22, 10, 34);
      });
      g.fillStyle(0x8f887c, 1);
      g.fillRect(0, 200, 640, 280);
      g.fillStyle(0x7d7669, 1);
      for (let i = 0; i < 260; i++) {
        g.fillRect(Phaser.Math.Between(0, 636), Phaser.Math.Between(202, 360), 3, 2);
      }
      FX.drift(this, { x: 0, y: 180, w: 640, h: 120 }, 0xd8cdb8, 6);
    } else {
      // Office: suspended ceiling over a wall band over carpet. EXEC fights
      // swap the whole palette for charcoal, walnut and brass.
      const isExec = this.isBoss;
      const ceil = isExec ? 0x2a2c31 : 0xd2cfc8;
      const ceilLine = isExec ? 0x35383e : 0xbfbcb4;
      const wall = isExec ? 0x37393d : 0xe4e2dd;
      const base = isExec ? 0x1d1f22 : 0x8e8b84;
      const floorCol = isExec ? 0x4a3f42 : 0x8e9aa6;
      g.fillStyle(ceil, 1);
      g.fillRect(0, 0, 640, 96);
      g.lineStyle(1, ceilLine, 1);
      for (let x = 0; x <= 640; x += 64) g.lineBetween(x, 0, x, 96);
      for (let y = 16; y < 96; y += 24) g.lineBetween(0, y, 640, y);
      // recessed lights
      g.fillStyle(isExec ? 0x45484f : 0xf2f0ea, 1);
      [96, 288, 480].forEach((x) => g.fillRect(x, 34, 64, 8));
      g.fillStyle(wall, 1);
      g.fillRect(0, 96, 640, 118);
      g.fillStyle(base, 1);
      g.fillRect(0, 206, 640, 8);
      g.fillStyle(floorCol, 1);
      g.fillRect(0, 214, 640, 266);
      g.fillStyle(isExec ? 0x3d3335 : 0x7d8994, 1);
      for (let i = 0; i < 200; i++) {
        g.fillRect(Phaser.Math.Between(0, 636), Phaser.Math.Between(216, 380), 2, 2);
      }
      // a window of daylight behind the action
      g.fillStyle(isExec ? 0x2b3a44 : 0xb9d3e0, 1);
      g.fillRect(432, 110, 168, 84);
      g.lineStyle(2, isExec ? 0xd8b45a : 0x5f656e, 1);
      g.strokeRect(432, 110, 168, 84);
      g.lineBetween(516, 110, 516, 194);
      g.lineBetween(432, 152, 600, 152);
    }
    // vignette — keeps the eye on the middle of the board
    const v = this.add.graphics();
    v.fillStyle(0x000000, 0.28);
    v.fillRect(0, 0, 640, 14);
    v.fillRect(0, 466, 640, 14);
    v.fillRect(0, 0, 14, 480);
    v.fillRect(626, 0, 14, 480);
  }

  registerEnemyIdle() {
    const key = `enemy_idle_${this.enemy.id}`;
    if (!this.anims.exists(key) && this.textures.get("enemies").has(`${this.enemy.id}_1`)) {
      this.anims.create({
        key,
        frames: [
          { key: "enemies", frame: `${this.enemy.id}_0` },
          { key: "enemies", frame: `${this.enemy.id}_1` },
        ],
        frameRate: 2.4,
        repeat: -1,
      });
    }
    if (this.anims.exists(key)) this.enemySprite.anims.play(key);
  }

  playEntrance() {
    const s = this.enemySprite;
    s.setAlpha(0).setScale(this.isBoss ? 1.9 : 1.75);
    s.y = 92;
    this.tweens.add({ targets: s, alpha: 1, duration: 200 });
    this.tweens.add({
      targets: s,
      y: 128,
      scale: 1.35,
      duration: 420,
      ease: "Back.easeOut",
      onComplete: () => {
        FX.shake(this, 140, this.isBoss ? 0.007 : 0.004);
        FX.ring(this, 320, 204, this.accent, { to: 120, duration: 420 });
        if (this.isBoss) FX.flash(this, C.gold, 0.22, 260);
      },
    });
  }

  // Cosmetic per-move effect. Restraint on purpose: one clear gesture each,
  // cleared within half a second.
  playAttackEffect(kind) {
    const ex = 320;
    const ey = 128;
    if (kind === "attack") {
      // a slashing redline across the enemy
      const g = this.add.graphics().setDepth(15000);
      g.lineStyle(3, C.red, 1);
      g.lineBetween(ex - 70, ey - 46, ex + 70, ey + 46);
      this.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() });
      FX.burst(this, ex, ey, C.red, 8, { spread: 54 });
    } else if (kind === "overtime") {
      // email barrage — envelopes flying in from the player's side
      for (let i = 0; i < 7; i++) {
        const env = this.add.rectangle(90, 300, 16, 11, C.paper).setDepth(15000).setStrokeStyle(1, C.inkSoft);
        this.tweens.add({
          targets: env,
          x: ex + Phaser.Math.Between(-46, 46),
          y: ey + Phaser.Math.Between(-34, 34),
          angle: Phaser.Math.Between(-90, 90),
          duration: 260,
          delay: i * 42,
          ease: "Quad.easeIn",
          onComplete: () => {
            FX.burst(this, env.x, env.y, C.steelLt, 4, { spread: 22 });
            env.destroy();
          },
        });
      }
    } else if (kind === "special") {
      // exploding Gantt chart — bars flung outward from a dashboard flash
      FX.flash(this, C.hiVis, 0.3, 200);
      for (let i = 0; i < 8; i++) {
        const w = Phaser.Math.Between(18, 40);
        const bar = this.add
          .rectangle(ex, ey, w, 7, [C.steel, C.amber, C.red][i % 3])
          .setDepth(15000);
        const a = Phaser.Math.DegToRad(i * 45);
        this.tweens.add({
          targets: bar,
          x: ex + Math.cos(a) * 110,
          y: ey + Math.sin(a) * 80,
          alpha: 0,
          angle: Phaser.Math.RadToDeg(a),
          duration: 460,
          ease: "Quad.easeOut",
          onComplete: () => bar.destroy(),
        });
      }
      FX.ring(this, ex, ey, C.hiVis, { to: 130, duration: 420 });
    } else if (kind === "guard") {
      // change-order shield
      const g = this.add.graphics().setDepth(15000);
      g.lineStyle(2, C.steelLt, 1);
      g.strokeRect(60, 250, 120, 80);
      g.lineStyle(1, C.steelLt, 0.5);
      g.strokeRect(66, 256, 108, 68);
      this.tweens.add({ targets: g, alpha: 0, duration: 500, onComplete: () => g.destroy() });
    } else if (kind === "dodge") {
      FX.ring(this, 120, 300, C.steelPale, { to: 60, duration: 320 });
    }
  }

  enemyHitReaction(dmg) {
    const s = this.enemySprite;
    this.tweens.killTweensOf(s);
    s.setScale(1.35);
    this.tweens.add({ targets: s, x: 320 + 10, duration: 50, yoyo: true, repeat: 2, onComplete: () => (s.x = 320) });
    s.setTintFill(0xffffff);
    this.time.delayedCall(90, () => s.clearTint());
    FX.float(this, 320 + Phaser.Math.Between(-24, 24), 108, `-${dmg}`, CS.red, { size: 20 });
    FX.shake(this, 120, 0.004);
  }

  playerHitReaction(dmg, dodged) {
    if (dodged) {
      FX.float(this, 120, 300, "MISS", CS.steelPale, { size: 16 });
      return;
    }
    FX.float(this, 120, 300, `-${dmg}`, CS.red, { size: 20 });
    FX.flash(this, C.red, 0.22, 200);
    FX.shake(this, 180, 0.006);
    this.tweens.add({
      targets: this.playerPanel,
      x: { from: this.playerPanel.x - 6, to: this.playerPanel.x },
      duration: 220,
      ease: "Elastic.easeOut",
    });
  }

  /* ---- panels ------------------------------------------------------------ */

  buildStatusPanels() {
    // Enemy plate — name, HP gauge, and a "threat" stamp for bosses.
    this.enemyPanel = UI.panel(this, 330, 212, 290, 66, {
      title: this.enemy.name,
      stamp: this.isBoss ? "BOSS" : this.isHazard ? "HAZARD" : this.isClientNegotiation ? "CLIENT" : "ISSUE",
      accent: this.accent,
      titleColor: this.accentStr,
    });
    this.enemyHpBar = UI.bar(this, 342, 240, 210, 11, C.red, { border: this.accent });
    this.enemyHpText = this.add.text(610, 245, "", TS.readout(CS.paper, 10)).setOrigin(1, 0.5);
    this.enemyMoveText = this.add.text(342, 264, "", TS.readout(CS.steelPale, 9)).setOrigin(0, 0.5);

    // Player plate — same shape, mirrored.
    this.playerPanel = UI.panel(this, 20, 212, 290, 66, {
      title: "",
      stamp: "YOU",
      accent: C.steel,
      titleColor: CS.steelPale,
    });
    this.playerHpBar = UI.bar(this, 32, 240, 150, 11, C.green);
    this.playerHpText = this.add.text(188, 245, "", TS.readout(CS.paper, 10)).setOrigin(0, 0.5);
    this.playerMpBar = UI.bar(this, 32, 254, 90, 7, C.steel);
    this.playerMpText = this.add.text(128, 257, "", TS.readout(CS.steelLt, 9)).setOrigin(0, 0.5);
    // Bonus Potential gets its own full-width row — the label is long and it
    // is the stat the whole run is really about.
    this.playerBonusText = this.add.text(32, 268, "", TS.readout(CS.gold, 9)).setOrigin(0, 0.5);
  }

  buildLogPanel() {
    this.logPanel = UI.panel(this, 20, 286, 600, 72, { accent: this.accent, alpha: 0.92 });
    this.logText = this.add.text(34, 296, "", TS.body(CS.paper, 12, 570));
    this.turnIndicatorText = this.add
      .text(606, 346, "", TS.readout("#ef8b85", 10))
      .setOrigin(1, 0.5);
    this.tweens.add({ targets: this.turnIndicatorText, alpha: { from: 1, to: 0.3 }, duration: 450, yoyo: true, repeat: -1 });
  }

  buildMenu() {
    this.menuPanel = UI.panel(this, 20, 366, 600, 104, {
      title: "ACTIONS",
      stamp: "SPACE = CONFIRM",
      accent: this.accent,
      titleColor: this.accentStr,
    });
    this.menuTexts = this.menuOptions.map((opt, i) =>
      this.add.text(64 + (i % 2) * 296, 400 + Math.floor(i / 2) * 22, opt, TS.menu(CS.paper, 14))
    );
    this.cursorText = this.add.text(44, 400, "\u25B8", TS.menu(this.accentStr, 14));
  }

  buildLossScreen() {
    this.lossContainer = this.add.container(0, 0).setVisible(false).setDepth(26000);
    const dim = this.add.rectangle(320, 240, 640, 480, 0x0b0d10, 0.72);
    const panel = UI.panel(this, 90, 140, 460, 210, {
      title: "SETBACK",
      stamp: "RECOVERY OPTIONS",
      accent: C.red,
      titleColor: CS.red,
    });
    this.lossMessageText = this.add
      .text(320, 178, "", TS.body(CS.paper, 12, 410))
      .setOrigin(0.5, 0);
    this.lossOptionTexts = ["Retry", "Exit"].map((label, i) =>
      this.add.text(320, 296 + i * 24, label, TS.menu(CS.paper, 14)).setOrigin(0.5)
    );
    this.lossCursorText = this.add.text(0, 0, "\u25B8", TS.menu(CS.gold, 14));
    this.lossContainer.add([dim, panel, this.lossMessageText, ...this.lossOptionTexts, this.lossCursorText]);
  }

  buildGameOverScreen() {
    this.gameOverContainer = this.add.container(0, 0).setVisible(false).setDepth(27000);
    const bg = this.add.rectangle(320, 240, 640, 480, 0x140c0e, 0.97);
    const title = this.add.text(320, 140, "GAME OVER", TS.title(40, CS.red)).setOrigin(0.5);
    const rule = this.add.rectangle(320, 172, 300, 2, C.red);
    this.gameOverMessageText = this.add
      .text(320, 200, "", TS.body(CS.paper, 12, 460))
      .setOrigin(0.5, 0);
    const prompt = this.add.text(320, 408, "PRESS ANY KEY TO RESTART", TS.menu(CS.gold, 14)).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });
    this.gameOverContainer.add([bg, title, rule, this.gameOverMessageText, prompt]);
  }

  /* ---- state readouts ---------------------------------------------------- */

  refreshBars(animate = true) {
    const p = PLAYER_STATE;
    if (this.playerPanel.titleText) {
      this.playerPanel.titleText.setText(`${getRankTitle(p.level, p.executiveUnlocked)}  Lv.${p.level}`);
    }
    const hpFrac = Phaser.Math.Clamp(p.hp / p.maxHp, 0, 1);
    this.playerHpBar.setColor(hpFrac < 0.34 ? C.red : hpFrac < 0.67 ? C.amber : C.green);
    this.playerHpBar.setValue(hpFrac, animate);
    this.playerHpText.setText(`HP ${Math.max(p.hp, 0)}/${p.maxHp}`);
    this.playerMpBar.setValue(Phaser.Math.Clamp(p.mp / p.maxMp, 0, 1), animate);
    this.playerMpText.setText(`MP ${p.mp}/${p.maxMp}`);
    const wellFedNote = p.wellFedBattles > 0 ? `  WELL FED x${p.wellFedBattles}` : "";
    this.playerBonusText.setText(
      `BONUS ${p.bonusPotential}/100 · ${getBonusLabel(p.bonusPotential).toUpperCase()}${wellFedNote}`
    );

    this.enemyHpBar.setValue(Phaser.Math.Clamp(this.enemy.hp / this.enemy.maxHp, 0, 1), animate);
    this.enemyHpText.setText(`${Math.max(this.enemy.hp, 0)}/${this.enemy.maxHp}`);
    if (this.enemyMoveText) {
      this.enemyMoveText.setText("KNOWN FOR: " + this.enemy.moves.map((m) => m.name).join(" · "));
      if (this.enemyMoveText.width > 266) this.enemyMoveText.setText("KNOWN FOR: " + this.enemy.moves[0].name);
    }
  }

  setLog(msg) {
    this.logText.setText(msg);
  }

  updateCursor() {
    const target = this.menuTexts[this.selectedIndex];
    this.cursorText.setPosition(target.x - 20, target.y);
    this.menuTexts.forEach((t, i) => t.setColor(i === this.selectedIndex ? this.accentStr : CS.paper));
  }

  updateLossCursor() {
    const target = this.lossOptionTexts[this.lossSelectedIndex];
    this.lossCursorText.setPosition(target.x - target.width / 2 - 20, target.y - 8);
    this.lossOptionTexts.forEach((t, i) => t.setColor(i === this.lossSelectedIndex ? CS.gold : CS.paper));
  }

  /* ---- loop -------------------------------------------------------------- */

  update() {
    if (this.gameOver) return;

    if (this.playerLost) {
      if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
        this.lossSelectedIndex = this.lossSelectedIndex === 0 ? 1 : 0;
        this.updateLossCursor();
      } else if (Phaser.Input.Keyboard.JustDown(this.confirmKey)) {
        if (this.lossSelectedIndex === 0) this.retryBattle();
        else this.returnToOffice();
      }
      return;
    }

    if (this.battleOver) {
      if (Phaser.Input.Keyboard.JustDown(this.confirmKey)) this.returnToOffice();
      return;
    }

    if (this.awaitingAdvance) {
      if (Phaser.Input.Keyboard.JustDown(this.confirmKey)) {
        this.awaitingAdvance = false;
        this.afterMessageContinue();
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
      this.selectedIndex = this.selectedIndex % 2 === 1 ? this.selectedIndex - 1 : this.selectedIndex;
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
      if (this.selectedIndex % 2 === 0 && this.selectedIndex + 1 < this.menuOptions.length) this.selectedIndex += 1;
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      if (this.selectedIndex - 2 >= 0) this.selectedIndex -= 2;
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      if (this.selectedIndex + 2 < this.menuOptions.length) this.selectedIndex += 2;
    }
    this.updateCursor();

    if (Phaser.Input.Keyboard.JustDown(this.confirmKey)) this.handleChoice(this.selectedIndex);
  }

  effectiveAtk() {
    const p = PLAYER_STATE;
    return p.atk + (p.wellFedBattles > 0 ? 3 : 0);
  }

  consumeWellFed() {
    if (PLAYER_STATE.wellFedBattles > 0) PLAYER_STATE.wellFedBattles -= 1;
  }

  handleChoice(idx) {
    this.playerGuarding = false;
    this.playerDodging = false;
    const p = PLAYER_STATE;
    const atk = this.effectiveAtk();
    // Confirmation feedback on the chosen option itself.
    FX.pop(this, this.menuTexts[idx], 1.2, 160);

    if (idx === 0) {
      const dmg = Math.max(1, atk - this.enemy.def + Phaser.Math.Between(-1, 2));
      this.enemy.hp -= dmg;
      this.pendingMessage = `You hit ${this.enemy.name} for ${dmg} damage.`;
      this.playAttackEffect("attack");
      this.enemyHitReaction(dmg);
    } else if (idx === 1) {
      if (p.mp >= 5) {
        p.mp -= 5;
        const dmg = Math.max(2, Math.floor(atk * 1.8) - this.enemy.def + Phaser.Math.Between(0, 3));
        this.enemy.hp -= dmg;
        this.pendingMessage = `You pull an OVERTIME PUSH! ${this.enemy.name} takes ${dmg} damage.`;
        this.playAttackEffect("overtime");
        this.time.delayedCall(300, () => this.enemyHitReaction(dmg));
      } else {
        this.pendingMessage = `Not enough MP. You mutter something about work-life balance.`;
      }
    } else if (idx === 2) {
      if (p.mp >= 8) {
        p.mp -= 8;
        const dmg = Math.max(
          3,
          Math.floor(atk * 2.6) - Math.floor(this.enemy.def / 2) + Phaser.Math.Between(0, 4)
        );
        this.enemy.hp -= dmg;
        this.pendingMessage = `SPECIAL ATTACK! You pull out every stat in the deck. ${this.enemy.name} takes ${dmg} damage.`;
        this.playAttackEffect("special");
        this.time.delayedCall(200, () => this.enemyHitReaction(dmg));
      } else {
        this.pendingMessage = `Not enough MP for that. You mutter something about work-life balance.`;
      }
    } else if (idx === 3) {
      this.playerGuarding = true;
      this.pendingMessage = `You brace for impact and look extremely busy.`;
      this.playAttackEffect("guard");
    } else if (idx === 4) {
      this.playerDodging = true;
      this.pendingMessage = `You sidestep, ready to dodge whatever's coming.`;
      this.playAttackEffect("dodge");
    } else if (idx === 5) {
      if (Phaser.Math.Between(1, 100) <= 60) {
        this.pendingMessage = `You slip out to "take a call" and escape the fight.`;
        this.consumeWellFed();
        this.refreshBars();
        this.setLog(this.pendingMessage);
        this.battleOver = true;
        this.turnIndicatorText.setText("\u25B8 SPACE TO CONTINUE");
        return;
      }
      this.pendingMessage = `You couldn't find a good excuse to leave!`;
    }

    this.refreshBars();
    this.setLog(this.pendingMessage);

    if (this.enemy.hp <= 0) {
      this.playDefeatAnimation();
      this.onEnemyDefeated();
      return;
    }

    this.awaitingAdvance = true;
    this.turnIndicatorText.setText(`\u25BC ${this.enemy.name.toUpperCase()}'S TURN — SPACE`);
    this.menuTexts.forEach((t) => t.setAlpha(0.35));
    this.cursorText.setAlpha(0.35);
  }

  playDefeatAnimation() {
    const s = this.enemySprite;
    this.tweens.killTweensOf(s);
    s.anims.stop();
    FX.burst(this, 320, 128, this.accent, 22, { spread: 130 });
    FX.ring(this, 320, 128, this.accent, { to: 160, duration: 600 });
    this.tweens.add({ targets: [s, this.enemyShadow], alpha: 0, duration: 520 });
    this.tweens.add({ targets: s, y: 168, scaleX: 1.5, scaleY: 0.9, duration: 520, ease: "Quad.easeIn" });
  }

  afterMessageContinue() {
    this.turnIndicatorText.setText("");
    this.menuTexts.forEach((t) => t.setAlpha(1));
    this.cursorText.setAlpha(1);

    // Enemy telegraph: lunge toward the player before the damage lands.
    this.tweens.add({ targets: this.enemySprite, y: 146, scale: 1.45, duration: 130, yoyo: true, ease: "Quad.easeOut" });

    const p = PLAYER_STATE;
    const move = Phaser.Utils.Array.GetRandom(this.enemy.moves);
    let dmg = Phaser.Math.Between(move.dmgMin, move.dmgMax) + this.enemy.atk - p.def;
    dmg = Math.max(1, dmg);

    let logMsg;
    let dodged = false;
    if (this.playerDodging && Phaser.Math.Between(1, 100) <= 50) {
      dmg = 0;
      dodged = true;
      logMsg = `${this.enemy.name} uses ${move.name}! You dodge it completely.`;
    } else {
      if (this.playerGuarding) dmg = Math.ceil(dmg / 2);
      logMsg = `${this.enemy.name} uses ${move.name}! You take ${dmg} damage.`;
    }

    p.hp -= dmg;
    this.setLog(logMsg);
    this.time.delayedCall(140, () => this.playerHitReaction(dmg, dodged));
    this.refreshBars();

    if (p.hp <= 0) this.onPlayerDefeated();
  }

  onEnemyDefeated() {
    const p = PLAYER_STATE;
    const rankBefore = getRankTitle(p.level, p.executiveUnlocked);

    p.xp += this.enemy.xp;
    if (!p.levelUpPending && p.xp >= p.xpToNext) {
      p.xp -= p.xpToNext;
      p.levelUpPending = true;
    }

    this.leveledUpThisFight = false;
    this.gameWon = false;
    let msg;
    if (this.enemy.isFinalBoss) {
      p.execBossesDefeated[this.enemy.id] = true;
      const remaining = Object.values(p.execBossesDefeated).filter((v) => !v).length;
      msg = `${this.enemy.winMessage || `${this.enemy.name} concedes.`}`;
      msg += `\n${applyBonusPotential(this.enemy.bonusPotential || 12)}`;
      if (remaining === 0) {
        p.executiveUnlocked = true;
        p.hp = p.maxHp;
        p.mp = p.maxMp;
        msg += `\n\nEvery leader on this floor has signed off. PROMOTED! You are now Executive.`;
        this.leveledUpThisFight = true;
        this.gameWon = true;
      } else {
        msg += `\n${remaining} more EXEC leader${remaining === 1 ? "" : "s"} to beat before you're Executive.`;
      }
    } else if (this.isBoss) {
      p.reginaldDefeated = true;
      p.hp = p.maxHp;
      p.mp = p.maxMp;
      msg = `${this.enemy.winMessage || `${this.enemy.name} concedes.`}\nYou've earned your shot at the top floor — four EXEC leaders are waiting.`;
      msg += `\n${applyBonusPotential(15)}`;
    } else if (this.isClientNegotiation) {
      if (this.completesSiteId) p.completedSites[this.completesSiteId] = true;
      msg = `${this.enemy.winMessage || `${this.enemy.name} backs down.`} +${this.enemy.xp} XP.`;
      msg += `\n${applyBonusPotential(8)}`;
      if (p.levelUpPending) {
        p.levelUpPending = false;
        levelUpPlayer();
        const rankAfter = getRankTitle(p.level, p.executiveUnlocked);
        msg +=
          rankAfter !== rankBefore
            ? `\nChange order approved — PROMOTED! You are now ${rankAfter}.`
            : `\nChange order approved — LEVEL UP! You are now Lv.${p.level}.`;
        this.leveledUpThisFight = true;
      }
    } else {
      msg = `${this.enemy.winMessage ? this.enemy.winMessage + " " : `${this.enemy.name} has been resolved. `}+${this.enemy.xp} XP.`;
      msg += `\n${applyBonusPotential(this.enemy.bonusPotential || 1)}`;
      if (p.levelUpPending) {
        msg += "\nYou're ready to level up — get a change order approved on a site visit to make it official.";
      }
    }

    this.consumeWellFed();
    this.refreshBars();
    this.setLog(msg);
    this.battleOver = true;
    this.turnIndicatorText.setText("\u25B8 SPACE TO CONTINUE");

    // Reward feedback, scaled to the size of the win.
    this.time.delayedCall(420, () => {
      FX.float(this, 320, 120, `+${this.enemy.xp} XP`, CS.steelPale, { size: 18, rise: 34 });
      if (this.leveledUpThisFight) {
        FX.banner(this, this.gameWon ? "EXECUTIVE" : "PROMOTION APPROVED", { accent: C.gold, color: CS.gold, y: 150 });
      } else if (this.isBoss || this.isClientNegotiation) {
        FX.banner(this, "SIGNED OFF", { accent: this.accent, y: 150, size: 22 });
      }
    });
  }

  onPlayerDefeated() {
    this.battleOver = true;
    this.playerLost = true;
    PLAYER_STATE.hp = Math.ceil(PLAYER_STATE.maxHp * 0.4);

    let flavor;
    let bonusDelta;
    if (this.isBoss) {
      flavor = this.enemy.loseMessage || "The review is cut short. Come back when you're ready.";
      bonusDelta = -8;
    } else if (this.isClientNegotiation) {
      flavor = this.enemy.loseMessage || "The client gets their way.";
      bonusDelta = -8;
    } else {
      flavor = "You blacked out mid-task. A coworker finds you asleep at your desk and covers for you...";
      bonusDelta = -5;
    }
    const bonusMsg = applyBonusPotential(bonusDelta);

    this.consumeWellFed();
    this.refreshBars();
    const message = `${flavor}\n\nHP restored to ${PLAYER_STATE.hp}/${PLAYER_STATE.maxHp}.\n${bonusMsg}`;

    if (PLAYER_STATE.bonusPotential <= 0) this.showGameOver(message);
    else this.showLossScreen(message);
  }

  showLossScreen(message) {
    this.turnIndicatorText.setText("");
    this.setLog("");
    this.lossMessageText.setText(message);
    this.lossSelectedIndex = 0;
    this.lossContainer.setVisible(true);
    this.lossContainer.setAlpha(0);
    this.tweens.add({ targets: this.lossContainer, alpha: 1, duration: 240 });
    this.updateLossCursor();
  }

  showGameOver(message) {
    this.turnIndicatorText.setText("");
    this.setLog("");
    this.gameOver = true;
    this.gameOverMessageText.setText(`${message}\n\nBonus Potential hit 0 — HR has some questions.`);
    this.gameOverContainer.setVisible(true);
    this.gameOverContainer.setAlpha(0);
    this.tweens.add({ targets: this.gameOverContainer, alpha: 1, duration: 400 });
    this.input.keyboard.once("keydown", () => {
      resetPlayerState();
      this.scene.start("TitleScene");
    });
  }

  retryBattle() {
    this.scene.restart({
      enemyId: this.enemy.id,
      isBoss: this.isBoss,
      returnScene: this.returnScene,
      returnSiteId: this.returnSiteId,
      completesSiteId: this.completesSiteId,
    });
  }

  returnToOffice() {
    const nextPayload = this.returnSiteId ? { siteId: this.returnSiteId } : {};
    if (this.leveledUpThisFight) {
      this.scene.start("PromotionScene", { nextScene: this.returnScene, nextPayload, isGameWin: this.gameWon });
    } else {
      this.scene.start(this.returnScene, nextPayload);
    }
  }
}
