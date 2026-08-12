// Visitor Day — a low-stakes bonus mode. Family members give a one-time
// Bonus Potential boost (tracked permanently on PLAYER_STATE.visitorGreeted
// so it can't be farmed) plus a free heal every visit. Vendors give a
// repeatable heal + a temporary "Well Fed" battle buff. Subcontractors give
// a repeatable small Bonus Potential bump (schmoozing pays off, a little,
// every time). Clients give a bigger one-time Bonus Potential boost — the
// same "first impression only" rule as family.
//
// Every visitor's title is prefixed with its category (Vendor —, Subcontractor
// —, Client —) so the type is obvious at a glance; family titles are
// self-evidently family.

const VISITORS = [
  {
    id: "wife",
    name: "Colleen",
    title: "Your Wife",
    type: "family",
    portraitColor: 0xc25a8a,
    hairColor: 0xd9c27a,
    // Multiple full conversations instead of one — handleVisitorInteract
    // picks a random one each visit so repeat trips to Visitor Day don't
    // always play back the identical lines.
    dialogue: [
      [
        "Hey, stranger. I brought you a coffee since I figured you forgot to eat.",
        "Indra misses you, but she knows you're out here becoming a big deal.",
        "Don't let them talk you into anything unreasonable today. I mean it, Karsh.",
      ],
      [
        "There he is. I was starting to think Reception was lying about you working here.",
        "Kush says hi, by the way — he's around here somewhere, probably at the taco truck.",
        "Go easy on yourself today, okay? You don't have to win every meeting.",
      ],
      [
        "I set up a lawn chair by the sandwich cart. Living my best open-house life.",
        "Indra's been narrating everyone's job titles all morning. She's very confident about it.",
        "Come find us when you get a break. No rush — we're not going anywhere.",
      ],
    ],
  },
  {
    id: "daughter",
    name: "Indra",
    title: "Your Daughter",
    type: "family",
    portraitColor: 0xe6b84a,
    // Indra is 5, so her lines should read like a five-year-old's, not a
    // shrunk-down adult's — short, excited, a little tangential.
    dialogue: [
      [
        "Daddy! I made you a drawing. It's you fighting a big red monster.",
        "Mommy said it's called 'scope creep.' Is that a real monster?",
        "Can we get ice cream after work? Please? PLEASE?",
      ],
      [
        "Daddy, guess what! I saw a real crane outside. It was SO big.",
        "Uncle Kush let me have two cookies. Don't tell Mommy.",
        "Do you have your own desk? Can I sit at it? I'll be very quiet.",
      ],
      [
        "I told my whole class you build tanks. Not the army kind, the big round kind!",
        "My drawing has YOU and a monster and also a dog, even though we don't have a dog.",
        "Can we get ice cream after work? Please? PLEASE? You said that last time and we didn't!",
      ],
    ],
  },
  {
    id: "parents",
    name: "Mom & Dad",
    title: "Your Parents",
    type: "family",
    portraitColor: 0x6b8a5a,
    dialogue: [
      [
        "So when do you become the boss? Your father wants to know.",
        "We're very proud of you, even if we don't fully understand what an EPC is.",
        "Your mother made extra for dinner. Don't work too late tonight.",
      ],
      [
        "Your father wants to know if that's a hard hat you're supposed to be wearing right now.",
        "We ran into Kush by the food trucks. That boy can really put away a taco.",
        "Your cousin asked what you do again. We told her 'important building things.' Close enough.",
      ],
      [
        "This is a very nice office. Very clean. Your father approves.",
        "We brought a container of extra food, it's in the car — don't forget it this time.",
        "We're proud of you. We'll say it as many times as it takes for you to believe it.",
      ],
    ],
  },
  {
    id: "brother",
    name: "Kush",
    title: "Your Brother",
    type: "family",
    // Same blue as the player sprite ("player" texture, 0x4a90d9) so he
    // visually reads as Karsh's brother rather than a random coworker.
    // Goofy-nerd energy: puns, over-explaining, way too into it.
    portraitColor: 0x4a90d9,
    hairColor: 0x1a1a1a,
    dialogue: [
      [
        "There's my brother, the almost-executive! I calculated your promotion odds. They're good, actuarially speaking.",
        "I already hit the taco truck twice. Technically that's just sample-size validation.",
        "Mom keeps asking if you're eating enough. I told her your BMI trendline looks stable. She did not appreciate that answer.",
      ],
      [
        "Nice office. I brought my own graphing calculator in case yours gets confiscated in a meeting.",
        "Indra told me you fight monsters here. I did not correct her, because frankly, same energy as my D&D campaign.",
        "Don't work too hard, okay? Or do — I built you a little efficiency spreadsheet. Don't ask why I have it already.",
      ],
    ],
  },
  {
    id: "taco_vendor",
    name: "Ramon",
    title: "Vendor — Taco Truck",
    type: "vendor",
    portraitColor: 0xc27a1e,
    dialogue: [
      "Two carnitas, extra salsa, on the house. Looked like you needed it.",
      "Eat up. You've got that 'about to fight a client' look in your eyes.",
    ],
  },
  {
    id: "sandwich_vendor",
    name: "Big Pete",
    title: "Vendor — Sandwich Cart",
    type: "vendor",
    portraitColor: 0x8a5a2e,
    dialogue: [
      "Turkey club, no onions, just like you like it.",
      "Free refill on the chips. Go get 'em, champ.",
    ],
  },
  {
    id: "coffee_cart",
    name: "Nadia",
    title: "Vendor — Coffee Cart",
    type: "vendor",
    portraitColor: 0x5a3a2a,
    dialogue: [
      "Triple shot, on the house. You looked like a triple-shot kind of morning.",
      "I've been pouring coffee at this open house for six years. I've seen things.",
    ],
  },
  {
    id: "icecream_cart",
    name: "Theo",
    title: "Vendor — Ice Cream Cart",
    type: "vendor",
    portraitColor: 0xdfc9a0,
    dialogue: [
      "One scoop or two? Actually, don't answer, I'm giving you two.",
      "Melts fast in this heat. Kind of like deadlines around here.",
    ],
  },
  {
    id: "elec_sub",
    name: "Marcus",
    title: "Subcontractor — Electrical",
    type: "subcontractor",
    portraitColor: 0xc27a1e,
    dialogue: [
      "Panel's rough-in is ahead of schedule for once. Don't tell the scheduler.",
      "Good open house. Free food AND nobody's asking me for a change order.",
    ],
  },
  {
    id: "concrete_sub",
    name: "Rosa",
    title: "Subcontractor — Concrete",
    type: "subcontractor",
    portraitColor: 0x8a8478,
    dialogue: [
      "Pour went clean yesterday. First one all month that did.",
      "Nice to see the office side of things for once. It's a lot quieter.",
    ],
  },
  {
    id: "client_locke",
    name: "Whitman Locke",
    title: "Client — Meridian Energy",
    type: "client",
    portraitColor: 0x2a3a5a,
    dialogue: [
      "Nice turnout. Good sign for a firm we're trusting with nine figures.",
      "Off the clock today — just here for the tacos, officially.",
      "Keep doing what you're doing. We're watching, in a good way.",
    ],
  },
  {
    id: "client_nwosu",
    name: "Adaeze Nwosu",
    title: "Client — Meridian Energy",
    type: "client",
    portraitColor: 0x5a2a3a,
    dialogue: [
      "I read your last progress report twice. That's a compliment, mostly.",
      "This is the first EPC open house I've been to with decent coffee.",
      "Don't let the change orders get to you. We see the good work too.",
    ],
  },
];

