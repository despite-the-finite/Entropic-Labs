// First scene shown. Title card over a drafting sheet of the plant you spend
// the game arguing about — "Hit any key to play" advances to IntroScene. No
// game state is touched here.
//
// V2 keeps V1's cyanotype idea (it was already the right joke) and rebuilds it
// on the shared design language: Barlow Condensed display type, a real
// drawing title block, and a few small things that move so the sheet doesn't
// read as a still image.

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
    const INK = C.steelPale;
    const g = this.add.graphics();

    // Cyanotype-blue backdrop
    g.fillStyle(0x102b40, 1);
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
      .text(compassX, compassY + r + 9, "N", TS.readout(CS.steelPale, 11))
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

    // The flare burns and the crane hook drifts — two small moving things so
    // the sheet reads as a live drawing rather than a static background.
    const flame = this.add.triangle(flareX, 160, 0, 12, 5, 0, 10, 12, 0xf2c53d, 0.85).setOrigin(0.5, 1);
    this.tweens.add({
      targets: flame,
      scaleY: { from: 0.7, to: 1.25 },
      scaleX: { from: 0.9, to: 1.1 },
      alpha: { from: 0.6, to: 0.95 },
      duration: 480,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    const hook = this.add.circle(cxBase + 55, mastTopY + 74, 3, INK, 0).setStrokeStyle(1, INK, 0.8);
    const hookLine = this.add.graphics();
    this.tweens.add({
      targets: hook,
      x: cxBase + 44,
      duration: 3400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      onUpdate: () => {
        hookLine.clear();
        hookLine.lineStyle(1, INK, 0.45);
        hookLine.lineBetween(hook.x, mastTopY + 9, hook.x, hook.y - 3);
      },
    });
    FX.blink(this, cxBase, mastTopY - 4, C.red, { size: 3, depth: 50, duration: 900 });

    // Drawing title block, bottom right — the frame every other panel in the
    // game borrows its grammar from.
    g.lineStyle(1, INK, 0.55);
    g.strokeRect(W - 214, H - 92, 200, 64);
    g.lineBetween(W - 214, H - 70, W - 14, H - 70);
    g.lineBetween(W - 114, H - 70, W - 114, H - 28);
    this.add.text(W - 206, H - 86, "DONNELL & McBURNS", TS.readout(CS.steelPale, 10));
    this.add.text(W - 206, H - 64, "SHEET", TS.readout(CS.steelPale, 9));
    this.add.text(W - 206, H - 50, "T-001", TS.readout(CS.paper, 12));
    this.add.text(W - 106, H - 64, "REV", TS.readout(CS.steelPale, 9));
    this.add.text(W - 106, H - 50, "2", TS.readout(CS.gold, 12));

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
        fontFamily: FONT_BODY,
        fontSize: "10px",
        color: CS.steelPale,
        backgroundColor: "#102b40",
        padding: { x: 4 },
      })
      .setOrigin(0.5);
  }

  drawTitleText() {
    // A plate behind the wordmark so the title never fights the linework.
    const plate = this.add.graphics();
    plate.fillStyle(0x0b1c2a, 0.82);
    plate.fillRect(96, 132, 448, 116);
    plate.lineStyle(1, C.steelLt, 0.7);
    plate.strokeRect(96.5, 132.5, 447, 115);
    [
      [96, 132],
      [544, 132],
      [96, 248],
      [544, 248],
    ].forEach(([cx, cy]) => {
      plate.lineBetween(cx - 7, cy, cx + 7, cy);
      plate.lineBetween(cx, cy - 7, cx, cy + 7);
    });

    const title = this.add.text(320, 172, "DONNELL AND McBURNS", TS.title(44, CS.paper)).setOrigin(0.5);
    this.add.text(320, 210, "AN EPC EPIC", TS.title(17, CS.gold)).setOrigin(0.5);
    this.add.rectangle(320, 232, 260, 1, C.steelLt).setOrigin(0.5).setAlpha(0.8);
    this.tweens.add({ targets: title, scale: { from: 0.97, to: 1 }, duration: 520, ease: "Back.easeOut" });

    const prompt = UI.prompt(this, 320, 330, "PRESS ANY KEY TO CLOCK IN");
    this.add
      .text(320, 362, "ARROWS/WASD MOVE  ·  SPACE INTERACT  ·  H CUBICLE", TS.readout(CS.steelPale, 10))
      .setOrigin(0.5);
    return prompt;
  }
}
