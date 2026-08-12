// Short story beat between the title card and the game itself. Sets up the
// promotion and the three Bonus-Potential-earning modes (office, site
// visits, Visitor Day). Purely narrative — no PLAYER_STATE changes here.

class IntroScene extends Phaser.Scene {
  constructor() {
    super("IntroScene");
  }

  create() {
    this.add.rectangle(320, 240, 640, 480, 0x14161c);
    this.add
      .rectangle(320, 240, 620, 460, 0x1c1e28)
      .setStrokeStyle(2, 0x4a90d9);

    this.add
      .text(320, 30, "CONGRATULATIONS ON YOUR PROMOTION", {
        fontSize: "13px",
        fontFamily: "Courier New",
        color: "#ffe9a8",
        align: "center",
      })
      .setOrigin(0.5, 0);

    const body =
      "You're the new Engineering Manager at Donnell & McBurns, an EPC " +
      "firm that has been designing, procuring, and constructing things " +
      "nobody quite remembers commissioning since long before you started.\n\n" +
      "The title comes with a corner cubicle, a Bonus Potential score of " +
      "20, and a Performance Review already on the calendar. Maxing out " +
      "Bonus Potential queues a promotion — but it only takes effect once " +
      "you get a change order approved on a site visit.\n\n" +
      "Everything starts at your cubicle. From there:\n\n" +
      "THE OFFICE - work coworkers, fight in conference rooms.\n" +
      "SITE VISITS - clear checkpoints, negotiate change orders.\n" +
      "VISITOR DAY - impress family, vendors, subs, and clients.\n" +
      "PTO - a weekend with Colleen and Indra, at the cost of Bonus.\n\n" +
      "Work the floor. Maximize your Bonus Potential. Make Executive.";

    this.add
      .text(320, 60, body, {
        fontSize: "12px",
        fontFamily: "Courier New",
        color: "#dfe3ee",
        align: "left",
        wordWrap: { width: 560 },
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0);

    this.add
      .text(
        320,
        380,
        "Controls: Arrows/WASD move  ·  SPACE interact/select  ·  H return to cubicle (in the office)",
        {
          fontSize: "12px",
          fontFamily: "Courier New",
          color: "#b8c0d0",
          align: "center",
          wordWrap: { width: 560 },
        }
      )
      .setOrigin(0.5, 0);

    const prompt = this.add
      .text(320, 450, "Hit any key to continue", {
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

    const advance = () => {
      MUSIC.stop();
      this.scene.start("BootScene");
    };
    this.input.keyboard.once("keydown", advance);
    this.input.once("pointerdown", advance);
  }
}
