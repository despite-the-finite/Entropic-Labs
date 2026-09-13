// Registers the baked art with the game, then hands off to the office.
//
// V1 generated every texture procedurally at boot. V2 bakes that art offline
// (see tools/bake.js) and ships it as atlases, so this scene's job is now:
//
//   1. register the per-character animation sets from the character atlas
//   2. publish one single-frame texture per character id, for the scenes that
//      still address characters by plain texture key
//   3. alias the legacy tile_* keys onto the new world-atlas frames, so
//      VisitorScene's Visitor Day map gets the upgraded art without needing
//      its own rewrite
//
// Nothing here loads from the network — the atlases are data URIs compiled
// into src/art/atlas_*.js, so the game still runs from a bare file:// page.

class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    CHARART.registerAnims(this);
    this.aliasCharacterTextures();
    this.aliasLegacyTiles();
    this.scene.start("OfficeScene");
  }

  // Copies one atlas frame into its own texture, under the key the scene
  // asks for. Cheap (a single canvas blit each) and done once per session.
  copyFrame(atlasKey, frameName, textureKey) {
    if (this.textures.exists(textureKey)) return;
    const atlas = this.textures.get(atlasKey);
    if (!atlas.has(frameName)) return;
    const f = atlas.get(frameName);
    const ct = this.textures.createCanvas(textureKey, f.width, f.height);
    ct.context.drawImage(f.source.image, f.cutX, f.cutY, f.width, f.height, 0, 0, f.width, f.height);
    ct.refresh();
  }

  aliasCharacterTextures() {
    CHARART.ids(this).forEach((id) => this.copyFrame(CHARART.KEY, `${id}_0`, id));
    this.copyFrame(CHARART.KEY, "npc_mentor_dave_0", "npc_default");
  }

  // VisitorScene still draws with V1's tile_* keys; point them at the new art.
  aliasLegacyTiles() {
    const map = {
      tile_floor: "floor_gfs_0",
      tile_wall_h: "wall_gfs_h",
      tile_wall_v: "wall_gfs_v",
      tile_wall_x: "wall_gfs_x",
      tile_desk: "desk_dual_gfs",
      tile_plant: "plant_small_gfs",
      tile_break: "break_gfs",
      tile_cubicle: "cubicle_home_gfs",
      tile_watercooler: "water_cooler_gfs",
      tile_wallart: "whiteboard_free_gfs",
      tile_battle_object: "bo_papers_gfs",
      tile_landmark: "break_gfs",
      tile_stairs: "stairs_gfs",
      tile_foodtruck: "foodtruck_gfs",
      tile_flowerbed: "flowerbed_gfs",
    };
    Object.keys(map).forEach((key) => this.copyFrame("world", map[key], key));
    this.copyFrame("site", "sprop_portal_process", "tile_portal");
    // Site-visit legacy keys, in case anything still reaches for them.
    this.copyFrame("site", "sground_process_0", "tile_gravel");
    this.copyFrame("site", "sfence_process", "tile_fence");
    this.copyFrame("site", "sbig_steelframe_process", "tile_structure");
    this.copyFrame("site", "sbig_vessel_process", "tile_equipment");
    this.copyFrame("site", "shazard_process", "tile_hazard");
  }
}
