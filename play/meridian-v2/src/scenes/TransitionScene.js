// Brief message screen shown between the office and another mode (e.g.
// "Travelling to Site..."). Purely cosmetic — holds for a moment, then hands
// off to the real destination scene. No game state is touched here.
//
// V2 dresses it as a transmittal slip: the drawing-sheet frame, a progress
// line that actually fills for the hold duration, and a stamp, so a load
// screen looks like part of the same document set as everything else.

class TransitionScene extends Phaser.Scene {
  constructor() {
    super("TransitionScene");
  }

  init(data) {
    this.message = data.message || "Loading...";
    this.nextScene = data.nextScene;
    this.nextPayload = data.nextPayload || {};
    this.holdMs = data.holdMs || 900;
  }

  create() {
    // Ambient mode sound (see audio.js) is scheduled with raw setTimeout, not
    // Phaser's scene-bound timers, so it keeps running across a scene switch
    // unless stopped explicitly — every non-ambient scene stops it;
    // Office/SiteVisit/VisitorScene restart their own on the other side.
    AMBIENT.stop();

    this.cameras.main.setBackgroundColor("#0f1318");

    const g = this.add.graphics();
    g.lineStyle(1, C.steelLt, 0.1);
    for (let x = 0; x <= 640; x += 24) g.lineBetween(x, 0, x, 480);
    for (let y = 0; y <= 480; y += 24) g.lineBetween(0, y, 640, y);

    UI.panel(this, 90, 176, 460, 128, {
      title: "TRANSMITTAL",
      stamp: "IN TRANSIT",
      accent: C.steel,
      titleColor: CS.steelLt,
    });

    this.add.text(320, 232, this.message, TS.title(20, CS.paper)).setOrigin(0.5);

    const bar = UI.bar(this, 130, 268, 380, 8, C.steelLt, { border: C.steelDk });
    bar.setValue(0);
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: this.holdMs,
      onUpdate: (tw) => bar.redraw(tw.getValue()),
    });

    this.cameras.main.fadeIn(160, 0, 0, 0);
    this.time.delayedCall(this.holdMs, () => {
      this.cameras.main.fadeOut(140, 0, 0, 0);
      this.time.delayedCall(150, () => this.scene.start(this.nextScene, this.nextPayload));
    });
  }
}
