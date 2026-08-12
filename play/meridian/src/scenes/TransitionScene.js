// Brief message screen shown between the office and another mode (e.g.
// "Travelling to Site..."). Purely cosmetic — holds for a moment, then
// hands off to the real destination scene. No game state touched here.

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
    // Ambient mode sound (see audio.js) is scheduled with raw setTimeout,
    // not Phaser's scene-bound timers, so it keeps running across a scene
    // switch unless stopped explicitly — every non-ambient scene stops it;
    // Office/SiteVisit/VisitorScene restart their own on the other side.
    AMBIENT.stop();

    this.add.rectangle(320, 240, 640, 480, 0x14161c);
    this.add
      .rectangle(320, 240, 600, 420, 0x1c1e28)
      .setStrokeStyle(2, 0x4a90d9);

    const label = this.add
      .text(320, 240, this.message, {
        fontSize: "18px",
        fontFamily: "Courier New",
        color: "#ffe9a8",
        align: "center",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: label,
      alpha: 0.3,
      duration: 350,
      yoyo: true,
      repeat: -1,
    });

    this.time.delayedCall(this.holdMs, () => {
      this.scene.start(this.nextScene, this.nextPayload);
    });
  }
}
