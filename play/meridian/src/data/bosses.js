// Scripted boss fights — kept separate from ENEMIES so they never show up
// in the random-encounter pool. Triggered explicitly (e.g. via a dialogue
// choice), not by walking onto an encounter tile.

const BOSSES = [
  {
    id: "reginald_review",
    name: "Reginald Cho, Regional Director",
    hp: 80,
    atk: 11,
    def: 6,
    xp: 0,
    color: 0x22242e,
    isBoss: true,
    moves: [
      { name: "\"Let's Circle Back\"", dmgMin: 7, dmgMax: 12 },
      { name: "Sudden Reorg Announcement", dmgMin: 8, dmgMax: 14 },
      { name: "\"I've Heard Some Concerns\"", dmgMin: 6, dmgMax: 11 },
      { name: "Rescheduled Fifteen Minutes Before It Starts", dmgMin: 9, dmgMax: 13 },
    ],
    flavorIntro: "Reginald closes the conference room door. \"Let's talk about your performance.\"",
    winMessage: "Reginald extends a hand. \"Well played. Welcome to the club.\"",
    loseMessage: "\"Let's reconvene when you're more prepared.\" The review is cut short.",
  },
];
