// Generates all placeholder art procedurally so the game needs zero external
// image files (keeps it runnable via plain file:// with no local server).
// Swap generateXTexture() bodies for real sprite loads later without
// touching any other scene.

class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    const T = FLOORS.GFS.tileSize;

    this.generateFloorTexture(T);
    this.generateWallTexture(T);
    // Per-floor palettes so CDB and EXEC read as distinct places, not just
    // a label — see FLOORS[x].theme in floorplan.js.
    this.generateFloorTexture(T, "cdb", 0xc7cdd6, 0xb3bac4);
    this.generateWallTexture(T, "cdb", 0xc7cdd6, 0x2e3a4a);
    this.generateFloorTexture(T, "exec", 0xb89968, 0xa4855a);
    this.generateWallTexture(T, "exec", 0xb89968, 0x3a2418);
    this.generateDeskTexture(T);
    this.generatePlantTexture(T);
    this.generateBattleObjectTexture(T);
    this.generateBreakRoomTexture(T);
    this.generateLandmarkTexture(T);
    this.generateStairsTexture(T);
    this.generateCubicleTexture(T);
    this.generateWaterCoolerTexture(T);
    this.generateWallArtTexture(T);
    this.generateActorTexture("player", T, 0x4a90d9);
    this.generateActorTexture("npc_default", T, 0x8a6d3b);
    Object.keys(COWORKERS).forEach((id) => {
      const cw = COWORKERS[id];
      this.generateActorTexture(`npc_${id}`, T, cw.portraitColor || 0x8a6d3b, "business", cw.hairColor);
    });

    // Site visit textures
    this.generateGravelTexture(T);
    this.generateFenceTexture(T);
    this.generateStructureTexture(T);
    this.generateEquipmentTexture(T);
    this.generateHazardTexture(T);
    this.generatePortalTexture(T);
    Object.keys(SITE_VISITS).forEach((siteKey) => {
      (SITE_VISITS[siteKey].checkpoints || []).forEach((cp) => {
        this.generateActorTexture(
          `checkpoint_${siteKey}_${cp.id}`,
          T,
          cp.portraitColor || 0x8a6d3b
        );
      });
      // The client itself — SiteVisitScene renders this at clientTrailer's
      // interactPoint so there's something to actually walk up to, instead
      // of an invisible trigger tile.
      const ct = SITE_VISITS[siteKey].clientTrailer;
      const client = ct && CLIENTS.find((c) => c.id === ct.clientId);
      if (client) {
        this.generateActorTexture(`client_${siteKey}`, T, client.color || 0xb5942e);
      }
    });

    // Visitor Day textures
    this.generateFoodTruckTexture(T);
    this.generateFlowerBedTexture(T);
    VISITORS.forEach((v) => {
      this.generateActorTexture(`visitor_${v.id}`, T, v.portraitColor || 0x8a6d3b, "casual", v.hairColor);
    });

    this.scene.start("OfficeScene");
  }

  // theme "" (default/GFS) writes to "tile_floor"; a theme name writes to
  // "tile_floor_<theme>" so each floor can look distinct (see
  // FLOORS[x].theme in floorplan.js and the matching lookup in OfficeScene).
  generateFloorTexture(T, theme = "", floorColor = 0xd4cdb8, lineColor = 0xc2bba6) {
    const key = theme ? `tile_floor_${theme}` : "tile_floor";
    const g = this.add.graphics();
    g.fillStyle(floorColor, 1);
    g.fillRect(0, 0, T, T);
    g.lineStyle(1, lineColor, 0.7);
    g.strokeRect(0, 0, T, T);
    g.generateTexture(key, T, T);
    g.destroy();
  }

  // Thin architectural wall lines on a floor-toned backdrop, rather than a
  // solid opaque block — reads like a floor-plan wall symbol even though
  // the whole tile is still solid for collision. Three orientations so a
  // run of wall tiles draws as one continuous line instead of a stack of
  // disconnected dashes: OfficeScene picks the variant per-tile based on
  // which neighbors are also walls (see wallTextureKey there).
  generateWallTexture(T, theme = "", floorColor = 0xd4cdb8, wallColor = 0x2a2d3a) {
    const suffix = theme ? `_${theme}` : "";
    const band = (isH, isV) => {
      const g = this.add.graphics();
      g.fillStyle(floorColor, 1);
      g.fillRect(0, 0, T, T);
      g.fillStyle(wallColor, 1);
      if (isH) g.fillRect(0, T * 0.4, T, T * 0.2);
      if (isV) g.fillRect(T * 0.4, 0, T * 0.2, T);
      g.lineStyle(1, this.darken(wallColor, 0.5), 0.6);
      if (isH) {
        g.lineBetween(0, T * 0.4, T, T * 0.4);
        g.lineBetween(0, T * 0.6, T, T * 0.6);
      }
      if (isV) {
        g.lineBetween(T * 0.4, 0, T * 0.4, T);
        g.lineBetween(T * 0.6, 0, T * 0.6, T);
      }
      return g;
    };
    let g = band(true, false);
    g.generateTexture(`tile_wall${suffix}_h`, T, T);
    g.destroy();
    g = band(false, true);
    g.generateTexture(`tile_wall${suffix}_v`, T, T);
    g.destroy();
    g = band(true, true);
    g.generateTexture(`tile_wall${suffix}_x`, T, T);
    g.destroy();
  }

  generateWaterCoolerTexture(T) {
    const g = this.add.graphics();
    g.fillStyle(0xd4cdb8, 1);
    g.fillRect(0, 0, T, T);
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(T / 2, T - 4, T * 0.5, 5);
    g.fillStyle(0x8fd0ff, 0.75);
    g.fillRoundedRect(T * 0.3, T * 0.15, T * 0.4, T * 0.4, 3);
    g.fillStyle(0xe8e8e8, 1);
    g.fillRect(T * 0.24, T * 0.5, T * 0.52, T * 0.4);
    g.fillStyle(0x2a2d3a, 1);
    g.fillRect(T * 0.32, T * 0.58, T * 0.1, T * 0.08);
    g.generateTexture("tile_watercooler", T, T);
    g.destroy();
  }

  generateWallArtTexture(T) {
    const g = this.add.graphics();
    g.fillStyle(0xd4cdb8, 1);
    g.fillRect(0, 0, T, T);
    g.fillStyle(0x6b4a2f, 1);
    g.fillRect(T * 0.14, T * 0.16, T * 0.72, T * 0.5);
    g.fillStyle(0xdff0ff, 1);
    g.fillRect(T * 0.2, T * 0.22, T * 0.6, T * 0.38);
    g.fillStyle(0x4a90d9, 0.6);
    g.fillTriangle(T * 0.22, T * 0.58, T * 0.45, T * 0.3, T * 0.6, T * 0.58);
    g.fillStyle(0x3f7a3f, 0.6);
    g.fillTriangle(T * 0.42, T * 0.58, T * 0.6, T * 0.36, T * 0.78, T * 0.58);
    g.generateTexture("tile_wallart", T, T);
    g.destroy();
  }

  generateDeskTexture(T) {
    const g = this.add.graphics();
    g.fillStyle(0xc9c2a6, 1);
    g.fillRect(0, 0, T, T);
    // desktop surface + a visible front edge for depth
    g.fillStyle(0x6b4a2f, 1);
    g.fillRect(2, 10, T - 4, T - 14);
    g.fillStyle(0x5a3d26, 1);
    g.fillRect(2, T - 6, T - 4, 3);
    // monitor: bezel, screen, small stand
    g.fillStyle(0x2a2d3a, 1);
    g.fillRect(6, 4, T - 12, 10);
    g.fillRect(T / 2 - 2, 2, 4, 3);
    g.fillStyle(0x4a90d9, 1);
    g.fillRect(8, 6, T - 16, 6);
    g.fillStyle(0x8fd0ff, 0.5);
    g.fillRect(8, 6, T - 16, 2);
    // keyboard
    g.fillStyle(0x3c3f4c, 1);
    g.fillRect(9, 16, T - 18, 4);
    g.fillStyle(0x555a6a, 1);
    for (let kx = 10; kx < T - 10; kx += 3) g.fillRect(kx, 17, 2, 2);
    // pen cup + mouse for a bit of clutter
    g.fillStyle(0x8a3a3a, 1);
    g.fillRect(T - 9, 12, 4, 6);
    g.fillStyle(0x2a2d3a, 1);
    g.fillRect(6, 21, 3, 4);
    g.generateTexture("tile_desk", T, T);
    g.destroy();
  }

  generatePlantTexture(T) {
    const g = this.add.graphics();
    g.fillStyle(0xc9c2a6, 1);
    g.fillRect(0, 0, T, T);
    g.fillStyle(0x6b4a2f, 1);
    g.fillRect(T / 2 - 6, T - 12, 12, 10);
    g.fillStyle(0x3f7a3f, 1);
    g.fillCircle(T / 2, T / 2 - 2, 11);
    g.fillStyle(0x4f9a4f, 1);
    g.fillCircle(T / 2 - 4, T / 2 - 6, 6);
    g.generateTexture("tile_plant", T, T);
    g.destroy();
  }

  // Battle objects — the thing you walk up to and hit SPACE on to start a
  // fight (a stack of red-flagged paperwork), placed inside every
  // conference room and every former "solid landmark" room.
  generateBattleObjectTexture(T) {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(T / 2, T - 5, T * 0.6, 5);
    g.fillStyle(0xd9d2b8, 1);
    g.fillRect(T * 0.2, T * 0.35, T * 0.6, T * 0.45);
    g.lineStyle(1, 0xa89968, 1);
    g.lineBetween(T * 0.2, T * 0.5, T * 0.8, T * 0.5);
    g.lineBetween(T * 0.2, T * 0.62, T * 0.8, T * 0.62);
    g.fillStyle(0xa63d3d, 1);
    g.fillTriangle(T * 0.62, T * 0.3, T * 0.78, T * 0.3, T * 0.7, T * 0.14);
    g.generateTexture("tile_battle_object", T, T);
    g.destroy();
  }

  generateBreakRoomTexture(T) {
    const g = this.add.graphics();
    g.fillStyle(0xd9c98a, 1);
    g.fillRect(0, 0, T, T);
    g.lineStyle(1, 0xc7b76e, 1);
    g.strokeRect(0, 0, T, T);
    g.fillStyle(0xe6daa8, 0.6);
    g.fillCircle(T / 2, T / 2, 3);
    g.generateTexture("tile_break", T, T);
    g.destroy();
  }

  generateLandmarkTexture(T) {
    const g = this.add.graphics();
    g.fillStyle(0x2e3550, 1);
    g.fillRect(0, 0, T, T);
    g.lineStyle(1, 0x4a5580, 1);
    g.strokeRect(1, 1, T - 2, T - 2);
    g.generateTexture("tile_landmark", T, T);
    g.destroy();
  }

  // The physical trigger placed inside a "STAIRS" landmark room (see
  // floorplan.js + OfficeScene.openStairsMenu) — ascending steps read
  // clearly as a staircase, unlike the old tile_portal (still used
  // elsewhere) whose two ground-level circles read as bus wheels.
  generateStairsTexture(T) {
    const g = this.add.graphics();
    g.fillStyle(0x2e3550, 1);
    g.fillRect(0, 0, T, T);
    g.lineStyle(1, 0x4a5580, 1);
    g.strokeRect(1, 1, T - 2, T - 2);
    const steps = 4;
    const stepW = (T - 8) / steps;
    for (let i = 0; i < steps; i++) {
      const stepH = 5 + i * 5;
      const sx = 4 + i * stepW;
      g.fillStyle(0x1c2338, 1);
      g.fillRect(sx + 1, T - 3 - stepH, stepW - 1, stepH + 2);
      g.fillStyle(0xaeb8e0, 1);
      g.fillRect(sx, T - 4 - stepH, stepW - 1, 4);
    }
    g.fillStyle(0xffe9a8, 1);
    g.fillTriangle(T - 8, T * 0.28, T - 3, T * 0.28, T - 5.5, T * 0.12);
    g.generateTexture("tile_stairs", T, T);
    g.destroy();
  }

  generateCubicleTexture(T) {
    // Same desk footprint as tile_desk, but with a pale "window" pane
    // instead of a monitor, so the player's home base reads differently
    // from generic desk pods at a glance.
    const g = this.add.graphics();
    g.fillStyle(0xc9c2a6, 1);
    g.fillRect(0, 0, T, T);
    g.fillStyle(0x6b4a2f, 1);
    g.fillRect(2, 10, T - 4, T - 14);
    g.fillStyle(0x5a3d26, 1);
    g.fillRect(2, T - 6, T - 4, 3);
    g.fillStyle(0x4a90d9, 1);
    g.fillRect(4, 2, T - 8, 10);
    g.fillStyle(0xdff0ff, 0.85);
    g.fillRect(6, 4, T - 12, 6);
    // a small photo frame and a plant, personalizing the cubicle
    g.fillStyle(0x8a6d3b, 1);
    g.fillRect(T - 10, 12, 6, 5);
    g.fillStyle(0xdff0ff, 0.7);
    g.fillRect(T - 9, 13, 4, 3);
    g.fillStyle(0x3f7a3f, 1);
    g.fillCircle(6, T - 8, 3);
    g.fillStyle(0x6b4a2f, 1);
    g.fillRect(5, T - 6, 2, 3);
    g.lineStyle(2, 0xffe9a8, 1);
    g.strokeRect(1, 1, T - 2, T - 2);
    g.generateTexture("tile_cubicle", T, T);
    g.destroy();
  }

  generateGravelTexture(T) {
    const g = this.add.graphics();
    g.fillStyle(0x8a8478, 1);
    g.fillRect(0, 0, T, T);
    g.fillStyle(0x76705f, 1);
    for (let i = 0; i < 10; i++) {
      const x = Phaser.Math.Between(2, T - 4);
      const y = Phaser.Math.Between(2, T - 4);
      g.fillRect(x, y, 2, 2);
    }
    g.generateTexture("tile_gravel", T, T);
    g.destroy();
  }

  generateFenceTexture(T) {
    const g = this.add.graphics();
    g.fillStyle(0x5a5245, 1);
    g.fillRect(0, 0, T, T);
    g.fillStyle(0xd97b2e, 1);
    g.fillRect(0, 4, T, 4);
    g.fillRect(0, T - 8, T, 4);
    g.generateTexture("tile_fence", T, T);
    g.destroy();
  }

  generateStructureTexture(T) {
    const g = this.add.graphics();
    g.fillStyle(0x6b6152, 1);
    g.fillRect(0, 0, T, T);
    g.lineStyle(2, 0x3c3830, 1);
    g.strokeRect(2, 2, T - 4, T - 4);
    g.lineBetween(0, 0, T, T);
    g.lineBetween(T, 0, 0, T);
    g.generateTexture("tile_structure", T, T);
    g.destroy();
  }

  generateEquipmentTexture(T) {
    const g = this.add.graphics();
    g.fillStyle(0x8a8478, 1);
    g.fillRect(0, 0, T, T);
    g.fillStyle(0xc27a1e, 1);
    g.fillRoundedRect(4, 6, T - 8, T - 14, 3);
    g.fillStyle(0x3c3830, 1);
    g.fillRect(4, T - 8, T - 8, 4);
    g.generateTexture("tile_equipment", T, T);
    g.destroy();
  }

  generateHazardTexture(T) {
    const g = this.add.graphics();
    g.fillStyle(0x1a1a1a, 1);
    g.fillRect(0, 0, T, T);
    g.fillStyle(0xe8a838, 1);
    for (let i = -T; i < T; i += 10) {
      g.fillRect(i, 0, 5, T);
    }
    g.generateTexture("tile_hazard", T, T);
    g.destroy();
  }

  generatePortalTexture(T) {
    const w = T * 1.2;
    const h = T;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(w / 2, h - 4, w * 0.8, 6);
    g.fillStyle(0xc27a1e, 1);
    g.fillRoundedRect(2, h * 0.35, w - 4, h * 0.5, 5);
    g.fillStyle(0xdff0ff, 0.8);
    g.fillRect(w * 0.15, h * 0.4, w * 0.3, h * 0.2);
    g.fillStyle(0x2a2d3a, 1);
    g.fillCircle(w * 0.25, h * 0.85, 5);
    g.fillCircle(w * 0.75, h * 0.85, 5);
    g.generateTexture("tile_portal", w, h);
    g.destroy();
  }

  generateFoodTruckTexture(T) {
    const g = this.add.graphics();
    g.fillStyle(0xc9c2a6, 1);
    g.fillRect(0, 0, T, T);
    g.fillStyle(0xe8a838, 1);
    g.fillRoundedRect(2, 6, T - 4, T - 16, 3);
    g.fillStyle(0xdff0ff, 0.9);
    g.fillRect(6, 10, T - 20, 8);
    g.fillStyle(0x2a2d3a, 1);
    g.fillCircle(8, T - 8, 4);
    g.fillCircle(T - 8, T - 8, 4);
    g.generateTexture("tile_foodtruck", T, T);
    g.destroy();
  }

  generateFlowerBedTexture(T) {
    const g = this.add.graphics();
    g.fillStyle(0x5a4530, 1);
    g.fillRect(0, 0, T, T);
    g.lineStyle(1, 0x3f3020, 1);
    g.strokeRect(0, 0, T, T);
    const BLOOM_COLORS = [0xe0577a, 0xe8c33f, 0xdff0ff, 0xc25a8a];
    for (let i = 0; i < 6; i++) {
      const bx = 3 + (i % 3) * (T / 3);
      const by = 4 + Math.floor(i / 3) * (T / 2.2);
      g.fillStyle(0x3f7a3f, 1);
      g.fillCircle(bx + 4, by + 6, 3);
      g.fillStyle(BLOOM_COLORS[i % BLOOM_COLORS.length], 1);
      g.fillCircle(bx + 4, by, 3);
    }
    g.generateTexture("tile_flowerbed", T, T);
    g.destroy();
  }

  // Wardrobe: everyone defaults to business casual (collared shirt, tie or
  // blazer trim, slacks). Pass attire "casual" for Visitor Day guests
  // (crew-neck tee, jeans/shorts, no tie). Skin tone, hair, and every trim
  // choice are picked deterministically off the texture key (a cheap
  // string hash, reused with different moduli so the picks don't all
  // correlate) so the office floor reads as a crowd of individuals rather
  // than repeated palette-swapped blobs, while staying stable across
  // reloads since nothing here is Math.random(). Pass hairColorOverride to
  // pin a specific character's hair color instead of hashing it.
  generateActorTexture(key, T, bodyColor, attire = "business", hairColorOverride = null) {
    const w = Math.floor(T * 0.75);
    const h = T;
    const g = this.add.graphics();
    const hash = key.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);

    const bodyX = w * 0.15;
    const bodyY = h * 0.4;
    const bodyW = w * 0.7;
    const bodyH = h * 0.5;

    const headCx = w / 2;
    const headCy = h * 0.28;
    const headR = w * 0.32;

    const SKIN_TONES = [0xf0e0c0, 0xd9b88a, 0xb5875a, 0x8a5a35, 0x6b4423];
    const HAIR_COLORS = [0x1a1a1a, 0x3a2a1a, 0x6b4423, 0x8a6a3a, 0xd9c27a, 0x9a9a9a];
    const skin = SKIN_TONES[hash % SKIN_TONES.length];
    const hairColor = hairColorOverride !== null ? hairColorOverride : HAIR_COLORS[(hash * 7 + 3) % HAIR_COLORS.length];
    const hairRoll = (hash * 13) % 6; // 0 = bald, else picks a style below

    // shadow
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(w / 2, h - 4, w * 0.7, 6);

    // arms, drawn behind the body so only the sleeve edges peek out
    g.fillStyle(this.darken(bodyColor, 0.85), 1);
    g.fillRoundedRect(bodyX - bodyW * 0.12, bodyY + bodyH * 0.08, bodyW * 0.18, bodyH * 0.62, 2);
    g.fillRoundedRect(bodyX + bodyW * 0.94, bodyY + bodyH * 0.08, bodyW * 0.18, bodyH * 0.62, 2);
    g.fillStyle(skin, 1);
    g.fillCircle(bodyX - bodyW * 0.03, bodyY + bodyH * 0.68, bodyW * 0.09);
    g.fillCircle(bodyX + bodyW * 1.03, bodyY + bodyH * 0.68, bodyW * 0.09);

    // body (shirt/blouse/tee)
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(bodyX, bodyY, bodyW, bodyH, 4);

    if (attire === "casual") {
      const BOTTOMS = [0x4a6a9a, 0xc9b380, 0x5a5a5a][hash % 3];
      g.fillStyle(BOTTOMS, 1);
      g.fillRect(bodyX, bodyY + bodyH * 0.68, bodyW, bodyH * 0.32);
      // crew neckline
      g.fillStyle(skin, 1);
      g.fillCircle(w / 2, bodyY + 1, bodyW * 0.12);
      // occasional tee graphic/stripe
      if (hash % 2 === 0) {
        g.fillStyle(0xffffff, 0.35);
        g.fillRect(bodyX, bodyY + bodyH * 0.32, bodyW, 2);
      }
    } else {
      const SLACKS = [0x2a3550, 0x3c3c3c, 0xa89968][hash % 3];
      g.fillStyle(SLACKS, 1);
      g.fillRect(bodyX, bodyY + bodyH * 0.62, bodyW, bodyH * 0.38);
      // open collar
      g.fillStyle(0xf2ede0, 1);
      g.fillTriangle(
        w / 2, bodyY + bodyH * 0.05,
        bodyX + bodyW * 0.32, bodyY,
        bodyX + bodyW * 0.68, bodyY
      );
      if (hash % 2 === 0) {
        // necktie
        g.fillStyle(this.darken(bodyColor, 0.5), 1);
        g.fillRect(w / 2 - 1.5, bodyY, 3, bodyH * 0.4);
      } else {
        // blazer edge
        g.lineStyle(1.5, this.darken(bodyColor, 0.65), 1);
        g.strokeRoundedRect(bodyX, bodyY, bodyW, bodyH, 4);
      }
    }

    // head
    g.fillStyle(skin, 1);
    g.fillCircle(headCx, headCy, headR);

    // hair — drawn short enough to always clear the eyeline below, so the
    // face stays visible regardless of which style lands.
    if (hairRoll !== 0) {
      g.fillStyle(hairColor, 1);
      if (hairRoll <= 2) {
        // short crop
        g.fillEllipse(headCx, headCy - headR * 0.45, headR * 1.7, headR * 1.05);
      } else if (hairRoll <= 4) {
        // side part
        g.fillEllipse(headCx - headR * 0.15, headCy - headR * 0.4, headR * 1.9, headR * 1.1);
      } else {
        // fuller, framing the face
        g.fillEllipse(headCx, headCy - headR * 0.35, headR * 2.05, headR * 1.2);
      }
    }

    // face — two small eyes, positioned below the hairline
    const eyeY = headCy + headR * 0.35;
    const eyeDX = headR * 0.35;
    const eyeR = Math.max(1, headR * 0.16);
    g.fillStyle(0x2a2320, 1);
    g.fillCircle(headCx - eyeDX, eyeY, eyeR);
    g.fillCircle(headCx + eyeDX, eyeY, eyeR);

    g.generateTexture(key, w, h);
    g.destroy();
  }

  darken(color, factor) {
    const r = Math.floor(((color >> 16) & 0xff) * factor);
    const gr = Math.floor(((color >> 8) & 0xff) * factor);
    const b = Math.floor((color & 0xff) * factor);
    return (r << 16) | (gr << 8) | b;
  }
}
