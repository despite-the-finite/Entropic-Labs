/* =============================================================================
   src/art/chars.js — runtime character animation
   -----------------------------------------------------------------------------
   The character atlas ships 11 frames per character:
     0-2 down (idle, step A, step B)   3-5 up   6-8 left   9-10 seated typing
   Right is left, flipped. This module registers one animation set per
   character id found in the atlas and gives scenes a single play() call.
   ========================================================================== */

const CHARART = {
  KEY: "chars",

  ids(scene) {
    if (this._ids) return this._ids;
    const names = scene.textures.get(this.KEY).getFrameNames();
    const set = new Set();
    names.forEach((n) => {
      const m = /^(.*)_(\d+)$/.exec(n);
      if (m) set.add(m[1]);
    });
    this._ids = [...set];
    return this._ids;
  },

  has(scene, id) {
    return scene.textures.get(this.KEY).has(`${id}_0`);
  },

  frame(id) {
    return `${id}_0`;
  },

  // Called once, from BootScene.
  registerAnims(scene) {
    this.ids(scene).forEach((id) => {
      const mk = (suffix, frames, rate, repeat) => {
        const key = `${id}_${suffix}`;
        if (scene.anims.exists(key)) return;
        scene.anims.create({
          key,
          frames: frames.map((f) => ({ key: this.KEY, frame: `${id}_${f}` })),
          frameRate: rate,
          repeat: repeat === undefined ? -1 : repeat,
        });
      };
      mk("idle_down", [0], 1);
      mk("idle_up", [3], 1);
      mk("idle_side", [6], 1);
      mk("walk_down", [1, 0, 2, 0], 8);
      mk("walk_up", [4, 3, 5, 3], 8);
      mk("walk_side", [7, 6, 8, 6], 8);
      mk("type", [9, 10], 3);
    });
  },

  // dir: "down" | "up" | "left" | "right"
  play(sprite, id, dir, moving) {
    if (!sprite || !sprite.anims) return;
    const side = dir === "left" || dir === "right";
    sprite.setFlipX(dir === "right");
    const key = `${id}_${moving ? "walk" : "idle"}_${side ? "side" : dir}`;
    if (!sprite.anims.animationManager.exists(key)) return;
    const cur = sprite.anims.currentAnim;
    if (!cur || cur.key !== key) sprite.anims.play(key, true);
  },

  type(sprite, id) {
    const key = `${id}_type`;
    if (sprite.anims.animationManager.exists(key)) sprite.anims.play(key, true);
  },

  // Facing from a velocity/delta pair — used for the player and wanderers.
  dirFromVec(vx, vy, fallback = "down") {
    if (Math.abs(vx) < 1 && Math.abs(vy) < 1) return fallback;
    if (Math.abs(vx) >= Math.abs(vy)) return vx > 0 ? "right" : "left";
    return vy > 0 ? "down" : "up";
  },
};