// The Visitor Day lobby map. Legend:
//   0 floor  1 wall  2 reception desk(solid)  3 plant(solid)
//   5 food/vendor cart(solid)  7 flower bed(walkable, decorative)
const VISITOR_DAY = {
  tileSize: 32,
  width: 24,
  height: 20,
  layout: [
    "111111111111111111111111",
    "100000000000000000000001",
    "103000000022220000003001",
    "100000000022220000000001",
    "100000000000000000000001",
    "100000000000000000000001",
    "100000000000000000000001",
    "100000000000000000000001",
    "100777777777777777777001",
    "100000000000000000000001",
    "100000000000000000000001",
    "100000000000000000000001",
    "100055550000000055550001",
    "100055550000000055550001",
    "100000000000000000000001",
    "100055550000000055550001",
    "100055550000000055550001",
    "103000000000000000003001",
    "100000000000000000000001",
    "111111111111111111111111",
  ],
  playerStart: { x: 11, y: 18 },
  exitPortal: { x: 10, y: 18 },
  landmarks: [
    { r0: 12, c0: 4, r1: 13, c1: 7, label: "TACO\nTRUCK" },
    { r0: 12, c0: 16, r1: 13, c1: 19, label: "SANDWICH\nCART" },
    { r0: 15, c0: 4, r1: 16, c1: 7, label: "COFFEE\nCART" },
    { r0: 15, c0: 16, r1: 16, c1: 19, label: "ICE CREAM\nCART" },
  ],
  receptionLabel: { x: 12, y: 2, text: "RECEPTION" },
  visitorPlacements: [
    { visitorId: "wife", x: 9, y: 6 },
    { visitorId: "daughter", x: 14, y: 6 },
    { visitorId: "parents", x: 11, y: 4 },
    { visitorId: "brother", x: 11, y: 7 },
    { visitorId: "elec_sub", x: 6, y: 9 },
    { visitorId: "concrete_sub", x: 17, y: 9 },
    { visitorId: "client_locke", x: 6, y: 10 },
    { visitorId: "client_nwosu", x: 17, y: 10 },
    { visitorId: "taco_vendor", x: 8, y: 12 },
    { visitorId: "sandwich_vendor", x: 15, y: 12 },
    { visitorId: "coffee_cart", x: 8, y: 15 },
    { visitorId: "icecream_cart", x: 15, y: 15 },
  ],
};
