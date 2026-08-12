// Turn-based combat screen, JRPG random-encounter style. Launched from
// OfficeScene with { enemyId }, returns to OfficeScene when the fight ends.

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
    // Clone so repeated fights don't share mutated HP across encounters.
    this.enemy = JSON.parse(JSON.stringify(template));
    this.enemy.maxHp = this.enemy.hp;
    this.isBoss = !!(data.isBoss || template.isBoss);
    this.isClientNegotiation = !!template.isClientNegotiation;
    // Fixed 6 slots, 2 columns x 3 rows — handleChoice() switches on index,
    // so a template overriding menuLabels (see clients.js) must keep this
    // exact order, just reskin the text.
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
    this.ensureEnemyTexture();

    this.add.rectangle(320, 240, 640, 480, 0x1c1e28);
    this.add
      .rectangle(320, 240, 620, 460, 0x14161c)
      .setStrokeStyle(2, 0x4a90d9);

    this.add
      .text(320, 30, this.enemy.flavorIntro, {
        fontSize: "13px",
        fontFamily: "Courier New",
        color: "#ffe9a8",
        wordWrap: { width: 560 },
        align: "center",
      })
      .setOrigin(0.5, 0);

    this.enemySprite = this.add.image(320, 150, `enemy_${this.enemy.id}`);

    // Enemy HP bar
    this.enemyNameText = this.add.text(140, 210, "", {
      fontSize: "12px",
      fontFamily: "Courier New",
      color: "#ffffff",
    });
    this.enemyHpBarBg = this.add
      .rectangle(140, 228, 200, 10, 0x2a2d3a)
      .setOrigin(0, 0.5);
    this.enemyHpBarFill = this.add
      .rectangle(140, 228, 200, 10, 0xa63d3d)
      .setOrigin(0, 0.5);

    // Player HP/MP bar
    this.playerNameText = this.add.text(140, 260, "", {
      fontSize: "12px",
      fontFamily: "Courier New",
      color: "#ffffff",
    });
    this.playerHpBarBg = this.add
      .rectangle(140, 278, 200, 10, 0x2a2d3a)
      .setOrigin(0, 0.5);
    this.playerHpBarFill = this.add
      .rectangle(140, 278, 200, 10, 0x4a90d9)
      .setOrigin(0, 0.5);
    this.playerMpText = this.add.text(140, 288, "", {
      fontSize: "12px",
      fontFamily: "Courier New",
      color: "#8fd0ff",
    });
    this.playerBonusText = this.add.text(140, 303, "", {
      fontSize: "12px",
      fontFamily: "Courier New",
      color: "#c9a8e6",
    });

    // Message log
    this.logText = this.add.text(40, 320, "", {
      fontSize: "12px",
      fontFamily: "Courier New",
      color: "#ffffff",
      wordWrap: { width: 560 },
    });

    // Menu
    this.menuTexts = this.menuOptions.map((opt, i) =>
      this.add.text(60 + (i % 2) * 280, 400 + Math.floor(i / 2) * 22, opt, {
        fontSize: "13px",
        fontFamily: "Courier New",
        color: "#ffffff",
      })
    );

    this.cursorText = this.add.text(40, 400, ">", {
      fontSize: "13px",
      fontFamily: "Courier New",
      color: "#ffe9a8",
    });

    // Shown only while waiting on the enemy's move — otherwise the log
    // just quietly sits there after your own action and SPACE looks like
    // "continue" rather than "let them swing."
    this.turnIndicatorText = this.add
      .text(480, 296, "", {
        fontSize: "12px",
        fontFamily: "Courier New",
        color: "#ff8a8a",
        align: "center",
        wordWrap: { width: 150 },
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: this.turnIndicatorText,
      alpha: { from: 1, to: 0.35 },
      duration: 450,
      yoyo: true,
      repeat: -1,
    });

    // Loss screen — takes over the whole board on defeat instead of the
    // normal "press SPACE to continue," so losing gets an explicit
    // Retry-or-Exit choice plus a clear readout of what it cost in Bonus
    // Potential, rather than that detail scrolling by in the log line.
    this.lossContainer = this.add.container(0, 0).setVisible(false);
    const lossBg = this.add
      .rectangle(320, 240, 480, 220, 0x14161c, 0.97)
      .setStrokeStyle(2, 0xa63d3d);
    const lossTitle = this.add
      .text(320, 165, "SETBACK", {
        fontSize: "16px",
        fontFamily: "Courier New",
        color: "#ff8a8a",
      })
      .setOrigin(0.5);
    this.lossMessageText = this.add
      .text(320, 195, "", {
        fontSize: "12px",
        fontFamily: "Courier New",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: 420 },
      })
      .setOrigin(0.5, 0);
    this.lossOptionTexts = ["Retry", "Exit"].map((label, i) =>
      this.add
        .text(320, 305 + i * 24, label, {
          fontSize: "13px",
          fontFamily: "Courier New",
          color: "#ffffff",
        })
        .setOrigin(0.5)
    );
    this.lossCursorText = this.add.text(0, 0, ">", {
      fontSize: "13px",
      fontFamily: "Courier New",
      color: "#ffe9a8",
    });
    this.lossContainer.add([lossBg, lossTitle, this.lossMessageText, ...this.lossOptionTexts, this.lossCursorText]);

    // Game Over — Bonus Potential hit 0. No Retry here (unlike the loss
    // screen above): the run itself is over, not just this one fight.
    this.gameOverContainer = this.add.container(0, 0).setVisible(false);
    const gameOverBg = this.add.rectangle(320, 240, 640, 480, 0x1c0e0e, 0.96);
    const gameOverTitle = this.add
      .text(320, 150, "GAME OVER", {
        fontSize: "28px",
        fontFamily: "Courier New",
        color: "#ff8a8a",
      })
      .setOrigin(0.5);
    this.gameOverMessageText = this.add
      .text(320, 210, "", {
        fontSize: "13px",
        fontFamily: "Courier New",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: 480 },
      })
      .setOrigin(0.5, 0);
    const gameOverPrompt = this.add
      .text(320, 400, "Hit any key to restart", {
        fontSize: "14px",
        fontFamily: "Courier New",
        color: "#ffe9a8",
        align: "center",
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: gameOverPrompt,
      alpha: 0.15,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
    this.gameOverContainer.add([gameOverBg, gameOverTitle, this.gameOverMessageText, gameOverPrompt]);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.confirmKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    this.refreshBars();
    this.setLog(`A wild encounter begins.`);
    this.updateCursor();
  }

  ensureEnemyTexture() {
    const key = `enemy_${this.enemy.id}`;
    if (this.textures.exists(key)) return;

    if (this.isBoss || this.isClientNegotiation) {
      const w = 140;
      const h = 150;
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.3);
      g.fillEllipse(w / 2, h - 8, w * 0.65, 12);
      // suit body
      g.fillStyle(this.enemy.color, 1);
      g.fillRoundedRect(w * 0.18, h * 0.22, w * 0.64, h * 0.66, 14);
      // shirt/tie collar
      g.fillStyle(0xe8e8e8, 1);
      g.fillTriangle(w * 0.42, h * 0.24, w * 0.58, h * 0.24, w * 0.5, h * 0.36);
      g.fillStyle(0xa63d3d, 1);
      g.fillTriangle(w * 0.47, h * 0.3, w * 0.53, h * 0.3, w * 0.5, h * 0.5);
      // head
      g.fillStyle(0xd9b98a, 1);
      g.fillCircle(w / 2, h * 0.16, w * 0.16);
      // stern eyes
      g.fillStyle(0x000000, 0.9);
      g.fillRect(w * 0.4, h * 0.14, w * 0.08, 3);
      g.fillRect(w * 0.52, h * 0.14, w * 0.08, 3);
      g.generateTexture(key, w, h);
      g.destroy();
      return;
    }

    if (this.enemy.id === "reply_all") {
      const w = 96;
      const h = 96;
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.25);
      g.fillEllipse(w / 2, h - 8, w * 0.7, 10);
      // envelope body
      g.fillStyle(this.enemy.color, 1);
      g.fillRect(w * 0.1, h * 0.28, w * 0.8, h * 0.5);
      g.lineStyle(2, 0xdff0ff, 0.85);
      g.strokeRect(w * 0.1, h * 0.28, w * 0.8, h * 0.5);
      // open flap, drawn as two folded-back triangles
      g.fillStyle(0x1c3a52, 1);
      g.fillTriangle(w * 0.1, h * 0.28, w * 0.5, h * 0.55, w * 0.1, h * 0.78);
      g.fillTriangle(w * 0.9, h * 0.28, w * 0.5, h * 0.55, w * 0.9, h * 0.78);
      g.lineStyle(2, 0xdff0ff, 0.85);
      g.lineBetween(w * 0.1, h * 0.28, w * 0.5, h * 0.55);
      g.lineBetween(w * 0.9, h * 0.28, w * 0.5, h * 0.55);
      // a flurry of tiny reply arrows to sell "storm"
      g.fillStyle(0xdff0ff, 0.9);
      [
        [w * 0.24, h * 0.16],
        [w * 0.5, h * 0.1],
        [w * 0.76, h * 0.16],
      ].forEach(([ax, ay]) => {
        g.fillTriangle(ax - 4, ay + 5, ax + 4, ay + 5, ax, ay - 3);
      });
      g.generateTexture(key, w, h);
      g.destroy();
      return;
    }

    const w = 96;
    const h = 96;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(w / 2, h - 8, w * 0.6, 10);
    g.fillStyle(this.enemy.color, 1);
    g.fillRoundedRect(w * 0.2, h * 0.15, w * 0.6, h * 0.7, 10);
    g.fillStyle(0x000000, 0.85);
    g.fillCircle(w * 0.38, h * 0.42, 5);
    g.fillCircle(w * 0.62, h * 0.42, 5);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  refreshBars() {
    const p = PLAYER_STATE;
    this.playerNameText.setText(
      `${getRankTitle(p.level, p.executiveUnlocked)} (Lv.${p.level})   HP ${p.hp}/${p.maxHp}`
    );
    this.playerHpBarFill.width = 200 * Phaser.Math.Clamp(p.hp / p.maxHp, 0, 1);
    this.playerMpText.setText(`MP ${p.mp}/${p.maxMp}`);
    const wellFedNote = p.wellFedBattles > 0 ? `  (Well Fed x${p.wellFedBattles})` : "";
    this.playerBonusText.setText(
      `Bonus: ${p.bonusPotential}/100 — ${getBonusLabel(p.bonusPotential)}${wellFedNote}`
    );

    this.enemyNameText.setText(`${this.enemy.name}   HP ${Math.max(this.enemy.hp, 0)}/${this.enemy.maxHp}`);
    this.enemyHpBarFill.width =
      200 * Phaser.Math.Clamp(this.enemy.hp / this.enemy.maxHp, 0, 1);
  }

  setLog(msg) {
    this.logText.setText(msg);
  }

  updateCursor() {
    const idx = this.selectedIndex;
    const target = this.menuTexts[idx];
    this.cursorText.setPosition(target.x - 20, target.y);
  }

  updateLossCursor() {
    const target = this.lossOptionTexts[this.lossSelectedIndex];
    this.lossCursorText.setPosition(target.x - target.width / 2 - 20, target.y - 8);
  }

  update() {
    if (this.gameOver) return; // restart happens via the one-shot keydown listener in showGameOver()

    if (this.playerLost) {
      if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
        this.lossSelectedIndex = this.lossSelectedIndex === 0 ? 1 : 0;
        this.updateLossCursor();
      } else if (Phaser.Input.Keyboard.JustDown(this.confirmKey)) {
        if (this.lossSelectedIndex === 0) {
          this.retryBattle();
        } else {
          this.returnToOffice();
        }
      }
      return;
    }

    if (this.battleOver) {
      if (Phaser.Input.Keyboard.JustDown(this.confirmKey)) {
        this.returnToOffice();
      }
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
      if (this.selectedIndex % 2 === 0 && this.selectedIndex + 1 < this.menuOptions.length) {
        this.selectedIndex += 1;
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      if (this.selectedIndex - 2 >= 0) this.selectedIndex -= 2;
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      if (this.selectedIndex + 2 < this.menuOptions.length) this.selectedIndex += 2;
    }
    this.updateCursor();

    if (Phaser.Input.Keyboard.JustDown(this.confirmKey)) {
      this.handleChoice(this.selectedIndex);
    }
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

    if (idx === 0) {
      const dmg = Math.max(1, atk - this.enemy.def + Phaser.Math.Between(-1, 2));
      this.enemy.hp -= dmg;
      this.pendingMessage = `You hit ${this.enemy.name} for ${dmg} damage.`;
    } else if (idx === 1) {
      if (p.mp >= 5) {
        p.mp -= 5;
        const dmg = Math.max(2, Math.floor(atk * 1.8) - this.enemy.def + Phaser.Math.Between(0, 3));
        this.enemy.hp -= dmg;
        this.pendingMessage = `You pull an OVERTIME PUSH! ${this.enemy.name} takes ${dmg} damage.`;
      } else {
        this.pendingMessage = `Not enough MP. You mutter something about work-life balance.`;
      }
    } else if (idx === 2) {
      // Costlier and hits harder than Overtime Push, and cuts through half
      // the enemy's defense — the "I'm pulling out the big deck" move.
      if (p.mp >= 8) {
        p.mp -= 8;
        const dmg = Math.max(
          3,
          Math.floor(atk * 2.6) - Math.floor(this.enemy.def / 2) + Phaser.Math.Between(0, 4)
        );
        this.enemy.hp -= dmg;
        this.pendingMessage = `SPECIAL ATTACK! You pull out every stat in the deck. ${this.enemy.name} takes ${dmg} damage.`;
      } else {
        this.pendingMessage = `Not enough MP for that. You mutter something about work-life balance.`;
      }
    } else if (idx === 3) {
      this.playerGuarding = true;
      this.pendingMessage = `You brace for impact and look extremely busy.`;
    } else if (idx === 4) {
      // Guard reliably halves damage; Dodge gambles on avoiding it
      // entirely — a coin flip, resolved when the enemy's attack lands.
      this.playerDodging = true;
      this.pendingMessage = `You sidestep, ready to dodge whatever's coming.`;
    } else if (idx === 5) {
      if (Phaser.Math.Between(1, 100) <= 60) {
        this.pendingMessage = `You slip out to "take a call" and escape the fight.`;
        this.consumeWellFed();
        this.refreshBars();
        this.setLog(this.pendingMessage);
        this.battleOver = true;
        return;
      } else {
        this.pendingMessage = `You couldn't find a good excuse to leave!`;
      }
    }

    this.refreshBars();
    this.setLog(this.pendingMessage);

    if (this.enemy.hp <= 0) {
      this.onEnemyDefeated();
      return;
    }

    this.awaitingAdvance = true;
    this.turnIndicatorText.setText(`▼ ${this.enemy.name.toUpperCase()}'S TURN — SPACE ▼`);
    this.menuTexts.forEach((t) => t.setAlpha(0.35));
    this.cursorText.setAlpha(0.35);
  }

  afterMessageContinue() {
    // Enemy turn
    this.turnIndicatorText.setText("");
    this.menuTexts.forEach((t) => t.setAlpha(1));
    this.cursorText.setAlpha(1);
    this.tweens.add({
      targets: this.enemySprite,
      scale: { from: 1.15, to: 1 },
      duration: 220,
      ease: "Quad.easeOut",
    });

    const p = PLAYER_STATE;
    const move = Phaser.Utils.Array.GetRandom(this.enemy.moves);
    let dmg = Phaser.Math.Between(move.dmgMin, move.dmgMax) + this.enemy.atk - p.def;
    dmg = Math.max(1, dmg);

    let logMsg;
    if (this.playerDodging && Phaser.Math.Between(1, 100) <= 50) {
      dmg = 0;
      logMsg = `${this.enemy.name} uses ${move.name}! You dodge it completely.`;
    } else {
      if (this.playerGuarding) dmg = Math.ceil(dmg / 2);
      logMsg = `${this.enemy.name} uses ${move.name}! You take ${dmg} damage.`;
    }

    p.hp -= dmg;
    this.setLog(logMsg);
    this.refreshBars();

    if (p.hp <= 0) {
      this.onPlayerDefeated();
    }
  }

  onEnemyDefeated() {
    const p = PLAYER_STATE;
    const rankBefore = getRankTitle(p.level, p.executiveUnlocked);

    // Earning enough XP only queues a level up (see levelUpPending on
    // PLAYER_STATE) — it doesn't apply until a site-visit change order is
    // approved below, so office battles alone can't carry you to Executive.
    p.xp += this.enemy.xp;
    if (!p.levelUpPending && p.xp >= p.xpToNext) {
      p.xp -= p.xpToNext;
      p.levelUpPending = true;
    }

    this.leveledUpThisFight = false;
    this.gameWon = false;
    let msg;
    if (this.enemy.isFinalBoss) {
      // One of the four EXEC-floor bosses — Executive (and winning the
      // game) requires beating all four, not just this one.
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
      // Reginald Cho's Performance Review — a VP-level checkpoint, not the
      // promotion itself anymore. It confirms you're ready for the EXEC
      // floor's four bosses (see isFinalBoss above), which is what actually
      // makes you Executive.
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
        msg +=
          "\nYou're ready to level up — get a change order approved on a site visit to make it official.";
      }
    }

    this.consumeWellFed();
    this.refreshBars();
    this.setLog(msg);
    this.battleOver = true;
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

    if (PLAYER_STATE.bonusPotential <= 0) {
      this.showGameOver(message);
    } else {
      this.showLossScreen(message);
    }
  }

  showLossScreen(message) {
    this.turnIndicatorText.setText("");
    this.setLog("");
    this.lossMessageText.setText(message);
    this.lossSelectedIndex = 0;
    this.lossContainer.setVisible(true);
    this.updateLossCursor();
  }

  // Bonus Potential bottomed out — the run ends here, no Retry: reputation
  // is gone, not just this fight. Any key restarts a fresh run.
  showGameOver(message) {
    this.turnIndicatorText.setText("");
    this.setLog("");
    this.gameOver = true;
    this.gameOverMessageText.setText(
      `${message}\n\nBonus Potential hit 0 — HR has some questions.`
    );
    this.gameOverContainer.setVisible(true);
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
