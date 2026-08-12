// The promotion ladder. Character level maps to a job title — leveling up
// from battles/XP is the mechanical layer, but the story layer is climbing
// this ladder toward Executive. Tune thresholds as the game gets longer.

const RANKS = [
  { minLevel: 1, title: "Engineering Manager" },
  { minLevel: 3, title: "Senior Engineering Manager" },
  { minLevel: 6, title: "Director of Engineering" },
  { minLevel: 9, title: "VP of Engineering" },
  { minLevel: 12, title: "Executive" },
];

// Executive is gated behind executiveUnlocked, not level — set once all
// four EXEC-floor bosses are beaten (see BattleScene.onEnemyDefeated),
// which can happen any time after reaching Director (Lv.6) and clearing
// the floor's access gate, regardless of how much further XP takes you.
function getRank(level, executiveUnlocked) {
  if (executiveUnlocked) {
    return RANKS[RANKS.length - 1];
  }
  let current = RANKS[0];
  for (const r of RANKS) {
    if (r.title === "Executive") continue;
    if (level >= r.minLevel) current = r;
  }
  return current;
}

function getRankTitle(level, executiveUnlocked) {
  return getRank(level, executiveUnlocked).title;
}

// Shared stat growth for a level up, however it was triggered — clearing
// xpToNext in battle, or maxing out Bonus Potential (see bonus.js).
function levelUpPlayer() {
  const p = PLAYER_STATE;
  p.level += 1;
  p.maxHp += 6;
  p.maxMp += 2;
  p.atk += 2;
  p.def += 1;
  p.hp = p.maxHp;
  p.mp = p.maxMp;
  p.xpToNext = Math.floor(p.xpToNext * 1.4);
}
