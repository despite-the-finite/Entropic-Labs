// Shown after any level up (see BattleScene.leveledUpThisFight) — a brief
// congratulations note "from the executives" before handing off to
// wherever the fight would normally have returned to.

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

    this.add.rectangle(320, 240, 640, 480, 0x14161c);
    this.add
      .rectangle(320, 240, 560, 340, 0x1c1e28)
      .setStrokeStyle(2, this.isGameWin ? 0x4a90d9 : 0xffe9a8);

    this.add
      .text(320, 130, this.isGameWin ? "YOU'VE MADE EXECUTIVE" : "A NOTE FROM THE EXECUTIVES", {
        fontSize: "14px",
        fontFamily: "Courier New",
        color: "#ffe9a8",
        align: "center",
      })
      .setOrigin(0.5);

    const lines = this.isGameWin
      ? [
          "The COO, the CFO, General Counsel, and the full Board — every leader on that floor",
          "has signed off on you. There's nobody left to convince.",
          "",
          "You are Executive now. Not the title on paper — the actual seat.",
          "",
          `Lv.${p.level}   HP ${p.maxHp}   MP ${p.maxMp}   ATK ${p.atk}   DEF ${p.def}`,
          "",
          "Keep playing as long as you like — the office, the sites, and Visitor Day are all still here.",
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
          "",
          `Lv.${p.level}   HP ${p.maxHp}   MP ${p.maxMp}   ATK ${p.atk}   DEF ${p.def}`,
        ];

    this.add
      .text(320, 190, lines.join("\n"), {
        fontSize: "12px",
        fontFamily: "Courier New",
        color: "#dfe3ee",
        align: "center",
        wordWrap: { width: 500 },
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0);

    const prompt = this.add
      .text(320, 400, "Hit any key to continue", {
        fontSize: "13px",
        fontFamily: "Courier New",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0.15,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    const advance = () => this.scene.start(this.nextScene, this.nextPayload);
    this.input.keyboard.once("keydown", advance);
    this.input.once("pointerdown", advance);
  }
}
