/* =============================================================================
   src/art/ui.js — the corporate-RPG UI kit
   -----------------------------------------------------------------------------
   One panel grammar for the whole game, lifted from engineering drawings:
   square corners, a hairline accent border, "+" registration marks at the
   corners, and an optional title-block strip across the top. Every menu,
   dialogue box, HUD and battle panel is built from these so the interface
   reads as one system instead of eight different rectangles.
   ========================================================================== */

const UI = {
  // A framed panel. Returns a Container (x/y are the panel's top-left).
  panel(scene, x, y, w, h, opts = {}) {
    const accent = opts.accent === undefined ? C.steel : opts.accent;
    const alpha = opts.alpha === undefined ? 0.94 : opts.alpha;
    const c = scene.add.container(x, y);
    const g = scene.add.graphics();

    g.fillStyle(opts.fill === undefined ? C.panel : opts.fill, alpha);
    g.fillRect(0, 0, w, h);
    // inner plate — a hair lighter, so the panel has a surface
    g.fillStyle(0xffffff, 0.03);
    g.fillRect(2, 2, w - 4, h - 4);
    g.lineStyle(1, accent, 0.9);
    g.strokeRect(0.5, 0.5, w - 1, h - 1);
    g.lineStyle(1, accent, 0.25);
    g.strokeRect(3.5, 3.5, w - 7, h - 7);

    // registration marks
    const m = 6;
    g.lineStyle(1, accent, 0.95);
    [
      [0, 0],
      [w, 0],
      [0, h],
      [w, h],
    ].forEach(([cx, cy]) => {
      g.lineBetween(cx - m, cy, cx + m, cy);
      g.lineBetween(cx, cy - m, cx, cy + m);
    });
    c.add(g);

    // `title: ""` is deliberate, not a missing value: the dialogue boxes want
    // the title bar built up front and filled in per line with whoever is
    // speaking. Testing truthiness here silently dropped every speaker name.
    if (opts.title !== undefined) {
      g.fillStyle(accent, 0.16);
      g.fillRect(1, 1, w - 2, 18);
      g.lineStyle(1, accent, 0.5);
      g.lineBetween(1, 19, w - 1, 19);
      const t = scene.add
        .text(10, 10, opts.title, {
          fontFamily: FONT_HEAD,
          fontSize: "14px",
          color: opts.titleColor || CS.paper,
        })
        .setOrigin(0, 0.5);
      c.add(t);
      if (opts.stamp) {
        const s = scene.add
          .text(w - 10, 10, opts.stamp, { fontFamily: FONT_BODY, fontSize: "10px", color: CS.steelPale })
          .setOrigin(1, 0.5);
        c.add(s);
      }
      c.titleText = t;
    }
    c.panelWidth = w;
    c.panelHeight = h;
    return c;
  },

  // Segmented gauge — reads like an instrument, not a web progress bar.
  bar(scene, x, y, w, h, color, opts = {}) {
    const g = scene.add.graphics();
    const obj = { g, value: 1, w, h, x, y, color };
    obj.redraw = function (frac) {
      obj.value = Phaser.Math.Clamp(frac, 0, 1);
      g.clear();
      g.fillStyle(C.ink, 0.85);
      g.fillRect(x, y, w, h);
      g.fillStyle(obj.color, 1);
      g.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * obj.value), h - 2);
      // tick marks every 1/5th
      g.lineStyle(1, C.ink, 0.55);
      for (let i = 1; i < 5; i++) g.lineBetween(x + (w / 5) * i, y + 1, x + (w / 5) * i, y + h - 1);
      g.lineStyle(1, opts.border === undefined ? C.steelDk : opts.border, 0.9);
      g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    };
    obj.setValue = function (frac, animate) {
      if (!animate) return obj.redraw(frac);
      const from = obj.value;
      scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 260,
        ease: "Quad.easeOut",
        onUpdate: (tw) => obj.redraw(from + (frac - from) * tw.getValue()),
      });
    };
    obj.setColor = function (col) {
      obj.color = col;
      obj.redraw(obj.value);
    };
    obj.redraw(1);
    return obj;
  },

  // "[SPACE]" style affordance, pulsing so it reads as interactive.
  prompt(scene, x, y, label) {
    const t = scene.add
      .text(x, y, label, { fontFamily: FONT_HEAD, fontSize: "13px", color: CS.paper })
      .setOrigin(0.5);
    const g = scene.add.graphics();
    const w = t.width + 16;
    const h = 20;
    g.fillStyle(C.steel, 0.22);
    g.fillRect(x - w / 2, y - h / 2, w, h);
    g.lineStyle(1, C.steel, 0.9);
    g.strokeRect(x - w / 2 + 0.5, y - h / 2 + 0.5, w - 1, h - 1);
    const c = scene.add.container(0, 0, [g, t]);
    scene.tweens.add({ targets: c, alpha: { from: 1, to: 0.35 }, duration: 650, yoyo: true, repeat: -1 });
    return c;
  },

  // Small caption used over world objects (NPC names, room labels).
  worldLabel(scene, x, y, text, color) {
    return scene.add
      .text(x, y, text, {
        fontFamily: FONT_HEAD,
        fontSize: "13px",
        color: color || CS.steelPale,
        align: "center",
        stroke: "#0b0d10",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(9000);
  },

  // Room sign: a drawing-style title block hung over the room.
  roomSign(scene, x, y, text, accent) {
    const label = scene.add
      .text(0, 0, text, { fontFamily: FONT_HEAD, fontSize: "13px", color: CS.paper, align: "center" })
      .setOrigin(0.5);
    const w = Math.max(64, label.width + 18);
    const h = label.height + 8;
    const g = scene.add.graphics();
    g.fillStyle(C.ink, 0.72);
    g.fillRect(-w / 2, -h / 2, w, h);
    g.lineStyle(1, accent, 0.9);
    g.strokeRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1);
    g.fillStyle(accent, 0.9);
    g.fillRect(-w / 2, -h / 2, 3, h);
    return scene.add.container(x, y, [g, label]).setDepth(9000);
  },
};
