// Global player state, shared across scenes via plain global (no bundler,
// so no modules — every scene file is just loaded as a <script> in order).
function initialPlayerState() {
  return {
    name: "Karsh",
    role: "Multi-Disciplinary Engineering",
    level: 1,
    hp: 30,
    maxHp: 30,
    mp: 10,
    maxMp: 10,
    atk: 6,
    def: 2,
    xp: 0,
    xpToNext: 20,
    executiveUnlocked: false,
    bonusPotential: 20,
    // Earning enough XP/Bonus Potential only queues a level up — it doesn't
    // apply until a site-visit change order is approved, so leveling needs
    // progress in both the office and on-site, not either alone.
    levelUpPending: false,
    visitorGreeted: { wife: false, daughter: false, parents: false, brother: false },
    wellFedBattles: 0,
    // Keyed by SITE_VISITS id, set true once that site's client negotiation
    // is won (see BattleScene). Other sites use unlockedBy to gate on this.
    completedSites: {},
    // Beating Reginald Cho (the Performance Review boss, GFS floor, VP+)
    // no longer grants Executive by itself — it just confirms you're ready
    // for the EXEC floor. See BattleScene.onEnemyDefeated / OfficeScene's
    // resolveDialogueLines for reginald_cho's dialogue gating.
    reginaldDefeated: false,
    // Executive — and winning the game — requires beating all four EXEC
    // floor bosses (see EXEC_ENEMIES in enemies.js), not just one fight.
    execBossesDefeated: { coo_showdown: false, cfo_showdown: false, counsel_showdown: false, board_review: false },
  };
}

const PLAYER_STATE = initialPlayerState();

// Used by BattleScene's Game Over screen (Bonus Potential hit 0) to start
// a fresh run without a page reload — same object reference, so every
// scene's existing `const p = PLAYER_STATE` alias stays valid.
function resetPlayerState() {
  Object.assign(PLAYER_STATE, initialPlayerState());
}

const config = {
  // Canvas2D, not AUTO/WebGL: nothing here needs WebGL (no shaders/pipelines),
  // and forcing Canvas avoids the "small broken canvas" icon some machines
  // show when WebGL context creation fails (locked-down GPU drivers, remote
  // desktop/VDI, VMs) instead of relying on AUTO's fallback.
  type: Phaser.CANVAS,
  // 640x480 stays the *design* resolution — every scene positions art and UI
  // against that grid (320/240 centers, etc.) — but the Scale Manager blows
  // the canvas up to fill the browser window, so the game is only this small
  // internally. FIT keeps the 4:3 aspect (letterboxing rather than stretching
  // or cropping), CENTER_BOTH centers the result in the page, and autoRound
  // keeps the scaled canvas on whole pixels so the pixel art doesn't shimmer.
  width: 640,
  height: 480,
  parent: "game-container",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: true,
  },
  pixelArt: true,
  backgroundColor: "#14161c",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [
    TitleScene,
    IntroScene,
    BootScene,
    OfficeScene,
    TransitionScene,
    PromotionScene,
    SiteVisitScene,
    VisitorScene,
    BattleScene,
  ],
};

new Phaser.Game(config);

// Reaching this line means every script above loaded and ran without
// throwing, so the boot-status placeholder (see index.html) has done its
// job — clear it so the game canvas shows through.
const bootStatus = document.getElementById("boot-status");
if (bootStatus) bootStatus.remove();
