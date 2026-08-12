// First scene shown. Title card over a procedurally drawn construction
// blueprint — "Hit any key to play" advances to IntroScene. No game state
// is touched here. Everything is Graphics/text, same as BootScene's art,
// so there's no image asset to ship.

class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create() {
    AMBIENT.stop(); // in case we landed here via a Game Over restart mid-ambience
    this.drawBlueprint();
    this.drawTitleText();

    // Browsers block audio before a user gesture — this keydown/pointerdown
    // is the first one, so it's also where the beat starts.
    const advance = () => {
      MUSIC.start();
      this.scene.start("IntroScene");
    };
    this.input.keyboard.once("keydown", advance);
    this.input.once("pointerdown", advance);
  }

  drawBlueprint() {
    const W = 640;
    const H = 480;
    const INK = 0xbfe3ff;
    const g = this.add.graphics();

    // Cyanotype-blue backdrop
    g.fillStyle(0x0f3a5c, 1);
    g.fillRect(0, 0, W, H);

    // Faint graph-paper grid
    g.lineStyle(1, INK, 0.08);
    for (let x = 0; x <= W; x += 20) g.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 20) g.lineBetween(0, y, W, y);

    // Drafting sheet border with corner ticks
    g.lineStyle(1, INK, 0.5);
    g.strokeRect(14, 14, W - 28, H - 28);
    const tick = 8;
    [
      [14, 14],
      [W - 14, 14],
      [14, H - 14],
      [W - 14, H - 14],
    ].forEach(([cx, cy]) => {
      g.lineBetween(cx - tick, cy, cx + tick, cy);
      g.lineBetween(cx, cy - tick, cx, cy + tick);
    });

    // Compass rose, top-left
    const compassX = 50;
    const compassY = 55;
    const r = 16;
    g.lineStyle(1, INK, 0.55);
    g.strokeCircle(compassX, compassY, r);
    g.lineBetween(compassX, compassY - r - 6, compassX, compassY + r);
    g.lineBetween(compassX - 4, compassY - r + 2, compassX, compassY - r - 6);
    g.lineBetween(compassX + 4, compassY - r + 2, compassX, compassY - r - 6);
    this.add
      .text(compassX, compassY + r + 9, "N", {
        fontSize: "11px",
        fontFamily: "Courier New",
        color: "#bfe3ff",
      })
      .setOrigin(0.5);

    // Process plant, lower-left — two storage tanks, a pipe rack tying
    // them together, and a flare stack, rather than an office high-rise.
    const bx = 70;
    const groundYPlant = 450;

    const drawTank = (tx, ty, tw, th) => {
      g.lineStyle(1.5, INK, 0.6);
      g.strokeRect(tx, ty, tw, th);
      g.lineBetween(tx, ty, tx + tw / 2, ty - 7);
      g.lineBetween(tx + tw / 2, ty - 7, tx + tw, ty);
      g.lineStyle(1, INK, 0.4);
      g.lineBetween(tx, ty + th * 0.33, tx + tw, ty + th * 0.33);
      g.lineBetween(tx, ty + th * 0.66, tx + tw, ty + th * 0.66);
    };

    const tankA = { x: bx, y: 260, w: 34, h: groundYPlant - 260 };
    const tankB = { x: bx + 48, y: 315, w: 28, h: groundYPlant - 315 };
    drawTank(tankA.x, tankA.y, tankA.w, tankA.h);
    drawTank(tankB.x, tankB.y, tankB.w, tankB.h);

    // Pipe rack connecting the two tanks
    const rackY = groundYPlant - 15;
    g.lineStyle(1, INK, 0.45);
    g.lineBetween(tankA.x + tankA.w, rackY, tankB.x, rackY);
    g.lineBetween(tankA.x + tankA.w, rackY - 5, tankA.x + tankA.w, rackY + 5);
    g.lineBetween(tankB.x, rackY - 5, tankB.x, rackY + 5);

    // Flare stack
    const flareX = tankB.x + tankB.w + 22;
    g.lineStyle(1.5, INK, 0.6);
    g.lineBetween(flareX, groundYPlant, flareX, 185);
    g.lineStyle(1, INK, 0.5);
    g.lineBetween(flareX, 185, flareX - 6, 173);
    g.lineBetween(flareX, 185, flareX + 5, 171);
    g.lineBetween(flareX, 185, flareX - 1, 165);

    // Construction crane, lower-right
    const cxBase = 545;
    const groundY = 450;
    const mastTopY = 175;
    g.lineStyle(1.5, INK, 0.6);
    g.lineBetween(cxBase, groundY, cxBase, mastTopY);
    g.lineBetween(cxBase - 18, groundY, cxBase + 18, groundY);
    g.lineBetween(cxBase, mastTopY, cxBase + 75, mastTopY + 10);
    g.lineBetween(cxBase, mastTopY, cxBase - 35, mastTopY + 8);
    g.strokeRect(cxBase - 42, mastTopY + 6, 14, 10);
    g.lineStyle(1, INK, 0.4);
    g.lineBetween(cxBase, mastTopY + 25, cxBase + 40, mastTopY + 14);
    g.lineBetween(cxBase, mastTopY + 25, cxBase - 20, mastTopY + 12);
    g.lineBetween(cxBase + 55, mastTopY + 9, cxBase + 55, mastTopY + 70);
    g.strokeCircle(cxBase + 55, mastTopY + 74, 3);

    // Dimension line along the bottom, tying the two structures together
    const dimY = 458;
    const dimX1 = bx;
    const dimX2 = cxBase + 20;
    g.lineStyle(1, INK, 0.5);
    g.lineBetween(dimX1, dimY, dimX2, dimY);
    g.lineBetween(dimX1, dimY - 5, dimX1, dimY + 5);
    g.lineBetween(dimX2, dimY - 5, dimX2, dimY + 5);
    g.lineBetween(dimX1, dimY, dimX1 + 7, dimY - 3);
    g.lineBetween(dimX1, dimY, dimX1 + 7, dimY + 3);
    g.lineBetween(dimX2, dimY, dimX2 - 7, dimY - 3);
    g.lineBetween(dimX2, dimY, dimX2 - 7, dimY + 3);
    this.add
      .text((dimX1 + dimX2) / 2, dimY, "PROCESS AREA — N.T.S.", {
        fontSize: "10px",
        fontFamily: "Courier New",
        color: "#bfe3ff",
        backgroundColor: "#0f3a5c",
        padding: { x: 4 },
      })
      .setOrigin(0.5);
  }

  drawTitleText() {
    this.add
      .text(320, 165, "DONNELL AND McBURNS", {
        fontSize: "28px",
        fontFamily: "Courier New",
        color: "#ffe9a8",
        align: "center",
      })
      .setOrigin(0.5);

    this.add
      .text(320, 205, "An EPC Epic", {
        fontSize: "16px",
        fontFamily: "Courier New",
        color: "#aeb8e0",
        align: "center",
        fontStyle: "italic",
      })
      .setOrigin(0.5);

    this.add
      .rectangle(320, 240, 240, 2, 0x4a90d9)
      .setOrigin(0.5);

    const prompt = this.add
      .text(320, 340, "Hit any key to play", {
        fontSize: "14px",
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
  }
}
