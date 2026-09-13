/* =============================================================================
   src/art/fx.js — visual feedback
   -----------------------------------------------------------------------------
   Small, cheap, reusable: floating numbers, screen shake, flashes, particle
   bursts, impact rings, environmental loops (steam, blinking equipment,
   monitor flicker). Everything is a handful of tweened primitives — no
   emitters, no shaders — so it behaves identically on Canvas and on phones.
   ========================================================================== */

const FX = {
  float(scene, x, y, text, color, opts = {}) {
    const t = scene.add
      .text(x, y, text, {
        fontFamily: opts.mono ? FONT_BODY : FONT_HEAD,
        fontSize: (opts.size || 14) + "px",
        color: color || CS.paper,
        stroke: "#0b0d10",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(20000);
    if (opts.scrollFactor === 0) t.setScrollFactor(0);
    scene.tweens.add({
      targets: t,
      y: y - (opts.rise || 22),
      alpha: 0,
      duration: opts.duration || 850,
      ease: "Quad.easeOut",
      onComplete: () => t.destroy(),
    });
    scene.tweens.add({ targets: t, scale: { from: 0.6, to: 1 }, duration: 180, ease: "Back.easeOut" });
    return t;
  },

  shake(scene, duration = 160, intensity = 0.004) {
    scene.cameras.main.shake(duration, intensity);
  },

  flash(scene, color = 0xffffff, alpha = 0.35, duration = 220) {
    const cam = scene.cameras.main;
    const r = scene.add
      .rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, color, alpha)
      .setScrollFactor(0)
      .setDepth(30000);
    scene.tweens.add({ targets: r, alpha: 0, duration, onComplete: () => r.destroy() });
  },

  // Confetti-free particle burst: tiny squares thrown outward with gravity.
  burst(scene, x, y, color = C.steel, count = 10, opts = {}) {
    const spread = opts.spread || 60;
    for (let i = 0; i < count; i++) {
      const s = Phaser.Math.Between(2, 4);
      const p = scene.add.rectangle(x, y, s, s, color, 1).setDepth(20000);
      if (opts.scrollFactor === 0) p.setScrollFactor(0);
      const ang = Phaser.Math.DegToRad(Phaser.Math.Between(0, 360));
      const dist = Phaser.Math.Between(spread * 0.4, spread);
      scene.tweens.add({
        targets: p,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist + (opts.gravity === false ? 0 : 14),
        alpha: 0,
        angle: Phaser.Math.Between(-180, 180),
        duration: Phaser.Math.Between(320, 620),
        ease: "Quad.easeOut",
        onComplete: () => p.destroy(),
      });
    }
  },

  ring(scene, x, y, color = C.paper, opts = {}) {
    const g = scene.add.graphics().setDepth(19000);
    if (opts.scrollFactor === 0) g.setScrollFactor(0);
    const state = { r: opts.from || 4, a: 0.9 };
    scene.tweens.add({
      targets: state,
      r: opts.to || 40,
      a: 0,
      duration: opts.duration || 380,
      ease: "Quad.easeOut",
      onUpdate: () => {
        g.clear();
        g.lineStyle(2, color, state.a);
        g.strokeCircle(x, y, state.r);
      },
      onComplete: () => g.destroy(),
    });
  },

  pop(scene, target, to = 1.14, duration = 180) {
    if (!target) return;
    scene.tweens.add({ targets: target, scale: { from: to, to: target.scale || 1 }, duration, ease: "Quad.easeOut" });
  },

  // Full-width announcement (level up, promotion, checkpoint cleared).
  banner(scene, text, opts = {}) {
    const cam = scene.cameras.main;
    const cx = cam.width / 2;
    const cy = opts.y || cam.height / 2 - 40;
    const accent = opts.accent === undefined ? C.steel : opts.accent;
    const label = scene.add
      .text(cx, cy, text, { fontFamily: FONT_HEAD, fontSize: (opts.size || 26) + "px", color: opts.color || CS.paper, align: "center" })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30001);
    const w = label.width + 48;
    const g = scene.add.graphics().setScrollFactor(0).setDepth(30000);
    g.fillStyle(C.ink, 0.9);
    g.fillRect(cx - w / 2, cy - 22, w, 44);
    g.lineStyle(1, accent, 1);
    g.strokeRect(cx - w / 2 + 0.5, cy - 21.5, w - 1, 43);
    g.fillStyle(accent, 1);
    g.fillRect(cx - w / 2, cy - 22, w, 2);
    g.fillRect(cx - w / 2, cy + 20, w, 2);
    const grp = [g, label];
    grp.forEach((o) => (o.alpha = 0));
    scene.tweens.add({ targets: grp, alpha: 1, duration: 160 });
    scene.tweens.add({ targets: label, scale: { from: 1.25, to: 1 }, duration: 260, ease: "Back.easeOut" });
    scene.time.delayedCall(opts.hold || 1300, () => {
      scene.tweens.add({ targets: grp, alpha: 0, duration: 260, onComplete: () => grp.forEach((o) => o.destroy()) });
    });
    this.burst(scene, cx, cy, accent, 16, { scrollFactor: 0, spread: 90 });
  },

  /* --- ambient environment loops ------------------------------------------ */

  // Blinking equipment light (printers, plotters, elevator call buttons).
  blink(scene, x, y, color = C.green, opts = {}) {
    const d = scene.add.rectangle(x, y, opts.size || 2, opts.size || 2, color, 1).setDepth(opts.depth || y);
    scene.tweens.add({
      targets: d,
      alpha: { from: 1, to: 0.1 },
      duration: opts.duration || Phaser.Math.Between(600, 1400),
      delay: Phaser.Math.Between(0, 900),
      yoyo: true,
      repeat: -1,
    });
    return d;
  },

  // Coffee/kettle steam: two puffs rising and fading on a loop.
  steam(scene, x, y, opts = {}) {
    const puffs = [];
    for (let i = 0; i < 2; i++) {
      const p = scene.add.rectangle(x, y, 3, 3, 0xffffff, 0.32).setDepth(opts.depth || y + 1);
      puffs.push(p);
      scene.tweens.add({
        targets: p,
        y: y - 14,
        x: x + (i ? 3 : -3),
        alpha: 0,
        scale: 1.6,
        duration: 1800,
        delay: i * 900,
        repeat: -1,
        repeatDelay: 400,
        onRepeat: () => {
          p.setPosition(x, y);
          p.setScale(1);
          p.alpha = 0.32;
        },
      });
    }
    return puffs;
  },

  // Monitor glow: a soft rectangle over a screen that breathes.
  monitorGlow(scene, x, y, w, h, opts = {}) {
    const r = scene.add.rectangle(x, y, w, h, C.screenGlow, 0.12).setDepth(opts.depth || y);
    scene.tweens.add({
      targets: r,
      alpha: { from: 0.06, to: 0.2 },
      duration: Phaser.Math.Between(1400, 2600),
      yoyo: true,
      repeat: -1,
    });
    return r;
  },

  // Warning beacon (site visits): amber sweep.
  beacon(scene, x, y, color = C.amber) {
    const g = scene.add.circle(x, y, 5, color, 0.5).setDepth(y);
    scene.tweens.add({ targets: g, scale: { from: 0.5, to: 1.6 }, alpha: { from: 0.55, to: 0 }, duration: 900, repeat: -1 });
    return g;
  },

  // Dust / haze drifting across a site.
  drift(scene, bounds, color = 0xd8cdb8, count = 8) {
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(bounds.x, bounds.x + bounds.w);
      const y = Phaser.Math.Between(bounds.y, bounds.y + bounds.h);
      const s = Phaser.Math.Between(6, 18);
      const p = scene.add.rectangle(x, y, s, Math.max(2, s / 3), color, 0.08).setDepth(15000);
      scene.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(80, 200),
        alpha: { from: 0.1, to: 0 },
        duration: Phaser.Math.Between(5000, 9000),
        repeat: -1,
        onRepeat: () => {
          p.x = bounds.x - 20;
          p.y = Phaser.Math.Between(bounds.y, bounds.y + bounds.h);
          p.alpha = 0.1;
        },
      });
    }
  },
};
