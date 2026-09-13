// Registers the baked art atlases, behind a drafting-sheet progress bar, then
// hands off to TitleScene so the title card can use the same art as the game.
//
// The atlases ship as data URIs compiled into src/art/atlas_*.js — no image
// files, no server, no CORS, so the game still runs from a bare file:// page.
// Phaser's file loader refuses data URIs outright, so the images are decoded
// here with plain Image objects and handed to the texture manager directly
// via addAtlas(), which is the same thing load.atlas() would have done.

class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  create() {
    const W = 640;
    const H = 480;
    this.cameras.main.setBackgroundColor("#0f2233");

    const g = this.add.graphics();
    g.lineStyle(1, C.steelLt, 0.22);
    for (let x = 0; x <= W; x += 20) g.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 20) g.lineBetween(0, y, W, y);
    g.lineStyle(1, C.steelLt, 0.5);
    g.strokeRect(14, 14, W - 28, H - 28);
    // drawing-sheet title block, bottom right
    g.lineStyle(1, C.steelLt, 0.5);
    g.strokeRect(W - 214, H - 84, 200, 70);
    g.lineBetween(W - 214, H - 60, W - 14, H - 60);
    g.lineBetween(W - 114, H - 60, W - 114, H - 14);
    this.add.text(W - 206, H - 76, "DONNELL & McBURNS", TS.readout(CS.steelPale, 10));
    this.add.text(W - 206, H - 52, "SHEET", TS.readout(CS.steelPale, 9));
    this.add.text(W - 206, H - 38, "A-001", TS.readout(CS.paper, 12));
    this.add.text(W - 106, H - 52, "REV", TS.readout(CS.steelPale, 9));
    this.add.text(W - 106, H - 38, "2", TS.readout(CS.gold, 12));

    this.add.text(320, 196, "DONNELL AND McBURNS", TS.title(28, CS.paper)).setOrigin(0.5);
    this.add.text(320, 224, "AN EPC EPIC", TS.title(14, CS.steelPale)).setOrigin(0.5);

    this.bar = UI.bar(this, 210, 262, 220, 10, C.steelLt, { border: C.steelLt });
    this.bar.setValue(0);
    this.pct = this.add.text(320, 284, "LOADING ART 0%", TS.readout(CS.steelPale, 11)).setOrigin(0.5);

    this.loadAtlases();
  }

  loadAtlases() {
    const sets = [
      ["chars", ART_CHARS_PNG, ART_CHARS_JSON],
      ["world", ART_WORLD_PNG, ART_WORLD_JSON],
      ["enemies", ART_ENEMIES_PNG, ART_ENEMIES_JSON],
      ["site", ART_SITE_PNG, ART_SITE_JSON],
    ];
    let done = 0;
    const step = () => {
      done++;
      this.bar.setValue(done / sets.length);
      this.pct.setText("LOADING ART " + Math.round((done / sets.length) * 100) + "%");
      if (done === sets.length) {
        this.time.delayedCall(120, () => {
          this.cameras.main.fadeOut(220, 0, 0, 0);
          this.time.delayedCall(240, () => this.scene.start("TitleScene"));
        });
      }
    };

    sets.forEach(([key, uri, json]) => {
      if (this.textures.exists(key)) {
        step();
        return;
      }
      const img = new Image();
      img.onload = () => {
        this.textures.addAtlas(key, img, json);
        step();
      };
      img.onerror = () => {
        this.pct.setText("ART FAILED: " + key);
        step();
      };
      img.src = uri;
    });
  }
}
