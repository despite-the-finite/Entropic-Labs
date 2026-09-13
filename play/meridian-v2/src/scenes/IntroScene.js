// Short story beat between the title card and the game itself. Sets up the
// promotion and the three Bonus-Potential-earning modes (office, site visits,
// Visitor Day). Purely narrative — no PLAYER_STATE changes here.
//
// V2 reframes it as the offer letter you were handed on day one: letterhead,
// body copy, and the four modes broken out as their own labelled rows instead
// of a run of plain lines.

class IntroScene extends Phaser.Scene {
  constructor() {
    super("IntroScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#0f1318");

    const g = this.add.graphics();
    g.lineStyle(1, C.steelLt, 0.08);
    for (let x = 0; x <= 640; x += 24) g.lineBetween(x, 0, x, 480);
    for (let y = 0; y <= 480; y += 24) g.lineBetween(0, y, 640, y);

    UI.panel(this, 24, 20, 592, 440, {
      title: "OFFICE OF THE EXECUTIVES",
      stamp: "CONFIDENTIAL",
      accent: C.steel,
      titleColor: CS.steelLt,
    });

    this.add.text(320, 58, "CONGRATULATIONS ON YOUR PROMOTION", TS.title(24, CS.gold)).setOrigin(0.5);
    this.add.rectangle(320, 80, 520, 1, C.steel).setAlpha(0.5);

    const body =
      "You're the new Engineering Manager at Donnell & McBurns, an EPC firm that has been " +
      "designing, procuring, and constructing things nobody quite remembers commissioning " +
      "since long before you started.\n\n" +
      "The title comes with a corner cubicle, a Bonus Potential score of 20, and a Performance " +
      "Review already on the calendar. Maxing out Bonus Potential queues a promotion — but it " +
      "only takes effect once you get a change order approved on a site visit.\n\n" +
      "Everything starts at your cubicle. From there:";

    const bodyText = this.add
      .text(52, 96, body, {
        fontFamily: FONT_BODY,
        fontSize: "12px",
        color: CS.paper,
        align: "left",
        wordWrap: { width: 536 },
        lineSpacing: 4,
      })
      .setOrigin(0, 0);

    // The four modes as labelled rows — this is the part a new player
    // actually needs to retain.
    const modes = [
      ["THE OFFICE", "Work coworkers, fight in conference rooms.", C.steel],
      ["SITE VISITS", "Clear checkpoints, negotiate change orders.", C.orange],
      ["VISITOR DAY", "Impress family, vendors, subs, and clients.", C.green],
      ["PTO", "A weekend with Colleen and Indra, at the cost of Bonus.", C.purple],
    ];
    // Hung off the measured body rather than a fixed y: the copy wraps
    // differently depending on which font actually resolved.
    const rowTop = Math.max(238, bodyText.y + bodyText.height + 16);
    modes.forEach(([label, desc, color], i) => {
      const y = rowTop + i * 30;
      const rg = this.add.graphics();
      rg.fillStyle(color, 0.14);
      rg.fillRect(52, y - 11, 536, 24);
      rg.fillStyle(color, 1);
      rg.fillRect(52, y - 11, 3, 24);
      this.add.text(66, y, label, TS.title(15, CS.paper)).setOrigin(0, 0.5);
      this.add.text(200, y + 1, desc, TS.readout(CS.steelPale, 11)).setOrigin(0, 0.5);
    });

    this.add
      .text(320, rowTop + 124, "Work the floor. Maximize Bonus Potential. Make Executive.", TS.readout(CS.paper, 12))
      .setOrigin(0.5);

    UI.prompt(this, 320, rowTop + 156, "PRESS ANY KEY TO START");
    this.cameras.main.fadeIn(220, 0, 0, 0);

    const advance = () => {
      MUSIC.stop();
      this.scene.start("BootScene");
    };
    this.input.keyboard.once("keydown", advance);
    this.input.once("pointerdown", advance);
  }
}
