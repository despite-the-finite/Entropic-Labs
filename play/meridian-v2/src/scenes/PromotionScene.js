// Shown after any level up (see BattleScene.leveledUpThisFight) — a brief
// congratulations note "from the executives" before handing off to wherever
// the fight would normally have returned to.
//
// V2 presents it as the memo it is: letterhead, a rule, the body, and a stat
// line set as a readout. Making Executive gets the gold treatment and a
// confetti-free burst; an ordinary promotion stays deadpan.

class PromotionScene extends Phaser.Scene {
  constructor() {
    super("PromotionScene");
  }

  init(data) {
    this.nextScene = data.nextScene || "OfficeScene";
    this.nextPayload = data.nextPayload || {};
    this.isGameWin = !!data.isGameWin;
  }

  create() {
    AMBIENT.stop();
    const p = PLAYER_STATE;
    const rank = getRankTitle(p.level, p.executiveUnlocked);
    const accent = this.isGameWin ? C.gold : C.steel;
    const accentStr = this.isGameWin ? CS.gold : CS.steelLt;

    this.cameras.main.setBackgroundColor(this.isGameWin ? "#1a1408" : "#0f1318");

    const g = this.add.graphics();
    g.lineStyle(1, accent, 0.08);
    for (let x = 0; x <= 640; x += 24) g.lineBetween(x, 0, x, 480);
    for (let y = 0; y <= 480; y += 24) g.lineBetween(0, y, 640, y);

    UI.panel(this, 40, 70, 560, 360, {
      title: this.isGameWin ? "OFFICE OF THE BOARD" : "OFFICE OF THE EXECUTIVES",
      stamp: this.isGameWin ? "FINAL" : "INTERNAL",
      accent,
      titleColor: accentStr,
    });

    this.add
      .text(320, 126, this.isGameWin ? "YOU'VE MADE EXECUTIVE" : "A NOTE FROM THE EXECUTIVES", TS.title(26, accentStr))
      .setOrigin(0.5);
    this.add.rectangle(320, 158, 420, 1, accent).setAlpha(0.6);

    const lines = this.isGameWin
      ? [
          "The COO, the CFO, General Counsel, and the full Board — every leader on that floor has signed off on you. There's nobody left to convince.",
          "",
          "You are Executive now. Not the title on paper — the actual seat.",
          "",
          "The office, the sites, and Visitor Day are all still here whenever you want them.",
        ]
      : [
          `Congratulations on your promotion to ${rank}.`,
          "",
          Phaser.Utils.Array.GetRandom([
            "Keep up this trajectory and Leadership will notice.",
            "This is exactly the kind of quarter we like to see.",
            "Don't let it go to your head. But feel free to let it go to your head a little.",
            "We've updated the org chart. You're on it now, in a bigger box.",
          ]),
        ];

    const bodyText = this.add
      .text(320, 180, lines.join("\n"), {
        fontFamily: FONT_BODY,
        fontSize: "12px",
        color: CS.paper,
        align: "center",
        wordWrap: { width: 480 },
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0);

    // The memo body is variable length, so the readout and the prompt are
    // placed under whatever it actually measured to.
    const statTop = Math.min(340, Math.max(296, bodyText.y + bodyText.height + 22));

    // Stat line as an instrument readout rather than a sentence.
    const stats = [
      ["LV", p.level],
      ["HP", p.maxHp],
      ["MP", p.maxMp],
      ["ATK", p.atk],
      ["DEF", p.def],
    ];
    const sg = this.add.graphics();
    sg.lineStyle(1, accent, 0.45);
    sg.strokeRect(140.5, statTop + 0.5, 360, 44);
    stats.forEach(([label, value], i) => {
      const x = 140 + 36 + i * 72;
      if (i > 0) sg.lineBetween(140 + i * 72, statTop, 140 + i * 72, statTop + 44);
      this.add.text(x, statTop + 12, label, TS.readout(CS.steelPale, 10)).setOrigin(0.5);
      this.add.text(x, statTop + 31, String(value), TS.title(18, CS.paper)).setOrigin(0.5);
    });

    UI.prompt(this, 320, statTop + 80, "SPACE — BACK TO WORK");

    if (this.isGameWin) {
      this.time.delayedCall(250, () => {
        FX.burst(this, 320, 150, C.gold, 26, { scrollFactor: 0, spread: 190 });
        FX.ring(this, 320, 150, C.gold, { to: 240, duration: 800, scrollFactor: 0 });
      });
    } else {
      this.time.delayedCall(200, () => FX.burst(this, 320, 128, accent, 14, { scrollFactor: 0, spread: 120 }));
    }

    this.cameras.main.fadeIn(220, 0, 0, 0);

    const advance = () => this.scene.start(this.nextScene, this.nextPayload);
    this.input.keyboard.once("keydown", advance);
    this.input.once("pointerdown", advance);
  }
}
