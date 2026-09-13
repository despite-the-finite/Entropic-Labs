// Bonus Potential — the game's reputation score. Starts low at 20 and moves
// based on how battles/negotiations go, not just pass/fail on checkpoints.
// Maxing it out at 100 rolls over (like an XP bar) and queues a level up —
// same as XP, it doesn't apply until a site-visit change order is approved
// (see BattleScene's onEnemyDefeated / PLAYER_STATE.levelUpPending).

const BONUS_TIERS = [
  { min: 0, label: "Not Bonus Eligible" },
  { min: 21, label: "Under Review" },
  { min: 41, label: "Meets Expectations" },
  { min: 61, label: "Exceeds Expectations" },
  { min: 81, label: "Stock Options Mentioned Once" },
];

function getBonusLabel(value) {
  let label = BONUS_TIERS[0].label;
  for (const t of BONUS_TIERS) {
    if (value >= t.min) label = t.label;
  }
  return label;
}

function applyBonusPotential(delta) {
  const p = PLAYER_STATE;
  p.bonusPotential += delta;
  while (p.bonusPotential >= 100) {
    p.bonusPotential -= 100;
    p.levelUpPending = true;
  }
  p.bonusPotential = Phaser.Math.Clamp(p.bonusPotential, 0, 100);

  const sign = delta > 0 ? "+" : "";
  return `Bonus Potential ${sign}${delta} (${p.bonusPotential}/100 — ${getBonusLabel(p.bonusPotential)})`;
}
