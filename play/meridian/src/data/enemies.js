// PLACEHOLDER ENEMIES — corporate-satire random encounters.
// Each has hp, atk, def, a color for its placeholder sprite, and a couple
// of flavor "moves" it can use against you. Add more as we flesh out the
// battle system (status effects, boss-only mechanics, etc).

const ENEMIES = [
  {
    id: "scope_creep",
    name: "Scope Creep",
    hp: 18,
    atk: 4,
    def: 1,
    xp: 10,
    color: 0x7a2e2e,
    moves: [
      { name: "\"One More Small Thing\"", dmgMin: 2, dmgMax: 5 },
      { name: "Moving Goalposts", dmgMin: 3, dmgMax: 6 },
    ],
    flavorIntro: "A SCOPE CREEP oozes out from under a change order!",
  },
  {
    id: "reply_all",
    name: "Reply-All Storm",
    hp: 12,
    atk: 3,
    def: 0,
    xp: 7,
    color: 0x2e5a7a,
    moves: [
      { name: "CC Everyone", dmgMin: 1, dmgMax: 4 },
      { name: "\"Per My Last Email\"", dmgMin: 2, dmgMax: 5 },
    ],
    flavorIntro: "Your inbox shudders. A REPLY-ALL STORM has appeared!",
  },
  {
    id: "deadline_wraith",
    name: "Deadline Wraith",
    hp: 22,
    atk: 5,
    def: 2,
    xp: 14,
    color: 0x3a2e5a,
    moves: [
      { name: "\"Client Needs It EOD\"", dmgMin: 3, dmgMax: 7 },
      { name: "Sudden Milestone", dmgMin: 4, dmgMax: 6 },
    ],
    flavorIntro: "The air turns cold. A DEADLINE WRAITH looms over you!",
  },
  {
    id: "redline_barrage",
    name: "Redline Barrage",
    hp: 16,
    atk: 4,
    def: 2,
    xp: 12,
    color: 0x4a5aa6,
    moves: [
      { name: "Nonconformance Report", dmgMin: 3, dmgMax: 6 },
      { name: "\"Redline All Of It\"", dmgMin: 2, dmgMax: 5 },
    ],
    flavorIntro: "Trent slides a stack of red-inked drawings across the table. A REDLINE BARRAGE begins!",
  },
  {
    id: "schedule_slip",
    name: "Schedule Slip",
    hp: 20,
    atk: 4,
    def: 1,
    xp: 13,
    color: 0x8a6a2e,
    moves: [
      { name: "Critical Path Shift", dmgMin: 3, dmgMax: 6 },
      { name: "\"We'll Make It Up\"", dmgMin: 2, dmgMax: 5 },
    ],
    flavorIntro: "The Gantt chart lurches sideways. A SCHEDULE SLIP breaks loose!",
  },
  {
    id: "rival_review",
    name: "Deja Marsh, Eng. Mgr.",
    hp: 24,
    atk: 5,
    def: 2,
    xp: 16,
    bonusPotential: 10,
    color: 0x5a2e6b,
    moves: [
      { name: "\"My Team Ships Faster\"", dmgMin: 3, dmgMax: 6 },
      { name: "Budget One-Upmanship", dmgMin: 3, dmgMax: 7 },
    ],
    flavorIntro: "Deja Marsh, an Engineering Manager from another department, squares up. Rival energy!",
    winMessage: "Deja tips her head. \"Not bad. Rematch next quarter.\"",
  },
];

// EXEC-floor fights — the big wigs. Deliberately much tougher than
// anything else in the game; you're not meant to win these until you've
// leveled up considerably past the floor's Director-level access gate.
// isBoss gives them the "suited executive" portrait (see BattleScene's
// ensureEnemyTexture) instead of the generic enemy blob, plus the bigger
// loss penalty. isFinalBoss marks them as one of the four required to
// become Executive — see BattleScene.onEnemyDefeated.
const EXEC_ENEMIES = [
  {
    id: "coo_showdown",
    name: "Vance Holloway, COO",
    hp: 46,
    atk: 8,
    def: 4,
    xp: 30,
    bonusPotential: 12,
    color: 0x2a2d4a,
    isBoss: true,
    isFinalBoss: true,
    moves: [
      { name: "Reorg Announcement", dmgMin: 5, dmgMax: 9 },
      { name: "\"Do More With Less\"", dmgMin: 4, dmgMax: 8 },
    ],
    flavorIntro: "Vance Holloway doesn't stand up from his desk. He doesn't need to.",
    winMessage: "Vance actually stands this time. \"Noted. Impressive.\"",
    loseMessage: "Vance waves you off without looking up. \"Come back when you're ready.\"",
  },
  {
    id: "cfo_showdown",
    name: "Odette Fairweather, CFO",
    hp: 50,
    atk: 7,
    def: 5,
    xp: 32,
    bonusPotential: 12,
    color: 0x4a2a3a,
    isBoss: true,
    isFinalBoss: true,
    moves: [
      { name: "Budget Clawback", dmgMin: 4, dmgMax: 9 },
      { name: "Line-Item Veto", dmgMin: 5, dmgMax: 8 },
    ],
    flavorIntro: "Odette Fairweather closes the spreadsheet. This is the real audit.",
    winMessage: "Odette almost smiles. \"Your numbers hold up. Rare.\"",
    loseMessage: "Odette reopens the spreadsheet. \"We're not done. Come back when you are.\"",
  },
  {
    id: "counsel_showdown",
    name: "Marcus Windham, Counsel",
    hp: 44,
    atk: 9,
    def: 3,
    xp: 30,
    bonusPotential: 12,
    color: 0x2e3a2a,
    isBoss: true,
    isFinalBoss: true,
    moves: [
      { name: "\"Per The Contract\"", dmgMin: 5, dmgMax: 9 },
      { name: "Liability Reassignment", dmgMin: 4, dmgMax: 10 },
    ],
    flavorIntro: "Marcus Windham produces a contract you don't remember signing.",
    winMessage: "Marcus files it away. \"We'll call this precedent, then.\"",
    loseMessage: "Marcus closes the folder. \"We'll revisit this. Prepare better next time.\"",
  },
  {
    id: "board_review",
    name: "The Board",
    hp: 65,
    atk: 10,
    def: 6,
    xp: 45,
    bonusPotential: 20,
    color: 0x1a1a2a,
    isBoss: true,
    isFinalBoss: true,
    moves: [
      { name: "Unanimous Vote", dmgMin: 6, dmgMax: 11 },
      { name: "\"Table That Motion\"", dmgMin: 5, dmgMax: 9 },
    ],
    flavorIntro: "Every chair around the table is full. All eyes on you.",
    winMessage: "The Board confers quietly, then nods. That's as good as it gets.",
    loseMessage: "The Board adjourns without a word. You'll need to request another session.",
  },
];
