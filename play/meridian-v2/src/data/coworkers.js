// Fully fictional cast — no real coworkers. Each has a portraitColor used to
// generate a unique placeholder sprite in BootScene, and a short dialogue
// loop. Feel free to ask for more (party members, rivals, a final-boss
// exec) — this is just the first pass at populating the floor plan.

const COWORKERS = {
  mentor_dave: {
    name: "Dave Kowalski",
    title: "Senior Piping Lead",
    portraitColor: 0x8a6d3b,
    dialogue: [
      "Heard corporate's got their eye on you for the next tier. Good for you. Bad for your calendar.",
      "You want Director? Learn to nod in meetings like you agree, even when you have no idea what they just proposed.",
      "Rule one, still applies at your level: never walk past the printer without a coffee mug. Makes you look busy.",
      "You'll want to level up before you take on the Monday Stand-Up. Some things don't change, manager or not.",
    ],
  },

  renata_osei: {
    name: "Renata Osei",
    title: "Process Engineer",
    portraitColor: 0x3f9a6b,
    dialogue: [
      "I've redrawn this P&ID four times this week and I'm STILL finding orphaned lines.",
      "Did you know a single misplaced check valve can ruin your whole afternoon?",
      "Anyway. Living the dream. How's your HP looking?",
    ],
  },

  chip_wexford: {
    name: "Chip Wexford",
    title: "Client Representative",
    portraitColor: 0xb5942e,
    triggersBattle: true,
    battleEnemyId: "scope_creep",
    dialogue: [
      "Oh hey! Quick question.",
      "So it's not really a change... more of a 'clarification' that happens to add scope.",
      "We'll need that by Friday. This Friday. Yes, I know it's Wednesday.",
      "Great chat! Following up with an email that contradicts everything I just said.",
    ],
  },

  marla_voss: {
    name: "Marla Voss",
    title: "Project Manager",
    portraitColor: 0xa63d5a,
    dialogue: [
      "The schedule says we're green. The schedule is lying, but it says we're green.",
      "I need a status update, and by 'update' I mean good news, specifically.",
      "If anyone asks, the float on that activity is 'sufficient.'",
    ],
  },

  trent_okafor: {
    name: "Trent Okafor",
    title: "QA/QC Manager",
    portraitColor: 0x4a5aa6,
    triggersBattle: true,
    battleEnemyId: "redline_barrage",
    dialogue: [
      "Per spec section 4.3.2, that is not how you weld that.",
      "I've issued a nonconformance report. I've issued several, actually.",
      "Redline it. Redline all of it. Redline the redlines.",
    ],
  },

  deb_halverson: {
    name: "Deb Halverson",
    title: "HSE Lead",
    portraitColor: 0xd97b2e,
    dialogue: [
      "Is that a stretch break I see? Or the beginning of a recordable incident?",
      "Toolbox talk in five. Bring your safety glasses. Bring your soul, it'll need it too.",
      "Remember: near misses are just successes wearing a disguise.",
    ],
  },

  gary_buffer: {
    name: "Gary Buffer",
    title: "IT Support",
    portraitColor: 0x5a5a5a,
    dialogue: [
      "Have you tried restarting the VPN?",
      "Your ticket is #4,812 in the queue. We're currently on ticket #12.",
      "The printer isn't broken, it's 'experiencing a paper-based philosophical crisis.'",
    ],
  },

  wanda_price: {
    name: "Wanda Price",
    title: "Procurement Lead",
    portraitColor: 0x6b3fa0,
    dialogue: [
      "Lead time on that valve package is fourteen weeks. Fourteen. Weeks.",
      "I have a drawer of binder clips and I will not be sharing them.",
      "Everything is a negotiation. Everything. Yes, even this conversation.",
    ],
  },

  ottoline_cruz: {
    name: "Ottoline Cruz",
    title: "Document Control",
    portraitColor: 0x2e8a8a,
    dialogue: [
      "That is not the current revision.",
      "I don't make the naming convention. I just judge you for not following it.",
      "Transmittal logged. Transmittal acknowledged. Transmittal ignored, probably.",
    ],
  },

  sanjay_bhatt: {
    name: "Sanjay Bhatt",
    title: "Instrumentation & Controls Engineer",
    portraitColor: 0x3a6b3a,
    dialogue: [
      "We are, once again, three I/O points over budget on the panel.",
      "Somebody keeps adding 'just one more transmitter' and it is never just one.",
      "The loop diagram is a lie. All loop diagrams are lies. Beautiful, necessary lies.",
    ],
  },

  lou: {
    name: "Lou",
    title: "Break Room Fixture",
    portraitColor: 0x9a8a3f,
    dialogue: [
      "Nobody's really sure what team I'm on anymore.",
      "I've been in this break room since before the reorg. Maybe before the building.",
      "Coffee's fresh. Well. Fresher than yesterday's, technically.",
      "Take a seat. Restore your HP. No one will ask why.",
    ],
  },

  reginald_cho: {
    name: "Reginald Cho",
    title: "Regional Director",
    portraitColor: 0x2a2a3a,
    isBoss: true,
    bossEnemyId: "reginald_review",
    // Shown while you're below VP — just needling you.
    dialogue: [
      "Ah. Word is you're gunning for my level eventually.",
      "Everyone wants Executive until they see the calendar that comes with it.",
      "Your utilization numbers looked... ambitious this quarter. We'll discuss at your review.",
      "Impress the right people between now and then. I'll be watching. Everyone is, actually.",
    ],
    // Shown once you've reached VP — the last line triggers the boss fight.
    dialogueReady: [
      "You've made VP. Congratulations, genuinely.",
      "Which means it's time for your performance review. The real one.",
      "Sit down. Let's talk about whether you're Executive material.",
    ],
    // Shown after you've beaten the review.
    dialogueCleared: [
      "The board's already talking about you. Executive suits you.",
      "Don't get comfortable. There's always a bigger chair.",
    ],
  },

  marisol_fenwick: {
    name: "Marisol Fenwick",
    title: "HR Business Partner",
    portraitColor: 0xc25a8a,
    dialogue: [
      "Just a friendly reminder that your compliance training is 'overdue,' not 'optional.'",
      "I'm here if you ever need to talk. Confidentially. Mostly confidentially.",
      "Open enrollment starts Monday. May the odds be ever in your favor.",
    ],
  },

  priya_nair: {
    name: "Priya Nair",
    title: "Civil Engineer",
    portraitColor: 0x6b8a3f,
    dialogue: [
      "Soil report came back. Turns out the ground is, and I quote, 'complicated.'",
      "I've moved the retaining wall four times this week. It's load-bearing. Emotionally, now.",
      "Heading to the break room. If anyone asks, I'm 'reviewing grading calcs.'",
    ],
  },

  owen_baptiste: {
    name: "Owen Baptiste",
    title: "Electrical Engineer",
    portraitColor: 0xa66b2e,
    dialogue: [
      "The one-line diagram is one line away from being three diagrams.",
      "Arc flash study says stand back. I always stand back. I stand back for fun now.",
      "Somebody breakered out the wrong panel again. Not naming names. It was Gary.",
    ],
  },

  // CDB floor — Construction department (estimators, schedulers, CMs).
  // GFS is Engineering; CDB is where the build side of the house sits.
  frankie_dellucci: {
    name: "Frankie Dellucci",
    title: "Senior Estimator",
    portraitColor: 0x7a5a3a,
    dialogue: [
      "I can give you a number. I cannot give you a number you'll like.",
      "Everything's a rough order of magnitude until somebody signs something.",
      "Subs bid low, we bid it lower, and somehow we're still the expensive option.",
    ],
  },

  wren_castellano: {
    name: "Wren Castellano",
    title: "Project Scheduler",
    portraitColor: 0xc27a1e,
    triggersBattle: true,
    battleEnemyId: "schedule_slip",
    dialogue: [
      "The critical path moved again. It does that when you look directly at it.",
      "I have a four-week float and a coworker determined to spend it all on me.",
      "Let's talk about your logic ties. All three of them. None of them make sense.",
    ],
  },

  bram_okonkwo: {
    name: "Bram Okonkwo",
    title: "Construction Manager",
    portraitColor: 0x3a3a5a,
    dialogue: [
      "Field wants a decision by lunch. Field always wants a decision by lunch.",
      "RFI's been open eleven days. I've started naming it.",
      "Come to CDB more often. Engineering forgets concrete has to actually cure.",
    ],
  },

  sal_marchetti: {
    name: "Sal Marchetti",
    title: "General Superintendent",
    portraitColor: 0x8a3a3a,
    dialogue: [
      "Walked the site at six. Somebody's already behind and it's not even seven.",
      "Safety meeting's at noon. Attendance is 'strongly encouraged,' meaning mandatory.",
      "You engineers draw it. We figure out how it actually stands up.",
    ],
  },

  deja_marsh: {
    name: "Deja Marsh",
    title: "Engineering Manager — Process Systems",
    portraitColor: 0x5a2e6b,
    triggersBattle: true,
    battleEnemyId: "rival_review",
    dialogue: [
      "Oh, you're the GFS manager everyone's talking about.",
      "My team hit our milestone early. Just saying.",
      "Let's see whose numbers actually hold up this quarter.",
    ],
  },

  // EXEC floor — the big wigs and the secretaries who actually run their
  // schedules. Nobody here talks to you until you're a Director.
  vance_holloway: {
    name: "Vance Holloway",
    title: "Chief Operating Officer",
    portraitColor: 0x2a2d4a,
    triggersBattle: true,
    battleEnemyId: "coo_showdown",
    dialogue: [
      "You made it up here. Let's see if you belong.",
      "I don't do small talk. I do performance reviews.",
    ],
  },
  odette_fairweather: {
    name: "Odette Fairweather",
    title: "Chief Financial Officer",
    portraitColor: 0x4a2a3a,
    triggersBattle: true,
    battleEnemyId: "cfo_showdown",
    dialogue: [
      "Every dollar in this building answers to me eventually.",
      "Including, soon, whatever you think your budget is.",
    ],
  },
  marcus_windham: {
    name: "Marcus Windham",
    title: "General Counsel",
    portraitColor: 0x2e3a2a,
    triggersBattle: true,
    battleEnemyId: "counsel_showdown",
    dialogue: [
      "I've read your file. All of it. Twice.",
      "Let's find out if you can argue as well as you build.",
    ],
  },
  priscilla_wynn: {
    name: "Priscilla Wynn",
    title: "Secretary to the COO",
    portraitColor: 0x8a6d3b,
    dialogue: [
      "He'll see you when he sees you. Take a seat.",
      "Don't touch his coffee. I mean it.",
    ],
  },
  desmond_cole: {
    name: "Desmond Cole",
    title: "Secretary to the CFO",
    portraitColor: 0x3a6b8a,
    dialogue: [
      "Her calendar is a war crime. I keep it running anyway.",
      "You didn't hear this from me, but bring good numbers.",
    ],
  },
  yui_tanaka: {
    name: "Yui Tanaka",
    title: "Secretary to General Counsel",
    portraitColor: 0x6b3a8a,
    dialogue: [
      "He reads everything. Everything. Don't exaggerate on your forms.",
      "Good luck in there. You'll want it.",
    ],
  },
};
